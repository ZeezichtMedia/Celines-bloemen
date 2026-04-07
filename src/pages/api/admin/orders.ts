import type { APIRoute } from 'astro';
import { isAuthenticated } from '../../../lib/auth';
import { db, schema } from '../../../lib/db';
import { getPayment } from '../../../lib/mollie';
import { desc, eq } from 'drizzle-orm';

export const prerender = false;

function unauthorized() {
  return new Response(JSON.stringify({ error: 'Niet ingelogd' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
}

// GET — list all orders
export const GET: APIRoute = async ({ request }) => {
  if (!isAuthenticated(request.headers.get('cookie'))) return unauthorized();
  const orders = await db.select().from(schema.orders).orderBy(desc(schema.orders.createdAt)).limit(100);
  return new Response(JSON.stringify(orders), { headers: { 'Content-Type': 'application/json' } });
};

// PATCH — update order status or sync with Mollie
export const PATCH: APIRoute = async ({ request }) => {
  if (!isAuthenticated(request.headers.get('cookie'))) return unauthorized();
  const { id, status, adminNote, action } = await request.json();

  // Sync single order with Mollie
  if (action === 'sync') {
    const [order] = await db.select().from(schema.orders).where(eq(schema.orders.id, id)).limit(1);
    if (!order || !order.molliePaymentId) {
      return new Response(JSON.stringify({ error: 'Geen Mollie betaling gekoppeld' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    try {
      const payment = await getPayment(order.molliePaymentId);
      const mollieStatus = payment.status;
      let newStatus = order.status;
      if (mollieStatus === 'paid' && order.status === 'pending') newStatus = 'paid';
      else if (mollieStatus === 'failed' || mollieStatus === 'cancelled' || mollieStatus === 'expired') newStatus = 'cancelled';

      await db.update(schema.orders)
        .set({ status: newStatus, paidAt: mollieStatus === 'paid' ? new Date() : order.paidAt, updatedAt: new Date() })
        .where(eq(schema.orders.id, id));

      return new Response(JSON.stringify({ ok: true, status: newStatus, mollieStatus }), { headers: { 'Content-Type': 'application/json' } });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err?.message || 'Mollie sync mislukt' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  // Sync ALL pending orders with Mollie
  if (action === 'sync-all') {
    const pendingOrders = await db.select().from(schema.orders).where(eq(schema.orders.status, 'pending'));
    let synced = 0;
    for (const order of pendingOrders) {
      if (!order.molliePaymentId) continue;
      try {
        const payment = await getPayment(order.molliePaymentId);
        if (payment.status === 'paid') {
          await db.update(schema.orders).set({ status: 'paid', paidAt: new Date(), updatedAt: new Date() }).where(eq(schema.orders.id, order.id));
          synced++;
        } else if (payment.status === 'failed' || payment.status === 'cancelled' || payment.status === 'expired') {
          await db.update(schema.orders).set({ status: 'cancelled', updatedAt: new Date() }).where(eq(schema.orders.id, order.id));
          synced++;
        }
      } catch { /* skip */ }
    }
    return new Response(JSON.stringify({ ok: true, synced }), { headers: { 'Content-Type': 'application/json' } });
  }

  // Manual status update
  await db.update(schema.orders)
    .set({ status, adminNote, updatedAt: new Date() })
    .where(eq(schema.orders.id, id));
  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
};

// DELETE — remove order
export const DELETE: APIRoute = async ({ request }) => {
  if (!isAuthenticated(request.headers.get('cookie'))) return unauthorized();
  const { id } = await request.json();
  await db.delete(schema.orders).where(eq(schema.orders.id, id));
  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
};

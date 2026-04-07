import type { APIRoute } from 'astro';
import { db, schema } from '../../lib/db';
import { createPayment, priceToAmount } from '../../lib/mollie';

export const prerender = false;

function generateOrderNumber(): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CB-${y}${m}${d}-${rand}`;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const {
      customer,
      items,
      delivery,
      subtotal,
      total,
    } = body;

    const orderNumber = generateOrderNumber();

    // Insert order
    const [order] = await db.insert(schema.orders).values({
      orderNumber,
      status: 'pending',
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone || null,
      deliveryMethod: delivery.method,
      deliveryDate: delivery.date || null,
      deliveryAddress: delivery.address || null,
      deliveryCity: delivery.city || null,
      deliveryPostalCode: delivery.postalCode || null,
      deliveryRegion: delivery.region || null,
      deliveryCost: delivery.cost || '0',
      items: JSON.stringify(items),
      subtotal: priceToAmount(subtotal),
      total: priceToAmount(total),
      customerNote: customer.note || null,
    }).returning();

    // Create Mollie payment
    const payment = await createPayment({
      orderId: order.id,
      orderNumber,
      amount: priceToAmount(total),
      description: `Bestelling ${orderNumber} — Celine's Bloemen`,
    });

    // Store payment ID
    await db.update(schema.orders)
      .set({ molliePaymentId: payment.id })
      .where(schema.orders.id.equals(order.id));

    return new Response(JSON.stringify({
      orderNumber,
      paymentUrl: payment.getCheckoutUrl(),
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Checkout error:', err);
    return new Response(JSON.stringify({ error: 'Er ging iets mis bij het afrekenen' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

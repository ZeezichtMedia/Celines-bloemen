import type { APIRoute } from 'astro';
import { db, schema } from '../../lib/db';
import { createPayment, priceToAmount } from '../../lib/mollie';
import { checkoutSchema, validateOrError } from '../../lib/validation';
import { eq } from 'drizzle-orm';

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

    // Validate input
    const { data, error } = validateOrError(checkoutSchema, body);
    if (error || !data) {
      return new Response(JSON.stringify({ error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { customer, items, delivery, subtotal, total } = data;
    const orderNumber = generateOrderNumber();
    const totalAmount = priceToAmount(total);

    // Validate delivery date is in the future if provided
    if (delivery.date) {
      const deliveryDate = new Date(delivery.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (deliveryDate <= today) {
        return new Response(JSON.stringify({ error: 'Bezorgdatum moet in de toekomst liggen' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

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
      deliveryCost: priceToAmount(delivery.cost || '€ 0,00'),
      items: JSON.stringify(items),
      subtotal: priceToAmount(subtotal),
      total: totalAmount,
      customerNote: customer.note || null,
    }).returning();

    const payment = await createPayment({
      orderId: order.id,
      orderNumber,
      amount: totalAmount,
      description: `Bestelling ${orderNumber} — Celine's Bloemen`,
    });

    await db.update(schema.orders)
      .set({ molliePaymentId: payment.id })
      .where(eq(schema.orders.id, order.id));

    return new Response(JSON.stringify({
      orderNumber,
      paymentUrl: payment.getCheckoutUrl(),
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Checkout error:', err?.message || err);
    return new Response(JSON.stringify({ error: 'Er ging iets mis bij het afrekenen' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

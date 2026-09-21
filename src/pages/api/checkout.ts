import type { APIRoute } from 'astro';
import { db, schema } from '../../lib/db';
import { createPayment } from '../../lib/mollie';
import { checkoutSchema, validateOrError } from '../../lib/validation';
import { priceOrder, PricingError, euro } from '../../lib/pricing';
import { getSettings, resolveNotifyEmail } from '../../lib/settings';
import { sendOrderConfirmation, sendOwnerOrderNotification, type OrderMailData } from '../../lib/email';
import { eq } from 'drizzle-orm';

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

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

    const { data, error } = validateOrError(checkoutSchema, body);
    if (error || !data) return json({ error }, 400);

    const { customer, items, delivery, paymentMethod } = data;
    const isInStore = paymentMethod === 'in_store' && delivery.method === 'pickup';

    // Bezorgdatum moet in de toekomst liggen
    if (delivery.date) {
      const deliveryDate = new Date(delivery.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (deliveryDate <= today) return json({ error: 'Bezorgdatum moet in de toekomst liggen' }, 400);
    }

    // Alle bedragen komen van de server, nooit uit de request
    let priced;
    try {
      priced = await priceOrder({
        items: items.map((i) => ({ productId: i.productId, size: i.size, quantity: i.quantity })),
        delivery: { method: delivery.method, zoneId: delivery.zoneId ?? null },
      });
    } catch (err) {
      if (err instanceof PricingError) return json({ error: err.message }, 400);
      throw err;
    }

    const orderNumber = generateOrderNumber();
    const storedItems = priced.items.map((i) => ({
      productId: i.productId, name: i.name, size: i.size, quantity: i.quantity, price: i.price,
    }));

    const [order] = await db.insert(schema.orders).values({
      orderNumber,
      status: isInStore ? 'pending_pickup' : 'pending',
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone || null,
      deliveryMethod: delivery.method,
      deliveryDate: delivery.date || null,
      deliveryAddress: delivery.address || null,
      deliveryCity: delivery.city || null,
      deliveryPostalCode: delivery.postalCode || null,
      deliveryRegion: priced.deliveryRegion,
      deliveryCost: priced.deliveryCost.toFixed(2),
      paymentMethod: isInStore ? 'in_store' : null,
      items: JSON.stringify(storedItems),
      subtotal: priced.subtotal.toFixed(2),
      total: priced.total.toFixed(2),
      customerNote: customer.note || null,
    }).returning();

    // Betalen in de winkel: geen Mollie, wel meteen mails (er komt geen webhook)
    if (isInStore) {
      const mail: OrderMailData = {
        to: customer.email,
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        orderNumber,
        items: storedItems,
        subtotal: euro(priced.subtotal),
        deliveryCost: euro(priced.deliveryCost),
        total: euro(priced.total),
        deliveryMethod: 'pickup',
        paymentMethod: 'in_store',
        customerNote: customer.note,
      };
      try {
        await sendOrderConfirmation(mail);
        const notify = resolveNotifyEmail(await getSettings());
        if (notify) await sendOwnerOrderNotification(notify, mail);
      } catch (mailErr) {
        console.error('In-store order mail failed:', mailErr);
      }
      return json({ orderNumber, total: euro(priced.total) });
    }

    const payment = await createPayment({
      orderId: order.id,
      orderNumber,
      amount: priced.total.toFixed(2),
      description: `Bestelling ${orderNumber} | Celine's Bloemen`,
    });

    await db.update(schema.orders)
      .set({ molliePaymentId: payment.id })
      .where(eq(schema.orders.id, order.id));

    return json({ orderNumber, total: euro(priced.total), paymentUrl: payment.getCheckoutUrl() });
  } catch (err: any) {
    console.error('Checkout error:', err?.message || err);
    return json({ error: 'Er ging iets mis bij het afrekenen' }, 500);
  }
};

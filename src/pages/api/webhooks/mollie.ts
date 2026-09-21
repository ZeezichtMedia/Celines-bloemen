import type { APIRoute } from 'astro';
import { db, schema } from '../../../lib/db';
import { getPayment } from '../../../lib/mollie';
import { sendOrderConfirmation, sendOwnerOrderNotification, type OrderMailData } from '../../../lib/email';
import { getProducts, saveProducts } from '../../../lib/data';
import { getSettings, resolveNotifyEmail } from '../../../lib/settings';
import { euro } from '../../../lib/pricing';
import { eq } from 'drizzle-orm';

export const prerender = false;

/** Voorraad van webshopproducten verlagen na een betaalde bestelling (boeketten hebben geen voorraad). */
async function decrementStock(items: { productId: string; quantity: number }[]) {
  const products = await getProducts();
  let changed = false;
  for (const p of products) {
    if (p.stock == null) continue;
    const sold = items.filter((i) => i.productId === p.id).reduce((n, i) => n + i.quantity, 0);
    if (sold > 0) {
      p.stock = Math.max(0, p.stock - sold);
      changed = true;
    }
  }
  if (changed) await saveProducts(products);
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.text();
    const params = new URLSearchParams(body);
    const paymentId = params.get('id');

    if (!paymentId) return new Response('OK');

    // SECURITY: altijd de betaling bij Mollie zelf ophalen, nooit de webhook-payload vertrouwen
    let payment;
    try {
      payment = await getPayment(paymentId);
    } catch (err) {
      console.error('Webhook: failed to verify payment with Mollie:', paymentId);
      return new Response('Payment verification failed', { status: 500 }); // Mollie probeert dan opnieuw
    }

    const orderNumber = (payment.metadata as any)?.orderNumber;
    if (!orderNumber) return new Response('OK');

    const [order] = await db.select()
      .from(schema.orders)
      .where(eq(schema.orders.orderNumber, orderNumber))
      .limit(1);

    if (!order) return new Response('OK');

    // IDEMPOTENT: al verwerkt
    if (payment.status === 'paid' && order.status !== 'pending') {
      return new Response('OK');
    }

    if (payment.status === 'paid') {
      await db.update(schema.orders)
        .set({ status: 'paid', paidAt: new Date(), updatedAt: new Date() })
        .where(eq(schema.orders.id, order.id));

      const items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items as any[]);

      try {
        await decrementStock(items);
      } catch (stockErr) {
        console.error('Stock update failed:', stockErr);
      }

      const mail: OrderMailData = {
        to: order.customerEmail,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        orderNumber: order.orderNumber,
        items,
        subtotal: euro(Number(order.subtotal)),
        deliveryCost: euro(Number(order.deliveryCost)),
        total: euro(Number(order.total)),
        deliveryMethod: order.deliveryMethod,
        deliveryDate: order.deliveryDate,
        deliveryRegion: order.deliveryRegion,
        address: order.deliveryAddress,
        city: order.deliveryCity,
        postalCode: order.deliveryPostalCode,
        customerNote: order.customerNote,
      };

      try {
        await sendOrderConfirmation(mail);
      } catch (emailErr) {
        console.error('Order email failed:', emailErr);
      }
      try {
        const notify = resolveNotifyEmail(await getSettings());
        if (notify) await sendOwnerOrderNotification(notify, mail);
      } catch (emailErr) {
        console.error('Owner notification failed:', emailErr);
      }
    } else if (['failed', 'canceled', 'expired'].includes(payment.status)) {
      if (order.status === 'pending') {
        await db.update(schema.orders)
          .set({ status: 'cancelled', updatedAt: new Date() })
          .where(eq(schema.orders.id, order.id));
      }
    }

    return new Response('OK');
  } catch (err: any) {
    console.error('Order webhook error:', err?.message || err);
    return new Response('Internal error', { status: 500 });
  }
};

import type { APIRoute } from 'astro';
import { db, schema } from '../../../lib/db';
import { getPayment } from '../../../lib/mollie';
import { sendOrderConfirmation } from '../../../lib/email';
import { eq } from 'drizzle-orm';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.text();
    const params = new URLSearchParams(body);
    const paymentId = params.get('id');

    if (!paymentId) return new Response('OK');

    // SECURITY: Always fetch payment from Mollie API to verify status
    // Never trust the webhook payload alone
    let payment;
    try {
      payment = await getPayment(paymentId);
    } catch (err) {
      console.error('Webhook: failed to verify payment with Mollie:', paymentId);
      // Return 500 so Mollie retries
      return new Response('Payment verification failed', { status: 500 });
    }

    const orderNumber = (payment.metadata as any)?.orderNumber;
    if (!orderNumber) return new Response('OK');

    const [order] = await db.select()
      .from(schema.orders)
      .where(eq(schema.orders.orderNumber, orderNumber))
      .limit(1);

    if (!order) return new Response('OK');

    // IDEMPOTENCY: Skip if already processed
    if (payment.status === 'paid' && order.status !== 'pending') {
      return new Response('OK'); // Already processed
    }

    if (payment.status === 'paid') {
      await db.update(schema.orders)
        .set({ status: 'paid', paidAt: new Date(), updatedAt: new Date() })
        .where(eq(schema.orders.id, order.id));

      try {
        const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
        await sendOrderConfirmation({
          to: order.customerEmail,
          customerName: order.customerName,
          orderNumber: order.orderNumber,
          items,
          total: `€ ${Number(order.total).toFixed(2).replace('.', ',')}`,
          deliveryMethod: order.deliveryMethod,
          deliveryDate: order.deliveryDate || undefined,
        });
      } catch (emailErr) {
        console.error('Order email failed:', emailErr);
        // Don't fail webhook for email errors
      }
    } else if (['failed', 'cancelled', 'expired'].includes(payment.status)) {
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

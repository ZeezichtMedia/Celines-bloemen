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

    if (!paymentId) {
      console.error('Order webhook: no payment ID');
      return new Response('OK');
    }

    console.log('Order webhook received for payment:', paymentId);

    const payment = await getPayment(paymentId);
    const orderNumber = (payment.metadata as any)?.orderNumber;

    if (!orderNumber) {
      console.log('Order webhook: no orderNumber in metadata, skipping');
      return new Response('OK');
    }

    const [order] = await db.select()
      .from(schema.orders)
      .where(eq(schema.orders.orderNumber, orderNumber))
      .limit(1);

    if (!order) {
      console.error('Order webhook: order not found for', orderNumber);
      return new Response('OK');
    }

    console.log('Payment status:', payment.status, 'for order', orderNumber);

    if (payment.status === 'paid') {
      await db.update(schema.orders)
        .set({ status: 'paid', paidAt: new Date() })
        .where(eq(schema.orders.id, order.id));

      // Send confirmation email
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
      }
    } else if (payment.status === 'failed' || payment.status === 'cancelled' || payment.status === 'expired') {
      await db.update(schema.orders)
        .set({ status: 'cancelled' })
        .where(eq(schema.orders.id, order.id));
    }

    return new Response('OK');
  } catch (err: any) {
    console.error('Order webhook error:', err?.message || err);
    return new Response('OK');
  }
};

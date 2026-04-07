import type { APIRoute } from 'astro';
import { db, schema } from '../../../lib/db';
import { getPayment } from '../../../lib/mollie';
import { sendOrderConfirmation } from '../../../lib/email';
import { eq } from 'drizzle-orm';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.formData();
    const paymentId = body.get('id') as string;
    if (!paymentId) return new Response('OK');

    const payment = await getPayment(paymentId);
    const orderNumber = (payment.metadata as any)?.orderNumber;
    if (!orderNumber) return new Response('OK');

    const [order] = await db.select()
      .from(schema.orders)
      .where(eq(schema.orders.orderNumber, orderNumber))
      .limit(1);

    if (!order) return new Response('OK');

    if (payment.status === 'paid') {
      await db.update(schema.orders)
        .set({ status: 'paid', paidAt: new Date() })
        .where(eq(schema.orders.id, order.id));

      // Send confirmation email
      try {
        const items = JSON.parse(order.items as string);
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
        console.error('Email send failed:', emailErr);
      }
    } else if (payment.status === 'failed' || payment.status === 'cancelled' || payment.status === 'expired') {
      await db.update(schema.orders)
        .set({ status: 'cancelled' })
        .where(eq(schema.orders.id, order.id));
    }

    return new Response('OK');
  } catch (err) {
    console.error('Webhook error:', err);
    return new Response('OK');
  }
};

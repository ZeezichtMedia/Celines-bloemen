import type { APIRoute } from 'astro';
import { db, schema } from '../../../lib/db';
import { getPayment, createSubscription, frequencyToInterval } from '../../../lib/mollie';
import { sendSubscriptionConfirmation } from '../../../lib/email';
import { eq } from 'drizzle-orm';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    // Mollie sends webhooks as application/x-www-form-urlencoded
    const body = await request.text();
    const params = new URLSearchParams(body);
    const paymentId = params.get('id');

    if (!paymentId) {
      console.error('Subscription webhook: no payment ID');
      return new Response('OK');
    }

    console.log('Subscription webhook received for payment:', paymentId);

    const payment = await getPayment(paymentId);
    const meta = payment.metadata as any;

    console.log('Payment status:', payment.status, 'metadata:', JSON.stringify(meta));

    // First payment for subscription setup
    if (meta?.type === 'subscription_first' && payment.status === 'paid') {
      const subId = parseInt(meta.subscriptionId);
      const customerId = meta.customerId;

      if (!subId || !customerId) {
        console.error('Subscription webhook: missing subId or customerId in metadata');
        return new Response('OK');
      }

      const [sub] = await db.select()
        .from(schema.subscriptions)
        .where(eq(schema.subscriptions.id, subId))
        .limit(1);

      if (!sub) {
        console.error('Subscription webhook: subscription not found for id', subId);
        return new Response('OK');
      }

      console.log('Creating Mollie subscription for customer', customerId, 'amount', Number(sub.pricePerDelivery).toFixed(2));

      // Create recurring subscription in Mollie
      const mollieSubscription = await createSubscription({
        customerId,
        amount: Number(sub.pricePerDelivery).toFixed(2),
        interval: frequencyToInterval(sub.frequency),
        description: `Bloemenabonnement ${sub.planSize} — Celine's Bloemen`,
        subscriptionId: sub.id,
      });

      console.log('Mollie subscription created:', mollieSubscription.id);

      // Update subscription record
      await db.update(schema.subscriptions)
        .set({
          status: 'active',
          mollieCustomerId: customerId,
          mollieSubscriptionId: mollieSubscription.id,
        })
        .where(eq(schema.subscriptions.id, sub.id));

      // Send confirmation email
      try {
        await sendSubscriptionConfirmation({
          to: sub.customerEmail,
          customerName: sub.customerName,
          planType: sub.planType,
          planSize: sub.planSize,
          frequency: sub.frequency,
          price: `€ ${Number(sub.pricePerDelivery).toFixed(2).replace('.', ',')}`,
        });
      } catch (emailErr) {
        console.error('Subscription email failed:', emailErr);
      }
    }

    return new Response('OK');
  } catch (err: any) {
    console.error('Subscription webhook error:', err?.message || err);
    // Always return 200 to Mollie, otherwise they retry
    return new Response('OK');
  }
};

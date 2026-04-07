import type { APIRoute } from 'astro';
import { db, schema } from '../../../lib/db';
import { getPayment, createSubscription, frequencyToInterval } from '../../../lib/mollie';
import { sendSubscriptionConfirmation } from '../../../lib/email';
import { eq } from 'drizzle-orm';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.formData();
    const paymentId = body.get('id') as string;
    if (!paymentId) return new Response('OK');

    const payment = await getPayment(paymentId);
    const meta = payment.metadata as any;

    // First payment for subscription setup
    if (meta?.type === 'subscription_first' && payment.status === 'paid') {
      const subId = parseInt(meta.subscriptionId);
      const customerId = meta.customerId;

      const [sub] = await db.select()
        .from(schema.subscriptions)
        .where(eq(schema.subscriptions.id, subId))
        .limit(1);

      if (!sub) return new Response('OK');

      // Create recurring subscription in Mollie
      const mollieSubscription = await createSubscription({
        customerId,
        amount: Number(sub.pricePerDelivery).toFixed(2),
        interval: frequencyToInterval(sub.frequency),
        description: `Bloemenabonnement ${sub.planSize} — Celine's Bloemen`,
        subscriptionId: sub.id,
      });

      // Update subscription record
      await db.update(schema.subscriptions)
        .set({
          status: 'active',
          mollieCustomerId: customerId,
          mollieSubscriptionId: mollieSubscription.id,
        })
        .where(eq(schema.subscriptions.id, sub.id));

      // Send confirmation
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
  } catch (err) {
    console.error('Subscription webhook error:', err);
    return new Response('OK');
  }
};

import type { APIRoute } from 'astro';
import { db, schema } from '../../../lib/db';
import { getPayment, createSubscription, frequencyToInterval } from '../../../lib/mollie';
import { sendSubscriptionConfirmation } from '../../../lib/email';
import { eq } from 'drizzle-orm';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.text();
    const params = new URLSearchParams(body);
    const paymentId = params.get('id');

    if (!paymentId) return new Response('OK');

    // SECURITY: Verify payment with Mollie API
    let payment;
    try {
      payment = await getPayment(paymentId);
    } catch (err) {
      console.error('Sub webhook: failed to verify payment:', paymentId);
      return new Response('Payment verification failed', { status: 500 });
    }

    const meta = payment.metadata as any;

    if (meta?.type === 'subscription_first' && payment.status === 'paid') {
      const subId = parseInt(meta.subscriptionId);
      const customerId = meta.customerId;

      if (!subId || !customerId) return new Response('OK');

      const [sub] = await db.select()
        .from(schema.subscriptions)
        .where(eq(schema.subscriptions.id, subId))
        .limit(1);

      if (!sub) return new Response('OK');

      // IDEMPOTENCY: Skip if already activated
      if (sub.status === 'active' && sub.mollieSubscriptionId) {
        return new Response('OK');
      }

      try {
        const mollieSubscription = await createSubscription({
          customerId,
          amount: Number(sub.pricePerDelivery).toFixed(2),
          interval: frequencyToInterval(sub.frequency),
          description: `Bloemenabonnement ${sub.planSize} — Celine's Bloemen`,
          subscriptionId: sub.id,
        });

        await db.update(schema.subscriptions)
          .set({
            status: 'active',
            mollieCustomerId: customerId,
            mollieSubscriptionId: mollieSubscription.id,
            updatedAt: new Date(),
          })
          .where(eq(schema.subscriptions.id, sub.id));
      } catch (mollieErr) {
        console.error('Failed to create Mollie subscription:', mollieErr);
        // Mark as error state so admin can investigate
        await db.update(schema.subscriptions)
          .set({ status: 'pending', mollieCustomerId: customerId, updatedAt: new Date() })
          .where(eq(schema.subscriptions.id, sub.id));
        return new Response('Subscription creation failed', { status: 500 });
      }

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
    return new Response('Internal error', { status: 500 });
  }
};

import type { APIRoute } from 'astro';
import { db, schema } from '../../../lib/db';
import { getPayment, createSubscription, frequencyToInterval } from '../../../lib/mollie';
import { sendSubscriptionConfirmation, sendOwnerSubscriptionNotification, sendOwnerSubscriptionPayment, type SubscriptionMailData } from '../../../lib/email';
import { getSettings, resolveNotifyEmail } from '../../../lib/settings';
import { formatEuro } from '../../../lib/plans';
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
          description: `Bloemenabonnement ${sub.planSize} | Celine's Bloemen`,
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

      const mail: SubscriptionMailData = {
        to: sub.customerEmail,
        customerName: sub.customerName,
        customerEmail: sub.customerEmail,
        customerPhone: sub.customerPhone,
        planType: sub.planType,
        planSize: sub.planSize,
        frequency: sub.frequency,
        price: formatEuro(Number(sub.pricePerDelivery)),
        vaseIncluded: sub.vaseIncluded,
        address: sub.deliveryAddress,
        city: sub.deliveryCity,
        postalCode: sub.deliveryPostalCode,
        colorPreference: sub.colorPreference,
        customerNote: sub.customerNote,
      };
      try {
        await sendSubscriptionConfirmation(mail);
      } catch (emailErr) {
        console.error('Subscription email failed:', emailErr);
      }
      try {
        const notify = resolveNotifyEmail(await getSettings());
        if (notify) await sendOwnerSubscriptionNotification(notify, mail);
      } catch (emailErr) {
        console.error('Owner subscription notification failed:', emailErr);
      }

      return new Response('OK');
    }

    // Terugkerende incasso van een lopend abonnement: Celine moet weten dat er een levering aankomt
    const recurringId = (payment as any).subscriptionId as string | undefined;
    if (recurringId && ['paid', 'failed', 'expired', 'canceled'].includes(payment.status)) {
      const [sub] = await db.select()
        .from(schema.subscriptions)
        .where(eq(schema.subscriptions.mollieSubscriptionId, recurringId))
        .limit(1);
      if (!sub) return new Response('OK');

      // Zelfde incasso niet twee keer melden
      if (sub.lastPaymentId === payment.id) return new Response('OK');

      await db.update(schema.subscriptions)
        .set({
          lastPaymentId: payment.id,
          lastPaymentStatus: payment.status,
          lastPaymentAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.subscriptions.id, sub.id));

      try {
        const notify = resolveNotifyEmail(await getSettings());
        if (notify) {
          await sendOwnerSubscriptionPayment(notify, {
            to: sub.customerEmail,
            customerName: sub.customerName,
            customerEmail: sub.customerEmail,
            customerPhone: sub.customerPhone,
            planType: sub.planType,
            planSize: sub.planSize,
            frequency: sub.frequency,
            price: formatEuro(Number(sub.pricePerDelivery)),
            vaseIncluded: sub.vaseIncluded,
            address: sub.deliveryAddress,
            city: sub.deliveryCity,
            postalCode: sub.deliveryPostalCode,
            colorPreference: sub.colorPreference,
            customerNote: sub.customerNote,
          }, payment.status);
        }
      } catch (emailErr) {
        console.error('Recurring payment notification failed:', emailErr);
      }
    }

    return new Response('OK');
  } catch (err: any) {
    console.error('Subscription webhook error:', err?.message || err);
    return new Response('Internal error', { status: 500 });
  }
};

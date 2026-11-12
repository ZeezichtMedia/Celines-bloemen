import type { APIRoute } from 'astro';
import { db, schema } from '../../../lib/db';
import { getPayment, createSubscription, frequencyToInterval, bedragKlopt, vandaagNL, datumPlusInterval } from '../../../lib/mollie';
import { sendSubscriptionConfirmation, sendOwnerSubscriptionNotification, sendOwnerSubscriptionPayment, type SubscriptionMailData } from '../../../lib/email';
import { getSettings, resolveNotifyEmail } from '../../../lib/settings';
import { formatEuro } from '../../../lib/plans';
import { and, eq, isNull } from 'drizzle-orm';

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

      // Hoort deze betaling echt bij dit abonnement, en klopt het bedrag?
      if (sub.lastPaymentId && sub.lastPaymentId !== payment.id) {
        console.error('Sub webhook: betaling hoort niet bij abonnement', subId, payment.id);
        return new Response('OK');
      }
      if (!bedragKlopt(payment, sub.pricePerDelivery) || (payment as any).customerId !== customerId) {
        console.error('Sub webhook: bedrag of klant klopt niet', subId, payment.amount, sub.pricePerDelivery);
        return new Response('OK');
      }

      // Atomair claimen: maar een webhook tegelijk mag het abonnement bij Mollie aanmaken
      const geclaimd = await db.update(schema.subscriptions)
        .set({ status: 'activating', updatedAt: new Date() })
        .where(and(
          eq(schema.subscriptions.id, sub.id),
          eq(schema.subscriptions.status, 'pending'),
          isNull(schema.subscriptions.mollieSubscriptionId),
        ))
        .returning({ id: schema.subscriptions.id });
      if (geclaimd.length === 0) return new Response('OK'); // al verwerkt of bezig

      try {
        const interval = frequencyToInterval(sub.frequency);
        const mollieSubscription = await createSubscription({
          customerId,
          amount: Number(sub.pricePerDelivery).toFixed(2),
          interval,
          description: `Bloemenabonnement ${sub.planSize} | Celine's Bloemen`,
          subscriptionId: sub.id,
          // De eerste betaling is de eerste levering. De eerste incasso volgt een periode later,
          // anders betaalt de klant op de eerste dag twee keer.
          startDate: datumPlusInterval(vandaagNL(), interval),
          idempotencyKey: `abonnement-${sub.id}-start-${payment.id}`,
        });

        await db.update(schema.subscriptions)
          .set({
            status: 'active',
            mollieCustomerId: customerId,
            mollieSubscriptionId: mollieSubscription.id,
            lastPaymentStatus: 'paid',
            lastPaymentAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(schema.subscriptions.id, sub.id));
      } catch (mollieErr) {
        console.error('Failed to create Mollie subscription:', mollieErr);
        // Terug naar pending, zodat de volgende poging van Mollie het opnieuw probeert
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

      // Zelfde incasso niet twee keer melden (ook niet bij twee webhooks tegelijk)
      if (sub.lastPaymentId === payment.id && sub.lastPaymentStatus === payment.status) return new Response('OK');

      const bijgewerkt = await db.update(schema.subscriptions)
        .set({
          lastPaymentId: payment.id,
          lastPaymentStatus: payment.status,
          lastPaymentAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(
          eq(schema.subscriptions.id, sub.id),
          sub.lastPaymentId ? eq(schema.subscriptions.lastPaymentId, sub.lastPaymentId) : isNull(schema.subscriptions.lastPaymentId),
          sub.lastPaymentStatus ? eq(schema.subscriptions.lastPaymentStatus, sub.lastPaymentStatus) : isNull(schema.subscriptions.lastPaymentStatus),
        ))
        .returning({ id: schema.subscriptions.id });
      if (bijgewerkt.length === 0) return new Response('OK');

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

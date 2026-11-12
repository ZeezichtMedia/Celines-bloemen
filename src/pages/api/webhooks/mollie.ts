import type { APIRoute } from 'astro';
import { db, schema } from '../../../lib/db';
import { getPayment, bedragKlopt } from '../../../lib/mollie';
import { sendOrderConfirmation, sendOwnerOrderNotification, type OrderMailData } from '../../../lib/email';
import { decrementStock } from '../../../lib/data';
import { getSettings, resolveNotifyEmail } from '../../../lib/settings';
import { euro } from '../../../lib/pricing';
import { and, eq, inArray, isNull } from 'drizzle-orm';

export const prerender = false;

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

    // Hoort deze betaling echt bij deze bestelling? Het id moet het opgeslagen id zijn
    if (order.molliePaymentId && order.molliePaymentId !== payment.id) {
      console.error('Webhook: betaling hoort niet bij bestelling', orderNumber, payment.id);
      return new Response('OK');
    }

    // Helemaal terugbetaald of teruggeboekt (chargeback): in het beheer zichtbaar maken en nooit meer
    // op betaald zetten. Een gedeeltelijke terugbetaling laat de bestelling op betaald staan.
    // amountRemaining zakt al zodra een terugbetaling is gestart (amountRefunded pas als hij is afgerond)
    const bedrag = Number(payment.amount.value);
    const nogTerugTeBetalen = payment.amountRemaining ? Number(payment.amountRemaining.value) : bedrag;
    const terug = Math.max(Number(payment.amountRefunded?.value ?? 0), bedrag - nogTerugTeBetalen)
      + Number((payment as any).amountChargedBack?.value ?? 0);
    if (payment.status === 'paid' && terug > 0 && terug >= Number(order.total)) {
      if (order.status !== 'refunded') {
        await db.update(schema.orders)
          .set({ status: 'refunded', updatedAt: new Date() })
          .where(eq(schema.orders.id, order.id));
      }
      return new Response('OK');
    }

    if (payment.status === 'paid') {
      // Alleen op betaald als het bedrag precies klopt met de bestelling
      if (!bedragKlopt(payment, order.total)) {
        console.error('Webhook: bedrag klopt niet', orderNumber, payment.amount, order.total);
        return new Response('OK');
      }

      // Atomair: maar een webhook tegelijk kan de bestelling op betaald zetten. Dubbele of gelijktijdige
      // webhooks geven geen dubbele mails of dubbel afgeboekte voorraad. 'cancelled' mag ook: dan had
      // Celine hem met de hand geannuleerd terwijl de klant toch betaalde. paidAt leeg = nooit eerder betaald.
      const geclaimd = await db.update(schema.orders)
        .set({ status: 'paid', paidAt: new Date(), updatedAt: new Date() })
        .where(and(
          eq(schema.orders.id, order.id),
          inArray(schema.orders.status, ['pending', 'cancelled']),
          isNull(schema.orders.paidAt),
        ))
        .returning({ id: schema.orders.id });
      if (geclaimd.length === 0) return new Response('OK'); // al verwerkt

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

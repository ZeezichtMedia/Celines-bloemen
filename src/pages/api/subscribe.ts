import type { APIRoute } from 'astro';
import { db, schema } from '../../lib/db';
import { createFirstPayment, priceToAmount } from '../../lib/mollie';
import { subscribeSchema, validateOrError } from '../../lib/validation';
import { eq } from 'drizzle-orm';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    // Validate input
    const { data, error } = validateOrError(subscribeSchema, body);
    if (error || !data) {
      return new Response(JSON.stringify({ error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { customer, plan, delivery } = data;

    const [sub] = await db.insert(schema.subscriptions).values({
      status: 'pending',
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone || null,
      deliveryAddress: delivery.address,
      deliveryCity: delivery.city,
      deliveryPostalCode: delivery.postalCode,
      planType: plan.type,
      planSize: plan.size,
      frequency: plan.frequency,
      pricePerDelivery: priceToAmount(plan.price),
      colorPreference: plan.colorPreference || null,
      customerNote: customer.note || null,
    }).returning();

    const { payment, customerId } = await createFirstPayment({
      customerName: customer.name,
      customerEmail: customer.email,
      amount: priceToAmount(plan.price),
      description: `Eerste levering bloemenabonnement — Celine's Bloemen`,
      subscriptionMeta: {
        subscriptionId: String(sub.id),
      },
    });

    await db.update(schema.subscriptions)
      .set({ mollieCustomerId: customerId })
      .where(eq(schema.subscriptions.id, sub.id));

    return new Response(JSON.stringify({
      subscriptionId: sub.id,
      paymentUrl: payment.getCheckoutUrl(),
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Subscribe error:', err?.message || err);
    return new Response(JSON.stringify({ error: 'Er ging iets mis bij het aanmaken van je abonnement' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

import type { APIRoute } from 'astro';
import { db, schema } from '../../lib/db';
import { createFirstPayment } from '../../lib/mollie';
import { subscribeSchema, validateOrError } from '../../lib/validation';
import { resolvePlan, formatEuro } from '../../lib/plans';
import { eq } from 'drizzle-orm';

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    const { data, error } = validateOrError(subscribeSchema, body);
    if (error || !data) return json({ error }, 400);

    const { customer, plan: chosen, delivery } = data;

    // Prijs komt uit lib/plans.ts, nooit uit de request
    const plan = resolvePlan(chosen.type, chosen.size, chosen.frequency);
    if (!plan) return json({ error: 'Dit abonnement bestaat niet (meer). Vernieuw de pagina en probeer opnieuw.' }, 400);
    const amount = plan.price.toFixed(2);

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
      frequency: chosen.frequency,
      pricePerDelivery: amount,
      colorPreference: chosen.colorPreference || null,
      vaseIncluded: chosen.vaseIncluded ?? false,
      customerNote: customer.note || null,
    }).returning();

    const { payment, customerId } = await createFirstPayment({
      customerName: customer.name,
      customerEmail: customer.email,
      amount,
      description: `Eerste levering bloemenabonnement | Celine's Bloemen`,
      subscriptionMeta: { subscriptionId: String(sub.id) },
    });

    await db.update(schema.subscriptions)
      .set({ mollieCustomerId: customerId })
      .where(eq(schema.subscriptions.id, sub.id));

    return json({ subscriptionId: sub.id, price: formatEuro(plan.price), paymentUrl: (payment as any).getCheckoutUrl() });
  } catch (err: any) {
    console.error('Subscribe error:', err?.message || err);
    return json({ error: 'Er ging iets mis bij het aanmaken van je abonnement' }, 500);
  }
};

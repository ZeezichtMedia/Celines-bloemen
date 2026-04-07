import type { APIRoute } from 'astro';
import { db, schema } from '../../lib/db';
import { createFirstPayment, priceToAmount } from '../../lib/mollie';
import { eq } from 'drizzle-orm';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const {
      customer,
      plan,
      delivery,
    } = body;

    // Insert subscription (pending until first payment completes)
    const [sub] = await db.insert(schema.subscriptions).values({
      status: 'pending',
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone || null,
      deliveryAddress: delivery.address || null,
      deliveryCity: delivery.city || null,
      deliveryPostalCode: delivery.postalCode || null,
      planType: plan.type,
      planSize: plan.size,
      frequency: plan.frequency,
      pricePerDelivery: priceToAmount(plan.price),
      colorPreference: plan.colorPreference || null,
      customerNote: customer.note || null,
    }).returning();

    // Create first Mollie payment (sets up mandate)
    const { payment, customerId } = await createFirstPayment({
      customerName: customer.name,
      customerEmail: customer.email,
      amount: priceToAmount(plan.price),
      description: `Eerste levering bloemenabonnement — Celine's Bloemen`,
      subscriptionMeta: {
        subscriptionId: String(sub.id),
      },
    });

    // Store Mollie customer ID
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
    return new Response(JSON.stringify({
      error: 'Er ging iets mis',
      detail: err?.message || 'Onbekende fout',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

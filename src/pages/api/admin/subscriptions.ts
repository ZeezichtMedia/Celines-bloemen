import type { APIRoute } from 'astro';
import { isAuthenticated } from '../../../lib/auth';
import { db, schema } from '../../../lib/db';
import { desc, eq } from 'drizzle-orm';
import { cancelSubscription, createSubscription, frequencyToInterval, vandaagNL } from '../../../lib/mollie';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  if (!isAuthenticated(request.headers.get('cookie'))) {
    return new Response(JSON.stringify({ error: 'Niet ingelogd' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
  const subs = await db.select().from(schema.subscriptions).orderBy(desc(schema.subscriptions.createdAt)).limit(100);
  return new Response(JSON.stringify(subs), { headers: { 'Content-Type': 'application/json' } });
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

// PATCH — pause/resume/cancel. Wat hier gebeurt, gebeurt eerst bij Mollie: lukt dat niet, dan verandert
// er niets in het beheer. Zo kan een abonnement nooit op gepauzeerd of opgezegd staan terwijl Mollie doorincasseert.
export const PATCH: APIRoute = async ({ request }) => {
  if (!isAuthenticated(request.headers.get('cookie'))) return json({ error: 'Niet ingelogd' }, 401);
  const { id, action } = await request.json(); // action: 'pause' | 'resume' | 'cancel'
  if (!['pause', 'resume', 'cancel'].includes(action)) return json({ error: 'Onbekende actie' }, 400);

  const [sub] = await db.select().from(schema.subscriptions).where(eq(schema.subscriptions.id, id)).limit(1);
  if (!sub) return json({ error: 'Niet gevonden' }, 404);

  if (action === 'pause' && sub.status !== 'active') return json({ error: 'Alleen een actief abonnement kun je pauzeren' }, 400);

  try {
    if (action === 'pause' || action === 'cancel') {
      // Mollie kent geen pauze: we zeggen het Mollie-abonnement op en maken bij hervatten een nieuw aan
      if (sub.mollieCustomerId && sub.mollieSubscriptionId) {
        await cancelSubscription(sub.mollieCustomerId, sub.mollieSubscriptionId);
      }
      await db.update(schema.subscriptions)
        .set({ status: action === 'pause' ? 'paused' : 'cancelled', mollieSubscriptionId: null, updatedAt: new Date() })
        .where(eq(schema.subscriptions.id, id));
      return json({ ok: true });
    }

    // Hervatten
    if (sub.status !== 'paused') return json({ error: 'Alleen een gepauzeerd abonnement kun je hervatten' }, 400);
    if (!sub.mollieCustomerId) return json({ error: 'Dit abonnement heeft geen betaalgegevens bij Mollie' }, 400);
    if (sub.mollieSubscriptionId) return json({ error: 'Dit abonnement loopt al bij Mollie' }, 400);
    // De volgende incasso is vandaag: na hervatten komt er meteen weer een levering
    const mollieSubscription = await createSubscription({
      customerId: sub.mollieCustomerId,
      amount: Number(sub.pricePerDelivery).toFixed(2),
      interval: frequencyToInterval(sub.frequency),
      description: `Bloemenabonnement ${sub.planSize} | Celine's Bloemen`,
      subscriptionId: sub.id,
      startDate: vandaagNL(),
      idempotencyKey: `abonnement-${sub.id}-hervat-${new Date(sub.updatedAt ?? Date.now()).getTime()}`,
    });
    await db.update(schema.subscriptions)
      .set({ status: 'active', mollieSubscriptionId: mollieSubscription.id, updatedAt: new Date() })
      .where(eq(schema.subscriptions.id, id));
    return json({ ok: true });
  } catch (e: any) {
    console.error('Mollie-actie op abonnement mislukt:', action, id, e?.message || e);
    return json({ error: 'Mollie gaf een fout, er is niets veranderd. Probeer het zo nog een keer of bel ons.' }, 502);
  }
};

// DELETE — remove subscription record. Eerst bij Mollie opzeggen; lukt dat niet, dan blijft het staan.
export const DELETE: APIRoute = async ({ request }) => {
  if (!isAuthenticated(request.headers.get('cookie'))) return json({ error: 'Niet ingelogd' }, 401);
  const { id } = await request.json();

  const [sub] = await db.select().from(schema.subscriptions).where(eq(schema.subscriptions.id, id)).limit(1);
  if (!sub) return json({ ok: true });
  if (sub.mollieCustomerId && sub.mollieSubscriptionId) {
    try {
      await cancelSubscription(sub.mollieCustomerId, sub.mollieSubscriptionId);
    } catch (e: any) {
      console.error('Mollie-opzegging bij verwijderen mislukt:', id, e?.message || e);
      return json({ error: 'Opzeggen bij Mollie lukte niet, het abonnement is niet verwijderd. Probeer het zo nog een keer.' }, 502);
    }
  }

  await db.delete(schema.subscriptions).where(eq(schema.subscriptions.id, id));
  return json({ ok: true });
};

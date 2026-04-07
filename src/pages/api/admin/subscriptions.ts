import type { APIRoute } from 'astro';
import { isAuthenticated } from '../../../lib/auth';
import { db, schema } from '../../../lib/db';
import { desc, eq } from 'drizzle-orm';
import { cancelSubscription } from '../../../lib/mollie';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  if (!isAuthenticated(request.headers.get('cookie'))) {
    return new Response(JSON.stringify({ error: 'Niet ingelogd' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
  const subs = await db.select().from(schema.subscriptions).orderBy(desc(schema.subscriptions.createdAt)).limit(100);
  return new Response(JSON.stringify(subs), { headers: { 'Content-Type': 'application/json' } });
};

// PATCH — pause/resume/cancel
export const PATCH: APIRoute = async ({ request }) => {
  if (!isAuthenticated(request.headers.get('cookie'))) {
    return new Response(JSON.stringify({ error: 'Niet ingelogd' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
  const { id, action } = await request.json(); // action: 'pause' | 'resume' | 'cancel'

  const [sub] = await db.select().from(schema.subscriptions).where(eq(schema.subscriptions.id, id)).limit(1);
  if (!sub) return new Response(JSON.stringify({ error: 'Niet gevonden' }), { status: 404, headers: { 'Content-Type': 'application/json' } });

  if (action === 'cancel' && sub.mollieCustomerId && sub.mollieSubscriptionId) {
    try {
      await cancelSubscription(sub.mollieCustomerId, sub.mollieSubscriptionId);
    } catch (e) {
      console.error('Mollie cancel failed:', e);
    }
  }

  const statusMap: Record<string, string> = { pause: 'paused', resume: 'active', cancel: 'cancelled' };
  await db.update(schema.subscriptions)
    .set({ status: statusMap[action] || sub.status, updatedAt: new Date() })
    .where(eq(schema.subscriptions.id, id));

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
};

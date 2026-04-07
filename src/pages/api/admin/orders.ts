import type { APIRoute } from 'astro';
import { isAuthenticated } from '../../../lib/auth';
import { db, schema } from '../../../lib/db';
import { desc, eq } from 'drizzle-orm';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  if (!isAuthenticated(request.headers.get('cookie'))) {
    return new Response(JSON.stringify({ error: 'Niet ingelogd' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
  const orders = await db.select().from(schema.orders).orderBy(desc(schema.orders.createdAt)).limit(100);
  return new Response(JSON.stringify(orders), { headers: { 'Content-Type': 'application/json' } });
};

// PATCH — update order status
export const PATCH: APIRoute = async ({ request }) => {
  if (!isAuthenticated(request.headers.get('cookie'))) {
    return new Response(JSON.stringify({ error: 'Niet ingelogd' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
  const { id, status, adminNote } = await request.json();
  await db.update(schema.orders)
    .set({ status, adminNote, updatedAt: new Date() })
    .where(eq(schema.orders.id, id));
  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
};

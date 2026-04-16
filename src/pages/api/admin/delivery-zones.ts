import type { APIRoute } from 'astro';
import { isAuthenticated } from '../../../lib/auth';
import { db, schema } from '../../../lib/db';
import { eq, asc } from 'drizzle-orm';

export const prerender = false;

function unauthorized() {
  return new Response(JSON.stringify({ error: 'Niet ingelogd' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

// GET all delivery zones (also public for checkout forms)
export const GET: APIRoute = async () => {
  const zones = await db.select().from(schema.deliveryZones).orderBy(asc(schema.deliveryZones.sortOrder));
  return new Response(JSON.stringify(zones), {
    headers: { 'Content-Type': 'application/json' },
  });
};

// PUT update all zones (full replace)
export const PUT: APIRoute = async ({ request }) => {
  if (!isAuthenticated(request.headers.get('cookie'))) return unauthorized();
  const zones: { id?: number; name: string; cost: string; sortOrder: number }[] = await request.json();

  // Delete all existing zones and re-insert
  await db.delete(schema.deliveryZones);
  if (zones.length > 0) {
    await db.insert(schema.deliveryZones).values(
      zones.map((z, i) => ({
        name: z.name,
        cost: z.cost,
        sortOrder: z.sortOrder ?? i,
      }))
    );
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

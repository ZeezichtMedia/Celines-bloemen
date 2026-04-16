import type { APIRoute } from 'astro';
import { db, schema } from '../../lib/db';
import { asc } from 'drizzle-orm';

export const prerender = false;

// Public GET — checkout forms fetch delivery zones from here
export const GET: APIRoute = async () => {
  const zones = await db.select().from(schema.deliveryZones).orderBy(asc(schema.deliveryZones.sortOrder));
  return new Response(JSON.stringify(zones), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
};

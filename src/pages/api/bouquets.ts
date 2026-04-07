import type { APIRoute } from 'astro';
import { getVisibleBouquets } from '../../lib/data';

export const prerender = false;

export const GET: APIRoute = async () => {
  const bouquets = await getVisibleBouquets();
  return new Response(JSON.stringify(bouquets), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60, s-maxage=60',
    },
  });
};

import type { APIRoute } from 'astro';
import { getSettings, publicShippingInfo } from '../../lib/settings';

export const prerender = false;

// Publiek: verzendtarief voor de checkout
export const GET: APIRoute = async () => {
  const info = publicShippingInfo(await getSettings());
  return new Response(JSON.stringify(info), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
};

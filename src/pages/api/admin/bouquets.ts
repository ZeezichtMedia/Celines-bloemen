import type { APIRoute } from 'astro';
import { isAuthenticated } from '../../../lib/auth';
import { getBouquets, saveBouquets } from '../../../lib/data';
import type { Bouquet } from '../../../lib/types';

export const prerender = false;

function unauthorized() {
  return new Response(JSON.stringify({ error: 'Niet ingelogd' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

// GET all bouquets
export const GET: APIRoute = async ({ request }) => {
  if (!isAuthenticated(request.headers.get('cookie'))) return unauthorized();
  const bouquets = await getBouquets();
  return new Response(JSON.stringify(bouquets), {
    headers: { 'Content-Type': 'application/json' },
  });
};

// PUT update all bouquets (full replace)
export const PUT: APIRoute = async ({ request }) => {
  if (!isAuthenticated(request.headers.get('cookie'))) return unauthorized();
  const bouquets: Bouquet[] = await request.json();
  await saveBouquets(bouquets);
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

// POST create new bouquet
export const POST: APIRoute = async ({ request }) => {
  if (!isAuthenticated(request.headers.get('cookie'))) return unauthorized();
  const newBouquet: Bouquet = await request.json();
  newBouquet.id = newBouquet.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const bouquets = await getBouquets();
  bouquets.push(newBouquet);
  await saveBouquets(bouquets);
  return new Response(JSON.stringify(newBouquet), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};

// DELETE bouquet by id (sent as JSON body)
export const DELETE: APIRoute = async ({ request }) => {
  if (!isAuthenticated(request.headers.get('cookie'))) return unauthorized();
  const { id } = await request.json();
  const bouquets = await getBouquets();
  const filtered = bouquets.filter((b) => b.id !== id);
  await saveBouquets(filtered);
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

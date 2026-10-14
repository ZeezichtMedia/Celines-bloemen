import type { APIRoute } from 'astro';
import { isAuthenticated } from '../../../lib/auth';
import { getBouquets, upsertBouquet, deleteBouquet } from '../../../lib/data';
import type { Bouquet } from '../../../lib/types';

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export const GET: APIRoute = async ({ request }) => {
  if (!isAuthenticated(request.headers.get('cookie'))) return json({ error: 'Niet ingelogd' }, 401);
  return json(await getBouquets());
};

// Eén item opslaan (nieuw of bestaand). Een lijst mag ook: dan wordt elk item opgeslagen,
// items die niet in de lijst staan blijven bestaan (verwijderen gaat via DELETE).
export const PUT: APIRoute = async ({ request }) => {
  if (!isAuthenticated(request.headers.get('cookie'))) return json({ error: 'Niet ingelogd' }, 401);
  const body = (await request.json()) as Bouquet | Bouquet[];
  const items = Array.isArray(body) ? body : [body];
  if (items.some((i) => !i?.name?.trim())) return json({ error: 'Naam is verplicht' }, 400);
  const saved: Bouquet[] = [];
  for (const item of items) saved.push(await upsertBouquet(item));
  return json(Array.isArray(body) ? saved : saved[0]);
};

export const POST: APIRoute = async ({ request }) => {
  if (!isAuthenticated(request.headers.get('cookie'))) return json({ error: 'Niet ingelogd' }, 401);
  const item = (await request.json()) as Bouquet;
  if (!item?.name?.trim()) return json({ error: 'Naam is verplicht' }, 400);
  return json(await upsertBouquet({ ...item, id: '' }), 201);
};

export const DELETE: APIRoute = async ({ request }) => {
  if (!isAuthenticated(request.headers.get('cookie'))) return json({ error: 'Niet ingelogd' }, 401);
  const { id } = await request.json();
  if (typeof id !== 'string' || !id) return json({ error: 'Geen id' }, 400);
  await deleteBouquet(id);
  return json({ ok: true });
};

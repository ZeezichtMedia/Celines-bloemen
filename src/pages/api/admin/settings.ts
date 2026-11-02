import type { APIRoute } from 'astro';
import { isAuthenticated } from '../../../lib/auth';
import { getSettings, saveSettings, resolveNotifyEmail } from '../../../lib/settings';
import { settingsSchema, validateOrError } from '../../../lib/validation';

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

// Welke Mollie-sleutel staat er? Alleen met een live-sleutel mag de webshop open:
// met een testsleutel zouden echte klanten nepbetalingen doen.
function mollieModus(): 'live' | 'test' | 'geen' {
  const key = process.env.MOLLIE_API_KEY ?? '';
  return key.startsWith('live_') ? 'live' : key.startsWith('test_') ? 'test' : 'geen';
}

export const GET: APIRoute = async ({ request }) => {
  if (!isAuthenticated(request.headers.get('cookie'))) return json({ error: 'Niet ingelogd' }, 401);
  const settings = await getSettings();
  return json({ ...settings, effectiveNotifyEmail: resolveNotifyEmail(settings), mollie: mollieModus() });
};

export const PUT: APIRoute = async ({ request }) => {
  if (!isAuthenticated(request.headers.get('cookie'))) return json({ error: 'Niet ingelogd' }, 401);
  const { data, error } = validateOrError(settingsSchema, await request.json());
  if (error || !data) return json({ error }, 400);
  if (data.checkout_enabled === 'true' && mollieModus() !== 'live') {
    return json({ error: 'Mollie is nog niet live gekoppeld. Zodra dat zo is, kun je de webshop aanzetten.' }, 400);
  }
  await saveSettings(data);
  return json({ ok: true });
};

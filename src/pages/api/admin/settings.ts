import type { APIRoute } from 'astro';
import { isAuthenticated } from '../../../lib/auth';
import { getSettings, saveSettings, resolveNotifyEmail } from '../../../lib/settings';
import { settingsSchema, validateOrError } from '../../../lib/validation';

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export const GET: APIRoute = async ({ request }) => {
  if (!isAuthenticated(request.headers.get('cookie'))) return json({ error: 'Niet ingelogd' }, 401);
  const settings = await getSettings();
  return json({ ...settings, effectiveNotifyEmail: resolveNotifyEmail(settings) });
};

export const PUT: APIRoute = async ({ request }) => {
  if (!isAuthenticated(request.headers.get('cookie'))) return json({ error: 'Niet ingelogd' }, 401);
  const { data, error } = validateOrError(settingsSchema, await request.json());
  if (error || !data) return json({ error }, 400);
  await saveSettings(data);
  return json({ ok: true });
};

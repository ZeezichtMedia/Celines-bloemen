import type { APIRoute } from 'astro';
import { checkPassword, createSessionCookie } from '../../../lib/auth';
import { loginSchema, validateOrError } from '../../../lib/validation';
import { checkRateLimit, getClientIP } from '../../../lib/rate-limit';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const ip = getClientIP(request);

  // Rate limit: 5 attempts per 15 minutes per IP
  const limit = checkRateLimit(`login:${ip}`, 5, 15 * 60 * 1000);
  if (!limit.allowed) {
    const retryMin = Math.ceil(limit.resetIn / 60000);
    return new Response(JSON.stringify({ error: `Te veel pogingen. Probeer het over ${retryMin} minuten opnieuw.` }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': String(Math.ceil(limit.resetIn / 1000)) },
    });
  }

  const body = await request.json();
  const { data, error } = validateOrError(loginSchema, body);
  if (error || !data) {
    return new Response(JSON.stringify({ error: error || 'Ongeldig verzoek' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!checkPassword(data.password)) {
    return new Response(JSON.stringify({ error: 'Onjuist wachtwoord' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': createSessionCookie(),
    },
  });
};

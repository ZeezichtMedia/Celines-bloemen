import type { APIRoute } from 'astro';
import { isAuthenticated } from '../../../lib/auth';
import { uploadImage } from '../../../lib/data';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  if (!isAuthenticated(request.headers.get('cookie'))) {
    return new Response(JSON.stringify({ error: 'Niet ingelogd' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return new Response(JSON.stringify({ error: 'Geen bestand geüpload' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = await uploadImage(file);
  return new Response(JSON.stringify({ url }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

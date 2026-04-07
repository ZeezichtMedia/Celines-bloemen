import type { APIRoute } from 'astro';
import { isAuthenticated } from '../../../lib/auth';
import { uploadImage } from '../../../lib/data';

export const prerender = false;

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

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

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return new Response(JSON.stringify({ error: `Ongeldig bestandstype. Toegestaan: ${ALLOWED_TYPES.map(t => t.split('/')[1]).join(', ')}` }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return new Response(JSON.stringify({ error: 'Bestand is te groot (max 5MB)' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = await uploadImage(file);
  return new Response(JSON.stringify({ url }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

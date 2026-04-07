import type { APIRoute } from 'astro';
import { isAuthenticated } from '../../../lib/auth';
import { getProducts, saveProducts } from '../../../lib/data';
import type { Product } from '../../../lib/types';

export const prerender = false;

function unauthorized() {
  return new Response(JSON.stringify({ error: 'Niet ingelogd' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const GET: APIRoute = async ({ request }) => {
  if (!isAuthenticated(request.headers.get('cookie'))) return unauthorized();
  const products = await getProducts();
  return new Response(JSON.stringify(products), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PUT: APIRoute = async ({ request }) => {
  if (!isAuthenticated(request.headers.get('cookie'))) return unauthorized();
  const products: Product[] = await request.json();
  await saveProducts(products);
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request }) => {
  if (!isAuthenticated(request.headers.get('cookie'))) return unauthorized();
  const newProduct: Product = await request.json();
  newProduct.id = newProduct.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const products = await getProducts();
  products.push(newProduct);
  await saveProducts(products);
  return new Response(JSON.stringify(newProduct), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async ({ request }) => {
  if (!isAuthenticated(request.headers.get('cookie'))) return unauthorized();
  const { id } = await request.json();
  const products = await getProducts();
  await saveProducts(products.filter((p) => p.id !== id));
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

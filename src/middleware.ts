import { defineMiddleware } from 'astro:middleware';
import { SITE_CACHE_TAG } from './lib/cache';

// Nooit bewaren: beheer, API, afrekenen en bevestigingen (persoonlijk of altijd actueel)
const NIET_BEWAREN = ['/admin', '/api', '/afrekenen', '/bestelling', '/abonnementen/bevestiging'];

export const onRequest = defineMiddleware(async (ctx, next) => {
  const res = await next();
  if (ctx.isPrerendered || ctx.request.method !== 'GET' || res.status !== 200) return res;
  const pad = ctx.url.pathname.replace(/\/$/, '') || '/';
  if (NIET_BEWAREN.some((p) => pad === p || pad.startsWith(`${p}/`))) return res;
  if (!(res.headers.get('content-type') ?? '').includes('text/html')) return res;
  // Een pagina die zelf no-store zet (voorbeeld voor wie is ingelogd) blijft persoonlijk
  if ((res.headers.get('Cache-Control') ?? '').includes('no-store')) return res;

  // Browser vraagt altijd opnieuw, de CDN bewaart een uur en ververst daarna op de achtergrond.
  // Een wijziging in het beheer leegt de CDN direct (purgeSiteCache).
  res.headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
  res.headers.set('Vercel-CDN-Cache-Control', 'max-age=3600, stale-while-revalidate=86400');
  res.headers.set('Vercel-Cache-Tag', SITE_CACHE_TAG);
  return res;
});

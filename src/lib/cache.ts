import { dangerouslyDeleteByTag } from '@vercel/functions';

// Publieke pagina's worden door de Vercel-CDN bewaard (zie middleware.ts) met dit label.
// Na elke wijziging in het beheer gooien we ze weg, zodat de volgende bezoeker meteen
// de nieuwe versie ziet. Lokaal en buiten Vercel doet dit niets.
export const SITE_CACHE_TAG = 'site';

export async function purgeSiteCache(): Promise<void> {
  try {
    await dangerouslyDeleteByTag(SITE_CACHE_TAG);
  } catch (err) {
    console.error('Cache legen mislukt:', err);
  }
}

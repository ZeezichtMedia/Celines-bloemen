// Boeketten en producten verwijzen (vanuit het beheer) naar .png/.jpeg-bestanden.
// Van de vaste foto's in /public staat een lichtere .webp naast het origineel: die tonen we.
// Foto's die Celine zelf uploadt (Vercel Blob, https://...) gaan ongewijzigd door.
const WEBP_NAAST = new Set([
  '/images/bestellen/zacht-pastel.png',
  '/images/bestellen/puur-wit.png',
  '/images/bestellen/vrolijk-veld.png',
  '/images/bestellen/warm-terracotta.png',
  '/images/verhuur/aankleding-tafel.jpeg',
  '/images/verhuur/kandelaar-laag-goud-verhuur.jpeg',
  '/images/verhuur/kandelaar-recht-verhuur.jpeg',
  '/images/verhuur/kandelaar-rondje-verhuur.jpeg',
  '/images/verhuur/vaas-verhuur.jpeg',
  '/images/winkel/winkel-interieur.png',
]);

export function licht(src: string): string {
  return WEBP_NAAST.has(src) ? src.replace(/\.(png|jpe?g)$/, '.webp') : src;
}

// Een product kan meerdere foto's hebben. Ze staan samen in de kolom image, één URL per regel,
// de eerste is de hoofdfoto. Een bestaande rij met één foto blijft zo gewoon geldig.
export function leesFotos(kolom: string | null | undefined): string[] {
  return (kolom ?? '').split('\n').map((u) => u.trim()).filter(Boolean);
}

export function schrijfFotos(fotos: string[]): string {
  return fotos.map((u) => u.trim()).filter(Boolean).join('\n');
}

// Bestelregels van Celine die zowel het formulier als de server gebruiken. Geen database hier:
// dit bestand gaat ook mee naar de browser.

/** Kaartje met eigen tekst bij een boeket (Celine, 22 mei 2026). */
export const KAARTJE_PRIJS = 1.5;

// Bezorgen op de dag zelf kan als je vóór 08:00 bestelt (Celine, 23 sep 2026).
// Altijd in Nederlandse tijd: de server draait in UTC en de bezoeker kan in een andere tijdzone zitten.
export const BESTEL_VOOR_UUR = 8;

function nuInNederland(d: Date): { datum: string; uur: number } {
  const delen = new Intl.DateTimeFormat('nl-NL', {
    timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(d);
  const deel = (t: string) => delen.find((p) => p.type === t)?.value ?? '';
  return { datum: `${deel('year')}-${deel('month')}-${deel('day')}`, uur: Number(deel('hour')) };
}

function plusDagen(datum: string, n: number): string {
  const d = new Date(`${datum}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Vroegste bezorgdatum (JJJJ-MM-DD): vandaag vóór 08:00, anders morgen. */
export function vroegsteBezorgdag(nu: Date = new Date()): string {
  const { datum, uur } = nuInNederland(nu);
  return uur < BESTEL_VOOR_UUR ? datum : plusDagen(datum, 1);
}

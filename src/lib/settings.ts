import { db, schema } from './db';
import { purgeSiteCache } from './cache';

export interface Settings {
  shipping_enabled: string;    // "true" | "false" — pakketverzending aanbieden (Celine wil dit nu niet)
  shipping_cost: string;       // "6.95" — pakketverzending heel Nederland
  free_shipping_from: string;  // "75.00" — gratis verzending vanaf dit subtotaal ("" = nooit gratis)
  notify_email: string;        // waar nieuwe bestellingen/abonnementen heen gemaild worden
  announcement: string;        // mededeling bovenaan elke pagina ("" = geen balk)
  opening_hours: string;       // JSON: 7 dagen (ma t/m zo), elk { open, close } of null = gesloten
}

export type DayHours = { open: string; close: string } | null;

export const WEEKDAYS = [
  { nl: 'Maandag', schema: 'Monday' },
  { nl: 'Dinsdag', schema: 'Tuesday' },
  { nl: 'Woensdag', schema: 'Wednesday' },
  { nl: 'Donderdag', schema: 'Thursday' },
  { nl: 'Vrijdag', schema: 'Friday' },
  { nl: 'Zaterdag', schema: 'Saturday' },
  { nl: 'Zondag', schema: 'Sunday' },
] as const;

const DEFAULT_HOURS: DayHours[] = [
  null,
  { open: '09:00', close: '17:00' },
  { open: '09:00', close: '17:00' },
  { open: '09:00', close: '17:00' },
  { open: '09:00', close: '17:00' },
  { open: '09:00', close: '12:30' },
  null,
];

export const DEFAULT_SETTINGS: Settings = {
  shipping_enabled: 'false',
  shipping_cost: '6.95',
  free_shipping_from: '75.00',
  notify_email: '',
  announcement: '',
  opening_hours: JSON.stringify(DEFAULT_HOURS),
};

export async function getSettings(): Promise<Settings> {
  const rows = await db.select().from(schema.settings);
  const merged: Settings = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    if (row.key in merged) (merged as any)[row.key] = row.value;
  }
  return merged;
}

export async function saveSettings(partial: Partial<Settings>): Promise<void> {
  for (const [key, value] of Object.entries(partial)) {
    if (!(key in DEFAULT_SETTINGS) || typeof value !== 'string') continue;
    await db.insert(schema.settings)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({ target: schema.settings.key, set: { value, updatedAt: new Date() } });
  }
  await purgeSiteCache();
}

/** Instellingen voor publieke pagina's: valt terug op de standaardwaarden als de database even weg is. */
export async function getPublicSettings(): Promise<Settings> {
  try {
    return await getSettings();
  } catch (err) {
    console.error('Instellingen ophalen mislukt, standaardwaarden gebruikt:', err);
    return { ...DEFAULT_SETTINGS };
  }
}

const TIJD = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidOpeningHours(raw: string): boolean {
  try {
    const days = JSON.parse(raw);
    return Array.isArray(days) && days.length === 7 && days.every((d) =>
      d === null || (TIJD.test(d?.open) && TIJD.test(d?.close) && d.open < d.close));
  } catch {
    return false;
  }
}

export function parseOpeningHours(settings: Settings): DayHours[] {
  return isValidOpeningHours(settings.opening_hours) ? JSON.parse(settings.opening_hours) : DEFAULT_HOURS;
}

/** Voor schema.org: dagen met dezelfde tijden samen in één regel. */
export function openingHoursSchema(hours: DayHours[]) {
  const groups = new Map<string, string[]>();
  hours.forEach((h, i) => {
    if (!h) return;
    const key = `${h.open}-${h.close}`;
    groups.set(key, [...(groups.get(key) ?? []), WEEKDAYS[i].schema]);
  });
  return [...groups].map(([key, days]) => {
    const [opens, closes] = key.split('-');
    return { '@type': 'OpeningHoursSpecification', dayOfWeek: days, opens, closes };
  });
}

/** E-mailadres voor eigenaar-notificaties: instelling > env > SMTP-gebruiker. */
export function resolveNotifyEmail(settings: Settings): string | null {
  return settings.notify_email || process.env.NOTIFY_EMAIL || process.env.SMTP_USER || null;
}

/** Publieke verzendinfo voor de checkout (geen gevoelige velden). */
export function publicShippingInfo(settings: Settings) {
  const cost = parseFloat(settings.shipping_cost) || 0;
  const freeFrom = settings.free_shipping_from ? parseFloat(settings.free_shipping_from) : null;
  return { enabled: settings.shipping_enabled === 'true', cost, freeFrom: freeFrom && freeFrom > 0 ? freeFrom : null };
}

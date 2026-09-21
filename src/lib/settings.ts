import { db, schema } from './db';
import { eq } from 'drizzle-orm';

export interface Settings {
  shipping_enabled: string;    // "true" | "false" — pakketverzending aanbieden (Celine wil dit nu niet)
  shipping_cost: string;       // "6.95" — pakketverzending heel Nederland
  free_shipping_from: string;  // "75.00" — gratis verzending vanaf dit subtotaal ("" = nooit gratis)
  notify_email: string;        // waar nieuwe bestellingen/abonnementen heen gemaild worden
}

export const DEFAULT_SETTINGS: Settings = {
  shipping_enabled: 'false',
  shipping_cost: '6.95',
  free_shipping_from: '75.00',
  notify_email: '',
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

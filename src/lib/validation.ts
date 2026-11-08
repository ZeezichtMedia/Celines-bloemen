import { isValidOpeningHours } from './settings';
import { z } from 'zod';

export const customerSchema = z.object({
  name: z.string().min(2, 'Naam is verplicht').max(255),
  email: z.string().email('Ongeldig e-mailadres').max(255),
  phone: z.string().max(30).optional().nullable(),
  note: z.string().max(1000).optional().nullable(),
});

// Bedragen worden bewust NIET geaccepteerd: de server rekent alles zelf uit (lib/pricing.ts)
export const ontvangerSchema = z.object({
  naam: z.string().trim().min(2, 'Vul de naam van de ontvanger in').max(120),
  adres: z.string().trim().min(3, 'Vul het adres van de ontvanger in').max(300),
  postcode: z.string().trim().min(4, 'Vul de postcode van de ontvanger in').max(10),
  zoneId: z.number().int().positive(),
  datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ongeldige bezorgdatum'),
});

export const cartItemSchema = z.object({
  productId: z.string().min(1).max(255),
  size: z.string().max(50).optional().nullable(),
  quantity: z.number().int().min(1).max(100),
  ontvanger: ontvangerSchema.optional().nullable(),
  kaartje: z.string().trim().max(200, 'De tekst op het kaartje mag maximaal 200 tekens zijn').optional().nullable(),
});

export const deliverySchema = z.object({
  method: z.enum(['pickup', 'local', 'shipping', 'adressen']), // adressen: alles gaat naar de adressen bij de boeketten
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ongeldige datum').optional().nullable(),
  zoneId: z.number().int().positive().optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(255).optional().nullable(),
  postalCode: z.string().max(10).optional().nullable(),
}).superRefine((d, ctx) => {
  if (d.method === 'local' || d.method === 'shipping') {
    if (!d.address?.trim()) ctx.addIssue({ code: 'custom', message: 'Adres is verplicht', path: ['address'] });
    if (!d.postalCode?.trim()) ctx.addIssue({ code: 'custom', message: 'Postcode is verplicht', path: ['postalCode'] });
    if (!d.city?.trim()) ctx.addIssue({ code: 'custom', message: 'Plaats is verplicht', path: ['city'] });
  }
  if (d.method === 'local' && !d.date) ctx.addIssue({ code: 'custom', message: 'Kies een bezorgdatum', path: ['date'] });
});

export const checkoutSchema = z.object({
  customer: customerSchema.extend({ phone: z.string().trim().min(8, 'Telefoonnummer is verplicht').max(30) }),
  items: z.array(cartItemSchema).min(1, 'Winkelwagen is leeg'),
  delivery: deliverySchema,
  paymentMethod: z.enum(['online', 'in_store']).optional().default('online'),
  card: z.string().trim().max(200, 'De tekst op het kaartje mag maximaal 200 tekens zijn').optional().nullable(),
  acceptTerms: z.literal(true, { message: 'Je moet akkoord gaan met de algemene voorwaarden' }),
});

export const subscriptionPlanSchema = z.object({
  type: z.enum(['fresh', 'artificial']),
  size: z.string().min(1).max(50),
  frequency: z.enum(['weekly', 'biweekly', 'triweekly', 'monthly', 'quarterly', 'biannual', 'yearly']),
  colorPreference: z.string().max(500).optional().nullable(),
  vaseIncluded: z.boolean().optional().default(false),
});

export const subscribeSchema = z.object({
  customer: customerSchema,
  plan: subscriptionPlanSchema,
  delivery: z.object({
    address: z.string().min(1, 'Adres is verplicht').max(500),
    city: z.string().min(1, 'Plaats is verplicht').max(255),
    postalCode: z.string().min(4, 'Postcode is verplicht').max(10),
  }),
  acceptTerms: z.literal(true, { message: 'Je moet akkoord gaan met de algemene voorwaarden' }),
});

export const loginSchema = z.object({
  password: z.string().min(1, 'Wachtwoord is verplicht').max(255),
});

export const settingsSchema = z.object({
  shipping_enabled: z.enum(['true', 'false']).optional(),
  checkout_enabled: z.enum(['true', 'false']).optional(),
  shipping_cost: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Ongeldig bedrag').optional(),
  free_shipping_from: z.string().regex(/^(\d+(\.\d{1,2})?)?$/, 'Ongeldig bedrag').optional(),
  notify_email: z.string().email('Ongeldig e-mailadres').or(z.literal('')).optional(),
  announcement: z.string().trim().max(200, 'De mededeling mag maximaal 200 tekens zijn').optional(),
  opening_hours: z.string().refine(isValidOpeningHours, 'Controleer de openingstijden: de sluittijd moet na de openingstijd liggen').optional(),
});

export function validateOrError<T>(schema: z.ZodSchema<T>, data: unknown): { data: T; error: null } | { data: null; error: string } {
  const result = schema.safeParse(data);
  if (result.success) return { data: result.data, error: null };
  const issues = (result.error as any).issues ?? (result.error as any).errors ?? [];
  const firstError = issues[0];
  return { data: null, error: firstError?.message || 'Ongeldige invoer' };
}

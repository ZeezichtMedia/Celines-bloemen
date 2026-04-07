import { z } from 'zod';

export const customerSchema = z.object({
  name: z.string().min(2, 'Naam is verplicht').max(255),
  email: z.string().email('Ongeldig e-mailadres').max(255),
  phone: z.string().max(30).optional().nullable(),
  note: z.string().max(1000).optional().nullable(),
});

export const deliverySchema = z.object({
  method: z.enum(['pickup', 'local', 'shipping']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ongeldige datum').optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(255).optional().nullable(),
  postalCode: z.string().max(10).optional().nullable(),
  region: z.string().max(100).optional().nullable(),
  cost: z.string().max(20).optional().nullable(),
});

export const cartItemSchema = z.object({
  productId: z.string().min(1).max(255),
  name: z.string().min(1).max(255),
  size: z.string().max(50).optional(),
  quantity: z.number().int().min(1).max(100),
  price: z.string().max(20),
});

export const checkoutSchema = z.object({
  customer: customerSchema,
  items: z.array(cartItemSchema).min(1, 'Winkelwagen is leeg'),
  delivery: deliverySchema,
  subtotal: z.string().max(20),
  total: z.string().max(20),
});

export const subscriptionPlanSchema = z.object({
  type: z.enum(['fresh', 'artificial']),
  size: z.string().min(1).max(50),
  frequency: z.enum(['weekly', 'biweekly', 'monthly', 'quarterly', 'biannual', 'yearly']),
  price: z.string().max(20),
  colorPreference: z.string().max(500).optional().nullable(),
});

export const subscribeSchema = z.object({
  customer: customerSchema,
  plan: subscriptionPlanSchema,
  delivery: z.object({
    address: z.string().min(1, 'Adres is verplicht').max(500),
    city: z.string().min(1, 'Plaats is verplicht').max(255),
    postalCode: z.string().min(4, 'Postcode is verplicht').max(10),
  }),
});

export const loginSchema = z.object({
  password: z.string().min(1, 'Wachtwoord is verplicht').max(255),
});

export function validateOrError<T>(schema: z.ZodSchema<T>, data: unknown): { data: T; error: null } | { data: null; error: string } {
  const result = schema.safeParse(data);
  if (result.success) return { data: result.data, error: null };
  const firstError = result.error.errors[0];
  return { data: null, error: firstError?.message || 'Ongeldige invoer' };
}

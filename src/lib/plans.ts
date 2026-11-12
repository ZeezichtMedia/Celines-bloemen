// Abonnementsplannen: één bron voor de pagina én de server-side prijscheck.
// De client stuurt alleen type + size + frequency; de prijs wordt hier opgezocht.

export type PlanType = 'fresh' | 'artificial';
export type Frequency = 'weekly' | 'biweekly' | 'triweekly' | 'monthly' | 'quarterly' | 'biannual' | 'yearly';

export interface Plan {
  type: PlanType;
  size: string;
  price: number | null;   // per levering, incl. btw. null = prijs nog niet bepaald, alleen op aanvraag
  description: string;
  bullets: string[];
  featured?: boolean;
  frequencies: Frequency[]; // toegestane frequenties
  defaultFrequency: Frequency;
}

const VAAS = 'Het boeket kan in een vaas worden geleverd, en de keer erna ruilen we de vaas weer om.';

export const FRESH_FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: 'biweekly', label: 'Per 2 weken' },
  { value: 'triweekly', label: 'Per 3 weken' },
  { value: 'monthly', label: 'Per maand' },
];

const freshFreqs = FRESH_FREQUENCIES.map((f) => f.value);

export const PLANS: Plan[] = [
  {
    type: 'fresh', size: 'Small', price: 17.95,
    description: `Een leuk boeketje voor op tafel met de bloemen van het seizoen. ${VAAS}`,
    bullets: ['Seizoensbloemen', 'Keuze van de bloemist', 'Inclusief lokale bezorging'],
    frequencies: freshFreqs, defaultFrequency: 'biweekly',
  },
  {
    type: 'fresh', size: 'Medium', price: 24.95, featured: true,
    description: `Een mooi, groot boeket als blikvanger in huis. ${VAAS}`,
    bullets: ['Seizoensbloemen', 'Keuze van de bloemist', 'Inclusief lokale bezorging'],
    frequencies: freshFreqs, defaultFrequency: 'biweekly',
  },
  {
    type: 'fresh', size: 'Large', price: 32.95,
    description: `Een prachtig groot boeket met seizoensbloemen. ${VAAS}`,
    bullets: ['Dagverse bloemen', 'Keuze van de bloemist', 'Inclusief lokale bezorging'],
    frequencies: freshFreqs, defaultFrequency: 'biweekly',
  },
  {
    type: 'artificial', size: 'Maandelijks', price: null,
    description: 'Elke maand een nieuw kunstbloemenboeket in huis of op kantoor. Het boeket wordt in een vaas geleverd, dus je hebt er geen omkijken naar.',
    bullets: ['Elke maand een nieuw boeket', 'Inclusief vaas', 'Geen onderhoud nodig'],
    frequencies: ['monthly'], defaultFrequency: 'monthly',
  },
  {
    type: 'artificial', size: 'Per halfjaar', price: null, featured: true,
    description: 'Twee keer per jaar een nieuw kunstbloemenboeket dat past bij het seizoen. Het boeket wordt in een vaas geleverd, dus je hebt er geen omkijken naar.',
    bullets: ['2x per jaar een nieuw boeket', 'Inclusief vaas', 'Geen onderhoud nodig'],
    frequencies: ['biannual'], defaultFrequency: 'biannual',
  },
  {
    type: 'artificial', size: 'Per jaar', price: null,
    description: 'Eén keer per jaar een nieuw kunstbloemenboeket. Maximaal gemak, het hele jaar door bloemen in huis of op kantoor.',
    bullets: ['1x per jaar een nieuw boeket', 'Inclusief vaas', 'Geen onderhoud nodig'],
    frequencies: ['yearly'], defaultFrequency: 'yearly',
  },
];

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  weekly: 'Wekelijks',
  biweekly: 'Per 2 weken',
  triweekly: 'Per 3 weken',
  monthly: 'Per maand',
  quarterly: 'Per kwartaal',
  biannual: 'Per halfjaar',
  yearly: 'Per jaar',
};

export function formatEuro(n: number): string {
  return `€ ${n.toFixed(2).replace('.', ',')}`;
}

/** Prijslabel voor een plan. Plannen zonder prijs gaan via contact. */
export function planPriceLabel(plan: Plan): string {
  return plan.price == null ? 'Op aanvraag' : formatEuro(plan.price);
}

export function planLabel(plan: Plan): string {
  return plan.type === 'fresh' ? `${plan.size} seizoensboeket` : `Kunstbloemen ${plan.size.toLowerCase()}`;
}

/** Sleutel van een plan in de prijzen uit het beheer, bijv. "fresh:Medium". */
export const planKey = (p: Pick<Plan, 'type' | 'size'>) => `${p.type}:${p.size}`;

/**
 * Prijzen uit het beheer (instelling plan_prijzen, JSON { "fresh:Medium": 23.95, "artificial:Per jaar": null })
 * over de standaardprijzen heen. null of 0 = op aanvraag. Ontbreekt een plan, dan geldt de standaardprijs.
 */
export function plansMetPrijzen(raw: string | null | undefined): Plan[] {
  let prijzen: Record<string, unknown> = {};
  try { prijzen = raw ? JSON.parse(raw) : {}; } catch { prijzen = {}; }
  return PLANS.map((p) => {
    if (!(planKey(p) in prijzen)) return p;
    const v = Number(prijzen[planKey(p)]);
    return { ...p, price: prijzen[planKey(p)] != null && v > 0 ? Math.round(v * 100) / 100 : null };
  });
}

/** Zoekt een plan op en controleert of de frequentie erbij mag. Null = ongeldig of (nog) niet online te bestellen. */
export function resolvePlan(type: string, size: string, frequency: string, plans: Plan[] = PLANS): (Plan & { price: number }) | null {
  const plan = plans.find((p) => p.type === type && p.size.toLowerCase() === size.toLowerCase());
  if (!plan) return null;
  if (plan.price == null) return null; // prijs nog niet bepaald: loopt via contact
  if (!plan.frequencies.includes(frequency as Frequency)) return null;
  return plan as Plan & { price: number };
}

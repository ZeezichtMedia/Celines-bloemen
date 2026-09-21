// Abonnementsplannen: één bron voor de pagina én de server-side prijscheck.
// De client stuurt alleen type + size + frequency; de prijs wordt hier opgezocht.

export type PlanType = 'fresh' | 'artificial';
export type Frequency = 'weekly' | 'biweekly' | 'triweekly' | 'monthly' | 'quarterly' | 'biannual' | 'yearly';

export interface Plan {
  type: PlanType;
  size: string;
  price: number;          // per levering, incl. btw
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
    type: 'fresh', size: 'Medium', price: 23.95, featured: true,
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
    type: 'artificial', size: 'Kwartaal', price: 49.95,
    description: 'Elk kwartaal een nieuw kunstbloemen arrangement dat past bij het seizoen en jouw interieur.',
    bullets: ['4x per jaar vernieuwd', 'Seizoensgebonden styling', 'Onderhoudsvrij'],
    frequencies: ['quarterly'], defaultFrequency: 'quarterly',
  },
  {
    type: 'artificial', size: 'Halfjaar', price: 89.95, featured: true,
    description: 'Twee keer per jaar een groter, luxer arrangement. De perfecte balans tussen afwisseling en gemak.',
    bullets: ['2x per jaar vernieuwd', 'Luxe arrangement', 'Persoonlijke kleurkeuze'],
    frequencies: ['biannual'], defaultFrequency: 'biannual',
  },
  {
    type: 'artificial', size: 'Jaar', price: 159.95,
    description: 'Een jaarabonnement met maximaal gemak. Eenmalig kiezen, het hele jaar genieten van wisselende kunstbloemen.',
    bullets: ['4 wisselingen per jaar', 'Voordeligste prijs per wisseling', 'Maximaal ontzorgd'],
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

export function planLabel(plan: Plan): string {
  return plan.type === 'fresh' ? `${plan.size} seizoensboeket` : `Kunstbloemen per ${plan.size.toLowerCase()}`;
}

/** Zoekt een plan op en controleert of de frequentie erbij mag. Null = ongeldig. */
export function resolvePlan(type: string, size: string, frequency: string): Plan | null {
  const plan = PLANS.find((p) => p.type === type && p.size.toLowerCase() === size.toLowerCase());
  if (!plan) return null;
  if (!plan.frequencies.includes(frequency as Frequency)) return null;
  return plan;
}

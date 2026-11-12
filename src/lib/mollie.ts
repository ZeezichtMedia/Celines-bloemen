import { createMollieClient, SequenceType } from '@mollie/api-client';

function getMollieClient() {
  const apiKey = process.env.MOLLIE_API_KEY?.trim();
  if (!apiKey) throw new Error('MOLLIE_API_KEY is niet ingesteld');
  return createMollieClient({ apiKey });
}

const SITE_URL = process.env.SITE_URL || 'http://localhost:4321';

// ============================================================
// One-time payments (orders)
// ============================================================

export async function createPayment({
  orderId,
  orderNumber,
  amount,
  description,
  redirectUrl,
}: {
  orderId: number;
  orderNumber: string;
  amount: string; // "29.95"
  description: string;
  redirectUrl?: string;
}) {
  const mollie = getMollieClient();
  const payment = await mollie.payments.create({
    amount: { currency: 'EUR', value: amount },
    description,
    redirectUrl: redirectUrl || `${SITE_URL}/bestelling/bevestiging?order=${orderNumber}`,
    webhookUrl: `${SITE_URL}/api/webhooks/mollie`,
    metadata: { orderId: String(orderId), orderNumber },
  });
  return payment;
}

export async function getPayment(paymentId: string) {
  const mollie = getMollieClient();
  return mollie.payments.get(paymentId);
}

// ============================================================
// Subscriptions (abonnementen)
// ============================================================

export async function createFirstPayment({
  customerName,
  customerEmail,
  amount,
  description,
  subscriptionMeta,
}: {
  customerName: string;
  customerEmail: string;
  amount: string;
  description: string;
  subscriptionMeta: Record<string, string>;
}) {
  const mollie = getMollieClient();

  // Create or find customer
  const customer = await mollie.customers.create({
    name: customerName,
    email: customerEmail,
  });

  // Create first payment to set up mandate
  const payment = await mollie.payments.create({
    amount: { currency: 'EUR', value: amount },
    description,
    sequenceType: SequenceType.first,
    customerId: customer.id,
    // Met het abonnementsnummer kan de bedankpagina de echte uitkomst opzoeken
    redirectUrl: `${SITE_URL}/abonnementen/bevestiging${subscriptionMeta.subscriptionId ? `?id=${subscriptionMeta.subscriptionId}` : ''}`,
    webhookUrl: `${SITE_URL}/api/webhooks/mollie-subscription`,
    metadata: {
      type: 'subscription_first',
      customerId: customer.id,
      ...subscriptionMeta,
    },
  });

  return { payment, customerId: customer.id };
}

export async function createSubscription({
  customerId,
  amount,
  interval,
  description,
  subscriptionId,
  startDate,
  idempotencyKey,
}: {
  customerId: string;
  amount: string;
  interval: string; // '1 weeks', '2 weeks', '1 months', '3 months'
  description: string;
  subscriptionId: number;
  /** Eerste incassodag (YYYY-MM-DD). Zonder startDate incasseert Mollie meteen vandaag. */
  startDate: string;
  /** Zelfde sleutel = Mollie maakt het abonnement maar een keer aan, ook als de webhook dubbel binnenkomt. */
  idempotencyKey: string;
}) {
  const mollie = getMollieClient();
  const subscription = await mollie.customerSubscriptions.create({
    customerId,
    amount: { currency: 'EUR', value: amount },
    interval,
    description,
    startDate,
    webhookUrl: `${SITE_URL}/api/webhooks/mollie-subscription`,
    metadata: { subscriptionId: String(subscriptionId) },
    idempotencyKey,
  });
  return subscription;
}

/** Zegt het abonnement bij Mollie op. Stond het daar al opgezegd, dan is dat ook goed. Lukt het niet, dan gooit hij een fout. */
export async function cancelSubscription(customerId: string, mollieSubscriptionId: string) {
  const mollie = getMollieClient();
  try {
    await mollie.customerSubscriptions.cancel(mollieSubscriptionId, { customerId });
  } catch (err) {
    const sub = await mollie.customerSubscriptions.get(mollieSubscriptionId, { customerId }).catch(() => null);
    if (sub && (sub.status === 'canceled' || sub.status === 'completed')) return;
    throw err;
  }
}

/** Vandaag in Nederland als YYYY-MM-DD. */
export function vandaagNL(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam' }).format(new Date());
}

/** Datum (YYYY-MM-DD) plus een Mollie-interval zoals '2 weeks' of '1 months'. */
export function datumPlusInterval(datum: string, interval: string): string {
  const [y, m, d] = datum.split('-').map(Number);
  const [nStr, eenheid] = interval.split(' ');
  const n = parseInt(nStr, 10);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (eenheid.startsWith('week')) dt.setUTCDate(dt.getUTCDate() + 7 * n);
  else if (eenheid.startsWith('day')) dt.setUTCDate(dt.getUTCDate() + n);
  else {
    // Maanden: 31 januari + 1 maand wordt 28/29 februari, niet 3 maart
    const doelMaand = dt.getUTCMonth() + n;
    const laatsteDag = new Date(Date.UTC(dt.getUTCFullYear(), doelMaand + 1, 0)).getUTCDate();
    dt.setUTCDate(1);
    dt.setUTCMonth(doelMaand);
    dt.setUTCDate(Math.min(d, laatsteDag));
  }
  return dt.toISOString().slice(0, 10);
}

/** Klopt het bedrag van een Mollie-betaling precies met wat wij verwachten? */
export function bedragKlopt(payment: { amount: { value: string; currency: string } }, verwacht: number | string): boolean {
  return payment.amount.currency === 'EUR' && payment.amount.value === Number(verwacht).toFixed(2);
}

// ============================================================
// Helpers
// ============================================================

export function frequencyToInterval(frequency: string): string {
  const map: Record<string, string> = {
    weekly: '1 weeks',
    biweekly: '2 weeks',
    triweekly: '3 weeks',
    monthly: '1 months',
    quarterly: '3 months',
    biannual: '6 months',
    yearly: '12 months',
  };
  return map[frequency] || '1 months';
}

export function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function priceToAmount(priceStr: string): string {
  // "€ 29,95" -> "29.95", ensures 2 decimal places for Mollie
  const cleaned = priceStr.replace('€', '').replace(',', '.').trim();
  const num = parseFloat(cleaned);
  if (isNaN(num)) return '0.00';
  return num.toFixed(2);
}

import createMollieClient from '@mollie/api-client';

function getMollieClient() {
  const apiKey = process.env.MOLLIE_API_KEY;
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
    sequenceType: 'first',
    customerId: customer.id,
    redirectUrl: `${SITE_URL}/abonnementen/bevestiging`,
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
}: {
  customerId: string;
  amount: string;
  interval: string; // '1 weeks', '2 weeks', '1 months', '3 months'
  description: string;
  subscriptionId: number;
}) {
  const mollie = getMollieClient();
  const subscription = await mollie.customerSubscriptions.create({
    customerId,
    amount: { currency: 'EUR', value: amount },
    interval,
    description,
    webhookUrl: `${SITE_URL}/api/webhooks/mollie-subscription`,
    metadata: { subscriptionId: String(subscriptionId) },
  });
  return subscription;
}

export async function cancelSubscription(customerId: string, mollieSubscriptionId: string) {
  const mollie = getMollieClient();
  await mollie.customerSubscriptions.cancel(mollieSubscriptionId, { customerId });
}

// ============================================================
// Helpers
// ============================================================

export function frequencyToInterval(frequency: string): string {
  const map: Record<string, string> = {
    weekly: '1 weeks',
    biweekly: '2 weeks',
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
  // "€ 29,95" -> "29.95"
  return priceStr.replace('€', '').replace(',', '.').trim();
}

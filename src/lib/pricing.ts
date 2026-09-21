// Server-side prijsberekening voor de checkout.
// De browser stuurt alleen wat + hoeveel + hoe bezorgd; bedragen komen nooit uit de request.
import { getVisibleBouquets, getVisibleProducts } from './data';
import { getSettings, publicShippingInfo } from './settings';
import { db, schema } from './db';
import { eq } from 'drizzle-orm';

export class PricingError extends Error {}

export type DeliveryMethod = 'pickup' | 'local' | 'shipping';

export interface PricedItem {
  productId: string;
  name: string;
  size?: string;
  quantity: number;
  unitPrice: number;
  price: string;   // regeltotaal als "€ 12,34" (zo staat het al in de mails en het beheer)
  kind: 'bouquet' | 'product';
}

export interface PricedOrder {
  items: PricedItem[];
  subtotal: number;
  deliveryCost: number;
  total: number;
  deliveryRegion: string | null;
  hasBouquet: boolean;
}

const SIZE_KEY: Record<string, 'priceSmall' | 'priceMid' | 'priceLarge'> = {
  klein: 'priceSmall',
  middel: 'priceMid',
  groot: 'priceLarge',
};

export function parseEuro(label: string): number {
  const n = parseFloat(String(label).replace('€', '').replace(/\s/g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

export function euro(n: number): string {
  return `€ ${n.toFixed(2).replace('.', ',')}`;
}

/** Rond af op centen, voorkomt 17.95*3 = 53.849999. */
const cents = (n: number) => Math.round(n * 100) / 100;

export async function priceOrder(input: {
  items: { productId: string; size?: string | null; quantity: number }[];
  delivery: { method: DeliveryMethod; zoneId?: number | null };
}): Promise<PricedOrder> {
  const [bouquets, products, settings] = await Promise.all([
    getVisibleBouquets(),
    getVisibleProducts(),
    getSettings(),
  ]);

  const items: PricedItem[] = [];
  let hasBouquet = false;

  for (const raw of input.items) {
    const quantity = Math.max(1, Math.floor(raw.quantity));
    const bouquet = bouquets.find((b) => b.id === raw.productId);

    if (bouquet) {
      const key = SIZE_KEY[(raw.size || '').toLowerCase()];
      if (!key) throw new PricingError(`Kies een maat voor ${bouquet.name}`);
      const unitPrice = parseEuro(bouquet[key]);
      if (unitPrice <= 0) throw new PricingError(`${bouquet.name} heeft geen geldige prijs`);
      hasBouquet = true;
      items.push({
        productId: bouquet.id, name: bouquet.name, size: raw.size || undefined, quantity,
        unitPrice, price: euro(cents(unitPrice * quantity)), kind: 'bouquet',
      });
      continue;
    }

    const product = products.find((p) => p.id === raw.productId);
    if (!product) throw new PricingError('Een product in je winkelwagen is niet meer beschikbaar');
    if (product.stock != null && product.stock < quantity) {
      throw new PricingError(
        product.stock <= 0
          ? `${product.name} is helaas uitverkocht`
          : `Van ${product.name} ${product.stock === 1 ? 'is er nog maar 1' : `zijn er nog maar ${product.stock}`} beschikbaar`,
      );
    }
    const unitPrice = Number(product.price);
    if (!(unitPrice > 0)) throw new PricingError(`${product.name} heeft geen geldige prijs`);
    items.push({
      productId: product.id, name: product.name, quantity,
      unitPrice, price: euro(cents(unitPrice * quantity)), kind: 'product',
    });
  }

  if (items.length === 0) throw new PricingError('Je winkelwagen is leeg');

  const subtotal = cents(items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0));

  let deliveryCost = 0;
  let deliveryRegion: string | null = null;

  if (input.delivery.method === 'local') {
    if (!input.delivery.zoneId) throw new PricingError('Kies een bezorgregio');
    const [zone] = await db.select().from(schema.deliveryZones).where(eq(schema.deliveryZones.id, input.delivery.zoneId)).limit(1);
    if (!zone) throw new PricingError('Deze bezorgregio bestaat niet meer, kies een andere');
    deliveryCost = cents(Number(zone.cost));
    deliveryRegion = zone.name;
  } else if (input.delivery.method === 'shipping') {
    const shipping = publicShippingInfo(settings);
    if (!shipping.enabled) throw new PricingError('Verzenden per post is op dit moment niet mogelijk. Kies ophalen of lokaal bezorgen.');
    if (hasBouquet) throw new PricingError('Verse boeketten kunnen niet per post verzonden worden. Kies ophalen of lokaal bezorgen.');
    deliveryCost = shipping.freeFrom != null && subtotal >= shipping.freeFrom ? 0 : cents(shipping.cost);
    deliveryRegion = 'Verzending (heel Nederland)';
  }

  return { items, subtotal, deliveryCost, total: cents(subtotal + deliveryCost), deliveryRegion, hasBouquet };
}

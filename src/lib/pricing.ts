// Server-side prijsberekening voor de checkout.
// De browser stuurt alleen wat + hoeveel + hoe bezorgd; bedragen komen nooit uit de request.
import { getVisibleBouquets, getVisibleProducts } from './data';
import { getSettings, publicShippingInfo, closedWeekdays, weekdayIndex } from './settings';
import { db, schema } from './db';
import { eq } from 'drizzle-orm';
import { KAARTJE_PRIJS, vroegsteBezorgdag } from './bestelregels';

export class PricingError extends Error {}

export type DeliveryMethod = 'pickup' | 'local' | 'shipping' | 'adressen';

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

type Ontvanger = { naam: string; adres: string; postcode: string; zoneId: number; datum: string };

export async function priceOrder(input: {
  items: { productId: string; size?: string | null; quantity: number; ontvanger?: Ontvanger | null; kaartje?: string | null }[];
  delivery: { method: DeliveryMethod; zoneId?: number | null };
  card?: string | null;
}): Promise<PricedOrder> {
  const [bouquets, products, settings] = await Promise.all([
    getVisibleBouquets(),
    getVisibleProducts(),
    getSettings(),
  ]);

  const items: PricedItem[] = [];
  let hasBouquet = false;
  let boeketBijHoofdlevering = false; // een boeket zonder eigen adres gaat mee met de gekozen bezorging
  let zonderEigenAdres = 0;
  const zones = await db.select().from(schema.deliveryZones);
  const dicht = closedWeekdays(settings);

  for (const raw of input.items) {
    const quantity = Math.max(1, Math.floor(raw.quantity));
    const bouquet = bouquets.find((b) => b.id === raw.productId);

    if (bouquet) {
      const key = SIZE_KEY[(raw.size || '').toLowerCase()];
      if (!key) throw new PricingError(`Kies een maat voor ${bouquet.name}`);
      const unitPrice = parseEuro(bouquet[key]);
      if (unitPrice <= 0) throw new PricingError(`${bouquet.name} heeft geen geldige prijs`);
      hasBouquet = true;
      const o = raw.ontvanger;
      if (o) {
        // Eigen adres: bezorgplaats, datum en kosten per boeket. De gegevens staan in de regel,
        // zodat Celine ze in de mail en het beheer ziet.
        const zone = zones.find((z) => z.id === o.zoneId);
        if (!zone) throw new PricingError(`Kies een bezorgplaats voor ${bouquet.name}`);
        if (o.datum < vroegsteBezorgdag()) throw new PricingError(`Voor vandaag bezorgen moet je vóór 08:00 bestellen. Kies een andere dag voor ${bouquet.name}.`);
        if (dicht.includes(weekdayIndex(o.datum))) throw new PricingError(`Op de gekozen dag voor ${bouquet.name} is de winkel dicht en wordt er niet bezorgd. Kies een andere dag.`);
        items.push({
          productId: bouquet.id, name: `${bouquet.name}, bezorgen bij ${o.naam}, ${o.adres}, ${o.postcode} ${zone.name} op ${o.datum}`,
          size: raw.size || undefined, quantity, unitPrice, price: euro(cents(unitPrice * quantity)), kind: 'bouquet',
        });
        const kosten = cents(Number(zone.cost));
        items.push({ productId: 'bezorging', name: `Bezorgen in ${zone.name} (${o.naam})`, quantity: 1, unitPrice: kosten, price: euro(kosten), kind: 'product' });
      } else {
        boeketBijHoofdlevering = true;
        zonderEigenAdres++;
        items.push({
          productId: bouquet.id, name: bouquet.name, size: raw.size || undefined, quantity,
          unitPrice, price: euro(cents(unitPrice * quantity)), kind: 'bouquet',
        });
      }
      const kaart = (raw.kaartje ?? '').trim();
      if (kaart) {
        items.push({ productId: 'kaartje', name: `Kaartje bij ${bouquet.name}: "${kaart}"`, quantity: 1, unitPrice: KAARTJE_PRIJS, price: euro(KAARTJE_PRIJS), kind: 'product' });
      }
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
    zonderEigenAdres++;
    items.push({
      productId: product.id, name: product.name, quantity,
      unitPrice, price: euro(cents(unitPrice * quantity)), kind: 'product',
    });
  }

  if (items.length === 0) throw new PricingError('Je winkelwagen is leeg');

  // Een kaartje kan alleen bij een boeket; de tekst staat in de regel, zodat Celine hem in mail en beheer ziet
  const kaartTekst = (input.card ?? '').trim();
  if (kaartTekst && hasBouquet) {
    items.push({
      productId: 'kaartje', name: `Kaartje: "${kaartTekst}"`, quantity: 1,
      unitPrice: KAARTJE_PRIJS, price: euro(KAARTJE_PRIJS), kind: 'product',
    });
  }

  const subtotal = cents(items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0));

  let deliveryCost = 0;
  let deliveryRegion: string | null = null;

  if (input.delivery.method === 'adressen' && zonderEigenAdres > 0) {
    throw new PricingError('Kies hoe je bestelling bij je komt: ophalen, bezorgen of verzenden.');
  }

  if (input.delivery.method === 'local') {
    if (!input.delivery.zoneId) throw new PricingError('Kies een bezorgregio');
    const [zone] = await db.select().from(schema.deliveryZones).where(eq(schema.deliveryZones.id, input.delivery.zoneId)).limit(1);
    if (!zone) throw new PricingError('Deze bezorgregio bestaat niet meer, kies een andere');
    deliveryCost = cents(Number(zone.cost));
    deliveryRegion = zone.name;
  } else if (input.delivery.method === 'shipping') {
    const shipping = publicShippingInfo(settings);
    if (!shipping.enabled) throw new PricingError('Verzenden per post is op dit moment niet mogelijk. Kies ophalen of lokaal bezorgen.');
    if (boeketBijHoofdlevering) throw new PricingError('Verse boeketten kunnen niet per post verzonden worden. Kies ophalen of lokaal bezorgen, of geef het boeket een eigen bezorgadres.');
    deliveryCost = shipping.freeFrom != null && subtotal >= shipping.freeFrom ? 0 : cents(shipping.cost);
    deliveryRegion = 'Verzending (heel Nederland)';
  }

  return { items, subtotal, deliveryCost, total: cents(subtotal + deliveryCost), deliveryRegion, hasBouquet };
}

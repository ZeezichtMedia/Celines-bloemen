import type { Bouquet, Product } from './types';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { asc, eq, and, isNotNull, sql } from 'drizzle-orm';
import { db, schema } from './db';
import { purgeSiteCache } from './cache';

// Boeketten en webshopproducten staan in Postgres (tot okt 2026 als JSON in Vercel Blob).
// Elke wijziging leegt de CDN-kopie van de publieke pagina's, zie cache.ts.

function slugify(name: string): string {
  return name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'item';
}

/** Nieuw item zonder id: id uit de naam, met -2, -3 ... als die al bestaat. */
async function uniqueId(name: string, table: typeof schema.bouquets | typeof schema.shopProducts): Promise<string> {
  const base = slugify(name);
  const taken = new Set((await db.select({ id: table.id }).from(table)).map((r) => r.id));
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  return id;
}

// ============================================================
// Bouquets
// ============================================================

export async function getBouquets(): Promise<Bouquet[]> {
  const rows = await db.select().from(schema.bouquets).orderBy(asc(schema.bouquets.sortOrder), asc(schema.bouquets.name));
  return rows.map(({ updatedAt, ...b }) => b);
}

export async function getVisibleBouquets(): Promise<Bouquet[]> {
  return (await getBouquets()).filter((b) => b.available);
}

export async function upsertBouquet(input: Bouquet): Promise<Bouquet> {
  const b: Bouquet = { ...input, id: input.id || (await uniqueId(input.name, schema.bouquets)) };
  const values = {
    id: b.id, name: b.name, color: b.color ?? '', description: b.description ?? '', image: b.image ?? '',
    priceSmall: b.priceSmall, priceMid: b.priceMid, priceLarge: b.priceLarge,
    available: !!b.available, sortOrder: Number(b.sortOrder) || 0, updatedAt: new Date(),
  };
  await db.insert(schema.bouquets).values(values)
    .onConflictDoUpdate({ target: schema.bouquets.id, set: values });
  await purgeSiteCache();
  return b;
}

export async function deleteBouquet(id: string): Promise<void> {
  await db.delete(schema.bouquets).where(eq(schema.bouquets.id, id));
  await purgeSiteCache();
}

// ============================================================
// Products (webshop)
// ============================================================

export async function getProducts(): Promise<Product[]> {
  const rows = await db.select().from(schema.shopProducts).orderBy(asc(schema.shopProducts.sortOrder), asc(schema.shopProducts.name));
  return rows.map(({ updatedAt, price, ...p }) => ({ ...p, price: Number(price) }));
}

export async function getVisibleProducts(): Promise<Product[]> {
  return (await getProducts()).filter((p) => p.available);
}

export async function upsertProduct(input: Product): Promise<Product> {
  const p: Product = { ...input, id: input.id || (await uniqueId(input.name, schema.shopProducts)) };
  const stock = p.stock == null || (p.stock as unknown) === '' ? null : Math.max(0, Math.floor(Number(p.stock)));
  const values = {
    id: p.id, name: p.name, description: p.description ?? '', price: (Number(p.price) || 0).toFixed(2),
    priceLabel: p.priceLabel, image: p.image ?? '', category: p.category ?? '',
    available: !!p.available, sortOrder: Number(p.sortOrder) || 0, stock: Number.isNaN(stock) ? null : stock,
    updatedAt: new Date(),
  };
  await db.insert(schema.shopProducts).values(values)
    .onConflictDoUpdate({ target: schema.shopProducts.id, set: values });
  await purgeSiteCache();
  return { ...p, stock: values.stock };
}

export async function deleteProduct(id: string): Promise<void> {
  await db.delete(schema.shopProducts).where(eq(schema.shopProducts.id, id));
  await purgeSiteCache();
}

/**
 * Voorraad verlagen na een betaalde bestelling. Eén UPDATE per product in de database,
 * zodat twee gelijktijdige bestellingen elkaars verlaging niet kunnen overschrijven.
 * Producten zonder voorraadbeheer (stock = null) en boeketten blijven ongemoeid.
 */
export async function decrementStock(items: { productId: string; quantity: number }[]): Promise<void> {
  const sold = new Map<string, number>();
  for (const i of items) sold.set(i.productId, (sold.get(i.productId) ?? 0) + i.quantity);
  if (sold.size === 0) return;
  for (const [id, n] of sold) {
    await db.update(schema.shopProducts)
      .set({ stock: sql`GREATEST(${schema.shopProducts.stock} - ${n}, 0)`, updatedAt: new Date() })
      .where(and(eq(schema.shopProducts.id, id), isNotNull(schema.shopProducts.stock)));
  }
  await purgeSiteCache();
}

// ============================================================
// Image upload
// ============================================================

export async function uploadImage(file: File): Promise<string> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import('@vercel/blob');
    const blob = await put(`images/${file.name}`, file, {
      access: 'public',
      contentType: file.type,
      addRandomSuffix: true,
    });
    return blob.url;
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `${Date.now()}-${file.name}`;
  const filepath = join(process.cwd(), 'public', 'images', 'bestellen', filename);
  writeFileSync(filepath, buffer);
  return `/images/bestellen/${filename}`;
}

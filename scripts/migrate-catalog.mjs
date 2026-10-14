// Eenmalig (okt 2026): boeketten en webshopproducten van Vercel Blob naar Postgres.
// Maakt de tabellen aan als ze er nog niet zijn en kopieert de JSON. Bestaande rijen blijven staan,
// dus opnieuw draaien is veilig. Gebruik: node scripts/migrate-catalog.mjs
import { readFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';
import { list } from '@vercel/blob';

for (const line of readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)="?([^"]*)"?$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const sql = neon(process.env.DATABASE_URL);

await sql`CREATE TABLE IF NOT EXISTS bouquets (
  id varchar(120) PRIMARY KEY,
  name varchar(255) NOT NULL,
  color varchar(255) NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  image text NOT NULL DEFAULT '',
  price_small varchar(40) NOT NULL,
  price_mid varchar(40) NOT NULL,
  price_large varchar(40) NOT NULL,
  available boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamp NOT NULL DEFAULT now()
)`;
await sql`CREATE TABLE IF NOT EXISTS shop_products (
  id varchar(120) PRIMARY KEY,
  name varchar(255) NOT NULL,
  description text NOT NULL DEFAULT '',
  price numeric(10,2) NOT NULL,
  price_label varchar(40) NOT NULL,
  image text NOT NULL DEFAULT '',
  category varchar(50) NOT NULL DEFAULT '',
  available boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  stock integer,
  updated_at timestamp NOT NULL DEFAULT now()
)`;
console.log('tabellen ok');

async function blobJson(key) {
  const { blobs } = await list({ prefix: key });
  if (!blobs.length) throw new Error(`${key} niet gevonden in Blob`);
  console.log(`${key}: laatst gewijzigd ${blobs[0].uploadedAt}`);
  return (await fetch(`${blobs[0].url}?v=${Date.now()}`)).json();
}

const bouquets = await blobJson('bouquets.json');
for (const b of bouquets) {
  await sql`INSERT INTO bouquets (id, name, color, description, image, price_small, price_mid, price_large, available, sort_order)
    VALUES (${b.id}, ${b.name}, ${b.color ?? ''}, ${b.description ?? ''}, ${b.image ?? ''}, ${b.priceSmall}, ${b.priceMid}, ${b.priceLarge}, ${!!b.available}, ${b.sortOrder ?? 0})
    ON CONFLICT (id) DO NOTHING`;
}
const products = await blobJson('products.json');
for (const p of products) {
  await sql`INSERT INTO shop_products (id, name, description, price, price_label, image, category, available, sort_order, stock)
    VALUES (${p.id}, ${p.name}, ${p.description ?? ''}, ${Number(p.price).toFixed(2)}, ${p.priceLabel}, ${p.image ?? ''}, ${p.category ?? ''}, ${!!p.available}, ${p.sortOrder ?? 0}, ${p.stock ?? null})
    ON CONFLICT (id) DO NOTHING`;
}
const [{ nb }] = await sql`SELECT count(*)::int AS nb FROM bouquets`;
const [{ np }] = await sql`SELECT count(*)::int AS np FROM shop_products`;
console.log(`Blob: ${bouquets.length} boeketten, ${products.length} producten. Database: ${nb} boeketten, ${np} producten.`);
const ids = bouquets.map((b) => b.id);
if (new Set(ids).size !== ids.length || ids.includes('')) console.log('LET OP: dubbele of lege boeket-id in Blob:', ids);
const [{ oud }] = await sql`SELECT count(*)::int AS oud FROM products`.catch(() => [{ oud: 'geen tabel' }]);
console.log(`Oude ongebruikte tabel products: ${oud} rijen (niet aangeraakt)`);

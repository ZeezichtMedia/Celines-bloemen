import type { Bouquet, Product } from './types';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

function isVercel(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

// ============================================================
// Generic JSON read/write (local + Vercel Blob)
// ============================================================

function readLocalFile<T>(filename: string): T[] {
  const path = join(process.cwd(), 'data', filename);
  if (!existsSync(path)) return [];
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function writeLocalFile<T>(filename: string, data: T[]): void {
  const path = join(process.cwd(), 'data', filename);
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
}

async function readBlobFile<T>(key: string): Promise<T[]> {
  const { list } = await import('@vercel/blob');
  const { blobs } = await list({ prefix: key });
  if (blobs.length === 0) return [];
  const res = await fetch(blobs[0].downloadUrl);
  return res.json();
}

async function writeBlobFile<T>(key: string, data: T[]): Promise<void> {
  const { put } = await import('@vercel/blob');
  await put(key, JSON.stringify(data, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

async function readData<T>(filename: string): Promise<T[]> {
  return isVercel() ? readBlobFile<T>(filename) : readLocalFile<T>(filename);
}

async function writeData<T>(filename: string, data: T[]): Promise<void> {
  if (isVercel()) await writeBlobFile(filename, data);
  else writeLocalFile(filename, data);
}

// ============================================================
// Bouquets
// ============================================================

export async function getBouquets(): Promise<Bouquet[]> {
  const data = await readData<Bouquet>('bouquets.json');
  return data.sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getVisibleBouquets(): Promise<Bouquet[]> {
  return (await getBouquets()).filter((b) => b.available);
}

export async function saveBouquets(bouquets: Bouquet[]): Promise<void> {
  await writeData('bouquets.json', bouquets);
}

// ============================================================
// Products (webshop)
// ============================================================

export async function getProducts(): Promise<Product[]> {
  const data = await readData<Product>('products.json');
  return data.sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getVisibleProducts(): Promise<Product[]> {
  return (await getProducts()).filter((p) => p.available);
}

export async function saveProducts(products: Product[]): Promise<void> {
  await writeData('products.json', products);
}

// ============================================================
// Image upload
// ============================================================

export async function uploadImage(file: File): Promise<string> {
  if (isVercel()) {
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

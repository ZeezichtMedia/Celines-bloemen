import type { Bouquet } from './types';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const LOCAL_DATA_PATH = join(process.cwd(), 'data', 'bouquets.json');
const BLOB_KEY = 'bouquets.json';

function isVercel(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

// --- Local filesystem (development) ---

function readLocal(): Bouquet[] {
  if (!existsSync(LOCAL_DATA_PATH)) return [];
  const raw = readFileSync(LOCAL_DATA_PATH, 'utf-8');
  return JSON.parse(raw);
}

function writeLocal(bouquets: Bouquet[]): void {
  writeFileSync(LOCAL_DATA_PATH, JSON.stringify(bouquets, null, 2), 'utf-8');
}

// --- Vercel Blob (production) ---

async function readBlob(): Promise<Bouquet[]> {
  const { list, getDownloadUrl } = await import('@vercel/blob');
  const { blobs } = await list({ prefix: BLOB_KEY });
  if (blobs.length === 0) return [];
  const url = blobs[0].downloadUrl;
  const res = await fetch(url);
  return res.json();
}

async function writeBlob(bouquets: Bouquet[]): Promise<void> {
  const { put } = await import('@vercel/blob');
  const data = JSON.stringify(bouquets, null, 2);
  await put(BLOB_KEY, data, {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
  });
}

// --- Public API ---

export async function getBouquets(): Promise<Bouquet[]> {
  const bouquets = isVercel() ? await readBlob() : readLocal();
  return bouquets.sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getVisibleBouquets(): Promise<Bouquet[]> {
  const all = await getBouquets();
  return all.filter((b) => b.available);
}

export async function saveBouquets(bouquets: Bouquet[]): Promise<void> {
  if (isVercel()) {
    await writeBlob(bouquets);
  } else {
    writeLocal(bouquets);
  }
}

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
  // Local: save to public folder
  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `${Date.now()}-${file.name}`;
  const filepath = join(process.cwd(), 'public', 'images', 'bestellen', filename);
  writeFileSync(filepath, buffer);
  return `/images/bestellen/${filename}`;
}

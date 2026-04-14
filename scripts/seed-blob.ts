import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { put } from '@vercel/blob';

async function upload(filename: string) {
  const path = join(process.cwd(), 'data', filename);
  const content = readFileSync(path, 'utf-8');
  const result = await put(filename, content, {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  console.log(`uploaded ${filename} -> ${result.url}`);
}

await upload('bouquets.json');
await upload('products.json');

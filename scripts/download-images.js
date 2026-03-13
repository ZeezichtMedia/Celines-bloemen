import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';

const configPath = '/Users/rubenboogaard/Downloads/image_config.json';
const baseOutputDir = '/Users/Shared/coderen/Celines-bloemen/public/images';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function downloadImage(url, destPath, retries = 3) {
    try {
        const response = await fetch(url);
        
        if (response.status === 429 && retries > 0) {
            console.warn(`Rate limited (429) for ${url}. Retrying in 2 seconds...`);
            await sleep(2000);
            return downloadImage(url, destPath, retries - 1);
        }

        if (!response.ok) throw new Error(`Status ${response.status}`);

        const dir = path.dirname(destPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const writer = fs.createWriteStream(destPath);
        await pipeline(response.body, writer);
    } catch (error) {
        if (retries > 0) {
            console.warn(`Error downloading ${url}: ${error.message}. Retrying...`);
            await sleep(1000);
            return downloadImage(url, destPath, retries - 1);
        }
        console.error(`Final failure for ${url}: ${error.message}`);
    }
}

function sanitizeName(name) {
    return name.trim().toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

function getCategory(url) {
    if (url === 'https://celinesbloemen.nl/') return 'home';
    const parts = url.split('/').filter(p => p);
    return parts.pop();
}

async function run() {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    console.log(`Starting download of ${config.length} images...`);

    for (const item of config) {
        const category = getCategory(item.pageUrl);
        const name = sanitizeName(item.newName);
        const ext = item.originalUrl.split('.').pop().split('?')[0] || 'jpg';
        
        const destPath = path.join(baseOutputDir, category, `${name}.${ext}`);
        
        // Add a small delay between each successful download check to avoid spamming
        if (!fs.existsSync(destPath)) {
            console.log(`Downloading: ${item.originalUrl} -> ${destPath}`);
            await downloadImage(item.originalUrl, destPath);
            await sleep(200); // 200ms delay between requests
        } else {
            console.log(`Skipping (already exists): ${destPath}`);
        }
    }

    console.log('All downloads finished correctly!');
}

run();

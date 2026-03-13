import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';

const baseOutputDir = '/Users/Shared/coderen/Celines-bloemen/public/images';

const imagesToDownload = [
    {
        url: 'https://celinesbloemen.nl/wp-content/uploads/2023/10/IMG_3279-1024x1536.jpeg',
        dest: 'celine/holding-bouquet.jpeg'
    },
    {
        url: 'https://celinesbloemen.nl/wp-content/uploads/2023/10/IMG_3272-768x1152.jpeg',
        dest: 'celine/smiling.jpeg'
    },
    {
        url: 'https://celinesbloemen.nl/wp-content/uploads/2023/10/IMG_4773-768x1041.jpeg',
        dest: 'celine/flower-field.jpeg'
    },
    {
        url: 'https://celinesbloemen.nl/wp-content/uploads/2023/11/1befbe29-9460-4583-a5ce-a4b24936a329.jpeg',
        dest: 'lifestyle/wedding-couple.jpeg'
    }
];

async function downloadImage(url, destPath) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Status ${response.status}`);

        const absoluteDest = path.join(baseOutputDir, destPath);
        const dir = path.dirname(absoluteDest);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const writer = fs.createWriteStream(absoluteDest);
        await pipeline(response.body, writer);
        console.log(`Success: ${url} -> ${destPath}`);
    } catch (error) {
        console.error(`Error downloading ${url}: ${error.message}`);
    }
}

async function run() {
    for (const item of imagesToDownload) {
        await downloadImage(item.url, item.dest);
    }
}

run();

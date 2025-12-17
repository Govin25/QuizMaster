import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const swPath = path.join(__dirname, 'public', 'service-worker.js');

// Generate a unique version based on timestamp
const version = Date.now().toString(36);
const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');

console.log(`[Build] Updating service worker cache version to: ${dateStr}-${version}`);

let swContent = fs.readFileSync(swPath, 'utf8');

// Replace the cache version
swContent = swContent.replace(
    /const CACHE_VERSION = '[^']+'/,
    `const CACHE_VERSION = '${dateStr}-${version}'`
);

fs.writeFileSync(swPath, swContent);

console.log('[Build] Service worker cache version updated successfully!');

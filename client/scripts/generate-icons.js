#!/usr/bin/env node

/**
 * PWA Icon Generator
 * 
 * This script generates all required PWA icons from a source image.
 * Requires: sharp (npm install sharp --save-dev)
 * 
 * Usage: node scripts/generate-icons.js
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const SOURCE_ICON = path.join(__dirname, '../public/icons/icon-512x512.png');
const OUTPUT_DIR = path.join(__dirname, '../public/icons');

async function generateIcons() {
    try {
        // Ensure output directory exists
        if (!fs.existsSync(OUTPUT_DIR)) {
            fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        }

        // Check if source icon exists
        if (!fs.existsSync(SOURCE_ICON)) {
            console.error('❌ Source icon not found at:', SOURCE_ICON);
            console.log('Please place a 512x512 PNG icon at public/icons/icon-512x512.png');
            process.exit(1);
        }

        console.log('🎨 Generating PWA icons...\n');

        // Generate regular icons
        for (const size of ICON_SIZES) {
            // Skip 512x512 as it's our source image
            if (size === 512) {
                console.log(`⏭️  Skipped ${size}x${size} icon (source image)`);
                continue;
            }

            const outputPath = path.join(OUTPUT_DIR, `icon-${size}x${size}.png`);

            await sharp(SOURCE_ICON)
                .resize(size, size, {
                    fit: 'contain',
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                })
                .png()
                .toFile(outputPath);

            console.log(`✅ Generated ${size}x${size} icon`);
        }

        // Generate maskable icons (with padding for safe zone)
        console.log('\n🎭 Generating maskable icons...\n');

        for (const size of [192, 512]) {
            const outputPath = path.join(OUTPUT_DIR, `icon-${size}x${size}-maskable.png`);
            const padding = Math.floor(size * 0.1); // 10% padding for safe zone

            await sharp(SOURCE_ICON)
                .resize(size - (padding * 2), size - (padding * 2), {
                    fit: 'contain',
                    background: { r: 99, g: 102, b: 241, alpha: 1 } // Theme color background
                })
                .extend({
                    top: padding,
                    bottom: padding,
                    left: padding,
                    right: padding,
                    background: { r: 99, g: 102, b: 241, alpha: 1 }
                })
                .png()
                .toFile(outputPath);

            console.log(`✅ Generated ${size}x${size} maskable icon`);
        }

        console.log('\n✨ All icons generated successfully!');
        console.log(`📁 Icons saved to: ${OUTPUT_DIR}`);

    } catch (error) {
        console.error('❌ Error generating icons:', error);
        process.exit(1);
    }
}

generateIcons();

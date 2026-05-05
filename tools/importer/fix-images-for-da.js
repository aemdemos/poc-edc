#!/usr/bin/env node

/**
 * Fix Images for DA (Document Authoring)
 *
 * DA stores images relative to the page in a hidden folder .<pagename>/
 * This script:
 * 1. Finds all <img src="https://..."> in .plain.html files under content/
 * 2. Downloads the images (with SSL bypass for corporate sites)
 * 3. Stores them in the correct relative path
 * 4. Updates the HTML to use relative paths
 * 5. Also downloads viewport variants (tablet/mobile) of images that have them
 *
 * Usage:
 *   node tools/importer/fix-images-for-da.js [--source-url https://example.com/page.html]
 *
 * The --source-url flag is optional. If provided, the script visits the source page
 * to discover viewport image variants and downloads them as additional files.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, copyFileSync } from 'fs';
import { resolve, dirname, basename, join, extname } from 'path';
import { createHash } from 'crypto';
import https from 'https';
import http from 'http';

const CONTENT_DIR = resolve(process.cwd(), 'content');
const MIGRATION_IMAGES = resolve(process.cwd(), 'migration-work/images');
const MIGRATION_METADATA = resolve(process.cwd(), 'migration-work/metadata.json');
const REPORTS_DIR = resolve(process.cwd(), 'tools/importer/reports');

// Load the image mapping from migration-work if it exists
let imageMapping = {};
if (existsSync(MIGRATION_METADATA)) {
  try {
    const meta = JSON.parse(readFileSync(MIGRATION_METADATA, 'utf-8'));
    if (meta.images && meta.images.mapping) {
      imageMapping = meta.images.mapping;
    }
  } catch (e) { /* ignore */ }
}

function hashUrl(url) {
  return createHash('md5').update(url).digest('hex').substring(0, 8);
}

function downloadImage(url) {
  return new Promise((resolvePromise, reject) => {
    const client = url.startsWith('https') ? https : http;
    const options = {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 15000,
      rejectUnauthorized: false,
    };

    const request = client.get(url, options, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        downloadImage(response.headers.location).then(resolvePromise).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode} for ${url}`));
        return;
      }
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolvePromise(Buffer.concat(chunks)));
      response.on('error', reject);
    });
    request.on('error', reject);
    request.on('timeout', () => { request.destroy(); reject(new Error(`Timeout: ${url}`)); });
  });
}

function findCachedImage(url) {
  const mapped = imageMapping[url];
  if (mapped) {
    const localPath = resolve(process.cwd(), 'migration-work', mapped.replace('./', ''));
    if (existsSync(localPath)) return localPath;
  }
  const urlHash = createHash('md5').update(url).digest('hex');
  const ext = extname(new URL(url).pathname) || '.jpg';
  const hashPath = join(MIGRATION_IMAGES, `${urlHash}${ext}`);
  if (existsSync(hashPath)) return hashPath;
  return null;
}

function findPlainHtmlFiles(dir) {
  const results = [];
  if (!existsSync(dir)) return results;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.')) {
      results.push(...findPlainHtmlFiles(fullPath));
    } else if (entry.name.endsWith('.plain.html')) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Download a single image to the media directory
 */
async function downloadToMediaDir(url, mediaDir, label) {
  const urlHash = hashUrl(url);
  const ext = extname(new URL(url).pathname) || '.jpg';
  const originalName = basename(new URL(url).pathname, ext);
  const localFilename = `${originalName}-${urlHash}${ext}`;
  const localPath = join(mediaDir, localFilename);

  if (existsSync(localPath)) {
    console.log(`  ✓ [${label}] Already exists: ${localFilename}`);
    return localFilename;
  }

  const cachedPath = findCachedImage(url);
  if (cachedPath) {
    copyFileSync(cachedPath, localPath);
    console.log(`  ✓ [${label}] Copied from cache: ${localFilename}`);
    return localFilename;
  }

  try {
    console.log(`  ⬇ [${label}] Downloading: ${url}`);
    const imageData = await downloadImage(url);
    writeFileSync(localPath, imageData);
    console.log(`  ✓ [${label}] Downloaded: ${localFilename} (${imageData.length} bytes)`);
    return localFilename;
  } catch (error) {
    console.error(`  ✗ [${label}] Failed: ${url}: ${error.message}`);
    return null;
  }
}

/**
 * Find viewport variants from import reports
 */
function findViewportVariants(filePath) {
  // Look for a matching report file that contains viewportVariants
  const pageDir = dirname(filePath);
  const pageName = basename(filePath, '.plain.html');

  // Search all report files for this page path
  if (!existsSync(REPORTS_DIR)) return [];

  const reportFiles = [];
  function findReports(dir) {
    if (!existsSync(dir)) return;
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) findReports(fullPath);
      else if (entry.name.endsWith('.report.json')) reportFiles.push(fullPath);
    }
  }
  findReports(REPORTS_DIR);

  for (const reportFile of reportFiles) {
    try {
      const report = JSON.parse(readFileSync(reportFile, 'utf-8'));
      if (report.viewportVariants) {
        const variants = JSON.parse(report.viewportVariants);
        // Check if this report matches our page by comparing paths
        const reportPageName = basename(reportFile, '.report.json');
        if (reportPageName === pageName) {
          return variants;
        }
      }
    } catch (e) { /* ignore */ }
  }

  return [];
}

async function processFile(filePath) {
  console.log(`\nProcessing: ${filePath}`);
  let html = readFileSync(filePath, 'utf-8');

  const imgRegex = /src="(https?:\/\/[^"]+)"/g;
  const matches = [...html.matchAll(imgRegex)];

  if (matches.length === 0) {
    console.log('  No external images found.');
    return;
  }

  const pageDir = dirname(filePath);
  const pageName = basename(filePath, '.plain.html');
  const mediaDir = join(pageDir, `.${pageName}`);

  if (!existsSync(mediaDir)) {
    mkdirSync(mediaDir, { recursive: true });
  }

  // Step 1: Download and localize all referenced images (desktop versions)
  let replacements = 0;
  const uniqueUrls = [...new Set(matches.map(m => m[1]))];

  for (const originalUrl of uniqueUrls) {
    const urlHash = hashUrl(originalUrl);
    const ext = extname(new URL(originalUrl).pathname) || '.jpg';
    const originalName = basename(new URL(originalUrl).pathname, ext);
    const localFilename = `${originalName}-${urlHash}${ext}`;
    const localPath = join(mediaDir, localFilename);
    const relativePath = `./.${pageName}/${localFilename}`;

    try {
      if (!existsSync(localPath)) {
        const cachedPath = findCachedImage(originalUrl);
        if (cachedPath) {
          copyFileSync(cachedPath, localPath);
          console.log(`  ✓ Copied from cache: ${localFilename}`);
        } else {
          console.log(`  ⬇ Downloading: ${originalUrl}`);
          const imageData = await downloadImage(originalUrl);
          writeFileSync(localPath, imageData);
          console.log(`  ✓ Downloaded: ${localFilename} (${imageData.length} bytes)`);
        }
      } else {
        console.log(`  ✓ Already exists: ${localFilename}`);
      }

      html = html.replaceAll(originalUrl, relativePath);
      replacements++;
    } catch (error) {
      console.error(`  ✗ Failed: ${originalUrl}: ${error.message}`);
    }
  }

  // Remove empty section divs (artifacts from conversion pipeline)
  html = html.replace(/^<div><\/div>\n?/gm, '').replace(/\n{2,}/g, '\n');

  if (replacements > 0 || html !== readFileSync(filePath, 'utf-8')) {
    writeFileSync(filePath, html);
    console.log(`  Updated ${replacements} image references in HTML.`);
  }

  // Step 2: Download viewport variants (tablet/mobile) as additional files
  const variants = findViewportVariants(filePath);
  if (variants.length > 0) {
    console.log(`\n  📱 Downloading ${variants.length} viewport variant set(s)...`);

    for (const variantSet of variants) {
      const altLabel = variantSet.alt ? variantSet.alt.substring(0, 40) : 'image';
      console.log(`  Image: "${altLabel}..."`);

      // Download tablet variant if different from desktop
      if (variantSet.tablet && variantSet.tablet !== variantSet.desktop) {
        await downloadToMediaDir(variantSet.tablet, mediaDir, 'tablet');
      }

      // Download mobile variant if different from desktop and tablet
      if (variantSet.mobile && variantSet.mobile !== variantSet.desktop && variantSet.mobile !== variantSet.tablet) {
        await downloadToMediaDir(variantSet.mobile, mediaDir, 'mobile');
      }

      // Download fallback if different from all above
      if (variantSet.fallback && variantSet.fallback !== variantSet.desktop
          && variantSet.fallback !== variantSet.tablet && variantSet.fallback !== variantSet.mobile) {
        await downloadToMediaDir(variantSet.fallback, mediaDir, 'fallback');
      }
    }
  } else {
    console.log('  ℹ No viewport variants found in reports.');
  }
}

async function main() {
  if (!existsSync(CONTENT_DIR)) {
    console.error('Error: content/ directory not found.');
    process.exit(1);
  }

  const files = findPlainHtmlFiles(CONTENT_DIR);
  console.log(`Found ${files.length} .plain.html file(s) to process.`);
  console.log(`Image cache: ${existsSync(MIGRATION_IMAGES) ? 'available' : 'not found'}`);
  console.log(`Image mapping: ${Object.keys(imageMapping).length} entries`);
  console.log(`Reports dir: ${existsSync(REPORTS_DIR) ? 'available' : 'not found'}`);

  for (const file of files) {
    await processFile(file);
  }

  console.log('\n✅ Done!');
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});

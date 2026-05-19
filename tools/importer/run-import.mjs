#!/usr/bin/env node

/**
 * Local Import Runner
 *
 * Simulates the WebImporter environment and runs the import script locally
 * for validation. Downloads pages, executes the transform, and produces
 * .plain.html output files in the content/ directory.
 *
 * Usage:
 *   node tools/importer/run-import.mjs <url> [url2] [url3] ...
 *   node tools/importer/run-import.mjs --all
 *   node tools/importer/run-import.mjs --representative
 */

import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const CONTENT_DIR = path.join(PROJECT_ROOT, 'content');
const SOURCE_DOMAIN = 'https://www.edc.ca';
const DA_BASE = 'https://content.da.live/aemdemos/poc-edc';

// ============ WebImporter Shim ============

const WebImporter = {
  DOMUtils: {
    createTable(cells, document) {
      const table = document.createElement('table');
      cells.forEach((row) => {
        const tr = document.createElement('tr');
        const items = Array.isArray(row) ? row : [row];
        items.forEach((cell) => {
          const td = document.createElement('td');
          if (typeof cell === 'string') {
            td.textContent = cell;
          } else if (cell instanceof Object && cell.nodeType) {
            td.appendChild(cell);
          }
          tr.appendChild(td);
        });
        table.appendChild(tr);
      });
      return table;
    },
    remove(element, selectors) {
      selectors.forEach((selector) => {
        element.querySelectorAll(selector).forEach((el) => el.remove());
      });
    },
  },
  Blocks: {
    getMetadataBlock(document, meta) {
      const cells = [['Metadata']];
      Object.entries(meta).forEach(([key, value]) => {
        if (value) cells.push([key, value]);
      });
      return WebImporter.DOMUtils.createTable(cells, document);
    },
  },
  FileUtils: {
    sanitizePath(p) {
      return p.replace(/[^a-zA-Z0-9/.-]/g, '-').toLowerCase();
    },
  },
  rules: {
    transformBackgroundImages() {},
    adjustImageUrls() {},
    createMetadata() {},
  },
};

// Make WebImporter available globally for the import script
globalThis.WebImporter = WebImporter;
globalThis.window = { location: { origin: SOURCE_DOMAIN } };

// ============ Fetch Utility ============

async function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const options = { rejectUnauthorized: false };
    https.get(url, options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchPage(res.headers.location).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function downloadImage(imageUrl, imageDir) {
  const parsed = new URL(imageUrl);
  const originalName = path.basename(parsed.pathname);
  const localPath = path.join(imageDir, originalName);
  if (fs.existsSync(localPath)) return originalName;

  return new Promise((resolve, reject) => {
    const options = { rejectUnauthorized: false };
    https.get(imageUrl, options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        downloadImage(res.headers.location, imageDir).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} downloading ${imageUrl}`));
        return;
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        fs.writeFileSync(localPath, Buffer.concat(chunks));
        resolve(originalName);
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

// ============ Table to Block Converter ============

/**
 * Converts WebImporter tables to EDS .plain.html block format.
 * Tables with a header row (block name) become <div class="blockname">
 * with nested rows. <hr> elements become section breaks.
 */
function convertToPlainHtml(body, document) {
  const sections = [];
  let currentSection = document.createElement('div');

  for (const child of [...body.children]) {
    if (child.tagName === 'HR') {
      if (currentSection.children.length > 0) {
        sections.push(currentSection);
      }
      currentSection = document.createElement('div');
      continue;
    }

    if (child.tagName === 'TABLE') {
      const rows = [...child.querySelectorAll('tr')];
      if (rows.length === 0) continue;

      // First row is the block name
      const blockName = rows[0].textContent.trim().toLowerCase().replace(/\s+/g, '-');
      const block = document.createElement('div');
      block.className = blockName;

      // Remaining rows are content
      for (let i = 1; i < rows.length; i += 1) {
        const row = document.createElement('div');
        const cells = [...rows[i].querySelectorAll('td')];
        cells.forEach((td) => {
          const cell = document.createElement('div');
          // Move children instead of using innerHTML
          while (td.firstChild) {
            cell.appendChild(td.firstChild);
          }
          row.appendChild(cell);
        });
        block.appendChild(row);
      }
      currentSection.appendChild(block);
    } else {
      currentSection.appendChild(child);
    }
  }

  if (currentSection.children.length > 0) {
    sections.push(currentSection);
  }

  return sections;
}

/**
 * Post-processes images: downloads and rewrites URLs to local relative paths.
 */
async function processImages(sections, pageName, outputDir) {
  const imageDir = path.join(outputDir, `.${pageName}`);
  fs.mkdirSync(imageDir, { recursive: true });

  let downloadCount = 0;
  const processed = new Map();

  for (const section of sections) {
    const els = section.querySelectorAll('img[src], source[srcset]');
    for (const el of els) {
      const attr = el.hasAttribute('src') ? 'src' : 'srcset';
      let src = el.getAttribute(attr);
      if (!src || src.startsWith('data:')) continue;
      // Make absolute for download
      if (src.startsWith('/')) src = `${SOURCE_DOMAIN}${src}`;
      if (!src.startsWith('http')) continue;

      // Download once per unique URL, rewrite to relative path
      if (!processed.has(src)) {
        try {
          const filename = await downloadImage(src, imageDir);
          processed.set(src, `./.${pageName}/${filename}`);
          downloadCount += 1;
        } catch (err) {
          processed.set(src, src);
          console.error(`    Warning: Failed to download ${src}: ${err.message}`);
        }
      }
      el.setAttribute(attr, processed.get(src));
    }
  }
  return downloadCount;
}

// ============ Main Import ============

async function importPage(url) {
  console.log(`Importing: ${url}`);

  const html = await fetchPage(url);
  const dom = new JSDOM(html, { url });
  const { document } = dom.window;

  // Load the import script
  const importScript = await import('./import-article-detail.js');

  // Execute transform
  const payload = {
    document,
    url,
    html,
    params: { originalURL: url },
  };

  const results = importScript.default.transform(payload);
  if (!results || results.length === 0) {
    throw new Error('Transform returned no results');
  }

  const { element, path: pagePath, report } = results[0];
  console.log(`  Title: ${report.title}`);

  // Convert tables to plain HTML block format
  const sections = convertToPlainHtml(element, document);

  // Determine output path
  const outputPath = path.join(CONTENT_DIR, `${pagePath}.plain.html`);
  const outputDir = path.dirname(outputPath);
  const pageName = path.basename(outputPath, '.plain.html');
  fs.mkdirSync(outputDir, { recursive: true });

  // Download images and keep source URLs (publicly accessible)
  const imgCount = await processImages(sections, pageName, outputDir);
  console.log(`  Images: ${imgCount} downloaded`);

  // Serialize
  const output = sections.map((s) => s.outerHTML).join('');
  fs.writeFileSync(outputPath, output, 'utf8');

  console.log(`  Output: ${path.relative(PROJECT_ROOT, outputPath)}`);
  return outputPath;
}

// ============ CLI ============

function loadTemplateUrls() {
  const catalogPath = path.join(PROJECT_ROOT, 'tools/template-catalog.json');
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const template = catalog.templates.find((t) => t.name === 'article-detail');
  if (!template) throw new Error('article-detail template not found');
  return template.urls;
}

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage:');
  console.error('  node tools/importer/run-import.mjs <url> [url2] ...');
  console.error('  node tools/importer/run-import.mjs --all');
  console.error('  node tools/importer/run-import.mjs --representative');
  process.exit(1);
}

let urls = [];

if (args[0] === '--all') {
  urls = loadTemplateUrls();
} else if (args[0] === '--representative') {
  const catalogPath = path.join(PROJECT_ROOT, 'tools/template-catalog.json');
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const template = catalog.templates.find((t) => t.name === 'article-detail');
  urls = template?.representativePages || [];
} else {
  urls = args.filter((a) => a.startsWith('http'));
}

console.log(`Processing ${urls.length} page(s)...\n`);

let success = 0;
let failed = 0;

for (const url of urls) {
  try {
    await importPage(url);
    success += 1;
  } catch (err) {
    console.error(`  ERROR: ${err.message}`);
    failed += 1;
  }
  console.log('');
}

console.log(`Done. ${success} succeeded, ${failed} failed.`);

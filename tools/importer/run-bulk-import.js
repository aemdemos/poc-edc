/**
 * Bulk import runner script.
 * Fetches pages from source, applies the import.js transformation,
 * and writes .plain.html output files to the content directory.
 *
 * Usage: NODE_TLS_REJECT_UNAUTHORIZED=0 node tools/importer/run-bulk-import.js
 */

import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = path.resolve(__dirname, '../../content');
const SOURCE_DOMAIN = 'https://www.edc.ca';

const URLS = [
  'https://www.edc.ca/en/about-us/news/oil-and-gas-750m.html',
  'https://www.edc.ca/en/about-us/news/egp-1billion.html',
  'https://www.edc.ca/en/about-us/news/brossard-quebec-office.html',
];

/**
 * Fetches a URL and returns the HTML string.
 */
function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const options = { rejectUnauthorized: false };

    client.get(url, options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchPage(res.headers.location).then(resolve).catch(reject);
        return;
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Minimal WebImporter shim for running transformDOM outside the browser.
 */
const WebImporter = {
  DOMUtils: {
    remove(element, selectors) {
      selectors.forEach((sel) => {
        element.querySelectorAll(sel).forEach((el) => el.remove());
      });
    },
    createTable(cells, document) {
      const table = document.createElement('table');
      cells.forEach((row, i) => {
        const tr = document.createElement('tr');
        row.forEach((cell) => {
          const td = document.createElement(i === 0 ? 'th' : 'td');
          if (typeof cell === 'string') {
            td.textContent = cell;
          } else if (cell && cell.nodeType) {
            td.append(cell.cloneNode(true));
          }
          tr.append(td);
        });
        table.append(tr);
      });
      return table;
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
};

/**
 * Converts a table-based block DOM to EDS div-based .plain.html format.
 */
function convertToPlainHTML(outputEl, document) {
  const sections = [];
  let currentSection = [];

  [...outputEl.childNodes].forEach((node) => {
    if (node.tagName === 'HR') {
      if (currentSection.length > 0) {
        sections.push(currentSection);
        currentSection = [];
      }
    } else {
      currentSection.push(node);
    }
  });
  if (currentSection.length > 0) sections.push(currentSection);

  const parts = sections.map((sectionNodes) => {
    let inner = '';
    sectionNodes.forEach((node) => {
      if (node.tagName === 'TABLE') {
        inner += tableToBlock(node);
      } else if (node.outerHTML) {
        inner += node.outerHTML;
      }
    });
    return `<div>${inner}</div>`;
  });

  return parts.join('\n');
}

/**
 * Converts a block table to EDS div-based format.
 */
function tableToBlock(table) {
  const rows = [...table.querySelectorAll('tr')];
  if (rows.length === 0) return '';

  const headerRow = rows[0];
  const headerCell = headerRow.querySelector('th, td');
  const blockName = headerCell ? headerCell.textContent.trim().toLowerCase() : '';

  if (blockName === 'metadata') {
    let html = '<div class="metadata">';
    rows.slice(1).forEach((row) => {
      const cells = [...row.querySelectorAll('td')];
      if (cells.length >= 2) {
        html += `<div><div>${cells[0].textContent.trim()}</div><div>${cells[1].innerHTML.trim() || cells[1].textContent.trim()}</div></div>`;
      }
    });
    html += '</div>';
    return html;
  }

  let html = `<div class="${blockName}">`;
  rows.slice(1).forEach((row) => {
    const cells = [...row.querySelectorAll('td')];
    html += '<div>';
    cells.forEach((cell) => {
      html += `<div>${cell.innerHTML.trim()}</div>`;
    });
    html += '</div>';
  });
  html += '</div>';
  return html;
}

/**
 * Derives output path from URL.
 */
function getOutputPath(url) {
  const u = new URL(url);
  let p = u.pathname.replace(/\.html$/, '');
  if (p.endsWith('/')) p = p.slice(0, -1);
  return p;
}

/**
 * Downloads an image and returns the local relative filename.
 */
async function downloadImage(imgUrl, dotFolder) {
  const filename = path.basename(new URL(imgUrl).pathname);
  const localPath = path.join(dotFolder, filename);

  if (fs.existsSync(localPath)) return filename;

  return new Promise((resolve) => {
    const fullUrl = imgUrl.startsWith('/') ? `${SOURCE_DOMAIN}${imgUrl}` : imgUrl;
    const client = fullUrl.startsWith('https') ? https : http;
    client.get(fullUrl, { rejectUnauthorized: false }, (res) => {
      if (res.statusCode !== 200) {
        resolve(filename);
        return;
      }
      const ws = fs.createWriteStream(localPath);
      res.pipe(ws);
      ws.on('finish', () => resolve(filename));
      ws.on('error', () => resolve(filename));
    }).on('error', () => resolve(filename));
  });
}

/**
 * Main: import all pages.
 */
async function main() {
  // Make WebImporter global for import.js
  globalThis.WebImporter = WebImporter;

  // Dynamically import the transform function
  const importModule = await import('./import.js');
  const { transformDOM, generateDocumentPath } = importModule.default;

  for (const url of URLS) {
    console.log(`\nImporting: ${url}`);

    try {
      const html = await fetchPage(url);
      const dom = new JSDOM(html, { url });
      const { document } = dom.window;

      // Run the transformation
      const output = transformDOM({ document, url, html, params: { originalURL: url } });

      if (!output) {
        console.log(`  SKIP: transformDOM returned null`);
        continue;
      }

      // Get output path
      const docPath = generateDocumentPath({ document, url, html, params: { originalURL: url } });
      console.log(`  Path: ${docPath}`);

      // Convert to plain HTML
      const plainHTML = convertToPlainHTML(output, document);

      // Create directories
      const outputDir = path.join(CONTENT_DIR, path.dirname(docPath));
      fs.mkdirSync(outputDir, { recursive: true });

      // Create dot folder for images
      const pageName = path.basename(docPath);
      const dotFolder = path.join(outputDir, `.${pageName}`);
      fs.mkdirSync(dotFolder, { recursive: true });

      // Download images and fix paths
      const imgPrefix = `./.${pageName}/`;
      const imgs = output.querySelectorAll('img');
      let finalHTML = plainHTML;

      for (const img of imgs) {
        const src = img.getAttribute('src');
        if (src && !src.startsWith('data:')) {
          const fullSrc = src.startsWith('/') ? `${SOURCE_DOMAIN}${src}` : src;
          const filename = await downloadImage(fullSrc, dotFolder);
          finalHTML = finalHTML.replace(new RegExp(escapeRegex(src), 'g'), `${imgPrefix}${filename}`);
        }
      }

      // Write the file
      const outputFile = path.join(outputDir, `${pageName}.plain.html`);
      fs.writeFileSync(outputFile, finalHTML);
      console.log(`  OK: ${outputFile}`);
    } catch (err) {
      console.error(`  ERROR: ${err.message}`);
    }
  }

  console.log('\nDone.');
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

main();

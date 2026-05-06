/* eslint-disable no-console */
/* One-shot importer: fetch edc.ca case study HTML, extract blocks, emit EDS fragment + media. */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { JSDOM } from 'jsdom';

import cleanup from './transformers/cleanup.js';
import sectionsTransform from './transformers/sections.js';
import { parse as parseHero } from './parsers/hero-case-study.js';
import { parse as parseSidebar } from './parsers/sidebar-company-profile.js';
import { parse as parseQuote } from './parsers/quote-pullquote.js';
import { parse as parseRelated } from './parsers/related-services.js';
import { parse as parseNewsletter } from './parsers/newsletter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');

const SOURCE_URL = process.env.IMPORT_SOURCE_URL
  || 'https://www.edc.ca/en/about-us/what-we-do/case-studies/ecbverdyol-foreign-exchange-challenge.html';

const OUTPUT_HTML = path.join(
  REPO_ROOT,
  'content/en/about-us/what-we-do/case-studies/ecbverdyol-foreign-exchange-challenge.html',
);

const MEDIA_DIR = path.join(
  REPO_ROOT,
  'content/en/about-us/what-we-do/case-studies/media',
);

/** Same-origin DAM paths → local filenames under ./media/ */
const MEDIA_DOWNLOADS = [
  {
    remotePath: '/content/dam/edc/en/lifestyle/outdoor/ecbverdyol-foreign-exchange-challenge-ahero-m.png',
    file: 'hero.png',
  },
  {
    remotePath: '/content/dam/edc/en/lifestyle/outdoor/ecbverdyol-foreign-exchange-challenge-image-1.png',
    file: 'image-1.png',
  },
  {
    remotePath: '/content/dam/edc/en/lifestyle/outdoor/ecbverdyol-foreign-exchange-challenge-image-2.png',
    file: 'image-2.png',
  },
  {
    remotePath: '/content/dam/edc/en/lifestyle/outdoor/ecbverdyol-foreign-exchange-challenge-image-3.png',
    file: 'image-3.png',
  },
];

/**
 * @param {string} blockName Display name for the block header (e.g. "Hero", "Cards (horizontal)")
 * @param {string[][]} rows cell HTML per row
 */
function blockTable(blockName, rows) {
  const colCount = Math.max(...rows.map((r) => r.length), 1);
  const colSpan = colCount > 1 ? ` colspan="${colCount}"` : '';
  const body = rows.map((cols) => `
      <tr>${cols.map((html) => `<td>${html}</td>`).join('')}</tr>`).join('');
  return `<table>
      <tr><th${colSpan}>${blockName}</th></tr>${body}
    </table>`;
}

/**
 * @param {Document} doc
 */
function extractArticleSegments(doc) {
  const body = doc.querySelector('.article-body');
  if (!body) return [];
  /** @type {{ type: string, html?: string }[]} */
  const segments = [];

  [...body.children].forEach((child) => {
    if (child.classList.contains('pdfdownload')) return;
    if (child.querySelector?.('.c-pdf-download.for-mobile')) return;
    if (child.classList.contains('pullquote')) {
      segments.push({ type: 'quote' });
      return;
    }
    if (child.classList.contains('list') && child.querySelector('.recommended-articles-premium-wrapper')) {
      segments.push({ type: 'cards' });
      return;
    }
    if (child.classList.contains('sectiontitle')) return;
    if (child.classList.contains('text')) {
      const cmp = child.querySelector('.cmp-text');
      if (cmp) segments.push({ type: 'html', html: cmp.innerHTML });
      return;
    }
    if (child.classList.contains('imageinbodytext')) {
      const pic = child.querySelector('picture');
      if (pic) segments.push({ type: 'html', html: pic.outerHTML });
    }
  });

  return segments;
}


function extractBreadcrumbs(doc) {
  const nav = doc.querySelector('nav[aria-label="Breadcrumb"]');
  if (!nav) return '';
  const items = [...nav.querySelectorAll('li')];
  if (!items.length) return '';
  const listItems = items.map((li) => {
    const a = li.querySelector('a');
    if (a) return `<li><a href="${a.getAttribute('href')}">${a.textContent.trim()}</a></li>`;
    return `<li>${li.textContent.trim()}</li>`;
  }).join('\n      ');
  return `<ul>
      ${listItems}
    </ul>`;
}

function sectionMetaTable(meta) {
  const rows = Object.entries(meta).map(([k, v]) => `
      <tr><td>${k}</td><td>${String(v)}</td></tr>`).join('');
  return `<table>
      <tr><th colspan="2">Section metadata</th></tr>${rows}
    </table>`;
}

function replaceMediaRefs(html) {
  let out = html;
  const reps = [
    [/https:\/\/www\.edc\.ca\/content\/dam\/edc\/en\/lifestyle\/outdoor\/ecbverdyol-foreign-exchange-challenge-ahero-[dmt]\.png/g, './media/hero.png'],
    [/https:\/\/www\.edc\.ca\/content\/dam\/edc\/en\/lifestyle\/outdoor\/ecbverdyol-foreign-exchange-challenge-image-1\.png/g, './media/image-1.png'],
    [/https:\/\/www\.edc\.ca\/content\/dam\/edc\/en\/lifestyle\/outdoor\/ecbverdyol-foreign-exchange-challenge-image-2\.png/g, './media/image-2.png'],
    [/https:\/\/www\.edc\.ca\/content\/dam\/edc\/en\/lifestyle\/outdoor\/ecbverdyol-foreign-exchange-challenge-image-3\.png/g, './media/image-3.png'],
    [/\/content\/dam\/edc\/en\/lifestyle\/outdoor\/ecbverdyol-foreign-exchange-challenge-ahero-[dmt]\.png/g, './media/hero.png'],
    [/\/content\/dam\/edc\/en\/lifestyle\/outdoor\/ecbverdyol-foreign-exchange-challenge-image-1\.png/g, './media/image-1.png'],
    [/\/content\/dam\/edc\/en\/lifestyle\/outdoor\/ecbverdyol-foreign-exchange-challenge-image-2\.png/g, './media/image-2.png'],
    [/\/content\/dam\/edc\/en\/lifestyle\/outdoor\/ecbverdyol-foreign-exchange-challenge-image-3\.png/g, './media/image-3.png'],
  ];
  reps.forEach(([re, to]) => {
    out = out.replace(re, to);
  });
  return out;
}

async function fetchBuffer(url) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function downloadMedia() {
  await fs.mkdir(MEDIA_DIR, { recursive: true });
  const base = new URL(SOURCE_URL).origin;
  // eslint-disable-next-line no-restricted-syntax
  for (const { remotePath, file } of MEDIA_DOWNLOADS) {
    const url = `${base}${remotePath}`;
    const dest = path.join(MEDIA_DIR, file);
    const buf = await fetchBuffer(url);
    await fs.writeFile(dest, buf);
    // eslint-disable-next-line no-console
    console.warn(`Wrote ${path.relative(REPO_ROOT, dest)} (${buf.length} bytes)`);
  }
}

function escapeHtmlTableCell(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function heroPictureMarkup(altText) {
  const alt = escapeHtmlTableCell(altText);
  return `<picture><img src="./media/hero.png" alt="${alt}" loading="eager"/></picture>`;
}

async function run() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`Fetch failed ${res.status}`);
  const rawHtml = await res.text();

  const dom = new JSDOM(rawHtml, { url: SOURCE_URL });
  const { document } = dom.window;

  const newsletterData = parseNewsletter(document);

  cleanup(document);
  sectionsTransform(document);

  const heroData = parseHero(document);
  const sidebarData = parseSidebar(document);
  const quoteData = parseQuote(document);
  const cardsData = parseRelated(document);

  const breadcrumbs = extractBreadcrumbs(document);
  const segments = extractArticleSegments(document);

  const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';

  const heroAlt = document.querySelector('section.c-page-hero-banner img')?.getAttribute('alt')
    || 'Landscape showing use of erosion and sediment control';

  let heroInner = heroData.cells[0]?.[0] || '';
  heroInner = replaceMediaRefs(heroInner);
  heroInner = heroInner.replace(/<picture[\s\S]*?<\/picture>/i, heroPictureMarkup(heroAlt));

  const heroBlock = blockTable('Hero', [[heroInner]]);
  const quoteBlock = blockTable('Quote', quoteData.cells);
  const cardsBlock = replaceMediaRefs(blockTable('Cards (horizontal)', cardsData.cells));
  const sidebarBlock = blockTable('Sidebar', sidebarData.cells);

  const newsletterRows = newsletterData.cells.map(([c]) => [`<p>${c}</p>`]);
  const newsletterBlock = blockTable('Newsletter', newsletterRows);

  let articleParts = '';
  segments.forEach((seg) => {
    if (seg.type === 'html' && seg.html) {
      articleParts += replaceMediaRefs(seg.html);
    } else if (seg.type === 'quote') {
      articleParts += quoteBlock;
    } else if (seg.type === 'cards') {
      articleParts += cardsBlock;
    }
  });

  const dateText = document.querySelector('.c-date-modified__date')?.textContent?.trim()
    || 'Date modified: 2024-09-05';
  const dateMatch = dateText.match(/(\d{4}-\d{2}-\d{2})/);
  const dateIso = dateMatch ? dateMatch[1] : '2024-09-05';
  const pageTitle = document.querySelector('title')?.textContent?.replace(/\s*\|\s*EDC\s*$/i, '')?.trim()
    || 'ECBVerdyol foreign exchange challenge';

  const page = `<header></header>
<main>
  <div>
    ${heroBlock}
    ${sectionMetaTable({ style: 'hero' })}
  </div>
  <hr>
  <div>
    ${breadcrumbs}
    ${sectionMetaTable({ style: 'breadcrumb' })}
  </div>
  <hr>
  <div>
    ${articleParts}
    ${sidebarBlock}
    <p>${dateText}</p>
    ${sectionMetaTable({ style: 'article' })}
  </div>
  <hr>
  <div>
    ${newsletterBlock}
    ${sectionMetaTable({ style: 'highlight', 'background-color': '#E5EDF7' })}
  </div>
  <hr>
  <div>
    <table>
      <tr><th colspan="2">Metadata</th></tr>
      <tr><td>title</td><td>${escapeHtmlTableCell(pageTitle)}</td></tr>
      <tr><td>description</td><td>${escapeHtmlTableCell(metaDesc)}</td></tr>
      <tr><td>image</td><td>./media/hero.png</td></tr>
      <tr><td>date-modified</td><td>${dateIso}</td></tr>
      <tr><td>template</td><td>case-study</td></tr>
      <tr><td>breadcrumbs</td><td>true</td></tr>
    </table>
  </div>
</main>
<footer></footer>
`;

  await fs.mkdir(path.dirname(OUTPUT_HTML), { recursive: true });
  await downloadMedia();
  await fs.writeFile(OUTPUT_HTML, page, 'utf8');
  console.warn(`Wrote ${path.relative(REPO_ROOT, OUTPUT_HTML)}`);
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

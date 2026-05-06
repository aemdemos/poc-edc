#!/usr/bin/env node
/**
 * EDC case study page importer — fetches source HTML, downloads assets,
 * and writes Franklin-compatible content HTML.
 */
/* eslint-disable no-console */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { JSDOM } from 'jsdom';

import { transform as cleanup } from './transformers/cleanup.js';
import { transform as sectionsTransform } from './transformers/sections.js';
import { parse as parseNewsletter } from './parsers/newsletter.js';
import { parse as parseHero } from './parsers/hero-case-study.js';
import { parse as parseSidebar } from './parsers/sidebar-company-profile.js';
import { parse as parseQuote } from './parsers/quote-pullquote.js';
import { parse as parseCards } from './parsers/related-services.js';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

const SOURCE_URL = 'https://www.edc.ca/en/about-us/what-we-do/case-studies/ecbverdyol-foreign-exchange-challenge.html';
const SOURCE_BASE = 'https://www.edc.ca';

const IMAGE_WEB_PREFIX = '/images/case-studies/ecbverdyol-foreign-exchange-challenge';
const OUT_REL = 'content/en/about-us/what-we-do/case-studies/ecbverdyol-foreign-exchange-challenge.html';

/** @type {{ remotePath: string, file: string }[]} */
const ASSETS = [
  { remotePath: '/content/dam/edc/en/lifestyle/outdoor/ecbverdyol-foreign-exchange-challenge-ahero-d.png', file: 'hero.png' },
  { remotePath: '/content/dam/edc/en/lifestyle/outdoor/ecbverdyol-foreign-exchange-challenge-image-1.png', file: 'image-1.png' },
  { remotePath: '/content/dam/edc/en/lifestyle/outdoor/ecbverdyol-foreign-exchange-challenge-image-2.png', file: 'image-2.png' },
  { remotePath: '/content/dam/edc/en/lifestyle/outdoor/ecbverdyol-foreign-exchange-challenge-image-3.png', file: 'image-3.png' },
];

/**
 * @param {string} blockClass
 * @param {string[][]} cells
 */
function cellsToBlock(blockClass, cells) {
  let html = `<div class="${blockClass}">`;
  cells.forEach((row) => {
    html += '<div>';
    row.forEach((cell) => {
      html += `<div>${cell}</div>`;
    });
    html += '</div>';
  });
  html += '</div>';
  return html;
}

/**
 * @param {Record<string, string>} meta
 */
function sectionMetaHtml(meta) {
  const entries = Object.entries(meta).filter(([, v]) => v != null && String(v) !== '');
  if (!entries.length) return '';
  let inner = '';
  entries.forEach(([k, v]) => {
    inner += `<div><div>${k}</div><div><p>${String(v)}</p></div></div>`;
  });
  return `<div class="section-metadata">${inner}</div>`;
}

/**
 * @param {string} html
 * @param {Map<string, string>} urlToLocal
 */
function rewriteImageUrls(html, urlToLocal) {
  let out = html;
  urlToLocal.forEach((local, absolute) => {
    out = out.split(absolute).join(local);
    const absEncoded = absolute.replace(/&/g, '&amp;');
    out = out.split(absEncoded).join(local);
  });
  return out;
}

/**
 * Absolutize links starting with / inside HTML fragment.
 * @param {string} html
 */
function absolutizeEdcLinks(html) {
  return html.replace(/href="\/([^"]*)"/g, (_, p) => `href="${SOURCE_BASE}/${p}"`);
}

/**
 * @param {Document} doc
 * @param {Map<string, string>} urlToLocal
 */
function extractArticleHtml(doc, urlToLocal) {
  const body = doc.querySelector('.article-body');
  if (!body) return [];

  const chunks = [];
  [...body.children].forEach((child) => {
    if (child.matches('.pdfdownload')) return;
    if (child.querySelector('.recommended-articles-premium-wrapper')) {
      chunks.push({ type: 'marker', marker: 'cards' });
      return;
    }
    if (child.matches('.pullquote')) {
      chunks.push({ type: 'marker', marker: 'quote' });
      return;
    }
    if (child.matches('.sectiontitle')) return;

    if (child.matches('.text')) {
      const cmp = child.querySelector('.cmp-text');
      if (cmp && cmp.textContent.trim()) {
        let inner = cmp.innerHTML;
        inner = absolutizeEdcLinks(inner);
        inner = rewriteImageUrls(inner, urlToLocal);
        chunks.push({ type: 'html', html: inner });
      }
      return;
    }

    if (child.matches('.imageinbodytext')) {
      const pic = child.querySelector('picture');
      if (pic) {
        let ph = pic.outerHTML.replace(/\ssrcSet=/gi, ' srcset=');
        ph = ph.replace(/src="\/([^"]+)"/g, (_, p) => `src="${SOURCE_BASE}/${p}"`);
        ph = ph.replace(/srcset="([^"]+)"/gi, (match, raw) => {
          const abs = raw.replace(/(^|[,\s])\/content/g, `$1${SOURCE_BASE}/content`);
          return `srcset="${abs}"`;
        });
        ph = rewriteImageUrls(ph, urlToLocal);
        chunks.push({ type: 'html', html: ph });
      }
    }
  });

  return chunks;
}

function buildDocument({
  pageTitle,
  metaDesc,
  heroData,
  sidebarData,
  quoteData,
  cardsData,
  newsletterData,
  articleChunks,
  urlToLocal,
  dateModified,
}) {
  const heroHtml = rewriteImageUrls(
    cellsToBlock('hero', heroData.cells),
    urlToLocal,
  );

  const quoteHtml = cellsToBlock('quote', quoteData.cells);
  const cardsHtml = rewriteImageUrls(
    cellsToBlock('cards horizontal', cardsData.cells),
    urlToLocal,
  );
  const sidebarHtml = cellsToBlock('sidebar', sidebarData.cells);
  const newsletterHtml = cellsToBlock('newsletter', newsletterData.cells);

  const breadcrumbNav = `
<nav aria-label="Breadcrumb" class="breadcrumb-nav">
  <ol class="breadcrumb-list">
    <li><a href="${SOURCE_BASE}/en/about-us/what-we-do/case-studies.html">Case studies</a></li>
    <li><a href="${SOURCE_URL}" aria-current="page">ECBVerdyol</a></li>
  </ol>
</nav>`;

  let articleInner = breadcrumbNav;
  articleChunks.forEach((ch) => {
    if (ch.type === 'html') {
      articleInner += ch.html;
    } else if (ch.type === 'marker' && ch.marker === 'quote') {
      articleInner += quoteHtml;
    } else if (ch.type === 'marker' && ch.marker === 'cards') {
      articleInner += cardsHtml;
    }
  });

  const mainArticle = `
    <div class="case-study-grid">
      <div class="case-study-main">
        ${articleInner}
      </div>
      <div class="case-study-rail">
        ${sidebarHtml}
      </div>
    </div>`;

  const metadataBlock = `
<div>
  <table>
    <tr><th colspan="2">Metadata</th></tr>
    <tr><td>title</td><td>${pageTitle.replace(/</g, '')}</td></tr>
    <tr><td>description</td><td>${metaDesc.replace(/</g, '')}</td></tr>
    <tr><td>image</td><td>${IMAGE_WEB_PREFIX}/hero.png</td></tr>
    <tr><td>date-modified</td><td>${dateModified}</td></tr>
    <tr><td>template</td><td>case-study</td></tr>
  </table>
</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${pageTitle.replace(/</g, '')}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <meta name="description" content="${metaDesc.replace(/"/g, '&quot;')}"/>
  <meta name="template" content="case-study"/>
  <meta name="date-modified" content="${dateModified}"/>
</head>
<body>
  <header></header>
  <main>
    <div>
      ${heroHtml}
      ${sectionMetaHtml({ style: 'hero' })}
    </div>
    <hr/>
    <div>
      ${mainArticle}
      <p class="date-modified">Date modified: ${dateModified}</p>
      ${sectionMetaHtml({ style: 'article' })}
    </div>
    <hr/>
    <div>
      ${newsletterHtml}
      ${sectionMetaHtml({ style: 'highlight', 'background-color': '#E5EDF7' })}
    </div>
    <hr/>
    ${metadataBlock}
  </main>
  <footer></footer>
</body>
</html>`;
}

async function downloadFile(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, buf);
}

async function main() {
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`Failed to fetch page: ${res.status}`);
  const html = await res.text();
  const dom = new JSDOM(html, { url: SOURCE_URL });
  const { document } = dom.window;

  const newsletterData = parseNewsletter(document);
  const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
  const pageTitle = document.querySelector('title')?.textContent?.trim() || '';

  let dateModified = '2024-09-05';
  const dm = document.querySelector('.c-date-modified__date, .c-date-modified');
  const dmText = dm?.textContent?.trim() || '';
  const m = dmText.match(/(\d{4}-\d{2}-\d{2})/);
  if (m) [, dateModified] = m;

  cleanup(document);
  sectionsTransform(document);

  const heroData = parseHero(document);
  const sidebarData = parseSidebar(document);
  const quoteData = parseQuote(document);
  const cardsData = parseCards(document);

  const urlToLocal = new Map();
  ASSETS.forEach((a) => {
    const absolute = SOURCE_BASE + a.remotePath;
    urlToLocal.set(absolute, `${IMAGE_WEB_PREFIX}/${a.file}`);
  });
  const heroBase = '/content/dam/edc/en/lifestyle/outdoor/ecbverdyol-foreign-exchange-challenge-ahero';
  ['-d.png', '-t.png', '-m.png'].forEach((suf) => {
    urlToLocal.set(`${SOURCE_BASE}${heroBase}${suf}`, `${IMAGE_WEB_PREFIX}/hero.png`);
  });

  const imageDir = path.join(ROOT, IMAGE_WEB_PREFIX.replace(/^\//, ''));
  await Promise.all(ASSETS.map((a) => downloadFile(
    SOURCE_BASE + a.remotePath,
    path.join(imageDir, a.file),
  )));

  const articleChunks = extractArticleHtml(document, urlToLocal);

  const outHtml = buildDocument({
    pageTitle,
    metaDesc,
    heroData,
    sidebarData,
    quoteData,
    cardsData,
    newsletterData,
    articleChunks,
    urlToLocal,
    dateModified,
  });

  const outPath = path.join(ROOT, OUT_REL);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, outHtml, 'utf8');
  console.log(`Wrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

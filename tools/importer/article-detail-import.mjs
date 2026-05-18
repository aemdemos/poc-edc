#!/usr/bin/env node

/**
 * Article Detail Template Import Script
 *
 * Fetches article pages from www.edc.ca and produces EDS-compatible .plain.html
 * files for upload to DA (Document Authoring).
 *
 * Usage:
 *   node tools/importer/article-detail-import.js <url>
 *   node tools/importer/article-detail-import.js --all
 *
 * The --all flag processes all URLs listed in the article-detail template
 * from tools/template-catalog.json.
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
const DA_ORG = 'aemdemos';
const DA_REPO = 'poc-edc';

/**
 * Fetches HTML from a URL, ignoring SSL certificate errors.
 */
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

/**
 * Downloads an image from a URL and saves it to the local image folder.
 * Returns the local relative path for use in the HTML.
 */
async function downloadImage(imageUrl, imageDir, pagePath) {
  const parsed = new URL(imageUrl);
  const originalName = path.basename(parsed.pathname);
  const localPath = path.join(imageDir, originalName);

  // Skip if already downloaded
  if (fs.existsSync(localPath)) {
    return `./.${path.basename(pagePath)}/${originalName}`;
  }

  return new Promise((resolve, reject) => {
    const options = { rejectUnauthorized: false };
    https.get(imageUrl, options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        downloadImage(res.headers.location, imageDir, pagePath).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} downloading ${imageUrl}`));
        return;
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        fs.writeFileSync(localPath, buffer);
        resolve(`./.${path.basename(pagePath)}/${originalName}`);
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Converts an absolute edc.ca URL to a relative path for internal links.
 */
function toRelativePath(href) {
  if (!href) return href;
  try {
    const url = new URL(href, SOURCE_DOMAIN);
    if (url.hostname === 'www.edc.ca' || url.hostname === 'edc.ca') {
      return url.pathname.replace(/\.html$/, '');
    }
  } catch { /* not a valid URL, return as-is */ }
  return href;
}

/**
 * Transforms internal links within an element to relative paths.
 */
function transformLinks(element) {
  const links = element.querySelectorAll('a[href]');
  links.forEach((a) => {
    const href = a.getAttribute('href');
    if (href && (href.startsWith('/') || href.includes('edc.ca'))) {
      const relative = toRelativePath(href.startsWith('/') ? `${SOURCE_DOMAIN}${href}` : href);
      a.setAttribute('href', relative);
    }
    // Remove target="_blank" for internal links
    if (a.getAttribute('href')?.startsWith('/')) {
      a.removeAttribute('target');
      a.removeAttribute('rel');
    }
  });
}

/**
 * Creates a <picture> element from an image source URL.
 */
function createPicture(document, src, alt = '') {
  const picture = document.createElement('picture');
  const source1 = document.createElement('source');
  source1.setAttribute('srcset', src);
  const source2 = document.createElement('source');
  source2.setAttribute('srcset', src);
  source2.setAttribute('media', '(min-width: 600px)');
  const img = document.createElement('img');
  img.setAttribute('src', src);
  img.setAttribute('alt', alt);
  img.setAttribute('loading', 'lazy');
  picture.append(source1, source2, img);
  return picture;
}

/**
 * Builds the hero block section from the article hero area.
 */
function buildHeroSection(document, articleEl) {
  const section = document.createElement('div');
  const heroBlock = document.createElement('div');
  heroBlock.className = 'hero';

  const heroHeader = articleEl.querySelector('.articlehero header, .articlehero');

  // Row 1: hero image (prefer desktop/largest source)
  const heroPicture = heroHeader?.querySelector('picture, .img-wrapper');
  const heroImg = heroPicture?.querySelector('img');
  if (heroPicture && heroImg) {
    const imgRow = document.createElement('div');
    const imgCell = document.createElement('div');
    // Pick the highest quality source: desktop > tablet > mobile fallback
    const desktopSource = heroPicture.querySelector('source[media*="992"], source[media*="768"]');
    let imgSrc = desktopSource?.getAttribute('srcSet') || desktopSource?.getAttribute('srcset')
      || heroImg.getAttribute('src') || '';
    if (imgSrc.startsWith('/')) imgSrc = `${SOURCE_DOMAIN}${imgSrc}`;
    const alt = heroImg.getAttribute('alt') || '';
    const picture = createPicture(document, imgSrc, alt);
    imgCell.appendChild(picture);
    imgRow.appendChild(imgCell);
    heroBlock.appendChild(imgRow);
  }

  // Row 2: title
  const title = heroHeader?.querySelector('h1.title, h1');
  if (title) {
    const textRow = document.createElement('div');
    const textCell = document.createElement('div');
    const h1 = document.createElement('h1');
    h1.textContent = title.textContent.trim();
    textCell.appendChild(h1);
    textRow.appendChild(textCell);
    heroBlock.appendChild(textRow);
  }
  section.appendChild(heroBlock);
  section.appendChild(createSectionMetadata(document, 'hero'));

  return section;
}

/**
 * Creates a section-metadata element with a style value.
 */
function createSectionMetadata(document, style) {
  const sectionMeta = document.createElement('div');
  sectionMeta.className = 'section-metadata';
  const metaRow = document.createElement('div');
  const metaKey = document.createElement('div');
  const metaKeyP = document.createElement('p');
  metaKeyP.textContent = 'style';
  metaKey.appendChild(metaKeyP);
  const metaVal = document.createElement('div');
  const metaValP = document.createElement('p');
  metaValP.textContent = style;
  metaVal.appendChild(metaValP);
  metaRow.append(metaKey, metaVal);
  sectionMeta.appendChild(metaRow);
  return sectionMeta;
}

/**
 * Cleans a cloned element by removing inline styles and data attributes.
 */
function cleanElement(clone) {
  clone.removeAttribute('style');
  clone.querySelectorAll('[style]').forEach((el) => el.removeAttribute('style'));
  clone.querySelectorAll('[data-uuid]').forEach((el) => el.removeAttribute('data-uuid'));
  return clone;
}

/**
 * Builds a single body content section containing date/category and all article text.
 */
function buildBodySection(document, articleEl) {
  const section = document.createElement('div');

  // Date at the top
  const timeEl = articleEl.querySelector('time.c-tidvi, time');

  if (timeEl) {
    const datePara = document.createElement('p');
    const dateEm = document.createElement('em');
    dateEm.textContent = timeEl.textContent.trim();
    datePara.appendChild(dateEm);
    section.appendChild(datePara);
  }

  // All article body text in one section
  const textContainer = articleEl.querySelector('.articlebodycontainer .cmp-text');
  if (textContainer) {
    transformLinks(textContainer);

    for (const child of [...textContainer.children]) {
      const clone = cleanElement(child.cloneNode(true));
      section.appendChild(clone);
    }
  }

  section.appendChild(createSectionMetadata(document, 'article'));
  return section;
}

/**
 * Builds the date modified section.
 */
function buildDateModifiedSection(document, dateStr) {
  const section = document.createElement('div');
  const p = document.createElement('p');
  p.textContent = `Date modified: ${dateStr}`;
  section.appendChild(p);
  return section;
}

/**
 * Builds the metadata block section.
 */
function buildMetadataSection(document, meta) {
  const section = document.createElement('div');
  const metaBlock = document.createElement('div');
  metaBlock.className = 'metadata';

  const entries = [
    ['Title', meta.title],
    ['Description', meta.description],
    ['Template', 'article-detail'],
    ['Date', meta.date],
  ];

  if (meta.category) {
    entries.push(['Category', meta.category]);
  }

  entries.forEach(([key, value]) => {
    if (!value) return;
    const row = document.createElement('div');
    const keyCell = document.createElement('div');
    keyCell.textContent = key;
    const valCell = document.createElement('div');
    valCell.textContent = value;
    row.append(keyCell, valCell);
    metaBlock.appendChild(row);
  });

  section.appendChild(metaBlock);
  return section;
}

/**
 * Builds a cards block section from the "Recommended articles" area.
 * The recommended articles section sits outside <article> in the source DOM.
 */
function buildRecommendedSection(outDoc, sourceDoc) {
  const recEl = sourceDoc.querySelector('.c-recommended-articles, .recommended-articles');
  if (!recEl) return null;

  const items = recEl.querySelectorAll('li.article, li');
  if (!items.length) return null;

  const section = outDoc.createElement('div');

  // Add heading
  const heading = recEl.querySelector('h2.title, h2');
  if (heading) {
    const h2 = outDoc.createElement('h2');
    h2.textContent = heading.textContent.trim();
    section.appendChild(h2);
  }

  // Build cards block
  const cardsBlock = outDoc.createElement('div');
  cardsBlock.className = 'cards';

  items.forEach((item) => {
    const row = outDoc.createElement('div');

    // Image cell
    const imgCell = outDoc.createElement('div');
    const img = item.querySelector('img');
    if (img) {
      let imgSrc = img.getAttribute('src') || '';
      if (imgSrc.startsWith('/')) imgSrc = `${SOURCE_DOMAIN}${imgSrc}`;
      const alt = img.getAttribute('alt') || '';
      const picture = createPicture(outDoc, imgSrc, alt);
      imgCell.appendChild(picture);
    }
    row.appendChild(imgCell);

    // Text cell
    const textCell = outDoc.createElement('div');
    const titleLink = item.querySelector('h3 a, a.title');
    if (titleLink) {
      const p = outDoc.createElement('p');
      const strong = outDoc.createElement('strong');
      const a = outDoc.createElement('a');
      let href = titleLink.getAttribute('href') || '';
      if (href.startsWith('/')) href = toRelativePath(`${SOURCE_DOMAIN}${href}`);
      a.setAttribute('href', href);
      a.textContent = titleLink.textContent.trim();
      strong.appendChild(a);
      p.appendChild(strong);
      textCell.appendChild(p);
    }
    const desc = item.querySelector('.description p, p');
    if (desc && desc !== titleLink?.closest('p')) {
      const p = outDoc.createElement('p');
      p.textContent = desc.textContent.trim();
      textCell.appendChild(p);
    }
    row.appendChild(textCell);

    cardsBlock.appendChild(row);
  });

  section.appendChild(cardsBlock);
  return section;
}

/**
 * Extracts page metadata from the source HTML document.
 */
function extractMetadata(doc) {
  const title = doc.querySelector('title')?.textContent?.trim() || '';
  const description = doc.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() || '';
  const timeEl = doc.querySelector('time.c-tidvi, time[dateTime]');
  let date = '';
  if (timeEl) {
    const dateTime = timeEl.getAttribute('dateTime') || timeEl.textContent.trim();
    const parsed = new Date(dateTime);
    if (!Number.isNaN(parsed.getTime())) {
      date = parsed.toISOString().split('T')[0];
    } else {
      date = dateTime;
    }
  }
  const categoryEl = doc.querySelector('.data-article-category, [data-primary-tag]');
  const category = categoryEl?.textContent?.trim() || '';

  return { title, description, date, category };
}

/**
 * Converts a source URL to the output file path in the content directory.
 */
function urlToOutputPath(url) {
  const parsed = new URL(url);
  let pathname = parsed.pathname;
  // Remove .html extension
  pathname = pathname.replace(/\.html$/, '');
  // Add .plain.html extension
  return path.join(CONTENT_DIR, `${pathname}.plain.html`);
}

/**
 * Main import function for a single article URL.
 */
async function importArticle(url) {
  console.log(`Importing: ${url}`);

  const html = await fetchPage(url);
  const dom = new JSDOM(html);
  const { document } = dom.window;

  const articleEl = document.querySelector('article');
  if (!articleEl) {
    throw new Error(`No <article> element found on ${url}`);
  }

  const meta = extractMetadata(document);
  console.log(`  Title: ${meta.title}`);
  console.log(`  Date: ${meta.date}`);

  // Build the output document
  const outDom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  const outDoc = outDom.window.document;
  const body = outDoc.body;

  // Section 1: Hero
  const heroSection = buildHeroSection(outDoc, articleEl);
  body.appendChild(heroSection);

  // Section 2: Article body content (date/category + all text)
  const bodySection = buildBodySection(outDoc, articleEl);
  body.appendChild(bodySection);

  // Recommended articles placeholder block (content loaded dynamically at runtime)
  const recSection = document.createElement('div');
  const recBlock = document.createElement('div');
  recBlock.className = 'recommended-articles';
  const recRow = document.createElement('div');
  const recCell = document.createElement('div');
  recCell.textContent = 'Recommended articles for you';
  recRow.appendChild(recCell);
  recBlock.appendChild(recRow);
  recSection.appendChild(recBlock);
  body.appendChild(recSection);


  // Section 4: Metadata block
  const metadataSection = buildMetadataSection(outDoc, meta);
  body.appendChild(metadataSection);

  // Determine output path and image directory
  const outputPath = urlToOutputPath(url);
  const outputDir = path.dirname(outputPath);
  const pageName = path.basename(outputPath, '.plain.html');
  const imageDir = path.join(outputDir, `.${pageName}`);
  fs.mkdirSync(imageDir, { recursive: true });

  // Download all images and rewrite URLs to local relative paths
  const images = body.querySelectorAll('img[src], source[srcset]');
  let downloadCount = 0;
  for (const el of images) {
    const attr = el.hasAttribute('src') ? 'src' : 'srcset';
    const imageUrl = el.getAttribute(attr);
    if (!imageUrl || imageUrl.startsWith('./') || imageUrl.startsWith('data:')) continue;

    try {
      const fullUrl = imageUrl.startsWith('/') ? `${SOURCE_DOMAIN}${imageUrl}` : imageUrl;
      const localPath = await downloadImage(fullUrl, imageDir, pageName);
      el.setAttribute(attr, localPath);
      downloadCount += 1;
    } catch (err) {
      console.error(`    Warning: Failed to download ${imageUrl}: ${err.message}`);
    }
  }
  // Deduplicate download count (picture has source + source + img = 3 elements per image)
  console.log(`  Images: ${Math.ceil(downloadCount / 3)} downloaded`);

  // Serialize output
  const output = body.innerHTML;
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, output, 'utf8');

  console.log(`  Output: ${path.relative(PROJECT_ROOT, outputPath)}`);
  return outputPath;
}

/**
 * Loads the article-detail URLs from the template catalog.
 */
function loadTemplateUrls() {
  const catalogPath = path.join(PROJECT_ROOT, 'tools/template-catalog.json');
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const template = catalog.templates.find((t) => t.name === 'article-detail');
  if (!template) {
    throw new Error('article-detail template not found in template-catalog.json');
  }
  return template.urls;
}

// CLI entry point
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage:');
  console.error('  node tools/importer/article-detail-import.js <url>');
  console.error('  node tools/importer/article-detail-import.js --all');
  console.error('  node tools/importer/article-detail-import.js --representative');
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

console.log(`Processing ${urls.length} article(s)...\n`);

let success = 0;
let failed = 0;

for (const url of urls) {
  try {
    await importArticle(url);
    success += 1;
  } catch (err) {
    console.error(`  ERROR: ${err.message}`);
    failed += 1;
  }
  console.log('');
}

console.log(`Done. ${success} succeeded, ${failed} failed.`);

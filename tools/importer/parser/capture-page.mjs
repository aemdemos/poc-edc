#!/usr/bin/env node
/**
 * Parser: deep capture of a live page for migration reference (DOM outline, stylesheets, computed samples).
 * Run from repo root or tools/importer after `npm install` in tools/importer.
 *
 * Usage:
 *   cd tools/importer && npm install
 *   node parser/capture-page.mjs "https://example.com/page.html"
 *   node parser/capture-page.mjs "https://example.com/page.html" ../../migration-work/parsed-pages
 *
 * Output: {outDir}/{slug}.json — use alongside tools/importer/import.js in AEM Importer / da.live.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WAIT_MS = 5000;
const MAX_STYLE_RULE_CHARS_PER_SHEET = 120000;
const OUTLINE_MAX_DEPTH = 10;
const COMPUTED_SAMPLE_MAX_NODES = 80;

function slugFromUrl(urlString) {
  try {
    const u = new URL(urlString);
    const base = u.pathname.replace(/\/$/, '').replace(/\.html?$/i, '') || 'index';
    return `${u.hostname}${base}`.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'page';
  } catch {
    return 'page';
  }
}

async function loadPuppeteer() {
  try {
    const mod = await import('puppeteer');
    return mod.default || mod;
  } catch {
    console.error('Install Puppeteer: cd tools/importer && npm install');
    process.exit(1);
  }
}

/**
 * @param {import('puppeteer').Page} page
 * @param {string} pageUrl
 */
async function extractInPage(page, pageUrl) {
  return page.evaluate(
    (ctx) => {
      const { pageUrl: pu, MAX_STYLE_RULE_CHARS_PER_SHEET: maxChars, OUTLINE_MAX_DEPTH: maxD, COMPUTED_SAMPLE_MAX_NODES: maxNodes } = ctx;

      /** @param {Element} el */
      function outline(el, depth) {
        if (!el || depth > maxD) return null;
        const o = {
          tag: el.tagName.toLowerCase(),
        };
        if (el.id) o.id = el.id;
        if (el.classList && el.classList.length) o.classes = [...el.classList];
        const role = el.getAttribute('role');
        if (role) o.role = role;
        o.childElementCount = el.childElementCount;
        const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
        if (text) o.textPreview = text.slice(0, 200);

        if (el.children.length && depth < maxD) {
          o.children = [...el.children].slice(0, 80).map((c) => outline(c, depth + 1));
        }
        return o;
      }

      const base = new URL(pu);

      /** @type {{ href: string, rulesLength: number, rulesPreview: string, error?: string }[]} */
      const stylesheets = [];

      [...document.querySelectorAll('link[rel="stylesheet"][href]')].forEach((link) => {
        try {
          const href = new URL(link.getAttribute('href'), base).href;
          stylesheets.push({ href, rulesLength: 0, rulesPreview: '', note: 'link-only' });
        } catch {
          /* skip */
        }
      });

      [...document.styleSheets].forEach((ss) => {
        let rulesText = '';
        try {
          rulesText = [...ss.cssRules].map((r) => r.cssText).join('\n');
        } catch (e) {
          stylesheets.push({
            href: ss.href || 'opaque-cross-origin',
            rulesLength: 0,
            rulesPreview: '',
            error: String(e),
          });
          return;
        }
        const preview = rulesText.slice(0, maxChars);
        stylesheets.push({
          href: ss.href || 'inline-document',
          rulesLength: rulesText.length,
          rulesPreview: preview,
        });
      });

      /** @type {{ selector: string, props: Record<string, string> }[]} */
      const computedSamples = [];

      const propsList = [
        'display', 'position', 'width', 'max-width', 'min-width', 'height', 'margin', 'padding',
        'gap', 'flex-direction', 'justify-content', 'align-items', 'grid-template-columns',
        'font-family', 'font-size', 'font-weight', 'line-height', 'color', 'background-color',
        'border-radius', 'box-shadow', 'object-fit',
      ];

      const candidates = [
        ...document.querySelectorAll('main *'),
        ...document.querySelectorAll('header *'),
        ...document.querySelectorAll('footer *'),
      ].filter((el, i, arr) => arr.indexOf(el) === i).slice(0, maxNodes);

      candidates.forEach((el) => {
        const cs = getComputedStyle(el);
        /** @type Record<string, string> */
        const props = {};
        propsList.forEach((p) => {
          props[p] = cs.getPropertyValue(p);
        });
        let selector = el.tagName.toLowerCase();
        if (el.id) selector += `#${el.id}`;
        else if (el.classList && el.classList.length) selector += `.${[...el.classList].slice(0, 3).join('.')}`;
        computedSamples.push({ selector, props });
      });

      /** @type {{ src: string, alt: string, width: number, height: number }[]} */
      const images = [...document.querySelectorAll('img')].map((img) => {
        let src = img.currentSrc || img.src || img.getAttribute('src') || '';
        try {
          src = new URL(src, base).href;
        } catch {
          /* keep */
        }
        return {
          src,
          alt: img.getAttribute('alt') || '',
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
        };
      });

      const links = [...document.querySelectorAll('a[href]')].map((a) => ({
        href: (() => {
          try {
            return new URL(a.getAttribute('href'), base).href;
          } catch {
            return a.getAttribute('href');
          }
        })(),
        text: (a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120),
      }));

      const metaTags = [...document.querySelectorAll('meta')].map((m) => ({
        name: m.getAttribute('name') || m.getAttribute('property'),
        content: m.getAttribute('content'),
      })).filter((m) => m.name);

      const headerHtml = document.querySelector('header')?.outerHTML?.slice(0, 80000) || null;
      const footerHtml = document.querySelector('footer')?.outerHTML?.slice(0, 80000) || null;
      const mainHtml = document.querySelector('main')?.outerHTML?.slice(0, 500000) || document.body.outerHTML.slice(0, 500000);

      return {
        url: pu,
        title: document.title,
        lang: document.documentElement.getAttribute('lang'),
        metaTags,
        outline: outline(document.body, 0),
        stylesheets,
        computedSamples,
        images,
        links,
        snippets: { headerHtml, footerHtml, mainHtml },
      };
    },
    {
      pageUrl,
      MAX_STYLE_RULE_CHARS_PER_SHEET,
      OUTLINE_MAX_DEPTH,
      COMPUTED_SAMPLE_MAX_NODES,
    },
  );
}

async function main() {
  const urlArg = process.argv[2];
  const outArg = process.argv[3];
  if (!urlArg || urlArg === '-h' || urlArg === '--help') {
    console.log('Usage: node parser/capture-page.mjs <page-url> [output-dir]');
    process.exit(urlArg ? 0 : 1);
  }

  const slug = slugFromUrl(urlArg);
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
  const defaultOut = path.join(repoRoot, 'migration-work', 'parsed-pages');
  const outDir = path.resolve(process.cwd(), outArg || defaultOut);

  await fs.mkdir(outDir, { recursive: true });

  const puppeteer = await loadPuppeteer();
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(urlArg, { waitUntil: 'networkidle2', timeout: 120000 });
  await new Promise((r) => setTimeout(r, WAIT_MS));

  const viewportSnapshots = {};
  for (const w of [390, 600, 900, 1200]) {
    await page.setViewport({ width: w, height: 900, deviceScaleFactor: 1 });
    viewportSnapshots[`${w}px`] = await extractInPage(page, urlArg);
  }

  await browser.close();

  const payload = {
    parserSchemaVersion: '1.0.0',
    slug,
    capturedAt: new Date().toISOString(),
    url: urlArg,
    waitMsAfterLoad: WAIT_MS,
    viewports: viewportSnapshots,
    notes: [
      'Use tools/importer/import.js with AEM Importer (Save HTML for Document Authoring) or docx flow.',
      'Image CORS: use aem import proxy or absolute URLs; see import.js rewriteImagesThroughImporterProxy.',
      'Copyright: snippets are for migration analysis only.',
    ],
  };

  const outFile = path.join(outDir, `${slug}.json`);
  await fs.writeFile(outFile, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`Wrote ${outFile}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

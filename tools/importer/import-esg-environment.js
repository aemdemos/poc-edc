/* eslint-disable */
/* global WebImporter */

/**
 * EDC ESG Template Import Script (v3 — parser registry pattern)
 *
 * Architecture:
 * - page-templates.json defines block types and their DOM selectors
 * - parsers/ folder contains individual parser files per block type
 * - transformers/ folder contains page-wide DOM transformers
 * - This script orchestrates: cleanup → parsers → transformers → WebImporter rules
 *
 * Key principle: <div class="key-line"> elements mark section boundaries → converted to <hr>
 */

// PARSER IMPORTS
import heroParser from './parsers/hero.js';
import { parseNewsCards, parseCustomerStories, parseKpiStats, parsePoliciesReports } from './parsers/cards.js';
import accordionParser from './parsers/accordion.js';
import tabsParser from './parsers/tabs.js';
import agreementsParser from './parsers/agreements.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/esg-cleanup.js';

// PARSER REGISTRY — maps parser names to functions
const parsers = {
  'hero': heroParser,
  'news-cards': parseNewsCards,
  'customer-stories': parseCustomerStories,
  'kpi-stats': parseKpiStats,
  'policies': parsePoliciesReports,
  'accordion': accordionParser,
  'tabs': tabsParser,
  'agreements': agreementsParser,
};

// TRANSFORMER REGISTRY
const transformers = [cleanupTransformer];

// PAGE TEMPLATE CONFIGURATION (embedded from page-templates.json)
const PAGE_TEMPLATE = {
  name: 'esg-environment',
  description: 'EDC ESG information pages with hero, news cards, accordions, tabs, customer stories, KPIs, agreements, and policies.',
  blocks: [
    { name: 'hero', instances: ['.c-hero-banner', 'section[class*="hero"]', '[class*="herobanner"]'] },
    { name: 'news-cards', instances: ['.imageinbodytext'] },
    { name: 'accordion', instances: ['[role="region"]'] },
    { name: 'tabs', instances: ['[role="tablist"]'] },
    { name: 'customer-stories', instances: ['.c-card-slider', '[class*="card-listing"]'] },
    { name: 'kpi-stats', instances: ['[class*="stats"]'] },
    { name: 'agreements', instances: ['h2'] },
    { name: 'policies', instances: ['.c-product-form-card'] },
  ]
};

// ============ UTILITIES ============

function getAllViewportSrcs(element) {
  if (!element) return [];
  const makeAbsolute = (src) => {
    if (!src) return src;
    if (src.startsWith('http')) return src;
    if (src.startsWith('/')) return `${window.location.origin}${src}`;
    return src;
  };
  const picture = element.tagName === 'PICTURE' ? element : element.closest('picture');
  if (!picture) {
    const img = element.tagName === 'IMG' ? element : element.querySelector('img');
    return img ? [{ src: img.src, viewport: 'all' }] : [];
  }
  const sources = picture.querySelectorAll('source');
  const img = picture.querySelector('img');
  const variants = [];
  const seenSrcs = new Set();
  for (const source of sources) {
    const media = source.getAttribute('media') || '';
    const srcset = source.getAttribute('srcset');
    if (!srcset) continue;
    const absSrc = makeAbsolute(srcset);
    if (seenSrcs.has(absSrc)) continue;
    seenSrcs.add(absSrc);
    let viewport = 'unknown';
    if (media.includes('992')) viewport = 'desktop';
    else if (media.includes('768')) viewport = 'tablet';
    else if (media.includes('576')) viewport = 'mobile';
    variants.push({ src: absSrc, viewport });
  }
  if (img && img.src && !seenSrcs.has(img.src)) variants.push({ src: img.src, viewport: 'fallback' });
  const order = { mobile: 0, fallback: 1, tablet: 2, desktop: 3, unknown: 4 };
  variants.sort((a, b) => (order[a.viewport] ?? 4) - (order[b.viewport] ?? 4));
  return variants;
}

function getDesktopImgSrc(element) {
  if (!element) return null;
  const makeAbsolute = (src) => {
    if (!src) return src;
    if (src.startsWith('http')) return src;
    if (src.startsWith('/')) return `${window.location.origin}${src}`;
    return src;
  };
  const picture = element.tagName === 'PICTURE' ? element : element.closest('picture');
  if (picture) {
    const sources = picture.querySelectorAll('source');
    for (const source of sources) {
      if ((source.getAttribute('media') || '').includes('992')) return makeAbsolute(source.getAttribute('srcset'));
    }
    if (sources.length > 0 && sources[0].getAttribute('srcset')) return makeAbsolute(sources[0].getAttribute('srcset'));
  }
  const img = element.tagName === 'IMG' ? element : element.querySelector('img');
  return img ? img.src : null;
}

/**
 * Execute all page transformers for a specific hook
 */
function executeTransformers(hookName, element, payload) {
  const enhancedPayload = { ...payload, template: PAGE_TEMPLATE };
  transformers.forEach((transformerFn) => {
    try { transformerFn.call(null, hookName, element, enhancedPayload); }
    catch (e) { console.error(`Transformer failed at ${hookName}:`, e); }
  });
}

// ============ MAIN TRANSFORM ============

export default {
  transform: (payload) => {
    const { document, url, html, params } = payload;
    const main = document.body;

    // 1. Execute beforeTransform (cleanup, key-line → <hr>, remove chrome)
    executeTransformers('beforeTransform', main, payload);

    // 2. Collect viewport variants before parsers destroy <picture> elements
    const viewportVariants = [];
    main.querySelectorAll('picture').forEach((picture) => {
      const img = picture.querySelector('img');
      const sources = picture.querySelectorAll('source');
      if (sources.length === 0) return;
      const variants = {};
      sources.forEach((source) => {
        const media = source.getAttribute('media') || '';
        const srcset = source.getAttribute('srcset');
        if (!srcset) return;
        const absSrc = srcset.startsWith('/') ? `${window.location.origin}${srcset}` : srcset;
        if (media.includes('992')) variants.desktop = absSrc;
        else if (media.includes('768')) variants.tablet = absSrc;
        else if (media.includes('576')) variants.mobile = absSrc;
      });
      if (img && img.src) variants.fallback = img.src;
      const uniqueUrls = [...new Set(Object.values(variants))];
      if (uniqueUrls.length > 1) viewportVariants.push({ alt: img ? img.alt : '', ...variants });
    });

    // 3. Execute parsers from registry in order
    const parserContext = { document, main, url, params, getAllViewportSrcs, getDesktopImgSrc };

    // Hero
    const heroEl = main.querySelector(PAGE_TEMPLATE.blocks[0].instances.join(', '));
    if (heroEl) parsers['hero'](heroEl, parserContext);

    // News Cards
    parsers['news-cards'](null, parserContext);

    // Accordion
    parsers['accordion'](null, parserContext);

    // Tabs
    parsers['tabs'](null, parserContext);

    // Customer Stories
    parsers['customer-stories'](null, parserContext);

    // KPI Stats
    parsers['kpi-stats'](null, parserContext);

    // Agreements
    parsers['agreements'](null, parserContext);

    // Policies
    parsers['policies'](null, parserContext);

    // 4. Execute afterTransform (cleanup consecutive hrs, empty elements)
    executeTransformers('afterTransform', main, payload);

    // 5. Resolve remaining picture elements
    main.querySelectorAll('picture').forEach((picture) => {
      const img = picture.querySelector('img');
      if (!img) return;
      const desktopSrc = getDesktopImgSrc(picture);
      if (desktopSrc && desktopSrc !== img.src) img.src = desktopSrc;
    });

    // 6. Date modified
    const dateModified = document.body.getAttribute('data-date-modified');
    if (dateModified) {
      const dateHr = document.createElement('hr');
      const dateP = document.createElement('p'); dateP.textContent = dateModified;
      main.appendChild(dateHr); main.appendChild(dateP);
    }

    // 7. Apply WebImporter built-in rules
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 8. Generate sanitized path (NOT index)
    const path = WebImporter.FileUtils.sanitizePath(
      new URL(params.originalURL).pathname.replace(/\/$/, '').replace(/\.html$/, '')
    );

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        viewportVariants: viewportVariants.length > 0 ? JSON.stringify(viewportVariants) : undefined,
      },
    }];
  },
};

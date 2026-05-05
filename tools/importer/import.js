/**
 * AEM Importer / Document Authoring (da.live) transformation rules.
 * Loaded by `aem import` (Helix Importer UI) — runs in the browser with `WebImporter` global.
 *
 * Goals:
 * - Strip chrome (header/footer/nav) so content starts with real page title/main.
 * - Normalize images (absolute URLs + optional local proxy rewrite for image fetch/CORS).
 * - Inline hero-style background images where possible.
 * - Insert Metadata block (Title, Description, OG image, Template).
 * - Section breaks (`<hr>`) before major headings / native `<section>` siblings for cleaner DA sections.
 * - Tag duplicate top-level `<section>` patterns with `data-import-variant` for downstream variant naming.
 * - **edc.ca case study template (`meta name="template" content="case-study-page"`):** maps AEM wrapper
 *   classes (`.pageherobanner`, `.pullquote`, `.imageinbodytext`, …) to Edge-style block tables with variants
 *   when the same pattern repeats.
 *
 * Docs: https://www.aem.live/developer/importer
 * Guidelines: https://github.com/adobe/helix-importer-ui/blob/main/importer-guidelines.md
 *
 * @typedef {{ originalURL?: string }} ImporterParams
 */

/* global WebImporter */

/** Set true to wrap qualifying top-level regions into block tables (experimental). */
const ENABLE_AUTO_BLOCK_TABLES = false;

/** Block name used when ENABLE_AUTO_BLOCK_TABLES wraps a region. */
const GENERIC_BLOCK_NAME = 'Section';

/**
 * @param {string} originalURL
 * @returns {URL}
 */
function baseUrl(originalURL) {
  try {
    return new URL(originalURL);
  } catch {
    return new URL('https://invalid.invalid/');
  }
}

/**
 * Make img/picture/src/srcset URLs absolute so DA / docx image pipeline can fetch them.
 * @param {HTMLElement} root
 * @param {string} originalURL
 */
function absoluteMediaUrls(root, originalURL) {
  const base = baseUrl(originalURL);
  root.querySelectorAll('img[src]').forEach((img) => {
    try {
      const abs = new URL(img.getAttribute('src'), base).href;
      img.setAttribute('src', abs);
    } catch {
      /* skip */
    }
  });
  root.querySelectorAll('[srcset]').forEach((el) => {
    const ss = el.getAttribute('srcset');
    if (!ss) return;
    const parts = ss.split(',').map((s) => s.trim().split(/\s+/)[0]).filter(Boolean);
    try {
      const first = new URL(parts[0], base).href;
      if (el.tagName === 'IMG' && !el.getAttribute('src')) el.setAttribute('src', first);
    } catch {
      /* skip */
    }
  });
}

/**
 * When running under `aem import`, rewrite image URLs through the local proxy so binaries are not blocked by CORS.
 * @param {HTMLElement} root
 * @param {string} originalURL
 */
function rewriteImagesThroughImporterProxy(root, originalURL) {
  if (typeof window === 'undefined') return;
  const { hostname, port } = window.location;
  const proxyOrigin = port === '3001' || hostname === 'localhost'
    ? `${window.location.protocol}//${window.location.host}`
    : null;
  if (!proxyOrigin) return;

  const base = baseUrl(originalURL);
  root.querySelectorAll('img[src]').forEach((img) => {
    try {
      let abs = img.getAttribute('src');
      if (!abs) return;
      if (abs.startsWith('/')) abs = `${base.origin}${abs}`;
      const u = new URL(abs);
      u.searchParams.append('host', u.origin);
      img.src = `${proxyOrigin}${u.pathname}${u.search}`;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[import.js] proxy rewrite skipped', e.message);
    }
  });
}

/**
 * Replace CSS background-image with <img> children where WebImporter helper exists.
 * @param {HTMLElement} root
 * @param {Document} document
 */
function promoteBackgroundImages(root, document) {
  const candidates = root.querySelectorAll('[style*="background"], [style*="Background"]');
  candidates.forEach((el) => {
    try {
      WebImporter.DOMUtils.replaceBackgroundByImg(el, document);
    } catch {
      /* skip */
    }
  });
}

/**
 * Prefer article/main roots — edc.ca case studies use `article.article` and no `<main>`.
 * @param {Document} document
 * @returns {HTMLElement}
 */
function pickContentRoot(document) {
  return document.querySelector('main')
    || document.querySelector('[role="main"]')
    || document.querySelector('article.article')
    || document.querySelector('article')
    || document.body;
}

/**
 * Remove global chrome without stripping in-article UI (breadcrumbs) or AEM page heroes.
 * @param {Document} document
 * @param {HTMLElement} contentRoot
 */
function removeSiteChrome(document, contentRoot) {
  document.querySelectorAll('.container.articles div.header.aem-GridColumn').forEach((el) => {
    if (/skip navigation/i.test(el.textContent || '')) el.remove();
  });

  const globalChrome = [
    'footer',
    '[role="contentinfo"]',
    '.cookie-banner',
    '.cookie-consent',
    '#cookie-banner',
    '[aria-label*="cookie" i]',
    '[class*="cookie" i]',
    '[id*="onetrust" i]',
  ].join(',');
  document.querySelectorAll(globalChrome).forEach((el) => {
    if (!contentRoot.contains(el)) el.remove();
  });

  document.querySelectorAll('header, nav, [role="navigation"]').forEach((el) => {
    if (!contentRoot.contains(el)) el.remove();
  });

  contentRoot.querySelectorAll(globalChrome).forEach((el) => el.remove());
}

/**
 * Section fingerprint for variant detection (top-level sections).
 * @param {Element} el
 */
function structureFingerprint(el) {
  return [...el.children].map((c) => c.tagName.toLowerCase()).join('>');
}

/**
 * Tag duplicate `<section>` fingerprints.
 * @param {HTMLElement} contentRoot
 */
function tagDuplicateSectionVariants(contentRoot) {
  const scope = contentRoot.matches('article')
    ? contentRoot
    : contentRoot.querySelector('article') || contentRoot;
  const sections = [...scope.querySelectorAll('section')];
  const buckets = new Map();
  sections.forEach((s) => {
    const fp = structureFingerprint(s);
    if (!buckets.has(fp)) buckets.set(fp, []);
    buckets.get(fp).push(s);
  });
  buckets.forEach((list, fp) => {
    if (list.length < 2 || fp === '') return;
    list.forEach((section, idx) => {
      const cls = section.classList && section.classList.length
        ? [...section.classList].join('-').replace(/[^a-z0-9-]+/gi, '-').toLowerCase()
        : `instance-${idx + 1}`;
      section.setAttribute('data-import-variant', cls);
    });
  });
}

/**
 * Insert horizontal rules before H2 headings (not H3) for cleaner DA section splits.
 * Only splits at major structural boundaries, not within body text flow.
 * @param {HTMLElement} main
 * @param {Document} document
 */
function insertSectionBreaks(main, document) {
  const headings = [...main.querySelectorAll('h2')];
  headings.forEach((h, i) => {
    if (i === 0) return;
    if (h.closest('table')) return;
    const hr = document.createElement('hr');
    h.parentElement.insertBefore(hr, h);
  });

  const topLevel = [...main.children];
  let prev = null;
  topLevel.forEach((child) => {
    if (child.tagName !== 'SECTION') return;
    if (prev && prev.tagName === 'SECTION') {
      const hr = document.createElement('hr');
      main.insertBefore(hr, child);
    }
    prev = child;
  });
}

/**
 * Build Metadata block from common meta tags including template.
 * @param {HTMLElement} main
 * @param {Document} document
 */
function appendMetadataBlock(main, document) {
  const meta = {};
  const title = document.querySelector('title');
  if (title) meta.Title = title.textContent.replace(/[\n\t]/gm, '').trim();

  const ogDesc = document.querySelector(
    'meta[property="og:description"], meta[name="og:description"], meta[name="description"]',
  );
  if (ogDesc) meta.Description = ogDesc.getAttribute('content') || '';

  const ogImg = document.querySelector('meta[property="og:image"], meta[name="og:image"]');
  if (ogImg && ogImg.getAttribute('content')) {
    const el = document.createElement('img');
    el.src = ogImg.getAttribute('content');
    meta.Image = el;
  }

  const template = document.querySelector('meta[name="template"]');
  if (template && template.getAttribute('content')) {
    meta.Template = template.getAttribute('content');
  }

  const block = WebImporter.Blocks.getMetadataBlock(document, meta);
  main.prepend(block);
}

/**
 * Wrap element into a single-cell block table for DA / blocks pipeline (optional).
 * @param {Element} section
 * @param {Document} document
 */
function wrapAsGenericBlock(section, document) {
  const variant = section.getAttribute('data-import-variant');
  const title = variant ? `${GENERIC_BLOCK_NAME} (${variant})` : GENERIC_BLOCK_NAME;
  const cells = [[title], [section]];
  const table = WebImporter.DOMUtils.createTable(cells, document);
  return table;
}

/**
 * Experimental: wrap consecutive complex top-level sections.
 * @param {HTMLElement} main
 * @param {Document} document
 */
function maybeWrapTopLevelSections(main, document) {
  if (!ENABLE_AUTO_BLOCK_TABLES) return;
  const sections = [...main.querySelectorAll(':scope > section')];
  sections.forEach((section) => {
    const table = wrapAsGenericBlock(section, document);
    section.replaceWith(table);
  });
}

/**
 * @param {Document} document
 * @param {string} originalURL
 */
function shouldApplyEdcCaseStudyMapping(document, originalURL) {
  const tmpl = document.querySelector('meta[name="template"]')?.getAttribute('content');
  if (tmpl === 'case-study-page') return true;
  try {
    const { hostname } = new URL(originalURL);
    return hostname === 'www.edc.ca' || hostname.endsWith('.edc.ca');
  } catch {
    return false;
  }
}

/**
 * @param {Document} document
 * @param {Element} sourceEl
 * @param {string} blockName
 * @param {string | null} variant
 */
function wrapAemComponentAsBlock(document, sourceEl, blockName, variant) {
  const title = variant ? `${blockName} (${variant})` : blockName;
  const inner = document.createElement('div');
  while (sourceEl.firstChild) inner.append(sourceEl.firstChild);
  const table = WebImporter.DOMUtils.createTable([[title], [inner]], document);
  sourceEl.replaceWith(table);
}

/**
 * Normalize pullquote attribution into a clean paragraph.
 * Handles EDC's structure: author name + dashes/commas in nested spans.
 * @param {Element} blockquoteEl
 * @param {Document} document
 */
function normalizePullquoteAttribution(blockquoteEl, document) {
  const quoteHeading = blockquoteEl.querySelector('h3');
  const authorContainer = blockquoteEl.querySelector('div:not(:first-child), .author, .meta-info');
  if (!quoteHeading || !authorContainer) return;

  const textParts = [];
  const walkText = (node) => {
    if (node.nodeType === 3) {
      const t = node.textContent.trim();
      if (t && t !== ',' && t !== '—' && t !== '-') textParts.push(t);
    } else if (node.nodeType === 1) {
      if (node.tagName === 'STRONG' || node.tagName === 'B') {
        const t = node.textContent.trim();
        if (t === '—' || t === '-') return;
      }
      [...node.childNodes].forEach(walkText);
    }
  };
  walkText(authorContainer);

  if (textParts.length > 0) {
    const attribution = document.createElement('p');
    attribution.textContent = `— ${textParts.join(', ')}`;
    authorContainer.replaceWith(attribution);
  }
}

/**
 * Handles the "Succeed with EDC" CTA section as a block.
 * @param {Document} document
 * @param {HTMLElement} article
 */
function wrapSucceedCtaBlock(document, article) {
  const textDivs = [...article.querySelectorAll('.cmp-text')];
  const ctaDiv = textDivs.find((el) => {
    const h2 = el.querySelector('h2');
    return h2 && /succeed with edc/i.test(h2.textContent);
  });
  if (!ctaDiv) return;

  const wrapper = ctaDiv.closest('.text.aem-GridColumn') || ctaDiv;
  wrapAemComponentAsBlock(document, wrapper, 'Columns', 'cta');
}

/**
 * Handle .modifieddate regardless of whether it's inside or outside the article.
 * Moves it into the content root and wraps as a block.
 * @param {Document} document
 * @param {HTMLElement} contentRoot
 */
function handleModifiedDate(document, contentRoot) {
  const modDate = document.querySelector('.modifieddate');
  if (!modDate) return;

  if (!contentRoot.contains(modDate)) {
    contentRoot.append(modDate);
  }
  wrapAemComponentAsBlock(document, modDate, 'Columns', 'date-modified');
}

/**
 * @param {Document} document
 * @param {HTMLElement} contentRoot
 * @param {string} originalURL
 */
function applyEdcCaseStudyPageBlocks(document, contentRoot, originalURL) {
  if (!shouldApplyEdcCaseStudyMapping(document, originalURL)) return;

  const article = contentRoot.matches('article')
    ? contentRoot
    : contentRoot.querySelector('article.article') || contentRoot.querySelector('article');
  if (!article) return;

  // Remove mobile duplicate sidebar and feedback widgets
  article.querySelectorAll('.articlerightcontainer.for-mobile').forEach((el) => el.remove());
  article.querySelectorAll('.pagelevelfeedback').forEach((el) => el.remove());

  // Remove stray inline stylesheet links from within content
  article.querySelectorAll('link[rel="stylesheet"]').forEach((el) => el.remove());

  // Remove empty .sectiontitle elements (purely decorative CSS dividers)
  article.querySelectorAll('.sectiontitle').forEach((el) => {
    const text = el.textContent.replace(/\s+/g, '').trim();
    if (!text) el.remove();
  });

  const scoped = (sel) => [...article.querySelectorAll(sel)];

  // Hero
  scoped('.pageherobanner').slice(0, 1).forEach((el) => {
    wrapAemComponentAsBlock(document, el, 'Hero', 'case-study');
  });

  // Breadcrumbs
  scoped('.breadcrumb-wrapper').forEach((el) => {
    wrapAemComponentAsBlock(document, el, 'Breadcrumbs', null);
  });

  // Company at a glance — contains nested .c-pdf-download, split into two blocks
  scoped('.companyataglance').forEach((el) => {
    const pdfSection = el.querySelector('.c-pdf-download');
    if (pdfSection) {
      const pdfWrapper = document.createElement('div');
      pdfWrapper.append(pdfSection);
      const pdfTable = WebImporter.DOMUtils.createTable(
        [['Cards (pdf-download)'], [pdfWrapper]],
        document,
      );
      el.parentElement.insertBefore(pdfTable, el);
    }
    wrapAemComponentAsBlock(document, el, 'Cards', 'company-at-a-glance');
  });

  // Standalone .pdfdownload (only if not already handled inside companyataglance)
  scoped('.pdfdownload').forEach((el) => {
    if (!el.closest('table')) {
      wrapAemComponentAsBlock(document, el, 'Cards', 'pdf-download');
    }
  });

  // Pullquotes — normalize attribution before wrapping
  const pullquotes = scoped('.pullquote');
  pullquotes.forEach((el, i) => {
    const bq = el.querySelector('blockquote');
    if (bq) normalizePullquoteAttribution(bq, document);
    const variant = pullquotes.length > 1 ? `pullquote-${i + 1}` : 'pullquote';
    wrapAemComponentAsBlock(document, el, 'Quote', variant);
  });

  // Remaining non-empty section titles (if any survived the empty check)
  const sectionTitles = scoped('.sectiontitle');
  sectionTitles.forEach((el, i) => {
    const variant = sectionTitles.length > 1 ? `section-heading-${i + 1}` : 'section-heading';
    wrapAemComponentAsBlock(document, el, 'Columns', variant);
  });

  // Images in body text
  const imageBlocks = scoped('.imageinbodytext');
  imageBlocks.forEach((el, i) => {
    const variant = imageBlocks.length > 1 ? `media-${i + 1}` : 'media';
    wrapAemComponentAsBlock(document, el, 'Columns', variant);
  });

  // EDC services / recommended articles list
  const lists = scoped('.list');
  lists.forEach((el, i) => {
    const variant = lists.length > 1 ? `edc-list-${i + 1}` : 'edc-services';
    wrapAemComponentAsBlock(document, el, 'Cards', variant);
  });

  // "Succeed with EDC" CTA
  wrapSucceedCtaBlock(document, article);

  // Modified date — query from document level (it's outside the article)
  handleModifiedDate(document, contentRoot);
}

export default {
  /**
   * @param {{ document: Document, url: string, html: string, params: ImporterParams }} ctx
   */
  preprocess: ({ params }) => {
    const p = params;
    if (!p.originalURL && typeof window !== 'undefined' && window.location?.href) {
      p.originalURL = window.location.href;
    }
  },

  /**
   * @param {{ document: Document, url: string, html: string, params: ImporterParams }} ctx
   */
  transformDOM: ({ document, url, params }) => {
    const originalURL = params.originalURL || url;

    const contentRoot = pickContentRoot(document);

    removeSiteChrome(document, contentRoot);
    absoluteMediaUrls(contentRoot, originalURL);
    promoteBackgroundImages(contentRoot, document);
    rewriteImagesThroughImporterProxy(contentRoot, originalURL);

    applyEdcCaseStudyPageBlocks(document, contentRoot, originalURL);

    appendMetadataBlock(contentRoot, document);
    tagDuplicateSectionVariants(contentRoot);
    insertSectionBreaks(contentRoot, document);
    maybeWrapTopLevelSections(contentRoot, document);

    WebImporter.DOMUtils.remove(contentRoot, [
      'script',
      'noscript',
      'link[rel="stylesheet"]',
      'iframe[src*="googletagmanager"]',
      '.hidden',
      '[aria-hidden="true"][style*="display: none"]',
    ]);

    return contentRoot;
  },

  /**
   * @param {{ document: Document, url: string, html: string, params: ImporterParams }} ctx
   */
  generateDocumentPath: ({ url, params }) => {
    const originalURL = params.originalURL || url;
    let pathname = '/';
    try {
      pathname = new URL(originalURL).pathname.replace(/\/$/, '').replace(/\.html?$/i, '') || '/';
    } catch {
      pathname = '/';
    }
    return WebImporter.FileUtils.sanitizePath(pathname);
  },
};

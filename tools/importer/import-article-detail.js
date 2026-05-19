/* eslint-disable */
/* global WebImporter */

/**
 * EDC Article Detail Template Import Script
 *
 * Architecture:
 * - parsers/ folder contains individual parser files per block type
 * - transformers/ folder contains page-wide DOM transformers
 * - This script orchestrates: cleanup → parsers → section breaks → WebImporter rules
 */

// PARSER IMPORTS
import heroParser from './parsers/hero.js';
import articleBodyParser from './parsers/article-body.js';
import recommendedArticlesParser from './parsers/recommended-articles.js';
import metadataParser from './parsers/metadata.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/cleanup.js';

// TRANSFORMER REGISTRY
const transformers = [cleanupTransformer];

// PAGE TEMPLATE CONFIGURATION
const PAGE_TEMPLATE = {
  name: 'article-detail',
  description: 'Article detail pages featuring company export stories and insights',
  blocks: [
    { name: 'hero', selector: '.articlehero' },
    { name: 'article-body', selector: '.articlebodycontainer .cmp-text' },
    { name: 'recommended-articles', selector: '.c-recommended-articles' },
  ],
};

// ============ UTILITIES ============

function makeAbsolute(src) {
  if (!src) return src;
  if (src.startsWith('http')) return src;
  if (src.startsWith('/')) return `${window.location.origin}${src}`;
  return src;
}

function getDesktopImgSrc(element) {
  if (!element) return null;
  const picture = element.tagName === 'PICTURE' ? element : (element.closest ? element.closest('picture') : null);
  if (picture) {
    const sources = picture.querySelectorAll('source');
    for (const source of sources) {
      if ((source.getAttribute('media') || '').includes('992')) {
        return makeAbsolute(source.getAttribute('srcset') || source.getAttribute('srcSet'));
      }
    }
    if (sources.length > 0) {
      return makeAbsolute(sources[0].getAttribute('srcset') || sources[0].getAttribute('srcSet'));
    }
  }
  const img = element.tagName === 'IMG' ? element : element.querySelector('img');
  return img ? makeAbsolute(img.getAttribute('src') || img.src) : null;
}

function getMobileImgSrc(element) {
  if (!element) return null;
  const picture = element.tagName === 'PICTURE' ? element : (element.closest ? element.closest('picture') : null);
  if (picture) {
    const sources = picture.querySelectorAll('source');
    for (const source of sources) {
      if ((source.getAttribute('media') || '').includes('576')) {
        return makeAbsolute(source.getAttribute('srcset') || source.getAttribute('srcSet'));
      }
    }
    // Fallback to img src (typically mobile)
    const img = picture.querySelector('img');
    if (img) return makeAbsolute(img.getAttribute('src') || img.src);
  }
  const img = element.tagName === 'IMG' ? element : element.querySelector('img');
  return img ? makeAbsolute(img.getAttribute('src') || img.src) : null;
}

function executeTransformers(hookName, element, payload) {
  const enhancedPayload = { ...payload, template: PAGE_TEMPLATE };
  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

// ============ MAIN TRANSFORM ============

export default {
  transform: (payload) => {
    const { document, url, html, params } = payload;
    const body = document.body;

    // 1. Execute beforeTransform (cleanup, remove chrome)
    executeTransformers('beforeTransform', body, payload);

    // 2. Build output into a clean main element
    const main = document.createElement('div');
    const parserContext = { document, main, url, params, getDesktopImgSrc, getMobileImgSrc };

    // 3. Hero block
    const heroEl = body.querySelector(PAGE_TEMPLATE.blocks[0].selector);
    if (heroEl) {
      const heroParent = heroEl.parentElement;
      heroParser(heroEl, parserContext);
      // heroParser calls replaceWith — table is now where heroEl was
      const heroTable = heroParent?.querySelector('table') || body.querySelector('table');
      if (heroTable) main.appendChild(heroTable);
    }

    // Section break after hero
    main.appendChild(document.createElement('hr'));

    // 4. Article date
    const timeEl = body.querySelector('time.c-tidvi, time');
    if (timeEl) {
      const datePara = document.createElement('p');
      const dateEm = document.createElement('em');
      dateEm.textContent = timeEl.textContent.trim();
      datePara.appendChild(dateEm);
      main.appendChild(datePara);
    }

    // 5. Article body
    const bodyEl = body.querySelector(PAGE_TEMPLATE.blocks[1].selector);
    if (bodyEl) {
      articleBodyParser(bodyEl, parserContext);
      // After parser, content elements are promoted to parent — collect them
      const articleContainer = body.querySelector('.articlebodycontainer') || body.querySelector('.article-body');
      if (articleContainer) {
        const contentEls = articleContainer.querySelectorAll('p, h1, h2, h3, h4, h5, h6, ul, ol, blockquote, picture, img');
        contentEls.forEach((el) => main.appendChild(el));
      }
    }

    // Section break before recommended articles
    main.appendChild(document.createElement('hr'));

    // 6. Recommended articles placeholder
    const recEl = body.querySelector(PAGE_TEMPLATE.blocks[2].selector);
    if (recEl) {
      const recParent = recEl.parentElement;
      recommendedArticlesParser(recEl, parserContext);
      const recTable = recParent?.querySelector('table') || body.querySelector('table');
      if (recTable) main.appendChild(recTable);
    }

    // 7. Execute afterTransform
    executeTransformers('afterTransform', main, payload);

    // 8. Resolve remaining images to desktop quality
    main.querySelectorAll('img').forEach((img) => {
      const picture = img.closest ? img.closest('picture') : null;
      if (picture) {
        const desktopSrc = getDesktopImgSrc(picture);
        if (desktopSrc) img.setAttribute('src', desktopSrc);
      }
    });

    // 9. Section break before metadata
    main.appendChild(document.createElement('hr'));

    // 10. Metadata
    metadataParser(null, parserContext);

    // 11. Apply WebImporter built-in rules
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 12. Generate sanitized path
    const pagePath = WebImporter.FileUtils.sanitizePath(
      new URL(params.originalURL).pathname.replace(/\/$/, '').replace(/\.html$/, ''),
    );

    return [{
      element: main,
      path: pagePath,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
      },
    }];
  },
};

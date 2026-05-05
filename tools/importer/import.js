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
      if (!abs || abs.startsWith('data:') || abs.startsWith('blob:')) return;
      if (abs.startsWith('/')) abs = `${base.origin}${abs}`;
      const u = new URL(abs);
      if (!u.protocol.startsWith('http')) return;
      u.searchParams.append('host', u.origin);
      img.setAttribute('src', `${proxyOrigin}${u.pathname}${u.search}`);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[import.js] proxy rewrite skipped', e.message);
    }
  });

  // Clean up any links/anchors with malformed href that could break decodeURI
  root.querySelectorAll('a[href]').forEach((a) => {
    try {
      const href = a.getAttribute('href');
      if (href) decodeURI(href);
    } catch {
      a.setAttribute('href', encodeURI(a.getAttribute('href')));
    }
  });
}

/**
 * Replace CSS background-image with <img> children where WebImporter helper exists.
 * Skips gradient-only backgrounds that would produce invalid img src values.
 * @param {HTMLElement} root
 * @param {Document} document
 */
function promoteBackgroundImages(root, document) {
  const candidates = root.querySelectorAll('[style*="background-image"], [style*="Background-image"]');
  candidates.forEach((el) => {
    const style = el.getAttribute('style') || '';
    if (!style.includes('url(')) return;
    if (/background[^:]*:\s*(linear|radial|conic)-gradient/i.test(style)) return;
    try {
      WebImporter.DOMUtils.replaceBackgroundByImg(el, document);
    } catch {
      /* skip */
    }
  });
}

/**
 * Prefer article/main roots — edc.ca case studies use `article.article` and no `<main>`.
 * Only use main/[role="main"] if it actually contains content (some sites use empty landmarks).
 * @param {Document} document
 * @returns {HTMLElement}
 */
function pickContentRoot(document) {
  const main = document.querySelector('main');
  if (main && main.children.length > 0) return main;

  const roleMain = document.querySelector('[role="main"]');
  if (roleMain && roleMain.children.length > 0) return roleMain;

  return document.querySelector('article.article')
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
    '#onetrust-consent-sdk',
    '[aria-label*="cookie" i]',
    '[class*="cookie" i]',
    '[id*="onetrust" i]',
    '[class*="recaptcha" i]',
    '.skip-to-content',
    '#skip-to-main-content',
  ].join(',');
  // Remove all chrome from document regardless of position
  document.querySelectorAll(globalChrome).forEach((el) => el.remove());

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
 * Insert horizontal rules between block tables and between major content sections.
 * Each block table should be in its own section for proper EDS rendering.
 * @param {HTMLElement} main
 * @param {Document} document
 */
function insertSectionBreaks(main, document) {
  const topChildren = [...main.children];
  for (let i = 1; i < topChildren.length; i += 1) {
    const curr = topChildren[i];
    const prev = topChildren[i - 1];
    if (prev.tagName === 'HR') continue;

    const prevIsTable = prev.tagName === 'TABLE';
    const currIsTable = curr.tagName === 'TABLE';
    const currIsH2 = curr.tagName === 'H2';

    if (prevIsTable || currIsTable || currIsH2) {
      const hr = document.createElement('hr');
      main.insertBefore(hr, curr);
      i += 1;
    }
  }
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
  main.append(block);
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
 * Extract quote text and attribution from EDC's pullquote structure.
 * Returns { quoteText, attributionText } for building the 2-row Quote block table.
 * @param {Element} blockquoteEl
 */
function extractPullquoteContent(blockquoteEl) {
  const quoteHeading = blockquoteEl.querySelector('h3');
  const quoteText = quoteHeading ? quoteHeading.textContent.trim() : '';

  const authorContainer = blockquoteEl.querySelector('div:not(:first-child), .author, .meta-info');
  const textParts = [];
  if (authorContainer) {
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
  }

  return { quoteText, attributionText: textParts.join(', ') };
}

/**
 * Handles the "Succeed with EDC" CTA section as a block.
 * @param {Document} document
 * @param {HTMLElement} article
 */
/**
 * "Succeed with EDC" is just default content (H2 + paragraphs) — no special block needed.
 * Just ensure it's cleanly extracted from AEM wrapper divs.
 */
function cleanSucceedCtaSection(document, article) {
  // No-op: content flows naturally as default content after chrome removal
}

/**
 * Handle .modifieddate — extract as simple text paragraph.
 * @param {Document} document
 * @param {HTMLElement} contentRoot
 */
function handleModifiedDate(document, contentRoot) {
  const modDate = document.querySelector('.modifieddate');
  if (!modDate) return;

  const dateText = modDate.textContent.trim();
  const p = document.createElement('p');
  p.textContent = dateText;

  if (!contentRoot.contains(modDate)) {
    contentRoot.append(p);
  } else {
    modDate.replaceWith(p);
  }
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

  // Breadcrumbs — remove (handled by navigation, not a content block)
  scoped('.breadcrumb-wrapper').forEach((el) => el.remove());

  // Build Columns (case-study-layout) — body content left, sidebar right
  const companyEls = scoped('.companyataglance');
  const bodyContainer = article.querySelector('.articlebodycontainer');
  if (companyEls.length > 0 && bodyContainer) {
    const sidebarEl = companyEls[0];

    // Build sidebar content (right column)
    const sidebarCell = document.createElement('div');

    // PDF download
    const pdfSection = sidebarEl.querySelector('.c-pdf-download');
    if (pdfSection) {
      const pdfTitle = pdfSection.querySelector('.download-title');
      const pdfLink = pdfSection.querySelector('.download-link');
      if (pdfTitle) {
        const h4 = document.createElement('h4');
        h4.textContent = pdfTitle.textContent.trim();
        sidebarCell.append(h4);
      }
      if (pdfLink) {
        const p = document.createElement('p');
        const a = document.createElement('a');
        a.href = pdfLink.getAttribute('href') || '';
        a.textContent = pdfLink.textContent.trim();
        p.append(a);
        sidebarCell.append(p);
      }
    }

    // Company profile
    const companyName = sidebarEl.querySelector('.company-name');
    const profileH4 = document.createElement('h4');
    profileH4.textContent = 'Company profile';
    sidebarCell.append(profileH4);
    if (companyName) {
      const nameH4 = document.createElement('h4');
      nameH4.textContent = companyName.textContent.trim();
      sidebarCell.append(nameH4);
    }
    const items = sidebarEl.querySelectorAll('.item');
    items.forEach((item) => {
      const label = item.querySelector('.label, h4');
      const value = item.querySelector('.text, p');
      const p = document.createElement('p');
      const strong = document.createElement('strong');
      strong.textContent = `${label ? label.textContent.trim() : ''}:`;
      p.append(strong, ` ${value ? value.textContent.trim() : ''}`);
      sidebarCell.append(p);
    });

    // Build body content (left column) — first text blocks up to the pullquote
    const bodyCell = document.createElement('div');
    const bodyTexts = bodyContainer.querySelectorAll('.text.aem-GridColumn');
    const firstImage = bodyContainer.querySelector('.imageinbodytext img');
    bodyTexts.forEach((textDiv) => {
      const cmpText = textDiv.querySelector('.cmp-text');
      if (cmpText && !cmpText.textContent.includes('Succeed with EDC')) {
        [...cmpText.children].forEach((child) => bodyCell.append(child.cloneNode(true)));
      }
    });
    if (firstImage) {
      const p = document.createElement('p');
      p.append(firstImage.cloneNode(true));
      bodyCell.append(p);
    }

    // Create Columns table
    const columnsTable = WebImporter.DOMUtils.createTable(
      [['Columns (case-study-layout)'], [bodyCell, sidebarCell]],
      document,
    );

    // Replace the sidebar + body containers with the columns table
    sidebarEl.closest('.articlerightcontainer')?.remove();
    const bodyParent = bodyContainer.parentElement;
    bodyContainer.remove();
    if (bodyParent) bodyParent.prepend(columnsTable);
    else article.append(columnsTable);

    // Remove remaining duplicates
    companyEls.slice(1).forEach((dup) => dup.remove());
  }

  // Remove standalone .pdfdownload wrappers
  scoped('.pdfdownload').forEach((el) => {
    if (!el.closest('table')) el.remove();
  });

  // Pullquotes — build 2-row table (row1=quote, row2=attribution) matching Quote block structure
  const pullquotes = scoped('.pullquote');
  pullquotes.forEach((el, i) => {
    const bq = el.querySelector('blockquote');
    const { quoteText, attributionText } = bq
      ? extractPullquoteContent(bq)
      : { quoteText: el.textContent.trim(), attributionText: '' };

    const variant = pullquotes.length > 1 ? `pullquote-${i + 1}` : 'pullquote';
    const title = `Quote (${variant})`;

    const quoteCell = document.createElement('p');
    quoteCell.textContent = quoteText;

    const attrCell = document.createElement('p');
    if (attributionText) {
      const em = document.createElement('em');
      em.textContent = attributionText;
      attrCell.append(attributionText.split(',')[0], ', ', em);
      attrCell.textContent = '';
      const [name, ...rest] = attributionText.split(', ');
      attrCell.textContent = name;
      if (rest.length) {
        attrCell.textContent += ', ';
        const emEl = document.createElement('em');
        emEl.textContent = rest.join(', ');
        attrCell.append(emEl);
      }
    }

    const table = WebImporter.DOMUtils.createTable(
      [[title], [quoteCell], [attrCell]],
      document,
    );
    el.replaceWith(table);
  });

  // Remove any remaining section title decorative elements
  scoped('.sectiontitle').forEach((el) => el.remove());

  // Images in body text — unwrap from AEM container, keep as inline images (default content)
  scoped('.imageinbodytext').forEach((el) => {
    const img = el.querySelector('img');
    if (img) {
      const p = document.createElement('p');
      p.append(img);
      el.replaceWith(p);
    } else {
      el.remove();
    }
  });

  // EDC services / recommended articles — build Cards with image|text rows
  scoped('.list').forEach((el) => {
    const articles = el.querySelectorAll('.recommended-article-content, .ra-premium');
    const rows = [['Cards (edc-services)']];
    if (articles.length > 0) {
      articles.forEach((art) => {
        const img = art.closest('.recommended-article-premium, .recommended-articles-premium-wrapper')?.querySelector('img');
        const link = art.querySelector('a');
        const desc = art.querySelector('p, .description-text');
        const imgCell = document.createElement('div');
        if (img) imgCell.append(img.cloneNode(true));
        const textCell = document.createElement('div');
        if (link) {
          const h4 = document.createElement('h4');
          const a = document.createElement('a');
          a.href = link.getAttribute('href') || '';
          a.textContent = link.textContent.trim();
          h4.append(a);
          textCell.append(h4);
        }
        if (desc) {
          const p = document.createElement('p');
          p.textContent = desc.textContent.trim();
          textCell.append(p);
        }
        rows.push([imgCell, textCell]);
      });
    } else {
      const inner = document.createElement('div');
      while (el.firstChild) inner.append(el.firstChild);
      rows.push([inner]);
    }
    const table = WebImporter.DOMUtils.createTable(rows, document);
    el.replaceWith(table);
  });

  // "Succeed with EDC" — kept as default content (H2 + paragraphs)
  cleanSucceedCtaSection(document, article);

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
      'iframe',
      '.hidden',
      '[aria-hidden="true"][style*="display: none"]',
    ]);

    // Sanitize all URLs to prevent URIError: URI malformed in downstream markdown generation
    contentRoot.querySelectorAll('a[href]').forEach((a) => {
      try {
        decodeURI(a.getAttribute('href'));
      } catch {
        try {
          a.setAttribute('href', encodeURI(decodeURIComponent(a.getAttribute('href'))));
        } catch {
          a.setAttribute('href', a.getAttribute('href').replace(/%(?![0-9A-Fa-f]{2})/g, '%25'));
        }
      }
    });
    contentRoot.querySelectorAll('img[src]').forEach((img) => {
      try {
        decodeURI(img.getAttribute('src'));
      } catch {
        try {
          img.setAttribute('src', encodeURI(decodeURIComponent(img.getAttribute('src'))));
        } catch {
          img.setAttribute('src', img.getAttribute('src').replace(/%(?![0-9A-Fa-f]{2})/g, '%25'));
        }
      }
    });

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

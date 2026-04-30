/* eslint-disable */
/* global WebImporter */

/**
 * EDC Annual Report Performance Page Import Script
 *
 * Strategy: Rather than fighting the complex responsive grid classes,
 * we extract content semantically by finding unique content items
 * and deduplicating based on text content similarity.
 */

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/cleanup.js';

/**
 * Execute transformers for a specific hook
 */
function executeTransformers(hookName, element, payload) {
  [cleanupTransformer].forEach((fn) => {
    try {
      fn(hookName, element, payload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

/**
 * Create a WebImporter block table
 */
function createBlock(document, blockName, rows) {
  const cells = [[blockName], ...rows];
  return WebImporter.DOMUtils.createTable(cells, document);
}

/**
 * Get ALL viewport image sources from a picture element.
 * Returns an array of { src, viewport } objects for each unique source.
 */
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

  // Add fallback img src if it's different from all sources
  if (img && img.src && !seenSrcs.has(img.src)) {
    variants.push({ src: img.src, viewport: 'fallback' });
  }

  // Sort: mobile → tablet → desktop (smallest first)
  const order = { mobile: 0, fallback: 1, tablet: 2, desktop: 3, unknown: 4 };
  variants.sort((a, b) => (order[a.viewport] ?? 4) - (order[b.viewport] ?? 4));

  return variants;
}

/**
 * Get the best (desktop) image src from a picture element or img.
 * Prefers the largest breakpoint source (min-width: 992px), falls back to img src.
 * Always returns an absolute URL.
 */
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
      const media = source.getAttribute('media') || '';
      if (media.includes('992')) {
        return makeAbsolute(source.getAttribute('srcset'));
      }
    }
    // Fall back to first source if no 992px match
    if (sources.length > 0 && sources[0].getAttribute('srcset')) {
      return makeAbsolute(sources[0].getAttribute('srcset'));
    }
  }

  // Fall back to img src
  const img = element.tagName === 'IMG' ? element : element.querySelector('img');
  return img ? img.src : null;
}

/**
 * Extract sticky nav bar below hero (report title + Download Report CTA).
 * This becomes its own section with the title and a button link.
 */
function extractStickyNav(document, main) {
  const stickyNav = main.querySelector('section.c-sticky-nav-wrapper') || main.querySelector('.stickynav section');
  if (!stickyNav) return;

  const titleSpan = stickyNav.querySelector('.hidden-xs, .phone span');
  const ctaLink = stickyNav.querySelector('a.button, a.c-interaction-button');

  const div = document.createElement('div');

  if (titleSpan) {
    const p = document.createElement('p');
    p.textContent = titleSpan.textContent.trim();
    div.appendChild(p);
  }

  if (ctaLink) {
    const p = document.createElement('p');
    const strong = document.createElement('strong');
    const a = document.createElement('a');
    a.href = ctaLink.href;
    a.textContent = ctaLink.textContent.trim();
    strong.appendChild(a);
    p.appendChild(strong);
    div.appendChild(p);
  }

  // Replace the stickynav container with our clean content + section break after it
  const hr = document.createElement('hr');
  const stickyContainer = stickyNav.closest('.stickynav') || stickyNav;
  stickyContainer.replaceWith(div, hr);
}

/**
 * Extract hero banner content
 * Includes all viewport image variants (desktop, tablet, mobile) in the block.
 */
function extractHero(document, main) {
  const heroSection = main.querySelector('section.c-hero-banner');
  if (!heroSection) return;

  const heading = heroSection.querySelector('h1');
  const description = heroSection.querySelector('.content p');
  const picture = heroSection.querySelector('.img-wrapper picture, picture');
  const img = heroSection.querySelector('.img-wrapper img, picture img');

  const cell = document.createElement('div');

  if (picture || img) {
    const allSrcs = getAllViewportSrcs(picture || img);
    const alt = img ? img.alt || '' : '';

    if (allSrcs.length > 1) {
      // Multiple viewport variants — include all as separate images
      allSrcs.forEach(({ src }) => {
        const newImg = document.createElement('img');
        newImg.src = src;
        newImg.alt = alt;
        cell.appendChild(newImg);
      });
    } else {
      // Single image — just use it directly
      const newImg = document.createElement('img');
      newImg.src = allSrcs.length > 0 ? allSrcs[0].src : (img ? img.src : '');
      newImg.alt = alt;
      cell.appendChild(newImg);
    }
  }

  if (heading) {
    const h1 = document.createElement('h1');
    h1.textContent = heading.textContent.trim();
    cell.appendChild(h1);
  }

  if (description) {
    const p = document.createElement('p');
    p.textContent = description.textContent.trim();
    cell.appendChild(p);
  }

  const table = createBlock(document, 'Hero', [[cell]]);
  heroSection.replaceWith(table);
}

/**
 * Extract KPI stat cards (the 3 small items with icons at top of page).
 * These are in 4-column grid cells with image-body-text.default class.
 */
function extractKpiCards(document, main) {
  const kpiSections = main.querySelectorAll('.imageinbodytext');
  const kpiCards = [];
  const kpiElements = [];

  kpiSections.forEach((el) => {
    // KPI cards are in 4-column grid
    if (!el.className.includes('default--4')) return;

    const section = el.querySelector('section.image-body-text');
    if (!section) return;

    const picture = section.querySelector('.content-image picture');
    const img = section.querySelector('.content-image img');
    const textDiv = section.querySelector('.text-after-image');
    if (!textDiv) return;

    const heading = textDiv.querySelector('h2');
    const desc = textDiv.querySelector('p');
    if (!heading) return;

    const imageCell = document.createElement('div');
    if (picture || img) {
      const newImg = document.createElement('img');
      newImg.src = getDesktopImgSrc(picture || img) || (img ? img.src : '');
      newImg.alt = img ? img.alt || '' : '';
      imageCell.appendChild(newImg);
    }

    const textCell = document.createElement('div');
    const h2 = document.createElement('h2');
    h2.textContent = heading.textContent.trim();
    textCell.appendChild(h2);

    if (desc) {
      const p = document.createElement('p');
      p.textContent = desc.textContent.trim();
      textCell.appendChild(p);
    }

    kpiCards.push([imageCell, textCell]);
    kpiElements.push(el);
  });

  if (kpiCards.length === 0) return;

  // Create a single Cards block with all KPI items
  const table = createBlock(document, 'Cards', kpiCards);

  // Replace the first KPI element with the table, remove the rest
  kpiElements[0].replaceWith(table);
  for (let i = 1; i < kpiElements.length; i++) {
    kpiElements[i].remove();
  }
}

/**
 * Extract content blocks (image + text pairs in 6-column grid).
 * Deduplicates by tracking which heading text we've already seen.
 */
function extractContentColumns(document, main) {
  const seenHeadings = new Set();

  // Collect all image+text pairs
  // Strategy: find all .cmp-text blocks with h2 headings that are in 6-column containers,
  // then find their paired images.
  const textBlocks = main.querySelectorAll('.text .cmp-text');
  const processedPairs = [];

  textBlocks.forEach((cmpText) => {
    const heading = cmpText.querySelector('h2');
    if (!heading) return;

    const headingText = heading.textContent.trim();
    if (!headingText) return;

    // Skip if we already processed this heading (deduplication)
    if (seenHeadings.has(headingText)) return;

    const parentText = cmpText.closest('.text');
    if (!parentText) return;

    // Only process 6-column layout items (not the full-width text blocks)
    if (!parentText.className.includes('default--6') && !parentText.className.includes('default--newline')) return;

    seenHeadings.add(headingText);

    // Find paired image - look at adjacent siblings
    let imageEl = null;
    let imageSrc = null;
    let imageAlt = '';

    // Look before and after for an imageinbodytext sibling
    let sibling = parentText.previousElementSibling;
    while (sibling) {
      if (sibling.classList.contains('imageinbodytext') && sibling.className.includes('default--6')) {
        const picture = sibling.querySelector('picture');
        const img = sibling.querySelector('img');
        if (img && img.alt !== 'replace') {
          imageSrc = getDesktopImgSrc(picture || img) || img.src;
          imageAlt = img.alt || '';
          imageEl = sibling;
          break;
        }
      }
      if (sibling.classList.contains('c-keyline') || sibling.classList.contains('text')) break;
      sibling = sibling.previousElementSibling;
    }

    if (!imageSrc) {
      sibling = parentText.nextElementSibling;
      while (sibling) {
        if (sibling.classList.contains('imageinbodytext') && (sibling.className.includes('default--6') || sibling.className.includes('default--newline'))) {
          const picture = sibling.querySelector('picture');
          const img = sibling.querySelector('img');
          if (img && img.alt !== 'replace') {
            imageSrc = getDesktopImgSrc(picture || img) || img.src;
            imageAlt = img.alt || '';
            imageEl = sibling;
            break;
          }
        }
        if (sibling.classList.contains('text') && sibling.querySelector('h2')) break;
        sibling = sibling.nextElementSibling;
      }
    }

    // Build text cell
    const textCell = document.createElement('div');
    const h2 = document.createElement('h2');
    h2.textContent = headingText;
    textCell.appendChild(h2);

    cmpText.querySelectorAll('p').forEach((p) => {
      const text = p.textContent.trim();
      if (!text || text === ' ') return;

      const newP = document.createElement('p');
      const link = p.querySelector('a');
      if (link) {
        if (p.childNodes.length === 1 || p.textContent.trim() === link.textContent.trim()) {
          const a = document.createElement('a');
          a.href = link.href;
          a.textContent = link.textContent.trim();
          if (link.title) a.title = link.title;
          newP.appendChild(a);
        } else {
          // Mixed content - reconstruct
          [...p.childNodes].forEach((node) => {
            if (node.nodeType === 3) {
              newP.appendChild(document.createTextNode(node.textContent));
            } else if (node.tagName === 'A') {
              const a = document.createElement('a');
              a.href = node.href;
              a.textContent = node.textContent;
              if (node.title) a.title = node.title;
              newP.appendChild(a);
            } else if (node.tagName === 'SPAN') {
              newP.appendChild(document.createTextNode(node.textContent));
            }
          });
        }
      } else {
        newP.textContent = text;
      }
      textCell.appendChild(newP);
    });

    // Build image cell
    const imageCell = document.createElement('div');
    if (imageSrc) {
      const newImg = document.createElement('img');
      newImg.src = imageSrc;
      newImg.alt = imageAlt;
      imageCell.appendChild(newImg);
    }

    // Determine order: check if image comes before text in DOM
    const imageFirst = imageEl && parentText.compareDocumentPosition(imageEl) & Node.DOCUMENT_POSITION_PRECEDING;
    const row = imageFirst ? [imageCell, textCell] : [textCell, imageCell];

    processedPairs.push({
      table: createBlock(document, 'Columns', [row]),
      textEl: parentText,
      imageEl,
    });
  });

  // Replace elements with tables
  processedPairs.forEach(({ table, textEl, imageEl }) => {
    textEl.replaceWith(table);
    if (imageEl) imageEl.remove();
  });
}

/**
 * Extract the overview/callout section (section.travel-brief)
 * This section has a distinct light-blue background, centered text, and blue borders.
 * We add a Section Metadata block to convey this styling.
 */
function extractOverview(document, main) {
  const overviewSection = main.querySelector('section.travel-brief');
  if (!overviewSection) return;

  const container = overviewSection.querySelector('.container') || overviewSection;
  const title = container.querySelector('h2.title, h2');
  const paragraphs = container.querySelectorAll('p');

  const div = document.createElement('div');

  if (title) {
    const h2 = document.createElement('h2');
    h2.textContent = title.textContent.trim();
    div.appendChild(h2);
  }

  paragraphs.forEach((p) => {
    const text = p.textContent.trim();
    if (!text) return;

    const newP = document.createElement('p');
    const link = p.querySelector('a');
    if (link) {
      const textBefore = p.textContent.substring(0, p.textContent.indexOf(link.textContent)).trim();
      if (textBefore) newP.appendChild(document.createTextNode(textBefore));
      const a = document.createElement('a');
      a.href = link.href;
      a.textContent = link.textContent.trim();
      if (link.title) a.title = link.title;
      newP.appendChild(a);
    } else {
      newP.textContent = text;
    }
    div.appendChild(newP);
  });

  // Add Section Metadata block to indicate callout styling
  const sectionMetaCells = [
    ['Section Metadata'],
    ['style', 'highlight'],
  ];
  const sectionMetaTable = WebImporter.DOMUtils.createTable(sectionMetaCells, document);
  div.appendChild(sectionMetaTable);

  const parent = overviewSection.closest('.overviewtext') || overviewSection;
  parent.replaceWith(div);
}

/**
 * Extract the climate targets text section (free text)
 */
function extractClimateText(document, main) {
  // Find the text block with "2023 and 2030 climate targets" heading
  const allTexts = main.querySelectorAll('.text .cmp-text');
  let climateText = null;

  allTexts.forEach((cmpText) => {
    const h2 = cmpText.querySelector('h2');
    if (h2 && h2.textContent.includes('climate targets')) {
      // Only process full-width version (default--12)
      const parent = cmpText.closest('.text');
      if (parent && parent.className.includes('default--12')) {
        climateText = cmpText;
      }
    }
  });

  if (!climateText) return;

  const div = document.createElement('div');
  const heading = climateText.querySelector('h2');
  if (heading) {
    const h2 = document.createElement('h2');
    h2.textContent = heading.textContent.trim();
    div.appendChild(h2);
  }

  climateText.querySelectorAll('p').forEach((p) => {
    const text = p.textContent.trim();
    if (!text || text === ' ') return;

    const newP = document.createElement('p');
    const link = p.querySelector('a');
    if (link) {
      [...p.childNodes].forEach((node) => {
        if (node.nodeType === 3) {
          newP.appendChild(document.createTextNode(node.textContent));
        } else if (node.tagName === 'A') {
          const a = document.createElement('a');
          a.href = node.href;
          a.textContent = node.textContent;
          if (node.title) a.title = node.title;
          newP.appendChild(a);
        } else if (node.tagName === 'SPAN') {
          newP.appendChild(document.createTextNode(node.textContent));
        }
      });
    } else {
      newP.textContent = text;
    }
    div.appendChild(newP);
  });

  const parent = climateText.closest('.text');
  if (parent) parent.replaceWith(div);
}

/**
 * Extract the infographic image with caption
 */
function extractInfographic(document, main) {
  // Match infographic sections — can be .medium (2022) or .default with chart images (2021)
  let infographic = main.querySelector('section.image-body-text.medium');
  if (!infographic) {
    // Fallback: find image-body-text sections with chart/infographic images (full-width, default--12)
    const candidates = main.querySelectorAll('.imageinbodytext[class*="default--12"] section.image-body-text');
    for (const candidate of candidates) {
      const img = candidate.querySelector('img');
      if (img && (img.alt.toLowerCase().includes('chart') || img.alt.toLowerCase().includes('infographic') || img.alt.toLowerCase().includes('target'))) {
        infographic = candidate;
        break;
      }
    }
  }
  if (!infographic) return;

  const picture = infographic.querySelector('.content-image picture');
  const img = infographic.querySelector('.content-image img');
  const caption = infographic.querySelector('.image-caption p, .image-caption');

  const allSrcs = getAllViewportSrcs(picture || img);
  const alt = img ? img.alt || '' : '';
  const hasViewportVariants = allSrcs.length > 1;

  if (hasViewportVariants) {
    // Multiple viewport images — single-column Columns block (just images)
    // Caption goes as default content after the block
    const imageCell = document.createElement('div');
    allSrcs.forEach(({ src }) => {
      const newImg = document.createElement('img');
      newImg.src = src;
      newImg.alt = alt;
      imageCell.appendChild(newImg);
    });

    const rows = [[imageCell]];
    const table = createBlock(document, 'Columns', rows);

    // Caption as default content (italic paragraph) after the block
    const captionEl = document.createElement('p');
    if (caption) {
      const em = document.createElement('em');
      em.textContent = caption.textContent.trim();
      captionEl.appendChild(em);
    }

    // Insert section break before the block so it's in its own section
    const hr = document.createElement('hr');

    // Remove infographic from its current nested location
    const parent = infographic.closest('.imageinbodytext') || infographic;
    parent.remove();

    // Insert hr + Columns table + caption directly into main (body level)
    main.appendChild(hr);
    main.appendChild(table);
    if (caption) main.appendChild(captionEl);
  } else {
    // Single image — keep as default content
    const div = document.createElement('div');

    if (picture || img) {
      const newImg = document.createElement('img');
      newImg.src = allSrcs.length > 0 ? allSrcs[0].src : (img ? img.src : '');
      newImg.alt = alt;
      div.appendChild(newImg);
    }

    if (caption) {
      const em = document.createElement('em');
      em.textContent = caption.textContent.trim();
      const p = document.createElement('p');
      p.appendChild(em);
      div.appendChild(p);
    }

    const parent = infographic.closest('.imageinbodytext') || infographic;
    parent.replaceWith(div);
  }
}

/**
 * Insert section breaks between content areas
 */
function insertSectionBreaks(document, main) {
  const tables = [...main.querySelectorAll('table')];

  // After Hero
  const heroTable = tables.find((t) => {
    const first = t.querySelector('td, th');
    return first && first.textContent.trim() === 'Hero';
  });
  if (heroTable) heroTable.after(document.createElement('hr'));

  // After Cards (all KPI cards are in one table)
  const cardsTable = tables.find((t) => {
    const first = t.querySelector('td, th');
    return first && first.textContent.trim() === 'Cards';
  });
  if (cardsTable) cardsTable.after(document.createElement('hr'));

  // Between and after Columns blocks
  const columnsTables = tables.filter((t) => {
    const first = t.querySelector('td, th');
    return first && first.textContent.trim() === 'Columns';
  });

  columnsTables.forEach((colTable) => {
    colTable.after(document.createElement('hr'));
  });

  // Before and after the callout section (contains Section Metadata with style: highlight)
  const sectionMetaTable = tables.find((t) => {
    const first = t.querySelector('td, th');
    return first && first.textContent.trim() === 'Section Metadata';
  });
  if (sectionMetaTable) {
    const calloutDiv = sectionMetaTable.parentElement;
    if (calloutDiv) {
      // Only add hr before if there isn't one already (columns adds one after itself)
      const prevEl = calloutDiv.previousElementSibling;
      if (!prevEl || prevEl.tagName !== 'HR') {
        calloutDiv.before(document.createElement('hr'));
      }
      // Add hr after the callout to end the highlight section
      const nextEl = calloutDiv.nextElementSibling;
      if (!nextEl || nextEl.tagName !== 'HR') {
        calloutDiv.after(document.createElement('hr'));
      }
    }
  }
}

// EXPORT DEFAULT CONFIGURATION
export default {
  transform: (payload) => {
    const { document, url, html, params } = payload;
    const main = document.body;

    // 1. Cleanup (remove chrome, cookie banners, dedup responsive variants)
    executeTransformers('beforeTransform', main, payload);

    // 2. Collect viewport variant data BEFORE parsers replace <picture> elements
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
      if (uniqueUrls.length > 1) {
        viewportVariants.push({
          alt: img ? img.alt : '',
          ...variants,
        });
      }
    });

    // 3. Extract blocks in order (hero → KPI cards → content columns → overview → climate text → infographic)
    extractHero(document, main);
    extractStickyNav(document, main);
    extractKpiCards(document, main);
    extractContentColumns(document, main);
    extractOverview(document, main);
    extractClimateText(document, main);
    extractInfographic(document, main);

    // 4. Post-transform cleanup
    executeTransformers('afterTransform', main, payload);

    // 5. Insert section breaks
    insertSectionBreaks(document, main);

    // 6. Resolve all remaining images — wrap viewport variants in Columns block for responsive swap
    main.querySelectorAll('picture').forEach((picture) => {
      const img = picture.querySelector('img');
      if (!img) return;

      const allSrcs = getAllViewportSrcs(picture);
      const alt = img.alt || '';

      if (allSrcs.length > 1) {
        // Multiple viewport variants — wrap in Columns block for responsive handling
        const imageCell = document.createElement('div');
        allSrcs.forEach(({ src }) => {
          const newImg = document.createElement('img');
          newImg.src = src;
          newImg.alt = alt;
          imageCell.appendChild(newImg);
        });
        const table = createBlock(document, 'Columns', [[imageCell]]);
        picture.replaceWith(table);
      } else {
        // Single source — just update img.src to desktop version
        const desktopSrc = getDesktopImgSrc(picture);
        if (desktopSrc && desktopSrc !== img.src) {
          img.src = desktopSrc;
        }
      }
    });

    // 7. Apply WebImporter built-in rules
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 8. Generate path - full localized path (NOT index)
    const path = WebImporter.FileUtils.sanitizePath(
      new URL(params.originalURL).pathname.replace(/\/$/, '').replace(/\.html$/, '')
    );

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: 'annual-report-performance',
        viewportVariants: viewportVariants.length > 0 ? JSON.stringify(viewportVariants) : undefined,
      },
    }];
  },
};

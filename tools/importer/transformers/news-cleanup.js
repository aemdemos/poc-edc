/**
 * News release page cleanup transformer.
 * Processes the raw DOM before block parsing to:
 * - Remove non-content elements (header, footer, scripts, cookie banners)
 * - Identify and mark section breaks from key-line elements
 * - Strip empty containers
 * - Extract page-level metadata for the metadata block
 */

/**
 * Removes elements matching the given selectors from the document.
 *
 * @param {Document} document - The DOM document
 * @param {string[]} selectors - CSS selectors for elements to remove
 */
function removeElements(document, selectors) {
  selectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((el) => el.remove());
  });
}

/**
 * Main cleanup function. Strips non-content elements from the document.
 *
 * @param {Document} document - The source DOM document
 * @param {object} template - Template config with exclude selectors
 * @returns {Document} The cleaned document (modified in place)
 */
export function cleanup(document, template) {
  const excludeSelectors = template.exclude || [
    '.header',
    '.footer',
    '.breadcrumb-wrapper',
    '#onetrust-consent-sdk',
    'script',
    'noscript',
    'iframe',
    'style',
    'link[rel="stylesheet"]',
  ];

  removeElements(document, excludeSelectors);

  return document;
}

/**
 * Detects section break elements (key-line dividers) in a container.
 * Returns indices where breaks occur so sections can be split.
 *
 * @param {Element} container - The content container to scan
 * @param {string} breakSelector - CSS selector for section break elements
 * @returns {number[]} Indices of children that are section breaks
 */
export function findSectionBreaks(container, breakSelector) {
  const children = [...container.children];
  const breakIndices = [];

  children.forEach((child, index) => {
    const isBreak = child.matches?.(breakSelector)
      || child.querySelector?.(breakSelector)
      || child.classList?.contains('c-keyline')
      || child.querySelector?.('.key-line');

    if (isBreak) {
      breakIndices.push(index);
    }
  });

  return breakIndices;
}

/**
 * Splits container children into sections based on key-line break positions.
 * Each section is an array of DOM elements.
 *
 * @param {Element} container - The content container
 * @param {string} breakSelector - CSS selector for break elements
 * @returns {Element[][]} Array of sections, each containing its elements
 */
export function splitIntoSections(container, breakSelector) {
  const children = [...container.children];
  const breakIndices = findSectionBreaks(container, breakSelector);

  if (breakIndices.length === 0) {
    return [children];
  }

  const sections = [];
  let currentSection = [];

  children.forEach((child, index) => {
    if (breakIndices.includes(index)) {
      if (currentSection.length > 0) {
        sections.push(currentSection);
      }
      currentSection = [];
    } else {
      currentSection.push(child);
    }
  });

  if (currentSection.length > 0) {
    sections.push(currentSection);
  }

  return sections;
}

/**
 * Extracts page-level metadata from <meta> tags and page elements.
 *
 * @param {Document} document - The source DOM document
 * @param {object} metadataConfig - Metadata selector config from template
 * @returns {object} Key-value metadata pairs
 */
export function extractMetadata(document, metadataConfig) {
  const metadata = {};

  if (!metadataConfig || !metadataConfig.selectors) return metadata;

  Object.entries(metadataConfig.selectors).forEach(([key, selector]) => {
    const el = document.querySelector(selector);
    if (!el) return;

    // <meta> tags use content attribute
    if (el.tagName === 'META') {
      metadata[key] = el.getAttribute('content') || '';
    } else if (el.tagName === 'TIME') {
      // <time> uses datetime attribute or text content
      metadata[key] = el.getAttribute('datetime') || el.textContent.trim();
    } else {
      metadata[key] = el.textContent.trim();
    }
  });

  // Clean up null/undefined/"null" values
  Object.keys(metadata).forEach((key) => {
    if (!metadata[key] || metadata[key] === 'null') {
      delete metadata[key];
    }
  });

  return metadata;
}

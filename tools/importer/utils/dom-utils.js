/**
 * Shared DOM helpers for the EDC content importer (Node.js / jsdom).
 */

/**
 * @param {string} baseUrl
 * @param {string} href
 * @returns {string}
 */
export function resolveUrl(baseUrl, href) {
  if (!href) return '';
  try {
    return new URL(href, baseUrl).href;
  } catch {
    return href;
  }
}

/**
 * @param {Document} doc
 * @param {string} selector
 * @returns {Element|null}
 */
export function selectFirst(doc, selector) {
  try {
    return doc.querySelector(selector);
  } catch {
    return null;
  }
}

/**
 * Strip analytics/data attributes for cleaner authored HTML.
 * @param {Element} el
 */
export function stripInstrumentation(el) {
  if (!el) return;
  [...el.attributes].forEach((attr) => {
    if (
      attr.name.startsWith('data-aue')
      || attr.name.startsWith('data-richtext')
      || attr.name.startsWith('data-event')
      || attr.name === 'data-uuid'
      || attr.name === 'data-tap-close'
      || attr.name === 'i18n-title'
    ) {
      el.removeAttribute(attr.name);
    }
  });
}

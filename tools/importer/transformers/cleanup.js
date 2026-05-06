/**
 * Removes site chrome and non-content nodes before parsing.
 * @param {Document} document
 * @returns {Document}
 */
export default function transform(document) {
  const SELECTORS_TO_REMOVE = [
    'header',
    // Site chrome only (do not use plain `footer` — it removes blockquote attribution)
    'footer#footerv2',
    'script',
    'style',
    'noscript',
    'link[rel="stylesheet"]',
    '.cookie-banner',
    '.privacy-dialog',
    '#onetrust-consent-sdk',
    '[data-analytics]',
    '.skip-navigation',
    'meta[name="generator"]',
    '.cmp-experiencefragment--footer',
    '.cmp-experiencefragment--header',
  ];

  SELECTORS_TO_REMOVE.forEach((sel) => {
    document.querySelectorAll(sel).forEach((n) => n.remove());
  });

  return document;
}

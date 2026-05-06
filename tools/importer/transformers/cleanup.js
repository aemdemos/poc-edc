/**
 * Removes site chrome, scripts, and non-content nodes before parsing.
 */

const SELECTORS_TO_REMOVE = [
  'header',
  /* Site chrome — avoid bare `footer` (pullquotes use <footer> for attribution) */
  '#footerv2',
  'div.footer.aem-GridColumn',
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

/**
 * @param {Document} document
 * @returns {Document}
 */
export function transform(document) {
  SELECTORS_TO_REMOVE.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => el.remove());
  });
  return document;
}

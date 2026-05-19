/* global WebImporter */

/**
 * Article Body parser
 * Extracts the main article text content (paragraphs, headings, lists).
 * This is default content — not wrapped in a block table.
 * Cleans inline styles and data attributes.
 *
 * Source DOM: .articlebodycontainer .cmp-text
 */
export default function parse(element, { document, main }) {
  if (!element) return;

  // Clean inline styles and data attributes
  element.querySelectorAll('[style]').forEach((el) => el.removeAttribute('style'));
  element.querySelectorAll('[data-uuid]').forEach((el) => el.removeAttribute('data-uuid'));

  // Remove empty paragraphs
  element.querySelectorAll('p').forEach((p) => {
    if (!p.textContent.trim() && !p.querySelector('img, picture, a')) {
      p.remove();
    }
  });

  // Move content out of the container wrapper to become default content
  const parent = element.parentElement;
  if (parent) {
    while (element.firstChild) {
      parent.insertBefore(element.firstChild, element);
    }
    element.remove();
  }
}

/* global WebImporter */

/**
 * Recommended Articles parser
 * Creates a placeholder block for dynamically loaded recommendations.
 * The actual content is populated at runtime by EDS block decoration.
 *
 * Source DOM: .c-recommended-articles
 */
export default function parse(element, { document }) {
  if (!element) return;

  const cell = document.createElement('div');
  cell.textContent = 'Recommended articles for you';

  const cells = [['Recommended Articles'], [cell]];
  const table = WebImporter.DOMUtils.createTable(cells, document);
  element.replaceWith(table);
}

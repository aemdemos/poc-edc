import { escapeHtml } from '../utils/dom-utils.js';

/**
 * @param {Document} document
 * @returns {{ blockName: string, cells: string[][] }}
 */
export function parse(document) {
  const bq = document.querySelector('blockquote.blockquote, blockquote.blockquote-en');
  if (!bq) {
    return {
      blockName: 'Quote',
      cells: [['', '']],
    };
  }

  const citeEl = bq.querySelector('cite') || bq.querySelector('h3');
  let quotation = citeEl?.textContent?.trim() || '';
  if (!quotation) {
    quotation = bq.textContent?.trim() || '';
  }

  const author = bq.querySelector('footer .author')?.textContent?.trim() || '';
  const details = [...bq.querySelectorAll('footer .detail')].map((d) => d.textContent?.trim()).filter(Boolean);
  const tail = details.join(', ');
  const attributionInner = author && tail
    ? `<em>${escapeHtml(author)}</em>, ${escapeHtml(tail)}`
    : escapeHtml(`${author}${tail ? `, ${tail}` : ''}`);

  return {
    blockName: 'Quote',
    cells: [
      [`<p>${escapeHtml(quotation)}</p>`],
      [`<p>${attributionInner}</p>`],
    ],
  };
}

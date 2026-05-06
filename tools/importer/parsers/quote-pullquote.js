/**
 * @param {Document} document
 * @returns {{ blockName: string, cells: string[][] }}
 */
export function parse(document) {
  const bq = document.querySelector('blockquote.blockquote, blockquote.blockquote-en');

  const titleEl = bq?.querySelector('h3.title, h3');
  const citeEl = titleEl?.querySelector('cite');
  let quoteText = '';
  if (citeEl) {
    quoteText = citeEl.textContent?.trim() || '';
  } else if (titleEl) {
    quoteText = titleEl.textContent?.trim() || '';
  }

  const author = bq?.querySelector('footer .author')?.textContent?.trim() || '';
  const details = [...bq?.querySelectorAll('footer .detail') || []].map((d) => d.textContent.trim());
  const role = details[0] || '';
  const company = details[1] || '';

  const attribution = [author, role, company].filter(Boolean).join(', ');

  return {
    blockName: 'Quote',
    cells: [
      [`<p>${quoteText}</p>`],
      [`<p><em>${attribution}</em></p>`],
    ],
  };
}

export default { parse };

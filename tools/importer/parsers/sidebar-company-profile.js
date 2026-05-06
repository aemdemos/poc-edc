import { resolveUrl } from '../utils/dom-utils.js';

const SOURCE_BASE = 'https://www.edc.ca';

/**
 * @param {Document} document
 * @returns {{ blockName: string, cells: string[][] }}
 */
export function parse(document) {
  const root = document.querySelector('.articlerightcontainer .c-company-at-a-glance, .c-company-at-a-glance');
  if (!root) {
    return { blockName: 'Sidebar', cells: [['', '']] };
  }

  const pdfTitle = root.querySelector('.c-pdf-download .download-title')?.textContent?.trim() || 'Download case study';
  const pdfLink = root.querySelector('.c-pdf-download a.download-link');
  const pdfHref = pdfLink ? resolveUrl(SOURCE_BASE, pdfLink.getAttribute('href') || '') : '';
  const pdfText = pdfLink?.textContent?.trim() || '';
  const pdfCell = pdfHref
    ? `<a href="${pdfHref}" target="_blank" rel="noopener noreferrer">${pdfText}</a>`
    : pdfText;

  const rows = [
    [pdfTitle, pdfCell],
  ];

  const companyName = root.querySelector('.company-name')?.textContent?.trim();
  if (companyName) {
    rows.push(['Company name', companyName]);
  }

  root.querySelectorAll('.item').forEach((item) => {
    const label = item.querySelector('.label')?.textContent?.trim();
    const text = item.querySelector('.text')?.textContent?.trim();
    if (label && text) rows.push([label, text]);
  });

  return {
    blockName: 'Sidebar',
    cells: rows,
  };
}

import { resolveUrl } from '../utils/dom-utils.js';

/**
 * @param {Document} document
 * @returns {{ blockName: string, cells: string[][] }}
 */
export function parse(document) {
  const aside = document.querySelector('.articlerightcontainer aside, .articlerightcontainer');
  const section = aside?.querySelector('section.c-company-at-a-glance') || aside;

  const downloadTitleEl = section?.querySelector('.download-title');
  const downloadLink = section?.querySelector('a.download-link');

  const downloadHeading = downloadTitleEl?.textContent?.trim() || 'Download case study';
  const pdfHref = downloadLink ? resolveUrl('https://www.edc.ca/', downloadLink.getAttribute('href')) : '';
  const pdfLabel = downloadLink?.textContent?.trim() || '';

  const rows = [];

  rows.push([
    downloadHeading,
    `<a href="${pdfHref}">${pdfLabel}</a>`,
  ]);

  const companyName = section?.querySelector('.company-name')?.textContent?.trim() || '';
  if (companyName) {
    rows.push(['Company name', companyName]);
  }

  section?.querySelectorAll('.item').forEach((item) => {
    const label = item.querySelector('h4.label')?.textContent?.trim();
    const value = item.querySelector('p.text')?.textContent?.trim();
    if (label && value) rows.push([label, value]);
  });

  return {
    blockName: 'Sidebar',
    cells: rows,
  };
}

export default { parse };

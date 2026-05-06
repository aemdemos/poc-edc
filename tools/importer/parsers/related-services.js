import { resolveUrl } from '../utils/dom-utils.js';

/**
 * @param {Document} document
 * @returns {{ blockName: string, cells: string[][] }}
 */
export function parse(document) {
  const wrap = document.querySelector('.recommended-articles-premium-wrapper, .recommended-article-premium');
  const root = wrap?.closest('.list') || document.querySelector('.recommended-article-premium');

  const img = root?.querySelector('.recommended-article-content img, .image img');
  const link = root?.querySelector('a.ra-premium:not(.img-link)');
  const desc = root?.querySelector('.description-text p.small, p.small');

  const base = 'https://www.edc.ca/';
  const imgSrc = img ? resolveUrl(base, img.getAttribute('src')) : '';
  const imgAlt = img?.getAttribute('alt') || '';

  const pictureHtml = imgSrc
    ? `<picture><img src="${imgSrc}" alt="${imgAlt.replace(/"/g, '&quot;')}" loading="lazy"/></picture>`
    : '';

  const href = link ? resolveUrl(base, link.getAttribute('href')) : '';
  const title = link?.textContent?.trim() || '';
  const blurb = desc?.textContent?.trim() || '';

  const bodyHtml = `<h3><a href="${href}">${title}</a></h3><p>${blurb}</p>`;

  return {
    blockName: 'Cards',
    cells: [[pictureHtml, bodyHtml]],
  };
}

export default { parse };

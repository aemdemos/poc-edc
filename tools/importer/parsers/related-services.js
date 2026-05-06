import { resolveUrl } from '../utils/dom-utils.js';

const SOURCE_BASE = 'https://www.edc.ca';

/**
 * @param {Document} document
 * @returns {{ blockName: string, cells: string[][] }}
 */
export function parse(document) {
  const section = document.querySelector('.recommended-articles-premium-wrapper, .recommended-article-premium');
  if (!section) {
    return { blockName: 'Cards', cells: [['', '']] };
  }

  const wrap = section.closest('.recommended-articles-premium-wrapper') || section;
  const img = wrap.querySelector('.recommended-article-content img, .image img');
  const link = wrap.querySelector('.description-text a.ra-premium')
    || wrap.querySelector('a.ra-premium:not(.img-link)');
  const desc = wrap.querySelector('.description-text p.small, .description .small');

  const imgSrc = img ? resolveUrl(SOURCE_BASE, img.getAttribute('src') || '') : '';
  const alt = img?.getAttribute('alt') || '';
  const href = link ? resolveUrl(SOURCE_BASE, link.getAttribute('href') || '') : '';
  const title = link?.textContent?.trim() || '';
  const blurb = desc?.textContent?.trim() || '';

  const pictureHtml = imgSrc
    ? `<picture><img src="${imgSrc}" alt="${alt.replace(/"/g, '&quot;')}" loading="lazy"/></picture>`
    : '';

  const bodyHtml = href
    ? `<h3><a href="${href}">${title}</a></h3><p>${blurb}</p>`
    : `<h3>${title}</h3><p>${blurb}</p>`;

  return {
    blockName: 'Cards',
    cells: [[pictureHtml, bodyHtml]],
  };
}

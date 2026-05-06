import { resolveUrl } from '../utils/dom-utils.js';

/**
 * @param {Document} document
 * @returns {{ blockName: string, cells: string[][] }}
 */
export function parse(document) {
  const banner = document.querySelector('section.c-page-hero-banner, section[role="banner"]');
  const picture = banner?.querySelector('.img-wrapper picture, picture');
  const h1 = banner?.querySelector('h1.title, h1');
  const subtitle = banner?.querySelector('.content p');

  const base = 'https://www.edc.ca/';
  let pictureHtml = '';
  if (picture) {
    const clone = picture.cloneNode(true);
    clone.querySelectorAll('source, img').forEach((el) => {
      if (el.tagName === 'SOURCE' && el.srcSet) {
        el.srcSet = el.srcSet.split(',').map((part) => {
          const [url, rest] = part.trim().split(/\s+/);
          return `${resolveUrl(base, url)} ${rest || ''}`.trim();
        }).join(', ');
      }
      if (el.tagName === 'IMG' && el.src) {
        el.src = resolveUrl(base, el.src);
      }
    });
    pictureHtml = clone.outerHTML;
  }

  const titleText = h1?.textContent?.trim() || '';
  const subHtml = subtitle?.textContent?.trim()
    ? `<p class="hero-subtitle">${subtitle.textContent.trim()}</p>`
    : '';

  const cellHtml = `${pictureHtml}<h1>${titleText}</h1>${subHtml}`;

  return {
    blockName: 'Hero',
    cells: [[cellHtml]],
  };
}

export default { parse };

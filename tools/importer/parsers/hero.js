/* global WebImporter */

/**
 * Hero block parser
 * Extracts hero banner: viewport images (mobile → tablet → desktop) + H1 + subtitle
 * Source DOM: .c-hero-banner or section[class*="hero"]
 */
export default function parse(element, { document, getAllViewportSrcs }) {
  const heading = element.querySelector('h1');
  const subtitle = element.querySelector('.content p, p');
  const picture = element.querySelector('picture');
  const img = element.querySelector('img');

  const cell = document.createElement('div');
  if (picture || img) {
    const allSrcs = getAllViewportSrcs(picture || img);
    const alt = img ? img.alt || '' : '';
    if (allSrcs.length > 1) {
      allSrcs.forEach(({ src }) => {
        const newImg = document.createElement('img');
        newImg.src = src; newImg.alt = alt;
        cell.appendChild(newImg);
      });
    } else {
      const newImg = document.createElement('img');
      newImg.src = allSrcs.length > 0 ? allSrcs[0].src : (img ? img.src : '');
      newImg.alt = alt; cell.appendChild(newImg);
    }
  }
  if (heading) { const h1 = document.createElement('h1'); h1.textContent = heading.textContent.trim(); cell.appendChild(h1); }
  if (subtitle && subtitle.textContent.trim() && !subtitle.querySelector('a')) {
    const p = document.createElement('p'); p.textContent = subtitle.textContent.trim(); cell.appendChild(p);
  }

  const cells = [['Hero'], [cell]];
  const table = WebImporter.DOMUtils.createTable(cells, document);
  element.replaceWith(table);
}

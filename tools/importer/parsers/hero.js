/* global WebImporter */

/**
 * Hero block parser
 * Extracts hero banner: desktop image + H1 title
 * Source DOM: .articlehero
 */
export default function parse(element, { document, getDesktopImgSrc }) {
  const picture = element.querySelector('picture');
  const img = element.querySelector('img');
  const heading = element.querySelector('h1.title, h1');

  const cell = document.createElement('div');

  // Image — prefer desktop quality
  if (picture || img) {
    const desktopSrc = getDesktopImgSrc(picture || img);
    const alt = img ? (img.getAttribute('alt') || '') : '';
    const newImg = document.createElement('img');
    newImg.setAttribute('src', desktopSrc || (img ? img.getAttribute('src') : ''));
    newImg.setAttribute('alt', alt);
    cell.appendChild(newImg);
  }

  // Title
  if (heading) {
    const h1 = document.createElement('h1');
    h1.textContent = heading.textContent.trim();
    cell.appendChild(h1);
  }

  const cells = [['Hero'], [cell]];
  const table = WebImporter.DOMUtils.createTable(cells, document);
  element.replaceWith(table);
}

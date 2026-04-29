/* global WebImporter */

/**
 * Hero block parser
 * Extracts hero banner content: background image, heading (h1), and description text.
 * Source DOM: section.c-hero-banner containing .content (h1 + p) and .img-wrapper (picture)
 */
export default function parse(element, { document }) {
  const heading = element.querySelector('h1');
  const description = element.querySelector('.content p');
  const picture = element.querySelector('.img-wrapper picture, .img-wrapper img, picture');

  const contentCell = document.createElement('div');

  if (picture) {
    const img = picture.tagName === 'IMG' ? picture : picture.querySelector('img');
    if (img) {
      const newImg = document.createElement('img');
      newImg.src = img.src;
      newImg.alt = img.alt || '';
      contentCell.appendChild(newImg);
    }
  }

  if (heading) {
    const h1 = document.createElement('h1');
    h1.textContent = heading.textContent.trim();
    contentCell.appendChild(h1);
  }

  if (description) {
    const p = document.createElement('p');
    p.textContent = description.textContent.trim();
    contentCell.appendChild(p);
  }

  const cells = [
    ['Hero'],
    [contentCell],
  ];

  const table = WebImporter.DOMUtils.createTable(cells, document);
  element.replaceWith(table);
}

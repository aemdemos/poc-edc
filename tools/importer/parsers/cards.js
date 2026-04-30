/* global WebImporter */

/**
 * Cards block parser for KPI stat items
 * Extracts stat cards: icon image, large heading number, description text.
 * Source DOM: section.image-body-text.default inside .imageinbodytext with 4-col grid
 * Each card has: .content-image (picture) + .text-after-image (h2 + p)
 */
export default function parse(element, { document }) {
  const image = element.querySelector('.content-image picture, .content-image img');
  const textContainer = element.querySelector('.text-after-image');

  if (!textContainer) return;

  const heading = textContainer.querySelector('h2');
  const description = textContainer.querySelector('p');

  const imageCell = document.createElement('div');
  if (image) {
    const img = image.tagName === 'IMG' ? image : image.querySelector('img');
    if (img) {
      const newImg = document.createElement('img');
      newImg.src = img.src;
      newImg.alt = img.alt || '';
      imageCell.appendChild(newImg);
    }
  }

  const textCell = document.createElement('div');
  if (heading) {
    const h = document.createElement('h2');
    h.innerHTML = heading.innerHTML.trim();
    textCell.appendChild(h);
  }
  if (description) {
    const p = document.createElement('p');
    p.innerHTML = description.innerHTML.trim();
    textCell.appendChild(p);
  }

  const cells = [
    ['Cards'],
    [imageCell, textCell],
  ];

  const table = WebImporter.DOMUtils.createTable(cells, document);
  element.replaceWith(table);
}

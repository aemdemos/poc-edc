/* global WebImporter */

/**
 * Columns block parser for image + text content pairs
 * Extracts alternating image/text layouts from the EDC annual report.
 * Source DOM: pairs of .imageinbodytext (picture) + .text (h2, paragraphs, links)
 * arranged in 6-col grid layout.
 *
 * This parser is called on the image element (.image-body-text inside .imageinbodytext)
 * and looks for the adjacent text sibling in the same row.
 */
export default function parse(element, { document }) {
  const parentImageDiv = element.closest('.imageinbodytext');
  if (!parentImageDiv) return;

  const picture = element.querySelector('.content-image picture, .content-image img');

  // Find the associated text block - it's usually a sibling .text div
  // The text can be before or after the image div
  let textDiv = null;
  let imageFirst = true;

  // Look at next sibling first
  let sibling = parentImageDiv.nextElementSibling;
  while (sibling) {
    if (sibling.classList.contains('text') && sibling.querySelector('.cmp-text')) {
      const cmpText = sibling.querySelector('.cmp-text');
      const hasHeading = cmpText.querySelector('h2');
      const hasParagraph = cmpText.querySelector('p');
      // Skip empty/whitespace-only text divs
      if (hasHeading || (hasParagraph && hasParagraph.textContent.trim().length > 10)) {
        textDiv = cmpText;
        imageFirst = true;
        // Mark this sibling for removal so it doesn't appear as loose content
        sibling.setAttribute('data-columns-consumed', 'true');
        break;
      }
    }
    // If we hit another imageinbodytext, stop looking forward
    if (sibling.classList.contains('imageinbodytext')) break;
    sibling = sibling.nextElementSibling;
  }

  // If no text found after, look before
  if (!textDiv) {
    sibling = parentImageDiv.previousElementSibling;
    while (sibling) {
      if (sibling.classList.contains('text') && sibling.querySelector('.cmp-text')) {
        const cmpText = sibling.querySelector('.cmp-text');
        const hasHeading = cmpText.querySelector('h2');
        const hasParagraph = cmpText.querySelector('p');
        if (hasHeading || (hasParagraph && hasParagraph.textContent.trim().length > 10)) {
          textDiv = cmpText;
          imageFirst = false;
          sibling.setAttribute('data-columns-consumed', 'true');
          break;
        }
      }
      if (sibling.classList.contains('imageinbodytext')) break;
      sibling = sibling.previousElementSibling;
    }
  }

  if (!textDiv) return;

  // Build image cell
  const imageCell = document.createElement('div');
  if (picture) {
    const img = picture.tagName === 'IMG' ? picture : picture.querySelector('img');
    if (img) {
      const newImg = document.createElement('img');
      newImg.src = img.src;
      newImg.alt = img.alt || '';
      imageCell.appendChild(newImg);
    }
  }

  // Build text cell - preserve heading, paragraphs, and links
  const textCell = document.createElement('div');
  const h2 = textDiv.querySelector('h2');
  if (h2) {
    const heading = document.createElement('h2');
    heading.textContent = h2.textContent.trim();
    textCell.appendChild(heading);
  }

  textDiv.querySelectorAll('p').forEach((p) => {
    const text = p.textContent.trim();
    if (!text || text === ' ') return; // Skip empty/nbsp paragraphs

    const newP = document.createElement('p');
    // Check for links inside the paragraph
    const link = p.querySelector('a');
    if (link && p.textContent.trim() === link.textContent.trim()) {
      // Paragraph is just a link - create as standalone link
      const a = document.createElement('a');
      a.href = link.href;
      a.textContent = link.textContent.trim();
      if (link.title) a.title = link.title;
      newP.appendChild(a);
    } else if (link) {
      // Mixed paragraph with inline link
      newP.innerHTML = p.innerHTML;
    } else {
      newP.textContent = text;
    }
    textCell.appendChild(newP);
  });

  // Build the columns table with correct order
  const row = imageFirst ? [imageCell, textCell] : [textCell, imageCell];

  const cells = [
    ['Columns'],
    row,
  ];

  const table = WebImporter.DOMUtils.createTable(cells, document);
  element.replaceWith(table);
}

/* global WebImporter */

/**
 * Hero block parser
 * Extracts hero banner with separate rows for image and title.
 *
 * Output structure:
 *   Row 1: Block name "Hero"
 *   Row 2: Desktop image wrapped in <picture> element
 *   Row 3: Title (h1)
 *
 * Source DOM: .articlehero
 */
export default function parse(element, { document, getDesktopImgSrc, getMobileImgSrc }) {
  const picture = element.querySelector('picture');
  const img = element.querySelector('img');
  const heading = element.querySelector('h1.title, h1');

  const cells = [['Hero']];

  // Row 2: Images — mobile + desktop as separate <picture> elements in one cell
  if (picture || img) {
    const imageCell = document.createElement('div');
    const alt = img ? (img.getAttribute('alt') || '') : '';
    const desktopSrc = getDesktopImgSrc(picture || img);
    const mobileSrc = getMobileImgSrc(picture || img);

    // Mobile image
    if (mobileSrc) {
      const mobilePicture = document.createElement('picture');
      const ms1 = document.createElement('source');
      ms1.setAttribute('srcset', mobileSrc);
      const ms2 = document.createElement('source');
      ms2.setAttribute('srcset', mobileSrc);
      ms2.setAttribute('media', '(min-width: 600px)');
      const mImg = document.createElement('img');
      mImg.setAttribute('src', mobileSrc);
      mImg.setAttribute('alt', alt);
      mImg.setAttribute('loading', 'lazy');
      mobilePicture.append(ms1, ms2, mImg);
      imageCell.appendChild(mobilePicture);
    }

    // Desktop image
    if (desktopSrc && desktopSrc !== mobileSrc) {
      const desktopPicture = document.createElement('picture');
      const ds1 = document.createElement('source');
      ds1.setAttribute('srcset', desktopSrc);
      const ds2 = document.createElement('source');
      ds2.setAttribute('srcset', desktopSrc);
      ds2.setAttribute('media', '(min-width: 600px)');
      const dImg = document.createElement('img');
      dImg.setAttribute('src', desktopSrc);
      dImg.setAttribute('alt', alt);
      dImg.setAttribute('loading', 'lazy');
      desktopPicture.append(ds1, ds2, dImg);
      imageCell.appendChild(desktopPicture);
    }

    cells.push([imageCell]);
  }

  // Row 3: Title
  if (heading) {
    const titleCell = document.createElement('div');
    const h1 = document.createElement('h1');
    h1.textContent = heading.textContent.trim();
    titleCell.appendChild(h1);
    cells.push([titleCell]);
  }

  const table = WebImporter.DOMUtils.createTable(cells, document);
  element.replaceWith(table);
}

import { getBlockId } from '../../scripts/scripts.js';

/**
 * Combine multiple images with the same alt text into a single responsive <picture>.
 * Images are expected in order: mobile → tablet → desktop.
 */
function buildResponsivePictures(col) {
  const images = [...col.querySelectorAll('img')];
  if (images.length <= 1) return;

  const groups = new Map();
  images.forEach((img) => {
    const key = img.alt || '';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(img);
  });

  groups.forEach((imgs) => {
    if (imgs.length <= 1) return;

    const picture = document.createElement('picture');

    if (imgs.length === 3) {
      const [mobile, tablet, desktop] = imgs;
      const srcDesktop = document.createElement('source');
      srcDesktop.setAttribute('media', '(min-width: 900px)');
      srcDesktop.setAttribute('srcset', desktop.currentSrc || desktop.src);
      picture.appendChild(srcDesktop);

      const srcTablet = document.createElement('source');
      srcTablet.setAttribute('media', '(min-width: 600px)');
      srcTablet.setAttribute('srcset', tablet.currentSrc || tablet.src);
      picture.appendChild(srcTablet);

      const img = document.createElement('img');
      img.src = mobile.currentSrc || mobile.src;
      img.alt = mobile.alt || desktop.alt || '';
      img.loading = 'lazy';
      picture.appendChild(img);
    } else if (imgs.length === 2) {
      const [mobile, desktop] = imgs;
      const srcDesktop = document.createElement('source');
      srcDesktop.setAttribute('media', '(min-width: 600px)');
      srcDesktop.setAttribute('srcset', desktop.currentSrc || desktop.src);
      picture.appendChild(srcDesktop);

      const img = document.createElement('img');
      img.src = mobile.currentSrc || mobile.src;
      img.alt = mobile.alt || desktop.alt || '';
      img.loading = 'lazy';
      picture.appendChild(img);
    }

    // Replace original images with the combined picture
    const parent = imgs[0].closest('p') || imgs[0].parentElement;
    imgs.forEach((img) => {
      const wrapper = img.closest('picture') || img.closest('p') || img;
      if (wrapper !== parent) wrapper.remove();
    });
    parent.replaceWith(picture);
  });
}

export default function decorate(block) {
  const blockId = getBlockId('columns');
  block.setAttribute('id', blockId);
  block.setAttribute('aria-label', `columns-${blockId}`);
  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', 'Columns');

  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-${cols.length}-cols`);

  // setup image columns and responsive image handling
  [...block.children].forEach((row) => {
    [...row.children].forEach((col) => {
      // Combine viewport variant images into responsive <picture> elements
      buildResponsivePictures(col);

      const pic = col.querySelector('picture');
      if (pic) {
        const picWrapper = pic.closest('div');
        if (picWrapper && picWrapper.children.length === 1) {
          picWrapper.classList.add('columns-img-col');
        }
      }
    });
  });
}

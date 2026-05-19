/**
 * Hero block decoration
 * Handles responsive images: when two images are present in the image row,
 * the first is shown on mobile and the second on desktop.
 * @param {Element} block The hero block element
 */
export default function decorate(block) {
  const rows = [...block.children];
  if (rows.length < 2) return;

  const imageRow = rows[0];
  const pictures = imageRow.querySelectorAll('picture');

  if (pictures.length === 2) {
    pictures[0].classList.add('hero-mobile');
    pictures[1].classList.add('hero-desktop');
  }
}

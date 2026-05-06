import { getBlockId } from '../../scripts/scripts.js';

/**
 * Hero with full-bleed picture and overlaid title (case study variant).
 * @param {Element} block
 */
export default function decorate(block) {
  const blockId = getBlockId('hero');
  block.setAttribute('id', blockId);
  block.setAttribute('aria-label', `Hero ${blockId}`);
  block.setAttribute('role', 'region');

  const picture = block.querySelector('picture');
  const h1 = block.querySelector('h1');
  const subtitle = block.querySelector('.hero-subtitle');

  block.textContent = '';
  if (picture) block.append(picture);

  const content = document.createElement('div');
  content.className = 'hero-content';
  if (h1) content.append(h1);
  if (subtitle) content.append(subtitle);
  block.append(content);
}

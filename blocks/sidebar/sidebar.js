import { getBlockId } from '../../scripts/scripts.js';

/**
 * Label/value pairs + optional download row (case study sidebar).
 * @param {Element} block
 */
export default function decorate(block) {
  const blockId = getBlockId('sidebar');
  block.setAttribute('id', blockId);
  block.setAttribute('aria-label', `Sidebar ${blockId}`);
  block.setAttribute('role', 'region');

  const rows = [...block.children].filter((row) => row.tagName === 'DIV');
  rows.forEach((row) => {
    const cells = [...row.children];
    if (cells.length >= 2) {
      cells[0].classList.add('sidebar-label');
      cells[1].classList.add('sidebar-value');
    }
  });
}

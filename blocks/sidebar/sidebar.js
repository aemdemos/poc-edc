import { getBlockId, ensureDOMPurify } from '../../scripts/scripts.js';
import { DOMPURIFY } from '../../scripts/aem.js';

/**
 * Label/value sidebar (company profile + download link).
 * @param {Element} block
 */
export default async function decorate(block) {
  const blockId = getBlockId('sidebar');
  block.setAttribute('id', blockId);
  block.setAttribute('aria-label', `Sidebar ${blockId}`);
  block.setAttribute('role', 'complementary');

  await ensureDOMPurify();

  const rows = [...block.children];
  const root = document.createElement('div');
  root.className = 'sidebar-inner';

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const cells = [...row.children];
    if (cells.length >= 2 && index === 0) {
      const download = document.createElement('div');
      download.className = 'sidebar-download';
      const heading = document.createElement('h3');
      heading.className = 'sidebar-download-title';
      heading.innerHTML = window.DOMPurify.sanitize(cells[0].innerHTML, DOMPURIFY);
      const body = document.createElement('div');
      body.className = 'sidebar-download-body';
      body.innerHTML = window.DOMPurify.sanitize(cells[1].innerHTML, DOMPURIFY);
      download.append(heading, body);
      root.append(download);
    } else if (cells.length >= 2) {
      const rowEl = document.createElement('div');
      rowEl.className = 'sidebar-row';
      const label = document.createElement('div');
      label.className = 'sidebar-label';
      label.innerHTML = window.DOMPurify.sanitize(cells[0].innerHTML, DOMPURIFY);
      const value = document.createElement('div');
      value.className = 'sidebar-value';
      value.innerHTML = window.DOMPurify.sanitize(cells[1].innerHTML, DOMPURIFY);
      rowEl.append(label, value);
      root.append(rowEl);
    }
  }

  block.textContent = '';
  block.append(root);
}

import { getBlockId, ensureDOMPurify } from '../../scripts/scripts.js';
import { DOMPURIFY } from '../../scripts/aem.js';

/**
 * Newsletter signup block (heading, disclaimer, joined email + button).
 * Row 1: heading HTML. Row 2: disclaimer HTML. Row 3: placeholder text | button label.
 * @param {Element} block
 */
export default async function decorate(block) {
  const blockId = getBlockId('newsletter');
  block.setAttribute('id', blockId);
  block.setAttribute('aria-label', `Newsletter ${blockId}`);
  block.setAttribute('role', 'region');

  const rows = [...block.children];
  const headingCell = rows[0]?.firstElementChild;
  const disclaimerCell = rows[1]?.firstElementChild;
  const row3 = rows[2];
  const placeholderCell = row3?.children[0];
  const buttonCell = row3?.children[1];

  await ensureDOMPurify();
  const placeholder = placeholderCell?.textContent?.trim() || '';
  const buttonLabel = buttonCell?.textContent?.trim() || '';

  const form = document.createElement('form');
  form.className = 'newsletter-form';
  form.setAttribute('action', '#');
  form.setAttribute('method', 'post');

  const inner = document.createElement('div');
  inner.className = 'newsletter-inner';

  if (headingCell) {
    const headWrap = document.createElement('div');
    headWrap.className = 'newsletter-heading';
    headWrap.innerHTML = window.DOMPurify.sanitize(headingCell.innerHTML, DOMPURIFY);
    inner.append(headWrap);
  }

  const controls = document.createElement('div');
  controls.className = 'newsletter-controls';

  const input = document.createElement('input');
  input.type = 'email';
  input.name = 'email';
  input.className = 'newsletter-input';
  input.placeholder = placeholder;
  input.setAttribute('aria-label', placeholder);
  input.required = true;

  const btn = document.createElement('button');
  btn.type = 'submit';
  btn.className = 'newsletter-submit';
  btn.textContent = buttonLabel;

  controls.append(input, btn);
  inner.append(controls);

  if (disclaimerCell) {
    const disc = document.createElement('div');
    disc.className = 'newsletter-disclaimer';
    disc.innerHTML = window.DOMPurify.sanitize(disclaimerCell.innerHTML, DOMPURIFY);
    inner.append(disc);
  }

  form.append(inner);
  block.textContent = '';
  block.append(form);
}

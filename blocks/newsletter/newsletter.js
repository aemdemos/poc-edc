import { getBlockId, ensureDOMPurify } from '../../scripts/scripts.js';
import { DOMPURIFY } from '../../scripts/aem.js';

/**
 * Newsletter signup strip (heading + disclaimer + email field UI).
 * Form posts externally on source site; here we provide accessible UI only.
 * @param {Element} block
 */
export default async function decorate(block) {
  const blockId = getBlockId('newsletter');
  block.setAttribute('id', blockId);
  block.setAttribute('aria-label', `Newsletter signup ${blockId}`);
  block.setAttribute('role', 'region');

  const rows = [...block.children].filter((r) => r.tagName === 'DIV');
  const headingHtml = rows[0]?.firstElementChild?.innerHTML || rows[0]?.innerHTML || '';
  const disclaimerHtml = rows[1]?.firstElementChild?.innerHTML || rows[1]?.innerHTML || '';

  block.textContent = '';

  const inner = document.createElement('div');
  inner.className = 'newsletter-inner';

  const heading = document.createElement('div');
  heading.className = 'newsletter-heading';

  const form = document.createElement('form');
  form.className = 'newsletter-form';
  form.setAttribute('action', '#');
  form.setAttribute('method', 'post');

  const wrap = document.createElement('div');
  wrap.className = 'newsletter-controls';

  const input = document.createElement('input');
  input.type = 'email';
  input.name = 'emailAddress';
  input.autocomplete = 'email';
  input.placeholder = 'Business email address';
  input.setAttribute('aria-label', 'Business email address');
  input.required = true;
  input.className = 'newsletter-input';

  const btn = document.createElement('button');
  btn.type = 'submit';
  btn.className = 'newsletter-submit';
  btn.textContent = 'Subscribe';

  wrap.append(input, btn);

  const disclaimer = document.createElement('div');
  disclaimer.className = 'newsletter-disclaimer';

  inner.append(heading, form);
  form.append(wrap, disclaimer);
  block.append(inner);

  await ensureDOMPurify();
  heading.innerHTML = window.DOMPurify.sanitize(headingHtml, DOMPURIFY);
  disclaimer.innerHTML = window.DOMPurify.sanitize(disclaimerHtml, DOMPURIFY);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
  });
}

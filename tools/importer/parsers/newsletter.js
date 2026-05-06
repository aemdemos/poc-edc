import { escapeHtml } from '../utils/dom-utils.js';

/**
 * @param {Document} document
 * @returns {{ blockName: string, cells: string[][] }}
 */
export function parse(document) {
  const label = document.querySelector('.c-subscription-centre label.subscription-text, label.subscription-text');
  const consent = document.querySelector('.c-subscription-centre .subscription-consent-text');
  const input = document.querySelector('.c-subscription-centre input.subscription-input, .subscription-input');
  const btn = document.querySelector('.c-subscription-centre button.subscription-btn, button.subscription-btn');

  const heading = label?.textContent?.trim() || '';
  const disclaimer = consent?.textContent?.trim() || '';
  const placeholder = input?.getAttribute('placeholder')?.trim() || '';
  const buttonLabel = btn?.textContent?.trim() || '';

  return {
    blockName: 'Newsletter',
    cells: [
      [`<h2>${escapeHtml(heading)}</h2>`],
      [`<p>${escapeHtml(disclaimer)}</p>`],
      [escapeHtml(placeholder), escapeHtml(buttonLabel)],
    ],
  };
}

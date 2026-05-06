/**
 * @param {Document} document
 * @returns {{ blockName: string, cells: string[][] }}
 */
export function parse(document) {
  const form = document.querySelector('form.subscription-form, section.c-subscription-centre form');
  const label = form?.querySelector('label.subscription-text, label');
  const consent = form?.querySelector('.subscription-consent-text, p.subscription-consent-text');

  const heading = label?.textContent?.trim() || '';
  const disclaimer = consent?.textContent?.trim() || '';

  return {
    blockName: 'Newsletter',
    cells: [
      [heading],
      [disclaimer],
    ],
  };
}

export default { parse };

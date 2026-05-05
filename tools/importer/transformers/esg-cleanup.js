/* global WebImporter */

/**
 * Cleanup transformer for EDC ESG pages.
 * Key principle: <div class="key-line"> elements are section dividers → convert to <hr>
 */
export default function transform(hookName, element, { document }) {
  if (hookName === 'beforeTransform') {
    // Remove cookie banners, scripts, styles
    WebImporter.DOMUtils.remove(element, [
      '#onetrust-consent-sdk',
      '#onetrust-banner-sdk',
      '#onetrust-pc-sdk',
      '.onetrust-pc-dark-filter',
      'script',
      'style',
      'noscript',
      'link[rel="stylesheet"]',
      'iframe',
    ]);

    // Remove header and footer
    WebImporter.DOMUtils.remove(element, [
      '.header',
      '.c-header',
      '#header',
      'header',
      '.footer',
      '.c-footer',
      '#footer',
      'footer',
      '.c-newsletter',
      '[class*="skip-nav"]',
    ]);

    // Remove responsive duplicates
    element.querySelectorAll('[class*="default--hide"]').forEach((el) => el.remove());

    // Remove empty headings
    element.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((heading) => {
      if (!heading.textContent.trim()) heading.remove();
    });

    // CRITICAL: Convert key-line divs to <hr> section breaks
    // Each .c-keyline contains a .key-line div — these mark section boundaries
    element.querySelectorAll('.c-keyline, [class*="c-keyline"]').forEach((keyline) => {
      const hr = document.createElement('hr');
      keyline.replaceWith(hr);
    });
    // Also catch standalone .key-line that may not be inside .c-keyline
    element.querySelectorAll('.key-line, [class*="key-line"]').forEach((keyline) => {
      const hr = document.createElement('hr');
      keyline.replaceWith(hr);
    });

    // Extract date modified and store on body
    element.querySelectorAll('.modifieddate, section.c-date-modified, .c-date-modified, [class*="modifieddate"]').forEach((el) => {
      const dateSpan = el.querySelector('.c-date-modified__date, span');
      if (dateSpan) {
        document.body.setAttribute('data-date-modified', dateSpan.textContent.trim());
      }
      const container = el.closest('.modifieddate') || el.closest('[class*="modified"]') || el;
      container.remove();
    });

    // Add squiggle icon to the overview/intro section
    const showIcon = element.querySelector('.show-icon');
    if (showIcon) {
      const squiggleImg = document.createElement('img');
      squiggleImg.src = `${window.location.origin}/etc.clientlibs/edc/clientlibs/clientlib-base/resources/images/squiggle.svg`;
      squiggleImg.alt = '';
      const squiggleP = document.createElement('p');
      squiggleP.appendChild(squiggleImg);
      const overviewText = element.querySelector('[class*="overviewtext"], [class*="overview"]');
      if (overviewText) {
        const introP = overviewText.querySelector('p');
        if (introP) introP.before(squiggleP);
      }
      showIcon.remove();
    }

    // Enable body scrolling
    document.body.style.overflow = 'auto';
  }

  if (hookName === 'afterTransform') {
    // Remove consecutive <hr> elements (which cause empty sections)
    let prevWasHr = false;
    [...element.children].forEach(el => {
      if (el.tagName === 'HR') {
        if (prevWasHr) { el.remove(); return; }
        prevWasHr = true;
      } else {
        prevWasHr = false;
      }
    });

    // Remove empty elements
    [...element.children].forEach(el => {
      if ((el.tagName === 'DIV' || el.tagName === 'SECTION' || el.tagName === 'P') &&
          !el.textContent.trim() && !el.querySelector('img, picture, table, a, hr')) {
        el.remove();
      }
    });
  }
}

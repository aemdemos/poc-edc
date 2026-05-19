/* global WebImporter */

/**
 * Cleanup transformer for EDC article-detail pages.
 * Removes non-content elements before and after block parsing.
 */
export default function transform(hookName, element, { document }) {
  if (hookName === 'beforeTransform') {
    // Remove header, footer, scripts, styles
    // Note: don't remove <header> inside .articlehero — it contains the hero content
    WebImporter.DOMUtils.remove(element, [
      'header:not(.articlehero header)',
      'footer',
      'script',
      'style',
      'noscript',
      'link[rel="stylesheet"]',
      'link[rel="preload"]',
      'iframe',
      'meta',
      '#onetrust-consent-sdk',
      '#onetrust-banner-sdk',
      '.header',
      '.c-header',
      '.footer',
      '.c-footer',
      '.c-global-footer',
      '[class*="experience-fragment"]',
      '.xfpage',
    ]);

    // Remove sidebar and non-content elements
    WebImporter.DOMUtils.remove(element, [
      '.articlerightcontainer',
      '.onpagenavigation',
      '.newslettersubscription',
      '.tagcloud',
      '.c-recommended-articles ul',
      '.c-date-modified',
      '[class*="skip-nav"]',
      '.breadcrumb',
    ]);

    // Remove responsive hide elements
    element.querySelectorAll('[class*="default--hide"]').forEach((el) => el.remove());

    // Remove empty headings
    element.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((heading) => {
      if (!heading.textContent.trim()) heading.remove();
    });

    // Extract date and store for later use
    const timeEl = element.querySelector('time.c-tidvi, time');
    if (timeEl) {
      document.body.setAttribute('data-article-date', timeEl.textContent.trim());
    }
  }

  if (hookName === 'afterTransform') {
    // Remove consecutive <hr> elements
    element.querySelectorAll('hr + hr').forEach((hr) => hr.remove());

    // Remove empty divs
    element.querySelectorAll('div:empty').forEach((div) => div.remove());

    // Clean up remaining inline styles
    element.querySelectorAll('[style]').forEach((el) => el.removeAttribute('style'));

    // Clean up data attributes
    const dataAttrs = ['data-uuid', 'data-event-component', 'data-event-type',
      'data-event-name', 'data-event-engagement', 'data-event-level',
      'data-tap-close', 'i18n-title'];
    element.querySelectorAll('*').forEach((el) => {
      dataAttrs.forEach((attr) => el.removeAttribute(attr));
    });
  }
}

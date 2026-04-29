/* global WebImporter */

/**
 * Cleanup transformer for EDC annual report pages
 * Removes non-content elements, fixes structure, and deduplicates responsive variants.
 */
export default function transform(hookName, element, { document }) {
  if (hookName === 'beforeTransform') {
    // Remove cookie banners, consent dialogs, tracking pixels
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

    // Remove header and footer (campaign-specific, not content)
    WebImporter.DOMUtils.remove(element, [
      '.headerCampaign',
      '.header-container',
      'header.campaign-sticky-nav',
      '.footerCampaign',
      'footer#footer',
      'footer.campaign-footer',
    ]);

    // Keep the sticky nav bar content (report title + Download Report CTA)
    // It will be extracted as its own section by the import script

    // Remove date modified section (captured in metadata)
    WebImporter.DOMUtils.remove(element, [
      '.modifieddate',
      'section.c-date-modified',
    ]);

    // Remove keyline separators (become section breaks)
    WebImporter.DOMUtils.remove(element, [
      '.c-keyline',
      '.key-line',
    ]);

    // CRITICAL: Deduplicate responsive variants
    // The EDC site renders duplicate DOM elements for different breakpoints.
    // Elements with `default--hide` are hidden at desktop → these are the duplicates → REMOVE
    const defaultHideElements = element.querySelectorAll('[class*="default--hide"]');
    defaultHideElements.forEach((el) => el.remove());

    // Remove empty text blocks (spacer paragraphs)
    element.querySelectorAll('.cmp-text').forEach((textBlock) => {
      const text = textBlock.textContent.trim().replace(/ /g, '').replace(/\s/g, '');
      if (!text) {
        const parent = textBlock.closest('.text');
        if (parent) parent.remove();
      }
    });

    // Remove empty headings (source HTML sometimes has empty h2 tags)
    element.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((heading) => {
      if (!heading.textContent.trim()) heading.remove();
    });

    // Enable body scrolling
    document.body.style.overflow = 'auto';
  }

  if (hookName === 'afterTransform') {
    // Remove the #maincontent empty div
    WebImporter.DOMUtils.remove(element, ['#maincontent']);

    // Clean remaining empty structural divs
    element.querySelectorAll('.responsivegrid, .aem-Grid, .aem-GridColumn').forEach((div) => {
      // Only remove if it has no meaningful content
      if (!div.textContent.trim() && !div.querySelector('img, picture, table, a')) {
        div.remove();
      }
    });
  }
}

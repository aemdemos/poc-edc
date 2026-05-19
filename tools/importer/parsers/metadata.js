/* global WebImporter */

/**
 * Metadata parser
 * Extracts page metadata (title, description, template, date, category)
 * and creates the metadata block table.
 *
 * This parser operates on the full document, not a single element.
 * Source DOM: head meta, title, time.c-tidvi, [data-primary-tag]
 */
export default function parse(element, { document, main }) {
  const meta = {};

  const title = document.querySelector('title');
  if (title) meta.Title = title.textContent.trim();

  const description = document.querySelector('meta[name="description"]');
  if (description) meta.Description = description.getAttribute('content')?.trim();

  meta.Template = 'article-detail';

  const timeEl = document.querySelector('time.c-tidvi, time[dateTime]');
  if (timeEl) {
    const dateTime = timeEl.getAttribute('dateTime') || timeEl.textContent.trim();
    const parsed = new Date(dateTime);
    if (!Number.isNaN(parsed.getTime())) {
      meta.Date = parsed.toISOString().split('T')[0];
    } else {
      meta.Date = dateTime;
    }
  }

  const categoryEl = document.querySelector('.data-article-category, [data-primary-tag]');
  if (categoryEl) meta.Category = categoryEl.textContent.trim();

  const block = WebImporter.Blocks.getMetadataBlock(document, meta);
  main.appendChild(block);
}

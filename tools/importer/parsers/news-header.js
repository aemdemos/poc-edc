/**
 * Parses the news article header component.
 * Extracts H1 title, publication date (with datetime attribute), and location.
 *
 * Source selector: .headersection .c-news-room-header
 *
 * @param {Element} element - The .c-news-room-header element
 * @param {Document} document - The source document
 * @returns {object} Block definition for the news header
 */
export default function parse(element, document) {
  const titleEl = element.querySelector('h1, .title');
  const timeEl = element.querySelector('time');
  const locationEl = element.querySelector('.location');

  const title = titleEl ? titleEl.textContent.trim() : '';
  const date = timeEl ? timeEl.textContent.trim() : '';
  const datetime = timeEl ? timeEl.getAttribute('datetime') || '' : '';
  const location = locationEl ? locationEl.textContent.trim() : '';

  return {
    block: 'news-header',
    content: {
      title,
      date,
      datetime,
      location,
    },
  };
}

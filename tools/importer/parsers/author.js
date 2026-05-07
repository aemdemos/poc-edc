import { fixImageForDA } from '../fix-images-for-da.js';

/**
 * Parses the article author sidebar component.
 * Extracts author photo, name, bio link, position, company, phone, and email.
 * Handles multiple authors if present.
 *
 * Source selector: .articleauthors .authors
 *
 * @param {Element} element - The .authors container element
 * @param {Document} document - The source document
 * @returns {object} Block definition with author data
 */
export default function parse(element, document) {
  const authorEls = element.querySelectorAll('.author');
  const authors = [];

  authorEls.forEach((authorEl) => {
    const img = authorEl.querySelector('img');
    const nameEl = authorEl.querySelector('.name, [itemprop="name"]');
    const positionEl = authorEl.querySelector('.position');
    const companyEl = authorEl.querySelector('.company');
    const phoneEl = authorEl.querySelector('.phone, [itemprop="telephone"]');
    const emailEl = authorEl.querySelector('.email, [itemprop="email"]');
    const bioLink = authorEl.querySelector('a[href*="/bio/"]');

    const author = {};

    if (img) {
      author.image = fixImageForDA(img.getAttribute('src'), 'default');
      author.imageAlt = img.getAttribute('alt') || '';
    }

    if (nameEl) author.name = nameEl.textContent.trim();
    if (positionEl) author.position = positionEl.textContent.trim();
    if (companyEl) author.company = companyEl.textContent.trim();
    if (phoneEl) author.phone = phoneEl.textContent.trim();
    if (emailEl) author.email = emailEl.textContent.trim();
    if (bioLink) author.bioUrl = bioLink.getAttribute('href') || '';

    authors.push(author);
  });

  return {
    block: 'author',
    content: authors,
  };
}

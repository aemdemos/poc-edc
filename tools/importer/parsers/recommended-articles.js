import { fixImageForDA } from '../fix-images-for-da.js';

/**
 * Parses the recommended articles / "You should also check out" section.
 * Extracts section title and card data including image, link title,
 * description, and CTA button.
 *
 * Source selector: .recommended-articles-premium-wrapper
 *
 * @param {Element} element - The recommended articles wrapper element
 * @param {Document} document - The source document
 * @returns {object} Block definition with recommended article cards
 */
export default function parse(element, document) {
  const titleEl = element.querySelector('h2.title');
  const cards = element.querySelectorAll('.recommended-article-premium, .recommended-article-content');

  const content = {
    heading: titleEl ? titleEl.textContent.trim() : '',
    cards: [],
  };

  // Parse individual recommended cards
  const cardContainers = element.querySelectorAll('.recommended-article-content');
  cardContainers.forEach((card) => {
    const cardData = parseCard(card);
    if (cardData) content.cards.push(cardData);
  });

  // Fallback: if no .recommended-article-content, parse the wrapper directly
  if (content.cards.length === 0) {
    const directCard = parseCard(element);
    if (directCard) content.cards.push(directCard);
  }

  return {
    block: 'cards',
    variant: 'recommended',
    content,
  };
}

/**
 * Parses a single recommended article card.
 */
function parseCard(cardEl) {
  const img = cardEl.querySelector('img');
  const titleLink = cardEl.querySelector('a.ra-premium, .description-text a');
  const descEl = cardEl.querySelector('.description-text p, p.small');
  const ctaLink = cardEl.querySelector('.c-interaction-button, .card-actions a');

  if (!titleLink && !img) return null;

  const card = {};

  // Image with full metadata
  if (img) {
    card.image = fixImageForDA(img.getAttribute('src'), 'default');
    card.imageAlt = img.getAttribute('alt') || '';
    card.imageTitle = img.getAttribute('title') || '';
  }

  // Title and primary link
  if (titleLink) {
    card.title = titleLink.textContent.trim();
    card.href = titleLink.getAttribute('href') || '';
    card.target = titleLink.getAttribute('target') || '_self';
  }

  // Description text
  if (descEl) {
    card.description = descEl.textContent.trim();
  }

  // CTA button
  if (ctaLink) {
    card.cta = {
      text: ctaLink.textContent.trim(),
      href: ctaLink.getAttribute('href') || '',
    };
  }

  return card;
}

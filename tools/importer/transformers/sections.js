/**
 * Section configuration for the ECBVerdyol case study import.
 * Assembly is performed in import.mjs; this module documents boundaries + utilities.
 */

export const SECTIONS = [
  {
    name: 'hero',
    detect: (doc) => doc.querySelector('section.c-page-hero-banner, section[role="banner"]'),
    metadata: { style: 'hero' },
  },
  {
    name: 'breadcrumb',
    detect: (doc) => doc.querySelector('nav[aria-label="Breadcrumb"]'),
    metadata: {},
  },
  {
    name: 'article-body',
    detect: (doc) => doc.querySelector('.articlebodycontainer .article-body, .article-body'),
    metadata: { style: 'article' },
  },
  {
    name: 'sidebar',
    detect: (doc) => doc.querySelector('.articlerightcontainer'),
    metadata: { style: 'sidebar' },
  },
  {
    name: 'cta',
    detect: (doc) => doc.querySelector('.article-body .cmp-text'),
    metadata: {},
  },
  {
    name: 'newsletter',
    detect: (doc) => doc.querySelector('section.c-subscription-centre, form.subscription-form'),
    metadata: { style: 'highlight', 'background-color': '#E5EDF7' },
  },
];

/**
 * Optional DOM pass (reserved for future stripping). Currently a no-op.
 * @param {Document} document
 * @returns {Document}
 */
export default function transform(document) {
  return document;
}

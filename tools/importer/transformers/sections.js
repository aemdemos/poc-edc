/**
 * Section configuration and optional post-parse DOM markers.
 * Final HTML assembly is performed in import.js; this module documents
 * section intent and can pre-mark nodes when needed.
 */

/**
 * @typedef {Object} SectionDef
 * @property {string} name
 * @property {(doc: Document) => Element | null} detect
 * @property {Record<string, string>} [metadata]
 */

/** @type {SectionDef[]} */
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
    detect: (doc) => doc.querySelector('.article-body, .articlebodycontainer .article-body'),
    metadata: { style: 'article' },
  },
  {
    name: 'sidebar',
    detect: (doc) => doc.querySelector('.articlerightcontainer'),
    metadata: { style: 'sidebar' },
  },
  {
    name: 'cta',
    detect: (doc) => doc.querySelector('.cmp-text h2'),
    metadata: {},
  },
  {
    name: 'newsletter',
    detect: (doc) => doc.querySelector('section.c-subscription-centre, .c-subscription-centre'),
    metadata: { style: 'highlight', 'background-color': '#E5EDF7' },
  },
];

/**
 * No-op transform; section assembly is done in import.js.
 * @param {Document} document
 * @returns {Document}
 */
export function transform(document) {
  return document;
}

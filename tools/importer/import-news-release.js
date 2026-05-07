/**
 * News Release Import Script - Orchestrator
 *
 * This script is ONLY an orchestrator. It:
 * 1. Loads the template definition from page-templates.json
 * 2. Applies the cleanup transformer to the source DOM
 * 3. Matches DOM elements using selectors defined in the template
 * 4. Delegates all parsing to individual parser modules via a registry
 * 5. Assembles the final page structure with proper section breaks
 * 6. Generates EDS-compatible HTML output for DA and Universal Editor
 *
 * NO inline parser logic belongs in this file.
 */

import { cleanup, splitIntoSections, extractMetadata } from './transformers/news-cleanup.js';

// Parser registry - each parser is a standalone module
import parseNewsHeader from './parsers/news-header.js';
import parseAuthor from './parsers/author.js';
import parseArticleBody from './parsers/article-body.js';
import parseAboutSection from './parsers/about-section.js';
import parseMediaContact from './parsers/media-contact.js';
import parseRecommendedArticles from './parsers/recommended-articles.js';

import templateConfig from './page-templates.json' assert { type: 'json' };

const TEMPLATE_KEY = 'news-release';

/**
 * Parser registry: maps parser names from page-templates.json to functions.
 */
const PARSER_REGISTRY = {
  'news-header': parseNewsHeader,
  author: parseAuthor,
  'article-body': parseArticleBody,
  'about-section': parseAboutSection,
  'media-contact': parseMediaContact,
  'recommended-articles': parseRecommendedArticles,
};

/**
 * Locates the main content container in the page DOM.
 * Navigates the AEM responsive grid structure to find article content.
 *
 * @param {Document} document - The source document
 * @returns {Element|null} The root grid element
 */
function getContentRoot(document) {
  const root = document.querySelector('.root.responsivegrid');
  if (!root) return null;
  return root.querySelector(':scope > .aem-Grid');
}

/**
 * Finds a DOM element matching a block's selector within the page.
 *
 * @param {Document} document - The source document
 * @param {string} selector - CSS selector from the template
 * @returns {Element|null} The matched element
 */
function findBlock(document, selector) {
  return document.querySelector(selector);
}

/**
 * Main import function. Orchestrates the complete import pipeline.
 *
 * @param {Document} document - The source page DOM document
 * @param {object} options - Import options
 * @param {string} options.url - The source page URL
 * @param {string} options.outputPath - Override for the output path
 * @returns {object} Complete page structure for DA/UE authoring
 */
export default function importPage(document, options = {}) {
  const template = templateConfig[TEMPLATE_KEY];
  const url = options.url || '';

  // Step 1: Clean the DOM
  cleanup(document, template);

  // Step 2: Extract metadata
  const metadata = extractMetadata(document, template.metadata);

  // Step 3: Parse each block using the registry
  const parsedBlocks = [];

  template.blocks.forEach((blockDef) => {
    const { type, parser, selector } = blockDef;
    const parseFn = PARSER_REGISTRY[parser];

    if (!parseFn) return;

    const element = findBlock(document, selector);
    if (!element) return;

    const result = parseFn(element, document);
    if (result) {
      parsedBlocks.push({ ...result, _type: type });
    }
  });

  // Step 4: Check for section breaks in the content area
  const contentRoot = getContentRoot(document);
  let sections = [parsedBlocks];

  if (contentRoot) {
    const breakSelector = template.sectionBreak?.selector || '.key-line';
    const sectionElements = splitIntoSections(contentRoot, breakSelector);

    // If breaks were found, we regroup blocks into sections
    if (sectionElements.length > 1) {
      sections = regroupBlocksBySections(parsedBlocks, sectionElements, document, template);
    }
  }

  // Step 5: Determine output path (NOT as index page)
  const outputPath = options.outputPath || deriveOutputPath(url, template.outputPath);

  // Step 6: Assemble final page structure
  return {
    template: TEMPLATE_KEY,
    url,
    outputPath,
    metadata,
    sections: sections.map((sectionBlocks) => ({ blocks: sectionBlocks })),
  };
}

/**
 * Derives the output file path from the source URL.
 * Ensures the page is NOT created as an index page.
 *
 * @param {string} url - Source page URL
 * @param {string} basePath - Base output path from template
 * @returns {string} The resolved output path
 */
function deriveOutputPath(url, basePath) {
  if (!url) return basePath;

  try {
    const parsed = new URL(url);
    let path = parsed.pathname;

    // Ensure it ends with .html, not as index
    if (path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    if (!path.endsWith('.html')) {
      path += '.html';
    }

    return path;
  } catch {
    return basePath;
  }
}

/**
 * Regroups parsed blocks into sections based on DOM section boundaries.
 * This handles the case where key-line breaks split content.
 *
 * @param {object[]} parsedBlocks - All parsed blocks in order
 * @param {Element[][]} sectionElements - DOM sections split by breaks
 * @param {Document} document - Source document
 * @param {object} template - Template config
 * @returns {object[][]} Blocks grouped by section
 */
function regroupBlocksBySections(parsedBlocks, sectionElements, document, template) {
  // For news pages that typically don't have section breaks,
  // return all blocks in a single section
  if (sectionElements.length <= 1) return [parsedBlocks];

  // Re-parse blocks per section for proper grouping
  const sections = sectionElements.map((elements) => {
    const sectionBlocks = [];

    template.blocks.forEach((blockDef) => {
      const { parser, selector } = blockDef;
      const parseFn = PARSER_REGISTRY[parser];
      if (!parseFn) return;

      // Check if any element in this section matches the selector
      elements.forEach((el) => {
        const match = el.matches?.(selector) ? el : el.querySelector?.(selector);
        if (match) {
          const result = parseFn(match, document);
          if (result) sectionBlocks.push(result);
        }
      });
    });

    return sectionBlocks;
  });

  return sections.filter((s) => s.length > 0);
}

/**
 * Generates EDS-compatible HTML for DA and Universal Editor.
 * Uses the div-based block format matching the project's content structure.
 * Each section is a top-level <div>, blocks use <div class="blockname"> with row divs.
 *
 * @param {object} page - Page structure from importPage()
 * @param {string} imagePrefix - Relative path prefix for images (e.g. './.india-canadian-suppliers/')
 * @returns {string} HTML string in .plain.html format
 */
export function generateHTML(page, imagePrefix = '') {
  if (!page || !page.sections) return '';

  const parts = [];

  page.sections.forEach((section) => {
    const sectionHTML = [];

    section.blocks.forEach((block) => {
      sectionHTML.push(renderBlock(block, imagePrefix));
    });

    if (sectionHTML.length > 0) {
      parts.push(`<div>${sectionHTML.join('')}</div>`);
    }
  });

  // Append metadata section
  if (page.metadata && Object.keys(page.metadata).length > 0) {
    parts.push(renderMetadataBlock(page.metadata));
  }

  return parts.join('\n');
}

/**
 * Renders a single parsed block into EDS div-based block HTML.
 *
 * @param {object} block - Parsed block data
 * @param {string} imagePrefix - Relative path prefix for images
 * @returns {string} HTML block
 */
function renderBlock(block, imagePrefix) {
  switch (block.block) {
    case 'news-header': return renderNewsHeader(block.content);
    case 'author': return renderAuthor(block.content, imagePrefix);
    case 'article-body': return renderArticleBody(block.content);
    case 'about-section': return renderAboutSection(block.content);
    case 'media-contact': return renderMediaContact(block.content);
    case 'cards': return renderCards(block, imagePrefix);
    default: return '';
  }
}

function renderNewsHeader(content) {
  const id = slugify(content.title);
  let html = `<h1 id="${id}">${content.title}</h1>`;
  const metaParts = [];
  if (content.date) metaParts.push(content.date);
  if (content.location) metaParts.push(content.location);
  if (metaParts.length > 0) {
    html += `<p><em>${metaParts.join(' | ')}</em></p>`;
  }
  return html;
}

function renderAuthor(authors, imagePrefix) {
  if (!authors || authors.length === 0) return '';

  let html = '<div class="author">';

  authors.forEach((author) => {
    html += '<div>';
    // Image cell
    html += '<div>';
    if (author.image && author.image.url) {
      const filename = getFilename(author.image.url) || 'author-default.jpg';
      const src = imagePrefix ? `${imagePrefix}${filename}` : author.image.url;
      html += `<p><picture><img src="${src}" alt="${author.imageAlt || ''}"></picture></p>`;
    }
    html += '</div>';
    // Info cell
    html += '<div>';
    if (author.name) {
      html += author.bioUrl
        ? `<p><strong><a href="${author.bioUrl}">${author.name}</a></strong></p>`
        : `<p><strong>${author.name}</strong></p>`;
    }
    if (author.position) html += `<p>${author.position}</p>`;
    if (author.company) html += `<p>${author.company}</p>`;
    if (author.phone) html += `<p><a href="tel:${author.phone.replace(/[^+\d]/g, '')}">${author.phone}</a></p>`;
    if (author.email) html += `<p><a href="mailto:${author.email}">${author.email}</a></p>`;
    html += '</div>';
    html += '</div>';
  });

  html += '</div>';
  return html;
}

function renderArticleBody(content) {
  let html = '';

  content.forEach((item) => {
    switch (item.type) {
      case 'paragraph':
        html += `<p>${item.html}</p>`;
        break;
      case 'heading': {
        const id = slugify(item.text);
        html += `<h${item.level} id="${id}">${item.text}</h${item.level}>`;
        break;
      }
      case 'list':
        html += `<${item.listType}>`;
        item.items.forEach((li) => { html += `<li>${li.html}</li>`; });
        html += `</${item.listType}>`;
        break;
      case 'image':
        if (item.images && item.images.length > 0) {
          html += `<p><picture><img src="${item.images[0].url}" alt="${item.alt || ''}"></picture></p>`;
        }
        break;
      case 'blockquote':
        html += `<blockquote>${item.html}</blockquote>`;
        break;
      default:
        if (item.html) html += `<p>${item.html}</p>`;
        break;
    }
  });

  return html;
}

function renderAboutSection(content) {
  let html = '';
  if (content.heading) {
    const id = slugify(content.heading);
    html += `<h${content.headingLevel} id="${id}">${content.heading}</h${content.headingLevel}>`;
  }
  content.paragraphs.forEach((p) => {
    html += `<p>${p.html}</p>`;
  });
  return html;
}

function renderMediaContact(content) {
  let html = '<div class="media-contact"><div><div>';

  if (content.heading) {
    html += `<p><strong>${content.heading}</strong></p>`;
  }
  content.details.forEach((detail) => {
    if (detail.href) {
      html += `<p><a href="${detail.href}">${detail.text}</a></p>`;
    } else {
      html += `<p>${detail.text}</p>`;
    }
  });

  html += '</div></div></div>';
  return html;
}

function renderCards(block, imagePrefix) {
  const { content } = block;
  let html = '<div class="cards">';

  content.cards.forEach((card) => {
    html += '<div>';
    // Image cell
    if (card.image) {
      html += '<div>';
      const filename = getFilename(card.image.url);
      const src = imagePrefix ? `${imagePrefix}${filename}` : card.image.url;
      html += `<p><picture><img src="${src}" alt="${card.imageAlt || ''}"></picture></p>`;
      html += '</div>';
    }
    // Text cell
    html += '<div>';
    if (card.title) html += `<p><strong><a href="${card.href || ''}">${card.title}</a></strong></p>`;
    if (card.description) html += `<p>${card.description}</p>`;
    if (card.cta) html += `<p><a href="${card.cta.href}">${card.cta.text}</a></p>`;
    html += '</div>';
    html += '</div>';
  });

  html += '</div>';
  return html;
}

function renderMetadataBlock(metadata) {
  let html = '<div><div class="metadata">';

  Object.entries(metadata).forEach(([key, value]) => {
    if (value && value !== 'null') {
      html += `<div><div>${capitalize(key)}</div><div>${value}</div></div>`;
    }
  });

  html += '</div></div>';
  return html;
}

function getFilename(url) {
  if (!url) return '';
  const parts = url.split('/');
  return parts[parts.length - 1].split('?')[0];
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

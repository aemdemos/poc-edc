import { fixImageForDA, extractPictureData } from '../fix-images-for-da.js';

/**
 * Parses the main article body rich text content.
 * Preserves full HTML structure including paragraphs, headings, bold,
 * links (with href, target, title attributes), and inline images.
 *
 * Source selector: .articlebodycontainer .article-body .responsivegrid .cmp-text
 *
 * @param {Element} element - The .cmp-text element containing article body
 * @param {Document} document - The source document
 * @returns {object} Block definition with structured content array
 */
export default function parse(element, document) {
  const children = [...element.children];
  const content = [];

  children.forEach((child) => {
    const tag = child.tagName.toLowerCase();

    if (tag === 'p') {
      content.push(parseParagraph(child));
    } else if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6') {
      content.push({
        type: 'heading',
        level: parseInt(tag.charAt(1), 10),
        text: child.textContent.trim(),
      });
    } else if (tag === 'ul' || tag === 'ol') {
      content.push(parseList(child, tag));
    } else if (tag === 'picture') {
      const picData = extractPictureData(child);
      content.push({
        type: 'image',
        ...picData,
      });
    } else if (tag === 'img') {
      content.push({
        type: 'image',
        images: [fixImageForDA(child.getAttribute('src'), 'default')],
        alt: child.getAttribute('alt') || '',
        title: child.getAttribute('title') || '',
      });
    } else if (tag === 'blockquote') {
      content.push({
        type: 'blockquote',
        text: child.textContent.trim(),
        html: child.innerHTML,
      });
    } else if (child.textContent.trim()) {
      content.push({
        type: 'text',
        html: child.innerHTML,
        text: child.textContent.trim(),
      });
    }
  });

  return {
    block: 'article-body',
    content,
  };
}

/**
 * Parses a paragraph element preserving links, bold, italic, and tooltips.
 */
function parseParagraph(p) {
  const links = [...p.querySelectorAll('a')].map((a) => ({
    text: a.textContent.trim(),
    href: a.getAttribute('href') || '',
    target: a.getAttribute('target') || '',
    title: a.getAttribute('title') || '',
  }));

  const boldParts = [...p.querySelectorAll('b, strong')].map((b) => b.textContent.trim());

  return {
    type: 'paragraph',
    text: p.textContent.trim(),
    html: p.innerHTML,
    links,
    bold: boldParts,
  };
}

/**
 * Parses a list element (ul/ol) into structured items.
 */
function parseList(listEl, tag) {
  const items = [...listEl.querySelectorAll('li')].map((li) => {
    const links = [...li.querySelectorAll('a')].map((a) => ({
      text: a.textContent.trim(),
      href: a.getAttribute('href') || '',
    }));
    return {
      text: li.textContent.trim(),
      html: li.innerHTML,
      links,
    };
  });

  return {
    type: 'list',
    listType: tag,
    items,
  };
}

/**
 * Parses the "About EDC" (or similar) boilerplate section.
 * Extracts the section heading and all body paragraphs with embedded links.
 *
 * Source selector: .centraltext .c-title-and-text
 *
 * @param {Element} element - The .c-title-and-text element
 * @param {Document} document - The source document
 * @returns {object} Block definition with heading and paragraphs
 */
export default function parse(element, document) {
  const heading = element.querySelector('h2, h3');
  const paragraphs = element.querySelectorAll('p');

  const content = {
    heading: heading ? heading.textContent.trim() : '',
    headingLevel: heading ? parseInt(heading.tagName.charAt(1), 10) : 2,
    paragraphs: [],
  };

  paragraphs.forEach((p) => {
    const text = p.textContent.trim();
    if (!text) return;

    const links = [...p.querySelectorAll('a')].map((a) => ({
      text: a.textContent.trim(),
      href: a.getAttribute('href') || '',
      target: a.getAttribute('target') || '',
    }));

    const boldParts = [...p.querySelectorAll('b, strong')].map((b) => b.textContent.trim());

    content.paragraphs.push({
      text,
      html: p.innerHTML,
      links,
      bold: boldParts,
    });
  });

  return {
    block: 'about-section',
    content,
  };
}

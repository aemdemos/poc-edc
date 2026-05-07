/**
 * Parses the media contact / spokesperson section.
 * Extracts heading, contact name, organization, phone, and email with links.
 *
 * Source selector: .spokesperson .c-spokesperson
 *
 * @param {Element} element - The .c-spokesperson element
 * @param {Document} document - The source document
 * @returns {object} Block definition with contact details
 */
export default function parse(element, document) {
  const heading = element.querySelector('h2, h3');
  const paragraphs = element.querySelectorAll('p');

  const contact = {
    heading: heading ? heading.textContent.trim() : 'Media Contact',
  };

  // Parse paragraphs - typically: name, organization, phone, email
  const details = [];
  paragraphs.forEach((p) => {
    const text = p.textContent.trim();
    if (!text) return;

    const link = p.querySelector('a');
    const entry = { text };

    if (link) {
      entry.href = link.getAttribute('href') || '';
      // Identify type from href
      if (entry.href.startsWith('tel:')) {
        entry.type = 'phone';
      } else if (entry.href.startsWith('mailto:')) {
        entry.type = 'email';
      } else {
        entry.type = 'link';
      }
    } else {
      // Heuristic: first paragraph is name, second is org
      if (details.length === 0) {
        entry.type = 'name';
      } else if (details.length === 1) {
        entry.type = 'organization';
      } else {
        entry.type = 'text';
      }
    }

    details.push(entry);
  });

  contact.details = details;

  return {
    block: 'media-contact',
    content: contact,
  };
}

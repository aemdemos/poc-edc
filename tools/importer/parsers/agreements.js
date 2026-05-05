/* global WebImporter */

/**
 * Agreements and Memberships parser
 * Extracts the agreements section with heading + body text + link + Section Metadata (highlight)
 * Searches for body text by content ("agreements and standards") since DOM nesting varies by page
 */
export default function parse(element, { document, main }) {
  const heading = [...main.querySelectorAll('h2')].find(h => h.textContent.toLowerCase().includes('agreements') && h.textContent.toLowerCase().includes('memberships'));
  if (!heading) return;

  const sectionDiv = document.createElement('div');
  const h2 = document.createElement('h2'); h2.textContent = heading.textContent.trim();
  sectionDiv.appendChild(h2);

  // Find the body text by searching for the "agreements and standards" paragraph
  let foundContent = false;
  const agreementsPara = [...main.querySelectorAll('p')].find(p =>
    p.textContent.includes('agreements and standards') || p.textContent.includes('contributing member'));
  if (agreementsPara) {
    const p = document.createElement('p'); p.textContent = agreementsPara.textContent.trim();
    sectionDiv.appendChild(p);
    const nextP = agreementsPara.nextElementSibling;
    if (nextP && nextP.tagName === 'P' && nextP.querySelector('a')) {
      const linkP = document.createElement('p'); linkP.innerHTML = nextP.innerHTML;
      sectionDiv.appendChild(linkP); nextP.remove();
    }
    agreementsPara.remove();
    foundContent = true;
  }

  // Fallback: sibling traversal
  if (!foundContent) {
    let sibling = heading.nextElementSibling;
    while (sibling) {
      if (sibling.tagName === 'H2' || sibling.tagName === 'HR') break;
      if (sibling.tagName === 'P') {
        const p = document.createElement('p');
        const link = sibling.querySelector('a');
        if (link) { p.innerHTML = sibling.innerHTML; } else { p.textContent = sibling.textContent.trim(); }
        if (p.textContent.trim()) { sectionDiv.appendChild(p); foundContent = true; }
        const next = sibling.nextElementSibling; sibling.remove(); sibling = next;
      } else if (sibling.tagName === 'DIV') {
        sibling.querySelectorAll('p').forEach(para => {
          if (para.textContent.trim()) {
            const p = document.createElement('p');
            const link = para.querySelector('a');
            if (link) { p.innerHTML = para.innerHTML; } else { p.textContent = para.textContent.trim(); }
            sectionDiv.appendChild(p); foundContent = true;
          }
        });
        const next = sibling.nextElementSibling; sibling.remove(); sibling = next;
      } else { break; }
    }
  }

  // Section metadata for highlight styling
  const metaCells = [['Section Metadata'], ['style', 'highlight']];
  const metaTable = WebImporter.DOMUtils.createTable(metaCells, document);
  sectionDiv.appendChild(metaTable);

  // Agreements needs its own section
  const hrBefore = document.createElement('hr');
  const hrAfter = document.createElement('hr');
  heading.replaceWith(hrBefore, sectionDiv, hrAfter);
}

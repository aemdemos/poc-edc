/**
 * Sections transformer for EDC annual report pages
 * Inserts <hr> section breaks between logical content sections.
 * Also handles the overview/callout section and infographic+caption as default content.
 */
export default function transform(hookName, element, { document }) {
  if (hookName !== 'afterTransform') return;

  // Find the hero block table (already parsed)
  const heroTable = element.querySelector('table');
  if (heroTable) {
    const firstCell = heroTable.querySelector('td, th');
    if (firstCell && firstCell.textContent.trim() === 'Hero') {
      // Add section break after hero
      heroTable.after(document.createElement('hr'));
    }
  }

  // Find cards block tables and add section break after the last one
  const allTables = [...element.querySelectorAll('table')];
  const cardsTables = allTables.filter((t) => {
    const first = t.querySelector('td, th');
    return first && first.textContent.trim() === 'Cards';
  });

  if (cardsTables.length > 0) {
    const lastCardsTable = cardsTables[cardsTables.length - 1];
    lastCardsTable.after(document.createElement('hr'));
  }

  // Find columns block tables - add section break between each pair
  const columnsTables = allTables.filter((t) => {
    const first = t.querySelector('td, th');
    return first && first.textContent.trim() === 'Columns';
  });

  columnsTables.forEach((colTable, index) => {
    if (index < columnsTables.length - 1) {
      // Add break between columns blocks
      colTable.after(document.createElement('hr'));
    }
  });

  // Add section break after the last columns block (before overview section)
  if (columnsTables.length > 0) {
    const lastCol = columnsTables[columnsTables.length - 1];
    lastCol.after(document.createElement('hr'));
  }

  // Handle the overview/callout section (section.travel-brief)
  const overviewSection = element.querySelector('section.travel-brief, .overviewtext section');
  if (overviewSection) {
    const container = overviewSection.querySelector('.container') || overviewSection;
    const title = container.querySelector('h2.title, h2');
    const paragraphs = container.querySelectorAll('p');

    // Create clean default content for the overview
    const overviewDiv = document.createElement('div');

    if (title) {
      const h2 = document.createElement('h2');
      h2.textContent = title.textContent.trim();
      overviewDiv.appendChild(h2);
    }

    paragraphs.forEach((p) => {
      const text = p.textContent.trim();
      if (!text) return;

      const newP = document.createElement('p');
      const link = p.querySelector('a');
      if (link) {
        // Reconstruct paragraph with link
        const textBefore = p.textContent.substring(0, p.textContent.indexOf(link.textContent)).trim();
        if (textBefore) {
          newP.appendChild(document.createTextNode(textBefore));
        }
        const a = document.createElement('a');
        a.href = link.href;
        a.textContent = link.textContent.trim();
        if (link.title) a.title = link.title;
        newP.appendChild(a);
      } else {
        newP.textContent = text;
      }
      overviewDiv.appendChild(newP);
    });

    // Replace the overview section with clean content
    const overviewParent = overviewSection.closest('.overviewtext') || overviewSection;
    overviewParent.replaceWith(overviewDiv);

    // Add section break after overview
    overviewDiv.after(document.createElement('hr'));
  }

  // Handle the infographic with caption (.image-body-text.medium)
  const infographic = element.querySelector('section.image-body-text.medium, .image-body-text.medium');
  if (infographic) {
    const img = infographic.querySelector('.content-image img, .content-image picture img');
    const caption = infographic.querySelector('.image-caption p, .image-caption');

    const infoDiv = document.createElement('div');

    if (img) {
      const newImg = document.createElement('img');
      newImg.src = img.src;
      newImg.alt = img.alt || '';
      infoDiv.appendChild(newImg);
    }

    if (caption) {
      const em = document.createElement('em');
      em.textContent = caption.textContent.trim();
      const p = document.createElement('p');
      p.appendChild(em);
      infoDiv.appendChild(p);
    }

    const infoParent = infographic.closest('.imageinbodytext') || infographic;
    infoParent.replaceWith(infoDiv);
  }

  // Handle the climate targets text section (free text with heading, paragraphs, link)
  // This is already default content and should render as-is after cleanup
  // The text sections with .cmp-text containing h2 "2023 and 2030 climate targets"
  // should be preserved as default content - no transformation needed
}

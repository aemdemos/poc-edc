/* global WebImporter */

/**
 * Accordion block parser
 * Extracts [role="region"] elements with button titles + content paragraphs
 * Excludes "From 20XX" items (handled by tabs parser) and cookie/privacy items
 */
export default function parse(element, { document, main }) {
  const regions = main.querySelectorAll('[role="region"]');
  const items = [];

  regions.forEach((region) => {
    const button = region.querySelector('button');
    const heading = region.querySelector('h3');
    if (!button || !heading) return;
    const title = button.textContent.trim();
    if (title.includes('Cookie') || title.includes('Privacy') || !title) return;
    if (title.match(/From \d{4}/i)) return;

    const contentElements = [...region.children].filter(el => el.tagName !== 'H3');
    const richContent = document.createElement('div');
    contentElements.forEach(el => richContent.appendChild(el.cloneNode(true)));
    items.push({ title, richContent, region });
  });

  if (items.length === 0) return;

  // Group by proximity
  const groups = [];
  let group = [items[0]];
  for (let i = 1; i < items.length; i++) {
    const prev = items[i - 1].region;
    const curr = items[i].region;
    let distance = 0;
    let el = prev.nextElementSibling;
    while (el && el !== curr && distance < 5) { distance++; el = el.nextElementSibling; }
    if (distance < 5) { group.push(items[i]); }
    else { groups.push([...group]); group = [items[i]]; }
  }
  groups.push(group);

  groups.forEach(groupItems => {
    const rows = groupItems.map(item => {
      const titleCell = document.createElement('div'); titleCell.textContent = item.title;
      const contentCell = document.createElement('div');
      const paras = item.richContent.querySelectorAll('p, li');
      paras.forEach(p => {
        const newP = document.createElement('p');
        const link = p.querySelector('a');
        if (link) { newP.innerHTML = p.innerHTML; }
        else { newP.textContent = p.textContent.trim(); }
        if (newP.textContent.trim()) contentCell.appendChild(newP);
      });
      return [titleCell, contentCell];
    });
    const table = WebImporter.DOMUtils.createTable([['Accordion'], ...rows], document);
    groupItems[0].region.replaceWith(table);
    for (let i = 1; i < groupItems.length; i++) { if (groupItems[i].region.parentElement) groupItems[i].region.remove(); }
  });
}

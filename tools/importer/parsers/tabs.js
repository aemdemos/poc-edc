/* global WebImporter */

/**
 * Tabs block parser
 * Extracts [role="tablist"] + [role="tabpanel"] pairs into a Tabs block
 * Also extracts "From 20XX" accordion item and places it after the Tabs
 */
export default function parse(element, { document, main }) {
  const tablist = main.querySelector('[role="tablist"]');
  if (!tablist) return;

  const tabs = [...tablist.querySelectorAll('[role="tab"]')].filter(t => !t.textContent.includes('Cookie') && !t.textContent.includes('Privacy'));
  const panels = main.querySelectorAll('[role="tabpanel"]');
  if (tabs.length === 0) return;

  const rows = [];
  tabs.forEach((tab, i) => {
    const tabName = tab.textContent.trim();
    const panel = panels[i];
    const titleCell = document.createElement('div'); titleCell.textContent = tabName;
    const contentCell = document.createElement('div');
    if (panel) {
      const paras = panel.querySelectorAll('p');
      paras.forEach(p => { if (p.textContent.trim()) { const newP = document.createElement('p'); newP.textContent = p.textContent.trim(); contentCell.appendChild(newP); } });
    }
    if (!contentCell.textContent.trim()) contentCell.textContent = tabName;
    rows.push([titleCell, contentCell]);
  });

  const table = WebImporter.DOMUtils.createTable([['Tabs'], ...rows], document);
  const tabContainer = tablist.closest('[class*="tab"]') || tablist.parentElement;
  if (tabContainer) tabContainer.replaceWith(table);
  panels.forEach(p => { if (p.parentElement) p.remove(); });

  // Add "From 20XX" accordion after tabs
  const fromRegion = [...main.querySelectorAll('[role="region"]')].find(r => {
    const btn = r.querySelector('button');
    return btn && btn.textContent.match(/From \d{4}/i);
  });
  if (fromRegion) {
    const btn = fromRegion.querySelector('button');
    const contentElements = [...fromRegion.children].filter(el => el.tagName !== 'H3');
    const titleCell = document.createElement('div'); titleCell.textContent = btn.textContent.trim();
    const contentCell = document.createElement('div');
    contentElements.forEach(el => {
      const paras = el.querySelectorAll ? el.querySelectorAll('p') : [];
      paras.forEach(p => { if (p.textContent.trim()) { const newP = document.createElement('p'); newP.textContent = p.textContent.trim(); contentCell.appendChild(newP); } });
    });
    const accordionTable = WebImporter.DOMUtils.createTable([['Accordion'], [titleCell, contentCell]], document);
    table.after(accordionTable);
    fromRegion.remove();
  }
}

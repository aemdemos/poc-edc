/* global WebImporter */

/**
 * Cards block parser — handles multiple card patterns:
 * - News cards (.imageinbodytext with img + h3)
 * - Customer stories (list items with img + h3 link + description)
 * - KPI stats (h2 starting with $ or % + description paragraph)
 * - Policy cards (.c-product-form-card with title + description + link)
 */

/**
 * Parse News & Insights cards
 * Source: .imageinbodytext containers between News heading and next H2
 */
export function parseNewsCards(element, { document, main, getDesktopImgSrc }) {
  const newsHeading = [...main.querySelectorAll('h2')].find(h => h.textContent.toLowerCase().includes('news and'));
  if (!newsHeading) return;

  const cards = [];
  const elementsToRemove = [];

  const allImageBodyText = main.querySelectorAll('.imageinbodytext, [class*="imageinbodytext"]');
  const allEls = [...main.querySelectorAll('*')];
  const newsIdx = allEls.indexOf(newsHeading);
  const nextH2 = [...main.querySelectorAll('h2')].find(h => allEls.indexOf(h) > newsIdx && h !== newsHeading);
  const nextH2Idx = nextH2 ? allEls.indexOf(nextH2) : Infinity;

  allImageBodyText.forEach(container => {
    const containerIdx = allEls.indexOf(container);
    if (containerIdx <= newsIdx || containerIdx >= nextH2Idx) return;
    const img = container.querySelector('img');
    const h3 = container.querySelector('h3');
    if (!h3) return;
    const desc = [...container.querySelectorAll('p')].find(p => !p.querySelector('a') && p.textContent.trim().length > 10);
    const linkEl = container.querySelector('p a');

    const imageCell = document.createElement('div');
    if (img) { const newImg = document.createElement('img'); newImg.src = img.src; newImg.alt = img.alt || ''; imageCell.appendChild(newImg); }
    const textCell = document.createElement('div');
    const title = document.createElement('p');
    const strong = document.createElement('strong'); strong.textContent = h3.textContent.trim();
    title.appendChild(strong); textCell.appendChild(title);
    if (desc) { const p = document.createElement('p'); p.textContent = desc.textContent.trim(); textCell.appendChild(p); }
    if (linkEl) { const p = document.createElement('p'); const a = document.createElement('a'); a.href = linkEl.href; a.textContent = linkEl.textContent.trim(); p.appendChild(a); textCell.appendChild(p); }

    cards.push([imageCell, textCell]);
    elementsToRemove.push(container);
  });

  if (cards.length === 0) return;
  const h2 = document.createElement('h2'); h2.textContent = newsHeading.textContent.trim();
  const table = WebImporter.DOMUtils.createTable([['Cards'], ...cards], document);
  newsHeading.replaceWith(h2, table);
  elementsToRemove.forEach(el => { if (el.parentElement) el.remove(); });
}

/**
 * Parse Customer Stories cards
 * Source: list items with img + h3 link + description inside a "Customer stories" section
 */
export function parseCustomerStories(element, { document, main }) {
  const heading = [...main.querySelectorAll('h2')].find(h => h.textContent.includes('Customer stories'));
  if (!heading) return;

  const container = heading.parentElement;
  const list = container ? container.querySelector('ul, ol') : null;
  if (!list) return;

  const cards = [];
  list.querySelectorAll('li').forEach(li => {
    const img = li.querySelector('img');
    const titleLink = li.querySelector('h3 a');
    const desc = [...li.querySelectorAll('p')].find(p => !p.querySelector('a') && p.textContent.trim().length > 10);

    const imageCell = document.createElement('div');
    if (img) { const newImg = document.createElement('img'); newImg.src = img.src; newImg.alt = img.alt || ''; imageCell.appendChild(newImg); }
    const textCell = document.createElement('div');
    if (titleLink) {
      const p = document.createElement('p'); const strong = document.createElement('strong');
      const a = document.createElement('a'); a.href = titleLink.href; a.textContent = titleLink.textContent.trim();
      strong.appendChild(a); p.appendChild(strong); textCell.appendChild(p);
    }
    if (desc) { const p = document.createElement('p'); p.textContent = desc.textContent.trim(); textCell.appendChild(p); }
    cards.push([imageCell, textCell]);
  });

  if (cards.length === 0) return;
  const h2 = document.createElement('h2'); h2.textContent = heading.textContent.trim();
  const table = WebImporter.DOMUtils.createTable([['Cards'], ...cards], document);
  heading.remove();
  list.replaceWith(h2, table);
}

/**
 * Parse KPI Stats cards (By the Numbers)
 * Source: h2 elements starting with $ or % followed by description paragraphs
 */
export function parseKpiStats(element, { document, main }) {
  const heading = [...main.querySelectorAll('h2')].find(h => h.textContent.toLowerCase().includes('by the numbers'));
  if (!heading) return;

  const cards = [];
  const elementsToRemove = [heading];

  const allH2s = [...main.querySelectorAll('h2')];
  const statH2s = allH2s.filter(h => h.textContent.trim().match(/^\$|^\d+\.?\d*%/));

  statH2s.forEach(statH2 => {
    let desc = statH2.nextElementSibling;
    if (!desc || desc.tagName !== 'P') { desc = statH2.parentElement.querySelector('p'); }
    if (desc) {
      const cell = document.createElement('div');
      const h = document.createElement('h2'); h.textContent = statH2.textContent.trim(); cell.appendChild(h);
      const p = document.createElement('p'); p.textContent = desc.textContent.trim(); cell.appendChild(p);
      cards.push([cell]);
      elementsToRemove.push(statH2, desc);
    }
  });

  if (cards.length === 0) return;

  // Find intro paragraph
  let introP = null;
  const introCandidate = [...main.querySelectorAll('p')].find(p => {
    const text = p.textContent.toLowerCase();
    return text.includes('measuring and monitoring') || text.includes('we believe that good') ||
           text.includes('performance is key') || text.includes('details on our');
  });
  if (introCandidate) { introP = introCandidate; elementsToRemove.push(introCandidate); }

  const sectionDiv = document.createElement('div');
  const h2 = document.createElement('h2'); h2.textContent = heading.textContent.trim();
  sectionDiv.appendChild(h2);
  if (introP) { const p = document.createElement('p'); p.innerHTML = introP.innerHTML; sectionDiv.appendChild(p); }
  const table = WebImporter.DOMUtils.createTable([['Cards'], ...cards], document);
  sectionDiv.appendChild(table);

  heading.replaceWith(sectionDiv);
  elementsToRemove.forEach(el => { if (el.parentElement) el.remove(); });
}

/**
 * Parse Policies & Reports cards
 * Source: .c-product-form-card containers with title + description + PDF link
 */
export function parsePoliciesReports(element, { document, main }) {
  const policyCards = document.querySelectorAll('.c-product-form-card');
  if (policyCards.length === 0) return;

  const cards = [];
  policyCards.forEach(card => {
    const titleEl = card.querySelector('h2.title, .card-content h2');
    const descEl = card.querySelector('p.description, .card-content p');
    const linkEl = card.querySelector('.card-actions a, a.c-interaction-button');
    if (!titleEl) return;

    const textCell = document.createElement('div');
    const titleP = document.createElement('p');
    const strong = document.createElement('strong'); strong.textContent = titleEl.textContent.trim();
    titleP.appendChild(strong); textCell.appendChild(titleP);
    if (descEl) { const p = document.createElement('p'); p.textContent = descEl.textContent.trim(); textCell.appendChild(p); }
    if (linkEl) { const p = document.createElement('p'); const a = document.createElement('a'); a.href = linkEl.href; a.textContent = linkEl.textContent.trim(); p.appendChild(a); textCell.appendChild(p); }
    cards.push([textCell]);
  });

  if (cards.length === 0) return;

  const heading = [...main.querySelectorAll('h2')].find(h => h.textContent.toLowerCase().includes('policies') && h.textContent.toLowerCase().includes('reports'));
  const complementary = document.querySelector('[role="complementary"], aside');

  const sectionDiv = document.createElement('div');
  if (heading) {
    const h2 = document.createElement('h2'); h2.textContent = heading.textContent.trim();
    sectionDiv.appendChild(h2);
    const intro = heading.nextElementSibling;
    if (intro && intro.tagName === 'P' && intro.textContent.trim().length > 20) {
      const p = document.createElement('p'); p.textContent = intro.textContent.trim();
      sectionDiv.appendChild(p);
    }
  }

  const table = WebImporter.DOMUtils.createTable([['Cards'], ...cards], document);
  sectionDiv.appendChild(table);

  const seeAll = [...main.querySelectorAll('a')].find(a => a.textContent.toLowerCase().includes('see all policies'));
  if (seeAll) {
    const p = document.createElement('p'); const a = document.createElement('a'); a.href = seeAll.href; a.textContent = seeAll.textContent.trim();
    p.appendChild(a); sectionDiv.appendChild(p);
  }

  if (complementary) { complementary.replaceWith(sectionDiv); }
  else if (heading) { heading.replaceWith(sectionDiv); }
}

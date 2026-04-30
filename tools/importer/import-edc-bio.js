/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import carouselParser from './parsers/carousel.js';
import columnsParser from './parsers/columns.js';

// TRANSFORMER IMPORTS
import edcCleanupTransformer from './transformers/edc-cleanup.js';

const PAGE_TEMPLATE = {
  name: 'edc-bio',
  description: 'EDC Author Bio / Profile page',
  urls: [
    'https://www.edc.ca/en/bio/isabel-dion.html',
  ],
};

export default {
  transform: (payload) => {
    const { document, url, html, params } = payload;
    const main = document.body;


    // 1. Extract modified date before cleanup removes it
    const modifiedEl = main.querySelector('.c-date-modified__date, .modifieddate');
    const modifiedDate = modifiedEl ? modifiedEl.textContent.trim().replace('Date modified:', '').trim() : '';

    // Remove non-content elements (header, footer, cookie banner)
    WebImporter.DOMUtils.remove(main, [
      '#onetrust-consent-sdk',
      '.modifieddate',
      'noscript',
    ]);

    // Remove viewport-hidden duplicates
    main.querySelectorAll('[class*="aem-GridColumn--default--hide"]').forEach((el) => el.remove());

    // 2. Build Hero block from author profile
    // Library Hero: 1 column, 1 row. Single cell contains: image, title (h1), subheading, CTA link
    const authorDetail = main.querySelector('.author-detail');
    if (authorDetail) {
      const authorBio = authorDetail.querySelector('.author.bio');
      const img = authorBio ? authorBio.querySelector('img') : null;
      const nameEl = authorDetail.querySelector('.info .name');
      const positionEl = authorDetail.querySelector('.info .position');
      const companyEl = authorDetail.querySelector('.info .company');
      const linkedinEl = authorDetail.querySelector('a.linkedin');
      const bioParas = authorDetail.querySelectorAll('p');

      const cellContent = [];

      // Background image
      if (img) {
        const pic = document.createElement('picture');
        const newImg = document.createElement('img');
        newImg.src = img.src;
        newImg.alt = nameEl ? nameEl.textContent.trim() : '';
        pic.appendChild(newImg);
        cellContent.push(pic);
      }
      // Name, position, company — each as H3
      if (nameEl) {
        const h3 = document.createElement('h3');
        h3.textContent = nameEl.textContent.trim();
        cellContent.push(h3);
      }
      if (positionEl) {
        const h3 = document.createElement('h3');
        h3.textContent = positionEl.textContent.trim();
        cellContent.push(h3);
      }
      if (companyEl && companyEl.textContent.trim()) {
        const h3 = document.createElement('h3');
        h3.textContent = companyEl.textContent.trim();
        cellContent.push(h3);
      }
      // LinkedIn as CTA
      if (linkedinEl) {
        const p = document.createElement('p');
        const a = document.createElement('a');
        a.href = linkedinEl.getAttribute('href');
        a.textContent = 'LinkedIn';
        p.appendChild(a);
        cellContent.push(p);
      }
      // Bio paragraphs
      bioParas.forEach((para) => {
        const text = para.textContent.trim();
        if (text && text.length > 20) {
          const p = document.createElement('p');
          p.textContent = text;
          cellContent.push(p);
        }
      });

      if (cellContent.length > 0) {
        const heroBlock = WebImporter.Blocks.createBlock(document, {
          name: 'hero',
          cells: [[cellContent]],
        });
        const profileContainer = authorDetail.closest('.authorprofile') || authorDetail.closest('.articlecontainer') || authorDetail;
        profileContainer.replaceWith(heroBlock);
      }
    }

    // 3. Build Cards block from article list
    const articleList = main.querySelector('.c-recommended-articles');
    if (articleList) {
      const heading = articleList.querySelector('h2.title');
      const articles = articleList.querySelectorAll('li.article');
      const cardsCells = [];

      // Build alternating Columns (tag | date) + Cards (image | title + desc) for each article
      const articleBlocks = [];

      articles.forEach((article) => {
        const img = article.querySelector('.card-img img');
        const titleLink = article.querySelector('.description h3 a');
        const desc = article.querySelector('.description p');
        const tag = article.querySelector('.taglabel');
        const date = article.querySelector('.date');

        // Columns block: tag (left) | date (right)
        if (tag || date) {
          const tagCell = [];
          if (tag) {
            const p = document.createElement('p');
            p.textContent = tag.textContent.trim();
            tagCell.push(p);
          }
          const dateCell = [];
          if (date) {
            const p = document.createElement('p');
            p.textContent = date.textContent.trim();
            dateCell.push(p);
          }
          const columnsBlock = WebImporter.Blocks.createBlock(document, {
            name: 'columns',
            cells: [[tagCell, dateCell]],
          });
          articleBlocks.push(columnsBlock);
        }

        // Cards block: image | title + description
        const imageCell = [];
        if (img) {
          const pic = document.createElement('picture');
          const newImg = document.createElement('img');
          newImg.src = img.src;
          newImg.alt = img.alt || '';
          pic.appendChild(newImg);
          imageCell.push(pic);
        }
        const contentCell = [];
        if (titleLink) {
          const h3 = document.createElement('h3');
          const a = document.createElement('a');
          a.href = titleLink.getAttribute('href');
          a.textContent = titleLink.textContent.trim();
          h3.appendChild(a);
          contentCell.push(h3);
        }
        if (desc) {
          const p = document.createElement('p');
          p.textContent = desc.textContent.trim();
          contentCell.push(p);
        }
        if (imageCell.length || contentCell.length) {
          const cardBlock = WebImporter.Blocks.createBlock(document, {
            name: 'cards',
            cells: [[imageCell, contentCell]],
          });
          articleBlocks.push(cardBlock);
        }
      });

      if (articleBlocks.length > 0) {
        const listContainer = articleList.closest('.list') || articleList;
        const wrapper = document.createElement('div');
        if (heading) {
          const h2 = document.createElement('h2');
          h2.textContent = heading.textContent.trim();
          wrapper.appendChild(h2);
        }
        articleBlocks.forEach((block) => wrapper.appendChild(block));
        listContainer.replaceWith(wrapper);
      }
    }

    // 4. Remove remaining non-content elements (header, footer, navigation)
    WebImporter.DOMUtils.remove(main, [
      '.header',
      '.headerv2',
      '.cmp-headerv2',
      'footer',
      '.footer',
      'link',
    ]);

    // 5. Rebuild main with flattened content in correct order
    // Find hero (first table), articles heading, and all article blocks
    const heroTable = main.querySelector('table');
    const articlesH2 = (() => {
      const h2s = main.querySelectorAll('h2');
      for (const h of h2s) {
        if (h.textContent.trim().toLowerCase().includes('other articles')) return h;
      }
      return null;
    })();
    // All tables after the hero are article blocks (columns + cards alternating)
    const allTables = Array.from(main.querySelectorAll('table'));
    const articleTables = allTables.slice(1);

    // Clear main and rebuild
    main.textContent = '';

    if (heroTable) main.appendChild(heroTable);
    // Section break
    const sectionHr = document.createElement('hr');
    main.appendChild(sectionHr);
    if (articlesH2) main.appendChild(articlesH2);
    articleTables.forEach((table) => main.appendChild(table));
    // Modified date section
    if (modifiedDate) {
      const dateHr = document.createElement('hr');
      main.appendChild(dateHr);
      const datePara = document.createElement('p');
      datePara.textContent = 'Date modified: ' + modifiedDate;
      main.appendChild(datePara);
    }

    // 8. WebImporter built-in rules
    const metaHr = document.createElement('hr');
    main.appendChild(metaHr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 7. Generate path
    const path = WebImporter.FileUtils.sanitizePath(
      new URL(params.originalURL).pathname.replace(/\/$/, '').replace(/\.html$/, ''),
    );

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
      },
    }];
  },
};

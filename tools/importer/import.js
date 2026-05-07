/**
 * AEM Importer entry point for the `aem import` CLI command.
 * Follows the helix-importer-ui API: exports transformDOM and generateDocumentPath.
 *
 * This file acts as an adapter between the standard AEM importer API and our
 * modular parser architecture in /parsers/.
 */

/* global WebImporter */

const SOURCE_DOMAIN = 'https://www.edc.ca';

export default {
  /**
   * Transforms the page DOM into EDS-compatible block structure.
   * Called by the helix-importer-ui for each URL being imported.
   */
  transformDOM: ({ document, url }) => {
    const main = document.body;

    // Extract recommended articles data BEFORE cleanup (they live inside .experiencefragment)
    const recommendedBefore = main.querySelector('.recommended-articles-premium-wrapper');
    const recommendedData = [];
    if (recommendedBefore) {
      const cards = recommendedBefore.querySelectorAll('.recommended-article-content');
      cards.forEach((card) => {
        const img = card.querySelector('img');
        // Title link is inside .description-text, NOT the image wrapper link
        const titleLink = card.querySelector('.description-text a, .description-text .ra-premium');
        const descEl = card.querySelector('.description-text p.small, .description p');
        const ctaLink = card.querySelector('.c-interaction-button');
        recommendedData.push({
          imgSrc: img ? img.getAttribute('src') : '',
          imgAlt: img ? img.getAttribute('alt') || '' : '',
          title: titleLink ? titleLink.textContent.trim() : '',
          href: titleLink ? titleLink.getAttribute('href') || '' : '',
          description: descEl ? descEl.textContent.trim() : '',
          ctaText: ctaLink ? ctaLink.textContent.trim() : '',
          ctaHref: ctaLink ? ctaLink.getAttribute('href') || '' : '',
        });
      });
    }

    // Remove non-content elements (avoid removing <header> tag since .c-news-room-header uses it)
    WebImporter.DOMUtils.remove(main, [
      'footer',
      'nav',
      '.header',
      '.footer',
      '.breadcrumb-wrapper',
      '.experiencefragment',
      '#onetrust-consent-sdk',
      'script',
      'noscript',
      'style',
      'iframe',
    ]);

    // Create a clean container for output
    const output = document.createElement('div');

    // --- Section 1: News Header ---
    const newsHeader = main.querySelector('.c-news-room-header');
    if (newsHeader) {
      const h1 = newsHeader.querySelector('h1, .title');
      if (h1) output.append(h1);

      const timeEl = newsHeader.querySelector('time');
      const locationEl = newsHeader.querySelector('.location');
      if (timeEl) {
        const datePara = document.createElement('p');
        const em = document.createElement('em');
        em.textContent = timeEl.textContent.trim();
        datePara.append(em);
        output.append(datePara);
      }
      if (locationEl) {
        const locPara = document.createElement('p');
        const em = document.createElement('em');
        em.textContent = locationEl.textContent.trim();
        locPara.append(em);
        output.append(locPara);
      }
    }

    // --- Author Block ---
    const authors = main.querySelector('.articleauthors .authors');
    if (authors) {
      const authorEls = authors.querySelectorAll('.author');
      const cells = [['Author']];

      authorEls.forEach((authorEl) => {
        const img = authorEl.querySelector('img');
        const nameEl = authorEl.querySelector('.name, [itemprop="name"]');
        const positionEl = authorEl.querySelector('.position');
        const companyEl = authorEl.querySelector('.company');
        const phoneEl = authorEl.querySelector('.phone, [itemprop="telephone"]');
        const emailEl = authorEl.querySelector('.email, [itemprop="email"]');
        const bioLink = authorEl.querySelector('a[href*="/bio/"]');

        const imgCell = document.createElement('div');
        if (img) {
          const pic = document.createElement('picture');
          const newImg = document.createElement('img');
          newImg.src = img.src;
          newImg.alt = img.alt || '';
          pic.append(newImg);
          imgCell.append(pic);
        }

        const infoCell = document.createElement('div');
        if (nameEl) {
          const p = document.createElement('p');
          const strong = document.createElement('strong');
          if (bioLink) {
            const a = document.createElement('a');
            a.href = bioLink.getAttribute('href');
            a.textContent = nameEl.textContent.trim();
            strong.append(a);
          } else {
            strong.textContent = nameEl.textContent.trim();
          }
          p.append(strong);
          infoCell.append(p);
        }
        if (positionEl) {
          const p = document.createElement('p');
          p.textContent = positionEl.textContent.trim();
          infoCell.append(p);
        }
        if (companyEl) {
          const p = document.createElement('p');
          p.textContent = companyEl.textContent.trim();
          infoCell.append(p);
        }
        if (phoneEl) {
          const p = document.createElement('p');
          const a = document.createElement('a');
          a.href = `tel:${phoneEl.textContent.trim().replace(/[^+\d]/g, '')}`;
          a.textContent = phoneEl.textContent.trim();
          p.append(a);
          infoCell.append(p);
        }
        if (emailEl) {
          const p = document.createElement('p');
          const a = document.createElement('a');
          a.href = `mailto:${emailEl.textContent.trim()}`;
          a.textContent = emailEl.textContent.trim();
          p.append(a);
          infoCell.append(p);
        }

        cells.push([imgCell, infoCell]);
      });

      const authorTable = WebImporter.DOMUtils.createTable(cells, document);
      output.append(authorTable);
    }

    // --- Article Body ---
    // Extract eyebrow/lead-in text (.leadintext) and main body (.cmp-text) from the article
    const articleBodyContainer = main.querySelector('.articlebodycontainer .article-body');
    if (articleBodyContainer) {
      // Lead-in / eyebrow text (appears before main body in .leadintext)
      const leadIn = articleBodyContainer.querySelector('.leadintext .cmp-text, .leadintext');
      if (leadIn && leadIn.textContent.trim()) {
        const cmpText = leadIn.querySelector('.cmp-text') || leadIn;
        [...cmpText.children].forEach((child) => {
          if (child.textContent.trim()) {
            output.append(child.cloneNode(true));
          }
        });
      }
    }

    // Main body text in the responsivegrid
    const articleBody = main.querySelector('.articlebodycontainer .article-body .responsivegrid .text .cmp-text');
    if (articleBody) {
      [...articleBody.children].forEach((child) => {
        output.append(child.cloneNode(true));
      });
    } else {
      // Fallback: try the broader selector
      const fallback = main.querySelector('.articlebodycontainer .article-body .responsivegrid .cmp-text');
      if (fallback) {
        [...fallback.children].forEach((child) => {
          output.append(child.cloneNode(true));
        });
      }
    }

    // --- About Section (centraltext) ---
    const aboutSection = main.querySelector('.centraltext .c-title-and-text');
    if (aboutSection) {
      [...aboutSection.children].forEach((child) => {
        output.append(child.cloneNode(true));
      });
    }

    // --- Media Contact Block ---
    const spokesperson = main.querySelector('.spokesperson .c-spokesperson');
    if (spokesperson) {
      const cells = [['Media-Contact']];
      const contentCell = document.createElement('div');

      const heading = spokesperson.querySelector('h2, h3');
      if (heading) {
        const p = document.createElement('p');
        const strong = document.createElement('strong');
        strong.textContent = heading.textContent.trim();
        p.append(strong);
        contentCell.append(p);
      }

      spokesperson.querySelectorAll('p').forEach((para) => {
        contentCell.append(para.cloneNode(true));
      });

      cells.push([contentCell]);
      const contactTable = WebImporter.DOMUtils.createTable(cells, document);
      output.append(contactTable);
    }

    // --- Section Break before recommended articles ---
    const hr = document.createElement('hr');
    output.append(hr);

    // --- Recommended Articles (Cards Block) ---
    if (recommendedData.length > 0) {
      const cells = [['Cards']];

      recommendedData.forEach((card) => {
        const imgCell = document.createElement('div');
        if (card.imgSrc) {
          const pic = document.createElement('picture');
          const newImg = document.createElement('img');
          newImg.src = card.imgSrc;
          newImg.alt = card.imgAlt;
          pic.append(newImg);
          imgCell.append(pic);
        }

        const textCell = document.createElement('div');
        if (card.title) {
          const p = document.createElement('p');
          const strong = document.createElement('strong');
          const a = document.createElement('a');
          a.href = card.href;
          a.textContent = card.title;
          strong.append(a);
          p.append(strong);
          textCell.append(p);
        }
        if (card.description) {
          const p = document.createElement('p');
          p.textContent = card.description;
          textCell.append(p);
        }
        if (card.ctaText) {
          const p = document.createElement('p');
          const a = document.createElement('a');
          a.href = card.ctaHref;
          a.textContent = card.ctaText;
          p.append(a);
          textCell.append(p);
        }

        cells.push([imgCell, textCell]);
      });

      const cardsTable = WebImporter.DOMUtils.createTable(cells, document);
      output.append(cardsTable);
    }

    // --- Section Break before date modified ---
    const hr2 = document.createElement('hr');
    output.append(hr2);

    // --- Date Modified ---
    const dateModified = main.querySelector('.c-date-modified__date, .c-date-modified');
    if (dateModified) {
      const p = document.createElement('p');
      p.textContent = dateModified.textContent.trim();
      output.append(p);
    }

    // --- Section Break before metadata ---
    const hr3 = document.createElement('hr');
    output.append(hr3);

    // --- Metadata Block ---
    const meta = {};

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) meta.Title = ogTitle.getAttribute('content');

    const description = document.querySelector('meta[name="description"]');
    if (description) meta.Description = description.getAttribute('content');

    const templateMeta = document.querySelector('meta[name="template"]');
    if (templateMeta) meta.Template = templateMeta.getAttribute('content');

    const timeEl = main.querySelector('.c-news-room-header time');
    if (timeEl) {
      const datetime = timeEl.getAttribute('datetime');
      if (datetime) meta.Date = datetime.split(' ')[0];
    }

    const locationEl = main.querySelector('.c-news-room-header .location');
    if (locationEl) meta.Location = locationEl.textContent.trim();

    const metaBlock = WebImporter.Blocks.getMetadataBlock(document, meta);
    output.append(metaBlock);

    return output;
  },

  /**
   * Generates the output document path from the source URL.
   * Ensures the page is NOT created as an index page.
   */
  generateDocumentPath: ({ url }) => {
    let path;
    try {
      const u = new URL(url);
      path = u.pathname;
    } catch {
      path = url;
    }

    // Remove .html extension
    path = path.replace(/\.html$/, '');

    // Ensure not treated as index
    if (path.endsWith('/')) {
      path = path.slice(0, -1);
    }

    return path || '/untitled';
  },
};

var CustomImportScript = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // tools/importer/import-esg-environment.js
  var import_esg_environment_exports = {};
  __export(import_esg_environment_exports, {
    default: () => import_esg_environment_default
  });

  // tools/importer/transformers/esg-cleanup.js
  function transform(hookName, element, { document }) {
    if (hookName === "beforeTransform") {
      WebImporter.DOMUtils.remove(element, [
        "#onetrust-consent-sdk",
        "#onetrust-banner-sdk",
        "#onetrust-pc-sdk",
        ".onetrust-pc-dark-filter",
        "script",
        "style",
        "noscript",
        'link[rel="stylesheet"]',
        "iframe"
      ]);
      WebImporter.DOMUtils.remove(element, [
        ".header",
        ".c-header",
        "#header",
        "header",
        ".footer",
        ".c-footer",
        "#footer",
        "footer",
        ".c-newsletter",
        '[class*="skip-nav"]'
      ]);
      element.querySelectorAll('[class*="default--hide"]').forEach((el) => el.remove());
      element.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((heading) => {
        if (!heading.textContent.trim()) heading.remove();
      });
      element.querySelectorAll('.c-keyline, [class*="c-keyline"]').forEach((keyline) => {
        const hr = document.createElement("hr");
        keyline.replaceWith(hr);
      });
      element.querySelectorAll('.key-line, [class*="key-line"]').forEach((keyline) => {
        const hr = document.createElement("hr");
        keyline.replaceWith(hr);
      });
      element.querySelectorAll('.modifieddate, section.c-date-modified, .c-date-modified, [class*="modifieddate"]').forEach((el) => {
        const dateSpan = el.querySelector(".c-date-modified__date, span");
        if (dateSpan) {
          document.body.setAttribute("data-date-modified", dateSpan.textContent.trim());
        }
        const container = el.closest(".modifieddate") || el.closest('[class*="modified"]') || el;
        container.remove();
      });
      const showIcon = element.querySelector(".show-icon");
      if (showIcon) {
        const squiggleImg = document.createElement("img");
        squiggleImg.src = `${window.location.origin}/etc.clientlibs/edc/clientlibs/clientlib-base/resources/images/squiggle.svg`;
        squiggleImg.alt = "";
        const squiggleP = document.createElement("p");
        squiggleP.appendChild(squiggleImg);
        const overviewText = element.querySelector('[class*="overviewtext"], [class*="overview"]');
        if (overviewText) {
          const introP = overviewText.querySelector("p");
          if (introP) introP.before(squiggleP);
        }
        showIcon.remove();
      }
      document.body.style.overflow = "auto";
    }
    if (hookName === "afterTransform") {
      let prevWasHr = false;
      [...element.children].forEach((el) => {
        if (el.tagName === "HR") {
          if (prevWasHr) {
            el.remove();
            return;
          }
          prevWasHr = true;
        } else {
          prevWasHr = false;
        }
      });
      [...element.children].forEach((el) => {
        if ((el.tagName === "DIV" || el.tagName === "SECTION" || el.tagName === "P") && !el.textContent.trim() && !el.querySelector("img, picture, table, a, hr")) {
          el.remove();
        }
      });
    }
  }

  // tools/importer/import-esg-environment.js
  function executeTransformers(hookName, element, payload) {
    [transform].forEach((fn) => {
      try {
        fn(hookName, element, payload);
      } catch (e) {
        console.error(`Transformer failed:`, e);
      }
    });
  }
  function createBlock(document, blockName, rows) {
    return WebImporter.DOMUtils.createTable([[blockName], ...rows], document);
  }
  function getAllViewportSrcs(element) {
    if (!element) return [];
    const makeAbsolute = (src) => {
      if (!src) return src;
      if (src.startsWith("http")) return src;
      if (src.startsWith("/")) return `${window.location.origin}${src}`;
      return src;
    };
    const picture = element.tagName === "PICTURE" ? element : element.closest("picture");
    if (!picture) {
      const img2 = element.tagName === "IMG" ? element : element.querySelector("img");
      return img2 ? [{ src: img2.src, viewport: "all" }] : [];
    }
    const sources = picture.querySelectorAll("source");
    const img = picture.querySelector("img");
    const variants = [];
    const seenSrcs = /* @__PURE__ */ new Set();
    for (const source of sources) {
      const media = source.getAttribute("media") || "";
      const srcset = source.getAttribute("srcset");
      if (!srcset) continue;
      const absSrc = makeAbsolute(srcset);
      if (seenSrcs.has(absSrc)) continue;
      seenSrcs.add(absSrc);
      let viewport = "unknown";
      if (media.includes("992")) viewport = "desktop";
      else if (media.includes("768")) viewport = "tablet";
      else if (media.includes("576")) viewport = "mobile";
      variants.push({ src: absSrc, viewport });
    }
    if (img && img.src && !seenSrcs.has(img.src)) variants.push({ src: img.src, viewport: "fallback" });
    const order = { mobile: 0, fallback: 1, tablet: 2, desktop: 3, unknown: 4 };
    variants.sort((a, b) => (order[a.viewport] ?? 4) - (order[b.viewport] ?? 4));
    return variants;
  }
  function getDesktopImgSrc(element) {
    if (!element) return null;
    const makeAbsolute = (src) => {
      if (!src) return src;
      if (src.startsWith("http")) return src;
      if (src.startsWith("/")) return `${window.location.origin}${src}`;
      return src;
    };
    const picture = element.tagName === "PICTURE" ? element : element.closest("picture");
    if (picture) {
      const sources = picture.querySelectorAll("source");
      for (const source of sources) {
        if ((source.getAttribute("media") || "").includes("992")) return makeAbsolute(source.getAttribute("srcset"));
      }
      if (sources.length > 0 && sources[0].getAttribute("srcset")) return makeAbsolute(sources[0].getAttribute("srcset"));
    }
    const img = element.tagName === "IMG" ? element : element.querySelector("img");
    return img ? img.src : null;
  }
  function extractHero(document, main) {
    const heroSection = main.querySelector('.c-hero-banner, section[class*="hero"], [class*="herobanner"]');
    if (!heroSection) return;
    const heading = heroSection.querySelector("h1");
    const subtitle = heroSection.querySelector(".content p, p");
    const picture = heroSection.querySelector("picture");
    const img = heroSection.querySelector("img");
    const cell = document.createElement("div");
    if (picture || img) {
      const allSrcs = getAllViewportSrcs(picture || img);
      const alt = img ? img.alt || "" : "";
      if (allSrcs.length > 1) {
        allSrcs.forEach(({ src }) => {
          const newImg = document.createElement("img");
          newImg.src = src;
          newImg.alt = alt;
          cell.appendChild(newImg);
        });
      } else {
        const newImg = document.createElement("img");
        newImg.src = allSrcs.length > 0 ? allSrcs[0].src : img ? img.src : "";
        newImg.alt = alt;
        cell.appendChild(newImg);
      }
    }
    if (heading) {
      const h1 = document.createElement("h1");
      h1.textContent = heading.textContent.trim();
      cell.appendChild(h1);
    }
    if (subtitle && subtitle.textContent.trim() && !subtitle.querySelector("a")) {
      const p = document.createElement("p");
      p.textContent = subtitle.textContent.trim();
      cell.appendChild(p);
    }
    const table = createBlock(document, "Hero", [[cell]]);
    heroSection.replaceWith(table);
  }
  function extractNewsCards(document, main) {
    const newsHeading = [...main.querySelectorAll("h2")].find((h) => h.textContent.toLowerCase().includes("news and"));
    if (!newsHeading) return;
    const cards = [];
    const elementsToRemove = [];
    const allImageBodyText = main.querySelectorAll('.imageinbodytext, [class*="imageinbodytext"]');
    const allEls = [...main.querySelectorAll("*")];
    const newsIdx = allEls.indexOf(newsHeading);
    const nextH2 = [...main.querySelectorAll("h2")].find((h) => allEls.indexOf(h) > newsIdx && h !== newsHeading);
    const nextH2Idx = nextH2 ? allEls.indexOf(nextH2) : Infinity;
    allImageBodyText.forEach((container) => {
      const containerIdx = allEls.indexOf(container);
      if (containerIdx <= newsIdx || containerIdx >= nextH2Idx) return;
      const img = container.querySelector("img");
      const h3 = container.querySelector("h3");
      if (!h3) return;
      const desc = [...container.querySelectorAll("p")].find((p) => !p.querySelector("a") && p.textContent.trim().length > 10);
      const linkEl = container.querySelector("p a");
      const imageCell = document.createElement("div");
      if (img) {
        const newImg = document.createElement("img");
        newImg.src = img.src;
        newImg.alt = img.alt || "";
        imageCell.appendChild(newImg);
      }
      const textCell = document.createElement("div");
      const title = document.createElement("p");
      const strong = document.createElement("strong");
      strong.textContent = h3.textContent.trim();
      title.appendChild(strong);
      textCell.appendChild(title);
      if (desc) {
        const p = document.createElement("p");
        p.textContent = desc.textContent.trim();
        textCell.appendChild(p);
      }
      if (linkEl) {
        const p = document.createElement("p");
        const a = document.createElement("a");
        a.href = linkEl.href;
        a.textContent = linkEl.textContent.trim();
        p.appendChild(a);
        textCell.appendChild(p);
      }
      cards.push([imageCell, textCell]);
      elementsToRemove.push(container);
    });
    if (cards.length === 0) return;
    const h2 = document.createElement("h2");
    h2.textContent = newsHeading.textContent.trim();
    const table = createBlock(document, "Cards", cards);
    newsHeading.replaceWith(h2, table);
    elementsToRemove.forEach((el) => {
      if (el.parentElement) el.remove();
    });
  }
  function extractAccordions(document, main) {
    const regions = main.querySelectorAll('[role="region"]');
    const items = [];
    regions.forEach((region) => {
      const button = region.querySelector("button");
      const heading = region.querySelector("h3");
      if (!button || !heading) return;
      const title = button.textContent.trim();
      if (title.includes("Cookie") || title.includes("Privacy") || !title) return;
      if (title.match(/From \d{4}/i)) return;
      const contentElements = [...region.children].filter((el) => el.tagName !== "H3");
      const richContent = document.createElement("div");
      contentElements.forEach((el) => richContent.appendChild(el.cloneNode(true)));
      items.push({ title, richContent, region });
    });
    if (items.length === 0) return;
    const groups = [];
    let group = [items[0]];
    for (let i = 1; i < items.length; i++) {
      const prev = items[i - 1].region;
      const curr = items[i].region;
      let distance = 0;
      let el = prev.nextElementSibling;
      while (el && el !== curr && distance < 5) {
        distance++;
        el = el.nextElementSibling;
      }
      if (distance < 5) {
        group.push(items[i]);
      } else {
        groups.push([...group]);
        group = [items[i]];
      }
    }
    groups.push(group);
    groups.forEach((groupItems) => {
      const rows = groupItems.map((item) => {
        const titleCell = document.createElement("div");
        titleCell.textContent = item.title;
        const contentCell = document.createElement("div");
        const paras = item.richContent.querySelectorAll("p, li");
        paras.forEach((p) => {
          const newP = document.createElement("p");
          const link = p.querySelector("a");
          if (link) {
            newP.innerHTML = p.innerHTML;
          } else {
            newP.textContent = p.textContent.trim();
          }
          if (newP.textContent.trim()) contentCell.appendChild(newP);
        });
        return [titleCell, contentCell];
      });
      const table = createBlock(document, "Accordion", rows);
      groupItems[0].region.replaceWith(table);
      for (let i = 1; i < groupItems.length; i++) {
        if (groupItems[i].region.parentElement) groupItems[i].region.remove();
      }
    });
  }
  function extractTabs(document, main) {
    const tablist = main.querySelector('[role="tablist"]');
    if (!tablist) return;
    const tabs = [...tablist.querySelectorAll('[role="tab"]')].filter((t) => !t.textContent.includes("Cookie") && !t.textContent.includes("Privacy"));
    const panels = main.querySelectorAll('[role="tabpanel"]');
    if (tabs.length === 0) return;
    const rows = [];
    tabs.forEach((tab, i) => {
      const tabName = tab.textContent.trim();
      const panel = panels[i];
      const titleCell = document.createElement("div");
      titleCell.textContent = tabName;
      const contentCell = document.createElement("div");
      if (panel) {
        const paras = panel.querySelectorAll("p");
        paras.forEach((p) => {
          if (p.textContent.trim()) {
            const newP = document.createElement("p");
            newP.textContent = p.textContent.trim();
            contentCell.appendChild(newP);
          }
        });
      }
      if (!contentCell.textContent.trim()) contentCell.textContent = tabName;
      rows.push([titleCell, contentCell]);
    });
    const table = createBlock(document, "Tabs", rows);
    const tabContainer = tablist.closest('[class*="tab"]') || tablist.parentElement;
    if (tabContainer) tabContainer.replaceWith(table);
    panels.forEach((p) => {
      if (p.parentElement) p.remove();
    });
    const fromRegion = [...main.querySelectorAll('[role="region"]')].find((r) => {
      const btn = r.querySelector("button");
      return btn && btn.textContent.match(/From \d{4}/i);
    });
    if (fromRegion) {
      const btn = fromRegion.querySelector("button");
      const contentElements = [...fromRegion.children].filter((el) => el.tagName !== "H3");
      const titleCell = document.createElement("div");
      titleCell.textContent = btn.textContent.trim();
      const contentCell = document.createElement("div");
      contentElements.forEach((el) => {
        const paras = el.querySelectorAll ? el.querySelectorAll("p") : [];
        paras.forEach((p) => {
          if (p.textContent.trim()) {
            const newP = document.createElement("p");
            newP.textContent = p.textContent.trim();
            contentCell.appendChild(newP);
          }
        });
      });
      const accordionTable = createBlock(document, "Accordion", [[titleCell, contentCell]]);
      table.after(accordionTable);
      fromRegion.remove();
    }
  }
  function extractCustomerStories(document, main) {
    const heading = [...main.querySelectorAll("h2")].find((h) => h.textContent.includes("Customer stories"));
    if (!heading) return;
    const container = heading.parentElement;
    const list = container ? container.querySelector("ul, ol") : null;
    if (!list) return;
    const cards = [];
    list.querySelectorAll("li").forEach((li) => {
      const img = li.querySelector("img");
      const titleLink = li.querySelector("h3 a");
      const desc = [...li.querySelectorAll("p")].find((p) => !p.querySelector("a") && p.textContent.trim().length > 10);
      const imageCell = document.createElement("div");
      if (img) {
        const newImg = document.createElement("img");
        newImg.src = img.src;
        newImg.alt = img.alt || "";
        imageCell.appendChild(newImg);
      }
      const textCell = document.createElement("div");
      if (titleLink) {
        const p = document.createElement("p");
        const strong = document.createElement("strong");
        const a = document.createElement("a");
        a.href = titleLink.href;
        a.textContent = titleLink.textContent.trim();
        strong.appendChild(a);
        p.appendChild(strong);
        textCell.appendChild(p);
      }
      if (desc) {
        const p = document.createElement("p");
        p.textContent = desc.textContent.trim();
        textCell.appendChild(p);
      }
      cards.push([imageCell, textCell]);
    });
    if (cards.length === 0) return;
    const h2 = document.createElement("h2");
    h2.textContent = heading.textContent.trim();
    const table = createBlock(document, "Cards", cards);
    heading.remove();
    list.replaceWith(h2, table);
  }
  function extractKpiStats(document, main) {
    const heading = [...main.querySelectorAll("h2")].find((h) => h.textContent.toLowerCase().includes("by the numbers"));
    if (!heading) return;
    const cards = [];
    const elementsToRemove = [heading];
    const allH2s = [...main.querySelectorAll("h2")];
    const statH2s = allH2s.filter((h) => h.textContent.trim().match(/^\$|^\d+\.?\d*%/));
    statH2s.forEach((statH2) => {
      let desc = statH2.nextElementSibling;
      if (!desc || desc.tagName !== "P") {
        desc = statH2.parentElement.querySelector("p");
      }
      if (desc) {
        const cell = document.createElement("div");
        const h = document.createElement("h2");
        h.textContent = statH2.textContent.trim();
        cell.appendChild(h);
        const p = document.createElement("p");
        p.textContent = desc.textContent.trim();
        cell.appendChild(p);
        cards.push([cell]);
        elementsToRemove.push(statH2, desc);
      }
    });
    if (cards.length === 0) return;
    let introP = null;
    const allPs = [...main.querySelectorAll("p")];
    const introCandidate = allPs.find((p) => {
      const text = p.textContent.toLowerCase();
      return text.includes("measuring and monitoring") || text.includes("we believe that good") || text.includes("performance is key") || text.includes("details on our");
    });
    if (introCandidate) {
      introP = introCandidate;
      elementsToRemove.push(introCandidate);
    }
    const sectionDiv = document.createElement("div");
    const h2 = document.createElement("h2");
    h2.textContent = heading.textContent.trim();
    sectionDiv.appendChild(h2);
    if (introP) {
      const p = document.createElement("p");
      p.innerHTML = introP.innerHTML;
      sectionDiv.appendChild(p);
    }
    const table = createBlock(document, "Cards", cards);
    sectionDiv.appendChild(table);
    heading.replaceWith(sectionDiv);
    elementsToRemove.forEach((el) => {
      if (el.parentElement) el.remove();
    });
  }
  function extractAgreements(document, main) {
    const heading = [...main.querySelectorAll("h2")].find((h) => h.textContent.toLowerCase().includes("agreements") && h.textContent.toLowerCase().includes("memberships"));
    if (!heading) return;
    const sectionDiv = document.createElement("div");
    const h2 = document.createElement("h2");
    h2.textContent = heading.textContent.trim();
    sectionDiv.appendChild(h2);
    let foundContent = false;
    const headingParent = heading.parentElement;
    const grandParent = headingParent ? headingParent.parentElement : null;
    const agreementsPara = [...main.querySelectorAll("p")].find((p) => p.textContent.includes("agreements and standards") || p.textContent.includes("contributing member"));
    if (agreementsPara) {
      const p = document.createElement("p");
      p.textContent = agreementsPara.textContent.trim();
      sectionDiv.appendChild(p);
      const nextP = agreementsPara.nextElementSibling;
      if (nextP && nextP.tagName === "P" && nextP.querySelector("a")) {
        const linkP = document.createElement("p");
        linkP.innerHTML = nextP.innerHTML;
        sectionDiv.appendChild(linkP);
        nextP.remove();
      }
      agreementsPara.remove();
      foundContent = true;
    }
    if (!foundContent) {
      let sibling = heading.nextElementSibling;
      while (sibling) {
        if (sibling.tagName === "H2" || sibling.tagName === "HR") break;
        if (sibling.tagName === "P") {
          const p = document.createElement("p");
          const link = sibling.querySelector("a");
          if (link) {
            p.innerHTML = sibling.innerHTML;
          } else {
            p.textContent = sibling.textContent.trim();
          }
          if (p.textContent.trim()) {
            sectionDiv.appendChild(p);
            foundContent = true;
          }
          const next = sibling.nextElementSibling;
          sibling.remove();
          sibling = next;
        } else if (sibling.tagName === "DIV") {
          sibling.querySelectorAll("p").forEach((para) => {
            if (para.textContent.trim()) {
              const p = document.createElement("p");
              const link = para.querySelector("a");
              if (link) {
                p.innerHTML = para.innerHTML;
              } else {
                p.textContent = para.textContent.trim();
              }
              sectionDiv.appendChild(p);
              foundContent = true;
            }
          });
          const next = sibling.nextElementSibling;
          sibling.remove();
          sibling = next;
        } else {
          break;
        }
      }
    }
    if (!foundContent) {
      const fallback = [...main.querySelectorAll("p")].find((p) => p.textContent.includes("agreements and standards") || p.textContent.includes("best practices"));
      if (fallback) {
        const p = document.createElement("p");
        p.textContent = fallback.textContent.trim();
        sectionDiv.appendChild(p);
        const nextP = fallback.nextElementSibling;
        if (nextP && nextP.tagName === "P" && nextP.querySelector("a")) {
          const linkP = document.createElement("p");
          linkP.innerHTML = nextP.innerHTML;
          sectionDiv.appendChild(linkP);
          nextP.remove();
        }
        fallback.remove();
      }
    }
    const metaCells = [["Section Metadata"], ["style", "highlight"]];
    const metaTable = WebImporter.DOMUtils.createTable(metaCells, document);
    sectionDiv.appendChild(metaTable);
    const hrBefore = document.createElement("hr");
    const hrAfter = document.createElement("hr");
    heading.replaceWith(hrBefore, sectionDiv, hrAfter);
  }
  function extractPoliciesReports(document, main) {
    const policyCards = document.querySelectorAll(".c-product-form-card");
    if (policyCards.length === 0) return;
    const cards = [];
    policyCards.forEach((card) => {
      const titleEl = card.querySelector("h2.title, .card-content h2");
      const descEl = card.querySelector("p.description, .card-content p");
      const linkEl = card.querySelector(".card-actions a, a.c-interaction-button");
      if (!titleEl) return;
      const textCell = document.createElement("div");
      const titleP = document.createElement("p");
      const strong = document.createElement("strong");
      strong.textContent = titleEl.textContent.trim();
      titleP.appendChild(strong);
      textCell.appendChild(titleP);
      if (descEl) {
        const p = document.createElement("p");
        p.textContent = descEl.textContent.trim();
        textCell.appendChild(p);
      }
      if (linkEl) {
        const p = document.createElement("p");
        const a = document.createElement("a");
        a.href = linkEl.href;
        a.textContent = linkEl.textContent.trim();
        p.appendChild(a);
        textCell.appendChild(p);
      }
      cards.push([textCell]);
    });
    if (cards.length === 0) return;
    const heading = [...main.querySelectorAll("h2")].find((h) => h.textContent.toLowerCase().includes("policies") && h.textContent.toLowerCase().includes("reports"));
    const complementary = document.querySelector('[role="complementary"], aside');
    const sectionDiv = document.createElement("div");
    if (heading) {
      const h2 = document.createElement("h2");
      h2.textContent = heading.textContent.trim();
      sectionDiv.appendChild(h2);
      const intro = heading.nextElementSibling;
      if (intro && intro.tagName === "P" && intro.textContent.trim().length > 20) {
        const p = document.createElement("p");
        p.textContent = intro.textContent.trim();
        sectionDiv.appendChild(p);
      }
    }
    const table = createBlock(document, "Cards", cards);
    sectionDiv.appendChild(table);
    const seeAll = [...main.querySelectorAll("a")].find((a) => a.textContent.toLowerCase().includes("see all policies"));
    if (seeAll) {
      const p = document.createElement("p");
      const a = document.createElement("a");
      a.href = seeAll.href;
      a.textContent = seeAll.textContent.trim();
      p.appendChild(a);
      sectionDiv.appendChild(p);
    }
    if (complementary) {
      complementary.replaceWith(sectionDiv);
    } else if (heading) {
      heading.replaceWith(sectionDiv);
    }
  }
  var import_esg_environment_default = {
    transform: (payload) => {
      const { document, url, html, params } = payload;
      const main = document.body;
      executeTransformers("beforeTransform", main, payload);
      const viewportVariants = [];
      main.querySelectorAll("picture").forEach((picture) => {
        const img = picture.querySelector("img");
        const sources = picture.querySelectorAll("source");
        if (sources.length === 0) return;
        const variants = {};
        sources.forEach((source) => {
          const media = source.getAttribute("media") || "";
          const srcset = source.getAttribute("srcset");
          if (!srcset) return;
          const absSrc = srcset.startsWith("/") ? `${window.location.origin}${srcset}` : srcset;
          if (media.includes("992")) variants.desktop = absSrc;
          else if (media.includes("768")) variants.tablet = absSrc;
          else if (media.includes("576")) variants.mobile = absSrc;
        });
        if (img && img.src) variants.fallback = img.src;
        const uniqueUrls = [...new Set(Object.values(variants))];
        if (uniqueUrls.length > 1) viewportVariants.push({ alt: img ? img.alt : "", ...variants });
      });
      extractHero(document, main);
      extractNewsCards(document, main);
      extractAccordions(document, main);
      extractTabs(document, main);
      extractCustomerStories(document, main);
      extractKpiStats(document, main);
      extractAgreements(document, main);
      extractPoliciesReports(document, main);
      executeTransformers("afterTransform", main, payload);
      main.querySelectorAll("picture").forEach((picture) => {
        const img = picture.querySelector("img");
        if (!img) return;
        const desktopSrc = getDesktopImgSrc(picture);
        if (desktopSrc && desktopSrc !== img.src) img.src = desktopSrc;
      });
      const dateModified = document.body.getAttribute("data-date-modified");
      if (dateModified) {
        const dateHr = document.createElement("hr");
        const dateP = document.createElement("p");
        dateP.textContent = dateModified;
        main.appendChild(dateHr);
        main.appendChild(dateP);
      }
      const hr = document.createElement("hr");
      main.appendChild(hr);
      WebImporter.rules.createMetadata(main, document);
      WebImporter.rules.transformBackgroundImages(main, document);
      WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
      const path = WebImporter.FileUtils.sanitizePath(
        new URL(params.originalURL).pathname.replace(/\/$/, "").replace(/\.html$/, "")
      );
      return [{
        element: main,
        path,
        report: { title: document.title, template: "esg-environment", viewportVariants: viewportVariants.length > 0 ? JSON.stringify(viewportVariants) : void 0 }
      }];
    }
  };
  return __toCommonJS(import_esg_environment_exports);
})();

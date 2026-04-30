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

  // tools/importer/import-annual-report-performance.js
  var import_annual_report_performance_exports = {};
  __export(import_annual_report_performance_exports, {
    default: () => import_annual_report_performance_default
  });

  // tools/importer/transformers/cleanup.js
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
        ".headerCampaign",
        ".header-container",
        "header.campaign-sticky-nav",
        ".footerCampaign",
        "footer#footer",
        "footer.campaign-footer"
      ]);
      WebImporter.DOMUtils.remove(element, [
        ".modifieddate",
        "section.c-date-modified"
      ]);
      WebImporter.DOMUtils.remove(element, [
        ".c-keyline",
        ".key-line"
      ]);
      const defaultHideElements = element.querySelectorAll('[class*="default--hide"]');
      defaultHideElements.forEach((el) => el.remove());
      element.querySelectorAll(".cmp-text").forEach((textBlock) => {
        const text = textBlock.textContent.trim().replace(/ /g, "").replace(/\s/g, "");
        if (!text) {
          const parent = textBlock.closest(".text");
          if (parent) parent.remove();
        }
      });
      element.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((heading) => {
        if (!heading.textContent.trim()) heading.remove();
      });
      document.body.style.overflow = "auto";
    }
    if (hookName === "afterTransform") {
      WebImporter.DOMUtils.remove(element, ["#maincontent"]);
      element.querySelectorAll(".responsivegrid, .aem-Grid, .aem-GridColumn").forEach((div) => {
        if (!div.textContent.trim() && !div.querySelector("img, picture, table, a")) {
          div.remove();
        }
      });
    }
  }

  // tools/importer/import-annual-report-performance.js
  function executeTransformers(hookName, element, payload) {
    [transform].forEach((fn) => {
      try {
        fn(hookName, element, payload);
      } catch (e) {
        console.error(`Transformer failed at ${hookName}:`, e);
      }
    });
  }
  function createBlock(document, blockName, rows) {
    const cells = [[blockName], ...rows];
    return WebImporter.DOMUtils.createTable(cells, document);
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
    if (img && img.src && !seenSrcs.has(img.src)) {
      variants.push({ src: img.src, viewport: "fallback" });
    }
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
        const media = source.getAttribute("media") || "";
        if (media.includes("992")) {
          return makeAbsolute(source.getAttribute("srcset"));
        }
      }
      if (sources.length > 0 && sources[0].getAttribute("srcset")) {
        return makeAbsolute(sources[0].getAttribute("srcset"));
      }
    }
    const img = element.tagName === "IMG" ? element : element.querySelector("img");
    return img ? img.src : null;
  }
  function extractStickyNav(document, main) {
    const stickyNav = main.querySelector("section.c-sticky-nav-wrapper") || main.querySelector(".stickynav section");
    if (!stickyNav) return;
    const titleSpan = stickyNav.querySelector(".hidden-xs, .phone span");
    const ctaLink = stickyNav.querySelector("a.button, a.c-interaction-button");
    const div = document.createElement("div");
    if (titleSpan) {
      const p = document.createElement("p");
      p.textContent = titleSpan.textContent.trim();
      div.appendChild(p);
    }
    if (ctaLink) {
      const p = document.createElement("p");
      const strong = document.createElement("strong");
      const a = document.createElement("a");
      a.href = ctaLink.href;
      a.textContent = ctaLink.textContent.trim();
      strong.appendChild(a);
      p.appendChild(strong);
      div.appendChild(p);
    }
    const hr = document.createElement("hr");
    const stickyContainer = stickyNav.closest(".stickynav") || stickyNav;
    stickyContainer.replaceWith(div, hr);
  }
  function extractHero(document, main) {
    const heroSection = main.querySelector("section.c-hero-banner");
    if (!heroSection) return;
    const heading = heroSection.querySelector("h1");
    const description = heroSection.querySelector(".content p");
    const picture = heroSection.querySelector(".img-wrapper picture, picture");
    const img = heroSection.querySelector(".img-wrapper img, picture img");
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
    if (description) {
      const p = document.createElement("p");
      p.textContent = description.textContent.trim();
      cell.appendChild(p);
    }
    const table = createBlock(document, "Hero", [[cell]]);
    heroSection.replaceWith(table);
  }
  function extractKpiCards(document, main) {
    const kpiSections = main.querySelectorAll(".imageinbodytext");
    const kpiCards = [];
    const kpiElements = [];
    kpiSections.forEach((el) => {
      if (!el.className.includes("default--4")) return;
      const section = el.querySelector("section.image-body-text");
      if (!section) return;
      const picture = section.querySelector(".content-image picture");
      const img = section.querySelector(".content-image img");
      const textDiv = section.querySelector(".text-after-image");
      if (!textDiv) return;
      const heading = textDiv.querySelector("h2");
      const desc = textDiv.querySelector("p");
      if (!heading) return;
      const imageCell = document.createElement("div");
      if (picture || img) {
        const newImg = document.createElement("img");
        newImg.src = getDesktopImgSrc(picture || img) || (img ? img.src : "");
        newImg.alt = img ? img.alt || "" : "";
        imageCell.appendChild(newImg);
      }
      const textCell = document.createElement("div");
      const h2 = document.createElement("h2");
      h2.textContent = heading.textContent.trim();
      textCell.appendChild(h2);
      if (desc) {
        const p = document.createElement("p");
        p.textContent = desc.textContent.trim();
        textCell.appendChild(p);
      }
      kpiCards.push([imageCell, textCell]);
      kpiElements.push(el);
    });
    if (kpiCards.length === 0) return;
    const table = createBlock(document, "Cards", kpiCards);
    kpiElements[0].replaceWith(table);
    for (let i = 1; i < kpiElements.length; i++) {
      kpiElements[i].remove();
    }
  }
  function extractContentColumns(document, main) {
    const seenHeadings = /* @__PURE__ */ new Set();
    const textBlocks = main.querySelectorAll(".text .cmp-text");
    const processedPairs = [];
    textBlocks.forEach((cmpText) => {
      const heading = cmpText.querySelector("h2");
      if (!heading) return;
      const headingText = heading.textContent.trim();
      if (!headingText) return;
      if (seenHeadings.has(headingText)) return;
      const parentText = cmpText.closest(".text");
      if (!parentText) return;
      if (!parentText.className.includes("default--6") && !parentText.className.includes("default--newline")) return;
      seenHeadings.add(headingText);
      let imageEl = null;
      let imageSrc = null;
      let imageAlt = "";
      let sibling = parentText.previousElementSibling;
      while (sibling) {
        if (sibling.classList.contains("imageinbodytext") && sibling.className.includes("default--6")) {
          const picture = sibling.querySelector("picture");
          const img = sibling.querySelector("img");
          if (img && img.alt !== "replace") {
            imageSrc = getDesktopImgSrc(picture || img) || img.src;
            imageAlt = img.alt || "";
            imageEl = sibling;
            break;
          }
        }
        if (sibling.classList.contains("c-keyline") || sibling.classList.contains("text")) break;
        sibling = sibling.previousElementSibling;
      }
      if (!imageSrc) {
        sibling = parentText.nextElementSibling;
        while (sibling) {
          if (sibling.classList.contains("imageinbodytext") && (sibling.className.includes("default--6") || sibling.className.includes("default--newline"))) {
            const picture = sibling.querySelector("picture");
            const img = sibling.querySelector("img");
            if (img && img.alt !== "replace") {
              imageSrc = getDesktopImgSrc(picture || img) || img.src;
              imageAlt = img.alt || "";
              imageEl = sibling;
              break;
            }
          }
          if (sibling.classList.contains("text") && sibling.querySelector("h2")) break;
          sibling = sibling.nextElementSibling;
        }
      }
      const textCell = document.createElement("div");
      const h2 = document.createElement("h2");
      h2.textContent = headingText;
      textCell.appendChild(h2);
      cmpText.querySelectorAll("p").forEach((p) => {
        const text = p.textContent.trim();
        if (!text || text === "\xA0") return;
        const newP = document.createElement("p");
        const link = p.querySelector("a");
        if (link) {
          if (p.childNodes.length === 1 || p.textContent.trim() === link.textContent.trim()) {
            const a = document.createElement("a");
            a.href = link.href;
            a.textContent = link.textContent.trim();
            if (link.title) a.title = link.title;
            newP.appendChild(a);
          } else {
            [...p.childNodes].forEach((node) => {
              if (node.nodeType === 3) {
                newP.appendChild(document.createTextNode(node.textContent));
              } else if (node.tagName === "A") {
                const a = document.createElement("a");
                a.href = node.href;
                a.textContent = node.textContent;
                if (node.title) a.title = node.title;
                newP.appendChild(a);
              } else if (node.tagName === "SPAN") {
                newP.appendChild(document.createTextNode(node.textContent));
              }
            });
          }
        } else {
          newP.textContent = text;
        }
        textCell.appendChild(newP);
      });
      const imageCell = document.createElement("div");
      if (imageSrc) {
        const newImg = document.createElement("img");
        newImg.src = imageSrc;
        newImg.alt = imageAlt;
        imageCell.appendChild(newImg);
      }
      const imageFirst = imageEl && parentText.compareDocumentPosition(imageEl) & Node.DOCUMENT_POSITION_PRECEDING;
      const row = imageFirst ? [imageCell, textCell] : [textCell, imageCell];
      processedPairs.push({
        table: createBlock(document, "Columns", [row]),
        textEl: parentText,
        imageEl
      });
    });
    processedPairs.forEach(({ table, textEl, imageEl }) => {
      textEl.replaceWith(table);
      if (imageEl) imageEl.remove();
    });
  }
  function extractOverview(document, main) {
    const overviewSection = main.querySelector("section.travel-brief");
    if (!overviewSection) return;
    const container = overviewSection.querySelector(".container") || overviewSection;
    const title = container.querySelector("h2.title, h2");
    const paragraphs = container.querySelectorAll("p");
    const div = document.createElement("div");
    if (title) {
      const h2 = document.createElement("h2");
      h2.textContent = title.textContent.trim();
      div.appendChild(h2);
    }
    paragraphs.forEach((p) => {
      const text = p.textContent.trim();
      if (!text) return;
      const newP = document.createElement("p");
      const link = p.querySelector("a");
      if (link) {
        const textBefore = p.textContent.substring(0, p.textContent.indexOf(link.textContent)).trim();
        if (textBefore) newP.appendChild(document.createTextNode(textBefore));
        const a = document.createElement("a");
        a.href = link.href;
        a.textContent = link.textContent.trim();
        if (link.title) a.title = link.title;
        newP.appendChild(a);
      } else {
        newP.textContent = text;
      }
      div.appendChild(newP);
    });
    const sectionMetaCells = [
      ["Section Metadata"],
      ["style", "highlight"]
    ];
    const sectionMetaTable = WebImporter.DOMUtils.createTable(sectionMetaCells, document);
    div.appendChild(sectionMetaTable);
    const parent = overviewSection.closest(".overviewtext") || overviewSection;
    parent.replaceWith(div);
  }
  function extractClimateText(document, main) {
    const allTexts = main.querySelectorAll(".text .cmp-text");
    let climateText = null;
    allTexts.forEach((cmpText) => {
      const h2 = cmpText.querySelector("h2");
      if (h2 && h2.textContent.includes("climate targets")) {
        const parent2 = cmpText.closest(".text");
        if (parent2 && parent2.className.includes("default--12")) {
          climateText = cmpText;
        }
      }
    });
    if (!climateText) return;
    const div = document.createElement("div");
    const heading = climateText.querySelector("h2");
    if (heading) {
      const h2 = document.createElement("h2");
      h2.textContent = heading.textContent.trim();
      div.appendChild(h2);
    }
    climateText.querySelectorAll("p").forEach((p) => {
      const text = p.textContent.trim();
      if (!text || text === "\xA0") return;
      const newP = document.createElement("p");
      const link = p.querySelector("a");
      if (link) {
        [...p.childNodes].forEach((node) => {
          if (node.nodeType === 3) {
            newP.appendChild(document.createTextNode(node.textContent));
          } else if (node.tagName === "A") {
            const a = document.createElement("a");
            a.href = node.href;
            a.textContent = node.textContent;
            if (node.title) a.title = node.title;
            newP.appendChild(a);
          } else if (node.tagName === "SPAN") {
            newP.appendChild(document.createTextNode(node.textContent));
          }
        });
      } else {
        newP.textContent = text;
      }
      div.appendChild(newP);
    });
    const parent = climateText.closest(".text");
    if (parent) parent.replaceWith(div);
  }
  function extractInfographic(document, main) {
    let infographic = main.querySelector("section.image-body-text.medium");
    if (!infographic) {
      const candidates = main.querySelectorAll('.imageinbodytext[class*="default--12"] section.image-body-text');
      for (const candidate of candidates) {
        const img2 = candidate.querySelector("img");
        if (img2 && (img2.alt.toLowerCase().includes("chart") || img2.alt.toLowerCase().includes("infographic") || img2.alt.toLowerCase().includes("target"))) {
          infographic = candidate;
          break;
        }
      }
    }
    if (!infographic) return;
    const picture = infographic.querySelector(".content-image picture");
    const img = infographic.querySelector(".content-image img");
    const caption = infographic.querySelector(".image-caption p, .image-caption");
    const allSrcs = getAllViewportSrcs(picture || img);
    const alt = img ? img.alt || "" : "";
    const hasViewportVariants = allSrcs.length > 1;
    if (hasViewportVariants) {
      const imageCell = document.createElement("div");
      allSrcs.forEach(({ src }) => {
        const newImg = document.createElement("img");
        newImg.src = src;
        newImg.alt = alt;
        imageCell.appendChild(newImg);
      });
      const rows = [[imageCell]];
      const table = createBlock(document, "Columns", rows);
      const captionEl = document.createElement("p");
      if (caption) {
        const em = document.createElement("em");
        em.textContent = caption.textContent.trim();
        captionEl.appendChild(em);
      }
      const hr = document.createElement("hr");
      const parent = infographic.closest(".imageinbodytext") || infographic;
      parent.remove();
      main.appendChild(hr);
      main.appendChild(table);
      if (caption) main.appendChild(captionEl);
    } else {
      const div = document.createElement("div");
      if (picture || img) {
        const newImg = document.createElement("img");
        newImg.src = allSrcs.length > 0 ? allSrcs[0].src : img ? img.src : "";
        newImg.alt = alt;
        div.appendChild(newImg);
      }
      if (caption) {
        const em = document.createElement("em");
        em.textContent = caption.textContent.trim();
        const p = document.createElement("p");
        p.appendChild(em);
        div.appendChild(p);
      }
      const parent = infographic.closest(".imageinbodytext") || infographic;
      parent.replaceWith(div);
    }
  }
  function insertSectionBreaks(document, main) {
    const tables = [...main.querySelectorAll("table")];
    const heroTable = tables.find((t) => {
      const first = t.querySelector("td, th");
      return first && first.textContent.trim() === "Hero";
    });
    if (heroTable) heroTable.after(document.createElement("hr"));
    const cardsTable = tables.find((t) => {
      const first = t.querySelector("td, th");
      return first && first.textContent.trim() === "Cards";
    });
    if (cardsTable) cardsTable.after(document.createElement("hr"));
    const columnsTables = tables.filter((t) => {
      const first = t.querySelector("td, th");
      return first && first.textContent.trim() === "Columns";
    });
    columnsTables.forEach((colTable) => {
      colTable.after(document.createElement("hr"));
    });
    const sectionMetaTable = tables.find((t) => {
      const first = t.querySelector("td, th");
      return first && first.textContent.trim() === "Section Metadata";
    });
    if (sectionMetaTable) {
      const calloutDiv = sectionMetaTable.parentElement;
      if (calloutDiv) {
        const prevEl = calloutDiv.previousElementSibling;
        if (!prevEl || prevEl.tagName !== "HR") {
          calloutDiv.before(document.createElement("hr"));
        }
        const nextEl = calloutDiv.nextElementSibling;
        if (!nextEl || nextEl.tagName !== "HR") {
          calloutDiv.after(document.createElement("hr"));
        }
      }
    }
  }
  var import_annual_report_performance_default = {
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
        if (uniqueUrls.length > 1) {
          viewportVariants.push({
            alt: img ? img.alt : "",
            ...variants
          });
        }
      });
      extractHero(document, main);
      extractStickyNav(document, main);
      extractKpiCards(document, main);
      extractContentColumns(document, main);
      extractOverview(document, main);
      extractClimateText(document, main);
      extractInfographic(document, main);
      executeTransformers("afterTransform", main, payload);
      insertSectionBreaks(document, main);
      main.querySelectorAll("picture").forEach((picture) => {
        const img = picture.querySelector("img");
        if (!img) return;
        const allSrcs = getAllViewportSrcs(picture);
        const alt = img.alt || "";
        if (allSrcs.length > 1) {
          const imageCell = document.createElement("div");
          allSrcs.forEach(({ src }) => {
            const newImg = document.createElement("img");
            newImg.src = src;
            newImg.alt = alt;
            imageCell.appendChild(newImg);
          });
          const table = createBlock(document, "Columns", [[imageCell]]);
          picture.replaceWith(table);
        } else {
          const desktopSrc = getDesktopImgSrc(picture);
          if (desktopSrc && desktopSrc !== img.src) {
            img.src = desktopSrc;
          }
        }
      });
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
        report: {
          title: document.title,
          template: "annual-report-performance",
          viewportVariants: viewportVariants.length > 0 ? JSON.stringify(viewportVariants) : void 0
        }
      }];
    }
  };
  return __toCommonJS(import_annual_report_performance_exports);
})();

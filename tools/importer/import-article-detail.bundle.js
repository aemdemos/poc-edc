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

  // tools/importer/import-article-detail.js
  var import_article_detail_exports = {};
  __export(import_article_detail_exports, {
    default: () => import_article_detail_default
  });

  // tools/importer/parsers/hero.js
  function parse(element, { document, getDesktopImgSrc: getDesktopImgSrc2 }) {
    const picture = element.querySelector("picture");
    const img = element.querySelector("img");
    const heading = element.querySelector("h1.title, h1");
    const cell = document.createElement("div");
    if (picture || img) {
      const desktopSrc = getDesktopImgSrc2(picture || img);
      const alt = img ? img.alt || "" : "";
      const newImg = document.createElement("img");
      newImg.src = desktopSrc || (img ? img.src : "");
      newImg.alt = alt;
      cell.appendChild(newImg);
    }
    if (heading) {
      const h1 = document.createElement("h1");
      h1.textContent = heading.textContent.trim();
      cell.appendChild(h1);
    }
    const cells = [["Hero"], [cell]];
    const table = WebImporter.DOMUtils.createTable(cells, document);
    element.replaceWith(table);
  }

  // tools/importer/parsers/article-body.js
  function parse2(element, { document, main }) {
    if (!element) return;
    element.querySelectorAll("[style]").forEach((el) => el.removeAttribute("style"));
    element.querySelectorAll("[data-uuid]").forEach((el) => el.removeAttribute("data-uuid"));
    element.querySelectorAll("p").forEach((p) => {
      if (!p.textContent.trim() && !p.querySelector("img, picture, a")) {
        p.remove();
      }
    });
    const parent = element.parentElement;
    if (parent) {
      while (element.firstChild) {
        parent.insertBefore(element.firstChild, element);
      }
      element.remove();
    }
  }

  // tools/importer/parsers/recommended-articles.js
  function parse3(element, { document }) {
    if (!element) return;
    const cell = document.createElement("div");
    cell.textContent = "Recommended articles for you";
    const cells = [["Recommended Articles"], [cell]];
    const table = WebImporter.DOMUtils.createTable(cells, document);
    element.replaceWith(table);
  }

  // tools/importer/parsers/metadata.js
  function parse4(element, { document, main }) {
    const meta = {};
    const title = document.querySelector("title");
    if (title) meta.Title = title.textContent.trim();
    const description = document.querySelector('meta[name="description"]');
    if (description) meta.Description = description.getAttribute("content")?.trim();
    meta.Template = "article-detail";
    const timeEl = document.querySelector("time.c-tidvi, time[dateTime]");
    if (timeEl) {
      const dateTime = timeEl.getAttribute("dateTime") || timeEl.textContent.trim();
      const parsed = new Date(dateTime);
      if (!Number.isNaN(parsed.getTime())) {
        meta.Date = parsed.toISOString().split("T")[0];
      } else {
        meta.Date = dateTime;
      }
    }
    const categoryEl = document.querySelector(".data-article-category, [data-primary-tag]");
    if (categoryEl) meta.Category = categoryEl.textContent.trim();
    const block = WebImporter.Blocks.getMetadataBlock(document, meta);
    main.appendChild(block);
  }

  // tools/importer/transformers/cleanup.js
  function transform(hookName, element, { document }) {
    if (hookName === "beforeTransform") {
      WebImporter.DOMUtils.remove(element, [
        "header",
        "footer",
        "script",
        "style",
        "noscript",
        'link[rel="stylesheet"]',
        "iframe",
        "#onetrust-consent-sdk",
        "#onetrust-banner-sdk"
      ]);
      WebImporter.DOMUtils.remove(element, [
        ".articlerightcontainer",
        ".onpagenavigation",
        ".newslettersubscription",
        ".tagcloud",
        ".c-recommended-articles ul"
      ]);
      element.querySelectorAll('[class*="default--hide"]').forEach((el) => el.remove());
      element.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((heading) => {
        if (!heading.textContent.trim()) heading.remove();
      });
      const timeEl = element.querySelector("time.c-tidvi, time");
      if (timeEl) {
        document.body.setAttribute("data-article-date", timeEl.textContent.trim());
      }
    }
    if (hookName === "afterTransform") {
      element.querySelectorAll("hr + hr").forEach((hr) => hr.remove());
      element.querySelectorAll("div:empty").forEach((div) => div.remove());
      element.querySelectorAll("[style]").forEach((el) => el.removeAttribute("style"));
      const dataAttrs = [
        "data-uuid",
        "data-event-component",
        "data-event-type",
        "data-event-name",
        "data-event-engagement",
        "data-event-level",
        "data-tap-close",
        "i18n-title"
      ];
      element.querySelectorAll("*").forEach((el) => {
        dataAttrs.forEach((attr) => el.removeAttribute(attr));
      });
    }
  }

  // tools/importer/import-article-detail.js
  var parsers = {
    "hero": parse,
    "article-body": parse2,
    "recommended-articles": parse3,
    "metadata": parse4
  };
  var transformers = [transform];
  var PAGE_TEMPLATE = {
    name: "article-detail",
    description: "Article detail pages featuring company export stories and insights",
    blocks: [
      { name: "hero", instances: [".articlehero"] },
      { name: "article-body", instances: [".articlebodycontainer .cmp-text"] },
      { name: "recommended-articles", instances: [".c-recommended-articles"] }
    ]
  };
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
        if ((source.getAttribute("media") || "").includes("992")) {
          return makeAbsolute(source.getAttribute("srcset") || source.getAttribute("srcSet"));
        }
      }
      if (sources.length > 0 && sources[0].getAttribute("srcset")) {
        return makeAbsolute(sources[0].getAttribute("srcset"));
      }
    }
    const img = element.tagName === "IMG" ? element : element.querySelector("img");
    return img ? img.src : null;
  }
  function executeTransformers(hookName, element, payload) {
    const enhancedPayload = { ...payload, template: PAGE_TEMPLATE };
    transformers.forEach((transformerFn) => {
      try {
        transformerFn.call(null, hookName, element, enhancedPayload);
      } catch (e) {
        console.error(`Transformer failed at ${hookName}:`, e);
      }
    });
  }
  var import_article_detail_default = {
    transform: (payload) => {
      const { document, url, html, params } = payload;
      const main = document.body;
      executeTransformers("beforeTransform", main, payload);
      const parserContext = { document, main, url, params, getDesktopImgSrc };
      const heroEl = main.querySelector(PAGE_TEMPLATE.blocks[0].instances.join(", "));
      if (heroEl) parsers["hero"](heroEl, parserContext);
      const articleDate = document.body.getAttribute("data-article-date");
      if (articleDate) {
        const datePara = document.createElement("p");
        const dateEm = document.createElement("em");
        dateEm.textContent = articleDate;
        datePara.appendChild(dateEm);
        const bodyText = main.querySelector(".articlebodycontainer .cmp-text");
        if (bodyText) bodyText.parentElement.insertBefore(datePara, bodyText);
      }
      const bodyEl = main.querySelector(PAGE_TEMPLATE.blocks[1].instances.join(", "));
      if (bodyEl) parsers["article-body"](bodyEl, parserContext);
      const hr1 = document.createElement("hr");
      main.appendChild(hr1);
      const recEl = main.querySelector(PAGE_TEMPLATE.blocks[2].instances.join(", "));
      if (recEl) parsers["recommended-articles"](recEl, parserContext);
      executeTransformers("afterTransform", main, payload);
      main.querySelectorAll("picture").forEach((picture) => {
        const img = picture.querySelector("img");
        if (!img) return;
        const desktopSrc = getDesktopImgSrc(picture);
        if (desktopSrc && desktopSrc !== img.src) img.src = desktopSrc;
      });
      const hr2 = document.createElement("hr");
      main.appendChild(hr2);
      parsers["metadata"](null, parserContext);
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
          template: PAGE_TEMPLATE.name
        }
      }];
    }
  };
  return __toCommonJS(import_article_detail_exports);
})();

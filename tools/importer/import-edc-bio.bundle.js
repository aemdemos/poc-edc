/* eslint-disable */
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

  // tools/importer/import-edc-bio.js
  var import_edc_bio_exports = {};
  __export(import_edc_bio_exports, {
    default: () => import_edc_bio_default
  });
  var PAGE_TEMPLATE = {
    name: "edc-bio",
    description: "EDC Author Bio / Profile page",
    urls: [
      "https://www.edc.ca/en/bio/isabel-dion.html"
    ]
  };
  var import_edc_bio_default = {
    transform: (payload) => {
      const { document, url, html, params } = payload;
      const main = document.body;
      const modifiedEl = main.querySelector(".c-date-modified__date, .modifieddate");
      const modifiedDate = modifiedEl ? modifiedEl.textContent.trim().replace("Date modified:", "").trim() : "";
      WebImporter.DOMUtils.remove(main, [
        "#onetrust-consent-sdk",
        ".modifieddate",
        "noscript"
      ]);
      main.querySelectorAll('[class*="aem-GridColumn--default--hide"]').forEach((el) => el.remove());
      const authorDetail = main.querySelector(".author-detail");
      if (authorDetail) {
        const authorBio = authorDetail.querySelector(".author.bio");
        const img = authorBio ? authorBio.querySelector("img") : null;
        const nameEl = authorDetail.querySelector(".info .name");
        const positionEl = authorDetail.querySelector(".info .position");
        const companyEl = authorDetail.querySelector(".info .company");
        const linkedinEl = authorDetail.querySelector("a.linkedin");
        const bioParas = authorDetail.querySelectorAll("p");
        const cellContent = [];
        if (img) {
          const pic = document.createElement("picture");
          const newImg = document.createElement("img");
          newImg.src = img.src;
          newImg.alt = nameEl ? nameEl.textContent.trim() : "";
          pic.appendChild(newImg);
          cellContent.push(pic);
        }
        if (nameEl) {
          const h3 = document.createElement("h3");
          h3.textContent = nameEl.textContent.trim();
          cellContent.push(h3);
        }
        if (positionEl) {
          const h3 = document.createElement("h3");
          h3.textContent = positionEl.textContent.trim();
          cellContent.push(h3);
        }
        if (companyEl && companyEl.textContent.trim()) {
          const h3 = document.createElement("h3");
          h3.textContent = companyEl.textContent.trim();
          cellContent.push(h3);
        }
        if (linkedinEl) {
          const p = document.createElement("p");
          const a = document.createElement("a");
          a.href = linkedinEl.getAttribute("href");
          a.textContent = "LinkedIn";
          p.appendChild(a);
          cellContent.push(p);
        }
        bioParas.forEach((para) => {
          const text = para.textContent.trim();
          if (text && text.length > 20) {
            const p = document.createElement("p");
            p.textContent = text;
            cellContent.push(p);
          }
        });
        if (cellContent.length > 0) {
          const heroBlock = WebImporter.Blocks.createBlock(document, {
            name: "hero",
            cells: [[cellContent]]
          });
          const profileContainer = authorDetail.closest(".authorprofile") || authorDetail.closest(".articlecontainer") || authorDetail;
          profileContainer.replaceWith(heroBlock);
        }
      }
      const articleList = main.querySelector(".c-recommended-articles");
      if (articleList) {
        const heading = articleList.querySelector("h2.title");
        const articles = articleList.querySelectorAll("li.article");
        const cardsCells = [];
        const articleBlocks = [];
        articles.forEach((article) => {
          const img = article.querySelector(".card-img img");
          const titleLink = article.querySelector(".description h3 a");
          const desc = article.querySelector(".description p");
          const tag = article.querySelector(".taglabel");
          const date = article.querySelector(".date");
          if (tag || date) {
            const tagCell = [];
            if (tag) {
              const p = document.createElement("p");
              p.textContent = tag.textContent.trim();
              tagCell.push(p);
            }
            const dateCell = [];
            if (date) {
              const p = document.createElement("p");
              p.textContent = date.textContent.trim();
              dateCell.push(p);
            }
            const columnsBlock = WebImporter.Blocks.createBlock(document, {
              name: "columns",
              cells: [[tagCell, dateCell]]
            });
            articleBlocks.push(columnsBlock);
          }
          const imageCell = [];
          if (img) {
            const pic = document.createElement("picture");
            const newImg = document.createElement("img");
            newImg.src = img.src;
            newImg.alt = img.alt || "";
            pic.appendChild(newImg);
            imageCell.push(pic);
          }
          const contentCell = [];
          if (titleLink) {
            const h3 = document.createElement("h3");
            const a = document.createElement("a");
            a.href = titleLink.getAttribute("href");
            a.textContent = titleLink.textContent.trim();
            h3.appendChild(a);
            contentCell.push(h3);
          }
          if (desc) {
            const p = document.createElement("p");
            p.textContent = desc.textContent.trim();
            contentCell.push(p);
          }
          if (imageCell.length || contentCell.length) {
            const cardBlock = WebImporter.Blocks.createBlock(document, {
              name: "cards",
              cells: [[imageCell, contentCell]]
            });
            articleBlocks.push(cardBlock);
          }
        });
        if (articleBlocks.length > 0) {
          const listContainer = articleList.closest(".list") || articleList;
          const wrapper = document.createElement("div");
          if (heading) {
            const h2 = document.createElement("h2");
            h2.textContent = heading.textContent.trim();
            wrapper.appendChild(h2);
          }
          articleBlocks.forEach((block) => wrapper.appendChild(block));
          listContainer.replaceWith(wrapper);
        }
      }
      WebImporter.DOMUtils.remove(main, [
        ".header",
        ".headerv2",
        ".cmp-headerv2",
        "footer",
        ".footer",
        "link"
      ]);
      const heroTable = main.querySelector("table");
      const articlesH2 = (() => {
        const h2s = main.querySelectorAll("h2");
        for (const h of h2s) {
          if (h.textContent.trim().toLowerCase().includes("other articles")) return h;
        }
        return null;
      })();
      const allTables = Array.from(main.querySelectorAll("table"));
      const articleTables = allTables.slice(1);
      main.textContent = "";
      if (heroTable) main.appendChild(heroTable);
      const sectionHr = document.createElement("hr");
      main.appendChild(sectionHr);
      if (articlesH2) main.appendChild(articlesH2);
      articleTables.forEach((table) => main.appendChild(table));
      if (modifiedDate) {
        const dateHr = document.createElement("hr");
        main.appendChild(dateHr);
        const datePara = document.createElement("p");
        datePara.textContent = "Date modified: " + modifiedDate;
        main.appendChild(datePara);
      }
      const metaHr = document.createElement("hr");
      main.appendChild(metaHr);
      WebImporter.rules.createMetadata(main, document);
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
  return __toCommonJS(import_edc_bio_exports);
})();

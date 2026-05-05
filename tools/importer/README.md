# Edge Delivery — page import toolkit

This folder supports **[AEM Importer](https://www.aem.live/developer/importer)** (Chrome / `aem import`) and **[Document Authoring imports](https://docs.da.live/administrators/guides/import)**. Nothing here runs an import unless **you** execute `aem import` or the parser CLIs with a URL.

## Layout

| Path | Role |
|------|------|
| **`import.js`** | **Importer entry** — point aemcoder / AEM CLI at this file. Re-exports the transformer. |
| **`transformer/transform-dom.js`** | **Transformer** — `preprocess` / `transformDOM` / `generateDocumentPath`; uses `WebImporter` in the browser. |
| **`parser/capture-page.mjs`** | **Parser** — Puppeteer capture (DOM outline, stylesheet previews, computed samples, HTML snippets) per viewport. |
| **`parser/fetch-html.mjs`** | **Parser** — raw HTML download via `fetch` (no browser). |
| **`parser/lib/slug-from-url.mjs`** | Shared slug helper for default output paths. |
| **`importer/print-help.mjs`** | Local commands and paths (no network). |

## Quick start — AEM Importer / aemcoder

1. Register **`tools/importer/import.js`** as the importer script (project root is usually this git repo).
2. Run **`aem import`** per [tutorial](https://www.aem.live/developer/tutorial).
3. Paste the source URL when you are ready to import; enable **Save HTML for Document Authoring** if you target **da.live**.
4. If images fail with CORS, run import locally so **`transform-dom.js`** can rewrite `img.src` through the proxy ([guidelines — Images](https://github.com/adobe/helix-importer-ui/blob/main/importer-guidelines.md)).

### Multi-file note

The entry file imports **`./transformer/transform-dom.js`**. Importer UIs that only accept a **single flat file** must either serve the whole `tools/importer` directory as the module root or bundle — most AEM CLI / recent flows resolve relative imports; if yours does not, open an issue with your UI vendor or concatenate for that environment only.

## Offline parser (Node)

```bash
cd tools/importer
npm install
npm run help
npm run capture -- "https://www.example.com/page.html"
npm run fetch-html -- "https://www.example.com/page.html"
```

- Default capture output: **`migration-work/parsed-pages/{slug}.json`** (repo root).
- Default fetch output: **`migration-work/raw-html/{slug}.html`** (repo root).

## edc.ca case study template (`case-study-page`)

When `meta name="template"` is `case-study-page` **or** the host is `*.edc.ca`, **`transform-dom.js`** maps AEM wrappers to block tables (variants when patterns repeat). Examples:

| AEM / behavior | Block / outcome |
|----------------|-----------------|
| `.pageherobanner` | `Hero (case-study)` |
| `.breadcrumb-wrapper` | Removed (navigation lives in header project) |
| `.companyataglance` + `.articlebodycontainer` | `Columns (case-study-layout)` |
| `.pullquote` | `Quote (pullquote)` / `Quote (pullquote-2)` … |
| `.imageinbodytext` | Unwrapped to default content (`<p><img>`) |
| `.list` (recommended articles) | `Cards (edc-services)` |

Also strips duplicate mobile sidebar, feedback widgets, empty `.sectiontitle`, inline stylesheets in article, etc.

### Variants

- Duplicate **direct child** `<section>` elements with the **same child-tag fingerprint** get `data-import-variant`.
- **`ENABLE_AUTO_BLOCK_TABLES`** in **`transform-dom.js`** (experimental) wraps top-level sections into generic block tables.

### Site-specific tuning

Edit **`removeSiteChrome`** / **`WebImporter.DOMUtils.remove`** in **`transform-dom.js`** for cookie banners, nav, etc.

## Related docs

- [Importing Content (AEM)](https://www.aem.live/developer/importer)
- [Importer guidelines (GitHub)](https://github.com/adobe/helix-importer-ui/blob/main/importer-guidelines.md)
- [Document Authoring — Import](https://docs.da.live/administrators/guides/import)

# Edge Delivery — page import toolkit

This folder supports **[AEM Importer](https://www.aem.live/developer/importer)** (Chrome / `aem import`) and **[Document Authoring imports](https://docs.da.live/administrators/guides/import)** so migrated pages render correctly on **da.live**, including **images** pulled through the importer proxy when needed.

## Files

| File | Role |
|------|------|
| **`import.js`** | **Importer transformer** — runs inside Helix Importer UI / AEM CLI. Strips chrome, fixes image URLs, metadata block, section breaks, duplicate `<section>` variant hints. |
| **`parser/capture-page.mjs`** | **Parser** — Node + Puppeteer full-page capture: DOM outline, stylesheet rule text (where readable), computed-style samples, image/link inventories, HTML snippets per viewport (`390/600/900/1200`). |

There is no separate "transformer" file for the browser: transformation logic lives in **`import.js`** (that *is* the transformer in AEM terms). The parser JSON is the offline input for tuning selectors / blocks.

This repository **only ships import rules and optional capture tooling**. It does **not** run imports or push content to da.live — you run **`aem import`** locally or use the importer UI yourself.

### edc.ca case study template (`case-study-page`)

When `meta name="template"` is `case-study-page` **or** the source host is `*.edc.ca`, `import.js` maps AEM component wrappers to block tables (with **variants** when the same pattern appears more than once):

| AEM wrapper | Block table |
|-------------|-------------|
| `.pageherobanner` | `Hero (case-study)` |
| `.breadcrumb-wrapper` | `Breadcrumbs` |
| `.companyataglance` | `Cards (company-at-a-glance)` + `Cards (pdf-download)` |
| `.pdfdownload` | `Cards (pdf-download)` |
| `.pullquote` | `Quote (pullquote)` or `Quote (pullquote-2)` … |
| `.imageinbodytext` | `Columns (media-1)` … |
| `.list` | `Cards (edc-services)` or numbered variants |
| `.modifieddate` | `Columns (date-modified)` |
| "Succeed with EDC" CTA | `Columns (cta)` |

Also removes:
- Duplicate **`.articlerightcontainer.for-mobile`** sidebar
- **`.pagelevelfeedback`** widgets
- Empty **`.sectiontitle`** decorative dividers
- Inline `<link rel="stylesheet">` tags within content
- Normalizes pullquote attribution (removes stray commas/dashes)

## Quick start — AEM Importer / aemcoder

1. From your project root, run **`aem import`** (see [tutorial](https://www.aem.live/developer/tutorial)).
2. Point the importer at this repo's **`tools/importer/import.js`** (project picker / settings depending on UI version).
3. Paste the source URL; enable **Save HTML for Document Authoring** if you target **da.live**.
4. If images fail in the Word/HTML output with CORS errors, run import via **`aem import`** locally so **`import.js`** can rewrite `img.src` through the proxy ([guidelines — Images](https://github.com/adobe/helix-importer-ui/blob/main/importer-guidelines.md)).

### Variants

- Duplicate **direct child** `<section>` elements with the **same child-tag fingerprint** get `data-import-variant` for differentiation.
- To emit explicit block variants in Word (`Block (variant)`), set **`ENABLE_AUTO_BLOCK_TABLES = true`** at the top of `import.js` (experimental). Prefer tightening selectors per site once patterns are known.

### Site-specific tuning

Edit **`removeSiteChrome`** / **`WebImporter.DOMUtils.remove`** selectors in `import.js` for your CMS (cookie banners, sticky nav, etc.).

## Parser — capture everything locally

```bash
cd tools/importer
npm install
npm run capture -- "https://www.example.com/path/page.html"
```

Default output: **`migration-work/parsed-pages/{slug}.json`** (from repo root).

Use this JSON to:

- Verify DOM structure before/after `import.js`
- Capture CSS rule text and computed snapshots for block/CSS work in the Git repo
- Feed Adobe I/O or internal automation (see `tools/adobe-io/page-import-contract.json`)

## Related docs

- [Importing Content (AEM)](https://www.aem.live/developer/importer)
- [Importer guidelines (GitHub)](https://github.com/adobe/helix-importer-ui/blob/main/importer-guidelines.md)
- [Document Authoring — Import](https://docs.da.live/administrators/guides/import)

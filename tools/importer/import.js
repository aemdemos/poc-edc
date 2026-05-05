/**
 * AEM Importer entry — register this path in AEM CLI / aemcoder.io / Helix Importer UI.
 * Runs in the browser with the `WebImporter` global; logic lives in `./transformer/transform-dom.js`.
 *
 * @see https://www.aem.live/developer/importer
 * @see https://github.com/adobe/helix-importer-ui/blob/main/importer-guidelines.md
 */

export { default } from './transformer/transform-dom.js';

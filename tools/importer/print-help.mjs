#!/usr/bin/env node
/**
 * Prints how to run AEM Importer against this repo (no network, no import execution).
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const importerRoot = path.dirname(fileURLToPath(import.meta.url));
const importEntry = path.join(importerRoot, 'import.js');
const transformer = path.join(importerRoot, 'transformer', 'transform-dom.js');

console.log(`
Edge Delivery — tools/importer
================================

Browser transformer (AEM Importer / da.live):
  Entry file:  ${importEntry}
  Logic:       ${transformer}

Register the entry path in:
  - AEM CLI:    aem import  (see https://www.aem.live/developer/importer )
  - aemcoder.io: project settings → importer script → path to import.js

Offline parser (Node, from ${importerRoot}):
  npm install
  npm run capture -- "<url>"              # Puppeteer: DOM + styles snapshot JSON
  npm run fetch-html -- "<url>"           # Raw HTML only (no browser)

Do not commit large capture outputs unless your team wants them in git.
`);

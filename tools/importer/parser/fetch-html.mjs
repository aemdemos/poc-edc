#!/usr/bin/env node
/**
 * Fetch raw HTML over HTTP (no headless browser). Optional input for local diff or custom parsers.
 *
 * Usage:
 *   node parser/fetch-html.mjs <page-url> [output-file-or-dir]
 *
 * Default output: ../../migration-work/raw-html/{slug}.html (from repo root)
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { slugFromUrl } from './lib/slug-from-url.mjs';

async function main() {
  const urlArg = process.argv[2];
  const outArg = process.argv[3];
  if (!urlArg || urlArg === '-h' || urlArg === '--help') {
    console.log('Usage: node parser/fetch-html.mjs <page-url> [output-file-or-dir]');
    process.exit(urlArg ? 0 : 1);
  }

  const res = await fetch(urlArg, {
    redirect: 'follow',
    headers: {
      'User-Agent': 'poc-edc-tools-importer/1.0 (offline analysis)',
      Accept: 'text/html,application/xhtml+xml',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

  const html = await res.text();
  const slug = slugFromUrl(urlArg);

  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
  const defaultDir = path.join(repoRoot, 'migration-work', 'raw-html');
  let outPath;
  if (!outArg) {
    await fs.mkdir(defaultDir, { recursive: true });
    outPath = path.join(defaultDir, `${slug}.html`);
  } else {
    const resolved = path.resolve(process.cwd(), outArg);
    const st = await fs.stat(resolved).catch(() => null);
    if (st?.isDirectory()) {
      outPath = path.join(resolved, `${slug}.html`);
    } else if (!st && !resolved.endsWith('.html') && !resolved.endsWith('.htm')) {
      await fs.mkdir(resolved, { recursive: true });
      outPath = path.join(resolved, `${slug}.html`);
    } else {
      await fs.mkdir(path.dirname(resolved), { recursive: true });
      outPath = resolved;
    }
  }

  await fs.writeFile(outPath, html, 'utf8');
  console.log(`Wrote ${outPath} (${html.length} bytes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

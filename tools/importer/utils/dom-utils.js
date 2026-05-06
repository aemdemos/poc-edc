/**
 * DOM helpers for the EDC case study importer (Node + jsdom).
 */

/**
 * @param {string} base
 * @param {string} ref
 * @returns {string}
 */
export function resolveUrl(base, ref) {
  try {
    return new URL(ref, base).href;
  } catch {
    return ref;
  }
}

/**
 * Serializes a node's outer HTML.
 * @param {import('jsdom').DOMParser | Document} doc
 * @param {Node|null} node
 * @returns {string}
 */
export function outerHtml(doc, node) {
  if (!node) return '';
  const container = doc.createElement('div');
  container.appendChild(node.cloneNode(true));
  return container.innerHTML;
}

/**
 * First matching element or null.
 * @param {Document|Element} root
 * @param {string} selector
 * @returns {Element|null}
 */
export function queryFirst(root, selector) {
  return root.querySelector(selector);
}

/**
 * Escapes text for safe HTML text nodes (fallback).
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Stable filename slug from a page URL (shared by parser CLI scripts).
 * @param {string} urlString
 * @returns {string}
 */
export function slugFromUrl(urlString) {
  try {
    const u = new URL(urlString);
    const base = u.pathname.replace(/\/$/, '').replace(/\.html?$/i, '') || 'index';
    return `${u.hostname}${base}`.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'page';
  } catch {
    return 'page';
  }
}

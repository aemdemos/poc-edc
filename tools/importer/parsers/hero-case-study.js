const SOURCE_BASE = 'https://www.edc.ca';

/**
 * @param {Document} document
 * @returns {{ blockName: string, cells: string[][] }}
 */
export function parse(document) {
  const hero = document.querySelector('section.c-page-hero-banner, section[role="banner"]');
  const imgWrap = hero?.querySelector('.img-wrapper picture, picture');
  const h1 = hero?.querySelector('h1');
  const subtitle = hero?.querySelector('.content .title + p') || hero?.querySelector('.content p');

  let pictureHtml = '';
  if (imgWrap) {
    const pic = imgWrap.closest('picture') || imgWrap;
    pictureHtml = pic.outerHTML.replace(/\ssrcSet=/gi, ' srcset=');
    pictureHtml = pictureHtml.replace(/src="\/([^"]+)"/g, (_, p) => `src="${SOURCE_BASE}/${p}"`);
    pictureHtml = pictureHtml.replace(/srcSet="([^"]+)"/gi, (_, raw) => {
      const abs = raw.replace(/(^|[,\s])\/content/g, `$1${SOURCE_BASE}/content`);
      return `srcset="${abs}"`;
    });
  }

  const title = h1?.textContent?.trim() || '';
  const sub = subtitle?.textContent?.trim() || '';
  const inner = `${pictureHtml}<h1>${title}</h1>${sub ? `<p class="hero-subtitle">${sub}</p>` : ''}`;

  return {
    blockName: 'Hero',
    cells: [[inner]],
  };
}

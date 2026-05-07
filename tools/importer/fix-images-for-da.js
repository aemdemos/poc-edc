const SOURCE_DOMAIN = 'https://www.edc.ca';

/**
 * Transforms a source image URL into a DA-compatible format.
 * Handles AEM content DAM paths, relative URLs, and dynamic media width tokens.
 * Returns a structured object preserving all image metadata for Universal Editor.
 *
 * @param {string} src - The raw image src or srcset value
 * @param {string} viewport - Viewport label: 'mobile' | 'tablet' | 'desktop' | 'default'
 * @returns {{ url: string, viewport: string, original: string }}
 */
export function fixImageForDA(src, viewport = 'default') {
  if (!src) return { url: '', viewport, original: '' };

  let url = src.trim();

  // Strip AEM dynamic media width placeholders
  url = url.replace(/\{\.width\}/g, '');
  url = url.replace(/\.coreimg(?:\.\d+)?\./, '.');

  // Resolve relative paths to absolute
  if (url.startsWith('/')) {
    url = `${SOURCE_DOMAIN}${url}`;
  }

  // Normalize /content/dam/ references
  if (url.includes('/content/dam/')) {
    const damPath = url.substring(url.indexOf('/content/dam/'));
    url = `${SOURCE_DOMAIN}${damPath}`;
  }

  return { url, viewport, original: src };
}

/**
 * Extracts all responsive image data from a <picture> element.
 * Sources are ordered strictly: mobile (576px), tablet (768px), desktop (992px).
 *
 * @param {Element} picture - The <picture> DOM element
 * @returns {{ images: Array, alt: string, title: string }}
 */
export function extractPictureData(picture) {
  if (!picture) return { images: [], alt: '', title: '' };

  const sources = [...picture.querySelectorAll('source')];
  const img = picture.querySelector('img');
  const images = [];

  const viewportOrder = [
    { media: '576', viewport: 'mobile' },
    { media: '768', viewport: 'tablet' },
    { media: '992', viewport: 'desktop' },
  ];

  viewportOrder.forEach(({ media, viewport }) => {
    const source = sources.find((s) => (s.getAttribute('media') || '').includes(media));
    if (source) {
      images.push(fixImageForDA(source.getAttribute('srcset'), viewport));
    }
  });

  // Fallback to <img> if no <source> elements
  if (images.length === 0 && img) {
    images.push(fixImageForDA(img.getAttribute('src'), 'default'));
  }

  return {
    images,
    alt: img?.getAttribute('alt') || '',
    title: img?.getAttribute('title') || '',
  };
}

/**
 * Processes a standalone <img> element or AEM cmp-image container.
 * Extracts src, alt, title, caption, and dimensions.
 *
 * @param {Element} element - An <img> element or .cmp-image container
 * @returns {{ image: object, alt: string, title: string, caption: string } | null}
 */
export function extractStandaloneImage(element) {
  if (!element) return null;

  const img = element.tagName === 'IMG' ? element : element.querySelector('img');
  if (!img) return null;

  const caption = element.querySelector('.cmp-image__title, [itemprop="caption"]');

  return {
    image: fixImageForDA(img.getAttribute('src'), 'default'),
    alt: img.getAttribute('alt') || '',
    title: img.getAttribute('title') || '',
    caption: caption ? caption.textContent.trim() : '',
    width: img.getAttribute('width') || '',
    height: img.getAttribute('height') || '',
  };
}

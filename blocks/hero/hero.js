export default function decorate(block) {
  const images = [...block.querySelectorAll('img')];
  const heading = block.querySelector('h1');
  const description = block.querySelector('p:not(:has(img))');

  if (images.length <= 1) return;

  // Multiple images = viewport variants (ordered mobile → tablet → desktop)
  // Build a single <picture> element with responsive <source> media queries
  const picture = document.createElement('picture');

  if (images.length === 3) {
    // mobile, tablet, desktop
    const [mobile, tablet, desktop] = images;

    const srcDesktop = document.createElement('source');
    srcDesktop.setAttribute('media', '(min-width: 900px)');
    srcDesktop.setAttribute('srcset', desktop.src);
    picture.appendChild(srcDesktop);

    const srcTablet = document.createElement('source');
    srcTablet.setAttribute('media', '(min-width: 600px)');
    srcTablet.setAttribute('srcset', tablet.src);
    picture.appendChild(srcTablet);

    const img = document.createElement('img');
    img.src = mobile.src;
    img.alt = mobile.alt || desktop.alt || '';
    img.loading = 'eager';
    picture.appendChild(img);
  } else if (images.length === 2) {
    // mobile, desktop
    const [mobile, desktop] = images;

    const srcDesktop = document.createElement('source');
    srcDesktop.setAttribute('media', '(min-width: 600px)');
    srcDesktop.setAttribute('srcset', desktop.src);
    picture.appendChild(srcDesktop);

    const img = document.createElement('img');
    img.src = mobile.src;
    img.alt = mobile.alt || desktop.alt || '';
    img.loading = 'eager';
    picture.appendChild(img);
  }

  // Rebuild block content
  block.textContent = '';

  const contentDiv = document.createElement('div');
  contentDiv.appendChild(picture);
  if (heading) contentDiv.appendChild(heading);
  if (description) contentDiv.appendChild(description);

  block.appendChild(contentDiv);
}

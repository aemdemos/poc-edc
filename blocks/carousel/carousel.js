import { moveInstrumentation, getBlockId } from '../../scripts/scripts.js';
import { createSliderControls, initSlider, showSlide } from '../../scripts/slider.js';

export { showSlide };

function buildResponsivePicture(imageColumn) {
  const pictures = imageColumn.querySelectorAll('picture');
  if (pictures.length <= 1) return;

  const imgs = [...pictures].map((pic) => pic.querySelector('img')).filter(Boolean);
  if (imgs.length <= 1) return;

  const picture = document.createElement('picture');
  const breakpoints = [
    { minWidth: 992, index: 0 },
    { minWidth: 768, index: 1 },
  ];

  breakpoints.forEach(({ minWidth, index }) => {
    if (imgs[index]) {
      const source = document.createElement('source');
      source.setAttribute('media', `(min-width: ${minWidth}px)`);
      source.setAttribute('srcset', imgs[index].src);
      picture.appendChild(source);
    }
  });

  const fallbackImg = imgs[imgs.length - 1] || imgs[0];
  const img = document.createElement('img');
  img.src = fallbackImg.src;
  img.alt = fallbackImg.alt || '';
  img.loading = 'eager';
  picture.appendChild(img);

  imageColumn.textContent = '';
  imageColumn.appendChild(picture);
}

function createSlide(row, slideIndex, carouselId) {
  const slide = document.createElement('li');
  slide.dataset.slideIndex = slideIndex;
  slide.setAttribute('id', `carousel-${carouselId}-slide-${slideIndex}`);
  slide.classList.add('carousel-slide');

  row.querySelectorAll(':scope > div').forEach((column, colIdx) => {
    column.classList.add(`carousel-slide-${colIdx === 0 ? 'image' : 'content'}`);
    if (colIdx === 0) buildResponsivePicture(column);
    slide.append(column);
  });

  const labeledBy = slide.querySelector('h1, h2, h3, h4, h5, h6');
  if (labeledBy) {
    slide.setAttribute('aria-labelledby', labeledBy.getAttribute('id'));
  }

  return slide;
}

export default async function decorate(block) {
  const blockId = getBlockId('carousel');
  block.setAttribute('id', blockId);
  block.setAttribute('aria-label', `carousel-${blockId}`);
  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', 'Carousel');

  const rows = block.querySelectorAll(':scope > div');
  const isSingleSlide = rows.length < 2;

  const container = document.createElement('div');
  container.classList.add('carousel-slides-container');

  const slidesWrapper = document.createElement('ul');
  slidesWrapper.classList.add('carousel-slides');
  slidesWrapper.setAttribute('tabindex', '0');
  slidesWrapper.setAttribute('aria-label', 'Carousel slides');
  block.prepend(slidesWrapper);

  if (!isSingleSlide) {
    const { indicatorsNav, buttonsContainer } = createSliderControls(rows.length);
    block.append(indicatorsNav);
    container.append(buttonsContainer);
  }

  rows.forEach((row, idx) => {
    const slide = createSlide(row, idx, blockId);
    moveInstrumentation(row, slide);
    slidesWrapper.append(slide);
    row.remove();
  });

  container.append(slidesWrapper);
  block.prepend(container);

  if (!isSingleSlide) {
    initSlider(block);
    slidesWrapper.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const current = parseInt(block.dataset.activeSlide, 10) || 0;
      const next = e.key === 'ArrowLeft' ? current - 1 : current + 1;
      e.preventDefault();
      showSlide(block, next, 'smooth');
    });
  }
}

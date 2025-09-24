// VaultIQ Landing Interactions

// Dynamic year in footer
const yearEl = document.getElementById('year');
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

// Hide landing when not on root path and only apply landing effects on root
const isLanding = window.location.pathname === '/';
if (!isLanding) {
  const header = document.querySelector('header.site-header');
  const main = document.querySelector('main.main');
  const footer = document.querySelector('footer.site-footer');
  if (header) header.style.display = 'none';
  if (main) main.style.display = 'none';
  if (footer) footer.style.display = 'none';
}

if (isLanding) {
  // Reveal on scroll
  const revealSelector = '.feature-card, .img-card, .headline, .subhead, .section-title';
  const revealEls = Array.from(document.querySelectorAll(revealSelector));
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.transition = 'opacity 600ms ease, transform 600ms ease';
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 }
  );

  revealEls.forEach((el) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(12px)';
    observer.observe(el);
  });

  // Dynamic image loading from /public/images/manifest.json
  const IMAGES_BASE = '/images';

  const select = (selector) => document.querySelector(selector);
  const createImg = (src, alt, isTall = false) => {
    const img = document.createElement('img');
    img.src = src;
    img.alt = alt || '';
    img.className = 'img-media';
    if (isTall) {
      // CSS uses .img-card.tall to set a portrait aspect ratio
    }
    return img;
  };

  const replaceFigureWithImage = (figure, src, captionText, isTall = false) => {
    if (!figure) return;
    figure.classList.remove('placeholder');
    if (isTall) figure.classList.add('tall');
    // Remove skeleton if present
    const skeleton = figure.querySelector('.img-skeleton');
    if (skeleton) skeleton.remove();

    // Insert/replace <img>
    let img = figure.querySelector('img.img-media');
    if (!img) {
      img = createImg(src, captionText || '');
      figure.insertBefore(img, figure.firstChild);
    } else {
      img.src = src;
    }

    // Update figcaption
    let caption = figure.querySelector('figcaption');
    if (!caption) {
      caption = document.createElement('figcaption');
      figure.appendChild(caption);
    }
    caption.textContent = captionText || '';
  };

  const renderGallery = (images) => {
    const grid = select('.gallery-grid');
    if (!grid || !Array.isArray(images) || images.length === 0) return;
    // Clear current placeholders
    grid.innerHTML = '';
    images.forEach((entry) => {
      const file = typeof entry === 'string' ? entry : entry?.src;
      if (!file) return;
      const caption = typeof entry === 'object' ? entry?.caption : '';
      const figure = document.createElement('figure');
      figure.className = 'img-card';
      const src = `${IMAGES_BASE}/${file}`;
      const img = createImg(src, caption || file);
      figure.appendChild(img);
      const figcaption = document.createElement('figcaption');
      figcaption.textContent = caption || '';
      figure.appendChild(figcaption);
      grid.appendChild(figure);
    });
  };

  const loadManifest = async () => {
    try {
      const response = await fetch(`${IMAGES_BASE}/manifest.json`, { cache: 'no-store' });
      if (!response.ok) return null;
      return await response.json();
    } catch (_) {
      return null;
    }
  };

  const hydrateImages = async () => {
    const manifest = await loadManifest();
    if (!manifest) return;

    // Hero image (optional)
    if (manifest.hero) {
      const heroFigure = select('.hero-media .img-card');
      replaceFigureWithImage(heroFigure, `${IMAGES_BASE}/${manifest.hero}`, manifest.heroCaption || '');
    }

    // Tall portrait (optional)
    if (manifest.portrait) {
      const portraitFigure = select('.contact-media .img-card');
      replaceFigureWithImage(portraitFigure, `${IMAGES_BASE}/${manifest.portrait}`, manifest.portraitCaption || '', true);
    }

    // Gallery images
    if (Array.isArray(manifest.gallery) && manifest.gallery.length > 0) {
      renderGallery(manifest.gallery);
    }
  };

  hydrateImages();
}

//


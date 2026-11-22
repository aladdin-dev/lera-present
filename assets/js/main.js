/* ============================================================
   Вся интерактивность сайта:
   шапка, меню, появление блоков, галерея с фильтром и просмотром
   фото, карточки приложений и игр, частицы на первом экране.
   ============================================================ */
'use strict';

(function () {
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const noHover = window.matchMedia('(hover: none)').matches;

  const ICONS = {
    calc: '#i-calc',
    test: '#i-test',
    book: '#i-book',
    atom: '#i-atom',
    robot: '#i-robot',
    gamepad: '#i-gamepad',
    ship: '#i-ship',
    arrow: '#i-arrow',
    plus: '#i-plus'
  };
  const icon = (name) => `<svg class="icon" aria-hidden="true"><use href="${ICONS[name] || '#i-atom'}"/></svg>`;

  /* ---------- 1. Данные: подстраховка ---------- */
  const categories = typeof GALLERY_CATEGORIES !== 'undefined' ? GALLERY_CATEGORIES : [];
  const photos = typeof GALLERY !== 'undefined' ? GALLERY : [];
  const tools = typeof TOOLS !== 'undefined' ? TOOLS : [];
  const games = typeof GAMES !== 'undefined' ? GAMES : [];

  /* ---------- 2. Шапка и индикатор прокрутки ---------- */
  const nav = $('#nav');
  const progress = $('#progressBar');
  let frame = 0;

  function onScroll() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const y = window.scrollY || window.pageYOffset;
      nav.classList.toggle('is-scrolled', y > 40);

      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (progress) {
        progress.style.width = max > 0 ? `${Math.min(100, (y / max) * 100)}%` : '0%';
      }
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();

  /* ---------- 3. Мобильное меню ---------- */
  const burger = $('#burger');
  const mobileMenu = $('#mobileMenu');

  function setMenu(open) {
    document.body.classList.toggle('is-menu-open', open);
    document.body.classList.toggle('is-locked', open);
    mobileMenu.classList.toggle('is-open', open);
    mobileMenu.setAttribute('aria-hidden', String(!open));
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  }

  if (burger && mobileMenu) {
    burger.addEventListener('click', () => setMenu(!document.body.classList.contains('is-menu-open')));
    $$('a', mobileMenu).forEach((link) => link.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.body.classList.contains('is-menu-open')) setMenu(false);
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 1080) setMenu(false);
    });
  }

  /* ---------- 4. Появление блоков при прокрутке ---------- */
  function initReveal() {
    const items = $$('.reveal');
    if (!('IntersectionObserver' in window) || reduceMotion) {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    items.forEach((el) => io.observe(el));
  }

  /* ---------- 5. Активный пункт меню ---------- */
  function initActiveNav() {
    const links = $$('.nav__links a[data-nav]');
    if (!links.length || !('IntersectionObserver' in window)) return;

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        links.forEach((l) => l.classList.toggle('is-active', l.dataset.nav === id));
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

    ['about', 'directions', 'gallery', 'games'].forEach((id) => {
      const section = document.getElementById(id);
      if (section) io.observe(section);
    });
  }

  /* ---------- 6. Направления ---------- */
  function renderDirections() {
    const grid = $('#dirGrid');
    if (!grid) return;

    grid.innerHTML = categories.map((cat, i) => `
      <a class="dir-card tilt reveal" href="#gallery" data-filter="${cat.id}" style="--reveal-delay:${i * 70}ms">
        <img src="assets/img/${cat.cover}.webp" alt="" loading="lazy" decoding="async">
        <span class="dir-card__num">0${i + 1}</span>
        <span class="dir-card__body">
          <span class="dir-card__text">
            <span class="dir-card__title">${cat.title}</span>
            <span class="dir-card__desc">${cat.description}</span>
          </span>
          <span class="dir-card__arrow">${icon('arrow')}</span>
        </span>
      </a>
    `).join('');
  }

  /* ---------- 7. Галерея ---------- */
  const tabsEl = $('#galleryTabs');
  const galleryGrid = $('#galleryGrid');
  const moreBtn = $('#galleryMore');
  const moreWrap = $('#galleryMoreWrap');
  const BATCH = 9;
  let currentFilter = 'all';
  let visibleLimit = BATCH;
  let visiblePhotos = [];

  function countFor(id) {
    return photos.filter((p) => p.cat === id).length;
  }

  function renderTabs() {
    if (!tabsEl) return;
    const all = { id: 'all', title: 'Все фото' };
    const list = [all].concat(categories);

    tabsEl.innerHTML = list.map((cat) => `
      <button class="tab" type="button" aria-pressed="false" data-filter="${cat.id}">
        ${cat.title}
        <span class="tab__count">${cat.id === 'all' ? photos.length : countFor(cat.id)}</span>
      </button>
    `).join('');
  }

  function renderGallery() {
    if (!galleryGrid) return;

    galleryGrid.innerHTML = photos.map((photo) => `
      <button class="gallery__item is-hidden" type="button" data-cat="${photo.cat}" data-id="${photo.id}"
              aria-label="Открыть фотографию: ${photo.title}">
        <img src="assets/img/gallery/${photo.id}-sm.webp" width="${photo.w}" height="${photo.h}"
             alt="${photo.alt}" loading="lazy" decoding="async">
        <span class="gallery__cap">${photo.title}</span>
      </button>
    `).join('');

    applyFilter(currentFilter, false);
  }

  function updateMoreButton(total) {
    if (!moreBtn || !moreWrap) return;
    const left = total - Math.min(visibleLimit, total);
    moreWrap.hidden = left <= 0;
    moreBtn.textContent = `Показать ещё ${left} фото`;
  }

  function applyFilter(filter, animate = true, resetLimit = true) {
    if (!galleryGrid) return;
    currentFilter = filter;
    if (resetLimit) visibleLimit = BATCH;

    $$('.tab', tabsEl || document).forEach((tab) => {
      tab.setAttribute('aria-pressed', String(tab.dataset.filter === filter));
    });

    const matching = photos.filter((p) => filter === 'all' || p.cat === filter);
    visiblePhotos = matching.slice(0, visibleLimit);

    let shown = 0;
    $$('.gallery__item', galleryGrid).forEach((item) => {
      const index = matching.findIndex((p) => p.id === item.dataset.id);
      const matches = index > -1 && index < visibleLimit;
      item.classList.toggle('is-hidden', !matches);
      item.classList.remove('is-in');
      if (matches) {
        if (animate && !reduceMotion) {
          item.style.animationDelay = `${Math.min(shown, 14) * 24}ms`;
          // перезапуск анимации
          void item.offsetWidth;
          item.classList.add('is-in');
        }
        shown += 1;
      }
    });

    updateMoreButton(matching.length);
  }

  if (moreBtn) {
    moreBtn.addEventListener('click', () => {
      visibleLimit += BATCH;
      applyFilter(currentFilter, true, false);
    });
  }

  if (tabsEl) {
    tabsEl.addEventListener('click', (e) => {
      const tab = e.target.closest('.tab');
      if (!tab) return;
      applyFilter(tab.dataset.filter);
    });
  }

  if (galleryGrid) {
    galleryGrid.addEventListener('click', (e) => {
      const item = e.target.closest('.gallery__item');
      if (!item) return;
      openLightbox(item.dataset.id);
    });
  }

  // переход из карточек направлений к отфильтрованной галерее
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-filter]');
    if (!trigger || trigger.classList.contains('tab')) return;
    applyFilter(trigger.dataset.filter);
  });

  /* ---------- 8. Просмотр фотографий ---------- */
  const lightbox = $('#lightbox');
  const lbImage = $('#lbImage');
  const lbCaption = $('#lbCaption');
  const lbCount = $('#lbCount');
  let lbIndex = 0;

  function openLightbox(id) {
    if (!lightbox) return;
    const list = visiblePhotos.length ? visiblePhotos : photos;
    const found = list.findIndex((p) => p.id === id);
    lbIndex = found < 0 ? 0 : found;
    showPhoto(lbIndex);

    if (typeof lightbox.showModal === 'function') {
      lightbox.showModal();
    } else {
      lightbox.setAttribute('open', '');
    }
    document.body.classList.add('is-locked');
  }

  function showPhoto(index) {
    const list = visiblePhotos.length ? visiblePhotos : photos;
    if (!list.length) return;

    lbIndex = (index + list.length) % list.length;
    const photo = list[lbIndex];

    lbImage.classList.remove('is-loaded');
    lbImage.src = `assets/img/gallery/${photo.id}.webp`;
    lbImage.alt = photo.alt;
    lbCaption.textContent = photo.title;
    lbCount.textContent = `${lbIndex + 1} / ${list.length}`;

    const markLoaded = () => lbImage.classList.add('is-loaded');
    if (lbImage.complete) {
      markLoaded();
    } else {
      lbImage.onload = markLoaded;
    }
  }

  function closeLightbox() {
    if (!lightbox) return;
    if (typeof lightbox.close === 'function' && lightbox.open) {
      lightbox.close();
    } else {
      lightbox.removeAttribute('open');
    }
    document.body.classList.remove('is-locked');
  }

  if (lightbox) {
    $('#lbClose').addEventListener('click', closeLightbox);
    $('#lbPrev').addEventListener('click', () => showPhoto(lbIndex - 1));
    $('#lbNext').addEventListener('click', () => showPhoto(lbIndex + 1));

    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox || e.target.classList.contains('lightbox__stage')) closeLightbox();
    });
    lightbox.addEventListener('close', () => document.body.classList.remove('is-locked'));

    lightbox.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        showPhoto(lbIndex - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        showPhoto(lbIndex + 1);
      }
    });
  }

  /* ---------- 9. Методическая копилка ---------- */
  function renderTools() {
    const grid = $('#toolsGrid');
    if (!grid) return;

    const cards = tools.map((tool, i) => `
      <a class="tool-card reveal" href="${tool.url}" target="_blank" rel="noopener"
         style="--reveal-delay:${i * 80}ms" aria-label="${tool.title} — открыть приложение">
        <span class="tool-card__top">
          <span class="tool-card__icon">${icon(tool.icon)}</span>
          <span class="tool-card__index">0${i + 1}</span>
        </span>
        <div>
          <div class="tool-card__sub">${tool.subtitle}</div>
          <h3 class="tool-card__title">${tool.title}</h3>
        </div>
        <p class="tool-card__desc">${tool.description}</p>
        <span class="tool-card__foot">
          <span class="tool-card__tag">${tool.tag}</span>
          <span class="tool-card__open">Открыть ${icon('arrow')}</span>
        </span>
      </a>
    `);

    cards.push(`
      <div class="tool-card tool-card--soon reveal" style="--reveal-delay:${tools.length * 80}ms">
        <span class="tool-card__plus">${icon('plus')}</span>
        <strong>Здесь появится следующее приложение</strong>
        <span>Копилка пополняется</span>
      </div>
    `);

    grid.innerHTML = cards.join('');
  }

  /* ---------- 10. Переменка ---------- */
  function renderGames() {
    const grid = $('#gamesGrid');
    if (!grid) return;

    const cards = games.map((game, i) => {
      if (game.featured) {
        return `
          <a class="game-card reveal" href="${game.url}" target="_blank" rel="noopener"
             style="--reveal-delay:${i * 80}ms" aria-label="${game.title} — играть">
            <span class="game-card__glow" aria-hidden="true"></span>
            <span class="game-card__art" aria-hidden="true">
              <span class="game-card__art-core">${icon(game.icon)}</span>
            </span>
            <span class="game-card__body">
              <span class="game-card__tag">${game.tag}</span>
              <span class="game-card__title">${game.title}</span>
              <span class="game-card__sub">${game.subtitle}</span>
              <span class="game-card__desc">${game.description}</span>
              <span class="game-card__cta">Играть ${icon('arrow')}</span>
            </span>
          </a>
        `;
      }
      return `
        <a class="game-card game-card--soon reveal" href="${game.url}" target="_blank" rel="noopener">
          <span class="game-card__soon-icon">${icon(game.icon)}</span>
          <strong>${game.title}</strong>
          <span>${game.description}</span>
        </a>
      `;
    });

    cards.push(`
      <div class="game-card game-card--soon reveal" style="--reveal-delay:${games.length * 80}ms">
        <span class="game-card__soon-icon">${icon('gamepad')}</span>
        <strong>Скоро здесь появится новая игра</strong>
        <span>Раздел пополняется — заходите ещё</span>
      </div>
    `);

    grid.innerHTML = cards.join('');
  }

  /* ---------- 11. Лёгкий наклон карточек ---------- */
  function initTilt() {
    if (noHover || reduceMotion) return;

    $$('.tilt').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const rect = card.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform =
          `perspective(1000px) rotateX(${(-py * 4).toFixed(2)}deg) rotateY(${(px * 4).toFixed(2)}deg) translateY(-3px)`;
      });
      card.addEventListener('pointerleave', () => {
        card.style.transform = '';
      });
    });
  }

  /* ---------- 12. Бегущая строка ---------- */
  function initTicker() {
    const track = $('#tickerTrack');
    if (!track) return;

    const words = Array.from(track.children);
    if (!words.length) return;

    const group = document.createElement('div');
    group.className = 'ticker__group';

    for (let copy = 0; copy < 3; copy += 1) {
      words.forEach((word) => group.appendChild(word.cloneNode(true)));
    }

    track.replaceChildren(group, group.cloneNode(true));
  }

  /* ---------- 13. Частицы на первом экране ---------- */
  function initParticles() {
    const canvas = $('#particles');
    if (!canvas || reduceMotion) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dots = [];
    let animation = 0;
    let visible = true;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.max(18, Math.min(58, Math.round((width * height) / 30000)));
      dots = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.24,
        vy: (Math.random() - 0.5) * 0.24,
        r: Math.random() * 1.6 + 0.5
      }));
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < dots.length; i += 1) {
        const dot = dots[i];
        dot.x += dot.vx;
        dot.y += dot.vy;

        if (dot.x < -12) dot.x = width + 12;
        if (dot.x > width + 12) dot.x = -12;
        if (dot.y < -12) dot.y = height + 12;
        if (dot.y > height + 12) dot.y = -12;

        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(231, 185, 127, .5)';
        ctx.fill();
      }

      for (let i = 0; i < dots.length; i += 1) {
        for (let j = i + 1; j < dots.length; j += 1) {
          const dx = dots[i].x - dots[j].x;
          const dy = dots[i].y - dots[j].y;
          const dist = Math.hypot(dx, dy);
          if (dist < 118) {
            ctx.beginPath();
            ctx.moveTo(dots[i].x, dots[i].y);
            ctx.lineTo(dots[j].x, dots[j].y);
            ctx.strokeStyle = `rgba(231, 185, 127, ${(1 - dist / 118) * 0.14})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      animation = requestAnimationFrame(draw);
    }

    function start() {
      if (animation) return;
      animation = requestAnimationFrame(draw);
    }

    function stop() {
      if (!animation) return;
      cancelAnimationFrame(animation);
      animation = 0;
    }

    resize();
    start();

    window.addEventListener('resize', () => {
      resize();
    }, { passive: true });

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          visible = entry.isIntersecting;
          if (visible) start();
          else stop();
        });
      }, { threshold: 0 });
      io.observe(canvas);
    }

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else if (visible) start();
    });
  }

  /* ---------- 14. Мелочи ---------- */
  function initMisc() {
    const year = $('#year');
    if (year) year.textContent = String(new Date().getFullYear());
  }

  /* ---------- 15. Запуск ---------- */
  function init() {
    renderDirections();
    renderTabs();
    renderGallery();
    renderTools();
    renderGames();
    initTicker();
    initReveal();
    initActiveNav();
    initTilt();
    initParticles();
    initMisc();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

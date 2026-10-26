/* Home: collections carousel, shop grid, craft accordion, and the scroll choreography. */
(function () {
  const X = window.XIA;
  const { products, collections, img, srcset, url } = X;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

  /* ---------- collections carousel ---------- */
  const stage = $('[data-looks]');
  const track = $('[data-looks-track]');
  const n = products.length;
  let active = 0;

  track.innerHTML = products.map((p, i) =>
    '<a class="look" href="' + url(p) + '" data-i="' + i + '">' +
    '<img src="' + img(p) + '" srcset="' + srcset(p) + '" sizes="(max-width: 700px) 58vw, 380px" alt="' + p.name + ': ' + p.alt + '" width="900" height="1350" loading="lazy" draggable="false"></a>'
  ).join('');
  const looks = $$('.look', track);
  // Motion hooks, filled in by the choreography below when GSAP is available.
  let popLook = () => {};
  let popCards = () => {};

  function layout() {
    const W = looks[0].offsetWidth;
    const s = 0.56, w = W * s, gap = W * 0.07;
    looks.forEach((el, i) => {
      let d = i - active;
      if (d > n / 2) d -= n;
      if (d < -n / 2) d += n;
      const ad = Math.abs(d);
      const x = ad ? Math.sign(d) * (W / 2 + gap + w / 2 + (ad - 1) * (w + gap)) : 0;
      el.style.transform = 'translateX(' + x + 'px) scale(' + (ad ? s : 1) + ')';
      el.style.opacity = ad > 3 ? 0 : ad ? 0.72 - ad * 0.12 : 1;
      el.style.zIndex = 10 - ad;
      el.classList.toggle('is-active', !ad);
      el.tabIndex = ad ? -1 : 0;
      el.setAttribute('aria-hidden', String(!!ad));
    });
    const p = products[active], c = collections[p.collection];
    $('[data-meta="collection"]').innerHTML = '<span lang="zh-Hant">' + c.han + '</span> ' + c.name;
    $('[data-meta="lineup"]').textContent = 'Look ' + (active + 1) + ' of ' + n;
    $('[data-meta="look"]').textContent = p.name;
    $('[data-looks-count]').textContent = String(active + 1).padStart(2, '0') + '/' + String(n).padStart(2, '0');
  }
  function go(i) { active = (i + n) % n; layout(); popLook(looks[active]); }

  $('[data-looks-prev]').addEventListener('click', () => go(active - 1));
  $('[data-looks-next]').addEventListener('click', () => go(active + 1));
  stage.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { go(active - 1); e.preventDefault(); }
    if (e.key === 'ArrowRight') { go(active + 1); e.preventDefault(); }
  });
  let x0 = null, dragged = false;
  track.addEventListener('pointerdown', (e) => { x0 = e.clientX; dragged = false; });
  track.addEventListener('pointerup', (e) => {
    if (x0 === null) return;
    const dx = e.clientX - x0;
    if (Math.abs(dx) > 40) { dragged = true; go(active + (dx < 0 ? 1 : -1)); }
    x0 = null;
  });
  track.addEventListener('click', (e) => {
    const el = e.target.closest('.look');
    if (!el) return;
    if (dragged || !el.classList.contains('is-active')) { e.preventDefault(); if (!dragged) go(+el.dataset.i); }
  });
  addEventListener('resize', layout);
  layout();

  /* ---------- shop grid ---------- */
  const grid = $('[data-shop-grid]');
  X.cards.mount(grid, products);

  const blurb = $('[data-shop-blurb]');
  function filter(key) {
    $$('[data-filter]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === key)));
    $$('.card', grid).forEach((c) => { c.hidden = key !== 'all' && c.dataset.collection !== key; });
    popCards($$('.card:not([hidden])', grid));
    const c = collections[key];
    blurb.innerHTML = c ? '<span lang="zh-Hant">' + c.han + '</span> ' + c.name + ' (' + c.gloss + '). ' + c.blurb
                        : 'Eight pieces across three collections.';
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  }
  $$('[data-filter]').forEach((b) => b.addEventListener('click', () => filter(b.dataset.filter)));
  document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-filter-link]');
    if (link) filter(link.dataset.filterLink);
  });
  const fromUrl = new URLSearchParams(location.search).get('c');
  if (fromUrl && (collections[fromUrl] || fromUrl === 'all')) filter(fromUrl);

  /* ---------- craft accordion ---------- */
  const items = $$('.craft-item');
  items.forEach((item) => {
    const panel = $('.craft-panel', item);
    panel.hidden = false;
    panel.inert = !item.classList.contains('is-open');
    $('button', item).addEventListener('click', (e) => {
      const btn = e.currentTarget;
      const opening = btn.getAttribute('aria-expanded') !== 'true';
      items.forEach((o) => {
        const on = o === item && opening;
        o.classList.toggle('is-open', on);
        $('button', o).setAttribute('aria-expanded', String(on));
        $('.craft-panel', o).inert = !on;
      });
      if (opening) X.activateFilm($('[data-detail-film="' + btn.dataset.detail + '"]'));
    });
  });

  /* ---------- choreography ---------- */
  const root = document.documentElement;
  const title = $('[data-split]');
  const gsap = window.gsap;
  if (!gsap || !window.ScrollTrigger || X.reduce.matches) { root.classList.remove('intro'); return; }
  gsap.registerPlugin(window.ScrollTrigger);
  const ST = window.ScrollTrigger;

  // Split the hero title into masked letters (the h1 keeps its readable text for assistive tech).
  title.setAttribute('aria-label', title.textContent);
  title.innerHTML = title.textContent.split(' ').map((w) =>
    '<span class="word" aria-hidden="true">' + w.split('').map((ch) => '<span class="clip"><span class="char">' + ch + '</span></span>').join('') + '</span>'
  ).join(' ');

  // The one orchestrated moment: the title rises out of the paper while the film's own ink strokes fly in.
  const intro = gsap.timeline({ defaults: { ease: 'expo.out' } });
  intro.from('.hero-title .char', { yPercent: 115, duration: 1.4, stagger: 0.045 }, 0.2)
       .from('.brand .seal', { scale: 1.7, rotate: -14, opacity: 0, duration: 0.7, ease: 'back.out(2.2)' }, 0.7)
       .from('.brand-word, .nav-links a, .nav-actions > *', { opacity: 0, y: -8, duration: 0.8, stagger: 0.05 }, 0.9)
       .from('.hero-cta, .hero-note, .hero-han', { opacity: 0, y: 14, duration: 1, stagger: 0.12, ease: 'power3.out' }, 1.1);
  root.classList.remove('intro');

  gsap.to('.hero-title', { yPercent: -35, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero-film video', { scale: 1.08, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

  // About: an editorial mask lifts off each frame.
  gsap.from('.about-img', {
    clipPath: 'inset(100% 0% 0% 0%)', duration: 1.5, ease: 'expo.out', stagger: 0.14,
    scrollTrigger: { trigger: '.about', start: 'top 72%' }
  });
  gsap.from('.about-img img', { scale: 1.25, duration: 2, ease: 'expo.out', stagger: 0.14, scrollTrigger: { trigger: '.about', start: 'top 72%' } });

  // Collections: the lineup rises out of its frames from the centre outwards; each new look settles in with a pop.
  gsap.from('.look img', {
    yPercent: 105, duration: 1.3, ease: 'expo.out', stagger: { each: 0.08, from: 'center' },
    scrollTrigger: { trigger: stage, start: 'top 75%' }
  });
  popLook = (el) => gsap.fromTo($('img', el), { scale: 1.14 }, { scale: 1, duration: 1.1, ease: 'expo.out' });

  // Shop: cards spring up in sequence when the grid arrives, and again whenever a filter changes the set.
  popCards = (cards) => gsap.fromTo(cards, { y: 90, scale: 0.9, rotation: 1.5, opacity: 0 }, {
    y: 0, scale: 1, rotation: 0, opacity: 1, duration: 0.95, ease: 'back.out(1.6)', stagger: 0.085, overwrite: true,
    clearProps: 'transform,opacity'
  });
  gsap.set($$('.card', grid), { y: 90, scale: 0.9, opacity: 0 });
  ST.create({ trigger: grid, start: 'top 80%', once: true, onEnter: () => popCards($$('.card:not([hidden])', grid)) });

  const mm = gsap.matchMedia();

  // The walk: a slit in the paper opens into the full film.
  mm.add({ wide: '(min-width: 701px)', narrow: '(max-width: 700px)' }, (ctx) => {
    const wide = ctx.conditions.wide;
    const tl = gsap.timeline({
      scrollTrigger: { trigger: '.walk-stage', start: 'top top', end: '+=130%', scrub: 0.6, pin: true, anticipatePin: 1 }
    });
    tl.fromTo('.walk-film', { clipPath: wide ? 'inset(16% 38% 16% 38%)' : 'inset(22% 26% 22% 26%)' },
                            { clipPath: 'inset(0% 0% 0% 0%)', ease: 'power2.inOut', duration: 1 }, 0)
      .fromTo('.walk-film video', { scale: 1.2 }, { scale: 1, ease: 'power2.inOut', duration: 1 }, 0)
      .fromTo('.walk-title', { gap: wide ? '27vw' : '60vh' }, { gap: wide ? '64vw' : '96vh', ease: 'power2.in', duration: 0.8 }, 0)
      .to('.walk-title', { opacity: 0, duration: 0.25 }, 0.6)
      .from('.walk-quote', { opacity: 0, y: 24, duration: 0.3 }, 0.8);
  });

  // Campaign: the gilt footage blooms from monochrome into colour as it reaches the centre.
  gsap.fromTo('.camp--main', { '--mono': 1 }, {
    '--mono': 0, ease: 'none',
    scrollTrigger: { trigger: '.camp--main', start: 'top 85%', end: 'center 50%', scrub: true }
  });
  $$('[data-drift]').forEach((el) => {
    const d = +el.dataset.drift;
    gsap.fromTo(el, { yPercent: d }, { yPercent: -d, ease: 'none', scrollTrigger: { trigger: '.campaign', start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  // Closing shot: fade up from black, letterbox closes in, the seal signs the frame, the credits rise.
  const ending = $('[data-ending]');
  mm.add('(min-width: 861px) and (min-height: 680px)', () => {
    ending.classList.add('is-pinned');
    const tl = gsap.timeline({
      scrollTrigger: { trigger: ending, start: 'top top', end: '+=170%', scrub: 0.6, pin: true, anticipatePin: 1 }
    });
    tl.fromTo('.finale-fade', { opacity: 1 }, { opacity: 0, duration: 0.22, ease: 'none' }, 0)
      .fromTo('.finale-film video', { scale: 1.2 }, { scale: 1, duration: 0.7, ease: 'none' }, 0)
      .fromTo('.finale-bar--top', { yPercent: -100 }, { yPercent: 0, duration: 0.2, ease: 'power2.out' }, 0.14)
      .fromTo('.finale-bar--bottom', { yPercent: 100 }, { yPercent: 0, duration: 0.2, ease: 'power2.out' }, 0.14)
      .fromTo('.finale-bar p', { opacity: 0 }, { opacity: 1, duration: 0.1 }, 0.3)
      .fromTo('.finale-mark .seal', { scale: 1.9, rotate: -16, opacity: 0 }, { scale: 1, rotate: 0, opacity: 1, duration: 0.1, ease: 'back.out(2.4)' }, 0.42)
      .fromTo('.finale-mark-word', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.12 }, 0.47)
      .fromTo('.footer', { yPercent: 100 }, { yPercent: 0, duration: 0.33, ease: 'power2.out' }, 0.62)
      .to('.finale-bar--bottom', { opacity: 0, duration: 0.08 }, 0.62)
      .to('.finale-mark', { yPercent: -95, duration: 0.33, ease: 'power2.out' }, 0.62);
    return () => ending.classList.remove('is-pinned');
  });
  mm.add('(max-width: 860px), (max-height: 679px)', () => {
    gsap.fromTo('.finale-fade', { opacity: 1 }, { opacity: 0, ease: 'none', scrollTrigger: { trigger: '.finale', start: 'top 90%', end: 'top 20%', scrub: true } });
    gsap.from('.finale-mark .seal', { scale: 1.9, rotate: -16, opacity: 0, duration: 0.6, ease: 'back.out(2.4)', scrollTrigger: { trigger: '.finale', start: 'top 35%' } });
  });

  // Pins change the page height, so restored scroll positions land in the wrong scene.
  // Start every visit at the opening shot, or at the linked section once the pins are measured.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  function settle() {
    ST.refresh();
    const target = location.hash.length > 1 && document.querySelector(location.hash);
    const y = target ? target.getBoundingClientRect().top + scrollY - 40 : 0;
    if (X.lenis) X.lenis.scrollTo(y, { immediate: true, force: true }); else scrollTo(0, y);
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(settle); else settle();
})();

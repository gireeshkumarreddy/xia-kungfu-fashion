/* Shared chrome: navigation, smooth scroll, and the film manager that loads, plays and pauses every <video>. */
(function () {
  const root = document.documentElement;
  const mobile = matchMedia('(max-width: 700px)');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  root.classList.add('js');
  if (window.gsap && !reduce.matches) root.classList.add('motion');

  /* ---------- motion preference ---------- */
  let stored = null;
  try { stored = localStorage.getItem('xia-motion'); } catch (e) {}
  const state = { paused: stored ? stored === 'paused' : reduce.matches };
  const toggles = document.querySelectorAll('[data-motion-toggle]');
  function syncToggles() {
    toggles.forEach((b) => {
      b.setAttribute('aria-pressed', String(state.paused));
      b.textContent = state.paused ? 'Play motion' : 'Pause motion';
    });
    root.classList.toggle('films-paused', state.paused);
  }
  toggles.forEach((b) => b.addEventListener('click', () => {
    state.paused = !state.paused;
    try { localStorage.setItem('xia-motion', state.paused ? 'paused' : 'playing'); } catch (e) {}
    syncToggles();
    films.forEach((v) => (state.paused ? v.pause() : v._visible && wanted(v) && play(v)));
  }));
  syncToggles();

  /* ---------- films ---------- */
  const films = Array.from(document.querySelectorAll('video[data-src]'));

  function prime(v) {
    if (v._primed) return;
    v._primed = true;
    const small = mobile.matches;
    if (small && v.dataset.posterMobile) v.poster = v.dataset.posterMobile;
    v.preload = 'auto';
    v.src = (small && v.dataset.srcMobile) || v.dataset.src;
  }

  function wrapOf(v) { return v.closest('.film') || v.parentElement; }
  // Films marked data-manual (e.g. the craft panel) only play while they carry .is-active.
  function wanted(v) { return !v.hasAttribute('data-manual') || v.classList.contains('is-active'); }

  function play(v) {
    if (state.paused) return;
    prime(v);
    if (v.ended && !v.loop) v.currentTime = 0;
    const p = v.play();
    if (p && p.catch) {
      p.then(() => wrapOf(v).classList.remove('is-blocked'))
       .catch(() => { if (!v.paused) return; wrapOf(v).classList.add('is-blocked'); });
    }
  }

  films.forEach((v) => {
    v.muted = true;
    v.setAttribute('muted', '');
    v.setAttribute('playsinline', '');
    v.addEventListener('error', () => wrapOf(v).classList.add('is-failed'), true);
    v.addEventListener('playing', () => wrapOf(v).classList.add('is-playing'));
    const btn = wrapOf(v).querySelector('[data-film-play]');
    if (btn) btn.addEventListener('click', () => {
      state.paused = false; syncToggles();
      wrapOf(v).classList.remove('is-blocked');
      v._visible = true; play(v);
    });
    if (v.hasAttribute('data-eager')) prime(v);
  });

  if ('IntersectionObserver' in window) {
    const near = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { prime(e.target); near.unobserve(e.target); } });
    }, { rootMargin: '80% 0px' });
    const seen = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const v = e.target;
        v._visible = e.isIntersecting;
        if (e.isIntersecting && wanted(v)) play(v); else v.pause();
      });
    }, { threshold: 0.12 });
    films.forEach((v) => { near.observe(v); seen.observe(v); });
  } else {
    films.forEach((v) => { v._visible = true; if (wanted(v)) play(v); });
  }

  // Swap which manual film is active inside a group, e.g. when an accordion item opens.
  function activate(v) {
    v.parentElement.querySelectorAll('video[data-manual]').forEach((o) => {
      if (o === v) return;
      o.classList.remove('is-active');
      o.pause();
    });
    v.classList.add('is-active');
    if (v._visible !== false) play(v);
  }

  /* ---------- nav ---------- */
  const nav = document.querySelector('[data-nav]');
  const menuBtn = document.querySelector('[data-menu-btn]');
  const menu = document.getElementById('menu');
  function setMenu(open) {
    if (!menu) return;
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.textContent = open ? 'Close' : 'Menu';
    menu.hidden = !open;
    root.classList.toggle('menu-open', open);
  }
  if (menuBtn) menuBtn.addEventListener('click', () => setMenu(menu.hidden));
  if (menu) menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu && !menu.hidden) { setMenu(false); menuBtn.focus(); } });

  let lastY = 0;
  function onScroll(y) {
    if (!nav) return;
    nav.classList.toggle('is-scrolled', y > 40);
    nav.classList.toggle('is-tucked', y > lastY && y > 400 && !root.classList.contains('menu-open'));
    lastY = y;
  }

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (window.Lenis && !reduce.matches) {
    lenis = new window.Lenis({ duration: 1.15, smoothWheel: true });
    lenis.on('scroll', (e) => onScroll(e.scroll));
    if (window.gsap && window.ScrollTrigger) {
      lenis.on('scroll', window.ScrollTrigger.update);
      window.gsap.ticker.add((t) => lenis.raf(t * 1000));
      window.gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  } else {
    addEventListener('scroll', () => onScroll(scrollY), { passive: true });
  }

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    if (a.hasAttribute('data-placeholder') || a.getAttribute('href').length < 2) { e.preventDefault(); return; }
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { offset: -40 }); else target.scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth' });
    history.replaceState(null, '', a.getAttribute('href'));
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });

  window.XIA = Object.assign(window.XIA || {}, { motion: state, mobile, reduce, lenis, playFilm: play, primeFilm: prime, activateFilm: activate });
})();

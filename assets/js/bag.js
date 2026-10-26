/* Bag: kept in this browser only. There is no checkout or payment behind it. */
(function () {
  const KEY = 'xia-bag';
  const { find, price, imgSm } = window.XIA;

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; }
  }
  function save(items) {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) { /* storage blocked: bag lasts for this page view */ }
  }

  let items = load().filter((i) => find(i.id));
  const drawer = document.querySelector('[data-bag]');
  const list = drawer && drawer.querySelector('[data-bag-list]');
  const total = drawer && drawer.querySelector('[data-bag-total]');
  let lastFocus = null;

  function count() { return items.reduce((n, i) => n + i.qty, 0); }

  function render() {
    document.querySelectorAll('[data-bag-count]').forEach((el) => { el.textContent = count(); });
    if (!list) return;
    if (!items.length) {
      list.innerHTML = '<li class="bag-empty"><p>Your bag is empty.</p><a href="index.html#shop" data-bag-close>Browse the collection</a></li>';
    } else {
      list.innerHTML = items.map((i, n) => {
        const p = find(i.id);
        return '<li class="bag-item">' +
          '<img src="' + imgSm(p) + '" alt="" width="80" height="120">' +
          '<div><p class="bag-name">' + p.name + '</p><p class="bag-meta">Size ' + i.size + ' / ' + p.colour + '</p>' +
          '<div class="bag-qty"><button type="button" data-qty="-1" data-i="' + n + '" aria-label="Remove one ' + p.name + '">−</button>' +
          '<span aria-live="polite">' + i.qty + '</span>' +
          '<button type="button" data-qty="1" data-i="' + n + '" aria-label="Add one more ' + p.name + '">+</button></div></div>' +
          '<p class="bag-price">' + price(p.price * i.qty) + '</p></li>';
      }).join('');
    }
    total.textContent = price(items.reduce((s, i) => s + find(i.id).price * i.qty, 0));
  }

  function open() {
    if (!drawer) return;
    lastFocus = document.activeElement;
    drawer.hidden = false;
    requestAnimationFrame(() => drawer.classList.add('is-open'));
    document.documentElement.classList.add('bag-open');
    if (window.XIA.lenis) window.XIA.lenis.stop();
    drawer.querySelector('[data-bag-close]').focus();
  }
  function close() {
    if (!drawer || drawer.hidden) return;
    drawer.classList.remove('is-open');
    document.documentElement.classList.remove('bag-open');
    if (window.XIA.lenis) window.XIA.lenis.start();
    setTimeout(() => { drawer.hidden = true; }, 450);
    if (lastFocus) lastFocus.focus();
  }

  function add(id, size) {
    const hit = items.find((i) => i.id === id && i.size === size);
    if (hit) hit.qty += 1; else items.push({ id, size, qty: 1 });
    save(items); render(); open();
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-bag-open]')) { e.preventDefault(); open(); }
    else if (e.target.closest('[data-bag-close]')) { close(); }
    const q = e.target.closest('[data-qty]');
    if (q) {
      const i = items[+q.dataset.i];
      i.qty += +q.dataset.qty;
      if (i.qty < 1) items.splice(+q.dataset.i, 1);
      save(items); render();
    }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  render();
  window.XIA.bag = { add, open, close };
})();

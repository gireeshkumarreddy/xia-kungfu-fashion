/* Product cards, shared by the shop grid and "Complete the look". */
(function () {
  const X = window.XIA;
  const { sizes, price, img, srcset, url } = X;
  const SIZES = '(max-width: 700px) 50vw, (max-width: 1100px) 33vw, 25vw';

  function html(p) {
    return '<li class="card" data-collection="' + p.collection + '">' +
      '<div class="card-top">' +
        '<a class="card-media" href="' + url(p) + '" tabindex="-1" aria-hidden="true">' +
          '<img src="' + img(p) + '" srcset="' + srcset(p) + '" sizes="' + SIZES + '" alt="" width="900" height="1350" loading="lazy">' +
          '<img class="card-alt" src="' + img(p, 1) + '" srcset="' + srcset(p, 1) + '" sizes="' + SIZES + '" alt="" width="900" height="1350" loading="lazy">' +
        '</a>' +
        '<div class="card-sizes" role="group" aria-label="Quick add ' + p.name + '"><span>Quick add</span>' +
          sizes.map((s) => '<button type="button" data-add="' + p.id + '" data-size="' + s + '" aria-label="Add ' + p.name + ', size ' + s + ', to bag">' + s + '</button>').join('') +
        '</div>' +
      '</div>' +
      '<div class="card-info">' +
        '<h3><a href="' + url(p) + '">' + p.name + '</a><span class="card-han" lang="zh-Hant">' + p.han + '</span></h3>' +
        '<p class="card-price">' + price(p.price) + '</p>' +
        '<p class="card-meta">' + p.category + ', ' + p.colour.toLowerCase() + '</p>' +
        '<button type="button" class="card-add" aria-expanded="false">Quick add</button>' +
      '</div>' +
    '</li>';
  }

  function mount(list, items) {
    list.innerHTML = items.map(html).join('');
    list.addEventListener('click', (e) => {
      const add = e.target.closest('[data-add]');
      if (add) { X.bag.add(add.dataset.add, add.dataset.size); return; }
      const toggle = e.target.closest('.card-add');
      if (toggle) {
        const open = toggle.closest('.card').classList.toggle('show-sizes');
        toggle.setAttribute('aria-expanded', String(open));
      }
    });
  }

  X.cards = { mount };
})();

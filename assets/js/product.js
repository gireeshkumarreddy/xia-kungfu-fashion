/* Product page: renders one piece from the catalogue. Runs before site.js. */
(function () {
  const X = window.XIA;
  const { products, collections, details, sizes, price, find, img } = X;
  const main = document.querySelector('[data-pdp]');
  const p = find(new URLSearchParams(location.search).get('id'));

  if (!p) {
    main.innerHTML = '<div class="pdp-missing"><h1>We couldn’t find that piece.</h1>' +
      '<p>The link may be out of date. Every piece in the collection is on the shop page.</p><p style="margin-top:24px"><a class="link-arrow" href="index.html#shop">Go to the shop</a></p></div>';
    document.querySelector('[data-related]').remove();
    return;
  }

  const c = collections[p.collection];
  const d = p.detail && details[p.detail];
  document.title = p.name + ' | XIA 俠';

  main.innerHTML =
    '<div class="pdp">' +
      '<div class="pdp-gallery">' +
        '<figure><img src="' + img(p) + '" alt="' + p.alt + '" width="900" height="1350"></figure>' +
        '<figure><img src="' + img(p, 1) + '" alt="' + p.name + ', second view" width="900" height="1350" loading="lazy"></figure>' +
      '</div>' +
      '<div class="pdp-info">' +
        '<nav class="crumbs" aria-label="Breadcrumb"><a href="index.html#shop">Shop</a><span aria-hidden="true">/</span>' +
          '<a href="index.html?c=' + c.id + '#shop"><span lang="zh-Hant">' + c.han + '</span> ' + c.name + '</a></nav>' +
        '<p class="pdp-han" lang="zh-Hant">' + p.han + '</p>' +
        '<h1 class="pdp-name">' + p.name + '</h1>' +
        '<p class="pdp-price">' + price(p.price) + '</p>' +
        '<p class="pdp-colour">Colour: ' + p.colour + '</p>' +
        '<form data-add-form novalidate>' +
          '<fieldset class="pdp-sizes"><legend>Size</legend><div>' +
            sizes.map((s) => '<label><input type="radio" name="size" value="' + s + '"><span>' + s + '</span></label>').join('') +
          '</div></fieldset>' +
          '<button class="btn btn--block" type="submit">Add to bag</button>' +
          '<p class="pdp-error" role="alert" data-error></p>' +
        '</form>' +
        '<p class="pdp-desc">' + p.description + '</p>' +
        '<div class="pdp-more">' +
          '<details><summary>Fabric and care</summary><p>' + p.fabric + '</p></details>' +
          '<details><summary>Fit</summary><p>' + p.fit + '</p></details>' +
          (d ? '<details><summary>The detail: ' + d.name.toLowerCase() + '</summary><p><span lang="zh-Hant">' + d.han + '</span> (' + d.gloss + '). ' + d.text + '</p></details>' : '') +
        '</div>' +
        '<p class="pdp-note">Checkout isn’t connected on this concept site. You can build a bag, but no order or payment can be placed.</p>' +
      '</div>' +
    '</div>';

  const form = main.querySelector('[data-add-form]');
  const error = main.querySelector('[data-error]');
  form.addEventListener('change', () => { error.textContent = ''; });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const size = form.querySelector('input[name="size"]:checked');
    if (!size) { error.textContent = 'Choose a size first.'; form.querySelector('input').focus(); return; }
    X.bag.add(p.id, size.value);
  });

  // Complete the look: the rest of this collection, then a piece in a contrasting colour.
  const related = products.filter((o) => o.collection === p.collection && o.id !== p.id)
    .concat(products.filter((o) => o.collection !== p.collection))
    .slice(0, 4);
  X.cards.mount(document.querySelector('[data-related-grid]'), related);
})();

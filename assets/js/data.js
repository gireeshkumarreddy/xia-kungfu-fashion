/* Catalogue. Names, prices and copy are placeholders for the concept build.
   Product photography is from Unsplash (free under the Unsplash License); see CREDITS.md. */
(function () {
  const collections = {
    shadow:   { id: 'shadow',   han: '影', name: 'Shadow',   gloss: 'yǐng, shadow',    blurb: 'Black and ink navy, cut wide and quiet.' },
    cinnabar: { id: 'cinnabar', han: '朱', name: 'Cinnabar', gloss: 'zhū, vermilion', blurb: 'The red of seal paste and temple doors: brocade, silk and wide sleeves.' },
    qing:     { id: 'qing',     han: '青', name: 'Qing',     gloss: 'qīng, the colour between blue and green', blurb: 'Jade satin, cobalt and indigo stripe.' }
  };

  const details = {
    collar: { han: '立領', gloss: 'lìlǐng', name: 'Standing collar',
              text: 'The collar stands straight up and closes at the throat, as on traditional Chinese dress. It’s backed with canvas so it holds its shape.' },
    thread: { han: '金線', gloss: 'jīnxiàn', name: 'Gold thread',
              text: 'Metallic thread is worked through the cloth in dense patterns. It adds weight, so the piece hangs straight and doesn’t crease.' },
    sheer:  { han: '紗', gloss: 'shā', name: 'Sheer layers',
              text: 'Chiffon sits over a solid lining. Standing still it reads as one colour; moving, the layers separate and trail behind you.' },
    stance: { han: '馬步', gloss: 'mǎbù', name: 'Horse stance',
              text: 'Cut with a deep gusset and a wide leg, so you can sink into a low horse stance without the seams pulling.' }
  };

  const products = [
    {
      id: 'cinnabar-qipao', name: 'Cinnabar brocade qipao', han: '朱錦旗袍', collection: 'cinnabar', category: 'Dresses',
      price: 149, colour: 'Cinnabar and gold', detail: 'thread',
      images: ['p-cinnabar-qipao', 'p-cinnabar-qipao-detail'],
      alt: 'A model in a red and gold brocade qipao holds a folding fan in front of red curtains',
      description: 'A long qipao in red brocade woven with gold flowers, with a standing collar, short sleeves and side slits that let you walk at full stride.',
      fabric: 'Polyester-viscose brocade with a metallic weft. Dry clean.',
      fit: 'Close through the body, slits to the knee. Model wears size S.'
    },
    {
      id: 'persimmon-robe', name: 'Persimmon ruqun set', han: '柿紅襦裙', collection: 'cinnabar', category: 'Sets',
      price: 129, colour: 'Persimmon red and ivory', detail: 'sheer',
      images: ['p-persimmon-robe', 'p-persimmon-robe-alt'],
      alt: 'A model in a red wrap jacket and ivory skirt reads a book, with flowers pinned in her hair',
      description: 'A cropped red wrap jacket over a high-waisted ivory skirt, after the ruqun of Tang and Song dynasty dress. The skirt is layered chiffon, so it swings when you turn.',
      fabric: 'Jacket: satin. Skirt: chiffon over a cotton lining. Cold hand wash.',
      fit: 'Jacket is relaxed. Skirt ties at the high waist.'
    },
    {
      id: 'sleeve-robe', name: 'Wide-sleeve red robe', han: '廣袖袍', collection: 'cinnabar', category: 'Outerwear',
      price: 139, colour: 'Deep red', detail: 'sheer',
      images: ['p-sleeve-robe', 'p-sleeve-robe-detail'],
      alt: 'A model in a floor-length red robe with very wide sleeves stands with her arms open on a stone terrace',
      description: 'A floor-length robe with sleeves cut far wider than the arm, worn over a matching underdress. Raise your arms and the sleeves fall like banners.',
      fabric: 'Chiffon outer, crepe lining. 100% polyester. Cold hand wash.',
      fit: 'Relaxed. Sash adjusts at the waist. Model wears size S.'
    },
    {
      id: 'jade-cape', name: 'Jade satin cape gown', han: '翠緞斗篷裙', collection: 'qing', category: 'Dresses',
      price: 179, colour: 'Jade and jet black', detail: 'thread',
      images: ['p-jade-cape', 'p-jade-cape-detail'],
      alt: 'A model with sculpted waves in her hair wears a black sequinned gown with a jade satin cape',
      description: 'A black gown worked with jet sequins, with a jade satin cape fixed at one shoulder so it falls behind you in a single sweep.',
      fabric: 'Sequinned mesh bodice, duchess satin cape. Dry clean only.',
      fit: 'Fitted. The cape unclips at the shoulder.'
    },
    {
      id: 'stripe-qipao', name: 'Indigo pinstripe qipao', han: '靛紋旗袍', collection: 'qing', category: 'Dresses',
      price: 99, colour: 'Indigo', detail: 'collar',
      images: ['p-stripe-qipao', 'p-stripe-qipao-alt'],
      alt: 'A model in a sleeveless indigo pinstripe qipao holds a round silk fan',
      description: 'A sleeveless qipao in indigo pinstripe with a standing collar and a diagonal closure at the shoulder. Cut just below the knee for everyday wear.',
      fabric: 'Cotton-linen blend. Machine wash cold, line dry.',
      fit: 'Close through the waist. Model wears size XS.'
    },
    {
      id: 'cobalt-hood', name: 'Cobalt hood jacket', han: '鈷藍連帽衣', collection: 'qing', category: 'Outerwear',
      price: 119, colour: 'Cobalt and black', detail: null,
      images: ['p-cobalt-hood', 'p-cobalt-hood-alt'],
      alt: 'A model in sunglasses wears a black knit hood over a cobalt padded jacket',
      description: 'A cobalt puffer with a black knit hood and overlay. Light enough to train in, warm enough for the walk home.',
      fabric: 'Recycled nylon shell, synthetic fill, knit hood. Machine wash cold.',
      fit: 'Oversized. Size down for a closer fit.'
    },
    {
      id: 'shadow-overcoat', name: 'Shadow wrap coat', han: '影衣', collection: 'shadow', category: 'Outerwear',
      price: 159, colour: 'Ink navy', detail: null,
      images: ['p-shadow-overcoat', 'p-shadow-overcoat-alt'],
      alt: 'A model with a short bob wears an oversized ink-navy coat over a white T-shirt against a pale wall',
      description: 'A collarless, oversized coat in heavy navy wool that hangs straight from the shoulder. No buttons: wrap it or wear it open.',
      fabric: '80% wool, 20% polyamide. Dry clean.',
      fit: 'Oversized, hip length. Model wears size S.'
    },
    {
      id: 'stance-trouser', name: 'Horse stance trouser', han: '馬步褲', collection: 'shadow', category: 'Trousers',
      price: 89, colour: 'Black', detail: 'stance',
      images: ['p-stance-trouser', 'p-stance-trouser-detail'],
      alt: 'A model crouches low in wide black trousers and a fitted ivory top in a shaft of light',
      description: 'Wide-leg black trousers with a deep gusset, cut so you can sink into a low stance without the fabric pulling.',
      fabric: 'Heavy cotton twill. Machine wash cold, inside out.',
      fit: 'Wide leg, high rise, elastic back waist. Model wears size S.'
    }
  ];

  const sizes = ['XS', 'S', 'M', 'L', 'XL'];

  const price = (n) => '$' + n.toFixed(0);
  const find = (id) => products.find((p) => p.id === id);
  const img = (p, i) => 'assets/img/' + p.images[i || 0] + '.webp';
  const imgSm = (p, i) => 'assets/img/' + p.images[i || 0] + '-sm.webp';
  // srcset for grid-sized frames: the 600px file on desktop grids, the 900px file on dense screens.
  const srcset = (p, i) => imgSm(p, i) + ' 600w, ' + img(p, i) + ' 900w';
  const url = (p) => 'product.html?id=' + encodeURIComponent(p.id);

  window.XIA = { collections, details, products, sizes, price, find, img, imgSm, srcset, url };
})();

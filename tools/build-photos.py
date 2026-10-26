"""Crops the Unsplash photography into the site's product and editorial images.

Usage: python -I tools/build-photos.py [source-dir]
The source dir holds the downloads named as in PHOTOS below (default: _build/unsplash/full).
Every photo is free under the Unsplash License; see CREDITS.md for the source pages.
"""
import os
import sys
from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, '_build', 'unsplash', 'full')
OUT = os.path.join(ROOT, 'assets', 'img')

# name: [(output, (x0, y0, x1, y1) as fractions of the source, (out_w, out_h)), ...]
P = (900, 1350)      # product frames, 2:3
E = (800, 1000)      # editorial frames, 4:5
EDGE = (720, 960)    # campaign edge frames, 3:4
CROPS = {
    'cinnabar-qipao':      [('p-cinnabar-qipao', (0, 0, 1, 1), P), ('p-cinnabar-qipao-detail', (.2, .3, .8, .9), P)],
    'persimmon-robe':      [('p-persimmon-robe', (0, 0, 1, 1), P)],
    'persimmon-robe-alt':  [('p-persimmon-robe-alt', (0, 0, 1, 1), P)],
    'sleeve-robe':         [('p-sleeve-robe', (0, 0, 1, 1), P), ('p-sleeve-robe-detail', (.25, .12, .85, .72), P)],
    'jade-cape':           [('p-jade-cape', (.05, 0, .883, 1), P), ('p-jade-cape-detail', (.33, .34, .88, 1), P)],
    'stripe-qipao':        [('p-stripe-qipao', (0, 0, 1, 1), P)],
    'stripe-qipao-alt':    [('p-stripe-qipao-alt', (0, 0, 1, 1), P)],
    'cobalt-hood':         [('p-cobalt-hood', (0, 0, 1, 1), P)],
    'cobalt-hood-alt':     [('p-cobalt-hood-alt', (0, 0, 1, 1), P)],
    'shadow-overcoat':     [('p-shadow-overcoat', (.033, 0, .967, 1), P)],
    'shadow-overcoat-alt': [('p-shadow-overcoat-alt', (.033, 0, .967, 1), P)],
    'stance-trouser':      [('p-stance-trouser', (0, 0, 1, 1), P), ('p-stance-trouser-detail', (.3, .4, .9, 1), P)],
    'about-face':          [('about-face', (.15, .15, .85, .74), E)],
    'about-gaze':          [('about-gaze', (0, .12, 1, .99), E)],
    'about-city':          [('about-city', (0, 0, 1, .835), E)],
    'camp-lanterns':       [('camp-lanterns', (0, .05, 1, .94), EDGE)],
    'camp-dancer':         [('camp-dancer', (0, .1, 1, .933), E)],
    'camp-veil':           [('camp-veil', (0, .04, 1, .96), E)],
    'camp-pipa':           [('camp-pipa', (0, .08, 1, .913), E)],
    'camp-steps':          [('camp-steps', (0, .25, 1, 1), EDGE)],
    # White-backdrop studio frames: they multiply into the paper in the "Shop all pieces" scene.
    'claim-crouch':        [('claim-crouch', (.25, .15, 1, .95), (720, 768))],
    'claim-stand':         [('claim-stand', (.2, 0, .95, 1), (600, 1200))],
}


def crop(im, box, size):
    w, h = im.size
    x0, y0, x1, y1 = box
    region = im.crop((round(x0 * w), round(y0 * h), round(x1 * w), round(y1 * h)))
    return ImageOps.fit(region, size, Image.LANCZOS, centering=(0.5, 0.5))


def whiten(im):
    # Push the near-white studio backdrop to pure white so multiply blending hides it.
    g = ImageOps.grayscale(im)
    return g.point(lambda v: 255 if v > 232 else min(255, int(v * 255 / 232))).convert('RGB')


for name, outputs in CROPS.items():
    im = Image.open(os.path.join(SRC, name + '.jpg')).convert('RGB')
    for out, box, size in outputs:
        frame = crop(im, box, size)
        if name.startswith('claim-'):
            frame = whiten(frame)
        frame.save(os.path.join(OUT, out + '.webp'), 'WEBP', quality=80, method=6)
        if out.startswith('p-'):
            # Smaller size for cards, the carousel and the bag (picked through srcset).
            frame.resize((600, 900), Image.LANCZOS).save(os.path.join(OUT, out + '-sm.webp'), 'WEBP', quality=78, method=6)
        print(out)

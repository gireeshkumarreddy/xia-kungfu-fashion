"""Plays the launch film on the monitor in a still image; every pixel outside the screen stays as it is.

Usage: python -I tools/monitor-composite.py <image.png> <film.mp4> <out.mp4>

The screen's four corners come from the bezel-to-screen edge (fitted to sub-pixel lines),
the film is scaled to the screen's size first (clean downscale), then warped onto the exact
corners and laid in through an anti-aliased mask of the screen.
"""
import json
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw

image, film, out = sys.argv[1:4]
L = np.asarray(Image.open(image).convert('L')).astype(float)
H, W = L.shape


def crossing(profile, start, step):
    lo, hi = profile.min(), profile.max()
    mid = (lo + hi) / 2
    for i in range(1, len(profile)):
        if profile[i - 1] < mid <= profile[i]:
            return start + step * (i - 1 + (mid - profile[i - 1]) / (profile[i] - profile[i - 1]))
    return None


# Rough box of the screen: the light area between the first two runs of black bezel,
# down a column a quarter of the way in and across the row halfway between those runs.
def dark_runs(line, min_len=3):
    runs, start = [], None
    for i, v in enumerate(line):
        if v < 45 and start is None:
            start = i
        elif v >= 45 and start is not None:
            if i - start >= min_len:
                runs.append((start, i - 1))
            start = None
    return runs


col = dark_runs(L[:, W // 4])
y0, y1 = col[0][1] + 1, col[1][0] - 1
row = dark_runs(L[(y0 + y1) // 2, :], min_len=4)
x0, x1 = row[0][1] + 1, row[-1][0] - 1
print('screen box', x0, y0, x1, y1)
pad = 10
top = [(x, crossing(L[y0 - pad:y0 + pad, x], y0 - pad, 1)) for x in range(x0 + 60, x1 - 60, 6)]
bot = [(x, crossing(L[y1 - pad:y1 + pad, x][::-1], y1 + pad - 1, -1)) for x in range(x0 + 50, x1 - 50, 6)
       if not (W * .38 < x < W * .62)]          # skip where the silver stand sits under the bezel
left = [(crossing(L[y, x0 - pad:x0 + pad], x0 - pad, 1), y) for y in range(y0 + 40, y1 - 30, 6)]
right = [(crossing(L[y, x1 - pad:x1 + pad][::-1], x1 + pad - 1, -1), y) for y in range(y0 + 40, y1 - 30, 6)]
clean = lambda pts: [p for p in pts if None not in p]
T = np.polyfit(*zip(*[(p[0], p[1]) for p in clean(top)]), 1)        # y = a x + b
B = np.polyfit(*zip(*[(p[0], p[1]) for p in clean(bot)]), 1)
Lv = np.polyfit(*zip(*[(p[1], p[0]) for p in clean(left)]), 1)      # x = a y + b
Rv = np.polyfit(*zip(*[(p[1], p[0]) for p in clean(right)]), 1)


def meet(h, v):
    y = (h[0] * v[1] + h[1]) / (1 - h[0] * v[0])
    return (v[0] * y + v[1], y)


quad = {'tl': meet(T, Lv), 'tr': meet(T, Rv), 'bl': meet(B, Lv), 'br': meet(B, Rv)}
print('screen corners', {k: (round(x, 2), round(y, 2)) for k, (x, y) in quad.items()})

# Scale the film to the screen's size, placed on the screen's bounding rectangle.
rw = round(((quad['tr'][0] - quad['tl'][0]) + (quad['br'][0] - quad['bl'][0])) / 2 / 2) * 2
rh = round(((quad['bl'][1] - quad['tl'][1]) + (quad['br'][1] - quad['tr'][1])) / 2 / 2) * 2
rx = round((quad['tl'][0] + quad['bl'][0]) / 2)
ry = round((quad['tl'][1] + quad['tr'][1]) / 2)
rect = [(rx, ry), (rx + rw, ry), (rx, ry + rh), (rx + rw, ry + rh)]
dest = [quad['tl'], quad['tr'], quad['bl'], quad['br']]


def homography(src, dst):
    A = []
    for (x, y), (u, v) in zip(src, dst):
        A.append([x, y, 1, 0, 0, 0, -u * x, -u * y])
        A.append([0, 0, 0, x, y, 1, -v * x, -v * y])
    h = np.linalg.solve(np.array(A, float), np.array([c for p in dst for c in p], float))
    return np.append(h, 1).reshape(3, 3)


Hm = homography(rect, dest)


def apply(p):
    v = Hm @ np.array([p[0], p[1], 1.0])
    return v[0] / v[2], v[1] / v[2]


# The perspective filter moves whole-frame corners, so send the canvas corners where the homography puts them.
corners = [apply(p) for p in [(0, 0), (W, 0), (0, H), (W, H)]]
persp = ':'.join('x%d=%.4f:y%d=%.4f' % (i, c[0], i, c[1]) for i, c in enumerate(corners))

# Anti-aliased screen mask (8x supersampled polygon).
S = 8
m = Image.new('L', (W * S, H * S), 0)
ImageDraw.Draw(m).polygon([(x * S, y * S) for x, y in [quad['tl'], quad['tr'], quad['br'], quad['bl']]], fill=255)
mask_path = out.rsplit('.', 1)[0] + '-mask.png'
m.resize((W, H), Image.LANCZOS).save(mask_path)

fc = (
    '[1:v]fps=30,scale=%d:%d:flags=lanczos,format=yuv444p,pad=%d:%d:%d:%d:black,'
    'perspective=%s:sense=destination:interpolation=cubic,format=rgba[film];'
    '[2:v]format=gray[mask];[film][mask]alphamerge[screen];'
    '[0:v]format=rgba[bg];[bg][screen]overlay=0:0:shortest=1,format=yuv420p[v]'
) % (rw, rh, W, H, rx, ry, persp)
subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y',
                '-loop', '1', '-framerate', '30', '-i', image,
                '-i', film,
                '-loop', '1', '-framerate', '30', '-i', mask_path,
                '-filter_complex', fc, '-map', '[v]', '-map', '1:a?',
                '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-profile:v', 'high',
                '-c:a', 'copy', '-shortest', '-movflags', '+faststart', out], check=True)
json.dump({'quad': quad, 'rect': rect}, open(out.rsplit('.', 1)[0] + '-screen.json', 'w'))
print('wrote', out)

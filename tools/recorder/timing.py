"""Prints marker times and capture smoothness per scene for the last recording."""
import json, os, sys
import numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
d = json.load(open(os.path.join(ROOT, '_build', 'capture', 'frames.json')))
K = d['K']; ft = np.array([f['t'] for f in d['frames']])
ms = sorted(d['markers'], key=lambda m: m['t'])
t0 = next(m['t'] for m in ms if m['name'] == 'start')
for i, m in enumerate(ms):
    a = m['t']; b = ms[i + 1]['t'] if i + 1 < len(ms) else ft[-1]
    sel = (ft >= a) & (ft < b)
    fps = sel.sum() / max(b - a, 1e-6) * K
    print('%-12s %6.2fs  final-fps %5.1f' % (m['name'], (a - t0) / K, fps))

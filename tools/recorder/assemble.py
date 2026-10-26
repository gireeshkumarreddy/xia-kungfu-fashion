"""Builds the launch film from the slow-motion capture written by record.mjs.

1. Speeds the frames back up by K and resamples them to a steady 30 fps.
2. Writes an original score timed to the recording's markers: a drone and wind bed,
   guzheng-like plucks (Karplus-Strong) in A minor pentatonic, taiko hits on scene changes,
   woodblock taps on clicks, and a gong when the seal stamps the dragon frame.
3. Muxes both into showcase/xia-launch.mp4 (and a silent copy for re-scoring).

Usage: python -I tools/recorder/assemble.py
"""
import json
import os
import subprocess
import wave

import numpy as np
from scipy import signal

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CAP = os.path.join(ROOT, '_build', 'capture')
OUT = os.path.join(ROOT, 'showcase')
os.makedirs(OUT, exist_ok=True)
FPS = 30
SR = 48000

data = json.load(open(os.path.join(CAP, 'frames.json')))
K = data['K']
marks = {}
for m in data['markers']:
    marks.setdefault(m['name'], []).append(m['t'])
t_start, t_end = marks['start'][0], marks['end'][0]
final = lambda t: (t - t_start) / K
DUR = final(t_end)
cue = {name: [final(t) for t in ts] for name, ts in marks.items()}
print('duration %.2fs' % DUR, {k: [round(x, 2) for x in v] for k, v in cue.items()})

# ---------------------------------------------------------------- video
frames = sorted((f for f in data['frames'] if t_start - 0.05 <= f['t'] <= t_end), key=lambda f: f['t'])

# Where the browser stalled (mostly page navigations), dissolve between the frames either side
# instead of freezing and jumping.
from PIL import Image
BLEND = os.path.join(CAP, 'blend')
os.makedirs(BLEND, exist_ok=True)
smooth = []
for i, f in enumerate(frames):
    smooth.append(f)
    if i + 1 == len(frames):
        break
    nxt = frames[i + 1]
    gap = (nxt['t'] - f['t']) / K
    if gap > 0.12:
        a_im = Image.open(os.path.join(CAP, f['file'])).convert('RGB')
        b_im = Image.open(os.path.join(CAP, nxt['file'])).convert('RGB')
        steps = int(gap * FPS)
        for s_ in range(1, steps):
            name = 'blend/%s_%02d.jpg' % (f['file'][:-4], s_)
            Image.blend(a_im, b_im, s_ / steps).save(os.path.join(CAP, name), quality=92)
            smooth.append({'file': name, 't': f['t'] + (nxt['t'] - f['t']) * s_ / steps})
print('dissolves added for %d stalls' % sum(1 for x in smooth if x['file'].startswith('blend/') and x['file'].endswith('_01.jpg')))
frames = smooth
lines = []
for i, f in enumerate(frames):
    nxt = frames[i + 1]['t'] if i + 1 < len(frames) else t_end
    lines.append("file '%s'\nduration %.6f\n" % (f['file'], max(nxt - f['t'], 0.001) / K))
lines.append("file '%s'\n" % frames[-1]['file'])
with open(os.path.join(CAP, 'list.txt'), 'w') as fh:
    fh.writelines(lines)
gaps = np.diff([f['t'] for f in frames]) / K
print('frames %d, mean final fps %.1f, longest gap %.3fs' % (len(frames), 1 / gaps.mean(), gaps.max()))

silent = os.path.join(OUT, 'xia-launch-no-music.mp4')
vf = 'fps=%d,scale=1920:1080:flags=lanczos,format=yuv420p,fade=t=in:st=0:d=0.6,fade=t=out:st=%.2f:d=1.2' % (FPS, DUR - 1.2)
subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', os.path.join(CAP, 'list.txt'),
                '-vf', vf, '-t', '%.3f' % DUR, '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-profile:v', 'high',
                '-movflags', '+faststart', silent], check=True)

# ---------------------------------------------------------------- score
rng = np.random.default_rng(26)
n = int(DUR * SR) + SR
L = np.zeros(n)
R = np.zeros(n)
t = np.arange(n) / SR


def place(buf_l, buf_r, sig, at, pan=0.0, gain=1.0):
    i = int(at * SR)
    if i >= n:
        return
    sig = sig[: n - i] * gain
    buf_l[i:i + len(sig)] += sig * np.sqrt(0.5 * (1 - pan))
    buf_r[i:i + len(sig)] += sig * np.sqrt(0.5 * (1 + pan))


def env_points(points):
    """Piecewise-linear envelope from (time, level) pairs."""
    xs, ys = zip(*points)
    return np.interp(t, xs, ys)


def c(name, i=0, default=None):
    v = cue.get(name)
    return v[i] if v and len(v) > i else default


walk, looks, shop, camp = c('walk'), c('collections'), c('shop'), c('campaign')
craft, claim, fin, seal = c('craft'), c('claim'), c('finale'), c('seal', 0, c('finale') + 4)

# Drone bed: A2 / E3 / A3, slightly detuned, with a soft saturation.
bed_env = env_points([(0, 0), (2.5, .5), (walk, .55), (walk + 2, .8), (looks, .45), (shop, .35), (camp, .55),
                      (claim, .6), (fin, .35), (fin + 2, .8), (seal, 1), (DUR - 1.2, .7), (DUR, 0)])
bed = sum(a * np.sin(2 * np.pi * f * t + p) for f, a, p in
          [(110, .5, 0), (110.4, .35, 1), (164.81, .3, 2), (220, .18, .5), (220.7, .12, 3), (329.6, .05, 1.2)])
bed = np.tanh(1.4 * bed) * bed_env * .22
L += bed
R += np.roll(bed, 240)

# Wind: band-passed noise breathing slowly, strongest in the walk and the finale.
b, a = signal.butter(2, [260 / (SR / 2), 1400 / (SR / 2)], btype='band')
wind = signal.lfilter(b, a, rng.standard_normal(n))
wind *= (0.6 + 0.4 * np.sin(2 * np.pi * 0.11 * t)) * env_points(
    [(0, 0), (1, .25), (walk, .3), (walk + 1.5, .9), (looks, .25), (fin, .4), (fin + 1.5, 1), (DUR, 0)])
wind = wind / np.abs(wind).max() * .09
L += wind
R += np.roll(wind, 900)

# Plucks: Karplus-Strong strings through a comb filter, with a sine body for the attack.
dry_l = np.zeros(n)
dry_r = np.zeros(n)
NOTE = {'A2': 110, 'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'G3': 196, 'A3': 220, 'C4': 261.63, 'D4': 293.66,
        'E4': 329.63, 'G4': 392, 'A4': 440, 'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'G5': 783.99, 'A5': 880}


def pluck(freq, dur=2.6, bright=0.55, decay=0.996):
    N = max(2, int(SR / freq - 0.5))
    x = np.zeros(int(dur * SR))
    burst = rng.uniform(-1, 1, N)
    burst = signal.lfilter([bright, 1 - bright], [1], burst)
    x[:N] = burst
    a = np.zeros(N + 2)
    a[0], a[N], a[N + 1] = 1, -0.5 * decay, -0.5 * decay
    y = signal.lfilter([1], a, x)
    body = np.sin(2 * np.pi * freq * np.arange(len(x)) / SR) * np.exp(-np.arange(len(x)) / (SR * .35)) * .25
    y = y + body
    y *= np.minimum(1, (len(y) - np.arange(len(y))) / (SR * .2))
    return y / (np.abs(y).max() + 1e-9)


BEAT = 60 / 76


def phrase(start, end, pool, every, gain, pan_spread=.5, rest=0.2):
    k = start
    while k < end:
        if rng.random() > rest:
            note = pool[rng.integers(len(pool))]
            place(dry_l, dry_r, pluck(NOTE[note]), k, pan=rng.uniform(-pan_spread, pan_spread), gain=gain)
        k += every * BEAT


phrase(1.0, walk - .5, ['A3', 'C4', 'D4', 'E4', 'G3'], 2, .32, rest=.15)
phrase(walk + 1.2, looks - .4, ['A3', 'E4', 'A4', 'D4'], 2.5, .28, rest=.3)
phrase(looks + .3, camp - .5, ['A4', 'C5', 'D5', 'E5', 'G4', 'G5'], 1, .26, rest=.2)
phrase(camp, claim - .3, ['E4', 'G4', 'A4', 'C5', 'D5'], 1, .25, rest=.25)
for i, note in enumerate(['A3', 'C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'E5']):   # the climb into the finale
    place(dry_l, dry_r, pluck(NOTE[note]), claim + .3 + i * BEAT / 2, pan=-.4 + i * .1, gain=.27)
for i, note in enumerate(['A2', 'E3', 'A3', 'C4', 'E4', 'A4']):               # closing cadence after the seal
    place(dry_l, dry_r, pluck(NOTE[note], dur=4.5, decay=.998), seal + .9 + i * .16, pan=-.5 + i * .2, gain=.3)


def taiko(gain=1.0, base=52):
    d = int(1.2 * SR)
    tt = np.arange(d) / SR
    f = base + 70 * np.exp(-tt / .04)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / .38)
    b2, a2 = signal.butter(2, 900 / (SR / 2))
    skin = signal.lfilter(b2, a2, rng.standard_normal(d)) * np.exp(-tt / .03) * .5
    return (tone + skin) * gain


def woodblock(gain=1.0):
    d = int(.18 * SR)
    tt = np.arange(d) / SR
    b2, a2 = signal.butter(2, [900 / (SR / 2), 2200 / (SR / 2)], btype='band')
    click = signal.lfilter(b2, a2, rng.standard_normal(d)) * np.exp(-tt / .025)
    tone = np.sin(2 * np.pi * 1180 * tt) * np.exp(-tt / .04)
    return (click * .6 + tone * .5) * gain


def gong(gain=1.0):
    d = int(6 * SR)
    tt = np.arange(d) / SR
    parts = [(1, 1), (1.47, .6), (2.09, .45), (2.56, .3), (3.14, .22), (4.2, .12)]
    g = sum(a * np.sin(2 * np.pi * 86 * r * tt * (1 + .002 * np.sin(2 * np.pi * 3 * tt))) * np.exp(-tt / (2.6 / r ** .5))
            for r, a in parts)
    return g * np.minimum(1, tt / .01) * gain


for name, g in [('start', .0), ('walk', .9), ('collections', .7), ('shop', .7), ('campaign', .8), ('craft', .6),
                ('finale', .8)]:
    for at in cue.get(name, []):
        place(dry_l, dry_r, taiko(g), at + (0.35 if name == 'start' else 0), gain=1)
place(dry_l, dry_r, taiko(.9), 0.35)
for name in ['look-next', 'quick-add', 'filter', 'pdp', 'craft', 'craft-next']:
    for at in cue.get(name, []):
        place(dry_l, dry_r, woodblock(.5), at + .1, pan=.2)
place(dry_l, dry_r, taiko(1.2, base=46), seal)
place(dry_l, dry_r, gong(.55), seal + .02)

# Space: a synthetic hall, decorrelated left and right.
ir_t = np.arange(int(2.8 * SR)) / SR
ir_l = rng.standard_normal(len(ir_t)) * np.exp(-ir_t / .55)
ir_r = rng.standard_normal(len(ir_t)) * np.exp(-ir_t / .55)
ir_l[:int(.012 * SR)] = 0
ir_r[:int(.017 * SR)] = 0
wet_l = signal.fftconvolve(dry_l, ir_l)[:n]
wet_r = signal.fftconvolve(dry_r, ir_r)[:n]
wet_l /= np.abs(wet_l).max() + 1e-9
wet_r /= np.abs(wet_r).max() + 1e-9
dry_peak = max(np.abs(dry_l).max(), np.abs(dry_r).max()) + 1e-9
L += dry_l / dry_peak * .55 + wet_l * .22
R += dry_r / dry_peak * .55 + wet_r * .22

master = np.stack([L, R], axis=1)[: int(DUR * SR)]
fade = np.ones(len(master))
fade[-int(1.4 * SR):] = np.linspace(1, 0, int(1.4 * SR))
fade[:int(.3 * SR)] = np.linspace(0, 1, int(.3 * SR))
master *= fade[:, None]
master = master / np.abs(master).max() * .89
wav = os.path.join(CAP, 'score.wav')
with wave.open(wav, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((master * 32767).astype('<i2').tobytes())

final_mp4 = os.path.join(OUT, 'xia-launch.mp4')
subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', silent, '-i', wav,
                '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
                '-shortest', '-movflags', '+faststart', final_mp4], check=True)
print('wrote', final_mp4, 'and', silent)

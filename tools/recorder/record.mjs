/* Records the XIA launch showcase: a scripted, full-screen 1920x1080 walk through the live site.
 *
 * Headless capture tops out around 12 fps at 1080p, so the page runs in slow motion (videos, GSAP,
 * CSS transitions, timers and smooth scroll all at 1/K speed) and tools/recorder/assemble.py
 * speeds the frames back up by K. Times in the timeline below are final-video seconds.
 *
 * Usage (site served on :8642):  node record.mjs
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const K = 6;
const BASE = 'http://localhost:8642/';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '../../_build/capture');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

// Injected into every page: the slow-motion clock and a visible cursor.
const INIT = `(() => {
  const K = ${K};
  const st = window.setTimeout;
  window.setTimeout = function (fn, ms, ...a) { return st.call(window, fn, (ms || 0) * K, ...a); };
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () { this.defaultPlaybackRate = 1 / K; this.playbackRate = 1 / K; return play.call(this); };
  let g;
  Object.defineProperty(window, 'gsap', { configurable: true, get() { return g; }, set(v) { g = v; try { v.globalTimeline.timeScale(1 / K); } catch (e) {} } });
  const fixLenis = () => {
    if (window.XIA && window.XIA.lenis) { if (!window.XIA.lenis.__slow) { window.XIA.lenis.options.duration *= K; window.XIA.lenis.__slow = true; } }
    else requestAnimationFrame(fixLenis);
  };
  requestAnimationFrame(fixLenis);

  addEventListener('DOMContentLoaded', () => {
    const css = document.createElement('style');
    css.textContent = \`
      #rc { position: fixed; left: 0; top: 0; width: 34px; height: 34px; margin: -17px 0 0 -17px; z-index: 2147483647;
            border: 1.5px solid #fff; border-radius: 50%; mix-blend-mode: difference; pointer-events: none; opacity: 0;
            transition: transform .45s cubic-bezier(.2,.7,.1,1), opacity .5s; }
      #rc::after { content: ''; position: absolute; left: 50%; top: 50%; width: 6px; height: 6px; margin: -3px; background: #fff; border-radius: 50%; }
      #rc.on { opacity: 1; } #rc.hover { transform: scale(1.75); } #rc.down { transform: scale(.7); } #rc.hover.down { transform: scale(1.35); }
      html { scrollbar-width: none; } ::-webkit-scrollbar { display: none; }\`;
    document.head.appendChild(css);
    const rc = document.createElement('div');
    rc.id = 'rc';
    document.body.appendChild(rc);
    addEventListener('mousemove', (e) => {
      rc.style.translate = e.clientX + 'px ' + e.clientY + 'px';
      rc.classList.add('on');
      rc.classList.toggle('hover', !!(e.target.closest && e.target.closest('a, button, label, .look, .card-top')));
    }, true);
    addEventListener('mousedown', () => rc.classList.add('down'), true);
    addEventListener('mouseup', () => rc.classList.remove('down'), true);
    window.__hideCursor = () => rc.classList.remove('on');
  });
})();`;

const browser = await chromium.launch({
  channel: 'chrome', headless: true,
  args: ['--autoplay-policy=no-user-gesture-required', '--hide-scrollbars', '--force-device-scale-factor=1', '--ignore-gpu-blocklist', '--enable-gpu-rasterization']
});
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await context.addInitScript({ content: INIT });
const page = await context.newPage();
const cdp = await context.newCDPSession(page);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const wait = (s) => sleep(s * K * 1000);
const markers = [];
const mark = (name) => { markers.push({ name, t: Date.now() / 1000 }); console.log('·', name); };

async function slowCss() {
  await cdp.send('Animation.enable');
  await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 / K });
}

/* ---------- warm the cache so no video buffers on camera ---------- */
await page.goto(BASE, { waitUntil: 'load' });
await sleep(2500);
await page.evaluate(async () => {
  const h = document.documentElement.scrollHeight;
  for (let y = 0; y < h; y += 700) {
    window.XIA.lenis.scrollTo(y, { immediate: true, force: true });
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await new Promise((r) => window.setTimeout(r, 60));
  }
});
await page.goto(BASE + 'product.html?id=sleeve-robe', { waitUntil: 'load' });
await sleep(1000);
await page.evaluate(() => localStorage.clear());
await page.goto('about:blank');
await page.setContent('<html style="background:#ebeae6;height:100%"></html>');

/* ---------- capture ---------- */
let n = 0, pending = 0;
const frames = [];
cdp.on('Page.screencastFrame', async (f) => {
  cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  const file = 'f' + String(++n).padStart(6, '0') + '.jpg';
  frames.push({ file, t: f.metadata.timestamp });
  // Non-blocking write: a slow disk must never delay the next frame's acknowledgement.
  pending++;
  fs.writeFile(path.join(OUT, file), Buffer.from(f.data, 'base64'), () => { pending--; });
});
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
await sleep(600);

/* ---------- helpers ---------- */
let mx = 1780, my = 1160;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
// Eased cursor move timed by the clock, so a move lasts exactly as long as the timeline says.
async function move(x, y, dur) {
  const x0 = mx, y0 = my, total = dur * K * 1000, t0 = Date.now();
  for (;;) {
    const p = Math.min(1, (Date.now() - t0) / total);
    const e = ease(p);
    mx = x0 + (x - x0) * e; my = y0 + (y - y0) * e;
    await page.mouse.move(mx, my);
    if (p >= 1) break;
    await sleep(25);
  }
}
async function rect(sel, nth = 0) {
  return page.evaluate(([s, i]) => {
    const el = document.querySelectorAll(s)[i];
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, top: r.top + scrollY, h: r.height };
  }, [sel, nth]);
}
async function moveTo(sel, dur, nth = 0, dx = 0, dy = 0) { const r = await rect(sel, nth); await move(r.x + dx, r.y + dy, dur); }
async function click() { await page.mouse.down(); await sleep(110 * K); await page.mouse.up(); }
async function scrollTo(y, dur) {
  await page.evaluate(([y, d]) => new Promise((res) => {
    window.XIA.lenis.scrollTo(y, { duration: d, force: true, easing: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2), onComplete: res });
  }), [y, dur * K]);
}
// Films: start one from its first frame, and hold until it has played to the end of its clip.
const played = [];
async function restart(sel) {
  await page.evaluate((s) => { const v = document.querySelector(s); v.currentTime = 0; v.play(); }, sel);
}
// Hold a film on its first frame (for a reveal), then let it run.
async function holdFirstFrame(sel) {
  await page.evaluate((s) => { const v = document.querySelector(s); v.pause(); v.currentTime = 0; }, sel);
}
async function resume(sel) {
  await page.evaluate((s) => { document.querySelector(s).play(); }, sel);
}
async function untilEnd(sel, upto) {
  const info = await page.evaluate((s) => ({ d: document.querySelector(s).duration, t: document.querySelector(s).currentTime }), sel);
  const end = upto || info.d;
  const startedAt = Date.now();
  let last = info.t, first = info.t, wrapped = false;
  for (;;) {
    const t = await page.evaluate((s) => document.querySelector(s).currentTime, sel);
    if (t < last - 1) { wrapped = true; break; }                 // a looping film just came round to its first frame
    if (t >= end - 0.03) break;
    if (Date.now() - startedAt > (end + 3) * K * 1000) { console.warn('timeout waiting for', sel, t); break; }
    last = t;
    await sleep(40);
  }
  played.push({ film: sel, from: +first.toFixed(2), to: wrapped ? +end.toFixed(2) : +last.toFixed(2), clip: +end.toFixed(2) });
  console.log('  played', sel, 'from', first.toFixed(2), 'to end of', end.toFixed(2) + 's');
}
// Click a link and follow it to the next page, then restore the slow clock and the cursor.
async function clickThrough() {
  await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), click()]);
  await slowCss();
  await page.mouse.move(mx, my);
}

/* ---------- the film ----------
   Every film on the site plays from its first frame to its last while it is fully on screen.
   The cursor works around them: interactions happen between films or while one is playing. */
mark('start');
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await slowCss();
// Hero: the kung fu film runs its full 10 seconds, from the ink gathering to the final stance.
await wait(2.8);
await moveTo('.nav-links a', 0.9); await wait(0.35);
await moveTo('.nav-links a', 0.5, 1); await wait(0.3);
await moveTo('.nav-links a', 0.5, 2); await wait(0.3);
await moveTo('.hero-han', 1.0); await wait(0.5);
await moveTo('.hero-cta', 1.0);
await untilEnd('.hero-film video');

mark('about');
const aboutTop = (await rect('.about')).top;
await Promise.all([scrollTo(aboutTop - 40, 1.5), move(1500, 640, 0.7)]); await wait(1.0);

// The walk: the slit opens on the film's first frame, then the whole clip plays in full frame.
mark('walk');
const walkTop = (await rect('.walk')).top;
await scrollTo(walkTop, 0.9);
await holdFirstFrame('.walk-film video');
await scrollTo(walkTop + 1080 * 1.3, 2.6);
await resume('.walk-film video');
await move(1200, 760, 1.2);
await untilEnd('.walk-film video');

mark('collections');
const looksTop = (await rect('.looks')).top;
await Promise.all([scrollTo(looksTop - 10, 1.3), move(1250, 860, 1.1)]);
await moveTo('[data-looks-next]', 0.5); await wait(0.15);
for (let i = 0; i < 3; i++) { mark('look-next'); await click(); await wait(0.85); }
await moveTo('.look.is-active', 0.5); await wait(0.45);

mark('shop');
const shopTop = (await rect('.shop')).top;
await Promise.all([scrollTo(shopTop - 30, 1.3), move(700, 700, 1.0)]); await wait(0.7);   // cards pop up
await moveTo('.card-top', 0.5, 0); await wait(0.55);
await moveTo('.card-top', 0.4, 1); await wait(0.45);
await moveTo('.card-top', 0.5, 3); await wait(0.4);
mark('quick-add');
await moveTo('[data-add="jade-cape"][data-size="M"]', 0.4); await click(); await wait(1.2);
await moveTo('.bag-close', 0.5); await click(); await wait(0.4);

// Campaign: the gilt film starts as it scrolls into view in monochrome, blooms into colour,
// and plays its whole clip (every head lifts to the camera).
mark('campaign');
const campTop = (await rect('.campaign')).top;
await Promise.all([scrollTo(campTop - 40, 2.2), move(1180, 760, 0.8)]);
await restart('.camp--main video');
await moveTo('.camp--side', 1.2); await wait(0.6);
await moveTo('.camp-stack .camp', 1.0, 0); await wait(0.6);
await moveTo('.camp-stack .camp', 0.8, 1); await wait(0.5);
await moveTo('.campaign-caption p', 1.2);
await untilEnd('.camp--main video', 10);

mark('filter');
await moveTo('.campaign-caption .link-arrow', 0.7); await wait(0.2); await click(); await wait(1.5);
await moveTo('.card:not([hidden]) .card-info h3 a', 0.55, 2); await wait(0.35);
mark('pdp');
await clickThrough(); await wait(0.7);
await moveTo('.pdp-sizes label', 0.6, 1); await click(); await wait(0.3);
await moveTo('.pdp-info .btn', 0.45); await click(); await wait(1.1);
await moveTo('.bag-close', 0.45); await click(); await wait(0.3);
await moveTo('.nav-links a', 0.7, 3); await wait(0.15);

// Craft: each close-up plays through before the next item opens.
mark('craft');
await clickThrough(); await wait(0.4);                      // let the page settle on the craft section
await restart('[data-detail-film="collar"]');
await moveTo('#craft-p1 p', 1.2); await wait(0.4);
await untilEnd('[data-detail-film="collar"]');
for (const [btn, film, panel] of [['#craft-b2', 'thread', '#craft-p2 p'], ['#craft-b3', 'sheer', '#craft-p3 p'], ['#craft-b4', 'stance', '#craft-p4 p']]) {
  await moveTo(btn, 0.55); mark('craft-next'); await click();
  await restart('[data-detail-film="' + film + '"]');
  await wait(0.5);
  await moveTo(panel, 1.0);
  await untilEnd('[data-detail-film="' + film + '"]');
}

mark('claim');
const claimTop = (await rect('.claim')).top;
await Promise.all([scrollTo(claimTop, 1.4), move(980, 560, 0.6)]);
await moveTo('.claim-title a', 0.5); await wait(0.45);

// Finale: fade up from black on the dragon's first frame, letterbox and seal, the whole clip, then the credits.
mark('finale');
const endTop = (await rect('[data-ending]')).top;
await page.evaluate(() => window.__hideCursor());
let sealAt = null;
const poll = (async () => {
  while (!sealAt) {
    const o = await page.evaluate(() => +getComputedStyle(document.querySelector('.finale-mark .seal')).opacity);
    if (o > 0.5) { sealAt = Date.now() / 1000; markers.push({ name: 'seal', t: sealAt }); }
    await sleep(80);
  }
})();
await scrollTo(endTop, 1.0);
await holdFirstFrame('.finale-film video');
await scrollTo(endTop + 1080 * 1.7 * 0.24, 1.3);              // fade up from black on the first frame
await resume('.finale-film video');
await scrollTo(endTop + 1080 * 1.7 * 0.56, 2.6);              // letterbox closes, the seal stamps, while the dragon moves
await untilEnd('.finale-film video');
mark('credits');
await scrollTo(endTop + 1080 * 1.7, 2.2);
await wait(1.8);
mark('end');
sealAt = sealAt || Date.now() / 1000;
await poll;

await cdp.send('Page.stopScreencast');
while (pending > 0) await sleep(100);
fs.writeFileSync(path.join(OUT, 'frames.json'), JSON.stringify({ K, frames, markers, played }, null, 0));
const span = frames.at(-1).t - frames[0].t;
console.log('frames', frames.length, 'real seconds', span.toFixed(1), 'capture fps', (frames.length / span).toFixed(1), 'final fps', ((frames.length / span) * K).toFixed(1));
await browser.close();

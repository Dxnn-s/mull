// App icon, adaptive icon, splash and favicon, all drawn from the same seal the
// app draws on screen. Reuses src/guilloche.ts so the mark can never drift.
//   node test/icons.mjs
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const assets = resolve(here, '../assets');

const src = readFileSync(resolve(here, '../src/guilloche.ts'), 'utf8');
const tmp = resolve(here, '_guilloche.tmp.mjs');
writeFileSync(
  tmp,
  src
    .replace(/export interface[\s\S]*?\n}\n/g, '')
    .replace(/: RosetteParams|: Seal|: string\[\]|: string|: number/g, '')
    .replace(/export function/g, 'function') + '\nexport { rosettePath, paramsForSeal };\n',
);
const { rosettePath } = await import(pathToFileURL(tmp).href);

const PAPER = '#f8f4e8';
const INK = '#1a1710';

/**
 * The mark: engraved annulus with a tick bezel, centred in a square.
 *
 * A bolder cut than the in-app seal. The 36-turn figure the app draws collapses
 * into a grey donut below about 120px, and an icon spends its life at 60. Ten
 * turns at a heavier stroke keeps distinct lobes and the star-shaped centre all
 * the way down. Same family, small-size variant, which is what a real mark does.
 */
function markSvg(size, { bg, stroke, bezel, inset = 0.13, strokeWidth }) {
  const c = size / 2;
  const outer = c * (1 - inset);
  const d = rosettePath(c, c, { rInner: outer * 0.34, rOuter: outer * 0.84, turns: 10, petals: 6.5, amplitude: 1.6, resolution: 200 });
  const ticks = Array.from({ length: 60 }, (_, i) => {
    const major = i % 5 === 0;
    const len = outer * (major ? 0.11 : 0.06);
    const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
    return `<line x1="${c + Math.cos(a) * (outer - len)}" y1="${c + Math.sin(a) * (outer - len)}" x2="${c + Math.cos(a) * outer}" y2="${c + Math.sin(a) * outer}" stroke="${bezel}" stroke-width="${size * (major ? 0.016 : 0.010)}"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${bg ? `<rect width="${size}" height="${size}" fill="${bg}"/>` : ''}
    <path d="${d}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth ?? size * 0.012}" stroke-linejoin="round"/>
    ${ticks}
  </svg>`;
}

const JOBS = [
  { file: 'icon.png', size: 1024, opts: { bg: PAPER, stroke: INK, bezel: INK } },
  // PWA + Add to Home Screen. Apple ignores the manifest icons and uses
  // apple-touch-icon, which must be opaque and square with no transparency.
  { file: '../public/apple-touch-icon.png', size: 180, opts: { bg: PAPER, stroke: INK, bezel: INK, strokeWidth: 2.2 } },
  { file: '../public/icon-192.png', size: 192, opts: { bg: PAPER, stroke: INK, bezel: INK, strokeWidth: 2.3 } },
  { file: '../public/icon-512.png', size: 512, opts: { bg: PAPER, stroke: INK, bezel: INK, strokeWidth: 6 } },
  // Maskable: Android crops to a circle, so the mark sits well inside the safe area.
  { file: '../public/icon-maskable-512.png', size: 512, opts: { bg: PAPER, stroke: INK, bezel: INK, inset: 0.24, strokeWidth: 6 } },
  { file: 'adaptive-icon.png', size: 1024, opts: { bg: PAPER, stroke: INK, bezel: INK, inset: 0.26 } },
  { file: 'splash-icon.png', size: 1024, opts: { bg: null, stroke: INK, bezel: INK, inset: 0.22 } },
  { file: 'favicon.png', size: 96, opts: { bg: PAPER, stroke: INK, bezel: INK, strokeWidth: 1.2 } },
];

const b = await chromium.launch();
for (const j of JOBS) {
  const p = await b.newPage({ viewport: { width: j.size, height: j.size }, deviceScaleFactor: 1 });
  await p.setContent(`<body style="margin:0;background:transparent">${markSvg(j.size, j.opts)}</body>`);
  await p.waitForTimeout(200);
  await p.screenshot({ path: resolve(assets, j.file), omitBackground: !j.opts.bg, clip: { x: 0, y: 0, width: j.size, height: j.size } });
  await p.close();
  console.log(`assets/${j.file} (${j.size}px)`);
}
await b.close();
unlinkSync(tmp);

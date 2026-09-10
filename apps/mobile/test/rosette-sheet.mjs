// Contact sheet of guilloché variants so the parameters can be chosen by eye.
//   node test/rosette-sheet.mjs   ->  screenshots/_rosette-sheet.png
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

// Load the real generator by stripping its TS types, so the sheet cannot drift
// from what the app draws.
const src = readFileSync(resolve(here, '../src/guilloche.ts'), 'utf8');
const js = src
  .replace(/export interface[\s\S]*?\n}\n/g, '')
  .replace(/: RosetteParams|: Seal|: string\[\]|: string|: number/g, '')
  .replace(/export function/g, 'function');
const tmp = resolve(here, '_guilloche.tmp.mjs');
writeFileSync(tmp, js + '\nexport { rosettePath, paramsForSeal };\n');
const { rosettePath } = await import(pathToFileURL(tmp).href);

const S = 260;
const CX = S / 2;
const RIN = S * 0.17;
const ROUT = S * 0.45;

const VARIANTS = [
  { name: 'turns 24 · petals 8.5 · amp 1.4', turns: 24, petals: 8.5, amplitude: 1.4 },
  { name: 'turns 30 · petals 8.5 · amp 1.8', turns: 30, petals: 8.5, amplitude: 1.8 },
  { name: 'turns 30 · petals 12.5 · amp 1.8', turns: 30, petals: 12.5, amplitude: 1.8 },
  { name: 'turns 30 · petals 16.5 · amp 1.8', turns: 30, petals: 16.5, amplitude: 1.8 },
  { name: 'turns 36 · petals 12.5 · amp 2.2', turns: 36, petals: 12.5, amplitude: 2.2 },
  { name: 'turns 36 · petals 20.5 · amp 2.2', turns: 36, petals: 20.5, amplitude: 2.2 },
  { name: 'turns 44 · petals 16.5 · amp 2.6', turns: 44, petals: 16.5, amplitude: 2.6 },
  { name: 'turns 20 · petals 5.5 · amp 1.2', turns: 20, petals: 5.5, amplitude: 1.2 },
  { name: 'turns 30 · petals 9 · amp 1.8 (integer)', turns: 30, petals: 9, amplitude: 1.8 },
  { name: 'turns 52 · petals 24.5 · amp 2.0', turns: 52, petals: 24.5, amplitude: 2.0 },
  { name: 'turns 30 · petals 8.5 · amp 3.2 (too much)', turns: 30, petals: 8.5, amplitude: 3.2 },
  { name: 'turns 30 · petals 8.5 · amp 0.8 (too little)', turns: 30, petals: 8.5, amplitude: 0.8 },
];

const cell = (v, stroke, width) => `
<figure>
  <svg width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
    <path d="${rosettePath(CX, CX, { rInner: RIN, rOuter: ROUT, ...v })}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round"/>
  </svg>
  <figcaption>${v.name}</figcaption>
</figure>`;

const html = `<!doctype html><meta charset="utf-8">
<style>
  body{margin:0;background:#f8f4e8;color:#1a1710;font-family:ui-monospace,Menlo,monospace;padding:36px}
  h1{font-family:Georgia,serif;font-weight:400;font-size:30px;margin:0 0 4px}
  p{color:rgba(26,23,16,.58);font-size:11px;letter-spacing:1.2px;text-transform:uppercase;margin:0 0 28px}
  .grid{display:grid;grid-template-columns:repeat(4,${S}px);gap:20px}
  figure{margin:0}
  figcaption{font-size:9.5px;letter-spacing:.6px;color:rgba(26,23,16,.5);margin-top:6px}
  section{margin-bottom:44px}
  .ink{background:#14120d}
  .ink figcaption{color:rgba(240,235,224,.5)}
</style>
<h1>Guilloché variants.</h1>
<p>one continuous path · ${S}px · paper</p>
<section><div class="grid">${VARIANTS.map((v) => cell(v, '#1a1710', 0.6)).join('')}</div></section>
<h1>Weight and ground.</h1>
<p>chosen figure at three stroke weights, then on ink</p>
<section><div class="grid">
  ${[0.4, 0.6, 0.9].map((w) => cell({ ...VARIANTS[4], name: `stroke ${w}` }, '#1a1710', w)).join('')}
  ${cell({ ...VARIANTS[4], name: 'accent' }, '#b45309', 0.6)}
</div></section>
<section class="ink" style="padding:20px"><div class="grid">
  ${[0.4, 0.6, 0.9].map((w) => cell({ ...VARIANTS[4], name: `ink · stroke ${w}` }, '#f0ebe0', w)).join('')}
  ${cell({ ...VARIANTS[4], name: 'ink · accent' }, '#dd9440', 0.6)}
</div></section>`;

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1220, height: 1400 }, deviceScaleFactor: 2 });
await p.setContent(html);
await p.waitForTimeout(600);
await p.screenshot({ path: resolve(here, '../screenshots/_rosette-sheet.png'), fullPage: true });
await b.close();
console.log('screenshots/_rosette-sheet.png');

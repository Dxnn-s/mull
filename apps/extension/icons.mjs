// Renders the Mull icon (an amber dot on slate) to PNG at the sizes Chrome wants.
// Uses Playwright's Chromium so there is no native image dependency.
//   node icons.mjs
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, 'icons');
mkdirSync(out, { recursive: true });

const svg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="28" fill="#0a0a0e"/>
  <circle cx="64" cy="64" r="34" fill="none" stroke="#f59e0b" stroke-opacity="0.35" stroke-width="6"/>
  <circle cx="64" cy="64" r="16" fill="#f59e0b"/>
</svg>`;

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const size of [16, 32, 48, 128]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg(size)}</body></html>`);
  await page.screenshot({ path: resolve(out, `icon-${size}.png`), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  console.log(`icons/icon-${size}.png`);
}
await browser.close();

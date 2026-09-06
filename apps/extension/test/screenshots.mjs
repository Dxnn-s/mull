// Visual pass for the extension: overlay explain + quiz states on the chatgpt fixture, popup, options.
//   node build.mjs --test  then  node test/screenshots.mjs
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { mkdirSync, mkdtempSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const EXT = resolve(here, '../dist-test');
const out = resolve(here, '../screenshots');
mkdirSync(out, { recursive: true });

const server = createServer(async (req, res) => {
  try {
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.end(await readFile(resolve(here, 'fixtures', (req.url ?? '/chatgpt.html').replace(/^\//, '') || 'chatgpt.html')));
  } catch {
    res.statusCode = 404;
    res.end('');
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const context = await chromium.launchPersistentContext(mkdtempSync(resolve(tmpdir(), 'mull-shot-')), {
  channel: 'chromium',
  headless: true,
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
  viewport: { width: 1180, height: 820 },
});
const sw = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
const id = new URL(sw.url()).host;

for (const [palette, theme] of [['amber', 'dark'], ['sage', 'dark'], ['amber', 'light']]) {
  await sw.evaluate(({ palette, theme }) => chrome.storage.local.set({ settings: { provider: 'mock', enabled: true, palette, theme, conceptMemoryDays: 0 }, stats: null }), { palette, theme });
  const page = await context.newPage();
  await page.goto(`${base}/chatgpt.html`);
  await page.waitForFunction(() => document.documentElement.dataset.mullReady === '1');
  await page.locator('#prompt-textarea').click();
  await page.keyboard.type('what is the chain rule');
  await page.keyboard.press('Enter');
  await page.locator('#mull-host').getByRole('button', { name: /read it/i }).waitFor();
  await page.screenshot({ path: resolve(out, `${palette}-${theme}-overlay-explain.png`) });
  await page.locator('#mull-host').getByRole('button', { name: /read it/i }).click();
  await page.locator('#mull-host').locator('form[data-form="quiz"]').waitFor();
  await page.screenshot({ path: resolve(out, `${palette}-${theme}-overlay-quiz.png`) });
  await page.close();

  const popup = await context.newPage();
  await popup.setViewportSize({ width: 320, height: 360 });
  await popup.goto(`chrome-extension://${id}/popup.html`);
  await popup.waitForTimeout(300);
  await popup.screenshot({ path: resolve(out, `${palette}-${theme}-popup.png`) });
  await popup.close();

  const options = await context.newPage();
  await options.goto(`chrome-extension://${id}/options.html`);
  await options.waitForTimeout(300);
  await options.screenshot({ path: resolve(out, `${palette}-${theme}-options.png`), fullPage: true });
  await options.close();
  console.log(`${palette}/${theme} done`);
}
await context.close();
server.close();

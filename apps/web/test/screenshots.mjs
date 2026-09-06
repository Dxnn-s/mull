// Visual pass: screenshots of every page in all four palette/theme combos, plus the gate card.
//   pnpm dev (in another shell)  then  node test/screenshots.mjs
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, '../screenshots');
mkdirSync(out, { recursive: true });
const base = process.env.MULL_BASE ?? 'http://127.0.0.1:3111';

const browser = await chromium.launch();
for (const palette of ['amber', 'sage']) {
  for (const theme of ['dark', 'light']) {
    const page = await browser.newPage({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 1 });
    await page.goto(base + '/');
    await page.evaluate(
      ({ palette, theme }) => {
        localStorage.clear();
        localStorage.setItem('mull.settings', JSON.stringify({ provider: 'mock', apiKey: '', palette, theme, conceptMemoryDays: 0 }));
      },
      { palette, theme },
    );
    for (const path of ['/', '/about', '/settings', '/stats']) {
      await page.goto(base + path);
      await page.waitForTimeout(600);
      await page.screenshot({ path: resolve(out, `${palette}-${theme}${path === '/' ? '-chat' : path.replace('/', '-')}.png`), fullPage: true });
    }
    // Gate card, explain state, then quiz state.
    await page.goto(base + '/');
    await page.getByLabel('Message').fill('what is the chain rule');
    await page.keyboard.press('Enter');
    await page.getByTestId('gate-explain').waitFor();
    await page.screenshot({ path: resolve(out, `${palette}-${theme}-gate-explain.png`), fullPage: true });
    await page.getByRole('button', { name: /read it/i }).click();
    await page.getByTestId('gate-quiz').waitFor();
    await page.screenshot({ path: resolve(out, `${palette}-${theme}-gate-quiz.png`), fullPage: true });
    await page.close();
    console.log(`${palette}/${theme} done`);
  }
}
await browser.close();

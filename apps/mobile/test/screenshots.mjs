// Screenshot the static web export at phone size so the app can be judged without a phone.
//   npx expo export --platform web --output-dir <dir>  then  node test/screenshots.mjs <dir>
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dist = resolve(process.argv[2] ?? resolve(here, '../dist-web'));
const out = resolve(here, '../screenshots');
mkdirSync(out, { recursive: true });

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ttf': 'font/ttf', '.json': 'application/json', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  let p = join(dist, decodeURIComponent((req.url ?? '/').split('?')[0]));
  try {
    if (statSync(p).isDirectory()) p = join(p, 'index.html');
  } catch {
    p = join(dist, 'index.html');
  }
  try {
    res.setHeader('content-type', types[extname(p)] ?? 'application/octet-stream');
    res.end(readFileSync(p));
  } catch {
    res.statusCode = 404;
    res.end('');
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch();
const seedSettings = (palette, theme) => ({
  provider: 'mock', apiKey: '', subjects: ['Calculus', 'Physics'], conceptMemoryDays: 2, palette, theme, questionsPerGate: 2,
  hardMode: { enabled: true, blockMinutes: 10, failsBeforeBlock: 2, schedule: { days: [1, 2, 3, 4], start: '19:00', end: '23:00' } },
});
for (const [palette, theme] of [['amber', 'dark'], ['sage', 'dark'], ['amber', 'light']]) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message.slice(0, 200)));
  await page.goto(base + '/');
  await page.evaluate(
    ({ settings }) => {
      localStorage.clear();
      localStorage.setItem('mull.settings', JSON.stringify(settings));
      localStorage.setItem('mull.session', JSON.stringify({ startedAt: Date.now() - 6 * 60_000, endsAt: Date.now() + 19 * 60_000, unlockUntil: null }));
      localStorage.setItem('mull.savedSeconds', '5040');
      localStorage.setItem('mull.blockedAppCount', '3');
      localStorage.setItem('mull.stats', JSON.stringify({ total: 12, gated: 9, passed: 7, failed: 2, skipped: 1, cancelled: 1, streak: 4, bestStreak: 6, recent: [], corrections: [] }));
    },
    { settings: seedSettings(palette, theme) },
  );
  for (const path of ['/', '/sessions', '/stats', '/you', '/subjects', '/blocked-apps', '/paywall']) {
    await page.goto(base + path);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: resolve(out, `${palette}-${theme}${path === '/' ? '-home' : path.replace('/', '-')}.png`) });
  }
  await page.goto(base + '/unlock');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: resolve(out, `${palette}-${theme}-unlock-explain.png`) });
  const quiz = page.getByRole('button', { name: /quiz me/i });
  if (await quiz.count()) {
    await quiz.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: resolve(out, `${palette}-${theme}-unlock-quiz.png`) });
  }
  await page.close();
  console.log(`${palette}/${theme} done`);
}
await browser.close();
server.close();

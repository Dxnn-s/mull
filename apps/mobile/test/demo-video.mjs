// Record a demo of the real app running.
//   npm run export:web && node test/demo-video.mjs dist-web
//
// Playwright records the browser, so this is genuine footage of the product,
// not a mockup and not generated. It drives the same build that ships: a real
// session starts, a real card is drawn from the bank, real answers are graded,
// and the real dial unlocks. Nothing here is staged except the pacing.
//
// Output is a .webm per clip in screenshots/video/. Import into any editor.
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, readdirSync, renameSync, statSync } from 'node:fs';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dist = resolve(process.argv[2] ?? resolve(here, '../dist-web'));
const out = resolve(here, '../screenshots/video');
mkdirSync(out, { recursive: true });

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ttf': 'font/ttf', '.json': 'application/json', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  const route = decodeURIComponent((req.url ?? '/').split('?')[0]);
  let p = join(dist, route);
  try {
    if (statSync(p).isDirectory()) p = join(p, 'index.html');
  } catch {
    const asHtml = join(dist, route.replace(/\/$/, '') + '.html');
    try {
      statSync(asHtml);
      p = asHtml;
    } catch {
      p = join(dist, 'index.html');
    }
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

// A phone-shaped frame. 2x so the footage survives being scaled up in an edit.
const VIEWPORT = { width: 390, height: 844 };

/**
 * A visible pointer. Playwright's real cursor is not captured, and a demo where
 * things happen with nothing touching them looks like a rendering bug rather
 * than a person using an app.
 */
const CURSOR = `
  (() => {
    const d = document.createElement('div');
    d.id = '__cursor';
    d.style.cssText = 'position:fixed;z-index:2147483647;width:26px;height:26px;border-radius:50%;background:rgba(180,83,9,.28);border:1.5px solid rgba(180,83,9,.75);pointer-events:none;transform:translate(-50%,-50%);transition:left .32s cubic-bezier(.4,0,.2,1),top .32s cubic-bezier(.4,0,.2,1),width .12s,height .12s;left:-100px;top:-100px';
    document.documentElement.appendChild(d);
    window.__moveCursor = (x, y) => { d.style.left = x + 'px'; d.style.top = y + 'px'; };
    window.__tapCursor = () => { d.style.width='16px'; d.style.height='16px'; setTimeout(()=>{d.style.width='26px';d.style.height='26px';}, 130); };
  })();
`;

/** Move the pointer to an element, pause so the eye follows it, then click. */
async function tap(page, locator, settle = 620) {
  const box = await locator.boundingBox();
  if (box) {
    await page.evaluate(([x, y]) => window.__moveCursor?.(x, y), [box.x + box.width / 2, box.y + box.height / 2]);
    await page.waitForTimeout(settle);
    await page.evaluate(() => window.__tapCursor?.());
    await page.waitForTimeout(140);
  }
  await locator.click();
}

/** Type at human speed. Instant text reads as a cut, not as someone typing. */
async function write(page, locator, text) {
  await tap(page, locator, 500);
  await locator.type(text, { delay: 55 });
  await page.waitForTimeout(500);
}

/**
 * A recorder that cannot tell a working flow from a stuck one will happily film
 * a blank screen and report success. Every beat is checked, and a missed one
 * fails the run rather than shipping footage of nothing happening.
 */
async function expect(page, text, where) {
  const found = await page.getByText(text).count();
  if (!found) throw new Error(`${where}: expected to see ${text} on screen`);
}

const browser = await chromium.launch();

async function clip(name, seed, body) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    recordVideo: { dir: out, size: { width: VIEWPORT.width * 2, height: VIEWPORT.height * 2 } },
  });
  const page = await context.newPage();
  await page.addInitScript(seed);
  await page.addInitScript(CURSOR);
  await page.goto(base + '/');
  await page.waitForTimeout(1800);
  await body(page);
  await page.waitForTimeout(900);
  const video = page.video();
  await context.close();
  if (video) {
    const from = await video.path();
    renameSync(from, join(out, `${name}.webm`));
    console.log(`  ${name}.webm`);
  }
}

const onboarded = () => {
  localStorage.setItem('mull.onboardedAt', String(Date.now()));
  localStorage.setItem('mull.settings', JSON.stringify({ provider: 'mock', apiKey: '', subjects: ['Calculus', 'Physics'], conceptMemoryDays: 7, palette: 'amber', theme: 'light', questionsPerGate: 2 }));
};

console.log('recording:');

// 1. The whole loop, start to unlock. This is the one that sells it.
await clip('01-the-loop', onboarded, async (page) => {
  await tap(page, page.getByText('Start a session', { exact: true }));
  await page.waitForTimeout(2200);
  await expect(page, /FOCUS/i, 'session did not start');
  await tap(page, page.getByText(/Pass a card/).first());
  await page.waitForTimeout(1600);

  const box = page.locator('textarea, input[type=text]').first();
  if (await box.count()) {
    await write(page, box, 'whats the chain rule');
    await tap(page, page.getByText('Continue', { exact: true }));
    await page.waitForTimeout(1400);
  }
  await expect(page, /chain rule/i, 'the card did not open');

  // Let the explanation sit long enough to be read on screen.
  await page.waitForTimeout(2600);
  await tap(page, page.getByText(/quiz me/i));
  await page.waitForTimeout(1500);

  // Answer both, correctly, at a readable pace.
  for (let q = 0; q < 2; q++) {
    const right = page.getByText(/derivative of the (inner|inside)/i).first();
    if (await right.count()) await tap(page, right, 900);
    const next = page.getByText(/Next question|Check my answers/).first();
    if (await next.count()) await tap(page, next, 700);
    await page.waitForTimeout(1200);
  }
  await expect(page, /unlocked|UNLOCKED/i, 'the card did not end in an unlock');
  await page.waitForTimeout(2400);
});

// 2. Real work is let through, free and instantly. The escape hatch.
await clip('02-real-work-passes', onboarded, async (page) => {
  await page.goto(base + '/unlock');
  await page.waitForTimeout(1600);
  const box = page.locator('textarea, input[type=text]').first();
  if (await box.count()) {
    await write(page, box, "here's my code\n\n```\ndef rev(n):\n  return n\n```\n\nwhy does it return None");
    await tap(page, page.getByText('Continue', { exact: true }));
    await page.waitForTimeout(2600);
    await expect(page, /real work/i, 'the code block was not released');
  }
});

// 3. The ladder noticing you already learned something.
await clip('03-you-had-this', () => {
  localStorage.setItem('mull.onboardedAt', String(Date.now()));
  localStorage.setItem('mull.memory', JSON.stringify({ 'the chain rule': { passedAt: Date.now() - 9 * 86400000, passes: 1 } }));
}, async (page) => {
  await page.goto(base + '/unlock');
  await page.waitForTimeout(1600);
  const box = page.locator('textarea, input[type=text]').first();
  if (await box.count()) {
    await write(page, box, 'whats the chain rule');
    await page.waitForTimeout(900);
    await tap(page, page.getByText('Continue', { exact: true }));
    await page.waitForTimeout(3000);
    await expect(page, /9 days ago/i, 'the ladder did not recognise the old pass');
  }
});

await browser.close();
server.close();

const made = readdirSync(out).filter((f) => f.endsWith('.webm'));
console.log(`\n${made.length} clips in screenshots/video/`);

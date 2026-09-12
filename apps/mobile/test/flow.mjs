// Walks the static web export the way a new user does, with no seeded state.
//   npx expo export --platform web --output-dir dist-web  then  node test/flow.mjs
//
// This exists because the first-run redirect shipped broken and nothing caught
// it: the screenshot pass seeds onboardedAt, so it never saw a real first run.
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dist = resolve(process.argv[2] ?? resolve(here, '../dist-web'));

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

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const fail = (m) => {
  throw new Error(m);
};

// A genuine first run: land on / with nothing stored and expect the tutorial.
let navigations = 0;
page.on('framenavigated', (f) => {
  if (f === page.mainFrame()) navigations += 1;
});
await page.goto(base + '/');
await page.waitForTimeout(2500);
if (!(await page.getByText('Think first.').count())) fail('first run did not reach the tutorial');
// Expo Router does a few navigations of its own settling in, so the count
// itself means nothing. A redirect that re-fires never settles, and that is
// what blanked the screen and remounted the tutorial on every pass, which is
// what made "Go on" look dead. So watch whether it stops.
const settled = navigations;
await page.waitForTimeout(3000);
if (navigations > settled) fail(`redirect loop: still navigating after it settled (${settled} -> ${navigations})`);
console.log(`step 1 ok, settled after ${settled} navigations`);

for (const [cta, expected] of [
  ['Go on', 'What a card is.'],
  ['Makes sense', 'Pick your subjects.'],
]) {
  await page.getByText(cta, { exact: true }).click();
  await page.waitForTimeout(700);
  if (!(await page.getByText(expected).count())) fail(`"${cta}" did not advance to ${expected}`);
  console.log(`${cta} -> ${expected}`);
}

// A new install arrives with Calculus already picked, so nobody gets stuck
// here. Clear it and the step has to refuse to advance, then allow it again.
await page.getByText('Calculus', { exact: true }).click();
await page.waitForTimeout(400);
if (!(await page.getByText('Pick at least one').count())) fail('step three would advance with no subject picked');
await page.getByText('Physics', { exact: true }).click();
await page.waitForTimeout(400);
await page.getByText('Next', { exact: true }).click();
await page.waitForTimeout(700);
if (!(await page.getByText('Set the block.').count())) fail('picking a subject did not unlock step four');
console.log('subject gate ok');

await page.getByText('Start', { exact: true }).click();
await page.waitForTimeout(1500);
if (await page.getByText('Think first.').count()) fail('finishing the tutorial bounced back to it');
if (!(await page.getByText('SHIELDED TODAY').count())) fail('finishing the tutorial did not land on Today');
console.log('finish -> Today ok');

// And it must not come back on the next cold start.
await page.goto(base + '/');
await page.waitForTimeout(2000);
if (await page.getByText('Think first.').count()) fail('tutorial showed again after it was finished');
console.log('does not repeat ok');

await browser.close();
server.close();
console.log('flow ok');

import { test as base, chromium, expect, type BrowserContext, type Page, type Worker } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const EXT = resolve(here, '../dist-test');
const FIXTURES = resolve(here, 'fixtures');

const test = base.extend<{ context: BrowserContext; sw: Worker; baseURL: string }>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    const userDir = mkdtempSync(resolve(tmpdir(), 'mull-pw-'));
    const context = await chromium.launchPersistentContext(userDir, {
      channel: 'chromium',
      headless: true,
      args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
    });
    await use(context);
    await context.close();
  },
  sw: async ({ context }, use) => {
    const sw = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
    // Demo provider so no network is needed. Keys stay empty.
    await sw.evaluate(() =>
      chrome.storage.local.set({
        settings: { provider: 'mock', apiKey: '', enabled: true, questionsPerGate: 2, conceptMemoryDays: 0 },
        stats: null,
        memory: {},
        block: null,
      }),
    );
    await use(sw);
  },
  // eslint-disable-next-line no-empty-pattern
  baseURL: async ({}, use) => {
    const server: Server = createServer(async (req, res) => {
      try {
        const file = resolve(FIXTURES, (req.url ?? '/').replace(/^\//, '').split('?')[0] || 'chatgpt.html');
        res.setHeader('content-type', 'text/html; charset=utf-8');
        res.end(await readFile(file));
      } catch {
        res.statusCode = 404;
        res.end('nope');
      }
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    await use(`http://127.0.0.1:${port}`);
    server.close();
  },
});

async function open(context: BrowserContext, url: string): Promise<Page> {
  const page = await context.newPage();
  await page.goto(url);
  await page.waitForFunction(() => document.documentElement.dataset.mullReady === '1');
  return page;
}

const overlay = (page: Page) => page.locator('#mull-host');

async function passQuiz(page: Page) {
  await overlay(page).getByRole('button', { name: /read it/i }).click();
  await expect(overlay(page).locator('form[data-form="quiz"]')).toBeVisible();
  // The mock card's correct choices carry recognizable text.
  await overlay(page).getByLabel('The correct one').check();
  await overlay(page).getByLabel('When the pieces depend on each other').check();
  await overlay(page).getByRole('button', { name: /check answers/i }).click();
}

test.describe('chatgpt fixture', () => {
  test('lazy prompt is gated, quiz pass releases it via Enter', async ({ context, sw, baseURL }) => {
    void sw;
    const page = await open(context, `${baseURL}/chatgpt.html`);
    await page.locator('#prompt-textarea').click();
    await page.keyboard.type('what is the chain rule');
    await page.keyboard.press('Enter');

    await expect(overlay(page).getByRole('heading', { name: 'the chain rule' })).toBeVisible();
    await expect(page.locator('#log li')).toHaveCount(0);

    await passQuiz(page);
    await expect(page.locator('#log li')).toHaveText(['what is the chain rule']);
    await expect(overlay(page)).toHaveCount(0);
  });

  test('wrong answers bounce back to the explanation', async ({ context, sw, baseURL }) => {
    void sw;
    const page = await open(context, `${baseURL}/chatgpt.html`);
    await page.locator('#prompt-textarea').click();
    await page.keyboard.type('what is a p-value');
    await page.keyboard.press('Enter');
    await overlay(page).getByRole('button', { name: /read it/i }).click();
    await overlay(page).getByLabel('A silly one').check();
    await overlay(page).getByLabel('Never').check();
    await overlay(page).getByRole('button', { name: /check answers/i }).click();
    await expect(overlay(page).getByText(/Not quite/)).toBeVisible();
    await expect(page.locator('#log li')).toHaveCount(0);
  });

  test('legit prompt goes straight through', async ({ context, sw, baseURL }) => {
    void sw;
    const page = await open(context, `${baseURL}/chatgpt.html`);
    await page.locator('#prompt-textarea').click();
    await page.keyboard.type("here's my code, why does it return None");
    await page.keyboard.press('Enter');
    await expect(page.locator('#log li')).toHaveText(["here's my code, why does it return None"]);
    await expect(overlay(page)).toHaveCount(0);
  });

  test('allowlist prefix bypasses and is stripped', async ({ context, sw, baseURL }) => {
    void sw;
    const page = await open(context, `${baseURL}/chatgpt.html`);
    await page.locator('#prompt-textarea').click();
    await page.keyboard.type('work: what is the chain rule');
    await page.keyboard.press('Enter');
    await expect(page.locator('#log li')).toHaveText(['what is the chain rule']);
  });

  test('skip releases and the popup would count it', async ({ context, sw, baseURL }) => {
    const page = await open(context, `${baseURL}/chatgpt.html`);
    await page.locator('#prompt-textarea').click();
    await page.keyboard.type('explain the causes of ww1');
    await page.keyboard.press('Enter');
    await overlay(page).getByRole('button', { name: /skip/i }).click();
    await expect(page.locator('#log li')).toHaveText(['explain the causes of ww1']);
    await expect
      .poll(async () => sw.evaluate(async () => ((await chrome.storage.local.get('stats')).stats as { skipped: number } | undefined)?.skipped ?? 0))
      .toBe(1);
  });

  test('disabled extension does nothing', async ({ context, sw, baseURL }) => {
    await sw.evaluate(() => chrome.storage.local.set({ settings: { provider: 'mock', enabled: false } }));
    const page = await open(context, `${baseURL}/chatgpt.html`);
    await page.locator('#prompt-textarea').click();
    await page.keyboard.type('what is the chain rule');
    await page.keyboard.press('Enter');
    await expect(page.locator('#log li')).toHaveText(['what is the chain rule']);
  });
});

test.describe('claude fixture', () => {
  test('send button click is gated and released by click', async ({ context, sw, baseURL }) => {
    void sw;
    const page = await open(context, `${baseURL}/claude.html`);
    await page.locator('.ProseMirror').click();
    await page.keyboard.type('define entropy');
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(overlay(page).getByRole('heading', { name: 'entropy' })).toBeVisible();
    await expect(page.locator('#log li')).toHaveCount(0);
    await passQuiz(page);
    await expect(page.locator('#log li')).toHaveText(['define entropy']);
  });
});

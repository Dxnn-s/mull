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
    // The answer key names the correct choice and the lure that was picked.
    await expect(overlay(page).locator('[data-testid="review"]')).toContainText('The correct one');
    await expect(overlay(page).locator('[data-testid="review"]')).toContainText('A silly one');
    await expect(overlay(page).locator('[data-testid="review"]')).toContainText('first sentence');
    await expect(page.locator('#log li')).toHaveCount(0);
  });

  test('"this was real work" releases and records a correction', async ({ context, sw, baseURL }) => {
    const page = await open(context, `${baseURL}/chatgpt.html`);
    await page.locator('#prompt-textarea').click();
    await page.keyboard.type('what is a moment of inertia');
    await page.keyboard.press('Enter');
    await overlay(page).getByRole('button', { name: /real work/i }).click();
    await expect(page.locator('#log li')).toHaveText(['what is a moment of inertia']);
    await expect
      .poll(async () => sw.evaluate(async () => ((await chrome.storage.local.get('stats')).stats as { corrections: unknown[] } | undefined)?.corrections?.length ?? 0))
      .toBe(1);
    const row = await sw.evaluate(async () => ((await chrome.storage.local.get('stats')).stats as { corrections: Array<Record<string, unknown>> }).corrections[0]);
    expect(row).toMatchObject({ verdict: 'LAZY', label: 'LEGIT' });
    // The row carries a hash and the concept name, never the prompt.
    expect(row).not.toHaveProperty('prompt');
    expect(Object.keys(row ?? {}).sort()).toEqual(['concept', 'hash', 'label', 'ts', 'verdict']);
  });

  test('cancel keeps the prompt in the composer and counts a walk-away', async ({ context, sw, baseURL }) => {
    const page = await open(context, `${baseURL}/chatgpt.html`);
    await page.locator('#prompt-textarea').click();
    await page.keyboard.type('define torque');
    await page.keyboard.press('Enter');
    await overlay(page).getByRole('button', { name: 'Cancel' }).click();
    await expect(overlay(page)).toHaveCount(0);
    await expect(page.locator('#prompt-textarea')).toHaveText('define torque');
    await expect(page.locator('#log li')).toHaveCount(0);
    await expect
      .poll(async () => sw.evaluate(async () => ((await chrome.storage.local.get('stats')).stats as { cancelled: number } | undefined)?.cancelled ?? 0))
      .toBe(1);
  });

  test('a hung provider: send anyway from the pill, or Enter twice', async ({ context, sw, baseURL }) => {
    await sw.evaluate(() => chrome.storage.local.set({ settings: { provider: 'mock', model: 'slow', enabled: true } }));
    const page = await open(context, `${baseURL}/chatgpt.html`);
    await page.locator('#prompt-textarea').click();
    await page.keyboard.type('what is a limit');
    await page.keyboard.press('Enter');
    await expect(overlay(page).locator('[data-testid="pill"]')).toBeVisible();
    await expect(page.locator('#log li')).toHaveCount(0);
    // Second Enter within two seconds releases the prompt as typed.
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await expect(page.locator('#log li')).toHaveText(['what is a limit']);
    await expect(overlay(page)).toHaveCount(0);

    await page.locator('#prompt-textarea').click();
    await page.keyboard.type('what is a derivative');
    await page.keyboard.press('Enter');
    await overlay(page).locator('[data-testid="pill"] a').click();
    await expect(page.locator('#log li')).toHaveCount(2);
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

test.describe('v1 behaviors', () => {
  test('a passed concept is remembered and not re-gated', async ({ context, sw, baseURL }) => {
    await sw.evaluate(() => chrome.storage.local.set({ settings: { provider: 'mock', enabled: true, conceptMemoryDays: 7 } }));
    const page = await open(context, `${baseURL}/chatgpt.html`);
    await page.locator('#prompt-textarea').click();
    await page.keyboard.type('what is the chain rule');
    await page.keyboard.press('Enter');
    await passQuiz(page);
    await expect(page.locator('#log li')).toHaveCount(1);

    await page.locator('#prompt-textarea').click();
    await page.keyboard.type('what is the chain rule');
    await page.keyboard.press('Enter');
    await expect(page.locator('#log li')).toHaveCount(2);
    await expect(overlay(page)).toHaveCount(0);
    await expect
      .poll(async () => sw.evaluate(async () => ((await chrome.storage.local.get('stats')).stats as { remembered: number } | undefined)?.remembered ?? 0))
      .toBe(1);
  });

  test('hard mode hides skip and blocks after a miss', async ({ context, sw, baseURL }) => {
    await sw.evaluate(() =>
      chrome.storage.local.set({ settings: { provider: 'mock', enabled: true, hardMode: { enabled: true, failsBeforeBlock: 1, blockMinutes: 5 } } }),
    );
    const page = await open(context, `${baseURL}/chatgpt.html`);
    await page.locator('#prompt-textarea').click();
    await page.keyboard.type('what is a p-value');
    await page.keyboard.press('Enter');
    await expect(overlay(page).getByRole('button', { name: /read it/i })).toBeVisible();
    await expect(overlay(page).getByRole('button', { name: /skip/i })).toHaveCount(0);
    await overlay(page).getByRole('button', { name: /read it/i }).click();
    await overlay(page).getByLabel('A silly one').check();
    await overlay(page).getByLabel('Never').check();
    await overlay(page).getByRole('button', { name: /check answers/i }).click();
    await expect(overlay(page).getByRole('heading', { name: 'Blocked.' })).toBeVisible();
    await expect(page.locator('#log li')).toHaveCount(0);

    // The block persists into the next prompt.
    await overlay(page).getByRole('button', { name: 'Close' }).click();
    await page.locator('#prompt-textarea').click();
    await page.keyboard.type('what is entropy');
    await page.keyboard.press('Enter');
    await expect(overlay(page).getByRole('heading', { name: 'Blocked.' })).toBeVisible();
  });

  test('popup shows the pass', async ({ context, sw, baseURL }) => {
    const page = await open(context, `${baseURL}/chatgpt.html`);
    await page.locator('#prompt-textarea').click();
    await page.keyboard.type('define osmosis');
    await page.keyboard.press('Enter');
    await passQuiz(page);
    await expect(page.locator('#log li')).toHaveCount(1);

    const id = new URL(sw.url()).host;
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${id}/popup.html`);
    await expect(popup.locator('#passed')).toHaveText('1');
    await expect(popup.locator('#gated')).toHaveText('1');
    await expect(popup.locator('#streak')).toHaveText('1');
    await expect(popup.locator('#hold')).toHaveText('100%');
    await expect(popup.locator('#sites li[data-site="chatgpt"]')).toContainText('just now');
    await expect(popup.locator('#sites li[data-site="claude"]')).toContainText('not seen yet');
  });
});

test.describe('gemini fixture', () => {
  test('quill composer is gated and released', async ({ context, sw, baseURL }) => {
    void sw;
    const page = await open(context, `${baseURL}/gemini.html`);
    await page.locator('.ql-editor').click();
    await page.keyboard.type('what is photosynthesis');
    await page.keyboard.press('Enter');
    await expect(overlay(page).getByRole('heading', { name: 'photosynthesis' })).toBeVisible();
    await passQuiz(page);
    await expect(page.locator('#log li')).toHaveText(['what is photosynthesis']);
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

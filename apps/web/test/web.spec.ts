import { expect, test } from '@playwright/test';

// Fresh localStorage per test, seeded once (not on every navigation, or reloads would wipe what a test just saved).
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('mull.settings', JSON.stringify({ provider: 'mock', apiKey: '', conceptMemoryDays: 0 }));
  });
});

test('lazy prompt is gated, quiz pass yields an answer', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Message').fill('what is the chain rule');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('gate-explain')).toBeVisible();
  await page.getByRole('button', { name: /read it/i }).click();
  await page.getByLabel('The correct one').check();
  await page.getByLabel('When the pieces depend on each other').check();
  await page.getByRole('button', { name: /check answers/i }).click();
  await expect(page.locator('[data-role="user"]')).toContainText('what is the chain rule');
  await expect(page.locator('[data-role="assistant"]')).toContainText('Demo mode answer');
});

test('legit prompt answers without a gate', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Message').fill("here's my code, why does it return None");
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-role="assistant"]')).toContainText('Demo mode answer');
  await expect(page.getByTestId('gate-explain')).toHaveCount(0);
});

test('stats page reflects a pass', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Message').fill('define entropy');
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: /read it/i }).click();
  await page.getByLabel('The correct one').check();
  await page.getByLabel('When the pieces depend on each other').check();
  await page.getByRole('button', { name: /check answers/i }).click();
  await expect(page.locator('[data-role="assistant"]')).toBeVisible();
  await page.goto('/stats');
  await expect(page.getByText('passed today').locator('..')).toContainText('1');
  await expect(page.getByText('entropy')).toBeVisible();
});

test('a miss shows the answer key and "real work" releases with a correction', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Message').fill('what is torque');
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: /read it/i }).click();
  await page.getByLabel('A silly one').check();
  await page.getByLabel('Never').check();
  await page.getByRole('button', { name: /check answers/i }).click();
  await expect(page.getByTestId('review')).toContainText('The correct one');
  await expect(page.getByTestId('review')).toContainText('first sentence');
  await page.getByRole('button', { name: /real work/i }).click();
  await expect(page.locator('[data-role="assistant"]')).toContainText('Demo mode answer');
  await page.goto('/settings');
  await expect(page.getByTestId('correction-count')).toHaveText('1 row');
});

test('a hung provider offers send anyway', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('mull.settings', JSON.stringify({ provider: 'mock', model: 'slow', conceptMemoryDays: 0 })));
  await page.goto('/');
  await page.getByLabel('Message').fill('what is a limit');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('gate-pending')).toBeVisible();
  await page.getByRole('button', { name: /send anyway/i }).click({ timeout: 10_000 });
  await expect(page.locator('[data-role="user"]')).toContainText('what is a limit');
});

test('settings persist and switch palette', async ({ page }) => {
  await page.goto('/settings');
  await page.getByLabel('Atelier Sage').check();
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'sage');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'sage');
});

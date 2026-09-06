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

test('settings persist and switch palette', async ({ page }) => {
  await page.goto('/settings');
  await page.getByLabel('Atelier Sage').check();
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'sage');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'sage');
});

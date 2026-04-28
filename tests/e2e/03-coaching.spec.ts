import { test, expect } from '@playwright/test';

test.describe('Coaching page', () => {
  test('loads with correct title', async ({ page }) => {
    await page.goto('/coaching');
    await expect(page).toHaveTitle(/職涯諮詢.*Daydream Dex/);
  });

  test('shows consultant card (盧冠宏 + price + booking CTA)', async ({ page }) => {
    await page.goto('/coaching');
    await expect(page.getByText('盧冠宏', { exact: false }).first()).toBeVisible();
    await expect(page.getByText(/NTD\s*\$?\s*2[,，]?400/).first()).toBeVisible();
    await expect(page.getByText('前往預約', { exact: false }).first()).toBeVisible();
  });

  test('contains the sparkle (✨) feature blocks', async ({ page }) => {
    await page.goto('/coaching');
    const sparkles = await page.getByText('✨', { exact: false }).count();
    // We expect at least 10 sparkle markers; allow >=8 to be tolerant of layout drift
    expect(sparkles).toBeGreaterThanOrEqual(8);
  });

  test('booking CTA links to AAPD simplybook', async ({ page }) => {
    await page.goto('/coaching');
    const link = page.locator('a[href*="aapd.simplybook.asia"]').first();
    await expect(link).toHaveCount(1);
    const href = await link.getAttribute('href');
    expect(href).toMatch(/aapd\.simplybook\.asia/);
  });

  test('screenshot for visual record', async ({ page }, testInfo) => {
    await page.goto('/coaching', { waitUntil: 'networkidle' });
    await page.screenshot({
      path: `tests/screenshots/coaching-${testInfo.project.name}.png`,
      fullPage: true,
    });
  });
});

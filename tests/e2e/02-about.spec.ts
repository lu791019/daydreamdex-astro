import { test, expect } from '@playwright/test';
import { findBrokenImages } from './helpers/site';

test.describe('About page (v2)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/about');
  });

  test('loads with correct title and h1', async ({ page }) => {
    await expect(page).toHaveTitle(/關於我.*Daydream Dex/);
    await expect(page.locator('h1')).toContainText('長期主義者');
  });

  test('film-strip timeline 有 6 格，最後一格是現在', async ({ page }) => {
    await expect(page.locator('.ab-frame')).toHaveCount(6);
    await expect(page.locator('.ab-frame.is-now')).toHaveCount(1);
  });

  test('鏡頭外、成就解鎖、SCENE、心靈捕手都在', async ({ page }) => {
    for (const text of ['鏡頭外', '成就解鎖', 'SCENE', '心靈捕手']) {
      await expect(page.getByText(text, { exact: false }).first()).toBeVisible();
    }
  });

  test('預約諮詢 CTA 指向 AAPD SimplyBook', async ({ page }) => {
    await expect(page.locator('a[href*="aapd.simplybook.asia"]').first()).toBeVisible();
  });

  test('no broken images', async ({ page }) => {
    expect(await findBrokenImages(page)).toEqual([]);
  });

  test('screenshot for visual record', async ({ page }, testInfo) => {
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: `tests/screenshots/about-${testInfo.project.name}.png`,
      fullPage: true,
    });
  });
});

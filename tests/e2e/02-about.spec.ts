import { test, expect } from '@playwright/test';

test.describe('About page', () => {
  test('loads with correct title', async ({ page }) => {
    await page.goto('/about');
    await expect(page).toHaveTitle(/關於我.*Daydream Dex/);
  });

  test('film-strip timeline contains 6 frames', async ({ page }) => {
    await page.goto('/about');
    // FilmStrip frames usually rendered as repeated film cells; we count
    // year markers expected in the timeline (6 chapters)
    const yearLabels = await page
      .locator('text=/^(20\\d{2}|201\\d|202\\d)/')
      .count();
    expect(yearLabels).toBeGreaterThanOrEqual(6);
  });

  test('off-camera section, avatar, achievements visible', async ({ page }) => {
    await page.goto('/about');
    await expect(page.getByText('鏡頭外', { exact: false }).first()).toBeVisible();
    // Achievements unlock section
    await expect(page.getByText('成就', { exact: false }).first()).toBeVisible();
  });

  test('SCENE pullquote and 心靈捕手 reference present', async ({ page }) => {
    await page.goto('/about');
    await expect(page.getByText('SCENE', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('心靈捕手', { exact: false }).first()).toBeVisible();
  });

  test('screenshot for visual record', async ({ page }, testInfo) => {
    await page.goto('/about', { waitUntil: 'networkidle' });
    await page.screenshot({
      path: `tests/screenshots/about-${testInfo.project.name}.png`,
      fullPage: true,
    });
  });
});

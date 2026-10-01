import { test, expect } from '@playwright/test';
import { CONTACT_EMAIL, findBrokenImages } from './helpers/site';

test.describe('Coaching page (v2)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/coaching');
  });

  test('loads with correct title and h1', async ({ page }) => {
    await expect(page).toHaveTitle(/職涯諮詢.*Daydream Dex/);
    await expect(page.locator('h1')).toContainText('陪你想清楚');
  });

  test('諮詢師卡片：盧冠宏 + NT$ 2,400 / 50 分鐘', async ({ page }) => {
    await expect(page.getByText('盧冠宏').first()).toBeVisible();
    await expect(page.getByText(/NT\$\s*2,400\s*\/\s*50 分鐘/).first()).toBeVisible();
  });

  test('主要預約 CTA 指向 AAPD SimplyBook 並另開分頁', async ({ page }) => {
    const cta = page.locator('a[href*="aapd.simplybook.asia"]', { hasText: '立即預約諮詢' }).first();
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute('target', '_blank');
  });

  test('有免費聊聊（Calendly）入口', async ({ page }) => {
    await expect(page.locator('a[href^="https://calendly.com/daydreamisexp/"]').first()).toBeVisible();
  });

  test('機構專題陪跑入口用 mailto 寫信', async ({ page }) => {
    const org = page.locator(`a[href^="mailto:${CONTACT_EMAIL}?subject="]`).first();
    await expect(org).toHaveCount(1);
    expect(decodeURIComponent((await org.getAttribute('href'))!)).toContain('專題陪跑');
  });

  test('no broken images', async ({ page }) => {
    expect(await findBrokenImages(page)).toEqual([]);
  });

  test('screenshot for visual record', async ({ page }, testInfo) => {
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: `tests/screenshots/coaching-${testInfo.project.name}.png`,
      fullPage: true,
    });
  });
});

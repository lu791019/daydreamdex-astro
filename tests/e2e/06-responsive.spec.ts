import { test, expect } from '@playwright/test';
import {
  INDEXABLE_PAGES,
  POST_SLUGS,
  collectConsoleErrors,
  horizontalOverflow,
} from './helpers/site';

// 每個 project（desktop 1280／tablet 768／mobile 375）都跑一次全站
const ALL_PAGES = [...INDEXABLE_PAGES, ...POST_SLUGS.map((s) => `/blog/${s}`), '/reviews/trivisa'];

test.describe('Site-wide health', () => {
  for (const path of ALL_PAGES) {
    test(`${path}：200、無水平溢出、無 console error、可被索引`, async ({ page }) => {
      const errors = collectConsoleErrors(page);
      const res = await page.goto(path, { waitUntil: 'networkidle' });
      expect(res?.status()).toBe(200);

      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
      expect(errors).toEqual([]);

      const robots = await page
        .locator('meta[name="robots"], meta[name="googlebot"]')
        .evaluateAll((els) => els.map((e) => e.getAttribute('content') ?? ''));
      for (const r of robots) expect(r).not.toMatch(/noindex/i);
      await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    });
  }

  test('404 頁有 noindex，且無水平溢出', async ({ page }) => {
    const res = await page.goto('/no-such-page-xyz');
    expect(res?.status()).toBe(404);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });

  test('homepage screenshot', async ({ page }, testInfo) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.screenshot({
      path: `tests/screenshots/responsive-home-${testInfo.project.name}.png`,
      fullPage: true,
    });
  });
});

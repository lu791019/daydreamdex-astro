import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
];

test.describe('Responsive layouts', () => {
  for (const vp of VIEWPORTS) {
    test(`homepage renders @ ${vp.name} (${vp.width}x${vp.height})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/', { waitUntil: 'networkidle' });

      // Body is visible and content laid out
      await expect(page.locator('body')).toBeVisible();
      await expect(page.getByText('Daydream Dex').first()).toBeVisible();

      // Filter buttons exist regardless of viewport
      await expect(page.locator('[data-filter]').first()).toBeVisible();

      // No horizontal overflow worse than 5px tolerance
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(5);

      await page.screenshot({
        path: `tests/screenshots/responsive-home-${vp.name}.png`,
        fullPage: true,
      });
    });
  }
});

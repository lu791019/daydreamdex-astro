import { test, expect } from '@playwright/test';

const SAMPLE_ARTICLES = [
  '/blog/2024-08-04-python-career-transition-guide-and-experience',
  '/blog/2025-03-13-data-analyst-beginner-guide-career-switch',
  '/blog/2025-03-04-30s-career-change-5-questions-to-ask',
];

test.describe('Article pages', () => {
  for (const slug of SAMPLE_ARTICLES) {
    test(`article ${slug} renders correctly`, async ({ page }) => {
      const response = await page.goto(slug, { waitUntil: 'networkidle' });
      expect(response?.status()).toBeLessThan(400);

      // Title contains brand suffix
      await expect(page).toHaveTitle(/｜\s*Daydream Dex/);

      // og:type = article
      const ogType = await page.locator('meta[property="og:type"]').getAttribute('content');
      expect(ogType).toBe('article');

      // Article schema JSON-LD present in head
      const jsonldCount = await page
        .locator('script[type="application/ld+json"]')
        .count();
      expect(jsonldCount).toBeGreaterThanOrEqual(1);

      const jsonlds = await page
        .locator('script[type="application/ld+json"]')
        .allTextContents();
      const hasArticleSchema = jsonlds.some((t) => /"@type"\s*:\s*"Article"/.test(t));
      expect(hasArticleSchema).toBe(true);

      // No broken images
      const broken = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img'));
        return imgs.filter((img) => img.complete && img.naturalWidth === 0).length;
      });
      expect(broken).toBe(0);
    });
  }

  test('blog index lists all 14 posts', async ({ page }) => {
    await page.goto('/blog/');
    const articleLinks = await page.locator('a[href*="/blog/20"]').count();
    expect(articleLinks).toBeGreaterThanOrEqual(14);
  });
});

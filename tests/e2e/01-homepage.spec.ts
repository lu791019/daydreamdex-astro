import { test, expect } from '@playwright/test';
import { CONTACT_EMAIL, POST_SLUGS, findBrokenImages } from './helpers/site';

test.describe('Homepage (v2)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('loads with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Daydream Dex/);
  });

  test('hero h1 是「把每一次轉彎」主標', async ({ page }) => {
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toContainText('把每一次轉彎');
    await expect(h1).toBeVisible();
  });

  test('hero CTA 指向文章區與預約區，且錨點存在', async ({ page }) => {
    await expect(page.locator('.hero a[href="#reads"]').first()).toBeVisible();
    await expect(page.locator('.hero a[href="#book"]').first()).toBeVisible();
    for (const id of ['reads', 'doors', 'all-posts', 'book']) {
      await expect(page.locator(`section#${id}`)).toHaveCount(1);
    }
  });

  test('ARCHIVE 最新文章列表連到真實文章，並有「看全部」入口', async ({ page }) => {
    const rows = page.locator('#all-posts .post-row');
    expect(await rows.count()).toBeGreaterThan(0);
    for (const href of await rows.evaluateAll((els) => els.map((e) => e.getAttribute('href')))) {
      expect(POST_SLUGS).toContain(href!.replace('/blog/', ''));
    }
    await expect(page.locator('#all-posts a[href="/blog"]')).toContainText(`${POST_SLUGS.length}`);
  });

  test('FINAL SCENE 有機構／企業合作入口（mailto + 兩個服務頁）', async ({ page }) => {
    const final = page.locator('section#book');
    await expect(final).toContainText('FINAL SCENE');
    const orgCard = final.locator('.final-card', { hasText: '機構／企業合作' });
    await expect(orgCard).toHaveCount(1);
    await expect(orgCard.locator(`a[href^="mailto:${CONTACT_EMAIL}"]`)).toHaveCount(1);
    await expect(orgCard.locator('a[href="/consultant"]')).toBeVisible();
    await expect(orgCard.locator('a[href="/instructor"]')).toBeVisible();
  });

  test('FINAL SCENE 有 1:1 諮詢預約與免費聊聊', async ({ page }) => {
    const final = page.locator('section#book');
    await expect(final.locator('a[href*="aapd.simplybook.asia"]').first()).toBeVisible();
    await expect(final.locator('a[href*="calendly.com/daydreamisexp"]').first()).toBeVisible();
  });

  test('nav 有 5 個社群連結', async ({ page }) => {
    const hosts = ['threads.com', 'instagram.com', 'facebook.com', 'linkedin.com', 'open.spotify.com'];
    for (const host of hosts) {
      await expect(page.locator(`nav a[href*="${host}"]`).first()).toHaveAttribute(
        'href',
        new RegExp(host.replace('.', '\\.')),
      );
    }
  });

  test('no broken images', async ({ page }) => {
    expect(await findBrokenImages(page)).toEqual([]);
  });

  test('screenshot for visual record', async ({ page }, testInfo) => {
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: `tests/screenshots/homepage-${testInfo.project.name}.png`,
      fullPage: true,
    });
  });
});

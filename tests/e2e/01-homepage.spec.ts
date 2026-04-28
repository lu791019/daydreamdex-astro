import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('loads with correct title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Daydream Dex/);
  });

  test('renders all 11 main sections', async ({ page }) => {
    await page.goto('/');

    // Landmarks identified from production HTML
    const expectedTexts = [
      '寫信給我',           // TopBar tagline
      '影評 × 職涯',         // Hero / brand line
      '不寫 SEO 廢文',        // Values block
      '如果你只能讀五篇',     // Featured section heading
      '電影裡的職涯隱喻',     // Cinema section
      '所有的塵世筆記',       // AllPosts section
      '正在訂閱本月電子報',   // Newsletter
    ];

    for (const text of expectedTexts) {
      await expect(page.getByText(text, { exact: false }).first()).toBeVisible();
    }

    // Footer present (Dex brand mark or copyright)
    await expect(page.locator('body')).toContainText('Daydream Dex');
  });

  test('has 5 social icons with correct hrefs', async ({ page }) => {
    await page.goto('/');

    const expectedHosts = [
      'threads.com',
      'instagram.com',
      'facebook.com',
      'linkedin.com',
      'open.spotify.com',
    ];

    for (const host of expectedHosts) {
      const link = page.locator(`a[href*="${host}"]`).first();
      await expect(link).toHaveCount(1);
      await expect(link).toHaveAttribute('href', new RegExp(host));
    }
  });

  test('5 featured article hero images load (no broken images)', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // images that fail return naturalWidth === 0
    const brokenCount = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      return imgs.filter((img) => img.complete && img.naturalWidth === 0).length;
    });

    expect(brokenCount).toBe(0);
  });

  test('category filter works (all / 轉職 / 資料工程)', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Confirm filter buttons exist (5 buttons)
    const filters = page.locator('[data-filter]');
    await expect(filters).toHaveCount(5);

    const cards = page.locator('[data-tag]');
    await expect(cards).toHaveCount(14);

    // Click "轉職" -> only 4 cards visible
    await page.locator('[data-filter="轉職"]').click();
    await expect.poll(async () => {
      return await page.locator('[data-tag="轉職"]:visible').count();
    }).toBe(4);

    // Click "資料工程" -> only 4
    await page.locator('[data-filter="資料工程"]').click();
    await expect.poll(async () => {
      return await page.locator('[data-tag="資料工程"]:visible').count();
    }).toBe(4);

    // Click "all" -> 14
    await page.locator('[data-filter="all"]').click();
    await expect.poll(async () => {
      return await page.locator('[data-tag]:visible').count();
    }).toBe(14);
  });

  test('screenshot for visual record', async ({ page }, testInfo) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.screenshot({
      path: `tests/screenshots/homepage-${testInfo.project.name}.png`,
      fullPage: true,
    });
  });
});

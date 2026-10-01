import { test, expect } from '@playwright/test';
import { POST_SLUGS, findBrokenImages } from './helpers/site';

// 與 src/utils/post-meta.ts inferTag 的結果一致；分類規則變動時這裡要一起改
const EXPECTED_CATEGORY_COUNTS: Record<string, number> = {
  轉職: 4,
  資料工程: 5,
  AI: 2,
  心法: 3,
};

test.describe('Article pages', () => {
  test('content 目錄共有 14 篇文章', () => {
    expect(POST_SLUGS).toHaveLength(14);
  });

  for (const slug of POST_SLUGS) {
    test(`/blog/${slug} 200、SEO 完整、0 壞圖`, async ({ page }) => {
      const response = await page.goto(`/blog/${slug}`);
      expect(response?.status()).toBe(200);

      await expect(page).toHaveTitle(/｜\s*Daydream Dex/);
      // 文章標題 h1 在 hero；部分舊文內文自帶 "# 標題"（內容問題，另行回報），這裡只鎖 hero
      await expect(page.locator('.post-hero h1')).toHaveCount(1);
      await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article');

      const jsonlds = await page.locator('script[type="application/ld+json"]').allTextContents();
      expect(jsonlds.some((t) => /"@type"\s*:\s*"Article"/.test(t))).toBe(true);

      expect(await findBrokenImages(page)).toEqual([]);
    });
  }

  test('文章頁有 TOC（桌機側欄／窄螢幕摺疊目錄擇一可見），連結指向存在的標題', async ({ page }) => {
    await page.goto(`/blog/${POST_SLUGS[0]}`);
    const sidebar = page.locator('.toc-sidebar');
    const inline = page.locator('details.toc-inline');
    await expect(sidebar).toHaveCount(1);
    await expect(inline).toHaveCount(1);

    const sidebarVisible = await sidebar.isVisible();
    const inlineVisible = await inline.isVisible();
    expect(sidebarVisible !== inlineVisible).toBe(true);

    const hrefs = await page.locator('.toc-sidebar a').evaluateAll((els) =>
      els.map((e) => e.getAttribute('href')!),
    );
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      const id = decodeURIComponent(href.slice(1));
      expect(await page.locator(`[id="${id}"]`).count(), `heading ${id}`).toBe(1);
    }

    if (inlineVisible) {
      await inline.locator('summary').click();
      await expect(inline.locator('a').first()).toBeVisible();
    }
  });

  test('上一篇／下一篇：中間文章兩個都有，且依日期新到舊串接', async ({ page, request }) => {
    const mid = 5;
    await page.goto(`/blog/${POST_SLUGS[mid]}`);
    const prev = page.locator('.post-nav a[rel="prev"]');
    const next = page.locator('.post-nav a[rel="next"]');
    await expect(prev).toHaveAttribute('href', `/blog/${POST_SLUGS[mid - 1]}`);
    await expect(next).toHaveAttribute('href', `/blog/${POST_SLUGS[mid + 1]}`);
    for (const link of [prev, next]) {
      const res = await request.get((await link.getAttribute('href'))!);
      expect(res.status()).toBe(200);
    }
  });

  test('最新一篇只有下一篇、最舊一篇只有上一篇', async ({ page }) => {
    await page.goto(`/blog/${POST_SLUGS[0]}`);
    await expect(page.locator('.post-nav a[rel="prev"]')).toHaveCount(0);
    await expect(page.locator('.post-nav a[rel="next"]')).toHaveCount(1);

    await page.goto(`/blog/${POST_SLUGS[POST_SLUGS.length - 1]}`);
    await expect(page.locator('.post-nav a[rel="prev"]')).toHaveCount(1);
    await expect(page.locator('.post-nav a[rel="next"]')).toHaveCount(0);
  });

  test('文章頁分類標籤連回 /blog#cat-<分類>，進入後自動篩選', async ({ page }) => {
    await page.goto(`/blog/${POST_SLUGS[0]}`);
    const catLink = page.locator('.post-hero a[href^="/blog#cat-"]').first();
    const href = (await catLink.getAttribute('href'))!;
    const cat = decodeURIComponent(href.split('#cat-')[1]);
    await page.goto(href);
    await expect(page.locator(`.filter-btn[data-filter="${cat}"]`)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.post-row:visible')).toHaveCount(EXPECTED_CATEGORY_COUNTS[cat]);
  });
});

test.describe('Blog index', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/blog');
  });

  test('列出全部 14 篇，且都連到存在的文章', async ({ page }) => {
    const rows = page.locator('.post-row[data-tag]');
    await expect(rows).toHaveCount(POST_SLUGS.length);
    const hrefs = await rows.evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    expect(hrefs.map((h) => h!.replace('/blog/', '')).sort()).toEqual([...POST_SLUGS].sort());
  });

  test('分類按鈕：全部 + 4 類，按鈕上的數字正確', async ({ page }) => {
    await expect(page.locator('.filter-btn')).toHaveCount(1 + Object.keys(EXPECTED_CATEGORY_COUNTS).length);
    await expect(page.locator('.filter-btn[data-filter="all"] span')).toHaveText(String(POST_SLUGS.length));
    for (const [cat, n] of Object.entries(EXPECTED_CATEGORY_COUNTS)) {
      await expect(page.locator(`.filter-btn[data-filter="${cat}"] span`)).toHaveText(String(n));
    }
    // 沒有文章落到 fallback「職涯」
    await expect(page.locator('.filter-btn[data-filter="職涯"]')).toHaveCount(0);
  });

  test('點分類篩選後只顯示該分類，數量正確；點「全部」復原', async ({ page }) => {
    for (const [cat, n] of Object.entries(EXPECTED_CATEGORY_COUNTS)) {
      await page.locator(`.filter-btn[data-filter="${cat}"]`).click();
      await expect(page.locator(`.filter-btn[data-filter="${cat}"]`)).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('.post-row:visible')).toHaveCount(n);
      await expect(page.locator(`.post-row:visible:not([data-tag="${cat}"])`)).toHaveCount(0);
    }
    await page.locator('.filter-btn[data-filter="all"]').click();
    await expect(page.locator('.post-row:visible')).toHaveCount(POST_SLUGS.length);
    await expect(page.locator('.filter-empty')).toBeHidden();
  });

  test('no broken images', async ({ page }) => {
    expect(await findBrokenImages(page)).toEqual([]);
  });
});

import { test, expect } from '@playwright/test';
import { isLocalBase, matchRedirect } from './helpers/site';

const NAV_LINKS = ['/blog', '/about', '/coaching', '/consultant', '/instructor'];

test.describe('V2Nav', () => {
  test('5 個導覽連結：桌機在第二排、窄螢幕在選單內，點了都會到 200 頁面', async ({ page }) => {
    await page.goto('/');
    const row2 = page.locator('nav.nav .nav-row2 .links');
    const menu = page.locator('nav.nav details.nav-menu');
    const desktop = await row2.isVisible();

    for (const href of NAV_LINKS) {
      await page.goto('/');
      if (desktop) {
        await expect(menu).toBeHidden();
      } else {
        await expect(row2).toBeHidden();
        await menu.locator('summary').click();
      }
      const container = desktop ? row2 : menu.locator('.nav-menu-panel');
      const link = container.locator(`a[href="${href}"]`);
      await expect(link).toBeVisible();
      const [res] = await Promise.all([page.waitForResponse((r) => r.url().endsWith(href)), link.click()]);
      expect(res.status()).toBe(200);
      await expect(page).toHaveURL(new RegExp(`${href}$`));
    }
  });

  test('手機／平板選單可開可關', async ({ page }) => {
    await page.goto('/');
    const menu = page.locator('nav.nav details.nav-menu');
    if (!(await menu.isVisible())) {
      // 桌機寬度：選單收起、改顯示第二排導覽
      await expect(page.locator('nav.nav .nav-row2 .links a')).toHaveCount(NAV_LINKS.length);
      await expect(page.locator('nav.nav .nav-row2 .links')).toBeVisible();
      return;
    }
    const panel = menu.locator('.nav-menu-panel');
    await expect(panel).toBeHidden();
    await menu.locator('summary').click();
    await expect(panel).toBeVisible();
    await expect(panel.locator('a[href^="/"]')).toHaveCount(NAV_LINKS.length);
    await menu.locator('summary').click();
    await expect(panel).toBeHidden();
  });

  test('品牌 logo 回首頁、ADMIT ONE 免費聊聊另開分頁', async ({ page }) => {
    await page.goto('/about');
    await expect(page.locator('nav.nav a.brand')).toHaveAttribute('href', '/');
    const admit = page.locator('nav.nav a.admit');
    await expect(admit).toBeVisible();
    await expect(admit).toHaveAttribute('href', /calendly\.com\/daydreamisexp/);
    await expect(admit).toHaveAttribute('target', '_blank');
  });
});

test.describe('V2Footer', () => {
  test('頁尾站內連結全部可用', async ({ page, request, baseURL }) => {
    await page.goto('/');
    const hrefs = await page
      .locator('footer.foot a[href^="/"]')
      .evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute('href')!))]);
    expect(hrefs).toEqual(expect.arrayContaining(['/blog', '/reviews', '/coaching', '/consultant', '/instructor', '/about']));

    for (const href of hrefs) {
      const rule = matchRedirect(href);
      if (rule && rule.status === 301 && isLocalBase(baseURL)) {
        // /newsletter 之類只存在於 Cloudflare _redirects 的網址：確認規則存在即可
        expect(rule.to, `${href} redirect target`).toBeTruthy();
        continue;
      }
      const res = await request.get(href);
      expect(res.status(), href).toBeLessThan(400);
    }
  });

  test('頁尾有 5 個社群連結與寫信連結', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('footer.foot .foot-social a')).toHaveCount(5);
    await expect(page.locator('footer.foot a[href="mailto:daydreamisexp@gmail.com"]')).toHaveCount(1);
  });
});

test.describe('改版預覽頁下線', () => {
  test('/preview/home 301 到 /', async ({ request, baseURL }) => {
    if (isLocalBase(baseURL)) {
      expect(matchRedirect('/preview/home')).toMatchObject({ to: '/', status: 301 });
      // 本機 build 不該再產出預覽頁
      const res = await request.get('/preview/home');
      expect(res.status()).toBe(404);
      return;
    }
    const res = await request.get('/preview/home', { maxRedirects: 0 });
    expect(res.status()).toBe(301);
    expect(res.headers()['location']).toMatch(/^(https?:\/\/[^/]+)?\/$/);
  });
});

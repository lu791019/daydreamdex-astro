import { test, expect } from '@playwright/test';
import { CONTACT_EMAIL, INDEXABLE_PAGES, POST_SLUGS, findBrokenImages } from './helpers/site';

const FREE_CHAT = 'https://calendly.com/daydreamisexp/meet-with-me';

const SERVICES = [
  {
    path: '/consultant',
    title: /AI 與資料自動化.*Daydream Dex/,
    h1: '把 AI 變日常',
    primaryCta: { selector: `a[href="${FREE_CHAT}"]`, text: '免費 30 分鐘對焦' },
    mailSubject: '顧問合作洽詢',
    crossLinks: ['/coaching', '/instructor'],
  },
  {
    path: '/instructor',
    title: /講座.*Daydream Dex/,
    h1: '邀請 Dex',
    primaryCta: { selector: `a[href^="mailto:${CONTACT_EMAIL}"]`, text: '寫信邀約講座' },
    mailSubject: '講座邀約洽詢',
    crossLinks: ['/coaching', '/consultant'],
  },
];

for (const svc of SERVICES) {
  test.describe(`Service page ${svc.path}`, () => {
    test.beforeEach(async ({ page }) => {
      const res = await page.goto(svc.path);
      expect(res?.status()).toBe(200);
    });

    test('title 與 h1 正確', async ({ page }) => {
      await expect(page).toHaveTitle(svc.title);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toContainText(svc.h1);
    });

    test('主要 CTA 在首屏區塊且可見', async ({ page }) => {
      const cta = page.locator(svc.primaryCta.selector, { hasText: svc.primaryCta.text }).first();
      await expect(cta).toBeVisible();
    });

    test('有免費聊聊（Calendly）連結，另開分頁', async ({ page }) => {
      const chat = page.locator(`main a[href="${FREE_CHAT}"], body > *:not(nav) a[href="${FREE_CHAT}"]`).first();
      await expect(chat).toHaveAttribute('target', '_blank');
    });

    test('洽詢 mailto 帶正確主旨', async ({ page }) => {
      const hrefs = await page
        .locator(`a[href^="mailto:${CONTACT_EMAIL}?subject="]`)
        .evaluateAll((els) => els.map((e) => decodeURIComponent(e.getAttribute('href')!)));
      expect(hrefs.length).toBeGreaterThan(0);
      for (const h of hrefs) expect(h).toContain(svc.mailSubject);
    });

    test('互相導流到其他服務頁', async ({ page }) => {
      for (const link of svc.crossLinks) {
        await expect(page.locator(`a[href="${link}"]`).first()).toBeAttached();
      }
    });

    test('no broken images', async ({ page }) => {
      expect(await findBrokenImages(page)).toEqual([]);
    });
  });
}

test.describe('mailto 一律是 daydreamisexp@gmail.com', () => {
  const pages = [...INDEXABLE_PAGES, `/blog/${POST_SLUGS[0]}`, '/reviews/trivisa', '/404'];
  for (const path of pages) {
    test(`${path}`, async ({ page }) => {
      await page.goto(path);
      const hrefs = await page
        .locator('a[href^="mailto:"]')
        .evaluateAll((els) => els.map((e) => e.getAttribute('href')!));
      expect(hrefs.length).toBeGreaterThan(0);
      for (const href of hrefs) {
        expect(href, `${path} has ${href}`).toMatch(new RegExp(`^mailto:${CONTACT_EMAIL}(\\?|$)`));
      }
    });
  }
});

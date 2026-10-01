import { test, expect } from '@playwright/test';
import { isLocalBase, matchRedirect } from './helpers/site';

/**
 * WordPress 舊網址 → 新網址 301。
 * - 線上（Cloudflare Pages）：真的打 HTTP，看 301 + Location + 終點 < 400。
 * - 本機（astro preview 不吃 _redirects）：用 public/_redirects 規則模擬 Cloudflare
 *   「由上而下第一條命中」，驗證命中的規則正確，且站內終點在本機 build 真的 200。
 */
const REDIRECT_CASES: Array<{ from: string; to: RegExp }> = [
  {
    from: '/python-career-transition-guide-and-experience/',
    to: /\/blog\/2024-08-04-python-career-transition-guide-and-experience$/,
  },
  { from: '/about-us/', to: /\/about$/ },
  { from: '/homepage-1/', to: /\/$/ },
  { from: '/wp-admin/', to: /\/$/ },
  { from: '/feed/', to: /\/rss\.xml$/ },
  { from: '/category/anything/', to: /\/$/ },
  { from: '/page/2/', to: /\/blog$/ },
  { from: '/想進入-ai-領域/', to: /\/blog\/2025-03-11-software-or-machine-learning-to-ai$/ },
  { from: '/newsletter', to: /^https:\/\/iandexp\.kit\.com\/daydreamdex$/ },
  { from: '/preview/home', to: /^\/$|^https?:\/\/[^/]+\/$/ },
];

test.describe('Redirects', () => {
  for (const { from, to } of REDIRECT_CASES) {
    test(`${from} -> 301 -> matches ${to}`, async ({ request, baseURL }) => {
      if (isLocalBase(baseURL)) {
        const rule = matchRedirect(from);
        expect(rule, `no _redirects rule for ${from}`).toBeDefined();
        expect(rule!.status).toBe(301);
        expect(rule!.to).toMatch(to);
        if (rule!.to.startsWith('/')) {
          const final = await request.get(rule!.to);
          expect(final.status()).toBe(200);
        }
        return;
      }

      const res = await request.get(from, { maxRedirects: 0 });
      expect(res.status()).toBe(301);
      expect(res.headers()['location'] ?? '').toMatch(to);
      if (!/^https?:\/\/(?!.*daydreamdex)/.test(res.headers()['location'] ?? '')) {
        const final = await request.get(from);
        expect(final.status()).toBeLessThan(400);
      }
    });
  }

  test('不存在的網址落到 catch-all 404（不是 soft 404）', async ({ request, baseURL }) => {
    if (isLocalBase(baseURL)) {
      expect(matchRedirect('/no-such-page-xyz')).toMatchObject({ to: '/404.html', status: 404 });
    }
    const res = await request.get('/no-such-page-xyz');
    expect(res.status()).toBe(404);
  });

  test('現役頁面不會被任何 redirect 規則劫持', () => {
    for (const path of ['/', '/about', '/coaching', '/consultant', '/instructor', '/blog', '/reviews']) {
      const rule = matchRedirect(path);
      expect(rule === undefined || rule.status === 404, `${path} hit ${rule?.from}`).toBe(true);
    }
  });
});

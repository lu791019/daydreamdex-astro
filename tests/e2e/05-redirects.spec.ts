import { test, expect } from '@playwright/test';

const REDIRECT_CASES: Array<{ from: string; to: RegExp }> = [
  {
    from: '/python-career-transition-guide-and-experience/',
    to: /\/blog\/2024-08-04-python-career-transition-guide-and-experience/,
  },
  { from: '/about-us/', to: /\/about$/ },
  { from: '/homepage-1/', to: /\/$/ },
  { from: '/wp-admin/', to: /\/$/ },
  { from: '/feed/', to: /\/rss\.xml$/ },
  { from: '/category/anything/', to: /\/$/ },
];

test.describe('Redirects', () => {
  for (const { from, to } of REDIRECT_CASES) {
    test(`${from} -> 301 -> matches ${to}`, async ({ request }) => {
      const res = await request.get(from, { maxRedirects: 0 });
      // Cloudflare _redirects emits 301
      expect(res.status()).toBe(301);
      const location = res.headers()['location'] ?? '';
      expect(location).toMatch(to);

      // Final destination resolves successfully
      const final = await request.get(from);
      expect(final.status()).toBeLessThan(400);
    });
  }
});

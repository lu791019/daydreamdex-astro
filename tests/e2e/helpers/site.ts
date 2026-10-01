import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Page } from '@playwright/test';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));

/** 本機 astro preview 不會套用 Cloudflare 的 _redirects，redirect 類測試要分流 */
export const isLocalBase = (baseURL: string | undefined): boolean =>
  !baseURL || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/.test(baseURL);

/** 14 篇文章 slug：直接讀 content 目錄，新增文章時測試自動涵蓋 */
export const POST_SLUGS: string[] = readdirSync(`${ROOT}src/content/blog`)
  .filter((f) => /\.mdx?$/.test(f))
  .map((f) => f.replace(/\.mdx?$/, ''))
  .sort()
  .reverse(); // 檔名以日期開頭 → 新到舊

/** 改版後所有可索引的頁面 */
export const INDEXABLE_PAGES = [
  '/',
  '/about',
  '/coaching',
  '/consultant',
  '/instructor',
  '/blog',
  '/reviews',
] as const;

export const CONTACT_EMAIL = 'daydreamisexp@gmail.com';

const IGNORED_CONSOLE = /google-analytics|googletagmanager|gtag/i;

/** 收集 console error 與未捕捉例外（忽略 GA） */
export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const where = msg.location()?.url ?? '';
    if (IGNORED_CONSOLE.test(msg.text()) || IGNORED_CONSOLE.test(where)) return;
    errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

/** 捲到底觸發 lazy 圖，等所有圖載入完成後回傳壞圖網址 */
export async function findBrokenImages(page: Page): Promise<string[]> {
  await page.evaluate(async () => {
    window.scrollTo(0, document.body.scrollHeight);
    await Promise.all(
      Array.from(document.images).map((img) => {
        img.loading = 'eager';
        return img.complete
          ? Promise.resolve()
          : new Promise((resolve) => {
              img.addEventListener('load', resolve, { once: true });
              img.addEventListener('error', resolve, { once: true });
            });
      }),
    );
    window.scrollTo(0, 0);
  });
  return page.evaluate(() =>
    Array.from(document.images)
      .filter((img) => img.complete && img.naturalWidth === 0)
      .map((img) => img.currentSrc || img.src),
  );
}

export async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
}

// ---------- Cloudflare Pages _redirects 解析（本機模擬用） ----------

export interface RedirectRule {
  from: string;
  to: string;
  status: number;
}

export const REDIRECT_RULES: RedirectRule[] = readFileSync(`${ROOT}public/_redirects`, 'utf8')
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('#'))
  .map((line) => {
    const [from, to, status] = line.split(/\s+/);
    return { from, to, status: Number(status ?? 302) };
  });

/** 依 Cloudflare 規則（由上而下第一條命中；結尾 * 為 splat）找出對應規則 */
export function matchRedirect(path: string): RedirectRule | undefined {
  const encoded = encodeURI(path);
  return REDIRECT_RULES.find(({ from }) =>
    from.endsWith('*') ? encoded.startsWith(from.slice(0, -1)) : encoded === from,
  );
}

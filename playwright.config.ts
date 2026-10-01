import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for Daydream Dex E2E tests.
 * 預設測本機 production build（astro preview :4322）；
 * 要測線上站時：BASE_URL=https://daydreamdex-astro.pages.dev npx playwright test
 */
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:4322';
const LOCAL_URL = 'http://localhost:4322';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'tests/playwright-report' }]],
  outputDir: 'tests/test-results',

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ignoreHTTPSErrors: true,
  },

  // 只有測本機時才起 preview server（BASE_URL 指向線上站時不需要）
  webServer:
    BASE_URL === LOCAL_URL
      ? {
          command: 'npm run build && npx astro preview --port 4322',
          url: LOCAL_URL,
          reuseExistingServer: true,
          timeout: 180_000,
        }
      : undefined,

  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'tablet',
      use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 } },
    },
    {
      name: 'mobile',
      use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 667 } },
    },
  ],
});

import { defineConfig } from 'vitest/config';

// 單元測試只抓 tests/unit，避免誤跑 Playwright 的 tests/e2e
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/utils/**/*.ts'],
      reporter: ['text', 'text-summary'],
      reportsDirectory: 'tests/coverage',
    },
  },
});

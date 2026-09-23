import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_WEB_BASE_URL ?? 'http://localhost:3000';

if (process.env.RUN_E2E === 'true' && !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(baseURL)) {
  throw new Error(`URL E2E recusada: ${baseURL}. Use somente o painel local isolado.`);
}

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['line'], ['html', { outputFolder: 'playwright-report', open: 'never' }]] : 'list',
  use: {
    baseURL,
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {},
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});

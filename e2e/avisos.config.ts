import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '.', testMatch: 'avisos.spec.ts', timeout: 20000, workers: 1,
  use: { baseURL: 'http://127.0.0.1:3100', launchOptions: { executablePath: process.env.E2E_CHROMIUM_PATH, args: ['--no-sandbox', '--no-zygote'] }, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  reporter: 'list',
  webServer: { command: 'node ../tool/serve-ui-tests.cjs', url: 'http://127.0.0.1:3100', timeout: 15000, reuseExistingServer: false },
});

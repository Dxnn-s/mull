import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test',
  timeout: 60_000,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:3111', trace: 'retain-on-failure' },
  webServer: {
    command: 'pnpm dev',
    url: 'http://127.0.0.1:3111',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});

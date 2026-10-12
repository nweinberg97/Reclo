import { defineConfig, devices } from 'playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://localhost:4321/reclo/', trace: 'retain-on-failure' },
  projects: [
    { name: 'phone', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npx tsx scripts/serve.ts',
    url: 'http://localhost:4321/reclo/',
    reuseExistingServer: !process.env.CI,
  },
});

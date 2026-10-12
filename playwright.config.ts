import { defineConfig, devices } from 'playwright/test';
import { SITE } from './src/site/config.ts';

const origin = 'http://localhost:4321';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: `${origin}${SITE.base}`, trace: 'retain-on-failure' },
  projects: [
    { name: 'phone', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npx tsx scripts/serve.ts',
    url: `${origin}${SITE.base}`,
    reuseExistingServer: !process.env.CI,
  },
});

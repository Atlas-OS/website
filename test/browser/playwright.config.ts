import { defineConfig } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4489';

export default defineConfig({
  testDir: '.',
  outputDir: '../../.wrangler/browser-results',
  use: { baseURL },
  webServer: {
    command: 'bun x wrangler dev --local --ip 127.0.0.1 --port 4489',
    cwd: '../..',
    url: baseURL,
    timeout: 60000,
  },
});

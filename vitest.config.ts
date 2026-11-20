import { cloudflareTest } from '@cloudflare/vitest-plugin';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        // Runs the Worker in workerd with the bindings from wrangler.jsonc. Remote bindings stay off so
        // tests need no Cloudflare credentials: Browser Run is mocked and KV is a local simulator.
        plugins: [
          cloudflareTest({ wrangler: { configPath: './wrangler.jsonc' }, remoteBindings: false }),
        ],
        test: { name: 'worker', include: ['test/worker/**/*.test.ts'] },
      },
      {
        resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
        test: { name: 'unit', environment: 'node', include: ['test/unit/**/*.test.ts'] },
      },
    ],
  },
});

import type { AstroConfig, AstroIntegration } from 'astro';
import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

/** Cloudflare's per-file cap on static redirects in `_redirects`. */
export const MAX_STATIC_REDIRECTS = 2000;

/** Convert Astro `redirects` into `_redirects` lines (`source destination status`). */
export function buildRedirectRules(redirects: AstroConfig['redirects']): string[] {
  const rules = Object.entries(redirects).flatMap(([source, target]) => {
    if (source.includes('[')) {
      throw new Error(`Dynamic redirect sources are not supported in _redirects: ${source}`);
    }
    const { destination, status } =
      typeof target === 'string' ? { destination: target, status: 301 } : target;
    // No asset remains at the old path to normalise its trailing slash, so match both forms.
    const sources =
      source.length > 1 && source.endsWith('/') ? [source, source.slice(0, -1)] : [source];
    return sources.map(path => `${path} ${destination} ${status}`);
  });

  if (rules.length > MAX_STATIC_REDIRECTS) {
    throw new Error(
      `${rules.length} redirect rules exceed Cloudflare's ${MAX_STATIC_REDIRECTS} static redirect limit.`,
    );
  }
  return rules;
}

/**
 * Serve the `redirects` from the Astro config as real HTTP redirects on Cloudflare static assets.
 *
 * Astro's static build would emit a meta-refresh HTML page per redirect instead; pair this with
 * `build.redirects: false`. The dev server still applies `redirects` on its own.
 */
export default function cloudflareRedirects(): AstroIntegration {
  let rules: string[] = [];

  return {
    name: 'cloudflare-redirects',
    hooks: {
      'astro:config:done': ({ config }) => {
        rules = buildRedirectRules(config.redirects);
      },
      'astro:build:done': async ({ dir, logger }) => {
        const file = fileURLToPath(new URL('_redirects', dir));
        if (existsSync(file)) {
          throw new Error(
            'public/_redirects would be overwritten; define redirects in astro.config.ts.',
          );
        }

        await writeFile(file, `${rules.join('\n')}\n`);
        logger.info(`Wrote ${rules.length} redirect rule(s) to _redirects.`);
      },
    },
  };
}

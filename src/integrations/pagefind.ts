import type { AstroIntegration } from 'astro';
import { close, createIndex, type PagefindServiceConfig } from 'pagefind';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface PagefindIntegrationOptions extends PagefindServiceConfig {
  /** Glob (relative to the build output) of the HTML files to index. */
  includeGlob?: string;
  /** Directory inside the build output that receives the index and the search bundle. */
  outputSubdir?: string;
}

/**
 * Build the Pagefind search index once Astro has written the static site.
 * Any error reported by Pagefind fails the build; a broken search is not an acceptable deploy.
 */
export default function pagefind({
  includeGlob = '**/*.html',
  outputSubdir = 'pagefind',
  ...serviceConfig
}: PagefindIntegrationOptions = {}): AstroIntegration {
  const config: PagefindServiceConfig = {
    forceLanguage: 'en',
    keepIndexUrl: false,
    writePlayground: false,
    ...serviceConfig,
  };

  const assertNoErrors = (step: string, errors: string[]) => {
    if (errors.length > 0) {
      throw new Error(`Pagefind ${step} failed:\n${errors.map(error => `- ${error}`).join('\n')}`);
    }
  };

  return {
    name: 'pagefind',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const outputDir = fileURLToPath(dir);
        logger.info('Building search index…');

        try {
          const { index, errors } = await createIndex(config);
          assertNoErrors('initialization', errors);
          if (!index) throw new Error('Pagefind did not create an index.');

          const indexed = await index.addDirectory({ path: outputDir, glob: includeGlob });
          assertNoErrors('indexing', indexed.errors);

          const written = await index.writeFiles({
            outputPath: path.join(outputDir, outputSubdir),
          });
          assertNoErrors('write', written.errors);

          logger.info(`Indexed ${indexed.page_count} page(s) to /${outputSubdir}/.`);
        } finally {
          await close().catch((error: unknown) => {
            logger.warn(`Could not shut down Pagefind cleanly: ${String(error)}`);
          });
        }
      },
    },
  };
}

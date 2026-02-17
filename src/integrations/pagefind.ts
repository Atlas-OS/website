import type { AstroIntegration } from 'astro';
import { close, createIndex } from 'pagefind';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

interface PagefindIntegrationOptions {
  includeGlob?: string;
  outputSubdir?: string;
  rootSelector?: string;
  excludeSelectors?: string[];
  forceLanguage?: string;
  keepIndexUrl?: boolean;
  failOnError?: boolean;
}

const defaultOptions: Required<PagefindIntegrationOptions> = {
  includeGlob: '**/*.html',
  outputSubdir: 'pagefind',
  rootSelector: 'html',
  excludeSelectors: [],
  forceLanguage: 'en',
  keepIndexUrl: false,
  failOnError: true,
};

function formatErrors(prefix: string, errors: string[]): string {
  return [prefix, ...errors.map(error => `- ${error}`)].join('\n');
}

export default function pagefindIntegration(
  options: PagefindIntegrationOptions = {},
): AstroIntegration {
  const config = { ...defaultOptions, ...options };

  return {
    name: 'pagefind-integration',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const outputDir = fileURLToPath(dir);
        const outputPath = path.join(outputDir, config.outputSubdir);

        logger.info('Building Pagefind search index...');

        try {
          const { index, errors: createErrors } = await createIndex({
            rootSelector: config.rootSelector,
            excludeSelectors: config.excludeSelectors,
            forceLanguage: config.forceLanguage,
            keepIndexUrl: config.keepIndexUrl,
          });

          if (!index) {
            throw new Error('Pagefind index was not created.');
          }

          if (createErrors.length > 0) {
            const message = formatErrors('Pagefind initialization returned errors:', createErrors);
            if (config.failOnError) {
              throw new Error(message);
            }
            logger.warn(message);
          }

          const indexingResult = await index.addDirectory({
            path: outputDir,
            glob: config.includeGlob,
          });

          if (indexingResult.errors.length > 0) {
            const message = formatErrors(
              'Pagefind indexing returned errors:',
              indexingResult.errors,
            );
            if (config.failOnError) {
              throw new Error(message);
            }
            logger.warn(message);
          }

          const writeResult = await index.writeFiles({ outputPath });

          if (writeResult.errors.length > 0) {
            const message = formatErrors(
              'Pagefind write step returned errors:',
              writeResult.errors,
            );
            if (config.failOnError) {
              throw new Error(message);
            }
            logger.warn(message);
          }

          logger.info(
            `Pagefind indexed ${indexingResult.page_count} page(s) to /${config.outputSubdir}/.`,
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (config.failOnError) {
            throw new Error(`Pagefind integration failed: ${message}`, {
              cause: error,
            });
          }
          logger.warn(`Pagefind integration warning: ${message}`);
        } finally {
          await close();
        }
      },
    },
  };
}

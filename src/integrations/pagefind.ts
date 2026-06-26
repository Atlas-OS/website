import type { AstroIntegration } from 'astro';
import { close, createIndex, type PagefindServiceConfig } from 'pagefind';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

interface PagefindIntegrationOptions extends PagefindServiceConfig {
  includeGlob?: string;
  outputSubdir?: string;
  failOnError?: boolean;
}

interface ResolvedPagefindIntegrationOptions extends PagefindIntegrationOptions {
  includeGlob: string;
  outputSubdir: string;
  failOnError: boolean;
  forceLanguage: string;
  keepIndexUrl: boolean;
  writePlayground: boolean;
}

const defaultOptions: Pick<
  ResolvedPagefindIntegrationOptions,
  'includeGlob' | 'outputSubdir' | 'failOnError' | 'forceLanguage' | 'keepIndexUrl' | 'writePlayground'
> = {
  includeGlob: '**/*.{html}',
  outputSubdir: 'pagefind',
  forceLanguage: 'en',
  keepIndexUrl: false,
  writePlayground: false,
  failOnError: true,
};

function formatErrors(prefix: string, errors: string[]): string {
  return [prefix, ...errors.map(error => `- ${error}`)].join('\n');
}

function resolveOptions(options: PagefindIntegrationOptions): ResolvedPagefindIntegrationOptions {
  return {
    ...defaultOptions,
    ...options,
  };
}

function createPagefindConfig(config: ResolvedPagefindIntegrationOptions): PagefindServiceConfig {
  const pagefindConfig: PagefindServiceConfig = {
    forceLanguage: config.forceLanguage,
    keepIndexUrl: config.keepIndexUrl,
    writePlayground: config.writePlayground,
  };

  if (config.rootSelector) pagefindConfig.rootSelector = config.rootSelector;
  if (config.excludeSelectors?.length) pagefindConfig.excludeSelectors = config.excludeSelectors;
  if (config.includeCharacters !== undefined) pagefindConfig.includeCharacters = config.includeCharacters;
  if (config.verbose !== undefined) pagefindConfig.verbose = config.verbose;
  if (config.logfile) pagefindConfig.logfile = config.logfile;

  return pagefindConfig;
}

function handleErrors(
  logger: { warn: (message: string) => void },
  config: ResolvedPagefindIntegrationOptions,
  prefix: string,
  errors: string[],
): void {
  if (errors.length === 0) return;

  const message = formatErrors(prefix, errors);
  if (config.failOnError) {
    throw new Error(message);
  }
  logger.warn(message);
}

export default function pagefindIntegration(
  options: PagefindIntegrationOptions = {},
): AstroIntegration {
  const config = resolveOptions(options);

  return {
    name: 'pagefind-integration',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const outputDir = fileURLToPath(dir);
        const outputPath = path.join(outputDir, config.outputSubdir);
        let primaryError: unknown;
        let pendingError: Error | undefined;

        logger.info('Building Pagefind search index...');

        try {
          const { index, errors: createErrors } = await createIndex(createPagefindConfig(config));

          handleErrors(logger, config, 'Pagefind initialization returned errors:', createErrors);
          if (!index) throw new Error('Pagefind index was not created.');

          const indexingResult = await index.addDirectory({
            path: outputDir,
            glob: config.includeGlob,
          });

          handleErrors(logger, config, 'Pagefind indexing returned errors:', indexingResult.errors);

          const writeResult = await index.writeFiles({ outputPath });

          handleErrors(logger, config, 'Pagefind write step returned errors:', writeResult.errors);

          logger.info(
            `Pagefind indexed ${indexingResult.page_count} page(s) to /${config.outputSubdir}/.`,
          );
        } catch (error) {
          primaryError = error;
          const message = error instanceof Error ? error.message : String(error);
          if (config.failOnError) {
            pendingError = new Error(`Pagefind integration failed: ${message}`, {
              cause: error,
            });
          } else {
            logger.warn(`Pagefind integration warning: ${message}`);
          }
        } finally {
          try {
            await close();
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            if (primaryError || !config.failOnError) {
              logger.warn(`Pagefind close warning: ${message}`);
            } else {
              pendingError = new Error(`Pagefind integration failed while closing: ${message}`, {
                cause: error,
              });
            }
          }
        }

        if (pendingError) throw pendingError;
      },
    },
  };
}

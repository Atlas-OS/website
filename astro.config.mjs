import mdx from '@astrojs/mdx';
import partytown from '@astrojs/partytown';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';
import { defineConfig, fontProviders } from 'astro/config';
import path from 'path';
import { fileURLToPath } from 'url';
import pagefindIntegration from './src/integrations/pagefind';

export default defineConfig({
  site: 'https://atlasos.net',
  output: 'static',
  trailingSlash: 'always',

  fonts: [
    {
      name: 'Inter',
      cssVariable: '--font-sans-source',
      provider: fontProviders.fontsource(),
      weights: [400, 500, 600, 700],
      subsets: ['latin'],
    },
    {
      name: 'Archivo',
      cssVariable: '--font-display-source',
      provider: fontProviders.fontsource(),
      weights: [400, 500, 600, 700],
      subsets: ['latin'],
    },
    {
      name: 'Fira Code',
      cssVariable: '--font-mono-source',
      provider: fontProviders.fontsource(),
      weights: [400, 500, 600, 700],
      subsets: ['latin'],
    },
  ],

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
    routing: {
      prefixDefaultLocale: false,
    },
  },

  build: {
    format: 'directory',
    assets: '_assets',
    inlineStylesheets: 'auto',
  },

  compressHTML: true,

  security: {
    checkOrigin: true,
  },

  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
      config: {
        limitInputPixels: false,
      },
    },
    responsiveStyles: true,
  },

  prefetch: {
    defaultStrategy: 'hover',
    prefetchAll: false,
  },

  integrations: [
    partytown(),
    icon(),
    mdx({
      optimize: true,
    }),
    sitemap({
      changefreq: 'weekly',
      priority: 0.8,
      i18n: {
        defaultLocale: 'en',
        locales: {
          en: 'en-US',
        },
      },
    }),
    pagefindIntegration({
      rootSelector: '[data-pagefind-body], main, article, html',
      excludeSelectors: ['[data-pagefind-ignore]'],
      outputSubdir: 'pagefind',
      failOnError: true,
    }),
  ],

  vite: {
    plugins: [tailwindcss()],
    server: {
      headers: {
        'Content-Security-Policy':
          "default-src * data: blob: 'unsafe-inline' 'unsafe-eval'; frame-ancestors 'none';",
        'X-Frame-Options': 'DENY',
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(path.dirname(fileURLToPath(import.meta.url)), './src'),
      },
    },
    build: {
      minify: 'esbuild',
      cssMinify: 'lightningcss',
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        external: ['/pagefind/pagefind.js'],
        output: {
          assetFileNames: 'assets/[name].[hash][extname]',
          chunkFileNames: 'assets/[name].[hash].js',
          entryFileNames: 'assets/[name].[hash].js',
        },
      },
    },
    esbuild: {
      legalComments: 'none',
      treeShaking: true,
      minifyIdentifiers: true,
      minifySyntax: true,
      minifyWhitespace: true,
    },
  },
});

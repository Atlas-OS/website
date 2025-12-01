import { defineConfig } from 'astro/config';
import partytown from '@astrojs/partytown';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import pagefind from 'astro-pagefind';
import { fileURLToPath } from 'url';
import path from 'path';
import seoValidation from './src/integrations/seo-validation';

export default defineConfig({
  site: 'https://atlasos.net',
  output: 'static',
  trailingSlash: 'always',

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
  },

  compressHTML: true,

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
    seoValidation(),
    pagefind(),
  ],

  vite: {
    plugins: [tailwindcss()],
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

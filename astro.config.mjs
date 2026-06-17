import mdx from '@astrojs/mdx';
import { unified } from '@astrojs/markdown-remark';
import partytown from '@astrojs/partytown';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';
import { defineConfig, fontProviders } from 'astro/config';
import path from 'path';
import { fileURLToPath } from 'url';
import pagefindIntegration from './src/integrations/pagefind';
import rehypeExternalLinks from './src/utils/rehype-external-links.mjs';

export default defineConfig({
  site: 'https://atlasos.net',
  output: 'static',
  trailingSlash: 'always',

  // Add redirects here when docs pages are moved or renamed to avoid broken links.
  // Example: '/old-path/': '/new-path/'
  redirects: {},

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

  build: {
    format: 'directory',
    inlineStylesheets: 'auto',
  },

  compressHTML: true,

  markdown: {
    processor: unified({
      rehypePlugins: [rehypeExternalLinks],
    }),
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
    }),
    pagefindIntegration({
      rootSelector: '[data-pagefind-body]',
      excludeSelectors: ['[data-pagefind-ignore]'],
      outputSubdir: 'pagefind',
      failOnError: true,
    }),
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

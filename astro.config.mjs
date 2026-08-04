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

const tablerIcons = [
  'alert-circle',
  'alert-triangle',
  'arrow-back',
  'arrow-left',
  'arrow-narrow-right',
  'arrow-right',
  'arrow-up',
  'arrow-up-right',
  'book',
  'brand-apple',
  'brand-discord',
  'brand-github',
  'brand-twitch',
  'brand-windows',
  'brand-x',
  'bug',
  'bulb',
  'camera',
  'chart-dots',
  'check',
  'checklist',
  'chevron-down',
  'chevron-right',
  'clock-pause',
  'code',
  'confetti',
  'copy',
  'cpu',
  'database',
  'device-desktop',
  'device-laptop',
  'devices',
  'disc',
  'download',
  'external-link',
  'feather',
  'file-code',
  'file-text',
  'folder',
  'gauge',
  'help-circle',
  'home',
  'info-circle',
  'menu-2',
  'message-report',
  'network',
  'palette',
  'photo',
  'player-play',
  'pointer',
  'question-mark',
  'refresh',
  'refresh-alert',
  'rocket',
  'scale',
  'search',
  'settings',
  'shield',
  'shield-check',
  'shield-lock',
  'sparkles',
  'speakerphone',
  'spy-off',
  'test-pipe',
  'thumb-up',
  'tools',
  'users',
  'world',
  'x',
];

export default defineConfig({
  site: 'https://atlasos.net',
  output: 'static',
  trailingSlash: 'always',

  // Keep older Atlas playbooks, desktop shortcuts, and search results working after the docs restructure.
  redirects: {
    '/getting-started/': '/docs/install/',
    '/getting-started/installation/': '/docs/install/playbook/',
    '/getting-started/post-installation/': '/docs/install/setup/',
    '/getting-started/post-installation/atlas-folder/': '/docs/atlas-configuration/atlas-folder/',
    '/getting-started/post-installation/atlas-folder/configuration/':
      '/docs/atlas-configuration/settings/',
    '/getting-started/post-installation/atlas-folder/general-configuration/':
      '/docs/atlas-configuration/settings/',
    '/getting-started/post-installation/atlas-folder/interface-tweaks/':
      '/docs/atlas-configuration/tweaks/',
    '/getting-started/post-installation/atlas-folder/windows-settings/':
      '/docs/atlas-configuration/windows/',
    '/getting-started/post-installation/atlas-folder/advanced-configuration/':
      '/docs/atlas-configuration/advanced/',
    '/getting-started/post-installation/atlas-folder/security/':
      '/docs/atlas-configuration/security/',
    '/getting-started/post-installation/drivers/getting-started/': '/docs/essential-setup/drivers/',
    '/getting-started/post-installation/software/getting-started/':
      '/docs/essential-setup/software/',
    '/getting-started/post-installation/software/web-browsers/':
      '/docs/essential-setup/software/browsers/',
    '/getting-started/reverting-atlas/': '/docs/faq/reverting/',
    '/general-faq/': '/docs/faq/general/',
    '/general-faq/atlas-and-security/': '/docs/faq/general/#security-and-atlasos',
    '/general-faq/itunes-compatibility/': '/docs/faq/itunes-compatibility/',
    '/general-faq/bluetooth-compatibility/': '/docs/atlas-configuration/settings/#bluetooth',
    '/install-faq/': '/docs/faq/installation/',
    '/install-faq/removed-features/': '/docs/faq/installation/#what-was-removed-from-windows',
    '/contributing/': '/docs/contributing/',
    '/contributing/contribution-guidelines/': '/docs/contributing/',
    '/contributing/playbook/': '/docs/contributing/playbook/',
    '/contributing/docs/': '/docs/contributing/docs/',
    '/contributing/testing/': '/docs/contributing/testing/',
    '/contributing/testing/what-to-test/': '/docs/contributing/testing/',
    '/contributing/reporting/': '/docs/contributing/reporting/',
    '/contributing/toolbox/': '/docs/contributing/toolbox/',
    '/branding/': '/docs/branding/',
  },

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
    icon({
      include: {
        tabler: tablerIcons,
      },
    }),
    mdx({
      optimize: true,
    }),
    sitemap({
      changefreq: 'weekly',
      priority: 0.8,
    }),
    pagefindIntegration({
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

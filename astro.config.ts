import { unified } from '@astrojs/markdown-remark';
import mdx from '@astrojs/mdx';
import partytown from '@astrojs/partytown';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';
import { defineConfig, fontProviders, svgoOptimizer } from 'astro/config';
import pagefind from './src/integrations/pagefind';
import rehypeExternalLinks from './src/utils/rehype-external-links';

// Keep older Atlas playbooks, desktop shortcuts, and search results working after the docs restructure.
const legacyDocsRedirects = {
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
  '/getting-started/post-installation/software/getting-started/': '/docs/essential-setup/software/',
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
};

export default defineConfig({
  site: 'https://atlasos.net',
  trailingSlash: 'always',
  redirects: legacyDocsRedirects,

  fonts: [
    {
      name: 'Inter',
      cssVariable: '--font-sans-source',
      provider: fontProviders.fontsource(),
      weights: [400, 500, 600, 700],
      styles: ['normal'],
      subsets: ['latin'],
      display: 'swap',
    },
    {
      name: 'Archivo',
      cssVariable: '--font-display-source',
      provider: fontProviders.fontsource(),
      weights: [600, 700],
      styles: ['normal', 'italic'],
      subsets: ['latin'],
      display: 'swap',
    },
    {
      name: 'Fira Code',
      cssVariable: '--font-mono-source',
      provider: fontProviders.fontsource(),
      weights: [400, 600],
      styles: ['normal'],
      subsets: ['latin'],
      display: 'swap',
    },
  ],

  build: {
    inlineStylesheets: 'auto',
  },

  markdown: {
    processor: unified({
      rehypePlugins: [rehypeExternalLinks],
    }),
  },

  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
      config: { limitInputPixels: false },
    },
    responsiveStyles: true,
  },

  prefetch: {
    defaultStrategy: 'hover',
  },

  experimental: {
    // JSON schemas for docs frontmatter so editors can validate and autocomplete MDX files.
    contentIntellisense: true,
    svgOptimizer: svgoOptimizer(),
  },

  integrations: [
    partytown(),
    icon(),
    mdx({ optimize: true }),
    sitemap({ changefreq: 'weekly', priority: 0.8 }),
    // Search covers the documentation only; the homepage and legal pages are never indexed.
    pagefind({ includeGlob: 'docs/**/*.html' }),
  ],

  vite: {
    plugins: [tailwindcss()],
    build: {
      cssMinify: 'lightningcss',
      chunkSizeWarningLimit: 1000,
    },
    esbuild: {
      legalComments: 'none',
    },
  },
});

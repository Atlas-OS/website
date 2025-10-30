import { defineConfig } from 'astro/config';
import partytown from '@astrojs/partytown';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';
import { fileURLToPath } from 'url';
import path from 'path';

export default defineConfig({
  site: 'https://atlasos.net',
  output: 'static',
  trailingSlash: 'always',
  
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
  
  integrations: [partytown(), icon()],

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
    },
    css: {
      transformer: 'lightningcss',
    },
  },
});

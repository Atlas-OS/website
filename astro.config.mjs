import { defineConfig } from 'astro/config';
import partytown from '@astrojs/partytown';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';
import { fileURLToPath } from 'url';
import path from 'path';

const jsPreloadLinkPattern =
  /<link\b(?=[^>]*\brel=["'](?:modulepreload|preload)["'])(?=[^>]*(?:\bas=["']script["']|\.js(?:["'?#])))(?![^>]*\bcrossorigin\b)[^>]*>/gi;

function addCrossoriginToJsPreloads(html) {
  return html.replace(jsPreloadLinkPattern, (tag) => {
    const insertAt = tag.endsWith('/>') ? tag.length - 2 : tag.length - 1;
    return `${tag.slice(0, insertAt)} crossorigin="anonymous"${tag.slice(insertAt)}`;
  });
}

function jsPreloadCrossorigin() {
  return {
    name: 'js-preload-crossorigin',
    hooks: {
      'astro:config:setup': ({ updateConfig }) => {
        updateConfig({
          vite: {
            plugins: [
              {
                name: 'vite-js-preload-crossorigin',
                enforce: 'post',
                transformIndexHtml: addCrossoriginToJsPreloads,
              },
            ],
          },
        });
      },
    },
  };
}

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
  
  integrations: [partytown(), icon(), jsPreloadCrossorigin()],

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

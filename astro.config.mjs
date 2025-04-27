import { defineConfig } from 'astro/config';
import partytown from '@astrojs/partytown';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';

export default defineConfig({
  integrations: [partytown(), icon()],

  vite: {
    plugins: [tailwindcss()],
  },
});

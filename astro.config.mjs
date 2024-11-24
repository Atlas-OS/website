import { defineConfig } from 'astro/config';
import icon from 'astro-icon';
import partytown from '@astrojs/partytown';
import compress from 'astro-compress';

import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
  integrations: [icon({
    iconDir: 'src/assets/icons'
  }), partytown(), compress(), tailwind()]
});
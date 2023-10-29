import { defineConfig } from 'astro/config'

import purgecss from 'astro-purgecss'

// https://astro.build/config
export default defineConfig({
    integrations: [
        purgecss({
            fontFace: true,
            keyframes: true,
            safelist: ['random', 'yep', 'button', /^nav-/],
            blocklist: ['usedClass', /^nav-/],
            content: [
                process.cwd() + '/src/**/*.{astro,vue}' // Watching astro and vue sources (for SSR, read the note below)
            ]
        })
    ]
})

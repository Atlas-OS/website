import { defineConfig } from 'astro/config'
import icon from 'astro-icon'
import partytown from '@astrojs/partytown'
import compress from 'astro-compress'

// https://astro.build/config
export default {
    integrations: [
        icon({
            iconDir: 'src/assets/icons'
        }),
        partytown(),
        compress()
    ]
}

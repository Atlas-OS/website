/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		screens: {
			'sm': '500px'
		},
		extend: {
			colors: {
				"modal": "var(--bg-modal-color)"
			},
			keyframes: {
				modalOpen: {
					'0%': { transform: 'scale(0.5)' },
					'50%': { transform: 'scale(1.05)' },
					'100%': { transform: 'scale(1)' },
				}
			},
			animation: {
				modalOpen: 'modalOpen .4s cubic-bezier(0.33, 1, 0.68, 1) 0s 1 normal none running',
			}
		}
	},
	plugins: [],
}

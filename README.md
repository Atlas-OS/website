# AtlasOS Website

This repository contains the source code for [atlasos.net](https://atlasos.net), the official website for AtlasOS, an optimized Windows modification for gaming and performance. The site uses Astro 7, Tailwind CSS 4, and Bun, and deploys to Cloudflare Workers.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Available Scripts](#available-scripts)
- [Deployment](#deployment)
- [Configuration](#configuration)
- [Project Structure](#project-structure)
- [License](#license)

---

## Prerequisites

- Bun ≥ 1.3.0
- Node.js ≥ 22.22.3

## Installation

```bash
bun install
```

Installing also runs `wrangler types`, which generates `worker-configuration.d.ts` (git-ignored) from `wrangler.jsonc` so the Worker's bindings are typed.

## Available Scripts

| Command                  | Description                                                       |
| ------------------------ | ----------------------------------------------------------------- |
| `bun dev`                | Start the development server                                      |
| `bun run build`          | Build the site and the Pagefind search index                      |
| `bun run preview`        | Preview the production build locally                              |
| `bun run check`          | Regenerate Worker types, run `astro check`, type-check the Worker |
| `bun run lint`           | Lint with ESLint                                                  |
| `bun format`             | Format with Prettier                                              |
| `bun run format:check`   | Verify formatting without writing                                 |
| `bun run types`          | Regenerate `worker-configuration.d.ts` from `wrangler.jsonc`      |
| `bun run deploy:dry-run` | Validate the Cloudflare Worker bundle without deploying           |
| `bun run deploy`         | Build and deploy to Cloudflare Workers                            |

## Deployment

The site deploys as a static Astro build served by Cloudflare Workers static assets. The Worker only runs for `/api/*` routes, which power the Windows ISO downloader in the docs.

Required Cloudflare setup:

- `CLOUDFLARE_API_TOKEN` GitHub secret with Workers deploy access
- `CLOUDFLARE_ACCOUNT_ID` GitHub secret
- `BROWSER` Browser Rendering binding in `wrangler.jsonc`
- `MS_ISO_LINKS` KV namespace binding in `wrangler.jsonc`

The deploy workflow runs install, lint, check, build, a Wrangler dry run, then `wrangler deploy`.

## Configuration

| File                    | Purpose                                              |
| ----------------------- | ---------------------------------------------------- |
| `astro.config.ts`       | Astro settings, site URL, redirects, fonts, Pagefind |
| `wrangler.jsonc`        | Cloudflare Workers deployment config and bindings    |
| `tsconfig.json`         | TypeScript config for the site                       |
| `tsconfig.worker.json`  | TypeScript config for the Cloudflare Worker          |
| `src/styles/global.css` | Tailwind theme, design tokens, and global styles     |
| `eslint.config.js`      | ESLint rules for Astro and TypeScript                |
| `.prettierrc`           | Prettier settings and plugins                        |

## Project Structure

### Content

Documentation lives in `src/content/docs/` as MDX. The folder structure defines the URL and the sidebar: `install/iso.mdx` becomes `/docs/install/iso/`, and every folder needs an `index.mdx`. Frontmatter (`title`, `description`, `order`, `sidebar`) is validated by `src/content.config.ts` and drives ordering, labels, and badges.

### Components

Components live in `src/components/` and follow a purpose-based organization:

| Directory   | Contents                                               |
| ----------- | ------------------------------------------------------ |
| `ui/`       | Reusable primitives (Button, Tabs, Spotlight, Video)   |
| `layout/`   | Layout elements (Navbar, Footer, Sidebar)              |
| `sections/` | Homepage sections                                      |
| `docs/`     | Documentation components (Callout, CodeBlock, PageNav) |
| `core/`     | Core functionality (SEO)                               |

### Utilities

`src/utils/` contains the docs navigation model (`docs.ts`), client-side behaviour bound through `page-lifecycle.ts` so it survives View Transitions, and the Cloudflare Worker entry point is `src/worker.ts`.

## License

This project uses the **Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International** (CC BY-NC-ND 4.0) license. See `LICENSE` for details.

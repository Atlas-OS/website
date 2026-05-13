# AtlasOS Website

This repository contains the source code for [atlasos.net](https://atlasos.net), the official website for AtlasOS—an optimized Windows modification for gaming and performance. The site uses Astro 6, Tailwind CSS, and Bun.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Available Scripts](#available-scripts)
- [Configuration](#configuration)
- [License](#license)

---

## Prerequisites

- Bun ≥ 1.3.0
- Node.js ≥ 22.12.0

## Installation

```bash
bun install
```

## Available Scripts

| Command                                                     | Description                                             |
| ----------------------------------------------------------- | ------------------------------------------------------- |
| `bun dev`                                                   | Start the development server                            |
| `bun run build`                                             | Build for production with Astro + Jampack               |
| `bun run build:raw`                                         | Build for production without Jampack optimization       |
| `bun run preview`                                           | Preview the production build locally                    |
| `bun format`                                                | Format code with Prettier                               |
| `bun run lint`                                              | Lint code with ESLint                                   |
| `bun run check`                                             | Run Astro type checking                                 |
| `bun run search:index`                                      | Build the Pagefind search index                         |
| `bunx wrangler deploy --dry-run --outdir .wrangler-dry-run` | Validate the Cloudflare Worker bundle without deploying |

## Deployment

The site deploys as a static Astro build served by Cloudflare Workers static assets. The Worker only runs for `/api/*` routes, including the Microsoft ISO helper.

Required Cloudflare setup:

- `CLOUDFLARE_API_TOKEN` GitHub secret with Workers deploy access
- `CLOUDFLARE_ACCOUNT_ID` GitHub secret
- `BROWSER` Browser Rendering binding in `wrangler.jsonc`
- `MS_ISO_LINKS` KV namespace binding in `wrangler.jsonc`

The deploy workflow runs install, lint, Astro check, production build, Wrangler dry-run validation, then `wrangler deploy`.

## Configuration

| File                    | Purpose                                               |
| ----------------------- | ----------------------------------------------------- |
| `astro.config.mjs`      | Astro settings, site URL, and Pagefind indexing       |
| `jampack.config.js`     | Jampack post-build optimization settings              |
| `wrangler.jsonc`        | Cloudflare Workers deployment config                  |
| `src/styles/global.css` | Tailwind theme and global styles                      |
| `eslint.config.js`      | ESLint rules for Astro and TypeScript                 |
| `.editorconfig`         | Editor settings for consistent formatting             |
| `.gitignore`            | Excludes build output and local development artifacts |

## Project Structure

### Components

Components live in `src/components/` and follow a purpose-based organization:

| Directory   | Contents                                                |
| ----------- | ------------------------------------------------------- |
| `ui/`       | Reusable primitives (Button, Card, Link)                |
| `layout/`   | Layout elements (Navbar, Footer, Sidebar)               |
| `sections/` | Homepage sections                                       |
| `docs/`     | Documentation components (Breadcrumbs, TableOfContents) |
| `core/`     | Core functionality (SEO, LanguageSwitcher)              |

### Utilities

Utilities in `src/utils/` include docs content helpers, navigation helpers, UI initializers, and browser interaction scripts.

### Constants

Site constants live in `src/constants.ts`, organized by domain.

## License

This project uses the **Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International** (CC BY-NC-ND 4.0) license. See `LICENSE` for details.

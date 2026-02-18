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

| Command                      | Description                                      |
| ---------------------------- | ------------------------------------------------ |
| `bun dev`                    | Start the development server                     |
| `bun run build`              | Build for production with optimization           |
| `bun run build:raw`          | Build for production without optimization        |
| `bun run compress:postbuild` | Compress assets in `dist` (`.gz`, `.br`, `.zst`) |
| `bun preview`                | Preview the production build locally             |
| `bun format`                 | Format code with Prettier                        |
| `bun run lint`               | Lint code with ESLint                            |
| `bun run check`              | Run Astro type checking                          |
| `bun run search:index`       | Build the Pagefind search index                  |

## Configuration

| File               | Purpose                                           |
| ------------------ | ------------------------------------------------- |
| `astro.config.mjs` | Astro settings, site URL, and Pagefind indexing   |
| `wrangler.jsonc`   | Cloudflare Workers deployment config             |
| `globals.css`      | Tailwind theme and global styles                  |
| `eslint.config.js` | ESLint rules for Astro and TypeScript             |
| `.editorconfig`    | Editor settings for consistent formatting         |
| `.gitignore`       | Excludes `.jampack/`, build output, and lockfiles |

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

Utilities in `src/utils/`:

- `navigation.ts` — Routing and navigation
- `locale.ts` — Internationalization
- `navbar.ts` — Navbar interactions
- `sidebar.ts` — Sidebar state
- `scroll-animations.ts` — Animation utilities

Import utilities through `src/utils/index.ts`.

### Constants

Site constants live in `src/constants.ts`, organized by domain.

## License

This project uses the **Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International** (CC BY-NC-ND 4.0) license. See `LICENSE` for details.

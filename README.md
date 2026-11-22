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

- Bun ≥ 1.3.0 (CI uses the version pinned in `packageManager`)
- Node.js ≥ 22.23.4

## Installation

```bash
bun install
```

Installing also runs `wrangler types`, which generates `worker-configuration.d.ts` (git-ignored) from `wrangler.jsonc` so the Worker's bindings are typed.

## Available Scripts

| Command                  | Description                                                                 |
| ------------------------ | --------------------------------------------------------------------------- |
| `bun dev`                | Start the development server                                                |
| `bun run build`          | Build the site, the Pagefind search index, and `_redirects`                 |
| `bun run preview`        | Preview the production build locally                                        |
| `bun run check`          | Regenerate Worker types, run `astro check`, type-check the Worker and tests |
| `bun run test`           | Run the unit and Worker tests with Vitest                                   |
| `bun run lint`           | Lint with ESLint (type-aware rules for TypeScript, a11y rules for Astro)    |
| `bun format`             | Format with Prettier                                                        |
| `bun run format:check`   | Verify formatting without writing                                           |
| `bun run types`          | Regenerate `worker-configuration.d.ts` from `wrangler.jsonc`                |
| `bun run deploy:dry-run` | Validate the Cloudflare Worker bundle without deploying                     |
| `bun run deploy`         | Build and deploy to Cloudflare Workers                                      |

## Deployment

The site deploys as a static Astro build served by Cloudflare Workers static assets. Legacy URLs from `redirects` in `astro.config.ts` are written to `_redirects` at build time, so they are real 301s rather than HTML pages.

The Worker handles `/api/ms-iso/skus` and `/api/ms-iso/links` for Microsoft ISO downloads. Atlas Manager currently opens Microsoft's download page in the browser. For `/docs/*`, the Worker serves HTML or Markdown according to the request's `Accept` header. An hourly Cron Trigger refreshes cached links before they expire, and the `Canary` workflow checks the API daily.

Required Cloudflare setup:

- `CLOUDFLARE_API_TOKEN` GitHub secret with Workers deploy access
- `CLOUDFLARE_ACCOUNT_ID` GitHub secret
- `BROWSER` Browser Run binding in `wrangler.jsonc`
- `MS_ISO_LINKS` KV namespace binding in `wrangler.jsonc` (previews use a separate namespace under `previews`)

Pushes deploy through `deploy-workers.yml` after the CI workflow (lint, format, check, test, build, Wrangler dry run) passes. Pull requests from this repository get a Workers Preview, deleted when the pull request closes.

## Configuration

| File                    | Purpose                                              |
| ----------------------- | ---------------------------------------------------- |
| `astro.config.ts`       | Astro settings, site URL, redirects, fonts, Pagefind |
| `wrangler.jsonc`        | Cloudflare Workers deployment config and bindings    |
| `tsconfig.json`         | TypeScript config for the site                       |
| `tsconfig.worker.json`  | TypeScript config for the Cloudflare Worker          |
| `vitest.config.ts`      | Test projects: Worker (workerd) and unit (Node)      |
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
| `ui/`       | Reusable primitives (Button, Tabs, Spotlight)          |
| `layout/`   | Layout elements (Navbar, Footer, Sidebar)              |
| `sections/` | Homepage sections                                      |
| `docs/`     | Documentation components (Callout, CodeBlock, PageNav) |
| `core/`     | Core functionality (SEO)                               |

### Utilities

`src/utils/` contains the docs navigation model (`docs.ts`), client-side behaviour bound through `page-lifecycle.ts` so it survives View Transitions, and the Cloudflare Worker entry point is `src/worker.ts`.

## License

This project uses the **Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International** (CC BY-NC-ND 4.0) license. See `LICENSE` for details.

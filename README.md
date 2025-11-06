# AtlasOS Website

AtlasOS is an optimized modification of Microsoft Windows tailored for gaming and performance. This repo contains the source code for the official website (https://atlasos.net), built with Astro, Tailwind CSS, and Bun.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Available Scripts](#available-scripts)
- [Configuration](#configuration)
- [License](#license)

---

## Prerequisites

- **Bun** ≥ 1.3.0
- **Node.js** ≥ 22.0.0

## Installation

```bash
bun install
```

## Available Scripts

| Command         | Description                          |
| --------------- | ------------------------------------ |
| `bun dev`       | Start local Astro development server |
| `bun run build` | Build production site & run Jampack  |
| `bun preview`   | Preview production build locally     |
| `bun format`    | Format files with Prettier           |
| `bun run lint`  | Lint code with ESLint                |
| `bun run check` | Runs the Astro check command         |

## Configuration

- **Astro config**: `astro.config.mjs` (integrations, `site`)
- **Tailwind config**: `globals.css` (minimal config, theme)
- **ESLint config**: `eslint.config.js` (Astro + TypeScript rules, flat config)
- **EditorConfig**: `.editorconfig` (consistent editor settings)
- **Gitignore**: ignores Jampack cache in `.jampack/`, build output, lockfiles, etc.

## Project Structure

### Component Organization

Components are organized by purpose and usage pattern:

- **`src/components/ui/`** - Reusable UI primitives (Button, Card, Link, etc.)
- **`src/components/layout/`** - Layout-specific components (Navbar, Footer, Sidebar)
- **`src/components/sections/`** - Page sections used on the homepage
- **`src/components/docs/`** - Documentation-specific components (Breadcrumbs, TableOfContents, etc.)
- **`src/components/core/`** - Core functionality components (SEO, LanguageSwitcher)

### Utility Functions

All utility functions are organized in `src/utils/` by domain:

- `navigation.ts` - Navigation and routing utilities
- `locale.ts` - Internationalization utilities
- `navbar.ts` - Navbar interaction logic
- `sidebar.ts` - Sidebar behavior and state management
- `scroll-animations.ts` - Scroll-based animation utilities

Barrel exports are available via `src/utils/index.ts` for cleaner imports.

### Constants

Site-wide constants are centralized in `src/constants.ts` and organized by domain (locale, navigation, site metadata).

## License

This project is licensed under the **Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International** (CC BY-NC-ND 4.0). See the `LICENSE` file for details.

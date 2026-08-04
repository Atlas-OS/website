# AtlasOS Website -- Full Code Audit Report

**Date:** February 25, 2026
**Scope:** Every file under `website/src/`, plus root configuration files
**Files audited:** 80+ files across components, layouts, utilities, styles, pages, and configuration
**Tech stack:** Astro 6 beta, Tailwind CSS v4, MDX content collections, Cloudflare Workers, Pagefind, Satori + Sharp (OG images)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Configuration & Dependencies](#2-configuration--dependencies)
3. [Constants & Shared Data](#3-constants--shared-data)
4. [Cloudflare Worker (worker.ts)](#4-cloudflare-worker-workerts)
5. [Layouts](#5-layouts)
6. [UI Components](#6-ui-components)
7. [Section Components](#7-section-components)
8. [Docs Components](#8-docs-components)
9. [Layout Components](#9-layout-components)
10. [Core Components](#10-core-components)
11. [Utilities](#11-utilities)
12. [Styles](#12-styles)
13. [Pages](#13-pages)
14. [Integrations](#14-integrations)
15. [TODO/FIXME Scan](#15-todofixme-scan)
16. [Security Summary](#16-security-summary)
17. [Accessibility Summary](#17-accessibility-summary)
18. [Top 10 Recommendations](#18-top-10-recommendations)

---

## 1. Executive Summary

The AtlasOS website is a well-structured Astro 6 static site with a Cloudflare Workers backend for Microsoft ISO downloads. The codebase is generally clean, uses TypeScript interfaces for props, and has good reduced-motion support. However, there are several categories of issues that should be addressed:

| Category                  | Count | Severity |
| ------------------------- | ----- | -------- |
| Security                  | 3     | High     |
| Accessibility             | 8     | High     |
| Code Quality (will-break) | 2     | High     |
| Code Quality (cleanup)    | 6     | Medium   |
| Hardcoded Values          | 12+   | Medium   |
| Legal/Compliance          | 1     | High     |
| Beta Dependencies         | 3     | Low      |

**No TODO, FIXME, or HACK comments were found anywhere in the codebase.**

---

## 2. Configuration & Dependencies

### `package.json`

| Issue                                   | Severity | Details                                                                                                                                       |
| --------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Beta dependencies                       | Low      | `astro@^6.0.0-beta.13`, `@astrojs/mdx@^5.0.0-beta.8`, `@astrojs/check@^0.9.7-beta.1` -- these may have breaking changes before stable release |
| `@cloudflare/puppeteer` in dependencies | Low      | Only used by the Cloudflare Worker, not the static site. Could be a devDependency or handled separately                                       |
| Engine requirements                     | Info     | Requires Bun >= 1.3.0 and Node >= 22.12.0                                                                                                     |

### `astro.config.mjs` (108 lines)

| Issue                         | Severity | Details                                                                                     |
| ----------------------------- | -------- | ------------------------------------------------------------------------------------------- |
| `limitInputPixels: false`     | Low      | Disabling Sharp's pixel limit could allow memory exhaustion if processing very large images |
| `chunkSizeWarningLimit: 1000` | Info     | Increased from default 500KB -- intentional but worth noting                                |
| Hardcoded path alias          | Info     | `@` alias resolves to `./src` -- standard pattern, no issue                                 |

### `tsconfig.json` / `eslint.config.js`

No issues found. Standard Astro/TypeScript configuration.

---

## 3. Constants & Shared Data

### `src/constants.ts` (22 lines)

| Issue                                               | Severity | Details                                                                                                                                                                                            |
| --------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ATLAS_VERSION` and `ATLAS_RELEASE_LABEL` hardcoded | Medium   | Version `0.5.0-hotfix` and label `Atlas v0.5.0 (October 21 2025)` are hardcoded. These should ideally be sourced from a single place (e.g., environment variable, or derived from `ATLAS_VERSION`) |
| `ATLAS_RELEASE_LABEL` includes date                 | Medium   | The date "October 21 2025" in the release label is manually maintained and could become stale                                                                                                      |
| `SITE_URL` duplicated                               | Low      | `SITE_URL` is also set in `astro.config.mjs` as `site: 'https://atlasos.net'`. Two sources of truth                                                                                                |

---

## 4. Cloudflare Worker (`worker.ts`)

**362 lines** -- Microsoft ISO download proxy

### Security Issues

| Issue               | Severity | Line(s) | Details                                                                                                               |
| ------------------- | -------- | ------- | --------------------------------------------------------------------------------------------------------------------- |
| **Wildcard CORS**   | **High** | 52      | `'Access-Control-Allow-Origin': '*'` allows any origin to call the API. Should be restricted to `https://atlasos.net` |
| User-Agent spoofing | Medium   | 42-43   | Spoofs Chrome User-Agent to bypass Microsoft's bot detection. While functional, this is fragile and could break       |
| No rate limiting    | Medium   | N/A     | API endpoints have no rate limiting. Malicious actors could abuse the proxy to generate ISO links at scale            |

### Code Quality Issues

| Issue                                     | Severity | Line(s) | Details                                                                                                                       |
| ----------------------------------------- | -------- | ------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Hardcoded Microsoft product IDs           | Medium   | 29-32   | `x64: 3262`, `arm64: 3265` -- these will need updating when Microsoft changes Windows versions                                |
| Hardcoded `MS_PROFILE_ID`                 | Medium   | 23      | `606624d44113` -- undocumented magic string                                                                                   |
| `while` loop without bound                | Medium   | 269-271 | Random dot selection in animate loop (`while (dotsIsLogo[idx])`) has no guard against infinite loop if all dots are logo dots |
| `handleSkus` generates random `sessionId` | Low      | 299     | Falls back to `crypto.randomUUID()` if none provided. This means the session tracking may be unreliable                       |

---

## 5. Layouts

### `BaseLayout.astro` (77 lines)

| Issue                                           | Severity | Line(s) | Details                                                                                                                                  |
| ----------------------------------------------- | -------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Hardcoded Kapa widget ID**                    | **High** | 34      | `data-website-id="d6dd374d-575e-4d3a-9462-00878d18f937"` is hardcoded in the template. Should be in an environment variable or constants |
| Kapa widget loaded on every page                | Medium   | 30-42   | The AI widget script is loaded on all pages including docs, 404, etc. Consider loading it conditionally                                  |
| Third-party script loaded `is:inline` + `async` | Low      | 30      | The Kapa script bypasses Astro's bundling. This is intentional but should be documented                                                  |
| `kapaLogoUrl` hardcoded                         | Low      | 9       | GitHub avatar URL hardcoded in the layout frontmatter                                                                                    |

### `DefaultLayout.astro` (45 lines)

| Issue                       | Severity | Details                                                                         |
| --------------------------- | -------- | ------------------------------------------------------------------------------- |
| `role="main"` on `<main>`   | Low      | The `role="main"` attribute is redundant on a `<main>` element (HTML5 semantic) |
| Hardcoded keywords meta tag | Low      | SEO keywords are hardcoded directly in the layout                               |

### `DocsLayout.astro` (154 lines)

| Issue                        | Severity | Line(s) | Details                                                                                                                                         |
| ---------------------------- | -------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Inline CSS custom properties | Low      | 68      | `style="--docs-header-height: 3.5rem; --docs-sidebar-width: 18rem; --docs-toc-width: 18rem;"` -- these magic numbers should be in the CSS theme |
| `tabindex="-1"` on main      | Info     | 74      | Programmatic focus target. Fine, but should be noted                                                                                            |

---

## 6. UI Components

### `Grid.astro` (46 lines) -- **WILL BREAK**

| Issue                                       | Severity | Line(s) | Details                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------- | -------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dynamic Tailwind classes will be purged** | **High** | 31-34   | Constructs classes like `` `sm:${gridColMap[columns.sm]}` `` which produces strings like `sm:grid-cols-2`. Tailwind v4 scans source files for class literals -- these dynamically-constructed strings will **not** be detected and will be purged from the CSS. Must use a safelist or map to full class strings |

**Fix:** Replace the string interpolation with a complete map:

```typescript
const responsiveMap: Record<string, Record<number, string>> = {
  sm: { 1: 'sm:grid-cols-1', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-4' },
  md: { 1: 'md:grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4' },
  // ...
};
```

### `IconInline.astro` (22 lines) -- **WILL BREAK**

| Issue                                     | Severity | Line(s) | Details                                                                                                                                   |
| ----------------------------------------- | -------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Dynamic Tailwind class will be purged** | **High** | 18      | ``const colorClass = color ? `text-${color}` : ''`` constructs classes like `text-blue-500` dynamically. These will be purged by Tailwind |
| Missing `aria-hidden="true"`              | Medium   | 22      | Inline decorative icons should be hidden from screen readers                                                                              |

### `Card.astro` (58 lines)

| Issue    | Severity | Line(s) | Details                                                                                                                                                      |
| -------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Dead CSS | Medium   | 33-57   | `.card-gradient-hover` and `.card-gradient-hover::before` styles are defined but the class `card-gradient-hover` is never applied in the template. Dead code |

### `Tabs.astro` (122 lines)

| Issue                                   | Severity | Line(s) | Details                                                                                                               |
| --------------------------------------- | -------- | ------- | --------------------------------------------------------------------------------------------------------------------- |
| **Missing `aria-controls`**             | **High** | 15-28   | Tab buttons lack `aria-controls` linking them to their panels                                                         |
| **Missing `aria-labelledby`** on panels | **High** | N/A     | `TabPanel` does not have `aria-labelledby` referencing the tab button                                                 |
| **No keyboard arrow navigation**        | **High** | 67-74   | WAI-ARIA Tabs pattern requires Left/Right arrow keys to move between tabs. Only click handlers are present            |
| `tabindex` not managed                  | Medium   | N/A     | The active tab panel should have `tabindex="0"` for focus management; inactive panels should be hidden from tab order |
| Random ID generation                    | Low      | 8       | `Math.random().toString(36)` for IDs could theoretically collide. Consider using a counter or `crypto.randomUUID()`   |

### `TabPanel.astro` (12 lines)

| Issue                     | Severity | Details                                         |
| ------------------------- | -------- | ----------------------------------------------- |
| Missing `role="tabpanel"` | High     | Panel does not have `role="tabpanel"` attribute |
| Missing `aria-labelledby` | High     | No association with the controlling tab button  |
| Missing `tabindex="0"`    | Medium   | Tab panels should be focusable                  |

### `Video.astro` (34 lines)

| Issue                                 | Severity | Line(s) | Details                                                                                               |
| ------------------------------------- | -------- | ------- | ----------------------------------------------------------------------------------------------------- |
| **No `<track>` support for captions** | **High** | 27-34   | The `<video>` element has no provision for subtitles/captions. This is a WCAG 1.2.2 failure           |
| No `preload` prop flexibility         | Low      | 34      | Always uses `preload="auto"` which downloads the full video. Should offer `preload="metadata"` option |

### `Table.astro` (66 lines)

| Issue                           | Severity | Line(s) | Details                                                                                         |
| ------------------------------- | -------- | ------- | ----------------------------------------------------------------------------------------------- |
| Missing `scope="col"` on `<th>` | Medium   | 17      | Table headers lack `scope` attribute, which helps screen readers understand the table structure |
| No `<caption>` support          | Low      | N/A     | No provision for an accessible table caption                                                    |

### `DownloadModal.astro` (466 lines)

| Issue                     | Severity | Line(s)  | Details                                                                                                                                         |
| ------------------------- | -------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Hardcoded AME Wizard URL  | Medium   | 149      | `https://download.ameliorated.io/AME%20Beta.zip` is hardcoded in the template                                                                   |
| Hardcoded CDN URL pattern | Medium   | 368      | `` `https://cdn.jsdelivr.net/atlas/${ATLAS_VERSION}/AtlasPlaybook_v${ATLAS_VERSION}.zip` `` -- CDN base URL should be a constant                |
| Custom event `showModal`  | Low      | 225      | Uses `CustomEvent('showModal')` on `document` -- a global event name that could conflict. Consider namespacing: `atlas:showModal`               |
| `innerHTML` assignment    | Low      | 367, 383 | `this.buttons.playbook.innerHTML = originalContent` -- using innerHTML with content that originated from the DOM is safe here, but worth noting |

### `Spotlight.astro` (586 lines)

| Issue                            | Severity | Line(s) | Details                                                                                                                                       |
| -------------------------------- | -------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Excessive `!important` in styles | Medium   | 89-239  | The `is:global` style block uses `!important` on nearly every property. This suggests specificity issues that should be resolved structurally |
| Hardcoded SVG strings in script  | Low      | 432-434 | `PAGE_ICON_SVG` and `ARROW_ICON_SVG` are inline SVG strings in JS. Could be extracted                                                         |
| `label` placed after `input`     | Low      | 38      | The `<label for="spotlight-input">` comes after the `<input>`, though it has `class="sr-only"`. Semantically fine but unconventional          |
| Module-level state               | Info     | 286-289 | `pagefind`, `selectedIndex`, `searchDebounceTimer`, `currentQuery` are module-level variables. Not shared state, but worth noting             |

### `Image.astro` (55 lines)

| Issue                           | Severity | Details                                                                                         |
| ------------------------------- | -------- | ----------------------------------------------------------------------------------------------- |
| No validation for external URLs | Low      | When `src` is a string (external URL), no validation is performed. Could receive malformed URLs |

### `Picture.astro` (49 lines)

No significant issues. Clean wrapper around Astro's built-in `Picture`.

### Other UI Components (no significant issues)

The following UI components were audited and found to be clean:

- `Button.astro` -- Well-typed props, good icon support
- `Link.astro` -- Proper external link handling
- `NavLink.astro` -- Clean active state logic
- `Badge.astro` -- Simple, well-typed
- `Heading.astro` -- Dynamic heading level
- `Text.astro` -- Simple text wrapper
- `SoftwareCard.astro` -- Clean card component
- `BrandAssetCard.astro` -- Clean card component
- `TableRow.astro` / `TableCell.astro` -- Simple table helpers
- `SocialIconLink.astro` -- Good `aria-label` usage
- `SearchButton.astro` -- Clean implementation
- `LinkCard.astro` -- Clean card component
- `IconButton.astro` -- Good ARIA attributes
- `SectionDivider.astro` -- Simple decorative divider
- `IconArrow.astro` -- Simple icon wrapper
- `WallpaperPreview.astro` -- Clean implementation
- `BannerPreview.astro` -- Clean implementation
- `FeatureList.astro` -- Clean list component

---

## 7. Section Components

### `Hero.astro` (621 lines)

| Issue                                 | Severity | Line(s) | Details                                                                                                                               |
| ------------------------------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Fallback download count hardcoded     | Medium   | 464     | `countElement.textContent = '2,000,000'` as error fallback -- this number will become stale                                           |
| 20 decorative star spans              | Low      | 28-47   | 20 identical `<span class="star">` elements with individual CSS rules. Could be generated programmatically or use a CSS-only approach |
| Heavy inline `<script>`               | Low      | 440-620 | ~180 lines of wallpaper animation logic. Consider extracting to a utility file                                                        |
| `data-download-bound` attribute check | Info     | 472     | Prevents double-binding, which is good                                                                                                |

### `Benchmarks.astro` (79 lines)

| Issue                           | Severity | Line(s) | Details                                                                                                                    |
| ------------------------------- | -------- | ------- | -------------------------------------------------------------------------------------------------------------------------- |
| All benchmark numbers hardcoded | Medium   | 42-76   | CPU "2-10% -> 0%", RAM "2.9 GB -> ~1.4 GB", FPS "217.5 -> 365.91" are all hardcoded. Should be in a data file or constants |
| Hardware specs hardcoded        | Low      | 71      | "Ryzen 7 5800X3D, 16GB 3600MHz, RTX 2070 Super"                                                                            |

### `Reviews.astro` (80 lines)

| Issue                       | Severity | Line(s) | Details                                                                      |
| --------------------------- | -------- | ------- | ---------------------------------------------------------------------------- |
| **Review count hardcoded**  | Medium   | 55      | `"Reviews 184 - Excellent"` will become stale as more reviews come in        |
| Review images not described | Low      | 36-47   | `alt="Atlas review"` is vague -- should describe what the review image shows |

### `JoinCommunity.astro` (27 lines)

| Issue                       | Severity | Line(s) | Details                                    |
| --------------------------- | -------- | ------- | ------------------------------------------ |
| Member count hardcoded      | Medium   | 14      | "over 50,000 members" -- will become stale |
| "millions of AtlasOS users" | Low      | 14      | Vague claim that could be more specific    |

### Other Section Components (no significant issues)

- `Features.astro` -- Clean
- `WhyAtlas.astro` -- Clean
- `FAQ.astro` -- Clean, good structured data support
- `OpenSource.astro` -- Clean
- `LinusTechTips.astro` -- Uses slideshow utility, clean
- `ProTestimonials.astro` -- Clean
- `SectionTitle.astro` -- Simple utility component
- `SectionSeparator.astro` -- Simple decorative component

---

## 8. Docs Components

### `WindowsIsoDownload.astro` -- **759 lines**

| Issue                 | Severity | Details                                                                                                                                                                                                                     |
| --------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File is too large** | Medium   | At 759 lines, this single component handles UI rendering, state management, API calls, error handling, and step-by-step wizard flow. Should be split into smaller components (step components, API layer, state management) |
| Hardcoded API path    | Low      | Uses `/api/ms-iso/skus` and `/api/ms-iso/links` directly                                                                                                                                                                    |

### `WindowsSetupTabs.astro`

No significant issues. Clean tabs wrapper.

### `TableOfContents.astro`

| Issue                      | Severity | Details                                                                                    |
| -------------------------- | -------- | ------------------------------------------------------------------------------------------ |
| DOM manipulation in script | Info     | Uses vanilla JS for scroll spy and active heading tracking. This is a common Astro pattern |

### `PageNav.astro`

No significant issues. Clean previous/next navigation.

### `Breadcrumbs.astro`

No significant issues. Good structured data (BreadcrumbList schema).

### `Callout.astro`

No significant issues. Clean variant-based styling.

### `CodeBlock.astro`

No significant issues. Good syntax highlighting wrapper.

### `CodeInline.astro`

No significant issues. Simple inline code wrapper.

### `Details.astro`

No significant issues. Clean collapsible section.

### `Term.astro`

No significant issues. Simple term/definition wrapper.

### `DirectoryTree.astro`

No significant issues. Clean tree rendering.

### `QuickLinkCard.astro` / `QuickLinksGrid.astro`

No significant issues. Clean card grid layout.

### `CommunityLink.astro`

No significant issues. External link with proper attributes.

### `AtlasFolderRestoreLink.astro`

No significant issues. Specialized link component.

---

## 9. Layout Components

### `Footer.astro` (370 lines)

| Issue                                                 | Severity | Line(s) | Details                                                                                                                                                                                              |
| ----------------------------------------------------- | -------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **260-line inline `is:inline` canvas script**         | Medium   | 74-336  | The entire dot-pattern animation (canvas setup, logo rendering, mouse interaction, animation loop) is an inline script that cannot be tree-shaken or bundled. Should be extracted to a separate file |
| Infinite `while` loop risk                            | Medium   | 269-271 | `while (dotsIsLogo[idx])` loops randomly looking for a non-logo dot. If all dots were logo dots (unlikely but possible at small canvas sizes), this would hang the browser                           |
| Hardcoded colors                                      | Low      | 90-91   | `activeColor = '#3b82f6'` and `inactiveColor = 'rgba(68, 68, 68, 0.3)'` should reference CSS custom properties                                                                                       |
| `handleSectionMouseMove` duplicates `handleMouseMove` | Low      | 294-299 | The two handlers are functionally identical                                                                                                                                                          |
| External links missing `aria-hidden` on icons         | Low      | 47-65   | Social media icons inside links should have `aria-hidden="true"` (the `<span class="sr-only">` provides the accessible label, which is good)                                                         |

### `Navbar.astro` (166 lines)

| Issue                                        | Severity | Line(s) | Details                                                                                                                                                |
| -------------------------------------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Hardcoded oklch colors in `style` attributes | Medium   | 48, 135 | `style="background-color: oklch(0.12 0.0421 264.82);"` and `oklch(0.12 0.0421 264.82 / 0.9)` -- should use CSS custom properties (`var(--bg-primary)`) |
| Navigation items hardcoded                   | Low      | 32-37   | `mainNavItems` array is hardcoded in the component rather than passed as props or imported from a data file                                            |

### `Sidebar.astro` (223 lines)

| Issue                        | Severity | Line(s) | Details                                                                               |
| ---------------------------- | -------- | ------- | ------------------------------------------------------------------------------------- |
| Hardcoded oklch color        | Low      | 52      | `style="background-color: oklch(0.1 0.04 265);"` -- should use a CSS variable         |
| Complex inline ternary logic | Low      | 72-88   | Dense conditional class application. Readable but could benefit from helper functions |

---

## 10. Core Components

### `SEO.astro` (177 lines)

| Issue                                | Severity | Line(s) | Details                                                                                                                                                    |
| ------------------------------------ | -------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `og:site_name` hardcoded             | Low      | 131     | `"AtlasOS Documentation"` -- should be "AtlasOS" for non-docs pages                                                                                        |
| Duplicate `defaultimg.png` reference | Low      | 38      | `ogImage` falls back to `` `${siteBase}/defaultimg.png` `` which is also defined in constants as `DEFAULT_OG_IMAGE`. Uses siteBase instead of the constant |
| Multiple structured data blocks      | Info     | 153-176 | Emits up to 5 separate `<script type="application/ld+json">` blocks. While valid, these could be combined into a single `@graph`                           |

---

## 11. Utilities

### `utils/ui/navbar.ts` (104 lines)

| Issue                           | Severity | Details                                                                           |
| ------------------------------- | -------- | --------------------------------------------------------------------------------- |
| Event listener tracking pattern | Info     | Good pattern -- tracks and cleans up event listeners on re-init. Well-implemented |

### `utils/ui/sidebar.ts` (211 lines)

| Issue                         | Severity | Details                                                                        |
| ----------------------------- | -------- | ------------------------------------------------------------------------------ |
| `AbortController` for cleanup | Good     | Uses modern `AbortController` signal for cleanup. Well-implemented             |
| `sessionStorage` usage        | Info     | Stores scroll position and expanded items in `sessionStorage`. Good UX pattern |

### `utils/scroll-animations.ts` (48 lines)

No issues. Clean IntersectionObserver-based reveal animation with good reduced-motion support.

### `utils/copy-code.ts` (48 lines)

| Issue                                 | Severity | Line(s) | Details                                                                                                                                                     |
| ------------------------------------- | -------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No fallback for `navigator.clipboard` | Low      | 34      | `navigator.clipboard.writeText()` can fail in insecure contexts (HTTP). The catch handler only updates the label, doesn't provide a fallback copy mechanism |

### `utils/slideshow.ts` (193 lines)

| Issue                                    | Severity | Details                                                                                |
| ---------------------------------------- | -------- | -------------------------------------------------------------------------------------- |
| `initSlideshow()` called at module level | Info     | Line 193 -- called immediately on import. This is fine for Astro's client-side scripts |
| Good touch/swipe support                 | Good     | Well-implemented touch event handling                                                  |

### `utils/navigation/` (5 files)

No significant issues. Clean navigation tree builder with proper typing. `index.ts` re-exports cleanly.

---

## 12. Styles

### `global.css` (255 lines)

| Issue                                     | Severity | Line(s) | Details                                                                                                                                      |
| ----------------------------------------- | -------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `[data-animate-delay]` selectors up to 10 | Low      | 217-254 | 10 separate rules for animation delay. Could use a CSS `@property` or a single rule with `calc()` and `attr()` when browser support improves |
| Global `a, button` hover opacity          | Low      | 65-76   | Applies `opacity: 0.8` on hover to ALL links and buttons globally. This can cause unintended effects on custom components                    |

### `docs.css` (13 lines)

No issues. Two clean utility classes.

### `prose.css` (282 lines)

| Issue                               | Severity | Details                                                                                    |
| ----------------------------------- | -------- | ------------------------------------------------------------------------------------------ |
| Hardcoded oklch in `pre` background | Low      | Line 192: `background-color: oklch(0.11 0.04 265) !important` -- should use a CSS variable |
| Multiple `!important`               | Low      | Lines 23, 43, 192 -- specificity overrides suggest conflicting styles                      |

### `navbar.css` / `sidebar.css`

No significant issues. Clean CSS for layout components.

---

## 13. Pages

### `index.astro` (67 lines)

No significant issues. Clean composition of section components.

### `about.astro` (20 lines)

| Issue           | Severity | Details                                                                    |
| --------------- | -------- | -------------------------------------------------------------------------- |
| Minimal content | Info     | Very short placeholder-like page. May want to expand                       |
| No custom SEO   | Low      | Uses `DefaultLayout` defaults. Should have page-specific title/description |

### `contact.astro` (23 lines)

| Issue           | Severity | Details                                                                    |
| --------------- | -------- | -------------------------------------------------------------------------- |
| No custom SEO   | Low      | Uses `DefaultLayout` defaults. Should have page-specific title/description |
| No contact form | Info     | Only lists channels (email, Discord, GitHub). May want a form              |

### `privacy-policy.astro` (21 lines) -- **LEGALLY INADEQUATE**

| Issue                          | Severity | Details                                                                                                                                                                                                                                                                                                   |
| ------------------------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Placeholder privacy policy** | **High** | The page contains only 3 vague sentences. It does not cover: data collected, cookies, third-party services (Plausible analytics, Kapa AI, Cloudflare, Microsoft API proxy), data retention, user rights (GDPR/CCPA), or legal basis for processing. This is not legally adequate for a production website |

### `404.astro` (46 lines)

No significant issues. Good SEO (noindex, nofollow). Clean error page with navigation options.

### `docs/index.astro` / `docs/[...slug].astro` / `docs/[...slug]/og-image.png.ts`

No significant issues in the docs page setup. OG image generation is well-implemented with Satori + Sharp.

---

## 14. Integrations

### `integrations/pagefind.ts` (110 lines)

No issues. Well-implemented Pagefind build integration with proper error handling and configurable options.

---

## 15. TODO/FIXME Scan

**Result: NONE FOUND**

A comprehensive search for `TODO`, `FIXME`, `HACK`, `XXX`, `TEMP`, and `WORKAROUND` across all source files returned zero results. The codebase is clean of development annotations.

---

## 16. Security Summary

| #   | Issue                                                | File                  | Severity | Impact                                                                                                                   |
| --- | ---------------------------------------------------- | --------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------ |
| S1  | **Wildcard CORS** (`Access-Control-Allow-Origin: *`) | `worker.ts:52`        | **High** | Any website can call the Microsoft ISO proxy API, potentially abusing it for rate limiting or to generate download links |
| S2  | **Hardcoded third-party widget ID**                  | `BaseLayout.astro:34` | **High** | Kapa AI widget ID `d6dd374d-575e-4d3a-9462-00878d18f937` is exposed in source. Should be in env variable                 |
| S3  | **No rate limiting on API**                          | `worker.ts`           | Medium   | `/api/ms-iso/skus` and `/api/ms-iso/links` have no throttling. Browser Rendering is expensive and could be abused        |
| S4  | User-Agent spoofing fragile                          | `worker.ts:42-43`     | Low      | Hardcoded Chrome UA string will eventually become outdated                                                               |

---

## 17. Accessibility Summary

| #   | Issue                                                 | Component                          | WCAG         | Severity |
| --- | ----------------------------------------------------- | ---------------------------------- | ------------ | -------- |
| A1  | **Tabs missing WAI-ARIA pattern**                     | `Tabs.astro` + `TabPanel.astro`    | 4.1.2, 2.1.1 | **High** |
| A2  | **No keyboard arrow navigation in tabs**              | `Tabs.astro`                       | 2.1.1        | **High** |
| A3  | **Video missing captions**                            | `Video.astro`                      | 1.2.2        | **High** |
| A4  | **TabPanel missing `role="tabpanel"`**                | `TabPanel.astro`                   | 4.1.2        | **High** |
| A5  | Table headers missing `scope`                         | `Table.astro`                      | 1.3.1        | Medium   |
| A6  | Decorative icons missing `aria-hidden`                | `IconInline.astro`, `Footer.astro` | 1.1.1        | Medium   |
| A7  | Redundant `role="main"`                               | `DefaultLayout.astro`, `404.astro` | N/A          | Low      |
| A8  | `og:site_name` says "Documentation" on non-docs pages | `SEO.astro`                        | N/A          | Low      |

---

## 18. Top 10 Recommendations

Listed in order of priority:

### 1. Fix dynamic Tailwind classes (HIGH -- will break)

**Files:** `Grid.astro`, `IconInline.astro`
**Action:** Replace dynamic class construction with static class maps to prevent Tailwind CSS purging. These classes are likely already broken in production.

### 2. Restrict CORS in worker (HIGH -- security)

**File:** `worker.ts`
**Action:** Change `Access-Control-Allow-Origin: *` to `Access-Control-Allow-Origin: https://atlasos.net` (and staging domains if applicable).

### 3. Implement WAI-ARIA Tabs pattern (HIGH -- accessibility)

**Files:** `Tabs.astro`, `TabPanel.astro`
**Action:** Add `aria-controls`, `aria-labelledby`, `role="tabpanel"`, `tabindex`, and keyboard arrow navigation per [WAI-ARIA Tabs Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/).

### 4. Write a real privacy policy (HIGH -- legal)

**File:** `privacy-policy.astro`
**Action:** Create a comprehensive privacy policy covering: Plausible analytics, Kapa AI widget, Cloudflare hosting, Microsoft ISO proxy, cookies, data retention, GDPR/CCPA rights, and contact information.

### 5. Add video caption support (HIGH -- accessibility)

**File:** `Video.astro`
**Action:** Add optional `tracks` prop for `<track>` elements (captions, subtitles). Even if not all videos have captions immediately, the component should support them.

### 6. Move hardcoded Kapa widget ID to environment variable (MEDIUM -- security)

**File:** `BaseLayout.astro`
**Action:** Use `import.meta.env.PUBLIC_KAPA_WIDGET_ID` instead of hardcoding the widget ID.

### 7. Extract Footer canvas animation (MEDIUM -- code quality)

**File:** `Footer.astro`
**Action:** Move the 260-line `is:inline` canvas script to a separate file. Fix the unbounded `while` loop. Use CSS custom property references instead of hardcoded colors.

### 8. Centralize hardcoded values (MEDIUM -- maintainability)

**Files:** `Benchmarks.astro`, `Reviews.astro`, `JoinCommunity.astro`, `Hero.astro`, `DownloadModal.astro`, `Navbar.astro`, `Sidebar.astro`
**Action:** Move benchmark numbers, review counts, member counts, CDN URLs, and oklch color values into constants or data files. Create a central `data/` directory for marketing content.

### 9. Remove dead CSS from Card.astro (LOW -- cleanup)

**File:** `Card.astro`
**Action:** Remove the `.card-gradient-hover` CSS rules (lines 33-57) that are never used.

### 10. Add `scope="col"` to table headers (LOW -- accessibility)

**File:** `Table.astro`
**Action:** Add `scope="col"` to `<th>` elements in the `<thead>`.

---

## Appendix: Files Inventory

### Configuration (root)

- `package.json` (73 lines)
- `astro.config.mjs` (108 lines)
- `tsconfig.json`
- `eslint.config.js`

### Source -- Core

- `src/constants.ts` (22 lines)
- `src/content.config.ts` (66 lines)
- `src/worker.ts` (362 lines)

### Source -- Layouts (3 files)

- `src/layouts/BaseLayout.astro` (77 lines)
- `src/layouts/DefaultLayout.astro` (45 lines)
- `src/layouts/DocsLayout.astro` (154 lines)

### Source -- Components (61 files)

**UI (30 files):**
Badge, BannerPreview, BrandAssetCard, Button, Card, DownloadModal, FeatureList, Grid, Heading, IconArrow, IconButton, IconInline, Image, Link, LinkCard, NavLink, Picture, SearchButton, SectionDivider, SocialIconLink, SoftwareCard, Spotlight, Table, TableCell, TableRow, TabPanel, Tabs, Text, Video, WallpaperPreview

**Sections (12 files):**
Benchmarks, FAQ, Features, Hero, JoinCommunity, LinusTechTips, OpenSource, ProTestimonials, Reviews, WhyAtlas, common/SectionSeparator, common/SectionTitle

**Docs (15 files):**
AtlasFolderRestoreLink, Breadcrumbs, Callout, CodeBlock, CodeInline, CommunityLink, Details, DirectoryTree, PageNav, QuickLinkCard, QuickLinksGrid, TableOfContents, Term, install/WindowsIsoDownload, install/WindowsSetupTabs

**Layout (3 files):**
Footer, Navbar, Sidebar

**Core (1 file):**
SEO

### Source -- Utilities (12 files)

- `src/utils/ui/navbar.ts` (104 lines)
- `src/utils/ui/sidebar.ts` (211 lines)
- `src/utils/ui/index.ts`
- `src/utils/navigation/index.ts`
- `src/utils/navigation/types.ts`
- `src/utils/navigation/slugs.ts`
- `src/utils/navigation/tree-builder.ts`
- `src/utils/navigation/sidebar.ts`
- `src/utils/navigation/pagination.ts`
- `src/utils/scroll-animations.ts` (48 lines)
- `src/utils/copy-code.ts` (48 lines)
- `src/utils/slideshow.ts` (193 lines)

### Source -- Styles (5 files)

- `src/styles/global.css` (255 lines)
- `src/styles/docs.css` (13 lines)
- `src/styles/prose.css` (282 lines)
- `src/styles/navbar.css`
- `src/styles/sidebar.css`

### Source -- Pages (8 files)

- `src/pages/index.astro` (67 lines)
- `src/pages/404.astro` (46 lines)
- `src/pages/about.astro` (20 lines)
- `src/pages/contact.astro` (23 lines)
- `src/pages/privacy-policy.astro` (21 lines)
- `src/pages/docs/index.astro`
- `src/pages/docs/[...slug].astro`
- `src/pages/docs/[...slug]/og-image.png.ts`

### Source -- Integrations (1 file)

- `src/integrations/pagefind.ts` (110 lines)

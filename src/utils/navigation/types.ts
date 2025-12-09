import type { CollectionEntry } from 'astro:content';

/**
 * A single navigation item representing a page in the documentation.
 */
export interface NavItem {
  /** Display title for the navigation item */
  title: string;
  /** URL slug for the page (e.g., "/docs/install/") */
  slug: string;
  /** Child navigation items for nested sections */
  children?: NavItem[];
  /** Sort order - lower numbers appear first */
  order?: number;
}

/**
 * A section in the navigation tree containing multiple items.
 * Used for grouping related documentation pages.
 */
export interface SectionNavItem {
  /** Display title for the section header */
  sectionTitle: string;
  /** URL slug for the section index page */
  sectionSlug: string;
  /** Navigation items within this section */
  items: NavItem[];
  /** Sort order - lower numbers appear first */
  order?: number;
}

/**
 * A documentation entry from the Astro content collection.
 */
export type DocsEntry = CollectionEntry<'docs'>;

/**
 * Options for building navigation trees.
 */
export interface BuildNavigationOptions {
  /**
   * Scope of the navigation tree to build.
   * - 'full': Build the entire navigation tree with all sections
   * - 'section': Build navigation for a specific section only
   */
  scope: 'full' | 'section';
  /** Section name when scope is 'section' */
  section?: string | null;
  /** Locale code for filtering entries (e.g., 'en', 'fr') */
  locale?: string | null;
  /** Default locale code */
  defaultLocale?: string;
}

/**
 * Result from prev/next page lookup.
 */
export interface PageNavLink {
  /** URL to the page */
  href: string;
  /** Page title */
  title: string;
  /** Optional page description */
  description?: string;
}

/**
 * Prev/next navigation result.
 */
export interface PrevNextPages {
  prev: PageNavLink | null;
  next: PageNavLink | null;
}

/**
 * Navigation utilities for the AtlasOS documentation site.
 *
 * This module provides all navigation-related functionality including:
 * - Slug manipulation and normalization
 * - Locale detection and handling
 * - Navigation tree building
 * - Prev/next page navigation
 * - Sidebar utilities
 *
 * @example
 * import {
 *   buildNavigationTree,
 *   getPrevNextPages,
 *   normalizeSlug,
 *   isActivePage
 * } from '@/utils/navigation';
 *
 * // Build full navigation
 * const tree = buildNavigationTree(entries, { scope: 'full' });
 *
 * // Get prev/next for current page
 * const { prev, next } = getPrevNextPages(entries, currentSlug);
 *
 * @module navigation
 */

// Types
export type {
  NavItem,
  SectionNavItem,
  DocsEntry,
  BuildNavigationOptions,
  PageNavLink,
  PrevNextPages,
} from './types';

// Slug utilities
export {
  normalizeSlug,
  addDocsPrefix,
  removeDocsPrefix,
  getSlugFromId,
  getLocaleFromId,
  getLocaleFromSlug,
  getSectionFromSlug,
  isActivePage,
  normalizeSlugForDisplay,
  clearSlugCache,
} from './slugs';

// Locale utilities
export { getCurrentLocale, getLangCode, isDefaultLocale, getLocalePrefix } from './locale';

// Tree building
export { buildNavigationTree, getPageTitle } from './tree-builder';

// Pagination
export { getPrevNextPages } from './pagination';

// Sidebar utilities
export {
  sortSectionsByPriority,
  normalizeNavItemsForDisplay,
  filterDuplicateItems,
  prepareSidebarNavigation,
  shouldSkipItem,
} from './sidebar';

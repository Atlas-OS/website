import type { DocsEntry, NavItem, SectionNavItem, PrevNextPages } from './types';
import { buildNavigationTree } from './tree-builder';
import { normalizeSlug, getSlugFromId } from './slugs';
import { sortSectionsByPriority } from './sidebar';
import { DEFAULT_LOCALE } from '@/constants';

/**
 * Flatten a navigation tree into a linear list of pages.
 * Used for determining prev/next navigation.
 *
 * @param navTree - The navigation tree to flatten
 * @returns Flat array of nav items in order
 */
function flattenNavigationTree(navTree: SectionNavItem[]): NavItem[] {
  let totalSize = 0;
  for (const section of navTree) {
    for (const item of section.items) {
      totalSize++;
      if (item.children) {
        totalSize += item.children.length;
      }
    }
  }

  const flattened: NavItem[] = new Array(totalSize);
  let index = 0;

  for (const section of navTree) {
    for (const item of section.items) {
      flattened[index++] = {
        title: item.title,
        slug: item.slug,
        order: item.order,
      };

      if (item.children) {
        for (const child of item.children) {
          flattened[index++] = {
            title: child.title,
            slug: child.slug,
            order: child.order,
          };
        }
      }
    }
  }

  return flattened;
}

/**
 * Get the previous and next pages for navigation.
 *
 * @param entries - All documentation entries
 * @param currentSlug - Current page slug
 * @param locale - Current locale
 * @param defaultLocale - Default locale code
 * @returns Object with prev and next page links
 *
 * @example
 * const { prev, next } = getPrevNextPages(entries, '/docs/install/');
 * // prev: { href: '/docs/', title: 'Home' }
 * // next: { href: '/docs/install/requirements/', title: 'Requirements' }
 */
export function getPrevNextPages(
  entries: DocsEntry[],
  currentSlug: string,
  locale: string | null = null,
  defaultLocale: string = DEFAULT_LOCALE,
): PrevNextPages {
  // Build full navigation tree
  const navTree = buildNavigationTree(entries, {
    scope: 'full',
    locale,
    defaultLocale,
  }) as SectionNavItem[];

  // Sort by section priorities
  const sortedTree = sortSectionsByPriority(navTree);

  // Flatten for linear navigation
  const flattened = flattenNavigationTree(sortedTree);

  if (flattened.length === 0) {
    return { prev: null, next: null };
  }

  // Find current page index
  const normalizedCurrent = normalizeSlug(currentSlug, defaultLocale);

  let currentIndex = -1;
  for (let i = 0; i < flattened.length; i++) {
    if (normalizeSlug(flattened[i]?.slug ?? '', defaultLocale) === normalizedCurrent) {
      currentIndex = i;
      break;
    }
  }

  if (currentIndex === -1) {
    return { prev: null, next: null };
  }

  const prevItem = currentIndex > 0 ? flattened[currentIndex - 1] : null;
  const nextItem = currentIndex < flattened.length - 1 ? flattened[currentIndex + 1] : null;

  // Build entry slug map for descriptions
  const entrySlugMap = new Map<string, DocsEntry>();
  for (const e of entries) {
    const slug = normalizeSlug(getSlugFromId(e.id, defaultLocale), defaultLocale);
    if (!entrySlugMap.has(slug)) {
      entrySlugMap.set(slug, e);
    }
  }

  const getDescription = (slug: string): string | undefined => {
    const normalized = normalizeSlug(slug, defaultLocale);
    const entry = entrySlugMap.get(normalized);
    return entry?.data.description;
  };

  return {
    prev: prevItem
      ? {
          href: prevItem.slug,
          title: prevItem.title,
          description: getDescription(prevItem.slug),
        }
      : null,
    next: nextItem
      ? {
          href: nextItem.slug,
          title: nextItem.title,
          description: getDescription(nextItem.slug),
        }
      : null,
  };
}

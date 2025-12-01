import type { SectionNavItem, NavItem } from './types';
import { normalizeSlug, normalizeSlugForDisplay } from './slugs';
import { SECTION_PRIORITIES, DEFAULT_LOCALE } from '@/constants';

/**
 * Sort sections by priority defined in SECTION_PRIORITIES.
 * Home (/docs/) always comes first, then sections are sorted by priority.
 *
 * @param sections - Array of section nav items
 * @returns Sorted array of section nav items
 */
export function sortSectionsByPriority(sections: SectionNavItem[]): SectionNavItem[] {
  return [...sections].sort((a, b) => {
    // Home always first
    if (
      a.sectionSlug === '/docs/' ||
      normalizeSlug(a.sectionSlug) === '/docs/' ||
      normalizeSlug(a.sectionSlug) === '/'
    )
      return -1;
    if (
      b.sectionSlug === '/docs/' ||
      normalizeSlug(b.sectionSlug) === '/docs/' ||
      normalizeSlug(b.sectionSlug) === '/'
    )
      return 1;

    const aSlug =
      normalizeSlug(a.sectionSlug)
        .replace(/^\/docs\//, '')
        .replace(/^\/+/, '') || '';
    const bSlug =
      normalizeSlug(b.sectionSlug)
        .replace(/^\/docs\//, '')
        .replace(/^\/+/, '') || '';

    const aName = aSlug || 'home';
    const bName = bSlug || 'home';

    const aPriority = SECTION_PRIORITIES[aName] ?? 999;
    const bPriority = SECTION_PRIORITIES[bName] ?? 999;

    if (aPriority !== bPriority) return aPriority - bPriority;
    return a.sectionTitle.localeCompare(b.sectionTitle);
  });
}

/**
 * Normalize nav items for display by transforming slugs.
 *
 * @param sections - Array of section nav items
 * @param locale - Current locale
 * @param defaultLocale - Default locale code
 * @returns Transformed sections with display-ready slugs
 */
export function normalizeNavItemsForDisplay(
  sections: SectionNavItem[],
  locale: string | null,
  defaultLocale: string = DEFAULT_LOCALE,
): SectionNavItem[] {
  return sections.map(section => ({
    ...section,
    sectionSlug: normalizeSlugForDisplay(section.sectionSlug, locale, defaultLocale),
    items: section.items.map(item => ({
      ...item,
      slug: normalizeSlugForDisplay(item.slug, locale, defaultLocale),
      children: item.children?.map(child => ({
        ...child,
        slug: normalizeSlugForDisplay(child.slug, locale, defaultLocale),
      })),
    })),
  }));
}

/**
 * Filter duplicate items from sections.
 * Removes items that have the same slug or title as their parent section.
 *
 * @param sections - Array of section nav items
 * @returns Filtered sections without duplicates
 */
export function filterDuplicateItems(sections: SectionNavItem[]): SectionNavItem[] {
  return sections
    .map(section => {
      const normalizedSectionSlug = normalizeSlug(section.sectionSlug);
      const sectionTitleLower = section.sectionTitle.toLowerCase().trim();
      const seenSlugs = new Set<string>();
      const seenTitles = new Set<string>();

      const filteredItems = section.items.filter(item => {
        const normalizedItemSlug = normalizeSlug(item.slug);
        const itemTitleLower = item.title.toLowerCase().trim();

        // Keep if only item in section
        if (section.items.length === 1) {
          return true;
        }

        // Filter duplicates
        if (
          normalizedItemSlug === normalizedSectionSlug ||
          itemTitleLower === sectionTitleLower ||
          seenSlugs.has(normalizedItemSlug) ||
          seenTitles.has(itemTitleLower)
        ) {
          return false;
        }

        seenSlugs.add(normalizedItemSlug);
        seenTitles.add(itemTitleLower);

        // Filter duplicate children
        if (item.children) {
          const seenChildSlugs = new Set<string>();
          const seenChildTitles = new Set<string>();

          item.children = item.children.filter(child => {
            const normalizedChildSlug = normalizeSlug(child.slug);
            const childTitleLower = child.title.toLowerCase().trim();

            if (
              normalizedChildSlug === normalizedSectionSlug ||
              normalizedChildSlug === normalizedItemSlug ||
              childTitleLower === itemTitleLower ||
              childTitleLower === sectionTitleLower ||
              seenChildSlugs.has(normalizedChildSlug) ||
              seenChildTitles.has(childTitleLower)
            ) {
              return false;
            }

            seenChildSlugs.add(normalizedChildSlug);
            seenChildTitles.add(childTitleLower);
            return true;
          });
        }
        return true;
      });

      return {
        ...section,
        items: filteredItems,
      };
    })
    .filter(section => {
      return section.sectionSlug === '/' || section.items.length > 0;
    });
}

/**
 * Prepare navigation sections for sidebar display.
 * Combines normalization, filtering, and sorting.
 *
 * @param sections - Raw section nav items
 * @param locale - Current locale
 * @param defaultLocale - Default locale code
 * @returns Prepared sections ready for rendering
 */
export function prepareSidebarNavigation(
  sections: SectionNavItem[],
  locale: string | null,
  defaultLocale: string = DEFAULT_LOCALE,
): SectionNavItem[] {
  let result = normalizeNavItemsForDisplay(sections, locale, defaultLocale);
  result = filterDuplicateItems(result);
  result = sortSectionsByPriority(result);
  return result;
}

/**
 * Check if a nav item should be skipped in rendering
 * (when it's the same as its parent section).
 *
 * @param item - The nav item to check
 * @param sectionSlug - The parent section's slug
 * @returns True if item should be skipped
 */
export function shouldSkipItem(item: NavItem, sectionSlug: string): boolean {
  const normalizedItemSlug = normalizeSlug(item.slug);
  const normalizedSectionSlug = normalizeSlug(sectionSlug);
  const hasChildren = item.children && item.children.length > 0;

  return normalizedItemSlug === normalizedSectionSlug && !hasChildren;
}

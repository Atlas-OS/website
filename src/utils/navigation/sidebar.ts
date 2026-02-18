import { SECTION_PRIORITIES } from '@/constants';
import { getSectionFromSlug, normalizeSlug, normalizeSlugForDisplay } from './slugs';
import type { NavItem, SectionNavItem } from './types';

const FALLBACK_PRIORITY = 999;

function sortItems(items: NavItem[]): NavItem[] {
  return [...items]
    .map(item => ({
      ...item,
      children: item.children ? sortItems(item.children) : undefined,
    }))
    .sort((a, b) => {
      const orderA = a.order ?? FALLBACK_PRIORITY;
      const orderB = b.order ?? FALLBACK_PRIORITY;
      if (orderA !== orderB) {
        return orderA - orderB;
      }

      return a.title.localeCompare(b.title);
    });
}

function getSectionPriority(section: SectionNavItem): number {
  const normalizedSlug = normalizeSlug(section.sectionSlug);
  if (normalizedSlug === '/docs/') {
    return -1;
  }

  const key = getSectionFromSlug(section.sectionSlug) ?? '';
  return SECTION_PRIORITIES[key] ?? section.order ?? FALLBACK_PRIORITY;
}

export function sortSectionsByPriority(sections: SectionNavItem[]): SectionNavItem[] {
  return [...sections]
    .map(section => ({
      ...section,
      items: sortItems(section.items),
    }))
    .sort((a, b) => {
      const priorityA = getSectionPriority(a);
      const priorityB = getSectionPriority(b);
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      const orderA = a.order ?? FALLBACK_PRIORITY;
      const orderB = b.order ?? FALLBACK_PRIORITY;
      if (orderA !== orderB) {
        return orderA - orderB;
      }

      return a.sectionTitle.localeCompare(b.sectionTitle);
    });
}

export function normalizeNavItemsForDisplay(sections: SectionNavItem[]): SectionNavItem[] {
  return sections.map(section => ({
    ...section,
    sectionSlug: normalizeSlugForDisplay(section.sectionSlug),
    items: section.items.map(item => ({
      ...item,
      slug: normalizeSlugForDisplay(item.slug),
      children: item.children?.map(child => ({
        ...child,
        slug: normalizeSlugForDisplay(child.slug),
      })),
    })),
  }));
}

export function filterDuplicateItems(sections: SectionNavItem[]): SectionNavItem[] {
  return sections.map(section => {
    const seen = new Set<string>();
    const filteredItems = section.items.filter(item => {
      const key = normalizeSlug(item.slug);
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });

    return {
      ...section,
      items: filteredItems,
    };
  });
}

export function prepareSidebarNavigation(sections: SectionNavItem[]): SectionNavItem[] {
  const normalized = normalizeNavItemsForDisplay(sections);
  const unique = filterDuplicateItems(normalized);
  return sortSectionsByPriority(unique);
}

export function shouldSkipItem(item: NavItem, sectionSlug: string): boolean {
  return normalizeSlug(item.slug) === normalizeSlug(sectionSlug) && !item.children?.length;
}

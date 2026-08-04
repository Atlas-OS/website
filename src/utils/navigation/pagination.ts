import { normalizeSlug } from './slugs';
import { sortSectionsByPriority } from './sidebar';
import { buildNavigationTree } from './tree-builder';
import type { DocsEntry, NavItem, PrevNextPages, SectionNavItem } from './types';

function flattenItems(items: NavItem[]): NavItem[] {
  const flattened: NavItem[] = [];

  for (const item of items) {
    flattened.push({
      title: item.title,
      slug: item.slug,
      description: item.description,
      order: item.order,
    });

    if (item.children?.length) {
      flattened.push(...flattenItems(item.children));
    }
  }

  return flattened;
}

function flattenNavigationTree(navTree: SectionNavItem[]): NavItem[] {
  const pages: NavItem[] = [];

  for (const section of navTree) {
    pages.push({
      title: section.sectionTitle,
      slug: section.sectionSlug,
      description: section.sectionDescription,
      order: section.order,
    });

    const sectionItems = section.items.filter(
      item => normalizeSlug(item.slug) !== normalizeSlug(section.sectionSlug),
    );
    pages.push(...flattenItems(sectionItems));
  }

  const uniqueBySlug = new Map<string, NavItem>();
  for (const page of pages) {
    const key = normalizeSlug(page.slug);
    if (!uniqueBySlug.has(key)) {
      uniqueBySlug.set(key, page);
    }
  }

  return [...uniqueBySlug.values()];
}

export function getPrevNextPages(entries: DocsEntry[], currentSlug: string): PrevNextPages {
  const navTree = buildNavigationTree(entries, { scope: 'full' }) as SectionNavItem[];

  if (navTree.length === 0) {
    return { prev: null, next: null };
  }

  const sortedTree = sortSectionsByPriority(navTree);
  const flattened = flattenNavigationTree(sortedTree);
  const normalizedCurrent = normalizeSlug(currentSlug);
  const currentIndex = flattened.findIndex(item => normalizeSlug(item.slug) === normalizedCurrent);

  if (currentIndex < 0) {
    return { prev: null, next: null };
  }

  const prevItem = currentIndex > 0 ? flattened[currentIndex - 1] : null;
  const nextItem = currentIndex < flattened.length - 1 ? flattened[currentIndex + 1] : null;

  return {
    prev: prevItem
      ? {
          href: prevItem.slug,
          title: prevItem.title,
          description: prevItem.description,
        }
      : null,
    next: nextItem
      ? {
          href: nextItem.slug,
          title: nextItem.title,
          description: nextItem.description,
        }
      : null,
  };
}

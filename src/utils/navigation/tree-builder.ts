import { DEFAULT_LOCALE } from '@/constants';
import {
  addDocsPrefix,
  getLocaleFromId,
  getLocaleFromSlug,
  getSectionFromSlug,
  getSlugFromEntry,
  normalizeSlug,
} from './slugs';
import type { BuildNavigationOptions, DocsEntry, NavItem, SectionNavItem } from './types';

const FALLBACK_ORDER = 999;
const FAQ_SECTION_KEY = 'faq';

type NormalizedDocEntry = {
  slug: string;
  section: string | null;
  segments: string[];
  relativeSegments: string[];
  title: string;
  description?: string;
  badge?: string;
  order: number;
};

function isHiddenInNavigation(entry: DocsEntry): boolean {
  return entry.data.draft === true || entry.data.sidebar?.hidden === true;
}

function getEntryOrder(entry: DocsEntry): number {
  const sidebarOrder = entry.data.sidebar?.order;
  if (sidebarOrder !== undefined && Number.isFinite(sidebarOrder)) {
    return sidebarOrder;
  }

  const order = entry.data.order;
  if (order !== undefined && Number.isFinite(order)) {
    return order;
  }

  return FALLBACK_ORDER;
}

function sortByOrderAndTitle<T extends { order?: number; title: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const orderA = a.order ?? FALLBACK_ORDER;
    const orderB = b.order ?? FALLBACK_ORDER;

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    return a.title.localeCompare(b.title);
  });
}

function humanizeSegment(segment: string): string {
  if (segment.toLowerCase() === FAQ_SECTION_KEY) {
    return 'FAQ';
  }

  return segment
    .split('-')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function slugToPathSegments(slug: string, defaultLocale: string): string[] {
  const normalized = normalizeSlug(slug, defaultLocale);
  if (normalized === '/docs/') {
    return [];
  }

  const withoutDocsPrefix = normalized
    .replace(/^\/docs\/?/, '')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');

  if (!withoutDocsPrefix) {
    return [];
  }

  const segments = withoutDocsPrefix.split('/').filter(Boolean);
  const localeFromSlug = getLocaleFromSlug(normalized, defaultLocale);

  if (localeFromSlug && segments[0] === localeFromSlug) {
    return segments.slice(1);
  }

  return segments;
}

function normalizeEntries(
  entries: DocsEntry[],
  locale: string | null,
  defaultLocale: string,
): NormalizedDocEntry[] {
  const selectedLocale = locale && locale !== defaultLocale ? locale : null;

  return entries
    .filter(entry => !isHiddenInNavigation(entry))
    .filter(entry => getLocaleFromId(entry.id, defaultLocale) === selectedLocale)
    .map(entry => {
      const slug = normalizeSlug(getSlugFromEntry(entry, defaultLocale), defaultLocale);
      const segments = slugToPathSegments(slug, defaultLocale);
      const section = segments[0] || null;

      return {
        slug,
        section,
        segments,
        relativeSegments: section ? segments.slice(1) : [],
        title: entry.data.sidebar?.label || entry.data.title,
        description: entry.data.description,
        badge: entry.data.sidebar?.badge,
        order: getEntryOrder(entry),
      };
    });
}

function buildPseudoSlug(
  section: string,
  group: string,
  locale: string | null,
  defaultLocale: string,
): string {
  const localePrefix = locale && locale !== defaultLocale ? `${locale}/` : '';
  return addDocsPrefix(`/${localePrefix}${section}/${group}/`);
}

function buildSectionSlug(section: string, locale: string | null, defaultLocale: string): string {
  const localePrefix = locale && locale !== defaultLocale ? `${locale}/` : '';
  return addDocsPrefix(`/${localePrefix}${section}/`);
}

function toNavItem(doc: NormalizedDocEntry): NavItem {
  return {
    title: doc.title,
    slug: doc.slug,
    description: doc.description,
    badge: doc.badge,
    order: doc.order,
  };
}

function buildSectionItems(
  sectionEntries: NormalizedDocEntry[],
  section: string,
  locale: string | null,
  defaultLocale: string,
): NavItem[] {
  const entriesWithoutSectionIndex = sectionEntries.filter(doc => doc.relativeSegments.length > 0);
  if (entriesWithoutSectionIndex.length === 0) {
    return [];
  }

  const groupedByRoot = new Map<string, NormalizedDocEntry[]>();
  for (const doc of entriesWithoutSectionIndex) {
    const root = doc.relativeSegments[0];
    if (!root) {
      continue;
    }

    if (!groupedByRoot.has(root)) {
      groupedByRoot.set(root, []);
    }

    groupedByRoot.get(root)?.push(doc);
  }

  const sectionItems: NavItem[] = [];

  for (const [groupName, docsInGroup] of groupedByRoot.entries()) {
    const sortedGroup = sortByOrderAndTitle(docsInGroup);
    const groupIndex = sortedGroup.find(doc => doc.relativeSegments.length === 1);
    const childDocs = sortedGroup.filter(doc => doc.relativeSegments.length > 1);

    if (!groupIndex && childDocs.length === 0) {
      continue;
    }

    if (groupIndex && childDocs.length === 0) {
      sectionItems.push(toNavItem(groupIndex));
      continue;
    }

    const children = sortByOrderAndTitle(childDocs).map(toNavItem);
    if (children.length === 0) {
      continue;
    }

    if (groupIndex) {
      sectionItems.push({
        ...toNavItem(groupIndex),
        children,
      });
      continue;
    }

    const syntheticOrder = children[0]?.order ?? FALLBACK_ORDER;
    sectionItems.push({
      title: humanizeSegment(groupName),
      slug: buildPseudoSlug(section, groupName, locale, defaultLocale),
      order: syntheticOrder,
      children,
    });
  }

  return sortByOrderAndTitle(sectionItems);
}

function buildSection(
  sectionEntries: NormalizedDocEntry[],
  section: string,
  locale: string | null,
  defaultLocale: string,
): SectionNavItem {
  const sectionIndex = sectionEntries.find(doc => doc.relativeSegments.length === 0);
  const sectionItems = buildSectionItems(sectionEntries, section, locale, defaultLocale);

  const sectionTitle = sectionIndex?.title || humanizeSegment(section);
  const sectionSlug = sectionIndex?.slug || buildSectionSlug(section, locale, defaultLocale);
  const sectionOrder = sectionIndex?.order ?? sectionItems[0]?.order ?? FALLBACK_ORDER;

  return {
    sectionTitle,
    sectionSlug,
    sectionDescription: sectionIndex?.description,
    badge: sectionIndex?.badge,
    items: sectionItems,
    order: sectionOrder,
  };
}

function buildHomeSection(
  normalizedEntries: NormalizedDocEntry[],
  locale: string | null,
  defaultLocale: string,
): SectionNavItem | null {
  const homeEntry = normalizedEntries.find(doc => doc.segments.length === 0);
  if (!homeEntry) {
    return null;
  }

  const localePrefix = locale && locale !== defaultLocale ? `${locale}/` : '';
  const homeSlug = localePrefix ? addDocsPrefix(`/${localePrefix}`) : '/docs/';

  return {
    sectionTitle: homeEntry.title,
    sectionSlug: homeSlug,
    sectionDescription: homeEntry.description,
    badge: homeEntry.badge,
    items: [
      {
        ...toNavItem(homeEntry),
        slug: homeSlug,
      },
    ],
    order: homeEntry.order,
  };
}

function buildFullTree(
  entries: DocsEntry[],
  locale: string | null,
  defaultLocale: string,
): SectionNavItem[] {
  const normalizedEntries = normalizeEntries(entries, locale, defaultLocale);
  if (normalizedEntries.length === 0) {
    return [];
  }

  const sectionsByName = new Map<string, NormalizedDocEntry[]>();
  for (const doc of normalizedEntries) {
    if (!doc.section) {
      continue;
    }

    if (!sectionsByName.has(doc.section)) {
      sectionsByName.set(doc.section, []);
    }

    sectionsByName.get(doc.section)?.push(doc);
  }

  const builtSections = [...sectionsByName.entries()].map(([section, docs]) =>
    buildSection(docs, section, locale, defaultLocale),
  );

  const sortedSections = [...builtSections].sort((a, b) => {
    const orderA = a.order ?? FALLBACK_ORDER;
    const orderB = b.order ?? FALLBACK_ORDER;

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    return a.sectionTitle.localeCompare(b.sectionTitle);
  });

  const homeSection = buildHomeSection(normalizedEntries, locale, defaultLocale);
  if (!homeSection) {
    return sortedSections;
  }

  return [homeSection, ...sortedSections];
}

export function buildNavigationTree(
  entries: DocsEntry[],
  options: BuildNavigationOptions,
): SectionNavItem[] | NavItem[] {
  const { scope, section = null, locale = null, defaultLocale = DEFAULT_LOCALE } = options;

  if (entries.length === 0) {
    return [];
  }

  const fullTree = buildFullTree(entries, locale, defaultLocale);
  if (scope === 'full') {
    return fullTree;
  }

  if (!section) {
    return [];
  }

  const normalizedSection = section.trim().toLowerCase();
  const matchingSection = fullTree.find(item => {
    const sectionFromSlug = getSectionFromSlug(item.sectionSlug, defaultLocale);
    return sectionFromSlug?.toLowerCase() === normalizedSection;
  });

  return matchingSection?.items ?? [];
}

export function getPageTitle(entries: DocsEntry[], slug: string): string {
  const normalizedTargetSlug = normalizeSlug(slug);
  const matchedEntry = entries.find(
    entry => normalizeSlug(getSlugFromEntry(entry)) === normalizedTargetSlug,
  );
  return matchedEntry?.data.title || 'Documentation';
}

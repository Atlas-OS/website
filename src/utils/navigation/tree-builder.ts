import type { CollectionEntry } from 'astro:content';
import type { NavItem, SectionNavItem, DocsEntry, BuildNavigationOptions } from './types';
import { getSlugFromId, addDocsPrefix, getLocaleFromId, normalizeSlug } from './slugs';
import { DEFAULT_LOCALE } from '@/constants';

/** Regex to match index files */
const INDEX_PATTERN = /\/index\.(mdx|md)$/;
const INDEX_FILE_PATTERN = /^index\.(mdx|md)$/;

/**
 * Build a navigation tree from documentation entries.
 *
 * @param entries - All documentation entries
 * @param options - Build options
 * @returns Navigation tree (SectionNavItem[] for full, NavItem[] for section)
 *
 * @example
 * // Build full navigation tree
 * const tree = buildNavigationTree(entries, { scope: 'full' });
 *
 * // Build section-specific tree
 * const sectionTree = buildNavigationTree(entries, {
 *   scope: 'section',
 *   section: 'install'
 * });
 */
export function buildNavigationTree(
  entries: DocsEntry[],
  options: BuildNavigationOptions,
): SectionNavItem[] | NavItem[] {
  const { scope, section, locale = null, defaultLocale = DEFAULT_LOCALE } = options;

  if (entries.length === 0) return [];

  if (scope === 'section') {
    return buildSectionTree(entries, section ?? null, locale, defaultLocale);
  }

  return buildFullTree(entries, locale, defaultLocale);
}

/**
 * Build the full navigation tree with all sections.
 */
function buildFullTree(
  entries: DocsEntry[],
  locale: string | null,
  defaultLocale: string,
): SectionNavItem[] {
  // Filter entries by locale
  const localeFilteredEntries =
    locale && locale !== defaultLocale
      ? entries.filter(e => {
          const entryLocale = getLocaleFromId(e.id, defaultLocale);
          return entryLocale === locale;
        })
      : entries.filter(e => {
          const entryLocale = getLocaleFromId(e.id, defaultLocale);
          return entryLocale === null;
        });

  // Group entries by section
  const sections = new Map<string, CollectionEntry<'docs'>[]>();
  let homeEntry: CollectionEntry<'docs'> | null = null;

  for (const entry of localeFilteredEntries) {
    const firstSlash = entry.id.indexOf('/');
    if (firstSlash === -1) {
      homeEntry = entry;
      continue;
    }

    const entryLocale = getLocaleFromId(entry.id, defaultLocale);
    let sectionStart: number;

    if (entryLocale !== null) {
      sectionStart = firstSlash + entryLocale.length + 1;
    } else {
      if (entry.id.startsWith(`${defaultLocale}/`)) {
        sectionStart = defaultLocale.length + 1;
      } else {
        sectionStart = firstSlash + 1;
      }
    }

    const secondSlash = entry.id.indexOf('/', sectionStart);
    const section =
      secondSlash === -1 ? entry.id.slice(sectionStart) : entry.id.slice(sectionStart, secondSlash);

    if (!sections.has(section)) {
      sections.set(section, []);
    }
    sections.get(section)!.push(entry);
  }

  const sectionNavItems: SectionNavItem[] = [];

  // Add home entry if exists
  if (homeEntry) {
    const homeOrder = Number(homeEntry.data.order ?? 0);
    sectionNavItems.push({
      sectionTitle: homeEntry.data.title,
      sectionSlug: '/docs/',
      items: [
        {
          title: homeEntry.data.title,
          slug: '/docs/',
          order: homeOrder,
        },
      ],
      order: homeOrder,
    });
  }

  // Build section nav items
  for (const [sectionName, sectionEntries] of sections.entries()) {
    const sectionTree = buildSectionTree(entries, sectionName, locale, defaultLocale);

    if (sectionTree.length === 0) continue;

    const localePrefix = locale && locale !== defaultLocale ? `${locale}/` : '';
    const sectionPrefix = localePrefix
      ? `${localePrefix}${sectionName}/`
      : `${defaultLocale}/${sectionName}/`;

    let sectionTitle =
      sectionName.charAt(0).toUpperCase() + sectionName.slice(1).replace(/-/g, ' ');
    let sectionSlug = addDocsPrefix(`/${sectionName}/`);
    let sectionOrder = 999;

    // Find section index entry
    let sectionIndex: CollectionEntry<'docs'> | undefined;

    for (const e of sectionEntries) {
      if (e.id.startsWith(sectionPrefix)) {
        const relativePath = e.id.slice(sectionPrefix.length);
        if (relativePath === 'index.mdx' || relativePath === 'index.md') {
          sectionIndex = e;
          break;
        }
      }
    }

    if (!sectionIndex) {
      for (const e of sectionEntries) {
        if (INDEX_PATTERN.test(e.id)) {
          sectionIndex = e;
          break;
        }
      }
    }

    if (sectionIndex) {
      sectionTitle = sectionIndex.data.title;
      if (sectionName === 'faq') {
        sectionTitle = 'FAQ';
      }
      sectionSlug = getSlugFromId(sectionIndex.id);
      const orderValue = sectionIndex.data.order;
      if (orderValue !== undefined && orderValue !== null) {
        const numOrder = Number(orderValue);
        if (Number.isFinite(numOrder)) {
          sectionOrder = numOrder;
        }
      }
    } else {
      if (sectionName === 'faq') {
        sectionTitle = 'FAQ';
      }
      if (sectionTree.length > 0 && sectionTree[0]?.order !== undefined) {
        const treeOrder = Number(sectionTree[0]?.order);
        if (Number.isFinite(treeOrder)) {
          sectionOrder = treeOrder;
        }
      }
    }

    sectionNavItems.push({
      sectionTitle,
      sectionSlug,
      items: sectionTree,
      order: sectionOrder,
    });
  }

  // Sort sections by order
  sectionNavItems.sort((a, b) => {
    if (a.sectionSlug === '/docs/') return -1;
    if (b.sectionSlug === '/docs/') return 1;

    const orderA = Number(a.order) || 999;
    const orderB = Number(b.order) || 999;
    if (orderA === orderB) {
      return a.sectionTitle.localeCompare(b.sectionTitle);
    }
    return orderA - orderB;
  });

  return sectionNavItems;
}

/**
 * Build navigation tree for a specific section.
 */
function buildSectionTree(
  entries: DocsEntry[],
  section: string | null,
  locale: string | null,
  defaultLocale: string,
): NavItem[] {
  if (section === null) return [];

  const filteredEntries = filterEntriesBySection(entries, section, locale, defaultLocale);

  if (filteredEntries.length === 0) return [];

  const navItems: NavItem[] = [];
  const subsectionGroups = new Map<string, CollectionEntry<'docs'>[]>();

  const localePrefix = locale && locale !== defaultLocale ? `${locale}/` : '';
  const sectionPrefix = localePrefix
    ? `${localePrefix}${section}/`
    : `${defaultLocale}/${section}/`;

  let sectionIndex: CollectionEntry<'docs'> | undefined;
  const nonIndexEntries: CollectionEntry<'docs'>[] = [];

  for (const entry of filteredEntries) {
    const sectionPrefixWithoutSlash = sectionPrefix.slice(0, -1);
    if (!entry.id.startsWith(sectionPrefix) && entry.id !== sectionPrefixWithoutSlash) {
      continue;
    }

    let relativePath: string;
    if (entry.id === sectionPrefixWithoutSlash) {
      relativePath = 'index.mdx';
    } else {
      relativePath = entry.id.slice(sectionPrefix.length);
    }
    const parts = relativePath.split('/').filter(p => p.length > 0);

    if (parts.length === 1 && parts[0] && INDEX_FILE_PATTERN.test(parts[0])) {
      sectionIndex = entry;
      continue;
    }

    if (parts.length >= 1) {
      const subsection = parts[0];

      if (subsection && !subsectionGroups.has(subsection)) {
        subsectionGroups.set(subsection, []);
      }
      subsectionGroups.get(subsection ?? '')!.push(entry);
      nonIndexEntries.push(entry);
    }
  }

  // Handle section with only index
  if (sectionIndex && nonIndexEntries.length === 0) {
    const navItem = {
      title: sectionIndex.data.title,
      slug: getSlugFromId(sectionIndex.id),
      order: sectionIndex.data.order ?? 999,
    };
    navItems.push(navItem);
    navItems.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    return navItems;
  }

  // Build subsection items
  for (const [subsectionName, subsectionEntries] of subsectionGroups.entries()) {
    subsectionEntries.sort((a, b) => {
      const orderA = a.data.order ?? 999;
      const orderB = b.data.order ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return a.data.title.localeCompare(b.data.title);
    });

    let subsectionIndex: CollectionEntry<'docs'> | undefined;
    const otherEntries: CollectionEntry<'docs'>[] = [];

    for (const e of subsectionEntries) {
      const eRelativePath = e.id.startsWith(sectionPrefix)
        ? e.id.slice(sectionPrefix.length)
        : e.id;
      const eParts = eRelativePath.split('/').filter(p => p.length > 0);

      if (eParts.length === 1 && eParts[0] === subsectionName) {
        subsectionIndex = e;
      } else if (eParts.length > 0) {
        const lastPart = eParts[eParts.length - 1];
        if (lastPart && INDEX_FILE_PATTERN.test(lastPart)) {
          subsectionIndex = e;
        } else {
          otherEntries.push(e);
        }
      } else {
        otherEntries.push(e);
      }
    }

    if (subsectionIndex) {
      const navItem: NavItem = {
        title: subsectionIndex.data.title,
        slug: getSlugFromId(subsectionIndex.id),
        order: subsectionIndex.data.order ?? 999,
      };

      if (otherEntries.length > 0) {
        navItem.children = otherEntries
          .map(entry => ({
            title: entry.data.title,
            slug: getSlugFromId(entry.id),
            order: entry.data.order ?? 999,
          }))
          .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
      }

      navItems.push(navItem);
    } else if (otherEntries.length > 0) {
      const children = otherEntries
        .map(entry => ({
          title: entry.data.title,
          slug: getSlugFromId(entry.id),
          order: entry.data.order ?? 999,
        }))
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
      navItems.push(...children);
    }
  }

  navItems.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  return navItems;
}

/**
 * Filter entries by section.
 */
function filterEntriesBySection(
  entries: DocsEntry[],
  section: string | null,
  locale: string | null = null,
  defaultLocale: string = DEFAULT_LOCALE,
): DocsEntry[] {
  if (section === null || entries.length === 0) return [];

  const localePrefix = locale && locale !== defaultLocale ? `${locale}/` : '';
  const sectionPrefix = localePrefix ? `${localePrefix}${section}/` : `${section}/`;
  const defaultSectionPrefix = `${defaultLocale}/${section}/`;

  const filtered: DocsEntry[] = [];

  for (const entry of entries) {
    if (locale && locale !== defaultLocale) {
      if (entry.id.startsWith(sectionPrefix) || entry.id === sectionPrefix.slice(0, -1)) {
        filtered.push(entry);
      }
    } else {
      const defaultSectionWithoutSlash = defaultSectionPrefix.slice(0, -1);
      const sectionPrefixWithoutSlash = sectionPrefix.slice(0, -1);
      if (
        entry.id.startsWith(defaultSectionPrefix) ||
        entry.id.startsWith(sectionPrefix) ||
        entry.id === defaultSectionWithoutSlash ||
        entry.id === sectionPrefixWithoutSlash
      ) {
        filtered.push(entry);
      }
    }
  }

  return filtered;
}

/**
 * Get the page title from entries by slug.
 *
 * @param entries - All documentation entries
 * @param slug - The page slug
 * @returns The page title or 'Documentation' as fallback
 */
export function getPageTitle(entries: DocsEntry[], slug: string): string {
  const normalizedSlug = normalizeSlug(slug);

  if (normalizedSlug === '/docs/' && entries.length > 0) {
    const firstEntry = entries[0];
    if (normalizeSlug(getSlugFromId(firstEntry?.id ?? '')) === '/docs/') {
      return firstEntry?.data.title ?? '';
    }
  }

  for (const e of entries) {
    const entrySlug = getSlugFromId(e.id);
    if (normalizeSlug(entrySlug) === normalizedSlug) {
      return e.data.title;
    }
  }
  return 'Documentation';
}

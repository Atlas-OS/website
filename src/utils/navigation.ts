import type { CollectionEntry } from 'astro:content';
import type { NavItem, SectionNavItem, DocsEntry } from '@/types/navigation';
import { DEFAULT_LOCALE } from '@/constants';

const DOCS_PREFIX = '/docs';

const slugCache = new Map<string, string>();

const FILE_EXT_REGEX = /\.(mdx|md)$/;

const TRAILING_SLASH_REGEX = /\/$/;

/**
 * Add /docs prefix to slug if not already present
 */
function addDocsPrefix(slug: string): string {
  if (slug.startsWith(DOCS_PREFIX)) {
    return slug;
  }
  if (slug === '/') {
    return '/docs/';
  }
  return `${DOCS_PREFIX}${slug}`;
}

/**
 * Remove /docs prefix from slug
 */
function removeDocsPrefix(slug: string): string {
  if (slug.startsWith(DOCS_PREFIX)) {
    const withoutPrefix = slug.slice(DOCS_PREFIX.length);
    return withoutPrefix || '/';
  }
  return slug;
}

/**
 * Extract locale from entry ID (e.g., "en/install/index.mdx" -> "en")
 * Returns null if no locale prefix found or if it's the default locale at root
 */
export function getLocaleFromId(id: string, defaultLocale: string = DEFAULT_LOCALE): string | null {
  const firstSlash = id.indexOf('/');
  if (firstSlash === -1) return null;

  const localePart = id.slice(0, firstSlash);
  return localePart === defaultLocale ? null : localePart;
}

/**
 * Extract locale from slug (e.g., "/docs/fr/install/" -> "fr", "/docs/install/" -> null)
 */
export function getLocaleFromSlug(
  slug: string,
  defaultLocale: string = DEFAULT_LOCALE,
): string | null {
  const withoutDocsPrefix = removeDocsPrefix(slug);
  if (withoutDocsPrefix === '/' || withoutDocsPrefix === '') return null;

  const parts = withoutDocsPrefix.split('/').filter(p => p.length > 0);
  if (parts.length === 0) return null;

  const firstPart = parts[0];
  if (firstPart && firstPart.length >= 2 && firstPart.length <= 5 && firstPart !== defaultLocale) {
    return firstPart;
  }

  return null;
}

function removeLocaleFromSlug(slug: string, defaultLocale: string = DEFAULT_LOCALE): string {
  const locale = getLocaleFromSlug(slug, defaultLocale);
  if (locale === null) return slug;

  const localePrefix = `/${locale}`;
  const withoutDocsPrefix = removeDocsPrefix(slug);
  if (withoutDocsPrefix.startsWith(localePrefix)) {
    const withoutLocale = withoutDocsPrefix.slice(localePrefix.length);
    return addDocsPrefix(withoutLocale || '/');
  }

  return slug;
}

function normalizeSlug(slug: string, defaultLocale: string = DEFAULT_LOCALE): string {
  if (slug === '/' || slug === '/docs/') return '/docs/';

  const cacheKey = `normalize:${slug}:${defaultLocale}`;
  const cached = slugCache.get(cacheKey);
  if (cached !== undefined) return cached;

  let normalized = removeLocaleFromSlug(slug, defaultLocale);

  normalized = normalized.replace(TRAILING_SLASH_REGEX, '') || '/docs/';

  slugCache.set(cacheKey, normalized);
  return normalized;
}

export function getSlugFromId(id: string, defaultLocale: string = DEFAULT_LOCALE): string {
  const cacheKey = `id:${id}:${defaultLocale}`;
  const cached = slugCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const locale = getLocaleFromId(id, defaultLocale);
  let pathPart = id;

  if (locale !== null) {
    const localePrefix = `${locale}/`;
    if (pathPart.startsWith(localePrefix)) {
      pathPart = pathPart.slice(localePrefix.length);
    }
  } else {
    const defaultLocalePrefix = `${defaultLocale}/`;
    if (pathPart.startsWith(defaultLocalePrefix)) {
      pathPart = pathPart.slice(defaultLocalePrefix.length);
    }
  }

  const parts: string[] = [];
  let start = 0;
  for (let i = 0; i < pathPart.length; i++) {
    if (pathPart[i] === '/') {
      if (i > start) {
        const part = pathPart.slice(start, i);
        if (part) {
          parts.push(part.replace(FILE_EXT_REGEX, ''));
        }
      }
      start = i + 1;
    }
  }
  if (start < pathPart.length) {
    const part = pathPart.slice(start);
    if (part) {
      parts.push(part.replace(FILE_EXT_REGEX, ''));
    }
  }

  if (parts.length > 0 && parts[parts.length - 1] === 'index') {
    parts.pop();
  }

  const result = addDocsPrefix('/' + parts.join('/') + '/');
  slugCache.set(cacheKey, result);
  return result;
}

export function buildNavigationTree(entries: DocsEntry[]): NavItem[] {
  if (entries.length === 0) return [];

  const groups = new Map<string, CollectionEntry<'docs'>[]>();

  for (const entry of entries) {
    const firstSlash = entry.id.indexOf('/', 1);
    if (firstSlash === -1) continue;

    const firstPart = entry.id.slice(1, firstSlash) || 'index';

    if (!groups.has(firstPart)) {
      groups.set(firstPart, []);
    }
    groups.get(firstPart)!.push(entry);
  }

  const navItems: NavItem[] = [];
  const indexPattern = /\/index\.(mdx|md)$/;

  for (const [group, groupEntries] of groups.entries()) {
    if (group === 'index') continue;

    groupEntries.sort((a, b) => {
      const orderA = a.data.order ?? 999;
      const orderB = b.data.order ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return a.data.title.localeCompare(b.data.title);
    });

    let indexEntry: CollectionEntry<'docs'> | undefined;
    const otherEntries: CollectionEntry<'docs'>[] = [];

    for (const e of groupEntries) {
      if (indexPattern.test(e.id)) {
        indexEntry = e;
      } else {
        otherEntries.push(e);
      }
    }

    const navItem: NavItem = {
      title: indexEntry?.data.title || group.charAt(0).toUpperCase() + group.slice(1),
      slug: indexEntry ? getSlugFromId(indexEntry.id) : addDocsPrefix(`/${group}/`),
      order: indexEntry?.data.order ?? 999,
    };

    if (otherEntries.length > 0) {
      navItem.children = otherEntries.map(entry => ({
        title: entry.data.title,
        slug: getSlugFromId(entry.id),
        order: entry.data.order,
      }));
    }

    navItems.push(navItem);
  }

  navItems.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  return navItems;
}

export function isActivePage(currentSlug: string, pageSlug: string): boolean {
  return normalizeSlug(currentSlug) === normalizeSlug(pageSlug);
}

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

export function getSectionFromSlug(slug: string): string | null {
  const normalized = normalizeSlug(slug);
  if (normalized === '/docs/') return null;

  const withoutDocsPrefix = removeDocsPrefix(normalized);
  const firstSlash = withoutDocsPrefix.indexOf('/', 1);
  if (firstSlash === -1) {
    return withoutDocsPrefix.slice(1) || null;
  }
  return withoutDocsPrefix.slice(1, firstSlash) || null;
}

/**
 * Filter entries by section
 */
export function filterEntriesBySection(
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

export function buildSectionNavigationTree(
  entries: DocsEntry[],
  section: string | null,
  locale: string | null = null,
  defaultLocale: string = DEFAULT_LOCALE,
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
  const indexPattern = /^index\.(mdx|md)$/;

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

    if (parts.length === 1 && parts[0] && indexPattern.test(parts[0])) {
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
        if (lastPart && indexPattern.test(lastPart)) {
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

export function buildFullNavigationTree(
  entries: DocsEntry[],
  locale: string | null = null,
  defaultLocale: string = DEFAULT_LOCALE,
): SectionNavItem[] {
  if (entries.length === 0) return [];

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

  const sections = new Map<string, CollectionEntry<'docs'>[]>();
  let homeEntry: CollectionEntry<'docs'> | null = null;
  const indexPattern = /\/index\.(mdx|md)$/;

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

  for (const [sectionName, sectionEntries] of sections.entries()) {
    const sectionTree = buildSectionNavigationTree(entries, sectionName, locale, defaultLocale);

    if (sectionTree.length === 0) continue;

    const localePrefix = locale && locale !== defaultLocale ? `${locale}/` : '';
    const sectionPrefix = localePrefix
      ? `${localePrefix}${sectionName}/`
      : `${defaultLocale}/${sectionName}/`;
    let sectionTitle =
      sectionName.charAt(0).toUpperCase() + sectionName.slice(1).replace(/-/g, ' ');
    let sectionSlug = addDocsPrefix(`/${sectionName}/`);
    let sectionOrder = 999;

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
        if (indexPattern.test(e.id)) {
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

export function getPrevNextPages(
  entries: DocsEntry[],
  currentSlug: string,
  locale: string | null = null,
  defaultLocale: string = DEFAULT_LOCALE,
): {
  prev: { href: string; title: string; description?: string } | null;
  next: { href: string; title: string; description?: string } | null;
} {
  const navTree = buildFullNavigationTree(entries, locale, defaultLocale);
  const flattened = flattenNavigationTree(navTree);

  if (flattened.length === 0) {
    return { prev: null, next: null };
  }

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

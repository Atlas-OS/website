import { DEFAULT_LOCALE } from '@/constants';

/** Prefix for all documentation URLs */
const DOCS_PREFIX = '/docs';

/** Regex to match file extensions */
const FILE_EXT_REGEX = /\.(mdx|md)$/;

/** Regex to match trailing slashes */
const TRAILING_SLASH_REGEX = /\/$/;

/** Cache for normalized slugs to avoid repeated computation */
const slugCache = new Map<string, string>();

/**
 * Add /docs prefix to a slug if not already present.
 *
 * @param slug - The slug to prefix
 * @returns The slug with /docs prefix
 *
 * @example
 * addDocsPrefix('/install/') // '/docs/install/'
 * addDocsPrefix('/docs/install/') // '/docs/install/' (unchanged)
 */
export function addDocsPrefix(slug: string): string {
  if (slug.startsWith(DOCS_PREFIX)) {
    return slug;
  }
  if (slug === '/') {
    return '/docs/';
  }
  return `${DOCS_PREFIX}${slug}`;
}

/**
 * Remove /docs prefix from a slug.
 *
 * @param slug - The slug to remove prefix from
 * @returns The slug without /docs prefix
 *
 * @example
 * removeDocsPrefix('/docs/install/') // '/install/'
 * removeDocsPrefix('/install/') // '/install/' (unchanged)
 */
export function removeDocsPrefix(slug: string): string {
  if (slug.startsWith(DOCS_PREFIX)) {
    const withoutPrefix = slug.slice(DOCS_PREFIX.length);
    return withoutPrefix || '/';
  }
  return slug;
}

/**
 * Normalize a slug by removing locale prefix and trailing slashes.
 * Results are cached for performance.
 *
 * @param slug - The slug to normalize
 * @param defaultLocale - The default locale code
 * @returns Normalized slug
 *
 * @example
 * normalizeSlug('/docs/en/install/') // '/docs/install'
 * normalizeSlug('/docs/install/') // '/docs/install'
 */
export function normalizeSlug(slug: string, defaultLocale: string = DEFAULT_LOCALE): string {
  if (slug === '/' || slug === '/docs/') return '/docs/';

  const cacheKey = `normalize:${slug}:${defaultLocale}`;
  const cached = slugCache.get(cacheKey);
  if (cached !== undefined) return cached;

  let normalized = removeLocaleFromSlug(slug, defaultLocale);
  normalized = normalized.replace(TRAILING_SLASH_REGEX, '') || '/docs/';

  slugCache.set(cacheKey, normalized);
  return normalized;
}

/**
 * Remove locale prefix from a slug.
 *
 * @param slug - The slug to process
 * @param defaultLocale - The default locale code
 * @returns Slug without locale prefix
 */
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

/**
 * Extract locale from a slug.
 *
 * @param slug - The slug to extract locale from
 * @param defaultLocale - The default locale code
 * @returns Locale code or null if not found/default
 *
 * @example
 * getLocaleFromSlug('/docs/fr/install/') // 'fr'
 * getLocaleFromSlug('/docs/install/') // null
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
  // Check if it looks like a locale code (2-5 chars, not default)
  if (firstPart && firstPart.length >= 2 && firstPart.length <= 5 && firstPart !== defaultLocale) {
    return firstPart;
  }

  return null;
}

/**
 * Convert a content entry ID to a URL slug.
 * Handles locale prefixes and index files.
 *
 * @param id - The content entry ID (e.g., "en/install/index.mdx")
 * @param defaultLocale - The default locale code
 * @returns URL slug (e.g., "/docs/install/")
 *
 * @example
 * getSlugFromId('en/install/index.mdx') // '/docs/install/'
 * getSlugFromId('en/install/setup.mdx') // '/docs/install/setup/'
 * getSlugFromId('fr/install/index.mdx') // '/docs/fr/install/'
 */
export function getSlugFromId(id: string, defaultLocale: string = DEFAULT_LOCALE): string {
  const cacheKey = `id:${id}:${defaultLocale}`;
  const cached = slugCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const locale = getLocaleFromId(id, defaultLocale);
  let pathPart = id;

  // Remove locale prefix from path
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

  // Split path and remove file extensions
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

  // Remove trailing 'index'
  if (parts.length > 0 && parts[parts.length - 1] === 'index') {
    parts.pop();
  }

  const result = addDocsPrefix('/' + parts.join('/') + '/');
  slugCache.set(cacheKey, result);
  return result;
}

/**
 * Extract locale from a content entry ID.
 *
 * @param id - The content entry ID (e.g., "en/install/index.mdx")
 * @param defaultLocale - The default locale code
 * @returns Locale code or null if default locale
 *
 * @example
 * getLocaleFromId('en/install/index.mdx') // null (default)
 * getLocaleFromId('fr/install/index.mdx') // 'fr'
 */
export function getLocaleFromId(id: string, defaultLocale: string = DEFAULT_LOCALE): string | null {
  const firstSlash = id.indexOf('/');
  if (firstSlash === -1) return null;

  const localePart = id.slice(0, firstSlash);
  return localePart === defaultLocale ? null : localePart;
}

/**
 * Extract section name from a slug.
 *
 * @param slug - The slug to extract section from
 * @returns Section name or null if at root
 *
 * @example
 * getSectionFromSlug('/docs/install/setup/') // 'install'
 * getSectionFromSlug('/docs/') // null
 */
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
 * Check if a slug matches a page slug (comparing normalized versions).
 *
 * @param currentSlug - The current page slug
 * @param pageSlug - The page slug to compare against
 * @returns True if they match
 */
export function isActivePage(currentSlug: string, pageSlug: string): boolean {
  return normalizeSlug(currentSlug) === normalizeSlug(pageSlug);
}

/**
 * Normalize a slug for display by removing locale prefix.
 * Used for rendering links in the sidebar.
 *
 * @param slug - The slug to normalize
 * @param locale - Current locale
 * @param defaultLocale - Default locale code
 * @returns Display-ready slug
 */
export function normalizeSlugForDisplay(
  slug: string,
  locale: string | null,
  defaultLocale: string = DEFAULT_LOCALE,
): string {
  if (locale && locale !== defaultLocale) {
    const localePrefix = `/${locale}`;
    if (slug.startsWith(localePrefix)) {
      return slug.slice(localePrefix.length) || '/';
    }
  }
  if (slug.startsWith('/en/')) {
    return '/' + slug.slice(4);
  } else if (slug === '/en/') {
    return '/';
  }
  return slug;
}

/**
 * Clear the slug cache. Useful for testing.
 */
export function clearSlugCache(): void {
  slugCache.clear();
}

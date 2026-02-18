import { DEFAULT_LOCALE } from '@/constants';

const DOCS_PREFIX = '/docs';
const LOCALE_SEGMENT = /^[a-z]{2}(?:-[a-z]{2})?$/i;
const FILE_EXT_REGEX = /\.(md|mdx)$/i;

const slugCache = new Map<string, string>();

function trimFileExtension(value: string): string {
  return value.replace(FILE_EXT_REGEX, '');
}

function toPathSegments(pathLike: string): string[] {
  return trimFileExtension(pathLike)
    .split('/')
    .map(part => part.trim())
    .filter(Boolean);
}

function normalizePath(path: string): string {
  if (!path) return '/';
  if (path === '/') return '/';

  const prefixed = path.startsWith('/') ? path : `/${path}`;
  const collapsed = prefixed.replace(/\/{2,}/g, '/');

  if (collapsed === '/docs' || collapsed === '/docs/') {
    return '/docs/';
  }

  if (collapsed.startsWith('/docs/')) {
    return `${collapsed.replace(/\/+$/, '')}/`;
  }

  return collapsed.replace(/\/+$/, '') || '/';
}

function getLocaleFromSegments(segments: string[], defaultLocale: string): string | null {
  const first = segments[0];
  if (!first || !LOCALE_SEGMENT.test(first)) {
    return null;
  }

  return first.toLowerCase() === defaultLocale.toLowerCase() ? null : first;
}

function normalizeIdSegments(
  id: string,
  defaultLocale: string,
): { locale: string | null; segments: string[] } {
  const rawSegments = toPathSegments(id);
  if (rawSegments.length === 0) {
    return { locale: null, segments: [] };
  }

  const locale = getLocaleFromSegments(rawSegments, defaultLocale);
  const withoutLocale = locale ? rawSegments.slice(1) : rawSegments;
  const defaultLocalePrefix = defaultLocale.toLowerCase();
  const normalized =
    withoutLocale[0]?.toLowerCase() === defaultLocalePrefix
      ? withoutLocale.slice(1)
      : withoutLocale;

  const withoutTrailingIndex =
    normalized[normalized.length - 1] === 'index' ? normalized.slice(0, -1) : normalized;

  return {
    locale,
    segments: withoutTrailingIndex,
  };
}

function normalizeDocsSegments(segments: string[], defaultLocale: string): string[] {
  if (segments.length === 0) {
    return [];
  }

  const first = segments[0];
  if (!first) {
    return segments;
  }

  if (first.toLowerCase() === defaultLocale.toLowerCase()) {
    return segments.slice(1);
  }

  const locale = getLocaleFromSegments(segments, defaultLocale);
  const withoutLocale = locale ? segments.slice(1) : segments;

  return withoutLocale;
}

export function addDocsPrefix(slug: string): string {
  const normalized = normalizePath(slug);
  if (normalized === '/') {
    return '/docs/';
  }

  if (normalized.startsWith('/docs/')) {
    return normalized;
  }

  return normalizePath(`${DOCS_PREFIX}${normalized}`);
}

export function removeDocsPrefix(slug: string): string {
  const normalized = normalizePath(slug);
  if (!normalized.startsWith('/docs/')) {
    return normalized;
  }

  const withoutPrefix = normalized.slice(DOCS_PREFIX.length);
  return normalizePath(withoutPrefix || '/');
}

export function normalizeSlug(slug: string, defaultLocale: string = DEFAULT_LOCALE): string {
  if (slug === '/') {
    return '/';
  }

  const cacheKey = `normalize:${slug}:${defaultLocale}`;
  const cached = slugCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const normalized = normalizePath(slug);
  if (!normalized.startsWith('/docs/')) {
    slugCache.set(cacheKey, normalized);
    return normalized;
  }

  const withoutDocs = removeDocsPrefix(normalized);
  const segments = toPathSegments(withoutDocs);
  const normalizedSegments = normalizeDocsSegments(segments, defaultLocale);
  const result =
    normalizedSegments.length > 0 ? addDocsPrefix(`/${normalizedSegments.join('/')}/`) : '/docs/';

  slugCache.set(cacheKey, result);
  return result;
}

export function getLocaleFromSlug(
  slug: string,
  defaultLocale: string = DEFAULT_LOCALE,
): string | null {
  const normalized = normalizePath(slug);
  if (!normalized.startsWith('/docs/')) {
    return null;
  }

  const segments = toPathSegments(removeDocsPrefix(normalized));
  return getLocaleFromSegments(segments, defaultLocale);
}

export function getSlugFromId(id: string, defaultLocale: string = DEFAULT_LOCALE): string {
  const cacheKey = `id:${id}:${defaultLocale}`;
  const cached = slugCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const { locale, segments } = normalizeIdSegments(id, defaultLocale);
  const pathSegments = locale ? [locale, ...segments] : segments;
  const result = pathSegments.length > 0 ? addDocsPrefix(`/${pathSegments.join('/')}/`) : '/docs/';

  slugCache.set(cacheKey, result);
  return result;
}

export function getSlugFromEntry(
  entry: { id: string; data?: ({ slug?: string } & Record<string, unknown>) | undefined },
  defaultLocale: string = DEFAULT_LOCALE,
): string {
  const customSlug = entry.data?.slug?.trim();
  if (!customSlug) {
    return getSlugFromId(entry.id, defaultLocale);
  }

  const locale = getLocaleFromId(entry.id, defaultLocale);
  const localePrefix = locale ? `${locale}/` : '';
  return addDocsPrefix(`/${localePrefix}${customSlug}/`);
}

export function getLocaleFromId(id: string, defaultLocale: string = DEFAULT_LOCALE): string | null {
  return normalizeIdSegments(id, defaultLocale).locale;
}

export function getSectionFromSlug(
  slug: string,
  defaultLocale: string = DEFAULT_LOCALE,
): string | null {
  const normalized = normalizeSlug(slug, defaultLocale);
  if (normalized === '/docs/') {
    return null;
  }

  const segments = toPathSegments(removeDocsPrefix(normalized));
  const normalizedSegments = normalizeDocsSegments(segments, defaultLocale);
  return normalizedSegments[0] || null;
}

function humanizeSectionSegment(segment: string): string {
  if (segment.toLowerCase() === 'faq') {
    return 'FAQ';
  }

  return segment
    .split('-')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

export function getSectionLabelFromSlug(
  slug: string,
  defaultLocale: string = DEFAULT_LOCALE,
): string {
  const section = getSectionFromSlug(slug, defaultLocale);
  if (!section) {
    return 'Documentation';
  }

  return humanizeSectionSegment(section);
}

export function isActivePage(currentSlug: string, pageSlug: string): boolean {
  return normalizeSlug(currentSlug) === normalizeSlug(pageSlug);
}

export function normalizeSlugForDisplay(
  slug: string,
  _locale: string | null,
  defaultLocale: string = DEFAULT_LOCALE,
): string {
  return normalizeSlug(slug, defaultLocale);
}

export function clearSlugCache(): void {
  slugCache.clear();
}

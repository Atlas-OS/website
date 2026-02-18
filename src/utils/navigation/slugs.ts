const DOCS_PREFIX = '/docs';
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

export function normalizeSlug(slug: string): string {
  if (slug === '/') {
    return '/';
  }

  const cacheKey = `normalize:${slug}`;
  const cached = slugCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const result = normalizePath(slug);
  slugCache.set(cacheKey, result);
  return result;
}

export function getSlugFromId(id: string): string {
  const cacheKey = `id:${id}`;
  const cached = slugCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const segments = toPathSegments(id);
  const withoutIndex =
    segments[segments.length - 1] === 'index' ? segments.slice(0, -1) : segments;
  const result = withoutIndex.length > 0 ? addDocsPrefix(`/${withoutIndex.join('/')}/`) : '/docs/';

  slugCache.set(cacheKey, result);
  return result;
}

export function getSlugFromEntry(
  entry: { id: string; data?: ({ slug?: string } & Record<string, unknown>) | undefined },
): string {
  const customSlug = entry.data?.slug?.trim();
  if (!customSlug) {
    return getSlugFromId(entry.id);
  }

  return addDocsPrefix(`/${customSlug}/`);
}

export function getSectionFromSlug(slug: string): string | null {
  const normalized = normalizeSlug(slug);
  if (normalized === '/docs/') {
    return null;
  }

  const segments = toPathSegments(removeDocsPrefix(normalized));
  return segments[0] || null;
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

export function getSectionLabelFromSlug(slug: string): string {
  const section = getSectionFromSlug(slug);
  if (!section) {
    return 'Documentation';
  }

  return humanizeSectionSegment(section);
}

export function isActivePage(currentSlug: string, pageSlug: string): boolean {
  return normalizeSlug(currentSlug) === normalizeSlug(pageSlug);
}

export function normalizeSlugForDisplay(slug: string): string {
  return normalizeSlug(slug);
}

export function clearSlugCache(): void {
  slugCache.clear();
}

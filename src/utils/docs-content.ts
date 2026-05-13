import { getSlugFromEntry, normalizeSlug } from '@/utils/navigation';
import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';

export type DocsEntry = CollectionEntry<'docs'>;

let publishedDocsPromise: Promise<DocsEntry[]> | undefined;

export function getPublishedDocs(): Promise<DocsEntry[]> {
  publishedDocsPromise ??= getCollection('docs', entry => !entry.data.draft);
  return publishedDocsPromise;
}

export async function getPublishedDocsBySlug(): Promise<Map<string, DocsEntry>> {
  const docs = await getPublishedDocs();
  return new Map(docs.map(entry => [normalizeSlug(getSlugFromEntry(entry)), entry]));
}

export async function getDocsTitleBySlug(): Promise<Map<string, string>> {
  const docs = await getPublishedDocs();
  return new Map(
    docs.map(entry => [
      normalizeSlug(getSlugFromEntry(entry)),
      entry.data.sidebar?.label || entry.data.title,
    ]),
  );
}

export function getDocsRouteParam(entry: DocsEntry): string | null {
  const slug = getSlugFromEntry(entry);
  if (normalizeSlug(slug) === '/docs/') {
    return null;
  }

  const paramsSlug = slug
    .replace(/^\/docs\/?/, '')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');

  return paramsSlug || null;
}

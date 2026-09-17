import { docsEntryPath, docsSectionKey, getDocsEntries } from '@/utils/docs';
import type { APIRoute } from 'astro';

/** Machine-readable index of every published docs page, consumed by external tooling. */
export const GET: APIRoute = async () => {
  const entries = (await getDocsEntries())
    .map(entry => {
      const slug = docsEntryPath(entry);
      return {
        title: entry.data.title,
        description: entry.data.description ?? '',
        section: docsSectionKey(slug) ?? '',
        slug,
        tags: entry.data.tags ?? [],
      };
    })
    .sort((a, b) => a.section.localeCompare(b.section) || a.title.localeCompare(b.title));

  return Response.json({ entries }, { headers: { 'Cache-Control': 'public, max-age=3600' } });
};

import { getSlugFromEntry, getSectionFromSlug } from '@/utils/navigation';
import { getPublishedDocs } from '@/utils/docs-content';
import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const docs = await getPublishedDocs();

  const entries = docs.map(entry => {
    const slug = getSlugFromEntry(entry);
    const section = getSectionFromSlug(slug) ?? '';

    return {
      title: entry.data.title,
      description: entry.data.description ?? '',
      section,
      slug,
      tags: entry.data.tags ?? [],
    };
  });

  // Sort by section then title for consistent ordering
  entries.sort((a, b) => a.section.localeCompare(b.section) || a.title.localeCompare(b.title));

  return new Response(JSON.stringify({ entries }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};

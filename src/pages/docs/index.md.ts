import { DOCS_ROOT, getDocsIndex } from '@/utils/docs';
import { docsEntryToMarkdown } from '@/utils/docs-markdown';
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ site }) => {
  const entry = (await getDocsIndex()).get(DOCS_ROOT);
  if (!entry) return new Response('Not found', { status: 404 });

  return new Response(docsEntryToMarkdown(entry, site), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};

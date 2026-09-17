import { docsRouteParam, getDocsEntries, type DocsEntry } from '@/utils/docs';
import { docsEntryToMarkdown } from '@/utils/docs-markdown';
import type { APIRoute, GetStaticPaths } from 'astro';

interface Props {
  entry: DocsEntry;
}

/** Every docs page is also served as Markdown at `/docs/<path>.md` for LLMs and copy actions. */
export const getStaticPaths = (async () => {
  const entries = await getDocsEntries();

  return entries.flatMap(entry => {
    const slug = docsRouteParam(entry);
    return slug ? [{ params: { slug }, props: { entry } }] : [];
  });
}) satisfies GetStaticPaths;

export const GET: APIRoute<Props> = ({ props, site }) =>
  new Response(docsEntryToMarkdown(props.entry, site), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });

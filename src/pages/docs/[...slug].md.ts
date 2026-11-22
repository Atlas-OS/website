import { docsRouteParam, getDocsEntries, type DocsEntry } from '@/utils/docs';
import { docsEntryToMarkdown } from '@/utils/render-docs-markdown';
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

export const GET: APIRoute<Props> = async ({ props, site }) =>
  new Response(await docsEntryToMarkdown(props.entry, site), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
    },
  });

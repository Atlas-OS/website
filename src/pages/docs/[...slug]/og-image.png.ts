import {
  docsEntryPath,
  docsRouteParam,
  docsSectionKey,
  getDocsEntries,
  getDocsIndex,
  humanizeSegment,
  type DocsEntry,
} from '@/utils/docs';
import { renderOgImage } from '@/utils/og-image';
import type { APIRoute, GetStaticPaths } from 'astro';

interface Props {
  entry: DocsEntry;
  section: string;
}
export const getStaticPaths = (async () => {
  const entries = await getDocsEntries();
  const index = await getDocsIndex();
  return entries.flatMap(entry => {
    const slug = docsRouteParam(entry);
    const key = docsSectionKey(docsEntryPath(entry));
    const parent = key ? index.get(`/docs/${key}/`) : undefined;
    const section =
      parent?.data.sidebar?.label ?? parent?.data.title ?? humanizeSegment(key ?? 'documentation');
    return slug ? [{ params: { slug }, props: { entry, section } }] : [];
  });
}) satisfies GetStaticPaths;

export const GET: APIRoute<Props> = ({ props: { entry, section } }) =>
  renderOgImage({
    title: entry.data.title,
    section,
  });

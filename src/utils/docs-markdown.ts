import { SITE_URL } from '@/constants';
import { docsEntryPath, type DocsEntry } from '@/utils/docs';

/** Absolute URL of the Markdown rendition of a docs page (`/docs/install/iso.md`). */
export function docsMarkdownUrl(
  entry: Pick<DocsEntry, 'id'>,
  site: URL | string = SITE_URL,
): string {
  const path = docsEntryPath(entry);
  const file = path === '/docs/' ? '/docs/index.md' : `${path.replace(/\/$/, '')}.md`;
  return new URL(file, site).href;
}

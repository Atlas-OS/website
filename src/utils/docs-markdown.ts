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

/**
 * Plain-text rendition of an MDX page for LLMs and "copy page" actions.
 * Component imports are dropped; component tags are left in place because their names
 * (Callout, Tabs, CodeBlock) still read naturally as structure.
 */
export function docsEntryToMarkdown(entry: DocsEntry, site: URL | string = SITE_URL): string {
  const body = (entry.body ?? '')
    .replace(/^import\s.+?;?\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const header = [
    `# ${entry.data.title}`,
    entry.data.description ? `> ${entry.data.description}` : null,
    `Source: ${new URL(docsEntryPath(entry), site).href}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  return `${header}\n\n${body}\n`;
}

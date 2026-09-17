import { DEFAULT_META_DESCRIPTION, SITE_NAME } from '@/constants';
import { getDocsTree, type DocsNavItem, type DocsSection } from '@/utils/docs';
import { docsMarkdownUrl } from '@/utils/docs-markdown';
import type { APIRoute } from 'astro';

/**
 * llms.txt: a Markdown index of the documentation for AI agents and crawlers.
 * Each link points at the Markdown rendition of the page. See https://llmstxt.org.
 */
export const GET: APIRoute = async ({ site }) => {
  const sections = await getDocsTree();

  const line = (item: Pick<DocsNavItem, 'title' | 'href' | 'description'>) => {
    const id = item.href.replace(/^\/docs\/?/, '').replace(/\/$/, '') || 'index';
    const url = docsMarkdownUrl({ id }, site);
    return `- [${item.title}](${url})${item.description ? `: ${item.description}` : ''}`;
  };

  const renderSection = (section: DocsSection): string[] => {
    const lines = [`## ${section.title}`, '', line(section)];
    for (const item of section.items) {
      lines.push(line(item));
      for (const child of item.children ?? []) lines.push(`  ${line(child)}`);
    }
    return [...lines, ''];
  };

  const body = [
    `# ${SITE_NAME} documentation`,
    '',
    `> ${DEFAULT_META_DESCRIPTION}`,
    '',
    'Every page below is also available as Markdown by appending `.md` to its URL.',
    '',
    ...sections.flatMap(renderSection),
  ].join('\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};

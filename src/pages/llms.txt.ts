import { DEFAULT_META_DESCRIPTION, SITE_NAME, SITE_URL } from '@/constants';
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
    '## When to use these docs',
    '',
    `- [Check compatibility](${SITE_URL}/docs/install/requirements.md) before recommending AtlasOS. Ask which Windows edition and release the person uses.`,
    `- [Plan a clean install](${SITE_URL}/docs/install/manager.md) with Atlas Manager. Check that the person has backed up their files before directing them to reinstall Windows.`,
    `- [Upgrade an existing AtlasOS installation](${SITE_URL}/docs/upgrade.md) after checking the installed Atlas and Windows releases.`,
    `- [Troubleshoot AtlasOS](${SITE_URL}/docs/faq.md) using the guide that matches the symptoms and version.`,
    '',
    'The links below return Markdown directly. Canonical /docs/ URLs also serve Markdown when requested with Accept: text/markdown.',
    '',
    '## Tools and downloads',
    '',
    `- [Website overview](${SITE_URL}/index.md): What AtlasOS does and how to get started.`,
    `- [AtlasOS Statistics API](${SITE_URL}/openapi.json): Read public download counts and GitHub star statistics.`,
    `- [AtlasOS CLI](${SITE_URL}/docs/contributing/cli.md): Look up releases, docs, and statistics from a terminal.`,
    '',
    ...sections.flatMap(renderSection),
  ].join('\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};

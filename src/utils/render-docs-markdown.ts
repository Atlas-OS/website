import { getContainerRenderer } from '@astrojs/mdx/container-renderer';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { loadRenderers } from 'astro:container';
import { render } from 'astro:content';
import { fromHtml } from 'hast-util-from-html';
import { toMdast } from 'hast-util-to-mdast';
import { gfmTableToMarkdown } from 'mdast-util-gfm-table';
import { toMarkdown } from 'mdast-util-to-markdown';
import { visit } from 'unist-util-visit';
import { SITE_URL } from '@/constants';
import { docsEntryPath, type DocsEntry } from './docs';

export async function docsEntryToMarkdown(
  entry: DocsEntry,
  site: URL | string = SITE_URL,
): Promise<string> {
  const url = new URL(docsEntryPath(entry), site);
  const { Content } = await render(entry);
  const renderers = await loadRenderers([getContainerRenderer()]);
  const container = await AstroContainer.create({ renderers });
  const html = await container.renderToString(Content, { request: new Request(url) });
  const tree = fromHtml(html, { fragment: true });

  visit(tree, 'element', node => {
    // Code-copy controls and tab buttons duplicate content in the Markdown rendition.
    if (node.properties.role === 'tablist' || node.properties.ariaHidden === 'true') {
      node.children = [];
    }
    if (node.tagName === 'button' && node.properties.popovertarget) node.tagName = 'span';
    if ('popover' in node.properties) {
      node.children.unshift({ type: 'text', value: ' (' });
      node.children.push({ type: 'text', value: ')' });
    }
    if (node.tagName === 'details') node.properties.open = true;
  });

  const body = toMarkdown(
    toMdast(tree, { document: false, nodeHandlers: { comment: () => undefined } }),
    {
      bullet: '-',
      fences: true,
      extensions: [gfmTableToMarkdown()],
    },
  );
  const header = [
    `# ${entry.data.title}`,
    entry.data.description && `> ${entry.data.description}`,
    `Source: ${url.href}`,
  ].filter(Boolean);
  return `${header.join('\n\n')}\n\n${body}`;
}

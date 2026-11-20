import type { Root } from 'hast';
import { describe, expect, it } from 'vitest';
import rehypeExternalLinks, { stripTrackingParams } from '../../src/utils/rehype-external-links';

const link = (href: string): Root => ({
  type: 'root',
  children: [{ type: 'element', tagName: 'a', properties: { href }, children: [] }],
});

const firstLink = (tree: Root) => {
  const node = tree.children[0];
  if (node?.type !== 'element') throw new Error('Expected an element.');
  return node.properties;
};

describe('stripTrackingParams', () => {
  it('removes utm_* and known click identifiers but keeps other parameters', () => {
    expect(
      stripTrackingParams(
        'https://example.com/page?utm_source=x&utm_medium=y&id=7&gclid=abc&ref=foo',
      ),
    ).toBe('https://example.com/page?id=7');
  });

  it('keeps fragments and leaves untracked URLs unchanged', () => {
    expect(stripTrackingParams('https://example.com/a?fbclid=1#section')).toBe(
      'https://example.com/a#section',
    );
    expect(stripTrackingParams('https://example.com/a?b=1')).toBe('https://example.com/a?b=1');
  });

  it('returns input that is not an absolute URL untouched', () => {
    expect(stripTrackingParams('/docs/?utm_source=x')).toBe('/docs/?utm_source=x');
  });
});

describe('rehypeExternalLinks', () => {
  it('opens absolute links in a new tab with safe rel values and clean URLs', () => {
    const tree = link('https://github.com/Atlas-OS/Atlas?utm_campaign=docs');
    rehypeExternalLinks()(tree);
    expect(firstLink(tree)).toEqual({
      href: 'https://github.com/Atlas-OS/Atlas',
      target: '_blank',
      rel: ['noopener', 'noreferrer'],
    });
  });

  it('leaves internal and non-http links alone', () => {
    for (const href of ['/docs/install/', '#top', 'mailto:contact@atlasos.net']) {
      const tree = link(href);
      rehypeExternalLinks()(tree);
      expect(firstLink(tree)).toEqual({ href });
    }
  });
});

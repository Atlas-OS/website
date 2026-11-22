import type { Root } from 'hast';
import { visit } from 'unist-util-visit';

const TRACKING_PARAMS = new Set([
  'fbclid',
  'gclid',
  'igshid',
  'mc_cid',
  'mc_eid',
  'msclkid',
  'ref',
  'spm',
  'yclid',
]);

function isTrackingParam(name: string): boolean {
  return name.startsWith('utm_') || TRACKING_PARAMS.has(name);
}

/** Strip analytics parameters from an absolute URL. Returns the input untouched when it does not parse. */
export function stripTrackingParams(href: string): string {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return href;
  }

  for (const name of [...url.searchParams.keys()]) {
    if (isTrackingParam(name)) url.searchParams.delete(name);
  }

  return url.toString();
}

/**
 * Rehype plugin: open absolute http(s) links in a new tab with safe `rel` values,
 * and remove tracking parameters from their URLs.
 */
export default function rehypeExternalLinks() {
  return (tree: Root) => {
    visit(tree, 'element', node => {
      if (node.tagName !== 'a') return;

      const href = node.properties.href;
      if (typeof href !== 'string' || !/^https?:\/\//i.test(href)) return;

      node.properties.href = stripTrackingParams(href);
      node.properties.target = '_blank';
      node.properties.rel = ['noopener', 'noreferrer'];
    });
  };
}

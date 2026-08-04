/* global URL */

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

function isElement(node, tagName) {
  return node && node.type === 'element' && node.tagName === tagName;
}

function walk(node, visitor) {
  visitor(node);

  if (!Array.isArray(node?.children)) {
    return;
  }

  for (const child of node.children) {
    walk(child, visitor);
  }
}

function cleanUrl(value) {
  let url;

  try {
    url = new URL(value);
  } catch {
    return value;
  }

  for (const param of Array.from(url.searchParams.keys())) {
    if (param.startsWith('utm_') || TRACKING_PARAMS.has(param)) {
      url.searchParams.delete(param);
    }
  }

  return url.toString();
}

export default function rehypeExternalLinks() {
  return (tree) => {
    walk(tree, (node) => {
      if (!isElement(node, 'a')) {
        return;
      }

      const href = node.properties?.href;
      if (typeof href !== 'string' || !/^https?:\/\//i.test(href)) {
        return;
      }

      node.properties.href = cleanUrl(href);
      node.properties.target = '_blank';
      node.properties.rel = 'noopener noreferrer';
    });
  };
}

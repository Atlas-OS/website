import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { getSlugFromId, buildFullNavigationTree } from '@/utils/navigation';

/**
 * Markdown stripping regex patterns
 * These patterns are used to remove markdown syntax from content for search indexing
 */
const MARKDOWN_PATTERNS = {
  // Code blocks and inline code
  CODE_BLOCK: /```[\s\S]*?```/g,
  INLINE_CODE: /`[^`]+`/g,
  INDENTED_CODE: /^\s{4,}.*$/gm,

  // HTML elements
  HTML_TAGS: /<[^>]+>/g,

  // Media elements
  IMAGES: /!\[.*?\]\(.*?\)/g,

  // Links (capture text, remove URL)
  LINKS: /\[([^\]]+)\]\([^)]+\)/g,

  // Headers
  HEADERS: /^#{1,6}\s+/gm,

  // Text formatting
  BOLD_ASTERISK: /\*\*([^*]+)\*\*/g,
  BOLD_UNDERSCORE: /__([^_]+)__/g,
  ITALIC_ASTERISK: /(?<!\*)\*([^*]+)\*(?!\*)/g,
  ITALIC_UNDERSCORE: /(?<!_)_([^_]+)_(?!_)/g,
  STRIKETHROUGH: /~~([^~]+)~~/g,

  // Lists
  LIST_MARKERS: /^[*\-+]\s+/gm,
  NUMBERED_LIST: /^\d+\.\s+/gm,

  // Block elements
  BLOCKQUOTES: /^>\s+/gm,
  HORIZONTAL_RULES: /^---+$/gm,

  // Whitespace
  MULTIPLE_NEWLINES: /\n\s*\n\s*\n/g,
} as const;

/**
 * Strips markdown syntax from text for search indexing
 */
function stripMarkdown(markdown: string): string {
  if (!markdown) return '';

  return markdown
    .replace(MARKDOWN_PATTERNS.CODE_BLOCK, '')
    .replace(MARKDOWN_PATTERNS.INLINE_CODE, '')
    .replace(MARKDOWN_PATTERNS.INDENTED_CODE, '')
    .replace(MARKDOWN_PATTERNS.HTML_TAGS, '')
    .replace(MARKDOWN_PATTERNS.IMAGES, '')
    .replace(MARKDOWN_PATTERNS.LINKS, '$1')
    .replace(MARKDOWN_PATTERNS.HEADERS, '')
    .replace(MARKDOWN_PATTERNS.BOLD_ASTERISK, '$1')
    .replace(MARKDOWN_PATTERNS.BOLD_UNDERSCORE, '$1')
    .replace(MARKDOWN_PATTERNS.ITALIC_ASTERISK, '$1')
    .replace(MARKDOWN_PATTERNS.ITALIC_UNDERSCORE, '$1')
    .replace(MARKDOWN_PATTERNS.STRIKETHROUGH, '$1')
    .replace(MARKDOWN_PATTERNS.LIST_MARKERS, '')
    .replace(MARKDOWN_PATTERNS.NUMBERED_LIST, '')
    .replace(MARKDOWN_PATTERNS.BLOCKQUOTES, '')
    .replace(MARKDOWN_PATTERNS.HORIZONTAL_RULES, '')
    .replace(MARKDOWN_PATTERNS.MULTIPLE_NEWLINES, '\n\n')
    .trim();
}

export const GET: APIRoute = async () => {
  const docs = await getCollection('docs');
  const navTree = buildFullNavigationTree(docs);

  const sectionMap = new Map<string, string>();
  const TRAILING_SLASH_REGEX = /\/$/;

  for (const section of navTree) {
    if (!section.items) continue;
    for (const item of section.items) {
      const itemSlug = item.slug.replace(TRAILING_SLASH_REGEX, '') || '/';
      if (!sectionMap.has(itemSlug)) {
        sectionMap.set(itemSlug, section.sectionTitle);
      }
    }
  }

  const searchableDocs = new Array(docs.length);

  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    const slug = getSlugFromId(doc?.id ?? '');
    const normalizedSlug = slug.replace(TRAILING_SLASH_REGEX, '') || '/';

    searchableDocs[i] = {
      id: doc?.id ?? '',
      slug: slug,
      title: doc?.data.title ?? '',
      description: doc?.data.description ?? '',
      type: doc?.data.type ?? 'guide',
      url: slug,
      body: doc?.body ? stripMarkdown(doc.body) : '',
      section: sectionMap.get(normalizedSlug) ?? null,
    };
  }

  return new Response(JSON.stringify(searchableDocs), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

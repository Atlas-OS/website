import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { defineCollection } from 'astro:content';

const DOCS_ENTRY_ID_PATTERN = /^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/;

function generateDocsEntryId({ entry }: { entry: string }): string {
  const id = entry.replaceAll('\\', '/').replace(/\.(md|mdx)$/i, '');

  if (!DOCS_ENTRY_ID_PATTERN.test(id)) {
    throw new Error(
      `Invalid docs entry path "${entry}". Use lowercase, path-safe file and directory names.`,
    );
  }

  return id;
}

const docsSidebarSchema = z
  .object({
    label: z.string().min(1).max(80).optional(),
    order: z.coerce.number().int().min(0).max(9999).optional(),
    badge: z.string().min(1).max(30).optional(),
    hidden: z.boolean().optional().default(false),
  })
  .optional();

const docsSchema = z.object({
  title: z
    .string()
    .min(1, { error: 'Title is required' })
    .max(200, { error: 'Title must be less than 200 characters' }),

  metaDescription: z
    .string()
    .max(500, { error: 'Meta description must be less than 500 characters' })
    .optional(),

  description: z
    .string()
    .max(100, { error: 'Description must be less than 100 characters' })
    .optional(),

  order: z.coerce.number().int().min(0).max(9999).optional(),

  tags: z.array(z.string().min(1).max(50)).max(10, { error: 'Maximum 10 tags allowed' }).optional(),
  draft: z.boolean().optional().default(false),
  sidebar: docsSidebarSchema,
});

export const collections = {
  docs: defineCollection({
    loader: glob({
      pattern: '**/*.{md,mdx}',
      base: './src/content/docs',
      generateId: generateDocsEntryId,
      retainBody: false,
    }),
    schema: docsSchema,
  }),
};

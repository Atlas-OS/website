import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const docsSidebarSchema = z
  .object({
    label: z.string().min(1).max(80).optional(),
    order: z.coerce.number().int().min(0).max(9999).optional(),
    badge: z.string().min(1).max(30).optional(),
    hidden: z.boolean().optional().default(false),
    collapsed: z.boolean().optional().default(false),
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

  author: z.string().max(100).optional(),

  lastUpdated: z.coerce.date().optional(),

  tags: z.array(z.string().min(1).max(50)).max(10, { error: 'Maximum 10 tags allowed' }).optional(),

  category: z.string().max(100).optional(),

  image: z
    .url({ error: 'Image must be a valid URL' })
    .refine(value => value.length <= 2048, {
      error: 'Image URL must be less than 2048 characters',
    })
    .optional(),

  type: z.enum(['guide', 'reference', 'tutorial', 'faq']).optional().default('guide'),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/, {
      error: 'Slug must be lowercase and path-safe (example: install/requirements)',
    })
    .optional(),
  draft: z.boolean().optional().default(false),
  sidebar: docsSidebarSchema,
});

export const collections = {
  docs: defineCollection({
    loader: glob({
      pattern: '**/*.{md,mdx}',
      base: './src/content/docs',
    }),
    schema: docsSchema,
  }),
};

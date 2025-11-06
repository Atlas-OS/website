import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Schema for documentation content entries
 *
 * This schema defines the frontmatter structure for all documentation files.
 * Astro will automatically validate all MDX/MD files against this schema.
 *
 * @see https://docs.astro.build/en/guides/content-collections/#defining-collections
 */
const docsSchema = z.object({
  /**
   * Page title (required, 1-200 characters)
   * Used for page headings and SEO meta titles
   */
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),

  /**
   * Meta description (optional, max 500 characters, recommended 150-160)
   * Used for SEO meta tags, Open Graph descriptions, and structured data
   */
  metaDescription: z
    .string()
    .max(500, 'Meta description must be less than 500 characters')
    .optional(),

  /**
   * Short description for OG images (optional, max 100 characters, recommended 60-80)
   * Used for text displayed on Open Graph images
   */
  description: z.string().max(100, 'Description must be less than 100 characters').optional(),

  /**
   * Display order for navigation (optional, 0-9999)
   * Lower numbers appear first in navigation menus
   */
  order: z.coerce.number().int().min(0).max(9999).optional(),

  /**
   * Author name (optional, max 100 characters)
   * Used for attribution
   */
  author: z.string().max(100).optional(),

  /**
   * Last updated date (optional)
   * Should be a valid date string (ISO 8601 recommended)
   */
  lastUpdated: z.coerce.date().optional(),

  /**
   * Content tags (optional, max 10 tags, each 1-50 characters)
   * Used for categorization and search
   */
  tags: z.array(z.string().min(1).max(50)).max(10, 'Maximum 10 tags allowed').optional(),

  /**
   * Content category (optional, max 100 characters)
   * Used for grouping related content
   */
  category: z.string().max(100).optional(),

  /**
   * Featured image URL (optional, must be valid URL, max 2048 characters)
   * Used for Open Graph and social media previews
   */
  image: z.string().url('Image must be a valid URL').max(2048).optional(),

  /**
   * Content type (optional, defaults to 'guide')
   * Determines how the content is presented and categorized
   */
  type: z.enum(['guide', 'reference', 'tutorial', 'faq']).optional().default('guide'),
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

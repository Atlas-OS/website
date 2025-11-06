import type { CollectionEntry } from 'astro:content';

export interface NavItem {
  title: string;
  slug: string;
  children?: NavItem[];
  order?: number;
}

export interface SectionNavItem {
  sectionTitle: string;
  sectionSlug: string;
  items: NavItem[];
  order?: number;
}

export type DocsEntry = CollectionEntry<'docs'>;

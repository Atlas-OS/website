import type { CollectionEntry } from 'astro:content';

export interface NavItem {
  title: string;
  slug: string;
  description?: string;
  badge?: string;
  children?: NavItem[];
  order?: number;
}

export interface SectionNavItem {
  sectionTitle: string;
  sectionSlug: string;
  sectionDescription?: string;
  badge?: string;
  items: NavItem[];
  order?: number;
}

export type DocsEntry = CollectionEntry<'docs'>;

export interface BuildNavigationOptions {
  scope: 'full' | 'section';
  section?: string | null;
}

export interface PageNavLink {
  href: string;
  title: string;
  description?: string;
}

export interface PrevNextPages {
  prev: PageNavLink | null;
  next: PageNavLink | null;
}

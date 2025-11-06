/**
 * Centralized constants for the AtlasOS documentation site
 */

export const DEFAULT_LOCALE = 'en' as const;

export const AVAILABLE_LOCALES = ['en'] as const;

export const SECTION_PRIORITIES: Record<string, number> = {
  install: 1,
  upgrade: 2,
  'essential-setup': 3,
  'atlas-configuration': 4,
  faq: 5,
  contributing: 6,
  branding: 7,
} as const;

export const SITE_URL = 'https://atlasos.net' as const;

export const DEFAULT_META_DESCRIPTION =
  'AtlasOS Documentation - Your guide to optimizing Windows performance.' as const;

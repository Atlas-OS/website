export const SECTION_PRIORITIES: Record<string, number> = {
  install: 1,
  upgrade: 2,
  'essential-setup': 3,
  'atlas-configuration': 4,
  faq: 5,
  contributing: 6,
  branding: 7,
};

export const SITE_URL = 'https://atlasos.net' as const;

export const DEFAULT_OG_IMAGE = `${SITE_URL}/defaultimg.png` as const;

export const DEFAULT_META_DESCRIPTION =
  'AtlasOS Documentation - Your guide to optimizing Windows performance.' as const;

export const ATLAS_VERSION = '0.5.0-hotfix' as const;

export const ATLAS_RELEASE_LABEL = 'Atlas v0.5.0 (October 21 2025)' as const;

export const ATLAS_API_URL = 'https://api.atlasos.net/' as const;

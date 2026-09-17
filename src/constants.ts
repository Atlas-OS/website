export const SITE_URL = 'https://atlasos.net' as const;

export const SITE_NAME = 'AtlasOS' as const;

export const DEFAULT_OG_IMAGE = `${SITE_URL}/defaultimg.png` as const;

export const DEFAULT_META_DESCRIPTION =
  'AtlasOS - An optimized Windows experience with stronger performance, better privacy, and cleaner defaults.' as const;

/** Public release fallback shown before the latest-release API responds. */
export const ATLAS_RELEASE_TAG_FALLBACK = '0.5.0-hotfix' as const;

export const ATLAS_RELEASE_LABEL = `Atlas v${ATLAS_RELEASE_TAG_FALLBACK}` as const;

export const ATLAS_API_URL = 'https://api.atlasos.net/' as const;

export const ATLAS_GITHUB_LATEST_RELEASE_API_URL =
  'https://api.github.com/repos/Atlas-OS/Atlas/releases/latest' as const;

export const ATLAS_GITHUB_LATEST_RELEASE_URL =
  'https://github.com/Atlas-OS/Atlas/releases/latest' as const;

export const CONTACT_EMAIL = 'contact@atlasos.net' as const;

export const SOCIAL_LINKS = {
  github: 'https://github.com/Atlas-OS/Atlas',
  discord: 'https://discord.com/invite/atlasos',
  x: 'https://x.com/atlasos',
} as const;

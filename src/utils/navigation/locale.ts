import { DEFAULT_LOCALE } from '@/constants';

/**
 * Detect current locale from URL pathname.
 *
 * @param pathname - The pathname from Astro.url.pathname
 * @returns The detected locale string (e.g., 'en', 'fr'), or DEFAULT_LOCALE
 *
 * @example
 * getCurrentLocale('/fr/docs/install/') // 'fr'
 * getCurrentLocale('/docs/install/') // 'en'
 */
export function getCurrentLocale(pathname: string): string {
  if (!pathname || pathname === '/') return DEFAULT_LOCALE;
  const match = pathname.match(/^\/([a-z]{2}(?:-[a-z]{2})?)\//);
  return match?.[1] || DEFAULT_LOCALE;
}

/**
 * Convert locale code to full language code format.
 *
 * @param locale - The locale string (e.g., 'en', 'fr')
 * @returns The language code (e.g., 'en-US', 'fr-FR')
 *
 * @example
 * getLangCode('en') // 'en-US'
 * getLangCode('fr') // 'fr'
 */
export function getLangCode(locale: string): string {
  return locale === 'en' ? 'en-US' : locale;
}

/**
 * Check if a locale is the default locale.
 *
 * @param locale - The locale to check
 * @param defaultLocale - The default locale code
 * @returns True if the locale is the default
 */
export function isDefaultLocale(
  locale: string | null | undefined,
  defaultLocale: string = DEFAULT_LOCALE,
): boolean {
  return !locale || locale === defaultLocale;
}

/**
 * Get the locale prefix for URLs.
 * Returns empty string for default locale.
 *
 * @param locale - The locale code
 * @param defaultLocale - The default locale code
 * @returns URL prefix (e.g., 'fr/' or '')
 */
export function getLocalePrefix(
  locale: string | null | undefined,
  defaultLocale: string = DEFAULT_LOCALE,
): string {
  if (isDefaultLocale(locale, defaultLocale)) {
    return '';
  }
  return `${locale}/`;
}

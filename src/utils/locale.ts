import { DEFAULT_LOCALE } from '@/constants';

/**
 * Detect current locale from URL pathname
 * @param pathname - The pathname from Astro.url.pathname
 * @returns The detected locale string (e.g., 'en', 'fr'), or DEFAULT_LOCALE
 */
export function getCurrentLocale(pathname: string): string {
  if (!pathname || pathname === '/') return DEFAULT_LOCALE;
  const match = pathname.match(/^\/([a-z]{2}(?:-[a-z]{2})?)\//);
  return match?.[1] || DEFAULT_LOCALE;
}

/**
 * Convert locale code to language code format (e.g., 'en' -> 'en-US')
 * @param locale - The locale string (e.g., 'en', 'fr')
 * @returns The language code (e.g., 'en-US', 'fr-FR')
 */
export function getLangCode(locale: string): string {
  return locale === 'en' ? 'en-US' : locale;
}

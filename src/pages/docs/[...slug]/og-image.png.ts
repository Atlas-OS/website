import type { APIRoute } from 'astro';
import satori from 'satori';
import sharp from 'sharp';
import { getCollection } from 'astro:content';
import { DEFAULT_LOCALE } from '@/constants';
import { getLocaleFromId, getSlugFromId, getSectionFromSlug } from '@/utils/navigation';
import { readFile } from 'fs/promises';
import { resolve } from 'path';

let interFontData: ArrayBuffer | null = null;
let interBoldFontData: ArrayBuffer | null = null;

async function loadInterFont(): Promise<ArrayBuffer> {
  if (interFontData) return interFontData;

  const fontPath = resolve(process.cwd(), 'public/fonts/inter-latin-500-normal.ttf');
  const fontBuffer = await readFile(fontPath);
  interFontData = fontBuffer.buffer;
  return interFontData;
}

async function loadInterBoldFont(): Promise<ArrayBuffer> {
  if (interBoldFontData) return interBoldFontData;

  interBoldFontData = await loadInterFont();
  return interBoldFontData;
}

export async function getStaticPaths() {
  const defaultLocale = DEFAULT_LOCALE;
  const docs = await getCollection('docs');

  const paths = docs
    .map(entry => {
      const locale = getLocaleFromId(entry.id, defaultLocale);
      const slug = getSlugFromId(entry.id, defaultLocale);

      if (slug === '/docs/' || slug === '/docs') {
        return null;
      }

      const slugString = slug
        .replace(/^\/docs\/?/, '')
        .replace(/^\/+/, '')
        .replace(/\/+$/, '');

      if (!slugString) {
        return null;
      }

      const paramsSlug = locale ? `${locale}/${slugString}` : slugString;

      return {
        params: { slug: paramsSlug },
        props: { entry, locale: locale || defaultLocale },
      };
    })
    .filter((path): path is NonNullable<typeof path> => path !== null);

  return paths;
}

async function loadAtlasLogo(): Promise<string> {
  try {
    const logoPath = resolve(process.cwd(), 'src/assets/atlas-logo-white.svg');
    const logoSvg = await readFile(logoPath, 'utf-8');
    const base64Svg = Buffer.from(logoSvg).toString('base64');
    return `data:image/svg+xml;base64,${base64Svg}`;
  } catch (error) {
    console.warn('Could not load Atlas logo:', error);
    return '';
  }
}

function getSectionIconPath(section: string | null): string {
  const icons: Record<string, string> = {
    install: 'M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2 M7 11l5 5l5 -5 M12 4l0 12',
    upgrade: 'M12 5l0 14 M18 11l-6 -6 M6 11l6 -6',
    'essential-setup':
      'M5 5m0 1a1 1 0 0 1 1 -1h12a1 1 0 0 1 1 1v12a1 1 0 0 1 -1 1h-12a1 1 0 0 1 -1 -1z M9 9h6v6h-6z M3 10h2 M3 14h2 M10 3v2 M14 3v2 M20 10h-2 M20 14h-2 M14 21v-2 M10 21v-2',
    'atlas-configuration':
      'M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0',
    faq: 'M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0 M12 16v.01 M12 13a2 2 0 0 0 .914 -3.782a1.98 1.98 0 0 0 -2.414 .483',
    contributing: 'M7 8l-4 4l4 4 M17 8l4 4l-4 4 M14 4l-4 16',
    branding:
      'M12 21a9 9 0 0 1 0 -18c4.97 0 9 3.582 9 8c0 1.06 -.474 2.078 -1.318 2.828c-.844 .75 -1.989 1.172 -3.182 1.172h-2.5a2 2 0 0 0 -1 3.75a1.3 1.3 0 0 1 -1 2.25 M8.5 10.5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0 M12.5 7.5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0 M16.5 10.5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0',
    toolbox:
      'M3 21h4l13 -13a1.5 1.5 0 0 0 -4 -4l-13 13v4 M14.5 5.5l4 4 M12 8l-5 -5l-4 4l5 5 M7 8l-1.5 1.5 M16 12l5 5l-4 4l-5 -5 M16 17l-1.5 1.5',
  };

  const defaultIcon =
    'M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0';

  return icons[section || ''] || defaultIcon;
}

export const GET: APIRoute = async function get({ props }) {
  const { entry } = props as {
    entry: { data: { title: string; description?: string }; id: string };
    locale: string;
  };
  const title = entry.data.title || 'AtlasOS Documentation';
  const description = entry.data.description || '';

  const slug = getSlugFromId(entry.id, DEFAULT_LOCALE);
  const section = getSectionFromSlug(slug);
  const sectionIconPath = getSectionIconPath(section);

  const fontData = await loadInterFont();
  const boldFontData = await loadInterBoldFont();
  const fonts = [
    {
      name: 'Inter',
      data: fontData,
      weight: 400,
      style: 'normal' as const,
    },
    {
      name: 'Inter',
      data: boldFontData,
      weight: 700,
      style: 'normal' as const,
    },
  ];

  const logoDataUri = await loadAtlasLogo();

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '60px 80px',
          fontFamily: 'Inter, system-ui, sans-serif',
          position: 'relative',
          background: '#1990fe',
        },
        children: [
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '40px',
              },
              children: [
                logoDataUri
                  ? {
                      type: 'img',
                      props: {
                        src: logoDataUri,
                        width: 56,
                        height: 49,
                        style: {
                          width: '56px',
                          height: '49px',
                        },
                      },
                    }
                  : null,
                {
                  type: 'div',
                  props: {
                    style: {
                      fontSize: '28px',
                      fontWeight: 500,
                      color: '#ffffff',
                      letterSpacing: '-0.01em',
                    },
                    children: 'Atlas Documentation',
                  },
                },
              ].filter(Boolean),
            },
          },
          {
            type: 'div',
            props: {
              style: {
                fontSize: '72px',
                fontWeight: 700,
                color: '#ffffff',
                lineHeight: 1.1,
                maxWidth: '800px',
                marginBottom: 'auto',
                marginTop: '60px',
                wordWrap: 'break-word',
                letterSpacing: '-0.02em',
              },
              children: title,
            },
          },
          description
            ? {
                type: 'div',
                props: {
                  style: {
                    fontSize: '20px',
                    fontWeight: 400,
                    color: 'rgba(255, 255, 255, 0.9)',
                    lineHeight: 1.5,
                    maxWidth: '700px',
                    marginTop: 'auto',
                    wordWrap: 'break-word',
                  },
                  children: description,
                },
              }
            : null,
          // Decorative icon on the right
          {
            type: 'svg',
            props: {
              style: {
                position: 'absolute',
                right: '40px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '360px',
                height: '360px',
                opacity: 0.15,
                overflow: 'visible',
              },
              width: '360',
              height: '360',
              viewBox: '0 0 24 24',
              fill: 'none',
              stroke: '#ffffff',
              strokeWidth: '2',
              children: [
                {
                  type: 'path',
                  props: {
                    d: sectionIconPath,
                  },
                },
              ],
            },
          },
        ].filter(Boolean),
      },
    },
    {
      width: 1200,
      height: 630,
      fonts,
    },
  );

  const png = await sharp(Buffer.from(svg)).png().toBuffer();

  return new Response(png, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};

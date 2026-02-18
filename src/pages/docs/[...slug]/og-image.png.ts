import { getSectionFromSlug, getSlugFromEntry } from '@/utils/navigation';
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import satori from 'satori';
import sharp from 'sharp';

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

  const fontPath = resolve(process.cwd(), 'public/fonts/inter-latin-700-normal.woff');
  const fontBuffer = await readFile(fontPath);
  interBoldFontData = fontBuffer.buffer;
  return interBoldFontData;
}

export async function getStaticPaths() {
  const docs = await getCollection('docs', entry => !entry.data.draft);

  const paths = docs
    .map(entry => {
      const slug = getSlugFromEntry(entry);

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

      return {
        params: { slug: slugString },
        props: { entry },
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

function getSectionIconPaths(section: string | null): string[] {
  const icons: Record<string, string[]> = {
    install: ['M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 11l5 5l5-5m-5-7v12'],
    upgrade: ['M12 5v14m6-8l-6-6m-6 6l6-6'],
    'essential-setup': [
      'M5 6a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z',
      'M9 9h6v6H9zm-6 1h2m-2 4h2m5-11v2m4-2v2m7 5h-2m2 4h-2m-5 7v-2m-4 2v-2',
    ],
    'atlas-configuration': [
      'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37c1 .608 2.296.07 2.572-1.065',
      'M9 12a3 3 0 1 0 6 0a3 3 0 0 0-6 0',
    ],
    faq: [
      'M3 12a9 9 0 1 0 18 0a9 9 0 0 0-18 0m9 4v.01',
      'M12 13a2 2 0 0 0 .914-3.782a1.98 1.98 0 0 0-2.414.483',
    ],
    contributing: [
      'M4 18a2 2 0 1 0 4 0a2 2 0 1 0-4 0M4 6a2 2 0 1 0 4 0a2 2 0 1 0-4 0m12 12a2 2 0 1 0 4 0a2 2 0 1 0-4 0M6 8v8',
      'M11 6h5a2 2 0 0 1 2 2v8',
      'm14 9l-3-3l3-3',
    ],
    branding: [
      'M12 21a9 9 0 0 1 0-18c4.97 0 9 3.582 9 8c0 1.06-.474 2.078-1.318 2.828S17.693 15 16.5 15H14a2 2 0 0 0-1 3.75A1.3 1.3 0 0 1 12 21',
      'M7.5 10.5a1 1 0 1 0 2 0a1 1 0 1 0-2 0m4-3a1 1 0 1 0 2 0a1 1 0 1 0-2 0m4 3a1 1 0 1 0 2 0a1 1 0 1 0-2 0',
    ],
    toolbox: [
      'M3 21h4L20 8a1.5 1.5 0 0 0-4-4L3 17z',
      'M14.5 5.5l4 4',
      'M12 8L7 3L3 7l5 5M7 8L5.5 9.5M16 12l5 5l-4 4l-5-5m4 1l-1.5 1.5',
    ],
  };

  const defaultPaths = [
    'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37c1 .608 2.296.07 2.572-1.065',
    'M9 12a3 3 0 1 0 6 0a3 3 0 0 0-6 0',
  ];

  return icons[section ?? ''] ?? defaultPaths;
}

export const GET: APIRoute = async function get({ props }) {
  const { entry } = props as {
    entry: { data: { title: string; description?: string }; id: string };
  };
  const title = entry.data.title || 'AtlasOS Documentation';
  const description = entry.data.description || '';

  const slug = getSlugFromEntry(entry);
  const section = getSectionFromSlug(slug);
  const sectionIconPaths = getSectionIconPaths(section);

  const fontData = await loadInterFont();
  const boldFontData = await loadInterBoldFont();
  const fonts = [
    {
      name: 'Inter',
      data: fontData,
      weight: 400 as const,
      style: 'normal' as const,
    },
    {
      name: 'Inter',
      data: boldFontData,
      weight: 700 as const,
      style: 'normal' as const,
    },
  ];

  const logoDataUri = await loadAtlasLogo();

  const ICON_SIZE = 300;
  const ICON_TOP = Math.round((630 - ICON_SIZE) / 2) + 20;

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '52px 76px',
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
                gap: '14px',
              },
              children: [
                logoDataUri
                  ? {
                      type: 'img',
                      props: {
                        src: logoDataUri,
                        width: 44,
                        height: 38,
                        style: { width: '44px', height: '38px' },
                      },
                    }
                  : null,
                {
                  type: 'div',
                  props: {
                    style: {
                      fontSize: '24px',
                      fontWeight: 500,
                      color: 'rgba(255,255,255,0.8)',
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
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      fontSize: '64px',
                      fontWeight: 700,
                      color: '#ffffff',
                      lineHeight: 1.05,
                      maxWidth: '720px',
                      wordWrap: 'break-word',
                      letterSpacing: '-0.035em',
                    },
                    children: title,
                  },
                },
                description
                  ? {
                      type: 'div',
                      props: {
                        style: {
                          fontSize: '22px',
                          fontWeight: 400,
                          color: 'rgba(255,255,255,0.85)',
                          lineHeight: 1.45,
                          maxWidth: '680px',
                          wordWrap: 'break-word',
                        },
                        children: description,
                      },
                    }
                  : null,
              ].filter(Boolean),
            },
          },
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                justifyContent: 'flex-end',
              },
              children: {
                type: 'div',
                props: {
                  style: {
                    fontSize: '18px',
                    fontWeight: 400,
                    color: 'rgba(255,255,255,0.55)',
                  },
                  children: 'atlasos.net',
                },
              },
            },
          },
          {
            type: 'svg',
            props: {
              style: {
                position: 'absolute',
                right: '60px',
                top: `${ICON_TOP}px`,
                opacity: 0.15,
              },
              width: String(ICON_SIZE),
              height: String(ICON_SIZE),
              viewBox: '0 0 24 24',
              fill: 'none',
              stroke: '#ffffff',
              strokeWidth: '1.5',
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
              children: sectionIconPaths.map(d => ({
                type: 'path',
                props: { d },
              })),
            },
          },
        ],
      },
    } as Parameters<typeof satori>[0],
    {
      width: 1200,
      height: 630,
      fonts,
    },
  );

  const png = await sharp(Buffer.from(svg)).png().toBuffer();

  return new Response(png as unknown as BodyInit, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};

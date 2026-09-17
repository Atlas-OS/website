import {
  docsEntryPath,
  docsRouteParam,
  docsSectionKey,
  getDocsEntries,
  type DocsEntry,
} from '@/utils/docs';
import type { APIRoute, GetStaticPaths } from 'astro';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import satori, { type Font, type SatoriOptions } from 'satori';
import sharp from 'sharp';

interface Props {
  entry: DocsEntry;
}

const WIDTH = 1200;
const HEIGHT = 630;
const ICON_SIZE = 300;
const BRAND_BLUE = '#1990fe';

const FONT_FILES = [
  { path: 'public/fonts/inter-latin-500-normal.ttf', weight: 500 },
  { path: 'public/fonts/inter-latin-700-normal.woff', weight: 700 },
] as const;

const SECTION_ICON_PATHS: Record<string, string[]> = {
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

const projectFile = (path: string) => resolve(process.cwd(), path);

let fontsPromise: Promise<Font[]> | undefined;
let logoPromise: Promise<string> | undefined;

function loadFonts(): Promise<Font[]> {
  fontsPromise ??= Promise.all(
    FONT_FILES.map(async ({ path, weight }) => {
      const data = await readFile(projectFile(path)).catch((error: unknown) => {
        throw new Error(`Failed to load OG image font at ${path}.`, { cause: error });
      });
      return { name: 'Inter', data, weight, style: 'normal' } satisfies Font;
    }),
  );
  return fontsPromise;
}

function loadLogoDataUri(): Promise<string> {
  logoPromise ??= readFile(projectFile('src/assets/atlas-logo-white.svg'), 'utf-8').then(
    svg => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
  );
  return logoPromise;
}

export const getStaticPaths = (async () => {
  const entries = await getDocsEntries();

  return entries.flatMap(entry => {
    const slug = docsRouteParam(entry);
    return slug ? [{ params: { slug }, props: { entry } }] : [];
  });
}) satisfies GetStaticPaths;

/* Satori accepts React-like element objects; these helpers keep the layout readable. */
type Node = { type: string; props: Record<string, unknown> };
const el = (
  type: string,
  style: Record<string, unknown>,
  children?: unknown,
  extra?: Record<string, unknown>,
): Node => ({
  type,
  props: { style, children, ...extra },
});

export const GET: APIRoute<Props> = async ({ props }) => {
  const { entry } = props;
  const section = docsSectionKey(docsEntryPath(entry));
  const iconPaths = SECTION_ICON_PATHS[section ?? ''] ?? SECTION_ICON_PATHS['atlas-configuration']!;
  const [fonts, logo] = await Promise.all([loadFonts(), loadLogoDataUri()]);

  const svg = await satori(
    el(
      'div',
      {
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '52px 76px',
        fontFamily: 'Inter, system-ui, sans-serif',
        position: 'relative',
        background: BRAND_BLUE,
      },
      [
        el('div', { display: 'flex', alignItems: 'center', gap: '14px' }, [
          {
            type: 'img',
            props: { src: logo, width: 44, height: 38, style: { width: '44px', height: '38px' } },
          },
          el(
            'div',
            {
              fontSize: '24px',
              fontWeight: 500,
              color: 'rgba(255,255,255,0.8)',
              letterSpacing: '-0.01em',
            },
            'Atlas Documentation',
          ),
        ]),
        el('div', { display: 'flex', flexDirection: 'column', gap: '16px' }, [
          el(
            'div',
            {
              fontSize: '64px',
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1.05,
              maxWidth: '720px',
              wordWrap: 'break-word',
              letterSpacing: '-0.035em',
            },
            entry.data.title,
          ),
          entry.data.description
            ? el(
                'div',
                {
                  fontSize: '22px',
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.85)',
                  lineHeight: 1.45,
                  maxWidth: '680px',
                  wordWrap: 'break-word',
                },
                entry.data.description,
              )
            : null,
        ]),
        el('div', { display: 'flex', justifyContent: 'flex-end' }, [
          el(
            'div',
            { fontSize: '18px', fontWeight: 500, color: 'rgba(255,255,255,0.55)' },
            'atlasos.net',
          ),
        ]),
        el(
          'svg',
          {
            position: 'absolute',
            right: '60px',
            top: `${Math.round((HEIGHT - ICON_SIZE) / 2) + 20}px`,
            opacity: 0.15,
          },
          iconPaths.map(d => ({ type: 'path', props: { d } })),
          {
            width: String(ICON_SIZE),
            height: String(ICON_SIZE),
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: '#ffffff',
            strokeWidth: '1.5',
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
          },
        ),
      ],
    ) as Parameters<typeof satori>[0],
    { width: WIDTH, height: HEIGHT, fonts } satisfies SatoriOptions,
  );

  const { data: png } = await sharp(Buffer.from(svg), {
    density: 72,
    failOn: 'error',
    limitInputPixels: WIDTH * HEIGHT,
  })
    .png()
    .toUint8Array();

  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};

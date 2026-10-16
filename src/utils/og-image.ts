import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import satori, { type Font } from 'satori';
import sharp from 'sharp';

type Node = { type: string; props: Record<string, unknown> };
const el = (
  type: string,
  style: Record<string, unknown>,
  children?: unknown,
  props?: Record<string, unknown>,
): Node => ({ type, props: { style, children, ...props } });
const image = (src: string, style: Record<string, unknown>) => el('img', style, undefined, { src });
const file = (path: string) => readFile(resolve(process.cwd(), path));
const dataUri = (bytes: Buffer, mime: string) => `data:${mime};base64,${bytes.toString('base64')}`;

// Keep build-time assets local: social crawlers receive a complete static PNG.
const assets = Promise.all([
  file('public/fonts/inter-latin-500-normal.ttf'),
  file('public/fonts/inter-latin-700-normal.woff'),
  file('src/assets/atlas-logomark.svg'),
  // The right-hand portion contains only contours, outside the wallpaper's wordmark.
  file('src/assets/atlas-wallpaper.webp').then(bytes =>
    sharp(bytes)
      .extract({ left: 1200, top: 0, width: 720, height: 740 })
      .resize(620, 638)
      .png()
      .toBuffer(),
  ),
]);

export async function renderOgImage({ title, section }: { title: string; section?: string }) {
  const [regular, bold, wordmark, contours] = await assets;
  const fonts: Font[] = [
    { name: 'Inter', data: regular, weight: 500, style: 'normal' },
    { name: 'Inter', data: bold, weight: 700, style: 'normal' },
  ];
  // Section landing pages already name their section in the title.
  const eyebrow = section && section.toLowerCase() !== title.toLowerCase() ? section : undefined;

  for (const fontSize of [80, 74, 68, 62, 56]) {
    let titleHeight = 0;
    const svg = await satori(
      el(
        'div',
        {
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#0c1017',
          color: '#f0f6ff',
          fontFamily: 'Inter',
        },
        [
          image(dataUri(contours, 'image/png'), {
            position: 'absolute',
            right: 0,
            top: 0,
            width: 620,
            height: 638,
            opacity: 0.8,
          }),
          el('div', {
            position: 'absolute',
            left: 0,
            top: 0,
            width: 1200,
            height: 630,
            backgroundImage:
              'linear-gradient(90deg, #0c1017 0%, #0c1017 40%, rgba(12,16,23,0.87) 65%, rgba(12,16,23,0.12) 100%)',
          }),
          el(
            'div',
            {
              position: 'absolute',
              left: 72,
              top: 64,
              display: 'flex',
              alignItems: 'center',
              gap: 28,
            },
            [
              image(dataUri(wordmark, 'image/svg+xml'), { width: 156, height: 33 }),
              el('div', { width: 1, height: 30, backgroundColor: '#435064' }),
              el('div', { fontSize: 25, color: '#b5c2d5' }, 'Documentation'),
            ],
          ),
          el(
            'div',
            {
              position: 'absolute',
              left: 72,
              top: eyebrow ? 226 : 278,
              width: 990,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
            },
            [
              ...(eyebrow
                ? [el('div', { fontSize: 25, color: '#79bdff', marginBottom: 22 }, eyebrow)]
                : []),
              el(
                'div',
                {
                  fontSize,
                  fontWeight: 700,
                  lineHeight: 1.1,
                  letterSpacing: '-0.035em',
                  textWrap: 'balance',
                  width: 990,
                },
                title,
                { 'data-og-title': true },
              ),
            ],
          ),
          el(
            'div',
            {
              position: 'absolute',
              left: 72,
              bottom: 58,
              color: '#a1b0c4',
              fontSize: 22,
            },
            'atlasos.net/docs',
          ),
        ],
      ) as Parameters<typeof satori>[0],
      {
        width: 1200,
        height: 630,
        fonts,
        onNodeDetected(node) {
          if (node.props['data-og-title']) titleHeight = node.height;
        },
      },
    );
    // Fit real rendered text, not a character-count guess. Never silently clip future titles.
    if (titleHeight > 240) continue;
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    return new Response(new Uint8Array(png), {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' },
    });
  }
  throw new Error(`Documentation OG title exceeds the safe area: ${title}`);
}

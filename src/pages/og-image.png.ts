import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

// Actual homepage capture, reduced to the standard social preview dimensions.
export const GET = async () => {
  const capture = await readFile(resolve(process.cwd(), 'src/assets/homepage-og-capture.png'));
  const png = await sharp(capture).resize(1200, 630).png().toBuffer();
  return new Response(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' },
  });
};

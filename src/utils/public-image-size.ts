/**
 * The intrinsic size of an image in `public/`, read at build time, so an `<img>` given only a path
 * can still carry width and height and reserve its space before it loads (no layout shift).
 * Returns undefined for anything that isn't a local public file or can't be read.
 */
import path from 'node:path';
import sharp from 'sharp';

export interface ImageSize {
  width: number;
  height: number;
}

const cache = new Map<string, Promise<ImageSize | undefined>>();

/** A site-relative path such as `/assets/images/x.avif`; not protocol-relative or remote. */
export function isPublicPath(src: string): boolean {
  return src.startsWith('/') && !src.startsWith('//');
}

export function publicImageSize(src: string, root = process.cwd()): Promise<ImageSize | undefined> {
  if (!isPublicPath(src)) return Promise.resolve(undefined);
  const file = path.join(root, 'public', decodeURI(src.split(/[?#]/)[0] ?? src));
  let size = cache.get(file);
  if (!size) {
    size = sharp(file)
      .metadata()
      .then(({ width, height }) => (width && height ? { width, height } : undefined))
      .catch(() => undefined);
    cache.set(file, size);
  }
  return size;
}

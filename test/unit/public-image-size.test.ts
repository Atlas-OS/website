import { describe, expect, it } from 'vitest';
import { isPublicPath, publicImageSize } from '../../src/utils/public-image-size';

describe('public image size', () => {
  it('reads the intrinsic size of an image in public/', async () => {
    const size = await publicImageSize('/assets/images/brand/banners/preview-banner-v1.avif');
    expect(size?.width).toBeGreaterThan(0);
    expect(size?.height).toBeGreaterThan(0);
    // The banners are wide: about 1920 × 653.
    expect((size?.width ?? 0) / (size?.height ?? 1)).toBeGreaterThan(2.5);
  });

  it('leaves remote, protocol-relative and missing images alone', async () => {
    expect(isPublicPath('https://example.com/a.png')).toBe(false);
    expect(isPublicPath('//cdn.example.com/a.png')).toBe(false);
    expect(await publicImageSize('https://example.com/a.png')).toBeUndefined();
    expect(await publicImageSize('/assets/images/does-not-exist.avif')).toBeUndefined();
  });
});

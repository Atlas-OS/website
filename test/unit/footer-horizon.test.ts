import { describe, expect, it } from 'vitest';
import {
  BACK,
  CAMP,
  FLAG,
  HORIZON,
  NEAR,
  ridgeAt,
  SAFE,
  STARS,
  SUMMIT,
} from '../../src/utils/footer-horizon';
import { MARK, markPoint } from '../../src/utils/hero-summit-geometry';

/** The visible band of the horizon when it is sliced to `width` × `height` px (xMidYMax slice). */
function visible(width: number, height: number): { from: number; to: number } {
  const scale = Math.max(width / HORIZON.width, height / HORIZON.height);
  const span = width / scale;
  return { from: (HORIZON.width - span) / 2, to: (HORIZON.width + span) / 2 };
}

describe('footer horizon', () => {
  it('keeps the summit and the camp in the band every footer width shows', () => {
    // The footer's height is clamp(80px, 8.75vw, 150px).
    for (const width of [360, 390, 768, 1024, 1440, 1920, 2560]) {
      const height = Math.min(150, Math.max(80, width * 0.0875));
      const band = visible(width, height);
      expect(band.from).toBeLessThanOrEqual(SAFE.from);
      expect(band.to).toBeGreaterThanOrEqual(SAFE.to);
    }
    const summitHalf = (ridgeAt(BACK.points, SUMMIT.apex[0]) - SUMMIT.apex[1]) * 0.6;
    expect(SUMMIT.apex[0] - summitHalf).toBeGreaterThan(SAFE.from);
    expect(CAMP.to).toBeLessThan(SAFE.to);
    expect(CAMP.from).toBeGreaterThan(SAFE.from);
    expect(CAMP.from).toBeGreaterThan(SUMMIT.apex[0] + summitHalf);
  });

  it('stands the summit clear of the back range, notch and all, with its flag in the sky', () => {
    const crest = ridgeAt(BACK.points, SUMMIT.apex[0]);
    const [, notchFloor] = markPoint(MARK.lowerLeft, SUMMIT.apex, SUMMIT.scale);
    expect(notchFloor).toBeLessThan(crest);
    expect(FLAG.top).toBeGreaterThan(0);
    expect(FLAG.bottom).toBeGreaterThan(SUMMIT.apex[1]);
  });

  it('sets the camp on the near ridge, its knoll level under the tents', () => {
    // Settled a fraction into the ground, never floating above it.
    const ground = ridgeAt(NEAR.points, CAMP.fire[0]);
    expect(CAMP.fire[1]).toBeGreaterThanOrEqual(ground);
    expect(CAMP.fire[1] - ground).toBeLessThan(1);
    // Level enough that neither tent's feet stand more than a unit off the line.
    for (const x of [CAMP.from + 30, CAMP.to - 20]) {
      expect(Math.abs(ridgeAt(NEAR.points, x) - CAMP.fire[1])).toBeLessThan(1.6);
    }
    // The camp's ground line (y = 80 in camp units) lands on the fire's ground.
    const [, tx, ty, scale] =
      /translate\(([\d.-]+) ([\d.-]+)\) scale\(([\d.]+)\)/.exec(CAMP.transform) ?? [];
    expect(Number(ty) + 80 * Number(scale)).toBeCloseTo(CAMP.fire[1], 0);
    expect(Number(tx) + 128 * Number(scale)).toBeCloseTo(CAMP.fire[0], 0);
    for (const d of [SUMMIT.notch, BACK.edge, NEAR.edge]) {
      expect(d).toMatch(/^M/);
      expect(d).not.toMatch(/NaN|undefined/);
    }
  });

  it('keeps its stars in the sky, clear of the summit and its flag', () => {
    for (const [x, y] of STARS) {
      expect(y).toBeLessThan(ridgeAt(BACK.points, x) - 20);
      const nearSummit = Math.abs(x - SUMMIT.apex[0]) < 40;
      expect(nearSummit).toBe(false);
    }
  });
});

import { describe, expect, it } from 'vitest';
import { FLAME_FRAMES, LOGS, STONES, TENTS } from '../../src/utils/hero-camp-geometry';
import {
  CAMP_GROUND,
  cloudBand,
  CAMP_GROUND_NARROW,
  DOCS_RIDGE,
  FOG,
  LANTERN_TRACK,
  lanternRoute,
  MARK,
  MARK_SLOPE,
  MOON,
  PEAK,
  RIDGES,
  scatterStars,
  STAGE_FADE_IN_TO,
  stageFadeMask,
  SUMMIT,
  WINDOW,
} from '../../src/utils/hero-summit-geometry';

describe('hero summit geometry', () => {
  it('extends every cloud in a band down to its lowest base, so the fade clears every one', () => {
    const band = cloudBand([
      { x: 0, y: 10, width: 100, height: 20 },
      { x: 200, y: 30, width: 100, height: 20 },
    ]);
    // The higher cloud's body runs down to the lower cloud's base; the lowest needs no extension.
    expect(band).toContain('L100 30L0 30Z');
    expect(band.split('M')[2]).not.toContain('L');
  });

  it('keeps the near crest behind the window, so it never dips into view below the app', () => {
    // A cubic Bézier stays inside its control points' hull, so checking anchors and controls is enough.
    const numbers = (RIDGES.near.edge.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
    const points = numbers.flatMap((value, i) =>
      i % 2 === 0 ? [[value, numbers[i + 1] ?? NaN] as const] : [],
    );
    const underWindow = points.filter(([x]) => Math.abs(x) <= WINDOW.width / 2 + 20);
    expect(underWindow.length).toBeGreaterThan(2);
    for (const [, y] of underWindow) expect(y).toBeLessThan(WINDOW.height);
  });
  it('fades the stage in at its top edge and out at its foot, so neither edge shows', () => {
    const stops = [...stageFadeMask().matchAll(/rgb\(0 0 0 \/ ([\d.]+)\) ([\d.]+)%/g)].map(
      ([, alpha, at]) => ({ alpha: Number(alpha), at: Number(at) }),
    );
    expect(stops[0]).toEqual({ alpha: 0, at: 0 });
    expect(stops.at(-1)).toEqual({ alpha: 0, at: 100 });
    expect(stops.every(({ alpha }) => alpha >= 0 && alpha <= 1)).toBe(true);
    expect(stops.map(({ at }) => at)).toEqual([...stops.map(({ at }) => at)].sort((a, b) => a - b));
    // Everything the scene draws (ridge peaks, the moon's disc, the flag) is below the fade-in.
    const highestRidge = Math.min(...Object.values(RIDGES).flatMap(ridge => ridgeTops(ridge.edge)));
    expect(STAGE_FADE_IN_TO).toBeLessThan(highestRidge);
    expect(STAGE_FADE_IN_TO).toBeLessThan(MOON.cy - MOON.r);
  });

  it('walks the lantern along the notch at the pace the CSS keyframes use', () => {
    // Keep in sync with `@keyframes summit-lantern` in SummitStage.astro.
    expect(lanternRoute()).toEqual([
      { at: 5, x: 0, y: 100 },
      { at: 38.42, x: 100, y: 100 },
      { at: 59.78, x: 68.32, y: 0 },
      { at: 68.76, x: 55.01, y: 42.01 },
      { at: 81, x: 18.38, y: 42.01 },
    ]);
  });

  it('stands the summit and its flag in front of the moon', () => {
    const [x, y] = SUMMIT.apex;
    expect(Math.hypot(x - MOON.cx, y - MOON.cy)).toBeLessThan(MOON.r * 0.8);
  });

  it('keeps the summit and its notch left of the window, and the camp on its right', () => {
    const windowEdge = WINDOW.width / 2;
    const [apexX, apexY] = PEAK.apex;
    // The summit's right slope, level with the notch's lower ledge, stays clear of the window.
    const ledgeDrop = (MARK.lowerLeft[1] - MARK.apex[1]) * PEAK.scale;
    expect(apexX + ledgeDrop * MARK_SLOPE).toBeLessThan(-windowEdge);
    expect(apexY).toBeGreaterThan(0);
    expect(CAMP_GROUND.x).toBeGreaterThan(windowEdge);
    expect(CAMP_GROUND_NARROW.x + CAMP_GROUND_NARROW.width).toBeLessThan(-windowEdge);
  });

  it("carries the mark's exact slopes from the apex down into the hills, with no base or shoulders", () => {
    const [left, apex, right] = [
      ...SUMMIT.markEdge.matchAll(/-?\d+(?:\.\d+)? -?\d+(?:\.\d+)?/g),
    ].map(([pair]) => pair.split(' ').map(Number) as [number, number]) as [
      [number, number],
      [number, number],
      [number, number],
    ];
    expect(apex).toEqual([...PEAK.apex]);
    // Both faces fall at the mark's own slope, all the way to the same foot line.
    expect((apex[0] - left[0]) / (left[1] - apex[1])).toBeCloseTo(MARK_SLOPE, 2);
    expect((right[0] - apex[0]) / (right[1] - apex[1])).toBeCloseTo(MARK_SLOPE, 2);
    expect(left[1]).toBe(right[1]);
    // The foot runs on below the hills, so the hills, not the summit, set where it meets the ground.
    const lowestHill = Math.max(...ridgeTops(RIDGES.hills.edge));
    expect(left[1]).toBeGreaterThan(lowestHill);
  });
  it("keeps the mark unmirrored: the notch opens on the summit's left face", () => {
    const [apexX] = PEAK.apex;
    const notchLeft = Math.min(...[MARK.upperLeft, MARK.lowerLeft].map(([x]) => x));
    expect(notchLeft).toBeLessThan(MARK.apex[0]);
    expect(LANTERN_TRACK.x).toBeLessThan(apexX);
  });

  it('renders the same sky on every build', () => {
    expect(scatterStars()).toEqual(scatterStars());
    expect(scatterStars(150, 1)).not.toEqual(scatterStars(150, 2));
  });

  it('draws four flame frames of three layers for the stepped flicker', () => {
    expect(FLAME_FRAMES).toHaveLength(4);
    for (const frame of FLAME_FRAMES) {
      expect(Object.keys(frame)).toEqual(['outer', 'middle', 'inner']);
    }
  });

  it('produces well-formed paths', () => {
    const tentPaths = Object.values(TENTS).flatMap(tent => [
      tent.side,
      tent.front,
      tent.doorway,
      tent.flap,
      tent.seams,
      tent.groundsheet,
      tent.rim,
      tent.guys,
      tent.pegs,
    ]);
    const paths = [
      ...Object.values(RIDGES).flatMap(ridge => [ridge.shape, ridge.edge]),
      ...Object.values(FOG).map(band => band.d),
      SUMMIT.markEdge,
      SUMMIT.markLit,
      SUMMIT.markShade,
      SUMMIT.notch,
      SUMMIT.notchFloor,
      SUMMIT.notchCeiling,
      DOCS_RIDGE.hills.shape,
      DOCS_RIDGE.summit,
      ...tentPaths,
      ...FLAME_FRAMES.flatMap(frame => [frame.outer, frame.middle, frame.inner]),
    ];
    for (const d of paths) {
      expect(d).toMatch(/^M/);
      expect(d).not.toMatch(/NaN|Infinity|undefined/);
    }
    for (const value of [
      ...STONES.flatMap(stone => [stone.x, stone.y]),
      ...LOGS.flatMap(log => [...log.from, ...log.to]),
    ]) {
      expect(Number.isFinite(value)).toBe(true);
    }
  });
});

/** Every y in a path of absolute M/L/C commands; control points are included, so it errs high. */
function ridgeTops(d: string): number[] {
  const numbers = (d.match(/-?\d*\.?\d+/g) ?? []).map(Number);
  return numbers.filter((_, i) => i % 2 === 1);
}

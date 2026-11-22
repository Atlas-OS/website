import { describe, expect, it } from 'vitest';
import { FIRE, FLAME_FRAMES, SEAT, STONES } from '../../src/utils/hero-camp-geometry';
import {
  EMBER_ORIGIN,
  EMBERS,
  FRONT_SEAT,
  GROUND,
  HILL,
  LIGHT,
  pine,
  SCENE,
  scenePercent,
} from '../../src/utils/join-community-campfire';

/** The y values of every point in a path of absolute commands. */
function ys(d: string): number[] {
  const numbers = (d.match(/-?\d*\.?\d+/g) ?? []).map(Number);
  return numbers.filter((_, index) => index % 2 === 1);
}

describe('join community campfire', () => {
  it('centres the scene on the hero camp’s fire, so the fire sits under the buttons', () => {
    expect(SCENE.x + SCENE.width / 2).toBe(FIRE.x);
    expect(scenePercent([FIRE.x, 0]).left).toBe(50);
    expect(SCENE.viewBox).toBe(`${SCENE.x} 0 ${SCENE.width} ${SCENE.height}`);
  });

  it('keeps the ground under the camp, so nothing floats, and closes the land below the scene', () => {
    expect(GROUND.crest).toBeLessThanOrEqual(FIRE.y);
    expect(Math.max(...ys(GROUND.shape))).toBeGreaterThanOrEqual(SCENE.height);
    // The hill closes down behind the ground's solid fill, never inside the fade at its foot.
    expect(Math.max(...ys(HILL.shape))).toBeLessThan(
      GROUND.crest + (SCENE.height - GROUND.crest) * 0.5,
    );
  });

  it('sets a second seat across the fire, a mirror of the hero’s, clear of the stones', () => {
    const length = (from: readonly number[], to: readonly number[]) =>
      Math.hypot((to[0] ?? 0) - (from[0] ?? 0), (to[1] ?? 0) - (from[1] ?? 0));
    expect(length(FRONT_SEAT.from, FRONT_SEAT.to)).toBeCloseTo(length(SEAT.from, SEAT.to), 0);
    expect(FRONT_SEAT.thickness).toBe(SEAT.thickness);
    // The hero's seat is left of the fire; this one is right of it.
    expect(SEAT.to[0]).toBeLessThan(FIRE.x);
    expect(FRONT_SEAT.from[0]).toBeGreaterThan(FIRE.x);
    const seatTop = Math.min(FRONT_SEAT.from[1], FRONT_SEAT.to[1]) - FRONT_SEAT.thickness / 2;
    for (const stone of STONES) {
      if (stone.x + stone.rx < FRONT_SEAT.from[0]) continue;
      expect(stone.y + stone.ry).toBeLessThan(seatTop);
    }
  });

  it('sends embers up past the flames but keeps them inside the scene, never in step', () => {
    const tallest = Math.min(...FLAME_FRAMES.flatMap(frame => ys(frame.outer)));
    for (const ember of EMBERS) {
      expect(EMBER_ORIGIN[1] - ember.rise).toBeLessThan(tallest);
      expect(EMBER_ORIGIN[1] - ember.rise).toBeGreaterThanOrEqual(SCENE.y);
    }
    expect(new Set(EMBERS.map(ember => ember.duration)).size).toBe(EMBERS.length);
  });

  it('pools the light round the fire and draws clean pines', () => {
    expect(LIGHT.pool.cx).toBe(FIRE.x);
    expect(LIGHT.air.cy).toBeLessThan(FIRE.y);
    const d = pine(30, 60, 16);
    expect(d).toMatch(/^M/);
    expect(d).not.toMatch(/NaN|undefined/);
    expect(HILL.pines).not.toMatch(/NaN|undefined/);
  });
});

import { describe, expect, it } from 'vitest';
import { DOUSE_PUFF, FIRE, SLEEP, TENTS } from '../../src/utils/hero-camp-geometry';

/** The [x, y] points of a path made of absolute M/L commands. */
function points(d: string): Array<[number, number]> {
  const numbers = (d.match(/-?\d*\.?\d+/g) ?? []).map(Number);
  const out: Array<[number, number]> = [];
  for (let i = 0; i + 1 < numbers.length; i += 2) out.push([numbers[i] ?? 0, numbers[i + 1] ?? 0]);
  return out;
}

describe('hero camp geometry', () => {
  it("rises each tent's zzZ from just above its ridge top", () => {
    for (const { tent, at } of SLEEP.origins) {
      const { top, ridge } = TENTS[tent];
      // `top` is the highest point of the drawn ridge.
      const highest = Math.min(...points(ridge).map(([, y]) => y));
      expect(top[1]).toBeCloseTo(highest, 0);
      expect(Math.abs(at[0] - top[0])).toBeLessThanOrEqual(4);
      expect(top[1] - at[1]).toBeGreaterThan(0);
      expect(top[1] - at[1]).toBeLessThanOrEqual(6);
    }
    expect(SLEEP.origins.map(origin => origin.tent)).toEqual(['big', 'small']);
  });

  it('grows the letters and steps them up and to the right, "zzZ"', () => {
    const sizes = SLEEP.letters.map(letter => letter.size);
    expect(sizes).toEqual([...sizes].sort((a, b) => a - b));
    expect(SLEEP.letters.at(-1)?.char).toBe('Z');
    const steps = SLEEP.letters
      .slice(1)
      .map((letter, i) => [SLEEP.letters[i]?.at, letter.at] as const);
    for (const [from, to] of steps) {
      expect(to[0]).toBeGreaterThan(from?.[0] ?? Infinity);
      expect(to[1]).toBeLessThan(from?.[1] ?? -Infinity);
    }
    // The letters overlap in time: the next one starts before the last has finished rising.
    expect(SLEEP.stagger * SLEEP.letters.length).toBeLessThanOrEqual(SLEEP.cycle);
  });

  it('puffs the douse smoke just above the fire', () => {
    for (const { cx, cy } of DOUSE_PUFF) {
      expect(Math.abs(cx - FIRE.x)).toBeLessThan(10);
      expect(cy).toBeLessThan(FIRE.y);
    }
  });
});

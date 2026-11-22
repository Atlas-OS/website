import { describe, expect, it } from 'vitest';
import { cssGlow, glowStops } from '../../src/utils/glow';

describe('glow', () => {
  it('falls from the peak to nothing, never rising on the way out', () => {
    const stops = glowStops(0.4);
    expect(stops[0]).toEqual({ offset: 0, opacity: 0.4 });
    expect(stops.at(-1)).toEqual({ offset: 1, opacity: 0 });
    for (let i = 1; i < stops.length; i++) {
      expect(stops[i]!.offset).toBeGreaterThan(stops[i - 1]!.offset);
      expect(stops[i]!.opacity).toBeLessThan(stops[i - 1]!.opacity);
    }
  });

  it('eases out rather than fading in a straight line, so there is no rim to see', () => {
    const stops = glowStops(1, { steps: 3 });
    // Halfway out, well under half the peak.
    expect(stops[1]!.opacity).toBeLessThan(0.35);
  });

  it('holds the peak across a solid body before falling off', () => {
    const stops = glowStops(0.3, { hold: 0.4 });
    expect(stops[0]).toEqual({ offset: 0.4, opacity: 0.3 });
    expect(stops.at(-1)!.offset).toBe(1);
  });

  it('writes the same falloff as a CSS radial gradient, thinning one colour out', () => {
    const css = cssGlow('oklch(0.383 0.108 262.5)', 0.3, 'ellipse 50% 50% at 50% 58%');
    expect(css).toMatch(
      /^radial-gradient\(ellipse 50% 50% at 50% 58%, color-mix\(in oklch, oklch\(0\.383 0\.108 262\.5\) 30%, transparent\) 0%, /,
    );
    expect(css).toMatch(
      /color-mix\(in oklch, oklch\(0\.383 0\.108 262\.5\) 0%, transparent\) 100%\)$/,
    );
    // Each stop's share of the colour is its opacity, so the falloff is the one glowStops gives.
    const shares = [...css.matchAll(/ (\d+(?:\.\d+)?)%, transparent\)/g)].map(
      m => Number(m[1]) / 100,
    );
    const stops = glowStops(0.3);
    expect(shares).toHaveLength(stops.length);
    shares.forEach((share, i) => expect(share).toBeCloseTo(stops[i]!.opacity, 6));
  });
});

import { describe, expect, it } from 'vitest';
import {
  CONNECTOR,
  PERFORMANCE,
  PRIVACY,
  USABILITY,
  VIGNETTE,
} from '../../src/utils/feature-vignettes';
import { MARK_SLOPE } from '../../src/utils/hero-summit-geometry';

/** The [x, y] points of a path made of absolute M/L commands. */
function points(d: string): Array<[number, number]> {
  const numbers = (d.match(/-?\d*\.?\d+/g) ?? []).map(Number);
  const out: Array<[number, number]> = [];
  for (let i = 0; i + 1 < numbers.length; i += 2) out.push([numbers[i] ?? 0, numbers[i + 1] ?? 0]);
  return out;
}

describe('section connector', () => {
  it("rises into a small peak at the Atlas mark's true slope", () => {
    expect(CONNECTOR.peak).toBeGreaterThanOrEqual(14);
    expect(CONNECTOR.peak).toBeLessThanOrEqual(18);
    expect(CONNECTOR.half / CONNECTOR.peak).toBeCloseTo(MARK_SLOPE, 5);
    // The peak fits its box, and its baseline is the box's last pixel row, where the CSS horizon runs.
    const [[, footY] = [0, 0], [topX, topY] = [0, 0]] = points(CONNECTOR.litFace);
    expect(footY).toBe(CONNECTOR.height - 0.5);
    expect(topY).toBeCloseTo(footY - CONNECTOR.peak, 1);
    expect(topX).toBe(CONNECTOR.width / 2);
  });

  it('catches the moon on its left face, with the light coming from the top left', () => {
    const [[footX] = [0]] = points(CONNECTOR.litFace);
    expect(footX).toBeLessThan(CONNECTOR.width / 2);
    expect(CONNECTOR.star[0]).toBeLessThan(CONNECTOR.width);
  });
});

describe('features vignettes', () => {
  it('streaks the shooting star down and to the left, staying in the sky above the horizon', () => {
    const { head, tail, travel } = PERFORMANCE.streak;
    expect(head[0]).toBeLessThan(tail[0]);
    expect(travel.x).toBeLessThan(0);
    expect(travel.y).toBeGreaterThan(0);
    const end = head[1] + (travel.y / 100) * VIGNETTE.height;
    expect(end).toBeLessThan(VIGNETTE.horizon);
  });

  it('slips the moon behind the cloud at one end of its drift and clears it at the other', () => {
    const { moon, cloud, drift } = PRIVACY;
    const shift = (percent: number) => (percent / 100) * VIGNETTE.width;
    // Hidden: the cloud spans the moon and its top rises above the moon's middle.
    const left = cloud.x + shift(drift.hidden);
    expect(left).toBeLessThan(moon.cx - moon.r);
    expect(left + cloud.width).toBeGreaterThan(moon.cx + moon.r);
    expect(cloud.y - cloud.height * 0.72).toBeLessThan(moon.cy);
    // Open: the cloud's tallest point has drifted well clear of the moon.
    const crest = cloud.x + cloud.width * 0.4 + shift(drift.open);
    expect(crest).toBeLessThan(moon.cx - moon.r);
  });

  it("draws the tent and fire in the camp's language: four flame frames on the horizon", () => {
    expect(USABILITY.flames).toHaveLength(4);
    expect(USABILITY.fire.base).toBeLessThanOrEqual(VIGNETTE.horizon);
    for (const d of [USABILITY.tent.front, USABILITY.tent.doorway, ...USABILITY.logs]) {
      expect(d).toMatch(/^M/);
      expect(d).not.toMatch(/NaN|undefined/);
    }
  });
});

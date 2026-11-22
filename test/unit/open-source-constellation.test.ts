import { describe, expect, it } from 'vitest';
import { MARK } from '../../src/utils/hero-summit-geometry';
import {
  CHART,
  COUNT_ZONE,
  crowds,
  DRAW,
  distanceToSegment,
  FIELD,
  FIELD_GROUPS,
  fieldStars,
  LINES,
  OUTLINE,
  STARS,
  SUMMIT,
} from '../../src/utils/open-source-constellation';

/** The [x, y] points of a path made of absolute M/L commands. */
function points(d: string): Array<[number, number]> {
  const numbers = (d.match(/-?\d*\.?\d+/g) ?? []).map(Number);
  const out: Array<[number, number]> = [];
  for (let i = 0; i + 1 < numbers.length; i += 2) out.push([numbers[i] ?? 0, numbers[i + 1] ?? 0]);
  return out;
}

const corner = (name: (typeof OUTLINE)[number]) => {
  const found = STARS.find(star => star.corner === name);
  if (!found) throw new Error(`No star on ${name}`);
  return found;
};

describe('the Atlas constellation', () => {
  it("puts one star on every corner of the mark, in the mark's outline order", () => {
    expect(STARS.map(star => star.corner)).toEqual([...OUTLINE]);
    expect(new Set(OUTLINE)).toEqual(new Set(Object.keys(MARK)));
  });

  it("keeps the mark's proportions, standing upright inside the chart", () => {
    const apex = corner('apex');
    const left = corner('baseLeft');
    const right = corner('baseRight');
    expect(left.y).toBe(right.y);
    expect(apex.x).toBeCloseTo((left.x + right.x) / 2, 0);
    const markRatio = (MARK.baseRight[0] - MARK.baseLeft[0]) / (MARK.baseLeft[1] - MARK.apex[1]);
    expect((right.x - left.x) / (left.y - apex.y)).toBeCloseTo(markRatio, 1);
    for (const { x, y, r } of STARS) {
      expect(x - r).toBeGreaterThan(0);
      expect(x + r).toBeLessThan(CHART.width);
      expect(y - r).toBeGreaterThan(0);
      expect(y + r).toBeLessThan(CHART.height);
    }
  });

  it('makes the summit its brightest star, glinting on its centre', () => {
    const apex = corner('apex');
    expect(Math.max(...STARS.map(star => star.r))).toBe(apex.r);
    expect([SUMMIT.x, SUMMIT.y]).toEqual([apex.x, apex.y]);
    expect(SUMMIT.glint).toMatch(/^M.*Z$/);
    expect(SUMMIT.glint).not.toMatch(/NaN|undefined/);
  });

  it('joins the stars with lines that stop short of each one, like a star chart', () => {
    expect(LINES).toHaveLength(STARS.length);
    LINES.forEach((line, index) => {
      const from = STARS[index];
      const to = STARS[(index + 1) % STARS.length];
      if (!from || !to) throw new Error('missing star');
      const [start, end] = points(line.d);
      if (!start || !end) throw new Error('missing point');
      expect(Math.hypot(start[0] - from.x, start[1] - from.y)).toBeGreaterThan(from.r + 4);
      expect(Math.hypot(end[0] - to.x, end[1] - to.y)).toBeGreaterThan(to.r + 4);
      // Still on the straight line between the two stars.
      expect(distanceToSegment(start, [from.x, from.y], [to.x, to.y])).toBeLessThan(0.2);
      expect(distanceToSegment(end, [from.x, from.y], [to.x, to.y])).toBeLessThan(0.2);
      expect(line.length).toBeGreaterThan(0);
    });
  });

  it('draws in as one pen: each line starts after the one before it has reached its star', () => {
    expect(DRAW.lines[0]?.delay).toBe(0);
    for (let i = 1; i < DRAW.lines.length; i++) {
      const previous = DRAW.lines[i - 1];
      const current = DRAW.lines[i];
      if (!previous || !current) throw new Error('missing timing');
      expect(current.delay).toBeGreaterThanOrEqual(previous.delay + previous.duration);
    }
    expect(DRAW.total).toBeGreaterThan(1200);
    expect(DRAW.total).toBeLessThan(2600);
  });
});

describe('the background field', () => {
  const stars = fieldStars();

  it('is seeded, so every build renders the same sky', () => {
    expect(fieldStars()).toEqual(stars);
    expect(stars.length).toBeGreaterThan(100);
  });

  it('keeps clear of the constellation and of the count beneath it', () => {
    for (const { x, y } of stars) {
      expect(crowds([x, y])).toBe(false);
      expect(x).toBeGreaterThanOrEqual(FIELD.x);
      expect(x).toBeLessThanOrEqual(FIELD.x + FIELD.width);
    }
    expect(crowds([(COUNT_ZONE.x0 + COUNT_ZONE.x1) / 2, (COUNT_ZONE.y0 + COUNT_ZONE.y1) / 2])).toBe(
      true,
    );
    const apex = corner('apex');
    expect(crowds([apex.x + 3, apex.y + 3])).toBe(true);
  });

  it('splits into a still group and two that twinkle', () => {
    expect(FIELD_GROUPS).toHaveLength(3);
    for (const group of FIELD_GROUPS) {
      expect(group.warm.length + group.cool.length).toBeGreaterThan(0);
      expect(`${group.warm}${group.cool}`).not.toMatch(/NaN|undefined/);
    }
  });
});

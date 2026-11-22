/**
 * Geometry for the homepage's Open source section, "Stargazers": a patch of night sky in which the
 * stars trace the Atlas mark as a constellation, drawn once at build time.
 *
 * It is a star chart: one star on each corner of the mark, brightest at the summit, joined in the
 * mark's outline order by lines that stop short of every star. A faint seeded field of background
 * stars surrounds it and keeps clear of the lines and of the stargazer count set beneath it.
 */
import { MARK, markPoint, type Point, type Star, starsPath } from './hero-summit-geometry';

const r1 = (value: number) => Math.round(value * 10) / 10;

/** The chart's own frame: the constellation fills it, and the count sits just below it. */
export const CHART = { width: 560, height: 380 };

/** The constellation's summit, and its size relative to the mark. */
const APEX: Point = [280, 30];
const SCALE = 3.7;

/** The mark's corners in its outline order: the order the constellation's lines run in. */
export const OUTLINE = [
  'apex',
  'baseRight',
  'baseLeft',
  'lowerLeft',
  'lowerRight',
  'innerApex',
  'upperRight',
  'upperLeft',
] as const;
export type Corner = (typeof OUTLINE)[number];

/** Each star's radius in chart units: the summit is brightest, the notch's inner corners faintest. */
const MAGNITUDE: Record<Corner, number> = {
  apex: 3,
  baseRight: 2.4,
  baseLeft: 2.6,
  lowerLeft: 1.8,
  lowerRight: 2,
  innerApex: 2.2,
  upperRight: 1.7,
  upperLeft: 1.9,
};

/** Clear space between a star and the end of each line that reaches it, beyond its radius. */
const LINE_GAP = 6;

export interface ChartStar {
  corner: Corner;
  x: number;
  y: number;
  r: number;
}

export interface ChartLine {
  d: string;
  /** Length in chart units, for pacing the line's draw-in. */
  length: number;
}

export const STARS: ChartStar[] = OUTLINE.map(corner => {
  const [x, y] = markPoint(MARK[corner], APEX, SCALE);
  return { corner, x: r1(x), y: r1(y), r: MAGNITUDE[corner] };
});

function star(index: number): ChartStar {
  const found = STARS[(index + STARS.length) % STARS.length];
  if (!found) throw new RangeError(`No star at index ${index}`);
  return found;
}

/** The constellation's lines, in outline order, each shortened at both ends so the stars stand clear. */
export const LINES: ChartLine[] = STARS.map((from, index) => {
  const to = star(index + 1);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  const start = (from.r + LINE_GAP) / length;
  const end = 1 - (to.r + LINE_GAP) / length;
  return {
    d: `M${r1(from.x + dx * start)} ${r1(from.y + dy * start)}L${r1(from.x + dx * end)} ${r1(from.y + dy * end)}`,
    length: r1(length * (end - start)),
  };
});

/** The summit star's four-point glint: arms pinched to its centre, the long ones upright. */
export function glint(cx: number, cy: number, long: number, short: number): string {
  const c = `${cx} ${cy}`;
  return (
    `M${cx} ${r1(cy - long)}Q${c} ${r1(cx + short)} ${cy}Q${c} ${cx} ${r1(cy + long)}` +
    `Q${c} ${r1(cx - short)} ${cy}Q${c} ${cx} ${r1(cy - long)}Z`
  );
}

export const SUMMIT = (() => {
  const apex = star(0);
  return { x: apex.x, y: apex.y, glint: glint(apex.x, apex.y, 13, 8) };
})();

/**
 * The draw-in: one pen tracing the outline from the summit and back at a steady pace, so each line
 * starts as the one before it reaches its star. Times in milliseconds.
 */
export const DRAW = (() => {
  const unitsPerSecond = 950;
  const pause = 70; // the pen lifts briefly across each star
  let at = 0;
  const lines = LINES.map(line => {
    const duration = Math.round((line.length / unitsPerSecond) * 1000);
    const timing = { delay: at, duration };
    at += duration + pause;
    return timing;
  });
  return { lines, total: at - pause };
})();

/* ---- Background field ------------------------------------------------------------------------ */

/**
 * The field reaches past the chart on every side, furthest to the left (the open page margin) and
 * least to the right (where the copy sits), so its soft mask fades out well clear of any edge.
 */
export const FIELD = { x: -200, y: -110, width: 820, height: 600 };

/** Where the stargazer count sits under the constellation: no background stars there. */
export const COUNT_ZONE = { x0: 70, x1: 490, y0: CHART.height - 24, y1: CHART.height + 120 };

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Distance from a point to the segment a–b. */
export function distanceToSegment([px, py]: Point, [ax, ay]: Point, [bx, by]: Point): number {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

/** True when a background star at `point` would crowd the constellation or the count. */
export function crowds(point: Point): boolean {
  const [x, y] = point;
  if (x > COUNT_ZONE.x0 && x < COUNT_ZONE.x1 && y > COUNT_ZONE.y0 && y < COUNT_ZONE.y1) return true;
  return STARS.some((from, index) => {
    const to = star(index + 1);
    if (Math.hypot(x - from.x, y - from.y) < 24) return true;
    return distanceToSegment(point, [from.x, from.y], [to.x, to.y]) < 9;
  });
}

/**
 * A sparse, seeded field of faint stars around the constellation, in three groups: group 0 holds
 * still, groups 1 and 2 twinkle out of step (as in the hero's sky).
 */
export function fieldStars(count = 150, seed = 0x57a26): Star[] {
  const random = mulberry32(seed);
  const stars: Star[] = [];
  for (let attempt = 0; stars.length < count && attempt < count * 10; attempt++) {
    const x = FIELD.x + random() * FIELD.width;
    const y = FIELD.y + random() * FIELD.height;
    const bright = random() > 0.92;
    const r = bright ? 1.3 + random() * 0.5 : 0.55 + random() * 0.6;
    const cool = random() > 0.65;
    if (crowds([x, y])) continue;
    stars.push({ x: r1(x), y: r1(y), r: r1(r), group: stars.length % 3, cool });
  }
  return stars;
}

/** The field as one path per twinkle group and colour: six elements instead of a hundred. */
export const FIELD_GROUPS = (() => {
  const stars = fieldStars();
  return [0, 1, 2].map(group => {
    const members = stars.filter(s => s.group === group);
    return {
      warm: starsPath(members.filter(s => !s.cool)),
      cool: starsPath(members.filter(s => s.cool)),
    };
  });
})();

/** The field's placement around the chart, as CSS percentages of the chart's box. */
export const FIELD_INSET = {
  left: r1((FIELD.x / CHART.width) * 100),
  top: r1((FIELD.y / CHART.height) * 100),
  width: r1((FIELD.width / CHART.width) * 100),
  height: r1((FIELD.height / CHART.height) * 100),
};

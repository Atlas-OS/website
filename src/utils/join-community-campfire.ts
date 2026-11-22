/**
 * The Join community campfire: the hero's camp (utils/hero-camp-geometry.ts), gathered round its
 * fire in the same camp units and drawing language. Around it: a low hill with a few pines behind
 * the tents, a wider mound of ground that fades out at the sides, a second log seat facing the
 * first across the fire, and embers that climb further into the night.
 *
 * Camp units: the ground line sits at y = 80 and the fire at x = 128, as in the hero.
 */
import { FIRE, SEAT } from './hero-camp-geometry';
import { type Point, smoothPath } from './hero-summit-geometry';

const r1 = (value: number) => Math.round(value * 10) / 10;
const pt = ([x, y]: Point) => `${r1(x)} ${r1(y)}`;

/** The scene's box, centred on the fire and wide enough for the ground to fade out either side. */
export const SCENE = (() => {
  const width = 340;
  const height = 108;
  const x = FIRE.x - width / 2;
  return { x, y: 0, width, height, viewBox: `${x} 0 ${width} ${height}` };
})();

/** A camp point as a percentage of the scene box, for placing HTML layers over the SVG. */
export function scenePercent([x, y]: Point): { left: number; top: number } {
  return {
    left: Math.round(((x - SCENE.x) / SCENE.width) * 10000) / 100,
    top: Math.round(((y - SCENE.y) / SCENE.height) * 10000) / 100,
  };
}

const LEFT = SCENE.x - 10;
const RIGHT = SCENE.x + SCENE.width + 10;
const BOTTOM = SCENE.height + 4;

/** Close an open ridgeline down to `bottom`, past the scene's edges. */
function closeDown(edge: string, points: readonly Point[], bottom: number): string {
  const first = points[0] ?? [LEFT, bottom];
  const last = points[points.length - 1] ?? [RIGHT, bottom];
  return `${edge}L${pt([last[0], bottom])}L${pt([first[0], bottom])}Z`;
}

/** A small pine at 0.1 precision (the camp is drawn about twice as large as the hero's). */
export function pine(x: number, baseY: number, height: number): string {
  let d = '';
  for (let tier = 0; tier < 3; tier++) {
    const top = baseY - height + tier * height * 0.26;
    const bottom = top + height * 0.46;
    const half = height * (0.17 + tier * 0.07);
    d += `M${pt([x, top])}L${pt([x + half, bottom])}L${pt([x - half, bottom])}Z`;
  }
  const trunk = Math.max(0.6, height * 0.05);
  d += `M${pt([x - trunk, baseY - height * 0.2])}H${r1(x + trunk)}V${r1(baseY + 3)}H${r1(x - trunk)}Z`;
  return d;
}

/**
 * A low hill behind the tents, so they stand against the land like the hero's camp. It rises
 * highest on the left, towards the moon, and closes down well behind the ground.
 */
export const HILL = (() => {
  const points: Point[] = [
    [LEFT, 74],
    [-12, 66],
    [26, 59],
    [58, 61],
    [96, 66],
    [128, 68],
    [168, 64],
    [210, 58],
    [246, 61],
    [274, 68],
    [RIGHT, 74],
  ];
  const edge = smoothPath(points);
  const pines: Array<[x: number, height: number]> = [
    [24, 14],
    [34, 19],
    [228, 16],
    [238, 11],
  ];
  return {
    edge,
    shape: closeDown(edge, points, 92),
    pines: pines
      .map(([x, height]) => {
        // Seat each pine on the hill: sample the ridge between its neighbouring points.
        const i = points.findIndex(([px]) => px > x);
        const [x0, y0] = points[i - 1] ?? points[0] ?? [x, 66];
        const [x1, y1] = points[i] ?? [x, 66];
        const y = y0 + ((x - x0) / (x1 - x0 || 1)) * (y1 - y0);
        return pine(x, y + 2, height);
      })
      .join(''),
  };
})();

/**
 * The ground the camp stands on: the hero's mound carried out wider, so it can fade at both sides.
 * Its crest runs just under the camp's ground line, so no tent or stone floats.
 */
export const GROUND = (() => {
  const points: Point[] = [
    [LEFT, 88],
    [-6, 82],
    [44, 78],
    [92, 77],
    [128, 76.6],
    [172, 77.2],
    [220, 78.4],
    [264, 82],
    [RIGHT, 88],
  ];
  const edge = smoothPath(points);
  return { edge, shape: closeDown(edge, points, BOTTOM), crest: 76.6 };
})();

/**
 * A second log seat across the fire from the hero's, in front of the small tent: the same log,
 * mirrored, with its cut end turned outwards. Room for one more by the fire.
 */
export const FRONT_SEAT = (() => {
  const mirror = ([x, y]: Point): Point => [2 * FIRE.x - x, y + 1];
  return { from: mirror(SEAT.to), to: mirror(SEAT.from), thickness: SEAT.thickness };
})();

/**
 * Embers climbing out of the fire into the dark above it. Each rises `rise` camp units, drifting
 * sideways by `drift` (a fraction of its climb); timings differ, so they never rise together.
 */
export const EMBERS = [
  { dx: -2, rise: 56, drift: 0.32, duration: 3.6, delay: 0, size: 1.6 },
  { dx: 3, rise: 70, drift: -0.4, duration: 4.4, delay: -1.5, size: 1.3 },
  { dx: 0, rise: 46, drift: 0.12, duration: 2.9, delay: -2.4, size: 1.8 },
  { dx: -4, rise: 64, drift: -0.18, duration: 5.2, delay: -3.3, size: 1.2 },
  { dx: 2, rise: 52, drift: 0.5, duration: 3.9, delay: -0.7, size: 1.4 },
];

/** Where the embers set off: just above the logs. */
export const EMBER_ORIGIN: Point = [FIRE.x, FIRE.y - 8];

/** The fire's light: a pool on the ground, and a glow in the air above the flames. */
export const LIGHT = {
  pool: { cx: FIRE.x, cy: FIRE.y + 3, rx: 132, ry: 22 },
  air: { cx: FIRE.x, cy: FIRE.y - 14, r: 40 },
};

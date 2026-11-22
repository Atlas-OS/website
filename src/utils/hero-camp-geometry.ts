/**
 * The camp beside the Atlas Manager window: two A-frame tents, a campfire and a log seat.
 *
 * Camp units: a 240 × 100 box whose ground line sits at y = 80, with the fire at x = 128.
 * Everything here is static path data; the flicker comes from swapping hand-drawn flame frames.
 */
import { polygon, type Point } from './hero-summit-geometry';

export const CAMP_VIEW = { width: 240, height: 100, ground: 80 };
export const FIRE = { x: 128, y: 80 };

const r1 = (value: number) => Math.round(value * 10) / 10;
const p = ([x, y]: Point) => `${r1(x)} ${r1(y)}`;
const line = (a: Point, b: Point) => `M${p(a)}L${p(b)}`;
const poly = (points: readonly Point[]) => polygon(points.map(([x, y]) => [r1(x), r1(y)] as Point));

export interface TentSpec {
  /** Top of the front (door) gable. */
  apex: Point;
  /** Half the width of the front gable at the ground. */
  half: number;
  ground: number;
  /** Ridge from the front apex to the back apex: the tent recedes this way. */
  ridge: Point;
  /** +1 when the door faces right (towards a fire on the right), −1 when it faces left. */
  facing: 1 | -1;
}

export interface Tent {
  /** The roof panel seen from the side, in shadow. */
  side: string;
  /** The door gable, lit by the fire. */
  front: string;
  /** The open doorway, glowing from inside. */
  doorway: string;
  /** The door flap, pinned back to show its lit lining. */
  flap: string;
  /** Zip seam above the doorway, and the flap's fold. */
  seams: string;
  /** Groundsheet, peeking out under the tent. */
  groundsheet: string;
  /** Edges facing the fire, picked out in warm light. */
  rim: string;
  /** The ridge and back edge, catching the moon. */
  ridge: string;
  /** Guy lines out to their pegs. */
  guys: string;
  pegs: string;
  /** Centre of the doorway's foot, where the inner glow is brightest. */
  glow: Point;
  /** The ridge's highest point. */
  top: Point;
}

export function tent({ apex, half, ground, ridge, facing }: TentSpec): Tent {
  const [ax, ay] = apex;
  const back: Point = [ax + ridge[0], ay + ridge[1]];
  const height = ground - ay;
  // The near and far feet of the front gable. "Near" is on the side the door faces.
  const nearFoot: Point = [ax + half * facing, ground];
  const farFoot: Point = [ax - half * facing, ground];
  // The side panel drops from the ridge to the far foot; its back foot sits a touch higher (further away).
  const backFoot: Point = [back[0] - half * 0.95 * facing, ground - 2];

  const doorTop: Point = [ax, ay + height * 0.3];
  const doorNear: Point = [ax + half * 0.42 * facing, ground];
  const doorFar: Point = [ax - half * 0.3 * facing, ground];
  // The flap is folded back towards the near side, showing a sliver of its lining.
  const flapOuter: Point = [ax + half * 0.72 * facing, ground - 1];
  const flapFold: Point = [ax + half * 0.22 * facing, ay + height * 0.55];

  const sheet = 3;
  const groundsheet = poly([
    [backFoot[0] - sheet * facing, backFoot[1] - 0.5],
    [farFoot[0] - sheet * facing, ground + 1.5],
    [nearFoot[0] + (sheet + 1) * facing, ground + 2.5],
    [nearFoot[0] + sheet * facing, ground - 0.5],
    [ax, ground - 1],
  ]);

  const nearPeg: Point = [nearFoot[0] + half * 0.65 * facing, ground + 4];
  const backPeg: Point = [backFoot[0] - half * 0.75 * facing, ground + 0.5];
  const peg = ([x, y]: Point) =>
    `M${p([x - 0.6 * facing, y - 2.8])}L${p([x, y])}M${p([x - 1.4, y - 2.6])}h2.8`;

  return {
    side: poly([apex, back, backFoot, farFoot]),
    front: poly([apex, nearFoot, farFoot]),
    doorway: poly([doorTop, doorNear, doorFar]),
    flap: poly([doorTop, doorNear, flapOuter, flapFold]),
    seams: `${line(apex, doorTop)}${line(doorTop, flapFold)}`,
    groundsheet,
    rim: `${line(apex, nearFoot)}${line(nearFoot, [ax, ground])}`,
    ridge: `${line(apex, back)}${line(back, backFoot)}`,
    guys: `${line(apex, nearPeg)}${line(back, backPeg)}`,
    pegs: `${peg(nearPeg)}${peg(backPeg)}`,
    glow: [ax + half * 0.06 * facing, ground - 2],
    top: ay <= back[1] ? apex : back,
  };
}

export const TENTS = {
  /** The larger tent, left of the fire, door turned towards it. */
  big: tent({ apex: [84, 30], half: 22, ground: 80, ridge: [-34, 6], facing: 1 }),
  /** The smaller tent, right of the fire, angled the other way. */
  small: tent({ apex: [172, 46], half: 15, ground: 81, ridge: [26, 4], facing: -1 }),
};

/** A ring of stones around the fire. Stones behind the fire show their lit inner faces. */
export const STONES = Array.from({ length: 8 }, (_, i) => {
  const angle = (i / 8) * Math.PI * 2 + 0.3;
  const rx = 3.4 - (i % 3) * 0.4;
  const ry = 2.3 - (i % 2) * 0.3;
  const x = FIRE.x + Math.cos(angle) * 13.5;
  const y = FIRE.y + 1.5 + Math.sin(angle) * 4.2;
  const behind = Math.sin(angle) < 0;
  // The lit face leans towards the fire.
  const hx = x - Math.cos(angle) * rx * 0.35;
  const hy = behind ? y + ry * 0.2 : y - ry * 0.45;
  return { x: r1(x), y: r1(y), rx: r1(rx), ry: r1(ry), hx: r1(hx), hy: r1(hy), behind };
}).sort((a, b) => a.y - b.y);

/** Two logs crossed over the embers. */
export const LOGS = [
  { from: [117, 83] as Point, to: [139, 77] as Point },
  { from: [118, 77] as Point, to: [140, 83] as Point },
];

/** A log to sit on, in front of the big tent. */
export const SEAT = { from: [92, 91] as Point, to: [113, 92] as Point, thickness: 5 };

/**
 * One flame: a teardrop from a flat base to a tip that leans by `lean`.
 */
export function flamePath(
  cx: number,
  base: number,
  width: number,
  height: number,
  lean: number,
): string {
  const w = width / 2;
  const tip: Point = [cx + lean, base - height];
  return [
    `M${p([cx, base])}`,
    `C${p([cx - w * 1.15, base])} ${p([cx - w * 1.1, base - height * 0.42])} ${p([cx - w * 0.5 + lean * 0.3, base - height * 0.68])}`,
    `C${p([cx - w * 0.1 + lean * 0.6, base - height * 0.84])} ${p([tip[0] - w * 0.05, tip[1] + height * 0.08])} ${p(tip)}`,
    `C${p([tip[0] + w * 0.25, base - height * 0.8])} ${p([cx + w * 0.62 + lean * 0.25, base - height * 0.64])} ${p([cx + w * 0.9, base - height * 0.4])}`,
    `C${p([cx + w * 1.25, base - height * 0.18])} ${p([cx + w * 0.85, base])} ${p([cx, base])}Z`,
  ].join('');
}

export interface FlameFrame {
  outer: string;
  middle: string;
  inner: string;
}

/**
 * Four hand-tuned frames of three layered flames, swapped in turn for a stepped cartoon flicker.
 * Each frame leans and stretches differently, with a side tongue that hops from side to side.
 * `x` and `base` place the fire's foot; `scale` sizes it (1 is the camp's fire).
 */
export function flameFrames(x: number, base: number, scale = 1): FlameFrame[] {
  return [
    { h: 25, lean: -2, tongue: 4.5, tongueH: 12 },
    { h: 29, lean: 2, tongue: -4.5, tongueH: 10 },
    { h: 23, lean: -3, tongue: 5, tongueH: 14 },
    { h: 27, lean: 1, tongue: -4, tongueH: 12 },
  ].map(({ h, lean, tongue, tongueH }) => {
    const s = scale;
    return {
      outer:
        flamePath(x, base, 17 * s, h * s, lean * s) +
        flamePath(x + tongue * s, base - s, 7 * s, tongueH * s, (tongue > 0 ? 2 : -2) * s),
      middle: flamePath(x + lean * 0.15 * s, base, 11 * s, h * 0.68 * s, lean * 0.7 * s),
      inner: flamePath(x + lean * 0.1 * s, base, 5.5 * s, h * 0.38 * s, lean * 0.3 * s),
    };
  });
}

export const FLAME_FRAMES = flameFrames(FIRE.x, FIRE.y - 1);
/** Embers rising from the fire: horizontal drift and timing differ, so they never march together. */
export const EMBERS = [
  { drift: 30, duration: 2.8, delay: 0 },
  { drift: -45, duration: 3.4, delay: -1.2 },
  { drift: 15, duration: 2.3, delay: -2.1 },
];

/** A thin wisp of smoke, drawn upwards from just above the flames. */
export const SMOKE = `M${FIRE.x} 50C${FIRE.x - 4} 42 ${FIRE.x + 4} 36 ${FIRE.x + 1} 28S${FIRE.x - 2} 16 ${FIRE.x + 4} 4`;

/** A puff of grey smoke when the fire is doused: a loose cluster just above the logs. */
export const DOUSE_PUFF = [
  { cx: FIRE.x, cy: 64, r: 6 },
  { cx: FIRE.x - 6, cy: 68, r: 4.5 },
  { cx: FIRE.x + 6, cy: 67, r: 5 },
  { cx: FIRE.x + 1, cy: 58, r: 4 },
];

/**
 * The sleeping tents' "zzZ": three letters, each larger than the last, rising from just above each
 * tent's ridge top. `at` is where each letter rests in the static (reduced-motion) version; in
 * motion every letter starts at the origin and drifts up and to the right, one after another.
 */
export const SLEEP = {
  letters: [
    { char: 'z', size: 9, at: [0, 0] as Point },
    { char: 'z', size: 12, at: [6, -10] as Point },
    { char: 'Z', size: 15, at: [13, -22] as Point },
  ],
  /** Seconds: one letter's rise, the gap between letters, and the offset between the two tents. */
  cycle: 2.7,
  stagger: 0.9,
  tentOffset: 0.45,
  origins: (['big', 'small'] as const).map(key => {
    const [x, y] = TENTS[key].top;
    return { tent: key, at: [x + 2, y - 4] as Point };
  }),
};

/** A small mound the camp stands on, matching the near range so nothing floats. */
export const CAMP_GROUND_PATH = `M-20 84C20 77 60 76 120 77S210 78 260 82V112H-20Z`;

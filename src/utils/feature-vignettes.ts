/**
 * Geometry for the homepage's section connector and the Features vignettes, drawn once at build
 * time in the Summit hero's flat cartoon language: the Atlas mark's slope, the camp's tent and
 * flames, the scene's clouds, moonlight from the top left.
 *
 * Vignettes share one view box with a horizon line near the bottom, like the hero's ranges.
 */
import { type FlameFrame, flameFrames, tent } from './hero-camp-geometry';
import {
  cloudPath,
  linePath,
  MARK_SLOPE,
  type Point,
  pinePath,
  polygon,
} from './hero-summit-geometry';

const r1 = (value: number) => Math.round(value * 10) / 10;
const pt = ([x, y]: Point) => `${r1(x)} ${r1(y)}`;
/** A straight line at 0.1 precision: the connector is drawn at 1:1, where half pixels matter. */
const fineLine = (a: Point, b: Point) => `M${pt(a)}L${pt(b)}`;

/* ---- Connector ------------------------------------------------------------------------------ */

/**
 * The connector's centre piece: a faint horizon that rises into a small Λ at the mark's true slope,
 * with one star above it. The horizon either side is drawn in CSS and meets this piece's baseline.
 */
export const CONNECTOR = (() => {
  const width = 44;
  const height = 20;
  const peak = 16;
  const baseline = height - 0.5; // a 1px stroke centred on the box's last pixel row
  const half = peak * MARK_SLOPE;
  const cx = width / 2;
  const top: Point = [cx, baseline - peak];
  const left: Point = [cx - half, baseline];
  const right: Point = [cx + half, baseline];
  return {
    width,
    height,
    peak,
    half,
    /** The horizon running into the peak's feet. */
    horizon: `M0 ${baseline}H${r1(left[0])}M${r1(right[0])} ${baseline}H${width}`,
    /** The face towards the moon (top left), picked out brighter. */
    litFace: fineLine(left, top),
    shadedFace: fineLine(top, right),
    star: [r1(cx + half + 6), 3] as Point,
  };
})();

/* ---- Vignettes ------------------------------------------------------------------------------ */

export const VIGNETTE = { width: 160, height: 96, horizon: 84 };
const { horizon: H } = VIGNETTE;

/** A soft rise of land, from `x0` to `x1`, peaking at `top`. */
function hill(x0: number, x1: number, top: number): string {
  const w = x1 - x0;
  return `M${pt([x0, H])}C${pt([x0 + w * 0.3, top])} ${pt([x0 + w * 0.62, top])} ${pt([x1, H])}Z`;
}

/** Performance: a shooting star streaking fast over a peak. */
export const PERFORMANCE = (() => {
  const apex: Point = [56, 30];
  const half = (H - apex[1]) * MARK_SLOPE;
  const left: Point = [apex[0] - half, H];
  const right: Point = [apex[0] + half, H];
  const cap = 15;
  const capHalf = cap * MARK_SLOPE;
  const hem: Point[] = [
    [apex[0] - capHalf, apex[1] + cap],
    [apex[0] - capHalf * 0.5, apex[1] + cap * 1.35],
    [apex[0] - capHalf * 0.05, apex[1] + cap * 0.95],
    [apex[0] + capHalf * 0.4, apex[1] + cap * 1.3],
    [apex[0] + capHalf, apex[1] + cap],
  ];
  // The streak: its head, the direction it flies (down and to the left), and its length.
  const head: Point = [126, 16];
  const dir: Point = [-0.92, 0.39];
  const length = 30;
  const travel = 50;
  return {
    backHill: hill(74, 156, 56),
    peak: polygon([left, apex, right]),
    litFace: polygon([left, apex, [apex[0], H]]),
    capLit: polygon([apex, ...hem.slice(0, 3)]),
    capShade: polygon([apex, ...hem.slice(2)]),
    /** Moonlight along the upper left face. */
    rim: linePath([apex, [apex[0] - half * 0.55, apex[1] + (H - apex[1]) * 0.55]]),
    stars: [
      [22, 14, 0.9],
      [92, 9, 0.7],
      [146, 40, 0.8],
    ] as Array<[number, number, number]>,
    streak: {
      head,
      tail: [head[0] - dir[0] * length, head[1] - dir[1] * length] as Point,
      /** How far the streak flies, as a percentage of the vignette box (for the CSS translate). */
      travel: {
        x: r1(((dir[0] * travel) / VIGNETTE.width) * 100),
        y: r1(((dir[1] * travel) / VIGNETTE.height) * 100),
      },
    },
  };
})();

/** Usability: a cozy tent with a lit doorway beside a small campfire, in the camp's language. */
export const USABILITY = (() => {
  const fire = { x: 108, base: H - 1 };
  const stones = [-8, -4.5, 0, 4.5, 8].map((dx, i) => ({
    cx: r1(fire.x + dx),
    cy: r1(H + 1.2 - Math.abs(dx) * 0.12),
    rx: i % 2 ? 1.6 : 2,
    ry: 1.25,
  }));
  return {
    tent: tent({ apex: [58, 40], half: 21, ground: H, ridge: [-28, 5], facing: 1 }),
    fire,
    flames: flameFrames(fire.x, fire.base, 0.62) satisfies FlameFrame[],
    logs: [
      linePath([
        [fire.x - 8, H + 1],
        [fire.x + 7, H - 2],
      ]),
      linePath([
        [fire.x - 7, H - 2],
        [fire.x + 8, H + 1],
      ]),
    ],
    stones,
    mound: hill(12, 150, 78),
  };
})();

/**
 * A soft cloud in the hero's fog language: the scene's row of arcs on top, closed by a rounded
 * underside instead of a flat base, so its foot can fade out (see Features.astro) rather than stop.
 */
export function softCloud(cloud: { x: number; y: number; width: number; height: number }) {
  const { x, y, width: w, height: h } = cloud;
  const top = cloudPath(cloud).replace(/Z$/, '');
  const belly = y + h * 0.34;
  return {
    /** The arcs alone, for the moonlit rim along the cloud's top. */
    rim: top,
    shape: `${top}C${pt([x + w * 0.84, belly])} ${pt([x + w * 0.16, belly])} ${pt([x, y])}Z`,
    /** The lowest point of the underside (a symmetric cubic reaches ¾ of the way to its handles). */
    foot: r1(y + (belly - y) * 0.75),
  };
}

/** Privacy: the moon slipping behind a cloud, out of sight. */
export const PRIVACY = (() => {
  const moon = { cx: 104, cy: 32, r: 15 };
  const cloud = { x: 64, y: 58, width: 84, height: 48 };
  const soft = softCloud(cloud);
  return {
    moon,
    cloud,
    cloudShape: soft.shape,
    /** The cloud's top edge alone, for its moonlit rim. */
    cloudRim: soft.rim,
    cloudFoot: soft.foot,
    /** The drift: the cloud's offset as a percentage of the box, from moon in view to moon hidden. */
    drift: { open: -24, hidden: 2 },
    ground: hill(-6, 128, 70),
    pines: [pinePath(30, H + 2, 16), pinePath(42, H + 2, 12)].join(''),
  };
})();

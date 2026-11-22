/**
 * The footer's horizon, drawn as lines on the open page: the end of the night on the Atlas range.
 * A low back range with the Atlas summit standing small and far off on it, flag and all; a nearer
 * ridge with a knoll where the hero's camp has gone to sleep (FooterCamp.astro).
 *
 * Drawn once at build time in a 2400 × 140 view whose bottom edge is the footer's ground. The view
 * is wider than any screen shows: the footer slices it to its own width (keeping the bottom and
 * the centre), so the summit and the camp sit in the middle 620 units, which every width keeps.
 */
import { CAMP_VIEW, FIRE } from './hero-camp-geometry';
import {
  linePath,
  MARK,
  MARK_SLOPE,
  markPoint,
  type Point,
  polygon,
  smoothPath,
} from './hero-summit-geometry';

export const HORIZON = { width: 2400, height: 140 };
const { width: W, height: H } = HORIZON;

/** The band every screen width keeps, centred: from 360px phones to ultra-wide desktops. */
export const SAFE = { from: 890, to: 1510 };

const r1 = (value: number) => Math.round(value * 10) / 10;

/** Height of a ridgeline at `x`, by linear interpolation between its points. */
export function ridgeAt(points: readonly Point[], x: number): number {
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i] ?? [0, 0];
    const [x1, y1] = points[i + 1] ?? [0, 0];
    if (x >= x0 && x <= x1) return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
  }
  return (points[x < (points[0]?.[0] ?? 0) ? 0 : points.length - 1] ?? [0, H])[1];
}

/** A ridge line: faceted like the hero's ranges, or smooth like its foothills. */
function ridge(points: readonly Point[], smooth: boolean) {
  return { points, edge: smooth ? smoothPath(points) : linePath(points) };
}

/**
 * The back range, faceted like the hero's: a broad massif on the left, a saddle where the summit
 * stands clear of it, a long low stretch, and a second massif away to the right.
 */
export const BACK = ridge(
  [
    [-40, 96],
    [150, 90],
    [300, 94],
    [450, 85],
    [560, 88],
    [680, 76],
    [770, 82],
    [840, 79],
    [905, 91],
    [990, 93],
    [1080, 89],
    [1190, 96],
    [1310, 91],
    [1420, 97],
    [1560, 90],
    [1660, 84],
    [1760, 77],
    [1840, 83],
    [1930, 80],
    [2060, 92],
    [2200, 87],
    [W + 40, 95],
  ],
  false,
);

/** The near ridge: the ground underfoot, with a small knoll on the right where the camp is. */
export const NEAR = ridge(
  [
    [-40, 120],
    [260, 113],
    [560, 121],
    [820, 115],
    [1080, 122],
    [1260, 114],
    [1400, 111.5],
    [1540, 114],
    [1720, 119],
    [1900, 112],
    [2160, 120],
    [W + 40, 114],
  ],
  true,
);

/**
 * The summit: the Atlas mark, small and far off, its slopes carried down behind the back range
 * as on the hero's stage. Its left face catches the moon.
 */
export const SUMMIT = (() => {
  const apex: Point = [948, 40];
  const scale = 0.6;
  const at = (point: Point) => markPoint(point, apex, scale);
  const foot = H;
  const half = (foot - apex[1]) * MARK_SLOPE;
  const footLeft: Point = [apex[0] - half, foot];
  const footRight: Point = [apex[0] + half, foot];
  const cap = 13;
  const capHalf = cap * MARK_SLOPE;
  const hem: Point[] = [
    [apex[0] - capHalf, apex[1] + cap],
    [apex[0] - capHalf * 0.45, apex[1] + cap * 1.3],
    [apex[0], apex[1] + cap * 0.95],
    [apex[0] + capHalf * 0.45, apex[1] + cap * 1.25],
    [apex[0] + capHalf, apex[1] + cap],
  ];
  return {
    apex,
    scale,
    lit: polygon([footLeft, apex, [apex[0], foot]]),
    shade: polygon([apex, footRight, [apex[0], foot]]),
    capLit: polygon([apex, ...hem.slice(0, 3)]),
    capShade: polygon([apex, ...hem.slice(2)]),
    notch: polygon(
      [MARK.upperLeft, MARK.upperRight, MARK.innerApex, MARK.lowerRight, MARK.lowerLeft].map(at),
    ),
    /** Moonlight down the upper left face. */
    rim: linePath([apex, [apex[0] - half * 0.5, apex[1] + (foot - apex[1]) * 0.5]]),
    /** The notch's lower edge, catching the moon like the hero's. */
    ledge: linePath([at(MARK.lowerLeft), at(MARK.lowerRight)]),
  };
})();

/** The flag on the summit: a dark pole and a small blue pennant, cut like the hero's. */
export const FLAG = (() => {
  const [x, y] = SUMMIT.apex;
  const pole = 19;
  const top = y - pole;
  const w = 11;
  const h = 6.6;
  const cloth = `M${x + 0.6} ${top}H${r1(x + 0.6 + w)}L${r1(x + 0.6 + w * 0.77)} ${r1(top + h / 2)}L${r1(x + 0.6 + w)} ${r1(top + h)}H${x + 0.6}Z`;
  const fold = `M${x + 0.6} ${top}H${r1(x + 0.6 + w)}L${r1(x + 0.6 + w * 0.93)} ${r1(top + h * 0.15)}H${x + 0.6}Z`;
  return { x, top, bottom: y + 1, cloth, fold };
})();

/**
 * The camp on the knoll: the hero's own camp (utils/hero-camp-geometry.ts), two tents and the fire
 * between them, drawn at three quarters of its size with its ground line set on the near ridge.
 * The last warmth on the page. `transform` maps camp units into the horizon's view.
 */
export const CAMP = (() => {
  const x = 1400;
  const scale = 0.75;
  // Settled a fraction into the ground, never floating above it.
  const ground = r1(ridgeAt(NEAR.points, x) + 0.4);
  const toView = (campX: number) => r1(x + (campX - FIRE.x) * scale);
  return {
    fire: [x, ground] as Point,
    scale,
    transform: `translate(${toView(0)} ${r1(ground - CAMP_VIEW.ground * scale)}) scale(${scale})`,
    /** The camp's extent, guy-line pegs included, in horizon units. */
    from: toView(12),
    to: toView(224),
    /** Firelight pooled on the ground, and the warm air over the flames. */
    pool: { cx: x, cy: r1(ground + 1), rx: 96, ry: 10 },
    air: { cx: x, cy: r1(ground - 9), r: 30 },
  };
})();
/** A few faint stars over the horizon: the hero's sky, nearly gone. Entries are x, y, r, opacity. */
export const STARS: ReadonlyArray<readonly [number, number, number, number]> = [
  [520, 22, 0.9, 0.5],
  [690, 48, 0.7, 0.35],
  [780, 14, 1, 0.6],
  [1040, 30, 0.8, 0.45],
  [1190, 12, 0.7, 0.4],
  [1290, 52, 0.9, 0.5],
  [1400, 26, 0.7, 0.35],
  [1600, 40, 1, 0.55],
  [1720, 16, 0.8, 0.4],
  [1900, 46, 0.7, 0.3],
];

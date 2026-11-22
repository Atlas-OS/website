/**
 * Geometry for the home hero's "Summit" scene, rendered once at build time.
 *
 * The landscape is the stage the Atlas Manager window stands on. Its units are the window's own:
 * the window spans x −400…400 and y 0…604 (800 units wide, at the screenshot's 902×681 aspect),
 * so the scene scales with the window and the summit and camp always sit beside it.
 *
 * The summit is the Atlas mark: its exact slopes carried down into the hills, with its notch carved in.
 */

export type Point = readonly [x: number, y: number];

export const WINDOW = { width: 800, height: 604 };

/**
 * The stage reaches well past the window on every side; only the sides and edges show. Below the
 * window it runs on for 280 units, long enough to fade into the page without a step.
 */
export const STAGE_VIEW = { x: -1600, y: -260, width: 3200, height: 1144 };

/**
 * The stage fades in from its top edge until this height (above the highest ridge at −32 and the
 * moon's disc at −20), so no layer that reaches the top, like the horizon glow, shows the box's edge.
 */
export const STAGE_FADE_IN_TO = -100;

/** Where the stage starts fading into the page, and how. See SummitStage.astro. */
export const STAGE_FADE_FROM = 600;

/** Smoothstep alpha stops between two heights in stage units, as `rgb(0 0 0 / a) p%` entries. */
function fadeStops(fromY: number, toY: number, fromAlpha: number, toAlpha: number, steps: number) {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const eased = t * t * (3 - 2 * t);
    const alpha = Math.round((fromAlpha + (toAlpha - fromAlpha) * eased) * 1000) / 1000;
    const y = fromY + (toY - fromY) * t;
    const at = Math.round(((y - STAGE_VIEW.y) / STAGE_VIEW.height) * 10000) / 100;
    return `rgb(0 0 0 / ${alpha}) ${at}%`;
  });
}

/**
 * The stage's alpha mask: eased in from transparent at its top edge to opaque at `STAGE_FADE_IN_TO`,
 * opaque through the scene, then eased out from `STAGE_FADE_FROM` to transparent at its foot. Both
 * ramps are smoothstep, so neither end of either ramp shows as a line.
 */
export function stageFadeMask(steps = 10): string {
  const foot = STAGE_VIEW.y + STAGE_VIEW.height;
  const stops = [
    ...fadeStops(STAGE_VIEW.y, STAGE_FADE_IN_TO, 0, 1, steps),
    ...fadeStops(STAGE_FADE_FROM, foot, 1, 0, steps),
  ];
  return `linear-gradient(to bottom, ${stops.join(', ')})`;
}
export const STAGE_VIEWBOX = `${STAGE_VIEW.x} ${STAGE_VIEW.y} ${STAGE_VIEW.width} ${STAGE_VIEW.height}`;

/** The Atlas mark in its own coordinates (see src/assets/atlas-logo.svg). */
export const MARK = {
  apex: [53.403, 4.624],
  baseLeft: [4.903, 89.624],
  baseRight: [101.903, 89.624],
  lowerLeft: [15.156, 71.654],
  lowerRight: [71.141, 71.654],
  innerApex: [53.403, 40.565],
  upperRight: [45.952, 53.624],
  upperLeft: [25.444, 53.624],
} as const satisfies Record<string, Point>;

/**
 * The summit stands just left of the window, clear of the page's fixed Ask AI button at the bottom right,
 * and with its notch on the open side, so the window never hides it. The mark itself is never mirrored.
 */
export const PEAK = { apex: [-560, 44] as Point, scale: 3.4 };

/** The moon sits just behind the apex, so the peak and its flag stand in silhouette against it. */
export const MOON = { cx: -534, cy: 28, r: 48 };

/** Whole units are well under a pixel at any size, and keep the inline SVG lean. */
const round = (value: number) => Math.round(value);
const round1 = (value: number) => Math.round(value * 10) / 10;
const pt = ([x, y]: Point) => `${round(x)} ${round(y)}`;

export function at<T>(items: readonly T[], index: number): T {
  const item = items[index];
  if (item === undefined) throw new RangeError(`No item at index ${index}`);
  return item;
}

/** Map a point on the mark to a summit whose apex is at `apex`, `scale` times the mark's size. */
export function markPoint([x, y]: Point, apex: Point, scale: number): Point {
  const [ax, ay] = MARK.apex;
  return [apex[0] + (x - ax) * scale, apex[1] + (y - ay) * scale];
}

/** Map a point on the mark onto the stage's summit. */
export function fromMark(point: Point): Point {
  return markPoint(point, PEAK.apex, PEAK.scale);
}

/** Horizontal run per unit of drop along the mark's slopes. */
export const MARK_SLOPE = (MARK.apex[0] - MARK.baseLeft[0]) / (MARK.baseLeft[1] - MARK.apex[1]);

/** Straight segments: crisp, faceted ridges. */
export function linePath(points: readonly Point[]): string {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'}${pt(point)}`).join('');
}

/** A closed polygon. */
export function polygon(points: readonly Point[]): string {
  return `${linePath(points)}Z`;
}

/** A Catmull-Rom curve through every point: soft, rolling foothills. */
export function smoothPath(points: readonly Point[]): string {
  let d = `M${pt(at(points, 0))}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? at(points, i);
    const p1 = at(points, i);
    const p2 = at(points, i + 1);
    const p3 = points[i + 2] ?? p2;
    const c1: Point = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Point = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${pt(c1)} ${pt(c2)} ${pt(p2)}`;
  }
  return d;
}

/** Shapes run a little past the view box, so no shape's edge ever lands inside the stage. */
const BLEED = { x: 160, y: 60 };
const STAGE_BOTTOM = STAGE_VIEW.y + STAGE_VIEW.height + BLEED.y;

/** Close an open ridgeline down to `bottom`. */
function closeDown(edge: string, points: readonly Point[], bottom: number): string {
  const first = at(points, 0);
  const last = at(points, points.length - 1);
  return `${edge}L${round(last[0])} ${bottom}L${round(first[0])} ${bottom}Z`;
}

/** Height of a ridgeline at `x`, by linear interpolation between its points. */
export function ridgeY(points: readonly Point[], x: number): number {
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = at(points, i);
    const [x1, y1] = at(points, i + 1);
    if (x >= x0 && x <= x1) return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
  }
  return at(points, x < at(points, 0)[0] ? 0 : points.length - 1)[1];
}

export interface Ridge {
  /** Filled silhouette. */
  shape: string;
  /** The open ridgeline, stroked for rim light. */
  edge: string;
}

function ridge(points: readonly Point[], smooth = false): Ridge {
  const left = STAGE_VIEW.x - BLEED.x;
  const right = STAGE_VIEW.x + STAGE_VIEW.width + BLEED.x;
  const bled: Point[] = [
    [left, at(points, 0)[1]],
    ...points,
    [right, at(points, points.length - 1)[1]],
  ];
  const edge = smooth ? smoothPath(bled) : linePath(bled);
  return { edge, shape: closeDown(edge, bled, STAGE_BOTTOM) };
}

/*
 * Back to front. The far range just clears the window's top edge in a few places, so the window
 * reads as standing in front of the mountains. Near the summit (left) it stays low to leave the moon
 * clear; the near range levels off on the right, where the camp stands.
 */

const FAR: Point[] = [
  [-1600, 56],
  [-1530, 76],
  [-1420, 24],
  [-1320, 46],
  [-1200, -32],
  [-1080, 6],
  [-1000, -20],
  [-880, 66],
  [-780, 44],
  [-660, 104],
  [-540, 116],
  [-420, 96],
  [-300, 50],
  [-180, -18],
  [-80, 30],
  [40, 70],
  [150, 40],
  [250, -24],
  [380, 30],
  [480, 50],
  [580, -6],
  [650, 6],
  [740, -22],
  [860, 50],
  [960, 80],
  [1080, 14],
  [1160, 30],
  [1270, -32],
  [1410, 20],
  [1490, 0],
  [1600, 60],
];

const BACK: Point[] = [
  [-1600, 132],
  [-1450, 160],
  [-1320, 104],
  [-1180, 172],
  [-1060, 122],
  [-940, 202],
  [-820, 164],
  [-700, 236],
  [-480, 214],
  [-380, 232],
  [-200, 200],
  [0, 230],
  [200, 190],
  [380, 210],
  [480, 156],
  [600, 200],
  [700, 140],
  [800, 180],
  [930, 110],
  [1060, 150],
  [1180, 84],
  [1330, 160],
  [1450, 120],
  [1600, 190],
];

const HILLS: Point[] = [
  [-1600, 330],
  [-1440, 312],
  [-1240, 342],
  [-1040, 318],
  [-880, 344],
  [-720, 356],
  [-580, 350],
  [-440, 352],
  [-300, 424],
  [0, 470],
  [300, 450],
  [480, 412],
  [640, 382],
  [800, 348],
  [980, 304],
  [1180, 342],
  [1380, 300],
  [1600, 330],
];

/**
 * The near range. Its valley stays behind the window (whose bottom edge is at 604), so the crest
 * never dips into view below the app as a bowl; only the ground's own fade shows there.
 */
const NEAR: Point[] = [
  [-1600, 440],
  [-1400, 446],
  [-1100, 460],
  [-800, 486],
  [-560, 515],
  [-380, 540],
  [-200, 556],
  [0, 562],
  [200, 554],
  [360, 538],
  [440, 512],
  [540, 505],
  [640, 503],
  [780, 500],
  [1000, 488],
  [1300, 462],
  [1600, 440],
];

export const RIDGES = {
  far: ridge(FAR),
  back: ridge(BACK),
  hills: ridge(HILLS, true),
  near: ridge(NEAR, true),
};

/**
 * Where the camp stands on the near range, so the tents meet the ground. From 1440px wide it sits right
 * of the window, tucked close enough that it never passes under the page's fixed Ask AI button; on
 * narrower screens that strip is all button column, so it moves to the left foreground, under the summit.
 */
export const CAMP_GROUND = { x: 404, width: 240, y: ridgeY(NEAR, 524) };
export const CAMP_GROUND_NARROW = { x: -645, width: 240, y: ridgeY(NEAR, -525) };

/**
 * A moonlit snowcap on the peak at `index`: both slopes down to `depth`, with a zigzag hem.
 */
export function snowCap(points: readonly Point[], index: number, depth: number): string {
  const apex = at(points, index);
  const slopePoint = (neighbour: Point): Point => {
    const t = Math.min(1, depth / Math.max(1, neighbour[1] - apex[1]));
    return [apex[0] + (neighbour[0] - apex[0]) * t, apex[1] + (neighbour[1] - apex[1]) * t];
  };
  const left = slopePoint(at(points, index - 1));
  const right = slopePoint(at(points, index + 1));
  const teeth = 4;
  const hem: Point[] = [];
  for (let i = 1; i < teeth; i++) {
    const t = i / teeth;
    const x = right[0] + (left[0] - right[0]) * t;
    const y = right[1] + (left[1] - right[1]) * t;
    hem.push([x, y + (i % 2 === 1 ? -depth * 0.28 : depth * 0.08)]);
  }
  return polygon([apex, right, ...hem, left]);
}

export const SNOWCAPS = [
  snowCap(FAR, 4, 30),
  snowCap(FAR, 6, 24),
  snowCap(FAR, 17, 22),
  snowCap(FAR, 22, 26),
  snowCap(FAR, 27, 30),
];

/*
 * The summit: the Atlas mark's slopes carried straight down into the hills, split into a lit and a
 * shaded face, with the mark's notch carved into them. No base line or shoulders: the clouds and
 * hills in front hide the foot, so the peak reads as one clean mountain topped by the mark.
 */

function summitGeometry() {
  const apex = PEAK.apex;
  const slope = MARK_SLOPE;
  const bottom = STAGE_BOTTOM;
  const drop = bottom - apex[1];
  const footLeft: Point = [apex[0] - drop * slope, bottom];
  const footRight: Point = [apex[0] + drop * slope, bottom];
  const [upperLeft, upperRight, innerApex, lowerRight, lowerLeft] = [
    MARK.upperLeft,
    MARK.upperRight,
    MARK.innerApex,
    MARK.lowerRight,
    MARK.lowerLeft,
  ].map(fromMark) as [Point, Point, Point, Point, Point];

  // A snowcap with an uneven hem, inside the mark's faces and split down the same line.
  const k = PEAK.scale / 5;
  const capDepth = 82 * k;
  const capY = apex[1] + capDepth;
  const capHalf = capDepth * slope;
  const hem = [16, -2, 24, 4, 26, 0, 12].map((dip, i, all): Point => {
    const t = (i + 1) / (all.length + 1);
    return [apex[0] - capHalf + capHalf * 2 * t, capY + dip * k];
  });
  const middle = Math.floor(hem.length / 2);

  return {
    apex,
    /** The mountain's two faces, split on the mark's axis, which runs through the notch's peak. */
    markLit: polygon([apex, footLeft, [apex[0], bottom]]),
    markShade: polygon([apex, [apex[0], bottom], footRight]),
    capLit: polygon([apex, [apex[0] - capHalf, capY], ...hem.slice(0, middle + 1)]),
    capShade: polygon([apex, ...hem.slice(middle), [apex[0] + capHalf, capY]]),
    notch: polygon([upperLeft, upperRight, innerApex, lowerRight, lowerLeft]),
    /** The notch's floor faces up at the moon and catches its light; its ceiling falls in shadow. */
    notchFloor: linePath([lowerLeft, lowerRight]),
    notchCeiling: linePath([upperLeft, upperRight, innerApex]),
    markEdge: linePath([footLeft, apex, footRight]),
  };
}
export const SUMMIT = summitGeometry();

/**
 * The lantern's track box: the bounding box of the summit's notch. The lantern element is this
 * size and moves by percentages of itself, so its keyframes are scale-free fractions of the mark.
 */
export const LANTERN_TRACK = (() => {
  const [x0, y1] = fromMark(MARK.lowerLeft);
  const [x1] = fromMark(MARK.lowerRight);
  const [, y0] = fromMark(MARK.innerApex);
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
})();

export interface RouteStop {
  /** Keyframe offset, in percent of the loop. */
  at: number;
  /** Position within the lantern's track box, in percent of its width and height. */
  x: number;
  y: number;
}

/**
 * The lantern's walk along the notch, as keyframes. Times are proportional to segment length so
 * it keeps a steady pace. The `summit-lantern` keyframes in SummitStage.astro use these values.
 */
export function lanternRoute(start = 5, end = 81): RouteStop[] {
  const stops = [MARK.lowerLeft, MARK.lowerRight, MARK.innerApex, MARK.upperRight, MARK.upperLeft];
  const [x0, y1] = MARK.lowerLeft;
  const [x1] = MARK.lowerRight;
  const [, y0] = MARK.innerApex;
  const lengths = stops.slice(1).map((point, i) => {
    const previous = at(stops, i);
    return Math.hypot(point[0] - previous[0], point[1] - previous[1]);
  });
  const total = lengths.reduce((sum, length) => sum + length, 0);
  const pct = (value: number) => Math.round(value * 10000) / 100;

  let elapsed = 0;
  return stops.map(([x, y], i) => {
    if (i > 0) elapsed += at(lengths, i - 1);
    return {
      at: pct((start + ((end - start) * elapsed) / total) / 100),
      x: pct((x - x0) / (x1 - x0)),
      y: pct((y - y0) / (y1 - y0)),
    };
  });
}

/* Topographic contours etched faintly onto the far range, after the Atlas wallpapers. */

/**
 * Lines of equal height seen from the front: level, but bowed by the terrain, so they read as
 * contours wrapping each face rather than stripes. Clipped to the far range when drawn.
 */
export function contourPaths(count = 8, top = 4, gap = 28): string[] {
  const paths: string[] = [];
  for (let i = 0; i < count; i++) {
    const base = top + i * gap;
    const points: Point[] = [];
    for (let x = -1760; x <= 1760; x += 110) {
      const swell = 11 * Math.sin(x / 173 + i * 1.3) + 5 * Math.sin(x / 97 + i * 2.1);
      points.push([x, base + swell]);
    }
    paths.push(smoothPath(points));
  }
  return paths;
}

/* Pines on the near range, either side of the window. */

export function pinePath(x: number, baseY: number, height: number): string {
  const tiers = 3;
  let d = '';
  for (let t = 0; t < tiers; t++) {
    const top = baseY - height + t * height * 0.26;
    const bottom = top + height * 0.46;
    const half = height * (0.17 + t * 0.07);
    d += `M${pt([x, top])}L${pt([x + half, bottom])}L${pt([x - half, bottom])}Z`;
  }
  const trunk = height * 0.05;
  d += `M${pt([x - trunk, baseY - height * 0.2])}h${round(trunk * 2)}V${round(baseY + 6)}h${round(-trunk * 2)}Z`;
  return d;
}

const PINE_SPOTS: readonly Point[] = [
  [1060, 48],
  [1000, 64],
  [940, 80],
  [880, 54],
  [820, 66],
  [740, 42],
  [-470, 40],
  [-516, 56],
  [-566, 36],
  [-640, 48],
  [-900, 52],
  [-962, 70],
  [-1024, 46],
  [-1120, 60],
];

export const PINES = PINE_SPOTS.map(([x, height]) => pinePath(x, ridgeY(NEAR, x) + 8, height));

/** Smaller, hazier pines on the hills behind the camp, for depth. */
const HILL_PINE_SPOTS: readonly Point[] = [
  [700, 22],
  [668, 30],
  [610, 20],
  [560, 26],
  [520, 18],
  [1120, 26],
  [1080, 20],
];

export const HILL_PINES = HILL_PINE_SPOTS.map(([x, height]) =>
  pinePath(x, ridgeY(HILLS, x) + 5, height),
).join('');

/* Low clouds. Each band repeats a 1600-unit tile three times, so drifting by one tile loops. */

export const FOG_TILE = 1600;

export interface Cloud {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A cartoon cloud: a row of arcs over a body that reaches straight down to `base`. */
export function cloudPath({ x, y, width, height }: Cloud, base = y): string {
  const tops: Point[] = [
    [x, y],
    [x + width * 0.16, y - height * 0.42],
    [x + width * 0.4, y - height * 0.72],
    [x + width * 0.66, y - height * 0.5],
    [x + width * 0.86, y - height * 0.28],
    [x + width, y],
  ];
  let d = `M${pt(at(tops, 0))}`;
  for (let i = 1; i < tops.length; i++) {
    const [x0, y0] = at(tops, i - 1);
    const [x1, y1] = at(tops, i);
    const r = (Math.hypot(x1 - x0, y1 - y0) / 2) * 1.08;
    d += `A${round(r)} ${round(r)} 0 0 1 ${pt([x1, y1])}`;
  }
  if (base > y) d += `L${pt([x + width, base])}L${pt([x, base])}`;
  return `${d}Z`;
}

/**
 * A band of clouds whose bodies all reach its lowest cloud's base. The band fades out downwards
 * across its whole height (see SummitStage.astro), so a cloud that stopped higher would end on a
 * faint flat edge wherever nothing in front of it hides that edge.
 */
export function cloudBand(clouds: readonly Cloud[]): string {
  const base = Math.max(...clouds.map(cloud => cloud.y));
  return clouds.map(cloud => cloudPath(cloud, base)).join('');
}

/** Cloud tiles, in tile-local x (0…1600) and stage y. */
export const FOG = {
  far: {
    top: 150,
    height: 70,
    d: cloudBand([
      { x: 80, y: 204, width: 300, height: 34 },
      { x: 520, y: 210, width: 380, height: 30 },
      { x: 1050, y: 200, width: 260, height: 36 },
      { x: 1380, y: 208, width: 180, height: 26 },
    ]),
  },
  mid: {
    top: 300,
    height: 80,
    d: cloudBand([
      { x: 40, y: 362, width: 300, height: 46 },
      { x: 420, y: 370, width: 360, height: 54 },
      { x: 860, y: 356, width: 320, height: 50 },
      { x: 1250, y: 366, width: 300, height: 44 },
    ]),
  },
};

/* Stars, scattered with a seeded generator so every build renders the same sky. */

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

export interface Star {
  x: number;
  y: number;
  r: number;
  /** 0 holds still; 1 and 2 twinkle out of step. */
  group: number;
  cool: boolean;
}

export const STAR_VIEW = { width: 1600, height: 900 };

/** Many stars as one path of tiny circles: one element instead of hundreds. */
export function starsPath(stars: readonly Star[]): string {
  return stars
    .map(
      ({ x, y, r }) =>
        `M${round1(x - r)} ${y}a${r} ${r} 0 1 0 ${round1(r * 2)} 0a${r} ${r} 0 1 0 ${round1(-r * 2)} 0`,
    )
    .join('');
}

/**
 * A quiet sky: stars thin out behind the copy column, so nothing busy sits behind the headline.
 */
export function scatterStars(count = 150, seed = 0xa71a5): Star[] {
  const random = mulberry32(seed);
  const stars: Star[] = [];
  for (let index = 0; index < count; index++) {
    const bright = random() > 0.94;
    const x = random() * STAR_VIEW.width;
    const y = random() ** 1.2 * STAR_VIEW.height;
    const r = bright ? 1.5 + random() * 0.5 : 0.55 + random() * 0.8;
    const cool = random() > 0.7;
    const behindCopy = x > 470 && x < 1130 && y > 60 && y < 600;
    if (behindCopy && random() > 0.22) continue;
    stars.push({ x: round1(x), y: round1(y), r: round1(r), group: index % 3, cool });
  }
  return stars;
}

/** A small static horizon for the docs index header: soft hills and the same summit. */
export const DOCS_RIDGE = (() => {
  const view = { width: 420, height: 84 };
  const apex: Point = [318, 20];
  const scale = 0.72;
  const base = view.height;
  // The mark's slopes carried down to the horizon, as on the stage.
  const half = (base - apex[1]) * MARK_SLOPE;
  const footLeft: Point = [apex[0] - half, base];
  const footRight: Point = [apex[0] + half, base];
  const hills: Point[] = [
    [0, 70],
    [44, 58],
    [86, 64],
    [138, 44],
    [176, 54],
    [214, 48],
    [262, 64],
    [300, 72],
    [350, 66],
    [390, 56],
    [420, 62],
  ];
  const edge = smoothPath(hills);
  const [upperLeft, upperRight, innerApex, lowerRight, lowerLeft] = [
    MARK.upperLeft,
    MARK.upperRight,
    MARK.innerApex,
    MARK.lowerRight,
    MARK.lowerLeft,
  ].map(point => markPoint(point, apex, scale)) as [Point, Point, Point, Point, Point];

  return {
    view,
    apex,
    hills: { edge, shape: closeDown(edge, hills, base) },
    summit: polygon([footLeft, apex, footRight]),
    summitEdge: linePath([footLeft, apex, footRight]),
    litFace: polygon([footLeft, apex, [apex[0], base]]),
    notch: polygon([upperLeft, upperRight, innerApex, lowerRight, lowerLeft]),
  };
})();

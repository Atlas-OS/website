/**
 * Easter egg for the home hero's summit: clicking the flag lowers it and sends up a short fireworks
 * show from the peak (one or two shells), then raises the flag again.
 *
 * Pointer-only and decorative (the stage is aria-hidden), and skipped entirely under reduced motion.
 * The canvas is created on the first click, sits between the mountains and the Atlas Manager window
 * so no spark draws over the app, and its loop only runs while a show is in the air.
 */

const READY_ATTRIBUTE = 'data-flag-ready';
const LOWERED_ATTRIBUTE = 'data-flag-lowered';

/** Keep in sync with the `.stage-flag__cloth` transitions in SummitStage.astro. */
const LOWER_MS = 600;
const RAISE_MS = 700;
/** The first rocket leaves as the flag reaches the bottom of its pole. */
const FIRST_LAUNCH_MS = LOWER_MS - 120;
const SECOND_LAUNCH_GAP_MS = 640;
const RAISE_AFTER_LAST_SPARK_MS = 250;

/** Physics in CSS px and seconds at scale 1 (the window at its full 800px width). */
const GRAVITY = 300;
const SPARK_DRAG = 1.9;
const MAX_DPR = 2;

type Palette = readonly [string, string, string];

/** Atlas blue, campfire gold and aurora violet: colours already in the scene. */
const PALETTES: readonly Palette[] = [
  ['#48A7FF', '#A8D6FF', '#FFFFFF'],
  ['#FFC46B', '#FFE0A8', '#FFF6E6'],
  ['#9D8CFF', '#D2CAFF', '#FFFFFF'],
];
/** The same three by day: deeper, so they read against the pale sky without the night to glow in. */
const DAY_PALETTES: readonly Palette[] = [
  ['#1F7AE0', '#48A7FF', '#0F5FC2'],
  ['#F08C1A', '#FFB347', '#D96F00'],
  ['#6B5BE0', '#9D8CFF', '#5141C8'],
];

const isDay = () => document.documentElement.dataset.theme === 'light';

interface ShellPlan {
  rise: number;
  drift: number;
  sparks: number;
  speed: number;
  palette: Palette;
}

interface Shell {
  x: number;
  y: number;
  vx: number;
  vy: number;
  trail: Array<readonly [number, number]>;
  plan: ShellPlan;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  ttl: number;
  size: number;
  color: string;
  twinkle: boolean;
}

interface Flash {
  x: number;
  y: number;
  age: number;
  radius: number;
  color: string;
}

const random = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)] as T;

/** Two different palettes for the two shells of one show. */
function pickPalettes(): [Palette, Palette] {
  const palettes = isDay() ? DAY_PALETTES : PALETTES;
  const first = pick(palettes);
  const second = pick(palettes.filter(palette => palette !== first));
  return [first, second];
}

export function initFlagFireworks(world: HTMLElement, signal: AbortSignal): void {
  const flag = world.querySelector<HTMLElement>('[data-summit-flag]');
  const stage = world.querySelector<HTMLElement>('.manager-window');
  const scene = stage?.querySelector<HTMLElement>('.summit-stage');
  if (!flag || !stage || !scene) return;

  let canvas: HTMLCanvasElement | null = null;
  let context: CanvasRenderingContext2D | null = null;
  let frame = 0;
  let running = false;
  const timers = new Set<number>();
  const later = (ms: number, run: () => void) => {
    const id = window.setTimeout(() => {
      timers.delete(id);
      run();
    }, ms);
    timers.add(id);
  };

  let shells: Shell[] = [];
  let sparks: Spark[] = [];
  let flashes: Flash[] = [];
  let scale = 1;
  let origin = { x: 0, y: 0 };
  let last = 0;

  /** Size the canvas around the flag: room above for the rise and bursts, a little below for falling sparks. */
  const prepareCanvas = () => {
    const flagRect = flag.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    scale = Math.min(1, Math.max(0.55, stageRect.width / 800));
    const width = Math.round(760 * scale);
    const height = Math.round(720 * scale);
    // The pole stands at the left edge of the flag's box, and its top is the box's top.
    const poleX = flagRect.left + flagRect.width * (2 / 40);
    const left = poleX - stageRect.left - width / 2;
    const top = flagRect.top - stageRect.top - height * 0.78;
    origin = { x: width / 2, y: height * 0.78 };

    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      // Created at runtime, so scoped styles can't reach it: above the mountains, below the window.
      Object.assign(canvas.style, { position: 'absolute', zIndex: '0', pointerEvents: 'none' });
      scene.after(canvas);
      context = canvas.getContext('2d');
    }
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    Object.assign(canvas.style, {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
    });
    context?.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const launch = (plan: ShellPlan) => {
    // Launch speed that peaks at the planned height: v = √(2gh).
    const vy = -Math.sqrt(2 * GRAVITY * scale * plan.rise * scale);
    shells.push({ x: origin.x, y: origin.y, vx: plan.drift * scale, vy, trail: [], plan });
  };

  const burst = (shell: Shell) => {
    const { plan } = shell;
    flashes.push({ x: shell.x, y: shell.y, age: 0, radius: 60 * scale, color: plan.palette[1] });
    // A peony: an outer ring of fast sparks around a slower inner core, so the burst reads full.
    const ring = Math.round(plan.sparks * 0.7);
    for (let index = 0; index < plan.sparks; index++) {
      const outer = index < ring;
      const count = outer ? ring : plan.sparks - ring;
      const slot = outer ? index : index - ring;
      // Mostly the two main tones, with every fifth spark in the palette's bright core colour.
      const tone: 0 | 1 | 2 = index % 5 === 0 ? 2 : index % 2 === 0 ? 0 : 1;
      const angle = (slot / count) * Math.PI * 2 + random(-0.1, 0.1);
      const speed = plan.speed * scale * (outer ? random(0.82, 1) : random(0.32, 0.55));
      sparks.push({
        x: shell.x,
        y: shell.y,
        vx: Math.cos(angle) * speed + shell.vx * 0.3,
        vy: Math.sin(angle) * speed - 18 * scale,
        age: 0,
        ttl: random(1.2, 1.85),
        size: random(1.8, 2.8) * scale + 0.4,
        color: plan.palette[outer ? tone : 2],
        twinkle: Math.random() < 0.25,
      });
    }
  };

  const update = (dt: number) => {
    const gravity = GRAVITY * scale;
    for (const shell of shells) {
      shell.vy += gravity * dt;
      shell.x += shell.vx * dt;
      shell.y += shell.vy * dt;
      shell.trail.push([shell.x, shell.y]);
      if (shell.trail.length > 9) shell.trail.shift();
    }
    // A shell bursts as it slows near the top of its climb.
    const climbing: Shell[] = [];
    for (const shell of shells) {
      if (shell.vy > -40 * scale) burst(shell);
      else climbing.push(shell);
    }
    shells = climbing;

    const drag = Math.exp(-SPARK_DRAG * dt);
    for (const spark of sparks) {
      spark.vx *= drag;
      spark.vy = spark.vy * drag + gravity * 0.42 * dt;
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
      spark.age += dt;
    }
    sparks = sparks.filter(spark => spark.age < spark.ttl);

    for (const flash of flashes) flash.age += dt;
    flashes = flashes.filter(flash => flash.age < 0.22);
  };

  const draw = () => {
    const ctx = context;
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Light adds up against the night; by day there is nothing to add to, so paint it plainly.
    const day = isDay();
    ctx.globalCompositeOperation = day ? 'source-over' : 'lighter';
    ctx.lineCap = 'round';

    for (const flash of day ? [] : flashes) {
      const fade = 1 - flash.age / 0.22;
      const glow = ctx.createRadialGradient(flash.x, flash.y, 0, flash.x, flash.y, flash.radius);
      glow.addColorStop(0, `rgb(255 255 255 / ${(0.55 * fade).toFixed(3)})`);
      glow.addColorStop(0.4, hexAlpha(flash.color, 0.25 * fade));
      glow.addColorStop(1, 'rgb(0 0 0 / 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(
        flash.x - flash.radius,
        flash.y - flash.radius,
        flash.radius * 2,
        flash.radius * 2,
      );
    }

    // Rising shells: a warm tapering trail behind a bright head.
    for (const shell of shells) {
      shell.trail.forEach(([x, y], index) => {
        const strength = (index + 1) / shell.trail.length;
        ctx.fillStyle = day
          ? `rgb(240 140 40 / ${(0.6 * strength).toFixed(3)})`
          : `rgb(255 236 200 / ${(0.55 * strength).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, (0.6 + strength * 1.4) * scale + 0.3, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Sparks as bright streaks along their motion; some twinkle as they fade. (No halo: on a
    // transparent canvas a faint coloured halo composites over the night as grey, not as glow.)
    for (const spark of sparks) {
      const life = spark.age / spark.ttl;
      let alpha = 1 - life ** 1.7;
      if (spark.twinkle && life > 0.45) alpha *= 0.45 + 0.55 * Math.abs(Math.sin(spark.age * 38));
      ctx.strokeStyle = hexAlpha(spark.color, alpha);
      ctx.lineWidth = spark.size;
      ctx.beginPath();
      ctx.moveTo(spark.x - spark.vx * 0.05, spark.y - spark.vy * 0.05);
      ctx.lineTo(spark.x, spark.y);
      ctx.stroke();
    }
  };

  const tick = (now: number) => {
    // Clamp long frames (a background tab, a hitch) so nothing jumps.
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
    if (shells.length || sparks.length || flashes.length || timers.size) {
      frame = requestAnimationFrame(tick);
    } else {
      frame = 0;
      draw();
      later(RAISE_AFTER_LAST_SPARK_MS, raise);
    }
  };

  const startLoop = () => {
    if (frame) return;
    last = performance.now();
    frame = requestAnimationFrame(tick);
  };

  const raise = () => {
    world.removeAttribute(LOWERED_ATTRIBUTE);
    later(RAISE_MS, () => {
      running = false;
    });
  };

  const show = () => {
    if (running) return;
    running = true;
    world.setAttribute(LOWERED_ATTRIBUTE, '');
    prepareCanvas();

    const [first, second] = pickPalettes();
    const double = Math.random() < 0.7;
    later(FIRST_LAUNCH_MS, () => {
      launch({
        rise: double ? random(250, 300) : random(290, 330),
        drift: random(-40, 40),
        sparks: double ? 86 : 110,
        speed: double ? 240 : 275,
        palette: first,
      });
      startLoop();
    });
    if (double) {
      later(FIRST_LAUNCH_MS + SECOND_LAUNCH_GAP_MS, () => {
        launch({
          rise: random(175, 215),
          drift: random(-70, 70),
          sparks: 62,
          speed: 190,
          palette: second,
        });
        startLoop();
      });
    }
  };

  flag.addEventListener('click', show, { signal });
  world.setAttribute(READY_ATTRIBUTE, '');

  signal.addEventListener(
    'abort',
    () => {
      if (frame) cancelAnimationFrame(frame);
      for (const id of timers) window.clearTimeout(id);
      timers.clear();
      canvas?.remove();
      world.removeAttribute(READY_ATTRIBUTE);
      world.removeAttribute(LOWERED_ATTRIBUTE);
    },
    { once: true },
  );
}

/** `#RRGGBB` plus alpha as a CSS colour. */
function hexAlpha(hex: string, alpha: number): string {
  const value = Number.parseInt(hex.slice(1), 16);
  const clamped = Math.max(0, Math.min(1, alpha));
  return `rgb(${(value >> 16) & 255} ${(value >> 8) & 255} ${value & 255} / ${clamped.toFixed(3)})`;
}

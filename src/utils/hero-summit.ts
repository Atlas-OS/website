import { initFlagFireworks } from './hero-fireworks';
import { prefersReducedMotion } from './page-lifecycle';

/**
 * Client-side extras for the home hero's "Summit" scene (see components/sections/hero).
 *
 * The scene is complete without JavaScript: sky, ranges, summit and camp are server-rendered SVG,
 * and their ambient motion is CSS. This only:
 * - starts the moonrise behind the summit once the summit is in view,
 * - pauses every loop while the hero is off screen or the tab is hidden,
 * - sends a single shooting star across the upper sky every 10–15 seconds,
 * - wires the summit flag's fireworks easter egg (utils/hero-fireworks.ts).
 */

const PAUSED_ATTRIBUTE = 'data-summit-paused';
const PLAY_ATTRIBUTE = 'data-summit-play';
const METEOR_FIRST_DELAY_MS: Range = [3500, 6500];
const METEOR_DELAY_MS: Range = [10000, 15000];
const METEOR_DURATION_MS = 1100;
/** Shooting stars start in this band of the sky (px from the top of the hero), above the stage. */
const METEOR_SKY_PX: Range = [30, 260];
/** Space kept between a shooting star and the copy's text. */
const METEOR_GAP_PX = 40;
/** A side needs at least this much clear sky beside the copy for a shooting star. */
const METEOR_MIN_ROOM_PX = 140;

type Range = readonly [min: number, max: number];
type ActivityListener = (active: boolean) => void;

const between = ([min, max]: Range) => min + Math.random() * (max - min);

export function initSummit(signal: AbortSignal): void {
  const world = document.querySelector<HTMLElement>('[data-summit-world]');
  if (!world || prefersReducedMotion()) return;

  initFlagFireworks(world, signal);

  if (!('IntersectionObserver' in window)) {
    world.setAttribute(PLAY_ATTRIBUTE, '');
    return;
  }

  cueArrival(world, signal);

  const listeners: ActivityListener[] = [startMeteors(world, signal)];
  let inView = true;
  let pageVisible = document.visibilityState === 'visible';
  let wasActive = true;

  const update = () => {
    const active = inView && pageVisible;
    world.toggleAttribute(PAUSED_ATTRIBUTE, !active);
    if (active === wasActive) return;
    wasActive = active;
    for (const listener of listeners) listener(active);
  };

  const observer = new IntersectionObserver(entries => {
    const entry = entries[entries.length - 1];
    if (!entry) return;
    inView = entry.isIntersecting;
    update();
  });
  observer.observe(world);
  document.addEventListener(
    'visibilitychange',
    () => {
      pageVisible = document.visibilityState === 'visible';
      update();
    },
    { signal },
  );

  signal.addEventListener(
    'abort',
    () => {
      observer.disconnect();
      for (const listener of listeners) listener(false);
      world.removeAttribute(PAUSED_ATTRIBUTE);
    },
    { once: true },
  );
}

/** The moonrise plays once, when most of the moon and summit are on screen. */
function cueArrival(world: HTMLElement, signal: AbortSignal): void {
  const cue = world.querySelector<HTMLElement>('[data-summit-cue]');
  if (!cue) {
    world.setAttribute(PLAY_ATTRIBUTE, '');
    return;
  }

  const observer = new IntersectionObserver(
    entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      world.setAttribute(PLAY_ATTRIBUTE, '');
      observer.disconnect();
    },
    { threshold: 0.4 },
  );
  observer.observe(cue);
  signal.addEventListener('abort', () => observer.disconnect(), { once: true });
}

/**
 * Clear sky either side of the copy, in px from the hero's edges: measured from the text itself
 * (headline and paragraphs, pill, buttons and links), not from their full-width containers.
 */
function clearMargins(world: HTMLElement): { left: number; right: number } {
  const copy = world.querySelector('[data-summit-avoid]');
  if (!copy) return { left: 0, right: 0 };

  const range = document.createRange();
  let textLeft = Infinity;
  let textRight = -Infinity;
  const include = (rect: DOMRect) => {
    if (rect.width === 0) return;
    textLeft = Math.min(textLeft, rect.left);
    textRight = Math.max(textRight, rect.right);
  };
  for (const block of copy.querySelectorAll('h1, p')) {
    range.selectNodeContents(block);
    include(range.getBoundingClientRect());
  }
  for (const element of copy.querySelectorAll('a, button, [data-animate]:first-child')) {
    include(element.getBoundingClientRect());
  }
  if (!Number.isFinite(textLeft)) return { left: 0, right: 0 };

  const bounds = world.getBoundingClientRect();
  return {
    left: textLeft - bounds.left - METEOR_GAP_PX,
    right: bounds.right - textRight - METEOR_GAP_PX,
  };
}

/** A single shooting star every 10–15 seconds, run on the compositor with WAAPI. */
function startMeteors(world: HTMLElement, signal: AbortSignal): ActivityListener {
  const meteor = world.querySelector<HTMLElement>('[data-summit-meteor]');
  // On narrow screens the copy fills the width, so there is no clear sky to cross.
  if (!meteor || !window.matchMedia('(min-width: 768px)').matches) return () => {};

  let timer = 0;
  let flight: Animation | null = null;
  let delay = METEOR_FIRST_DELAY_MS;

  const schedule = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(fly, between(delay));
    delay = METEOR_DELAY_MS;
  };

  const fly = () => {
    const width = world.clientWidth;
    const room = clearMargins(world);
    const sides = (['left', 'right'] as const).filter(side => room[side] >= METEOR_MIN_ROOM_PX);
    const side = sides[Math.floor(Math.random() * sides.length)];
    if (!side) {
      schedule();
      return;
    }

    // Start in the clear margin beside the copy and fall outwards, away from the text, the window
    // and the moon below; the whole flight stays in the upper sky band.
    const margin = room[side];
    const inset = margin * (0.35 + Math.random() * 0.5);
    const x = side === 'left' ? inset : width - inset;
    const y = between(METEOR_SKY_PX);
    const dip = 14 + Math.random() * 14;
    const angle = side === 'left' ? 180 - dip : dip;
    const distance = Math.min(inset - 8, 200 + Math.random() * 120);
    const origin = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${angle.toFixed(1)}deg)`;

    flight = meteor.animate(
      [
        { transform: `${origin} translateX(0) scaleX(0.4)`, opacity: 0 },
        { opacity: 1, offset: 0.14 },
        { opacity: 0.85, offset: 0.55 },
        { transform: `${origin} translateX(${distance.toFixed(1)}px) scaleX(1)`, opacity: 0 },
      ],
      { duration: METEOR_DURATION_MS, easing: 'cubic-bezier(0.33, 1, 0.68, 1)' },
    );
    flight.finished.then(schedule, () => {
      // Cancelled when the hero leaves the screen; resuming schedules the next one.
    });
  };

  const stop = () => {
    window.clearTimeout(timer);
    flight?.cancel();
    flight = null;
  };

  signal.addEventListener('abort', stop, { once: true });
  schedule();

  return active => {
    stop();
    if (active && !signal.aborted) schedule();
  };
}

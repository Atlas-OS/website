/**
 * Glows in the Summit language. Light in the night scenes never shows as a disc: it falls off
 * slowly from a low peak and thins out to nothing, so there is no edge to see. This is the falloff
 * of the Open source sky's patch of deeper night, tuned by eye: about half the peak a third of the
 * way out, a fifth by halfway, nearly gone by four fifths.
 *
 * The falloff is shared; the shape, size, colour and peak belong to each glow (a moon's halo is
 * wide and faint, a lantern's is small and warm, a camp's is pooled on the ground).
 */

export interface GlowStop {
  /** 0 at the centre, 1 at the edge. */
  offset: number;
  opacity: number;
}

const round = (value: number, places = 3) => Math.round(value * 10 ** places) / 10 ** places;

/**
 * Stops for a glow from `peak` opacity at the centre to nothing at the edge. `hold` keeps the peak
 * for the first part of the radius, for glows around a solid body such as the moon's disc.
 */
export function glowStops(
  peak: number,
  { hold = 0, steps = 7 }: { hold?: number; steps?: number } = {},
): GlowStop[] {
  return Array.from({ length: steps }, (_, i) => {
    const t = i / (steps - 1);
    return {
      offset: round(hold + (1 - hold) * t),
      opacity: round(peak * (1 - t) ** 1.8),
    };
  });
}

/** The patch of deeper night behind the scenes, and the soft piece of pale sky it becomes by day. */
export const NIGHT_PATCH = 'oklch(0.383 0.108 262.5)';
export const DAY_PATCH = 'oklch(0.838 0.06 248.5)';

/**
 * The same falloff as a CSS radial gradient, for patches of night behind HTML: one `color` (any
 * CSS colour, such as an `oklch()`) thinning out with `color-mix()`, so every stop is that colour.
 */
export function cssGlow(color: string, peak: number, shape = 'ellipse 50% 50% at 50% 50%'): string {
  const stops = glowStops(peak).map(
    ({ offset, opacity }) =>
      `color-mix(in oklch, ${color} ${round(opacity * 100, 1)}%, transparent) ${round(offset * 100, 1)}%`,
  );
  return `radial-gradient(${shape}, ${stops.join(', ')})`;
}

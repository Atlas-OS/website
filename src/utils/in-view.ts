/**
 * Pause a section's ambient loops while it is off screen. Toggles `data-paused` on every element
 * matching `selector` as it leaves and re-enters the viewport (with a little margin, so loops are
 * already running as the section scrolls in). Pair it with, in the section's CSS:
 *
 *   [data-paused] .my-loop { animation-play-state: paused; }
 */
export function pauseWhenOffscreen(selector: string, signal: AbortSignal): void {
  const elements = document.querySelectorAll<HTMLElement>(selector);
  if (elements.length === 0 || !('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver(
    entries => {
      for (const entry of entries)
        entry.target.toggleAttribute('data-paused', !entry.isIntersecting);
    },
    { rootMargin: '120px 0px' },
  );
  for (const element of elements) observer.observe(element);
  signal.addEventListener(
    'abort',
    () => {
      observer.disconnect();
      for (const element of elements) element.removeAttribute('data-paused');
    },
    { once: true },
  );
}

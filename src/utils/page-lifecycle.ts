/**
 * Run `setup` on every page load, including View Transitions navigations.
 *
 * Each run receives an `AbortSignal` that is aborted before the next navigation swaps the DOM,
 * so listeners and observers registered with it are cleaned up automatically.
 */
export function onPageLoad(setup: (signal: AbortSignal) => void): void {
  let controller: AbortController | null = null;

  const teardown = () => {
    controller?.abort();
    controller = null;
  };

  document.addEventListener('astro:page-load', () => {
    teardown();
    controller = new AbortController();
    setup(controller.signal);
  });

  document.addEventListener('astro:before-swap', teardown);
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function isLocalhost(): boolean {
  const { hostname } = window.location;
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

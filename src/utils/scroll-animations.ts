import { prefersReducedMotion } from './page-lifecycle';

const REVEAL_CLASS = 'animate-in';

/**
 * Reveal `[data-animate]` elements as they scroll into view.
 *
 * The hidden starting state only applies while `<html data-motion>` is set (see BaseLayout),
 * so content is never hidden for users without JavaScript or with reduced motion enabled.
 * Stagger is expressed through `--animate-delay`, read from `data-animate-delay` or from a
 * child's position inside a `[data-animate-stagger]` container.
 */
export function initScrollAnimations(signal?: AbortSignal): void {
  const elements = document.querySelectorAll<HTMLElement>(`[data-animate]:not(.${REVEAL_CLASS})`);
  if (elements.length === 0) return;

  for (const container of document.querySelectorAll<HTMLElement>('[data-animate-stagger]')) {
    Array.from(container.children).forEach((child, index) => {
      if (child instanceof HTMLElement)
        child.style.setProperty('--animate-delay', String(index + 1));
    });
  }

  for (const element of elements) {
    if (element.dataset.animateDelay) {
      element.style.setProperty('--animate-delay', element.dataset.animateDelay);
    }
  }

  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    for (const element of elements) element.classList.add(REVEAL_CLASS);
    return;
  }

  const observer = new IntersectionObserver(
    entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add(REVEAL_CLASS);
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -80px 0px', threshold: 0.12 },
  );

  for (const element of elements) observer.observe(element);
  signal?.addEventListener('abort', () => observer.disconnect(), { once: true });
}

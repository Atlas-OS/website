import { prefersReducedMotion } from './page-lifecycle';

const REVEAL_CLASS = 'animate-in';
/** Elements revealed in the same frame are staggered; beyond this many the rest appear together. */
const MAX_STAGGER_STEPS = 5;

/**
 * Reveal `[data-animate]` elements as they scroll into view.
 *
 * The hidden starting state only applies while `<html data-motion>` is set (see BaseLayout),
 * so content is never hidden for users without JavaScript or with reduced motion enabled.
 *
 * Stagger is decided at reveal time, not in the markup: every element that enters the viewport
 * in the same observer pass is ordered top-to-bottom, left-to-right and given an incremental
 * `--animate-delay`. Elements that enter later start immediately. Children of a
 * `[data-animate-stagger]` container are staggered by DOM order when their parent reveals.
 */
export function initScrollAnimations(signal?: AbortSignal): void {
  const elements = document.querySelectorAll<HTMLElement>(`[data-animate]:not(.${REVEAL_CLASS})`);
  if (elements.length === 0) return;

  for (const container of document.querySelectorAll<HTMLElement>('[data-animate-stagger]')) {
    Array.from(container.children).forEach((child, index) => {
      if (child instanceof HTMLElement) {
        child.style.setProperty('--animate-delay', String(Math.min(index, MAX_STAGGER_STEPS)));
      }
    });
  }

  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    for (const element of elements) element.classList.add(REVEAL_CLASS);
    return;
  }

  const reveal = (batch: HTMLElement[]) => {
    const ordered = batch
      .map(element => ({ element, rect: element.getBoundingClientRect() }))
      .sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left);

    ordered.forEach(({ element }, index) => {
      element.style.setProperty('--animate-delay', String(Math.min(index, MAX_STAGGER_STEPS)));
      element.classList.add(REVEAL_CLASS);
    });
  };

  const observer = new IntersectionObserver(
    entries => {
      const visible: HTMLElement[] = [];
      for (const entry of entries) {
        if (!entry.isIntersecting || !(entry.target instanceof HTMLElement)) continue;
        visible.push(entry.target);
        observer.unobserve(entry.target);
      }
      if (visible.length > 0) reveal(visible);
    },
    { rootMargin: '0px 0px -48px 0px', threshold: 0.1 },
  );

  for (const element of elements) observer.observe(element);
  signal?.addEventListener('abort', () => observer.disconnect(), { once: true });
}

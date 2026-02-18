let activeObserver: IntersectionObserver | null = null;

function revealAllElements(): void {
  const animatedElements = document.querySelectorAll<HTMLElement>('[data-animate]');
  animatedElements.forEach(el => el.classList.add('animate-in'));
}

export function initScrollAnimations(): void {
  if (typeof window === 'undefined') return;

  activeObserver?.disconnect();
  activeObserver = null;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    revealAllElements();
    return;
  }

  const animatedElements = document.querySelectorAll<HTMLElement>('[data-animate]');
  if (animatedElements.length === 0) {
    return;
  }

  const options: IntersectionObserverInit = {
    root: null,
    rootMargin: '0px 0px -100px 0px',
    threshold: 0.12,
  };

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;

      const element = entry.target as HTMLElement;
      element.classList.add('animate-in');
      observer.unobserve(element);
    });
  }, options);

  animatedElements.forEach(el => {
    if (!el.classList.contains('animate-in')) {
      observer.observe(el);
    }
  });

  activeObserver = observer;
}

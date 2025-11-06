/**
 * Initialize scroll animations for elements with [data-animate] attribute
 * Respects prefers-reduced-motion setting
 */
export function initScrollAnimations() {
  if (typeof window === 'undefined') return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    return;
  }

  const options: IntersectionObserverInit = {
    root: null,
    rootMargin: '0px 0px -100px 0px',
    threshold: 0.1,
  };

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
        observer.unobserve(entry.target);
      }
    });
  }, options);

  const animatedElements = document.querySelectorAll('[data-animate]');
  animatedElements.forEach(el => observer.observe(el));
}

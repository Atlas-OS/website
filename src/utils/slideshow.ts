import { prefersReducedMotion } from './page-lifecycle';

const SLIDE_DURATION_MS = 5000;
const MIN_SWIPE_DISTANCE = 50;

const SLIDE_ACTIVE = 'opacity-100';
const SLIDE_INACTIVE = 'opacity-0';
const DOT_ACTIVE = 'bg-white';
const DOT_INACTIVE = 'bg-white/30';

/**
 * Auto-advancing testimonial slideshow with dot navigation and touch swipe support.
 * Pauses while hovered, off screen, or in a hidden tab, and honours reduced-motion preferences by
 * never auto-advancing. The current slide's control carries `aria-current`.
 */
export function initSlideshow(signal: AbortSignal): void {
  const container = document.getElementById('player-slideshow-container');
  const slideshow = document.getElementById('player-slideshow');
  const dotsContainer = document.getElementById('slideshow-dots');
  if (!container || !slideshow || !dotsContainer) return;

  const slides = [...slideshow.querySelectorAll<HTMLElement>('.player-slide')];
  if (slides.length === 0) return;

  const autoplay = !prefersReducedMotion();
  let current = 0;
  let timer: number | undefined;
  let touchStart: { x: number; y: number } | null = null;
  // Autoplay runs only while the slideshow is on screen, its tab is visible and it isn't hovered.
  let onScreen = true;
  let hovered = false;

  const dots = slides.map((_, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'nav-dot-button relative cursor-pointer p-1.5';
    button.setAttribute('aria-label', `Go to slide ${index + 1}`);

    const indicator = document.createElement('span');
    indicator.className = `line-indicator pointer-events-none block h-0.5 w-6 transition-colors duration-300 ${DOT_INACTIVE}`;
    indicator.setAttribute('aria-hidden', 'true');
    button.append(indicator);

    button.addEventListener(
      'click',
      () => {
        show(index);
        restart();
      },
      { signal },
    );

    return indicator;
  });

  dotsContainer.replaceChildren(...dots.map(dot => dot.parentElement!));

  function show(index: number): void {
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      const isActive = i === current;
      slide.classList.toggle(SLIDE_ACTIVE, isActive);
      slide.classList.toggle(SLIDE_INACTIVE, !isActive);
      slide.style.zIndex = isActive ? '10' : '0';
      dots[i]?.classList.toggle(DOT_ACTIVE, isActive);
      dots[i]?.classList.toggle(DOT_INACTIVE, !isActive);
      dots[i]?.parentElement?.setAttribute('aria-current', String(isActive));
    });
  }

  function stop(): void {
    window.clearInterval(timer);
    timer = undefined;
  }

  function start(): void {
    if (!autoplay || !onScreen || hovered || document.visibilityState === 'hidden') return;
    stop();
    timer = window.setInterval(() => show(current + 1), SLIDE_DURATION_MS);
  }

  function restart(): void {
    stop();
    start();
  }

  container.addEventListener(
    'mouseenter',
    () => {
      hovered = true;
      stop();
    },
    { signal },
  );
  container.addEventListener(
    'mouseleave',
    () => {
      hovered = false;
      start();
    },
    { signal },
  );

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      const entry = entries[entries.length - 1];
      if (!entry) return;
      onScreen = entry.isIntersecting;
      if (onScreen) start();
      else stop();
    });
    observer.observe(container);
    signal.addEventListener('abort', () => observer.disconnect(), { once: true });
  }
  document.addEventListener('visibilitychange', restart, { signal });

  container.addEventListener(
    'touchstart',
    event => {
      const touch = event.touches[0];
      if (event.touches.length !== 1 || !touch) return;
      touchStart = { x: touch.clientX, y: touch.clientY };
      stop();
    },
    { passive: true, signal },
  );

  container.addEventListener(
    'touchmove',
    event => {
      const touch = event.touches[0];
      if (!touchStart || !touch) return;
      const deltaX = Math.abs(touch.clientX - touchStart.x);
      const deltaY = Math.abs(touch.clientY - touchStart.y);
      if (deltaX > deltaY && deltaX > 10) event.preventDefault();
    },
    { passive: false, signal },
  );

  container.addEventListener(
    'touchend',
    event => {
      const touch = event.changedTouches[0];
      const origin = touchStart;
      touchStart = null;
      if (!origin || !touch) {
        start();
        return;
      }

      const deltaX = touch.clientX - origin.x;
      const deltaY = touch.clientY - origin.y;
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > MIN_SWIPE_DISTANCE) {
        show(deltaX < 0 ? current + 1 : current - 1);
      }
      start();
    },
    { passive: true, signal },
  );

  signal.addEventListener('abort', stop, { once: true });

  show(0);
  start();
}

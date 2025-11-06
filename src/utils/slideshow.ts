function initSlideshow(): void {
  const container = document.getElementById('player-slideshow-container') as HTMLElement | null;
  const slideshow = document.getElementById('player-slideshow') as HTMLElement | null;
  const dotsContainer = document.getElementById('slideshow-dots') as HTMLElement | null;
  if (!container || !slideshow || !dotsContainer) return;

  const config: {
    slideDuration: number;
    activeClasses: { slide: string; dot: string };
    inactiveClasses: { slide: string; dot: string };
  } = {
    slideDuration: 5000,
    activeClasses: {
      slide: 'opacity-100',
      dot: 'bg-white',
    },
    inactiveClasses: {
      slide: 'opacity-0',
      dot: 'bg-white/30',
    },
  };

  const state: {
    slides: HTMLElement[];
    dots: HTMLElement[];
    currentIndex: number;
    interval: number;
    touchStartX: number;
    touchStartY: number;
    isDragging: boolean;
    minSwipeDistance: number;
  } = {
    slides: [...slideshow.querySelectorAll<HTMLElement>('.player-slide')],
    dots: [] as HTMLElement[],
    currentIndex: 0,
    interval: 0,
    touchStartX: 0,
    touchStartY: 0,
    isDragging: false,
    minSwipeDistance: 50,
  };

  state.slides.forEach((_, index) => {
    const dot = createDot(index);
    dotsContainer.appendChild(dot);
    const indicator = dot.querySelector<HTMLElement>('.line-indicator');
    if (indicator) {
      state.dots.push(indicator);
    }
  });

  setSlide(0);
  startInterval();

  container.addEventListener('mouseenter', () => clearInterval(state.interval));
  container.addEventListener('mouseleave', startInterval);

  /**
   * Handles touch start event to capture initial touch position.
   * @param {TouchEvent} e - The touch event.
   */
  function handleTouchStart(e: TouchEvent): void {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    if (!touch) return;
    state.touchStartX = touch.clientX;
    state.touchStartY = touch.clientY;
    state.isDragging = true;
    clearInterval(state.interval);
  }

  /**
   * Handles touch move event to track drag progress.
   * @param {TouchEvent} e - The touch event.
   */
  function handleTouchMove(e: TouchEvent): void {
    if (!state.isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    if (!touch) return;
    const deltaX = Math.abs(touch.clientX - state.touchStartX);
    const deltaY = Math.abs(touch.clientY - state.touchStartY);
    if (deltaX > deltaY && deltaX > 10) {
      e.preventDefault();
    }
  }

  /**
   * Handles touch end event to detect swipe gesture and change slide.
   * @param {TouchEvent} e - The touch event.
   */
  function handleTouchEnd(e: TouchEvent): void {
    if (!state.isDragging) return;
    state.isDragging = false;

    if (e.changedTouches.length !== 1) {
      startInterval();
      return;
    }

    const touch = e.changedTouches[0];
    if (!touch) {
      startInterval();
      return;
    }
    const touchEndX = touch.clientX;
    const touchEndY = touch.clientY;

    const deltaX = touchEndX - state.touchStartX;
    const deltaY = touchEndY - state.touchStartY;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    if (absDeltaX > absDeltaY && absDeltaX > state.minSwipeDistance) {
      if (deltaX < 0) {
        nextSlide();
      } else {
        const prevIndex =
          state.currentIndex === 0 ? state.slides.length - 1 : state.currentIndex - 1;
        setSlide(prevIndex);
      }
      resetInterval();
    } else {
      startInterval();
    }
  }

  container.addEventListener('touchstart', handleTouchStart, { passive: true });
  container.addEventListener('touchmove', handleTouchMove, { passive: false });
  container.addEventListener('touchend', handleTouchEnd, { passive: true });

  /**
   * Creates a navigation dot button for the slide at the given index.
   * @param {number} index - The slide index for this dot.
   * @returns {HTMLButtonElement} The dot button element.
   */
  function createDot(index: number): HTMLButtonElement {
    const button = document.createElement('button');
    button.classList.add('nav-dot-button', 'relative', 'p-1.5', 'cursor-pointer');
    button.setAttribute('aria-label', `Go to slide ${index + 1}`);

    const indicator = document.createElement('span');
    indicator.classList.add(
      'line-indicator',
      'block',
      'h-0.5',
      'w-6',
      config.inactiveClasses.dot,
      'transition-colors',
      'duration-300',
      'pointer-events-none',
    );
    indicator.setAttribute('aria-hidden', 'true');
    button.appendChild(indicator);

    button.addEventListener('click', () => {
      setSlide(index);
      resetInterval();
    });

    button.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setSlide(index);
        resetInterval();
      }
    });

    return button;
  }

  /**
   * Activates the slide at the given index and updates dot indicators.
   * @param {number} index - The index of the slide to show.
   */
  function setSlide(index: number): void {
    state.slides.forEach((slide, i) => {
      const slideEl = slide as HTMLElement;
      const isActive = i === index;
      slideEl.classList.toggle(config.activeClasses.slide, isActive);
      slideEl.classList.toggle(config.inactiveClasses.slide, !isActive);
      slideEl.style.zIndex = isActive ? '10' : '0';

      const dot = state.dots[i];
      if (dot) {
        dot.classList.toggle(config.activeClasses.dot, isActive);
        dot.classList.toggle(config.inactiveClasses.dot, !isActive);
      }
    });

    state.currentIndex = index;
  }

  /**
   * Advances to the next slide in the sequence.
   */
  function nextSlide(): void {
    setSlide((state.currentIndex + 1) % state.slides.length);
  }

  /**
   * Starts the auto-advance interval for the slideshow.
   */
  function startInterval(): void {
    if (state.interval) clearInterval(state.interval);
    state.interval = window.setInterval(nextSlide, config.slideDuration);
  }

  /**
   * Resets the auto-advance interval, clearing and restarting it.
   */
  function resetInterval(): void {
    clearInterval(state.interval);
    startInterval();
  }
}

initSlideshow();

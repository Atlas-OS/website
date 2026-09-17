const SCROLL_THRESHOLD = 10;

function setMobileMenuOpen(menu: HTMLElement, button: HTMLElement, isOpen: boolean): void {
  menu.classList.toggle('mobile-menu-open', isOpen);
  menu.hidden = !isOpen;
  menu.inert = !isOpen;
  button.setAttribute('aria-expanded', String(isOpen));
}

function setupMobileMenu(signal: AbortSignal): void {
  const button = document.getElementById('mobile-menu-button');
  const menu = document.getElementById('mobile-menu');
  if (!button || !menu) return;

  setMobileMenuOpen(menu, button, false);

  button.addEventListener(
    'click',
    () => setMobileMenuOpen(menu, button, !menu.classList.contains('mobile-menu-open')),
    { signal },
  );

  document.addEventListener(
    'keydown',
    event => {
      if (event.key === 'Escape') setMobileMenuOpen(menu, button, false);
    },
    { signal },
  );
}

function setupHeaderScroll(signal: AbortSignal): void {
  const header = document.getElementById('main-header');
  if (!header) return;

  const update = () =>
    header.classList.toggle('header-scrolled', window.scrollY > SCROLL_THRESHOLD);
  update();
  window.addEventListener('scroll', update, { passive: true, signal });
}

export function initNavbar(signal: AbortSignal): void {
  setupMobileMenu(signal);
  setupHeaderScroll(signal);
}

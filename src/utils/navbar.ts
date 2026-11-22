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

  // A tap anywhere outside the open menu closes it.
  document.addEventListener(
    'click',
    event => {
      if (!menu.classList.contains('mobile-menu-open')) return;
      const target = event.target as Node | null;
      if (target && (menu.contains(target) || button.contains(target))) return;
      setMobileMenuOpen(menu, button, false);
    },
    { signal },
  );

  document.addEventListener(
    'keydown',
    event => {
      if (event.key !== 'Escape' || !menu.classList.contains('mobile-menu-open')) return;
      // Closing hides the menu; if focus was inside it, hand it back to the button that opened it.
      const focusWasInside = menu.contains(document.activeElement);
      setMobileMenuOpen(menu, button, false);
      if (focusWasInside) button.focus();
    },
    { signal },
  );
}

export function initNavbar(signal: AbortSignal): void {
  setupMobileMenu(signal);
}

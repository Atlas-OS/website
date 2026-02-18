const SCROLL_THRESHOLD = 10;

type EventListenerEntry = {
  element: EventTarget;
  event: string;
  handler: EventListener;
};

let eventListeners: EventListenerEntry[] = [];

function cleanupEventListeners(): void {
  eventListeners.forEach(({ element, event, handler }) => {
    element.removeEventListener(event, handler);
  });
  eventListeners = [];
}

function addTrackedEventListener(
  element: EventTarget,
  event: string,
  handler: EventListener,
): void {
  element.addEventListener(event, handler);
  eventListeners.push({ element, event, handler });
}

function setupMobileMenu(): void {
  const mobileMenuButton = document.getElementById('mobile-menu-button');
  const mobileMenu = document.getElementById('mobile-menu');

  if (!mobileMenuButton || !mobileMenu) return;

  mobileMenu.hidden = true;

  const mobileMenuHandler = () => {
    mobileMenu.classList.toggle('mobile-menu-open');
    const isExpanded = mobileMenu.classList.contains('mobile-menu-open');
    mobileMenu.hidden = !isExpanded;
    if (isExpanded) {
      mobileMenu.removeAttribute('inert');
    } else {
      mobileMenu.setAttribute('inert', '');
    }
    mobileMenuButton.setAttribute('aria-expanded', String(isExpanded));
  };

  addTrackedEventListener(mobileMenuButton, 'click', mobileMenuHandler);
}

function closeMobileMenu(): void {
  const mobileMenu = document.getElementById('mobile-menu');
  const mobileMenuButton = document.getElementById('mobile-menu-button');

  if (mobileMenu && mobileMenu.classList.contains('mobile-menu-open')) {
    mobileMenu.classList.remove('mobile-menu-open');
    mobileMenu.hidden = true;
    mobileMenu.setAttribute('inert', '');
    if (mobileMenuButton) {
      mobileMenuButton.setAttribute('aria-expanded', 'false');
    }
  }
}

function setupHeaderScroll(): void {
  const header = document.getElementById('main-header');
  if (!header) return;

  const updateHeaderStyle = () => {
    if (window.scrollY > SCROLL_THRESHOLD) {
      header.classList.add('header-scrolled');
    } else {
      header.classList.remove('header-scrolled');
    }
  };

  updateHeaderStyle();
  addTrackedEventListener(window, 'scroll', updateHeaderStyle);
}

function handleMobileMenuKeyboard(): void {
  const keyboardHandler = (e: Event) => {
    const keyEvent = e as KeyboardEvent;
    if (keyEvent.key !== 'Escape') return;

    closeMobileMenu();
  };

  addTrackedEventListener(document, 'keydown', keyboardHandler);
}

function isDocsPage(): boolean {
  return document.getElementById('sidebar-toggle-button') !== null;
}

export function initNavbar(): void {
  cleanupEventListeners();

  if (!isDocsPage()) {
    setupMobileMenu();
    handleMobileMenuKeyboard();
  }

  setupHeaderScroll();
}

const DESKTOP_BREAKPOINT = 1024;
const SCROLL_THRESHOLD = 10;

type EventListenerEntry = {
  element: EventTarget;
  event: string;
  handler: EventListener;
};

let closeSidebar: (() => void) | null = null;
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

function getSidebarElements() {
  return {
    sidebar: document.getElementById('sidebar'),
    toggleButton: document.getElementById('sidebar-toggle-button'),
    backdrop: document.getElementById('sidebar-backdrop'),
    closeButton: document.getElementById('sidebar-close-button'),
  };
}

function resetSidebarState(): void {
  const { sidebar, toggleButton } = getSidebarElements();
  if (sidebar) {
    sidebar.classList.remove('open');
    document.body.classList.remove('sidebar-open');
  }
  if (toggleButton) {
    toggleButton.setAttribute('aria-expanded', 'false');
  }
}

function openSidebar(): void {
  const { sidebar, toggleButton, backdrop } = getSidebarElements();
  if (!sidebar) return;

  sidebar.classList.add('open');
  document.body.classList.add('sidebar-open');

  if (toggleButton) {
    toggleButton.setAttribute('aria-expanded', 'true');
  }

  if (backdrop) {
    backdrop.classList.remove('opacity-0', 'pointer-events-none');
    backdrop.classList.add('opacity-100');
    backdrop.setAttribute('aria-hidden', 'false');
  }
}

function closeSidebarFunction(): void {
  const { sidebar, toggleButton, backdrop } = getSidebarElements();
  if (!sidebar) return;

  sidebar.classList.remove('open');
  document.body.classList.remove('sidebar-open');

  if (toggleButton) {
    toggleButton.setAttribute('aria-expanded', 'false');
  }

  if (backdrop) {
    backdrop.classList.remove('opacity-100');
    backdrop.classList.add('opacity-0', 'pointer-events-none');
    backdrop.setAttribute('aria-hidden', 'true');
  }
}

function setupSidebar(): void {
  const { sidebar, toggleButton, backdrop, closeButton } = getSidebarElements();

  if (!toggleButton || !sidebar) return;

  closeSidebar = closeSidebarFunction;

  const toggleHandler = () => {
    const isOpen = sidebar.classList.contains('open');
    if (isOpen) {
      closeSidebarFunction();
    } else {
      openSidebar();
    }
  };
  addTrackedEventListener(toggleButton, 'click', toggleHandler);

  if (backdrop) {
    const backdropHandler = () => closeSidebarFunction();
    addTrackedEventListener(backdrop, 'click', backdropHandler);
  }

  if (closeButton) {
    const closeHandler = () => closeSidebarFunction();
    addTrackedEventListener(closeButton, 'click', closeHandler);
  }

  if (sidebar) {
    const navLinks = sidebar.querySelectorAll<HTMLAnchorElement>('a');
    navLinks.forEach(link => {
      const linkHandler = () => {
        if (window.innerWidth < DESKTOP_BREAKPOINT) {
          closeSidebarFunction();
        }
      };
      addTrackedEventListener(link, 'click', linkHandler);
    });
  }
}

function setupMobileMenu(): void {
  const mobileMenuButton = document.getElementById('mobile-menu-button');
  const mobileMenu = document.getElementById('mobile-menu');

  if (!mobileMenuButton || !mobileMenu) return;

  const mobileMenuHandler = () => {
    const isExpanded = mobileMenu.classList.contains('hidden');
    mobileMenu.classList.toggle('hidden');
    mobileMenuButton.setAttribute('aria-expanded', (!isExpanded).toString());
  };

  addTrackedEventListener(mobileMenuButton, 'click', mobileMenuHandler);
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

export function setupNavbar(): void {
  cleanupEventListeners();
  resetSidebarState();

  const { toggleButton } = getSidebarElements();
  const isOnDocsPage = toggleButton !== null;

  if (isOnDocsPage) {
    setupSidebar();
  } else {
    setupMobileMenu();
  }

  setupHeaderScroll();
}

export function handleNavbarKeyboardEvents(): void {
  const keyboardHandler = (e: Event) => {
    const keyEvent = e as KeyboardEvent;
    if (keyEvent.key !== 'Escape') return;

    const sidebar = document.getElementById('sidebar');
    if (sidebar?.classList.contains('open')) {
      closeSidebar?.();
    }

    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
      const mobileMenuButton = document.getElementById('mobile-menu-button');
      if (mobileMenuButton) {
        mobileMenu.classList.add('hidden');
        mobileMenuButton.setAttribute('aria-expanded', 'false');
      }
    }
  };

  addTrackedEventListener(document, 'keydown', keyboardHandler);
}

export function handleNavbarResize(): void {
  const resizeHandler = () => {
    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth >= DESKTOP_BREAKPOINT && sidebar?.classList.contains('open')) {
      closeSidebar?.();
    }
  };

  addTrackedEventListener(window, 'resize', resizeHandler);
}

export function initNavbar(): void {
  setupNavbar();
  handleNavbarKeyboardEvents();
  handleNavbarResize();
}

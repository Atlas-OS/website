/**
 * Navbar UI utilities.
 * Handles mobile menu, header scroll effects, and navbar-specific interactions.
 *
 * @module ui/navbar
 */

const SCROLL_THRESHOLD = 10;

type EventListenerEntry = {
  element: EventTarget;
  event: string;
  handler: EventListener;
};

let eventListeners: EventListenerEntry[] = [];

/**
 * Clean up all tracked event listeners.
 */
function cleanupEventListeners(): void {
  eventListeners.forEach(({ element, event, handler }) => {
    element.removeEventListener(event, handler);
  });
  eventListeners = [];
}

/**
 * Add an event listener and track it for cleanup.
 */
function addTrackedEventListener(
  element: EventTarget,
  event: string,
  handler: EventListener,
): void {
  element.addEventListener(event, handler);
  eventListeners.push({ element, event, handler });
}

// ============================================================================
// Mobile Menu
// ============================================================================

/**
 * Set up mobile menu toggle behavior.
 */
function setupMobileMenu(): void {
  const mobileMenuButton = document.getElementById('mobile-menu-button');
  const mobileMenu = document.getElementById('mobile-menu');

  if (!mobileMenuButton || !mobileMenu) return;

  const mobileMenuHandler = () => {
    const isExpanded = mobileMenu.classList.contains('hidden');
    mobileMenu.classList.toggle('hidden');
    mobileMenuButton.setAttribute('aria-expanded', isExpanded.toString());
  };

  addTrackedEventListener(mobileMenuButton, 'click', mobileMenuHandler);
}

/**
 * Close mobile menu.
 */
function closeMobileMenu(): void {
  const mobileMenu = document.getElementById('mobile-menu');
  const mobileMenuButton = document.getElementById('mobile-menu-button');

  if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
    mobileMenu.classList.add('hidden');
    if (mobileMenuButton) {
      mobileMenuButton.setAttribute('aria-expanded', 'false');
    }
  }
}

// ============================================================================
// Header Scroll Effect
// ============================================================================

/**
 * Set up header scroll styling.
 * Adds a class when scrolled past threshold for visual feedback.
 */
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

// ============================================================================
// Keyboard Events
// ============================================================================

/**
 * Handle Escape key to close mobile menu.
 */
function handleMobileMenuKeyboard(): void {
  const keyboardHandler = (e: Event) => {
    const keyEvent = e as KeyboardEvent;
    if (keyEvent.key !== 'Escape') return;

    closeMobileMenu();
  };

  addTrackedEventListener(document, 'keydown', keyboardHandler);
}

// ============================================================================
// Main Initialization
// ============================================================================

/**
 * Check if current page is a docs page (has sidebar toggle).
 */
function isDocsPage(): boolean {
  return document.getElementById('sidebar-toggle-button') !== null;
}

/**
 * Initialize navbar functionality.
 * Call this on page load and after Astro page transitions.
 *
 * Note: On docs pages, sidebar initialization is handled by initSidebar().
 * This function only handles mobile menu on non-docs pages.
 */
export function initNavbar(): void {
  cleanupEventListeners();

  // Mobile menu only on non-docs pages
  if (!isDocsPage()) {
    setupMobileMenu();
    handleMobileMenuKeyboard();
  }

  // Header scroll effect on all pages
  setupHeaderScroll();
}

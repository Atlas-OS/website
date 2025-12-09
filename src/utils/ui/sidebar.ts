/**
 * Sidebar UI utilities.
 * Handles sidebar toggle, dropdowns, scroll persistence, and related UI interactions.
 *
 * @module ui/sidebar
 */

const DESKTOP_BREAKPOINT = 1024;
const STORAGE_KEY_SCROLL = 'sidebar-scroll-position';
const STORAGE_KEY_EXPANDED = 'sidebar-expanded-items';

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

/**
 * Get references to sidebar DOM elements.
 */
function getSidebarElements() {
  return {
    sidebar: document.getElementById('sidebar'),
    toggleButton: document.getElementById('sidebar-toggle-button'),
    backdrop: document.getElementById('sidebar-backdrop'),
    closeButton: document.getElementById('sidebar-close-button'),
    scrollContainer: document.getElementById('sidebar-scroll'),
  };
}

// ============================================================================
// Sidebar Toggle (Open/Close)
// ============================================================================

/**
 * Reset sidebar to closed state.
 */
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

/**
 * Open the sidebar (mobile).
 */
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

/**
 * Close the sidebar (mobile).
 */
export function closeSidebar(): void {
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

/**
 * Toggle sidebar open/closed state.
 */
function toggleSidebar(): void {
  const { sidebar } = getSidebarElements();
  if (!sidebar) return;

  const isOpen = sidebar.classList.contains('open');
  if (isOpen) {
    closeSidebar();
  } else {
    openSidebar();
  }
}

/**
 * Set up sidebar toggle button and related interactions.
 */
function setupSidebarToggle(): void {
  const { sidebar, toggleButton, backdrop, closeButton } = getSidebarElements();

  if (!toggleButton || !sidebar) return;

  // Toggle button
  addTrackedEventListener(toggleButton, 'click', toggleSidebar);

  // Backdrop click closes sidebar
  if (backdrop) {
    addTrackedEventListener(backdrop, 'click', closeSidebar);
  }

  // Close button
  if (closeButton) {
    addTrackedEventListener(closeButton, 'click', closeSidebar);
  }

  // Close on link click (mobile)
  const navLinks = sidebar.querySelectorAll<HTMLAnchorElement>('a');
  navLinks.forEach(link => {
    const linkHandler = () => {
      if (window.innerWidth < DESKTOP_BREAKPOINT) {
        closeSidebar();
      }
    };
    addTrackedEventListener(link, 'click', linkHandler);
  });
}

// ============================================================================
// Scroll Persistence
// ============================================================================

/**
 * Prevent scroll events from propagating to body when at boundaries.
 */
function preventScrollPropagation(): void {
  const { scrollContainer } = getSidebarElements();
  if (!scrollContainer) return;

  scrollContainer.addEventListener(
    'wheel',
    (e: WheelEvent) => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const deltaY = e.deltaY;

      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;
      const isScrollingDown = deltaY > 0;

      const isAtTop = scrollTop <= 1;
      const isScrollingUp = deltaY < 0;

      if ((isAtBottom && isScrollingDown) || (isAtTop && isScrollingUp)) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    { passive: false },
  );
}

/**
 * Initialize scroll position persistence.
 * Saves and restores scroll position across page navigations.
 */
function initScrollPersistence(): void {
  const { scrollContainer } = getSidebarElements();
  if (!scrollContainer) return;

  // Restore saved scroll position
  const savedScroll = sessionStorage.getItem(STORAGE_KEY_SCROLL);
  if (savedScroll !== null) {
    requestAnimationFrame(() => {
      scrollContainer.scrollTop = parseInt(savedScroll, 10);
    });
  }

  // Save scroll position
  function saveScrollPosition() {
    if (scrollContainer) {
      sessionStorage.setItem(STORAGE_KEY_SCROLL, scrollContainer.scrollTop.toString());
    }
  }

  // Debounced scroll handler
  let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
  scrollContainer.addEventListener('scroll', () => {
    if (scrollTimeout) clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(saveScrollPosition, 150);
  });

  // Save on page unload
  window.addEventListener('beforeunload', saveScrollPosition);

  // Save on link click
  const sidebarLinks = scrollContainer.querySelectorAll('a');
  sidebarLinks.forEach(link => {
    link.addEventListener('click', saveScrollPosition);
  });

  // Handle Astro view transitions
  document.addEventListener('astro:before-swap', saveScrollPosition);
  document.addEventListener('astro:after-swap', () => {
    const savedScroll = sessionStorage.getItem(STORAGE_KEY_SCROLL);
    if (savedScroll !== null) {
      const newScrollContainer = document.getElementById('sidebar-scroll');
      if (newScrollContainer) {
        requestAnimationFrame(() => {
          newScrollContainer.scrollTop = parseInt(savedScroll, 10);
        });
      }
    }
  });
}

// ============================================================================
// Dropdown Menus
// ============================================================================

/**
 * Get expanded items from session storage.
 */
function getExpandedItems(): Set<string> {
  const stored = sessionStorage.getItem(STORAGE_KEY_EXPANDED);
  return stored ? new Set(JSON.parse(stored)) : new Set();
}

/**
 * Save expanded items to session storage.
 */
function saveExpandedItems(expandedItems: Set<string>): void {
  sessionStorage.setItem(STORAGE_KEY_EXPANDED, JSON.stringify([...expandedItems]));
}

/**
 * Initialize sidebar dropdown menu behavior.
 */
function initDropdowns(): void {
  const expandedItems = getExpandedItems();
  const dropdownContainers = document.querySelectorAll('.sidebar-item-with-children');

  dropdownContainers.forEach(container => {
    const button = container.querySelector<HTMLButtonElement>('button.sidebar-toggle');
    if (!button) return;

    const slug = button.getAttribute('data-slug') || '';

    // Check for active child
    const hasActiveChild = container.querySelector('.sidebar-children a .text-primary') !== null;

    // Set initial state
    if (hasActiveChild) {
      container.classList.remove('collapsed');
      if (slug) expandedItems.add(slug);
      saveExpandedItems(expandedItems);
    } else if (slug && expandedItems.has(slug)) {
      container.classList.remove('collapsed');
    } else {
      container.classList.add('collapsed');
    }

    // Toggle click handler
    const handleToggleClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const isCollapsed = container.classList.contains('collapsed');

      if (isCollapsed) {
        container.classList.remove('collapsed');
        if (slug) expandedItems.add(slug);
      } else {
        container.classList.add('collapsed');
        if (slug) expandedItems.delete(slug);
      }

      saveExpandedItems(expandedItems);
    };

    button.addEventListener('click', handleToggleClick);

    // Expand on parent link click
    const parentLink = container.querySelector<HTMLAnchorElement>('.sidebar-link > a');
    if (parentLink) {
      parentLink.addEventListener('click', () => {
        const isCollapsed = container.classList.contains('collapsed');
        if (isCollapsed && slug) {
          container.classList.remove('collapsed');
          expandedItems.add(slug);
          saveExpandedItems(expandedItems);
        }
      });
    }
  });
}

// ============================================================================
// Keyboard & Resize Handling
// ============================================================================

/**
 * Handle Escape key to close sidebar.
 */
function handleKeyboardEvents(): void {
  const keyboardHandler = (e: Event) => {
    const keyEvent = e as KeyboardEvent;
    if (keyEvent.key !== 'Escape') return;

    const sidebar = document.getElementById('sidebar');
    if (sidebar?.classList.contains('open')) {
      closeSidebar();
    }
  };

  addTrackedEventListener(document, 'keydown', keyboardHandler);
}

/**
 * Close sidebar on window resize to desktop.
 */
function handleResize(): void {
  const resizeHandler = () => {
    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth >= DESKTOP_BREAKPOINT && sidebar?.classList.contains('open')) {
      closeSidebar();
    }
  };

  addTrackedEventListener(window, 'resize', resizeHandler);
}

// ============================================================================
// Main Initialization
// ============================================================================

/**
 * Initialize all sidebar functionality.
 * Call this on page load and after Astro page transitions.
 */
export function initSidebar(): void {
  cleanupEventListeners();
  resetSidebarState();

  const { toggleButton, sidebar } = getSidebarElements();

  // Only init if sidebar exists (docs pages)
  if (!toggleButton || !sidebar) return;

  setupSidebarToggle();
  initScrollPersistence();
  preventScrollPropagation();
  initDropdowns();
  handleKeyboardEvents();
  handleResize();

  // Mark as initialized
  setTimeout(() => {
    sidebar.classList.add('initialized');
  }, 0);
}

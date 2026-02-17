const DESKTOP_BREAKPOINT = 1024;
const SCROLL_STORAGE_KEY = 'sidebar-scroll-position';
const EXPANDED_STORAGE_KEY = 'sidebar-expanded-items';

let teardown: (() => void) | null = null;

type SidebarElements = {
  sidebar: HTMLElement | null;
  toggleButton: HTMLElement | null;
  closeButton: HTMLElement | null;
  backdrop: HTMLElement | null;
  scrollContainer: HTMLElement | null;
};

function getSidebarElements(): SidebarElements {
  return {
    sidebar: document.getElementById('sidebar'),
    toggleButton: document.getElementById('sidebar-toggle-button'),
    closeButton: document.getElementById('sidebar-close-button'),
    backdrop: document.getElementById('sidebar-backdrop'),
    scrollContainer: document.getElementById('sidebar-scroll'),
  };
}

function setSidebarOpen(isOpen: boolean, elements: SidebarElements): void {
  const { sidebar, toggleButton, backdrop } = elements;
  if (!sidebar) {
    return;
  }

  sidebar.classList.toggle('open', isOpen);
  document.body.classList.toggle('sidebar-open', isOpen);

  if (toggleButton) {
    toggleButton.setAttribute('aria-expanded', String(isOpen));
  }

  if (backdrop) {
    backdrop.classList.toggle('opacity-100', isOpen);
    backdrop.classList.toggle('opacity-0', !isOpen);
    backdrop.classList.toggle('pointer-events-none', !isOpen);
    backdrop.setAttribute('aria-hidden', String(!isOpen));
  }
}

function readStoredExpandedItems(): Set<string> {
  try {
    const raw = sessionStorage.getItem(EXPANDED_STORAGE_KEY);
    if (!raw) {
      return new Set<string>();
    }

    const parsed = JSON.parse(raw) as string[];
    return new Set(parsed);
  } catch {
    return new Set<string>();
  }
}

function storeExpandedItems(items: Set<string>): void {
  sessionStorage.setItem(EXPANDED_STORAGE_KEY, JSON.stringify([...items]));
}

function setupGroups(sidebar: HTMLElement, signal: AbortSignal): void {
  const expandedItems = readStoredExpandedItems();
  const groups = sidebar.querySelectorAll<HTMLElement>('[data-sidebar-group]');

  for (const group of groups) {
    const key = group.dataset.sidebarKey;
    if (!key) {
      continue;
    }

    const toggleButton = group.querySelector<HTMLButtonElement>('.sidebar-toggle');
    if (!toggleButton) {
      continue;
    }

    const hasActiveChild = group.dataset.sidebarActive === 'true';
    const isOpen = hasActiveChild || expandedItems.has(key);

    group.classList.toggle('is-collapsed', !isOpen);
    toggleButton.setAttribute('aria-expanded', String(isOpen));

    toggleButton.addEventListener(
      'click',
      event => {
        event.preventDefault();
        event.stopPropagation();

        const nextIsOpen = group.classList.contains('is-collapsed');
        group.classList.toggle('is-collapsed', !nextIsOpen);
        toggleButton.setAttribute('aria-expanded', String(nextIsOpen));

        if (nextIsOpen) {
          expandedItems.add(key);
        } else {
          expandedItems.delete(key);
        }

        storeExpandedItems(expandedItems);
      },
      { signal },
    );
  }
}

function setupScrollPersistence(scrollContainer: HTMLElement, signal: AbortSignal): void {
  const savedScroll = sessionStorage.getItem(SCROLL_STORAGE_KEY);
  if (savedScroll) {
    requestAnimationFrame(() => {
      scrollContainer.scrollTop = Number.parseInt(savedScroll, 10) || 0;
    });
  }

  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const saveScroll = () => {
    sessionStorage.setItem(SCROLL_STORAGE_KEY, String(scrollContainer.scrollTop));
  };

  scrollContainer.addEventListener(
    'scroll',
    () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(saveScroll, 120);
    },
    { signal },
  );

  document.addEventListener('astro:before-swap', saveScroll, { signal });
  window.addEventListener('pagehide', saveScroll, { signal });
}

export function closeSidebar(): void {
  setSidebarOpen(false, getSidebarElements());
}

export function initSidebar(): void {
  teardown?.();

  const elements = getSidebarElements();
  if (!elements.sidebar || !elements.toggleButton) {
    teardown = null;
    return;
  }

  const controller = new AbortController();
  const { signal } = controller;
  teardown = () => controller.abort();

  setSidebarOpen(false, elements);

  elements.toggleButton.addEventListener(
    'click',
    () => {
      const isOpen = elements.sidebar?.classList.contains('open') === true;
      setSidebarOpen(!isOpen, elements);
    },
    { signal },
  );

  elements.closeButton?.addEventListener('click', () => setSidebarOpen(false, elements), {
    signal,
  });
  elements.backdrop?.addEventListener('click', () => setSidebarOpen(false, elements), { signal });

  document.addEventListener(
    'keydown',
    event => {
      if (event.key === 'Escape') {
        setSidebarOpen(false, elements);
      }
    },
    { signal },
  );

  window.addEventListener(
    'resize',
    () => {
      if (window.innerWidth >= DESKTOP_BREAKPOINT) {
        setSidebarOpen(false, elements);
      }
    },
    { signal },
  );

  const links = elements.sidebar.querySelectorAll<HTMLAnchorElement>('a[href]');
  for (const link of links) {
    link.addEventListener(
      'click',
      () => {
        if (window.innerWidth < DESKTOP_BREAKPOINT) {
          setSidebarOpen(false, elements);
        }
      },
      { signal },
    );
  }

  setupGroups(elements.sidebar, signal);

  if (elements.scrollContainer) {
    setupScrollPersistence(elements.scrollContainer, signal);
  }

  requestAnimationFrame(() => {
    elements.sidebar?.classList.add('initialized');
  });
}

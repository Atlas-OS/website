const DESKTOP_BREAKPOINT = '(min-width: 1024px)';

const desktopQuery = () => window.matchMedia(DESKTOP_BREAKPOINT);

interface SidebarElements {
  sidebar: HTMLElement;
  toggleButton: HTMLElement;
  closeButton: HTMLElement | null;
  backdrop: HTMLElement | null;
  scrollContainer: HTMLElement | null;
}

function getElements(): SidebarElements | null {
  const sidebar = document.getElementById('sidebar');
  const toggleButton = document.getElementById('sidebar-toggle-button');
  if (!sidebar || !toggleButton) return null;

  return {
    sidebar,
    toggleButton,
    closeButton: document.getElementById('sidebar-close-button'),
    backdrop: document.getElementById('sidebar-backdrop'),
    scrollContainer: document.getElementById('sidebar-scroll'),
  };
}

let inertBackground: Array<{ element: HTMLElement; wasInert: boolean }> = [];

/** Make everything outside the sidebar inert while the mobile drawer is open. */
function setBackgroundInert(isInert: boolean, sidebar: HTMLElement): void {
  if (!isInert) {
    for (const { element, wasInert } of inertBackground) element.inert = wasInert;
    inertBackground = [];
    return;
  }

  if (inertBackground.length > 0) return;

  const mark = (element: Element) => {
    if (!(element instanceof HTMLElement) || element.matches('script, style')) return;
    inertBackground.push({ element, wasInert: element.inert });
    element.inert = true;
  };

  for (const child of document.body.children) {
    if (!child.contains(sidebar)) {
      mark(child);
      continue;
    }
    for (const section of child.children) {
      if (section !== sidebar && section.id !== 'sidebar-backdrop') mark(section);
    }
  }
}

function setOpen(elements: SidebarElements, isOpen: boolean): void {
  const { sidebar, toggleButton, closeButton, backdrop } = elements;
  const isMobile = !desktopQuery().matches;
  const wasOpen = sidebar.classList.contains('open');

  sidebar.classList.toggle('open', isOpen);
  sidebar.inert = isMobile && !isOpen;
  sidebar.setAttribute('aria-hidden', String(isMobile && !isOpen));
  document.body.classList.toggle('sidebar-open', isMobile && isOpen);
  toggleButton.setAttribute('aria-expanded', String(isOpen));
  setBackgroundInert(isMobile && isOpen, sidebar);

  if (backdrop) {
    backdrop.classList.toggle('opacity-100', isOpen);
    backdrop.classList.toggle('opacity-0', !isOpen);
    backdrop.classList.toggle('pointer-events-none', !isOpen);
    backdrop.setAttribute('aria-hidden', String(!isOpen));
  }

  if (!isMobile || isOpen === wasOpen) return;
  requestAnimationFrame(() => (isOpen ? closeButton : toggleButton)?.focus());
}

function trapFocus(sidebar: HTMLElement, event: KeyboardEvent): void {
  if (event.key !== 'Tab' || !sidebar.classList.contains('open')) return;

  const focusable = [
    ...sidebar.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ].filter(element => !element.inert && element.getClientRects().length > 0);

  const first = focusable[0];
  const last = focusable.at(-1);
  if (!first || !last) return;

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function setGroupOpen(group: HTMLElement, isOpen: boolean): void {
  group.classList.toggle('is-collapsed', !isOpen);
  group.querySelector('.sidebar-toggle')?.setAttribute('aria-expanded', String(isOpen));
}

function normalizePath(path: string): string {
  return path.replace(/\/+$/, '') || '/';
}

/**
 * The sidebar persists across View Transitions, so the active link is resolved on the client
 * for every navigation. Styling keys off `aria-current`; groups open when they contain the page.
 */
function syncActiveLink(sidebar: HTMLElement, activePath = window.location.pathname): void {
  const currentPath = normalizePath(activePath);

  for (const link of sidebar.querySelectorAll<HTMLAnchorElement>('a[href^="/"]')) {
    const isActive = normalizePath(link.pathname) === currentPath;
    if (isActive) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }

  for (const group of sidebar.querySelectorAll<HTMLElement>('[data-sidebar-group]')) {
    setGroupOpen(group, group.querySelector('a[aria-current="page"]') !== null);
  }
}

function setupGroups(sidebar: HTMLElement, signal: AbortSignal): void {
  for (const group of sidebar.querySelectorAll<HTMLElement>('[data-sidebar-group]')) {
    const toggle = group.querySelector<HTMLButtonElement>('.sidebar-toggle');
    toggle?.addEventListener(
      'click',
      event => {
        event.preventDefault();
        setGroupOpen(group, group.classList.contains('is-collapsed'));
      },
      { signal },
    );
  }
}

function setupScrollbarReveal(scrollContainer: HTMLElement | null, signal: AbortSignal): void {
  if (!scrollContainer) return;

  let idleTimer: number | undefined;
  const hide = () => {
    scrollContainer.classList.remove('is-scrolling');
    window.clearTimeout(idleTimer);
  };

  scrollContainer.addEventListener(
    'scroll',
    () => {
      scrollContainer.classList.add('is-scrolling');
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(hide, 900);
    },
    { passive: true, signal },
  );
  signal.addEventListener('abort', hide, { once: true });
}

let pendingScrollTop: number | null = null;

export function closeSidebar(): void {
  const elements = getElements();
  if (elements) setOpen(elements, false);
}

/**
 * Bind the docs sidebar once. The element is persisted across navigations, so this runs a single
 * time per full page load and re-syncs the active link on every `astro:page-load`.
 */
export function initSidebar(): void {
  const elements = getElements();
  if (!elements || elements.sidebar.dataset.initialized === 'true') return;

  const { sidebar, toggleButton, closeButton, backdrop, scrollContainer } = elements;
  sidebar.dataset.initialized = 'true';

  const controller = new AbortController();
  const { signal } = controller;

  setOpen(elements, false);
  syncActiveLink(sidebar);
  setupGroups(sidebar, signal);
  setupScrollbarReveal(scrollContainer, signal);

  toggleButton.addEventListener(
    'click',
    () => setOpen(elements, !sidebar.classList.contains('open')),
    { signal },
  );
  closeButton?.addEventListener('click', () => setOpen(elements, false), { signal });
  backdrop?.addEventListener('click', () => setOpen(elements, false), { signal });
  sidebar.addEventListener('keydown', event => trapFocus(sidebar, event), { signal });
  document.addEventListener(
    'keydown',
    event => {
      if (event.key === 'Escape') setOpen(elements, false);
    },
    { signal },
  );

  desktopQuery().addEventListener('change', () => setOpen(elements, false), { signal });

  sidebar.addEventListener(
    'click',
    event => {
      const link = (event.target as Element).closest<HTMLAnchorElement>('a[href^="/"]');
      if (!link) return;
      syncActiveLink(sidebar, link.pathname);
      if (!desktopQuery().matches) setOpen(elements, false);
    },
    { signal },
  );

  document.addEventListener(
    'astro:before-swap',
    () => {
      pendingScrollTop = scrollContainer?.scrollTop ?? null;
    },
    { signal },
  );

  document.addEventListener(
    'astro:page-load',
    () => {
      // Leaving the docs drops the persisted sidebar; release its listeners with it.
      if (!sidebar.isConnected) {
        controller.abort();
        return;
      }
      syncActiveLink(sidebar);
      if (scrollContainer && pendingScrollTop !== null)
        scrollContainer.scrollTop = pendingScrollTop;
      pendingScrollTop = null;
    },
    { signal },
  );

  requestAnimationFrame(() => sidebar.classList.add('initialized'));
}

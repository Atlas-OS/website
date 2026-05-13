const DESKTOP_BREAKPOINT = 1024;

let teardown: (() => void) | null = null;
let pendingSidebarScrollTop: number | null = null;

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

function setupGroups(sidebar: HTMLElement, signal: AbortSignal): void {
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
    const isOpen = hasActiveChild;

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
      },
      { signal },
    );
  }
}

function saveSidebarScrollPosition(): void {
  pendingSidebarScrollTop = document.getElementById('sidebar-scroll')?.scrollTop ?? null;
}

function restoreSidebarScrollPosition(): void {
  if (pendingSidebarScrollTop === null) return;

  const scrollContainer = document.getElementById('sidebar-scroll');
  if (scrollContainer) {
    scrollContainer.scrollTop = pendingSidebarScrollTop;
  }

  pendingSidebarScrollTop = null;
}

function normalizePath(path: string): string {
  const withoutOrigin = path.startsWith('http') ? new URL(path).pathname : path;
  return withoutOrigin.replace(/\/+$/, '') || '/';
}

function syncActiveLink(sidebar: HTMLElement, activePath = window.location.pathname): void {
  const currentPath = normalizePath(activePath);
  const links = sidebar.querySelectorAll<HTMLAnchorElement>('a[href]');

  for (const link of links) {
    const href = link.getAttribute('href');
    if (!href?.startsWith('/')) continue;

    const linkPath = normalizePath(href);
    const isSectionLink = link.classList.contains('sidebar-section-link');
    const isHomeLink = link.classList.contains('sidebar-home-link');
    const isActive = linkPath === currentPath;

    link.classList.toggle('sidebar-active-link', isActive);
    link.classList.toggle('font-medium', isActive && link.classList.contains('sidebar-link'));
    link.classList.toggle('text-white/70', !isActive && link.classList.contains('sidebar-link'));
    link.classList.toggle('text-white/85', !isActive && (isSectionLink || isHomeLink));
    link.classList.toggle('hover:bg-white/5', !isActive);
    link.classList.toggle('hover:text-white', !isActive);
    if (isActive) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  }

  for (const group of sidebar.querySelectorAll<HTMLElement>('[data-sidebar-group]')) {
    const groupIsActive = Array.from(group.querySelectorAll<HTMLAnchorElement>('a[href]')).some(
      link => normalizePath(link.getAttribute('href') || '') === currentPath,
    );
    const toggleButton = group.querySelector<HTMLButtonElement>('.sidebar-toggle');
    group.dataset.sidebarActive = String(groupIsActive);
    group.classList.toggle('is-collapsed', !groupIsActive);
    toggleButton?.setAttribute('aria-expanded', String(groupIsActive));
  }
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
  syncActiveLink(elements.sidebar);

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

  document.addEventListener('astro:before-swap', saveSidebarScrollPosition, { signal });
  document.addEventListener('astro:after-swap', restoreSidebarScrollPosition, { signal });

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
        if (link.origin === window.location.origin && elements.sidebar) {
          syncActiveLink(elements.sidebar, link.pathname);
        }

        if (window.innerWidth < DESKTOP_BREAKPOINT) {
          setSidebarOpen(false, elements);
        }
      },
      { signal },
    );
  }

  setupGroups(elements.sidebar, signal);

  requestAnimationFrame(() => {
    elements.sidebar?.classList.add('initialized');
  });
}

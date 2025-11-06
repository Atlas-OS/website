const STORAGE_KEY_SCROLL = 'sidebar-scroll-position';
const STORAGE_KEY_EXPANDED = 'sidebar-expanded-items';

export function preventScrollPropagation() {
  const sidebarScroll = document.getElementById('sidebar-scroll');

  if (!sidebarScroll) return;

  sidebarScroll.addEventListener(
    'wheel',
    (e: WheelEvent) => {
      const { scrollTop, scrollHeight, clientHeight } = sidebarScroll;
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

export function initSidebarScrollPersistence() {
  const sidebarScroll = document.getElementById('sidebar-scroll');

  if (!sidebarScroll) return;

  const savedScroll = sessionStorage.getItem(STORAGE_KEY_SCROLL);
  if (savedScroll !== null) {
    requestAnimationFrame(() => {
      sidebarScroll.scrollTop = parseInt(savedScroll, 10);
    });
  }

  function saveScrollPosition() {
    if (sidebarScroll) {
      sessionStorage.setItem(STORAGE_KEY_SCROLL, sidebarScroll.scrollTop.toString());
    }
  }

  let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
  sidebarScroll.addEventListener('scroll', () => {
    if (scrollTimeout) clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      saveScrollPosition();
    }, 150);
  });

  window.addEventListener('beforeunload', saveScrollPosition);

  const sidebarLinks = sidebarScroll.querySelectorAll('a');
  sidebarLinks.forEach(link => {
    link.addEventListener('click', saveScrollPosition);
  });

  document.addEventListener('astro:before-swap', saveScrollPosition);
  document.addEventListener('astro:after-swap', () => {
    const savedScroll = sessionStorage.getItem(STORAGE_KEY_SCROLL);
    if (savedScroll !== null) {
      const newSidebarScroll = document.getElementById('sidebar-scroll');
      if (newSidebarScroll) {
        requestAnimationFrame(() => {
          newSidebarScroll.scrollTop = parseInt(savedScroll, 10);
        });
      }
    }
  });
}

export function initSidebarDropdowns() {
  function getExpandedItems(): Set<string> {
    const stored = sessionStorage.getItem(STORAGE_KEY_EXPANDED);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  }

  function saveExpandedItems(expandedItems: Set<string>) {
    sessionStorage.setItem(STORAGE_KEY_EXPANDED, JSON.stringify([...expandedItems]));
  }

  const expandedItems = getExpandedItems();
  const dropdownContainers = document.querySelectorAll('.sidebar-item-with-children');

  dropdownContainers.forEach(container => {
    const button = container.querySelector<HTMLButtonElement>('button.sidebar-toggle');
    if (!button) return;

    const slug = button.getAttribute('data-slug') || '';

    const hasActiveChild = container.querySelector('.sidebar-children a .text-primary') !== null;

    if (hasActiveChild) {
      container.classList.remove('collapsed');
      if (slug) expandedItems.add(slug);
      saveExpandedItems(expandedItems);
    } else if (slug && expandedItems.has(slug)) {
      container.classList.remove('collapsed');
    } else {
      container.classList.add('collapsed');
    }

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

export function initSidebar() {
  initSidebarScrollPersistence();
  preventScrollPropagation();
  initSidebarDropdowns();

  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    setTimeout(() => {
      sidebar.classList.add('initialized');
    }, 0);
  }
}

let closeSidebar: (() => void) | null = null;

export function setupNavbar() {
  const isOnDocsPage = document.getElementById('sidebar-toggle-button') !== null;

  if (isOnDocsPage) {
    const sidebarToggleButton = document.getElementById('sidebar-toggle-button');
    const sidebar = document.getElementById('sidebar');
    const sidebarBackdrop = document.getElementById('sidebar-backdrop');
    const sidebarCloseButton = document.getElementById('sidebar-close-button');

    const openSidebar = () => {
      if (sidebar) {
        sidebar.classList.add('open');
        document.body.classList.add('sidebar-open');
        if (sidebarToggleButton) {
          sidebarToggleButton.setAttribute('aria-expanded', 'true');
        }
        if (sidebarBackdrop) {
          sidebarBackdrop.classList.remove('opacity-0', 'pointer-events-none');
          sidebarBackdrop.classList.add('opacity-100');
          sidebarBackdrop.setAttribute('aria-hidden', 'false');
        }
      }
    };

    closeSidebar = () => {
      if (sidebar) {
        sidebar.classList.remove('open');
        document.body.classList.remove('sidebar-open');
        if (sidebarToggleButton) {
          sidebarToggleButton.setAttribute('aria-expanded', 'false');
        }
        if (sidebarBackdrop) {
          sidebarBackdrop.classList.remove('opacity-100');
          sidebarBackdrop.classList.add('opacity-0', 'pointer-events-none');
          sidebarBackdrop.setAttribute('aria-hidden', 'true');
        }
      }
    };

    if (sidebarToggleButton) {
      sidebarToggleButton.addEventListener('click', () => {
        const isOpen = sidebar?.classList.contains('open');
        if (isOpen) {
          closeSidebar?.();
        } else {
          openSidebar();
        }
      });
    }

    if (sidebarBackdrop) {
      sidebarBackdrop.addEventListener('click', () => closeSidebar?.());
    }

    if (sidebarCloseButton) {
      sidebarCloseButton.addEventListener('click', () => closeSidebar?.());
    }

    const sidebarForLinks = document.getElementById('sidebar');
    if (sidebarForLinks) {
      const navLinks = sidebarForLinks.querySelectorAll('a');
      navLinks.forEach(link => {
        link.addEventListener('click', () => {
          if (window.innerWidth < 1024) {
            closeSidebar?.();
          }
        });
      });
    }
  } else {
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');

    if (mobileMenuButton && mobileMenu) {
      mobileMenuButton.addEventListener('click', () => {
        const isExpanded = mobileMenu.classList.contains('hidden');
        mobileMenu.classList.toggle('hidden');
        mobileMenuButton.setAttribute('aria-expanded', (!isExpanded).toString());
      });
    }
  }

  const header = document.getElementById('main-header');
  if (header) {
    const updateHeaderStyle = () => {
      if (window.scrollY > 10) {
        header.classList.add('header-scrolled');
      } else {
        header.classList.remove('header-scrolled');
      }
    };

    updateHeaderStyle();
    window.addEventListener('scroll', updateHeaderStyle);
  }
}

export function handleNavbarKeyboardEvents() {
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
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
    }
  });
}

export function handleNavbarResize() {
  window.addEventListener('resize', () => {
    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth >= 1024 && sidebar?.classList.contains('open')) {
      closeSidebar?.();
    }
  });
}

export function initNavbar() {
  setupNavbar();
  handleNavbarKeyboardEvents();
  handleNavbarResize();
}

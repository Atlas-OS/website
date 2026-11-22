/**
 * Light and dark themes. `<html data-theme>` is set before first paint by the inline script in
 * BaseLayout (from the visitor's stored choice, else their system setting) and carried across
 * client-side navigations there. This module handles the navbar toggle and, until the visitor has
 * chosen, follows changes to the system setting.
 */

import { prefersReducedMotion } from './page-lifecycle';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

/** The visitor's explicit choice, if they have made one. */
export function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

/** Apply a theme without remembering it, and let anything that draws in colour know. */
export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document.dispatchEvent(new CustomEvent<Theme>('themechange', { detail: theme }));
}

/**
 * Switch the whole page as one: element transitions pause while it changes (styles/global.css), and
 * night turns to day (and back) as a short crossfade where view transitions are supported and
 * motion is welcome; otherwise at once.
 */
function switchTheme(theme: Theme): void {
  const root = document.documentElement;
  root.dataset.themeSwitching = '';
  const settle = () => requestAnimationFrame(() => delete root.dataset.themeSwitching);
  if (!document.startViewTransition || prefersReducedMotion()) {
    applyTheme(theme);
    // Let the new colours land with transitions still paused before turning them back on.
    void root.offsetWidth;
    settle();
    return;
  }
  const transition = document.startViewTransition(() => applyTheme(theme));
  void transition.finished.finally(settle);
}

/** Apply and remember the visitor's choice. */
export function chooseTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Private modes may refuse storage; the theme still applies for this page.
  }
  switchTheme(theme);
}

export function initThemeToggle(signal: AbortSignal): void {
  const buttons = [...document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]')];

  const label = () => {
    const next = currentTheme() === 'light' ? 'dark' : 'light';
    for (const button of buttons) {
      button.setAttribute('aria-label', `Switch to ${next} theme`);
      button.title = `Switch to ${next} theme`;
    }
  };

  for (const button of buttons) {
    button.addEventListener(
      'click',
      () => chooseTheme(currentTheme() === 'light' ? 'dark' : 'light'),
      {
        signal,
      },
    );
  }
  // The theme may land a moment after the click (inside the crossfade), so relabel when it does.
  document.addEventListener('themechange', label, { signal });

  // Follow the system setting for as long as the visitor hasn't picked a theme themselves.
  const media = matchMedia('(prefers-color-scheme: light)');
  media.addEventListener(
    'change',
    event => {
      if (storedTheme()) return;
      switchTheme(event.matches ? 'light' : 'dark');
    },
    { signal },
  );

  label();
}

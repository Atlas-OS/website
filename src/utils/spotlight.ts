import { navigate } from 'astro:transitions/client';
import { closeSidebar } from './sidebar';

const PAGEFIND_PATH = '/pagefind/pagefind.js';
const SEARCH_DEBOUNCE_MS = 150;
const MAX_RESULTS = 10;

interface PagefindResultData {
  url: string;
  excerpt: string;
  meta?: { title?: string };
}

interface PagefindResult {
  id: string;
  data: () => Promise<PagefindResultData>;
}

interface Pagefind {
  init: () => Promise<void>;
  debouncedSearch: (
    query: string,
    options?: Record<string, unknown>,
    debounceMs?: number,
  ) => Promise<{ results: PagefindResult[] } | null>;
  preload: (query: string) => Promise<void>;
}

interface SearchResult {
  url: string;
  title: string;
}

let pagefindPromise: Promise<Pagefind | null> | null = null;

/** Pagefind is emitted at build time, so it is imported by URL rather than bundled. */
function loadPagefind(): Promise<Pagefind | null> {
  pagefindPromise ??= import(/* @vite-ignore */ PAGEFIND_PATH)
    .then(async (module: Pagefind) => {
      await module.init();
      return module;
    })
    .catch((error: unknown) => {
      pagefindPromise = null;
      console.warn(
        'Pagefind is unavailable; the search index is only built for production.',
        error,
      );
      return null;
    });

  return pagefindPromise;
}

function titleFromUrl(url: string): string {
  const last = url.split('/').filter(Boolean).at(-1);
  if (!last) return 'Home';
  return last
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const FILE_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21h-10a2 2 0 0 1-2-2v-14a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z"/></svg>';
const CHEVRON_ICON =
  '<svg class="spotlight-item-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6l-6 6"/></svg>';

interface SpotlightElements {
  modal: HTMLElement;
  backdrop: HTMLElement;
  input: HTMLInputElement;
  list: HTMLElement;
  idle: HTMLElement | null;
  empty: HTMLElement | null;
  emptyQuery: HTMLElement | null;
  loading: HTMLElement | null;
  footer: HTMLElement | null;
}

function getElements(): SpotlightElements | null {
  const modal = document.getElementById('spotlight-modal');
  const backdrop = document.getElementById('spotlight-backdrop');
  const input = document.getElementById('spotlight-input');
  const list = document.getElementById('spotlight-list');
  if (!modal || !backdrop || !(input instanceof HTMLInputElement) || !list) return null;

  return {
    modal,
    backdrop,
    input,
    list,
    idle: document.getElementById('spotlight-idle'),
    empty: document.getElementById('spotlight-empty'),
    emptyQuery: document.getElementById('spotlight-empty-query'),
    loading: document.getElementById('spotlight-loading'),
    footer: document.getElementById('spotlight-footer'),
  };
}

/** Command-palette style docs search backed by Pagefind. Bound once per page load. */
export function initSpotlight(signal: AbortSignal): void {
  const elements = getElements();
  if (!elements) return;

  const { modal, backdrop, input, list, idle, empty, emptyQuery, loading, footer } = elements;
  const triggers = document.querySelectorAll<HTMLElement>(
    '#navbar-search-button, #navbar-search-button-mobile',
  );

  let selectedIndex = -1;
  let searchRun = 0;
  let lastFocused: HTMLElement | null = null;
  let inertBackground: Array<{ element: HTMLElement; wasInert: boolean }> = [];

  const isOpen = () => modal.classList.contains('open');
  const items = () => [...list.querySelectorAll<HTMLElement>('.spotlight-item')];

  function setBackgroundInert(isInert: boolean): void {
    if (!isInert) {
      for (const { element, wasInert } of inertBackground) element.inert = wasInert;
      inertBackground = [];
      return;
    }
    if (inertBackground.length > 0) return;
    for (const child of document.body.children) {
      if (!(child instanceof HTMLElement) || child === modal || child === backdrop) continue;
      if (child.matches('script, style')) continue;
      inertBackground.push({ element: child, wasInert: child.inert });
      child.inert = true;
    }
  }

  function setState(state: 'idle' | 'loading' | 'empty' | 'results'): void {
    idle?.classList.toggle('hidden', state !== 'idle');
    loading?.classList.toggle('hidden', state !== 'loading');
    empty?.classList.toggle('hidden', state !== 'empty');
    footer?.classList.toggle('hidden', state !== 'results');
  }

  function warm(query: string): void {
    void loadPagefind().then(pagefind => {
      const term = query.trim();
      if (pagefind && term) void pagefind.preload(term).catch(() => {});
    });
  }

  function select(index: number): void {
    const all = items();
    if (all.length === 0) return;

    all[selectedIndex]?.classList.remove('selected');
    all[selectedIndex]?.setAttribute('aria-selected', 'false');

    selectedIndex = ((index % all.length) + all.length) % all.length;
    const target = all[selectedIndex]!;
    target.classList.add('selected');
    target.setAttribute('aria-selected', 'true');
    input.setAttribute('aria-activedescendant', target.id);
    target.scrollIntoView({ block: 'nearest' });
  }

  function open(): void {
    if (isOpen()) return;
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    lastFocused = active?.closest('#sidebar')
      ? document.getElementById('sidebar-toggle-button')
      : active;

    closeSidebar();
    setBackgroundInert(true);
    warm(input.value);

    modal.inert = false;
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('open');
    backdrop.classList.add('open');
    backdrop.setAttribute('aria-hidden', 'false');
    input.setAttribute('aria-expanded', 'true');
    for (const trigger of triggers) trigger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';

    window.setTimeout(() => input.focus(), 80);
  }

  function reset(): void {
    searchRun += 1;
    selectedIndex = -1;
    input.value = '';
    input.removeAttribute('aria-activedescendant');
    list.replaceChildren();
    setState('idle');
  }

  function close(): void {
    if (!isOpen()) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    modal.inert = true;
    backdrop.classList.remove('open');
    backdrop.setAttribute('aria-hidden', 'true');
    input.setAttribute('aria-expanded', 'false');
    for (const trigger of triggers) trigger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    reset();
    setBackgroundInert(false);
    lastFocused?.focus();
    lastFocused = null;
  }

  function go(url: string): void {
    close();
    void navigate(url);
  }

  function render(results: SearchResult[], query: string): void {
    selectedIndex = -1;
    input.removeAttribute('aria-activedescendant');

    if (results.length === 0) {
      list.replaceChildren();
      if (emptyQuery) emptyQuery.textContent = query.trim();
      setState(query.trim() ? 'empty' : 'idle');
      return;
    }

    list.replaceChildren(
      ...results.map((result, index) => {
        const item = document.createElement('li');
        item.className = 'spotlight-item';
        item.id = `spotlight-option-${index}`;
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', 'false');
        item.dataset.url = result.url;

        const path = `/${result.url.replace(/^\/|\/$/g, '')}`;
        item.innerHTML = `<div class="spotlight-item-icon">${FILE_ICON}</div><div class="spotlight-item-body"><p class="spotlight-item-title"></p><p class="spotlight-item-path"></p></div>${CHEVRON_ICON}`;
        item.querySelector('.spotlight-item-title')!.textContent = result.title;
        item.querySelector('.spotlight-item-path')!.textContent = path;
        return item;
      }),
    );
    setState('results');
  }

  async function search(query: string): Promise<void> {
    const run = ++searchRun;
    const term = query.trim();
    const isCurrent = () => run === searchRun;

    if (!term) {
      render([], query);
      return;
    }

    list.replaceChildren();
    setState('loading');

    const pagefind = await loadPagefind();
    if (!isCurrent()) return;
    if (!pagefind) {
      render([], query);
      return;
    }

    try {
      const response = await pagefind.debouncedSearch(term, {}, SEARCH_DEBOUNCE_MS);
      if (!isCurrent() || response === null) return;

      const loaded = await Promise.all(
        response.results.slice(0, MAX_RESULTS).map(async result => {
          const data = await result.data().catch(() => null);
          return data ? { url: data.url, title: data.meta?.title || titleFromUrl(data.url) } : null;
        }),
      );
      if (!isCurrent()) return;

      render(
        loaded.filter((result): result is SearchResult => result !== null),
        query,
      );
    } catch (error) {
      if (!isCurrent()) return;
      console.warn('Pagefind search failed', error);
      render([], query);
    }
  }

  function trapFocus(event: KeyboardEvent): void {
    if (event.key !== 'Tab' || !isOpen()) return;
    const focusable = [
      ...modal.querySelectorAll<HTMLElement>(
        'input, a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ].filter(element => element.getClientRects().length > 0);
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

  for (const trigger of triggers) trigger.addEventListener('click', open, { signal });
  backdrop.addEventListener('click', close, { signal });
  modal.addEventListener('keydown', trapFocus, { signal });

  document.getElementById('spotlight-input-container')?.addEventListener(
    'click',
    event => {
      if (event.target !== input) input.focus();
    },
    { signal },
  );

  document.getElementById('spotlight-clear-search')?.addEventListener(
    'click',
    () => {
      reset();
      input.focus();
    },
    { signal },
  );

  input.addEventListener('focus', () => warm(input.value), { signal });
  input.addEventListener(
    'input',
    () => {
      warm(input.value);
      void search(input.value);
    },
    { signal },
  );
  input.addEventListener(
    'keydown',
    event => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        select(selectedIndex + 1);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        select(selectedIndex - 1);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const url = items()[selectedIndex]?.dataset.url;
        if (url) go(url);
      }
    },
    { signal },
  );

  list.addEventListener('mousedown', event => event.preventDefault(), { signal });
  list.addEventListener(
    'click',
    event => {
      const url = (event.target as Element).closest<HTMLElement>('.spotlight-item')?.dataset.url;
      if (url) go(url);
    },
    { signal },
  );

  document.addEventListener(
    'keydown',
    event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (isOpen()) close();
        else open();
      } else if (event.key === 'Escape' && isOpen()) {
        close();
      }
    },
    { signal },
  );

  signal.addEventListener(
    'abort',
    () => {
      setBackgroundInert(false);
      document.body.style.overflow = '';
      searchRun += 1;
    },
    { once: true },
  );
}

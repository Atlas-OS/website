import { parseSupporterWall, type SupporterWall } from './supporters';

const ENDPOINT = '/api/supporters';

interface Entry {
  name: string;
  tier?: string | null;
}

function element<Tag extends keyof HTMLElementTagNameMap>(
  tag: Tag,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[Tag] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  // Names are set as text, never parsed as HTML.
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderGroup(id: string, title: string, entries: Entry[]): HTMLElement {
  const group = element('section');
  group.setAttribute('aria-labelledby', id);

  const heading = element('h3', 'supporter-wall__heading', title);
  heading.id = id;

  // An explicit role keeps the list announced as one in Safari, which drops it when unstyled.
  const list = element('ul', 'supporter-wall__names');
  list.setAttribute('role', 'list');

  for (const { name, tier } of entries) {
    const item = element('li', 'supporter-wall__name');
    item.append(element('span', undefined, name));
    if (tier) {
      item.append(element('span', 'sr-only', ', '), element('span', 'supporter-wall__tier', tier));
    }
    list.append(item);
  }

  group.append(heading, list);
  return group;
}

/** The panel of names, or null when the wall is empty. */
export function renderSupporterWall(wall: SupporterWall): HTMLElement | null {
  if (wall.monthly.length === 0 && wall.oneOff.length === 0) return null;

  const panel = element('div', 'supporter-wall__panel docs-surface');
  if (wall.monthly.length > 0) {
    panel.append(renderGroup('supporters-monthly', 'Monthly members', wall.monthly));
  }
  if (wall.oneOff.length > 0) {
    panel.append(renderGroup('supporters-one-off', 'One-off supporters', wall.oneOff));
  }
  return panel;
}

async function loadSupporterWall(root: HTMLElement, signal: AbortSignal): Promise<void> {
  let wall: SupporterWall | null = null;
  try {
    const response = await fetch(ENDPOINT, { headers: { Accept: 'application/json' }, signal });
    if (response.ok) wall = parseSupporterWall(await response.json());
  } catch {
    // Offline, aborted by a navigation or not JSON: the thank-you line and the button stay.
    return;
  }

  const panel = wall && renderSupporterWall(wall);
  if (!panel || signal.aborted) return;
  root.querySelector('.supporter-wall__panel')?.remove();
  root.append(panel);
}

/** Fills in the supporter wall on the docs home, if the page has one. */
export function initSupporterWall(signal: AbortSignal): void {
  const root = document.querySelector<HTMLElement>('[data-supporter-wall]');
  if (root) void loadSupporterWall(root, signal);
}

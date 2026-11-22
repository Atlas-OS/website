/**
 * The campfire easter egg: clicking the fire puts it out, and the tents fall asleep; clicking again
 * lights it. Everything visible is CSS keyed off `data-camp-out` (see SummitCamp.astro).
 *
 * The camp is decoration inside an `aria-hidden` stage, so this is a pointer-only toggle with no
 * focusable element. The fire is lit on every page load, and without JavaScript nothing is clickable:
 * the hit area only takes the pointer once `data-camp-ready` is set here.
 */

const OUT_ATTRIBUTE = 'data-camp-out';
const READY_ATTRIBUTE = 'data-camp-ready';

export function initCamp(signal: AbortSignal): void {
  for (const camp of document.querySelectorAll<HTMLElement>('[data-camp]')) {
    const toggle = camp.querySelector<HTMLElement>('[data-camp-toggle]');
    if (!toggle) continue;

    camp.removeAttribute(OUT_ATTRIBUTE);
    camp.setAttribute(READY_ATTRIBUTE, '');
    toggle.addEventListener('click', () => camp.toggleAttribute(OUT_ATTRIBUTE), { signal });
    signal.addEventListener('abort', () => camp.removeAttribute(READY_ATTRIBUTE), { once: true });
  }
}

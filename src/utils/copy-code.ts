const COPY_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M7 9.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667l0 -8.666"/><path d="M4.012 16.737a2.005 2.005 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1"/></svg>`;

const CHECK_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 12l5 5l10 -10"/></svg>`;

export function initCopyCodeButtons() {
  const prose = document.querySelector('.prose');
  if (!prose) return;

  const pres = prose.querySelectorAll('pre');
  pres.forEach((pre) => {
    if (pre.closest('.not-prose') || pre.closest('.code-block') || pre.hasAttribute('data-copy-initialized')) return;

    const code = pre.querySelector('code');
    if (!code) return;

    pre.setAttribute('data-copy-initialized', 'true');

    const wrapper = document.createElement('div');
    wrapper.className = 'prose-code-block group relative';

    pre.parentNode?.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);

    const button = document.createElement('button');
    button.type = 'button';
    button.className =
      'copy-code-btn absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-[var(--docs-radius-sm)] opacity-0 transition-opacity duration-200 hover:bg-white/10 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)] group-hover:opacity-100';
    button.setAttribute('aria-label', 'Copy code');
    button.innerHTML = COPY_ICON_SVG;

    button.addEventListener('click', async () => {
      const text = code.textContent || '';
      try {
        await navigator.clipboard.writeText(text);
        button.innerHTML = CHECK_ICON_SVG;
        button.setAttribute('aria-label', 'Copied!');
        setTimeout(() => {
          button.innerHTML = COPY_ICON_SVG;
          button.setAttribute('aria-label', 'Copy code');
        }, 2000);
      } catch {
        button.setAttribute('aria-label', 'Copy failed');
      }
    });

    wrapper.appendChild(button);
  });
}

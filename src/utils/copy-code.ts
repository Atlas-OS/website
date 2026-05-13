function createIcon(paths: string[]): SVGSVGElement {
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('width', '16');
  icon.setAttribute('height', '16');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('fill', 'none');
  icon.setAttribute('stroke', 'currentColor');
  icon.setAttribute('stroke-width', '2');
  icon.setAttribute('stroke-linecap', 'round');
  icon.setAttribute('stroke-linejoin', 'round');
  icon.setAttribute('aria-hidden', 'true');

  paths.forEach((pathData, index) => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathData);
    if (index === 0) {
      path.setAttribute('stroke', 'none');
      path.setAttribute('fill', 'none');
    }
    icon.appendChild(path);
  });

  return icon;
}

function createCopyIcon(): SVGSVGElement {
  return createIcon([
    'M0 0h24v24H0z',
    'M7 9.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667l0 -8.666',
    'M4.012 16.737a2.005 2.005 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1',
  ]);
}

function createCheckIcon(): SVGSVGElement {
  return createIcon(['M0 0h24v24H0z', 'M5 12l5 5l10 -10']);
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.readOnly = true;
  textarea.style.position = 'fixed';
  textarea.style.inset = '0 auto auto 0';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();

  try {
    const legacyCopy = (document as unknown as { execCommand(commandId: string): boolean })
      .execCommand;
    if (!legacyCopy.call(document, 'copy')) throw new Error('Copy command failed.');
  } finally {
    textarea.remove();
  }
}

export function initCopyCodeButtons() {
  const prose = document.querySelector('.prose');
  if (!prose) return;

  const pres = prose.querySelectorAll('pre');
  pres.forEach(pre => {
    if (
      pre.closest('.not-prose') ||
      pre.closest('.code-block') ||
      pre.hasAttribute('data-copy-initialized')
    )
      return;

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
      'copy-code-btn absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-[var(--docs-radius-md)] opacity-0 transition-[background-color,opacity,scale] duration-200 hover:bg-white/10 active:scale-[0.96] focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)] group-hover:opacity-100';
    button.setAttribute('aria-label', 'Copy code');
    button.replaceChildren(createCopyIcon());

    button.addEventListener('click', async () => {
      const text = code.textContent || '';
      try {
        await copyText(text);
        button.replaceChildren(createCheckIcon());
        button.setAttribute('aria-label', 'Copied!');
        setTimeout(() => {
          button.replaceChildren(createCopyIcon());
          button.setAttribute('aria-label', 'Copy code');
        }, 2000);
      } catch {
        button.setAttribute('aria-label', 'Copy failed');
      }
    });

    wrapper.appendChild(button);
  });
}

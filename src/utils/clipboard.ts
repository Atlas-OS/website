const FEEDBACK_MS = 2000;

/** Copy text using the async Clipboard API, falling back to a hidden textarea on insecure contexts. */
export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.readOnly = true;
  textarea.style.cssText = 'position:fixed;inset:0 auto auto 0;opacity:0';
  document.body.append(textarea);
  textarea.select();

  try {
    // `execCommand` is deprecated but remains the only fallback for non-secure contexts.
    if (!document.execCommand('copy')) throw new Error('Copy command failed.');
  } finally {
    textarea.remove();
  }
}

export interface CopyButtonOptions {
  /** Returns the text to copy at click time. */
  getText: () => string;
  /** Optional live region that announces the outcome to assistive technology. */
  status?: HTMLElement | null;
  labels?: { idle?: string; copied?: string; failed?: string };
  announcements?: { copied?: string; failed?: string };
  signal?: AbortSignal;
}

/**
 * Wire a copy-to-clipboard button. The button gets `data-copied="true"` for a short
 * feedback window so CSS can swap icons; the label and live region are updated alongside.
 */
export function bindCopyButton(button: HTMLElement, options: CopyButtonOptions): void {
  const labels = { idle: 'Copy code', copied: 'Copied!', failed: 'Copy failed', ...options.labels };
  const announcements = {
    copied: 'Code copied',
    failed: 'Unable to copy code',
    ...options.announcements,
  };
  let resetTimer: number | undefined;

  const reset = () => {
    button.dataset.copied = 'false';
    button.setAttribute('aria-label', labels.idle);
    if (options.status) options.status.textContent = '';
  };

  button.addEventListener(
    'click',
    async () => {
      window.clearTimeout(resetTimer);
      try {
        await copyText(options.getText());
        button.dataset.copied = 'true';
        button.setAttribute('aria-label', labels.copied);
        if (options.status) options.status.textContent = announcements.copied;
      } catch {
        button.dataset.copied = 'false';
        button.setAttribute('aria-label', labels.failed);
        if (options.status) options.status.textContent = announcements.failed;
      }
      resetTimer = window.setTimeout(reset, FEEDBACK_MS);
    },
    { signal: options.signal },
  );
}

const COPY_ICON =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 9.667a2.667 2.667 0 0 1 2.667-2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1-2.667 2.667h-8.666a2.667 2.667 0 0 1-2.667-2.667z"/><path d="M4.012 16.737a2.005 2.005 0 0 1-1.012-1.737v-10c0-1.1.9-2 2-2h10c.75 0 1.158.385 1.5 1"/></svg>';
const CHECK_ICON =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5l10-10"/></svg>';

function getSharedStatusRegion(): HTMLElement {
  let status = document.getElementById('copy-status');
  if (!status) {
    status = document.createElement('span');
    status.id = 'copy-status';
    status.className = 'sr-only';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    document.body.append(status);
  }
  return status;
}

/**
 * Add copy buttons to Markdown-rendered `<pre><code>` blocks inside `.prose`.
 * Blocks rendered by `CodeBlock.astro` bring their own button and are skipped.
 */
export function enhanceProseCodeBlocks(root: ParentNode = document, signal?: AbortSignal): void {
  const blocks = root.querySelectorAll<HTMLPreElement>(
    '.prose pre:not([data-copy-enhanced]):not(.not-prose *):not(.code-block *)',
  );
  if (blocks.length === 0) return;

  const status = getSharedStatusRegion();

  for (const pre of blocks) {
    const code = pre.querySelector('code');
    if (!code) continue;

    pre.dataset.copyEnhanced = 'true';

    const wrapper = document.createElement('div');
    wrapper.className = 'prose-code-block group relative';
    pre.replaceWith(wrapper);
    wrapper.append(pre);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'copy-code-btn';
    button.setAttribute('aria-label', 'Copy code');
    button.innerHTML = `<span class="copy-code-icon">${COPY_ICON}</span><span class="copy-code-check">${CHECK_ICON}</span>`;
    wrapper.append(button);

    bindCopyButton(button, { getText: () => code.textContent ?? '', status, signal });
  }
}

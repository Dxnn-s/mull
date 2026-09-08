export type SiteId = 'chatgpt' | 'claude' | 'gemini';

export interface SiteAdapter {
  id: SiteId;
  composer: string[];
  send: string[];
  /** Selectors that mean "the site is busy", so a match is not a send button. */
  busy?: string[];
}

/**
 * Selectors are ordered most-specific first and will need maintenance when the
 * sites ship new composers. Sources: 2026 userscripts and open-source extensions
 * (see Brain/projects/mull/ideas-2026-09-08.md finding 1). No textarea fallbacks
 * on ChatGPT: its hidden accessibility textarea matches but React ignores it, and
 * a match there would un-gate every prompt with no error.
 */
const SITES: SiteAdapter[] = [
  {
    id: 'chatgpt',
    composer: ['#prompt-textarea', 'div.ProseMirror[contenteditable="true"]', 'div[role="textbox"][contenteditable="true"]'],
    send: ['button[data-testid="send-button"]', '#composer-submit-button', 'button[aria-label="Send prompt"]'],
    busy: ['button[data-testid="stop-button"]'],
  },
  {
    id: 'claude',
    composer: ['[data-testid="composer"] [contenteditable="true"]', 'div[contenteditable="true"].ProseMirror', 'div[contenteditable="true"][data-placeholder]', 'fieldset div[contenteditable="true"]'],
    send: ['button[data-testid="send-button"]', 'button[aria-label="Send message"]', 'button[aria-label*="Send" i]'],
  },
  {
    id: 'gemini',
    composer: ['.text-input-field [contenteditable="true"]', 'input-area-v2 [contenteditable="true"]', 'div.ql-editor[contenteditable="true"]', 'rich-textarea div[contenteditable="true"]'],
    send: ['.send-button', '[data-test-id="send-button"]', 'button[aria-label="Send message"]'],
  },
];

export function detectSite(): SiteAdapter | null {
  const host = location.hostname;
  let id: SiteId | null = null;
  if (/(^|\.)chatgpt\.com$/.test(host) || /(^|\.)chat\.openai\.com$/.test(host)) id = 'chatgpt';
  else if (/(^|\.)claude\.ai$/.test(host)) id = 'claude';
  else if (/(^|\.)gemini\.google\.com$/.test(host)) id = 'gemini';
  // Test fixtures declare the site on <html data-mull-site="...">.
  else id = (document.documentElement.dataset.mullSite as SiteId | undefined) ?? null;
  return SITES.find((s) => s.id === id) ?? null;
}

export function findComposer(site: SiteAdapter): HTMLElement | null {
  const el = first(site.composer);
  // A textarea on chatgpt is the hidden accessibility copy; never treat it as the composer.
  if (site.id === 'chatgpt' && el instanceof HTMLTextAreaElement) return null;
  return el;
}

export function findSend(site: SiteAdapter): HTMLButtonElement | null {
  if (site.busy && first(site.busy)) return null;
  const el = first(site.send);
  if (!el) return null;
  // Gemini renders send as a custom element wrapping a real button.
  if (!(el instanceof HTMLButtonElement)) return el.querySelector('button') ?? (el as HTMLButtonElement);
  return el;
}

/** First selector that matches a visible element (has a box). */
function first(selectors: string[]): HTMLElement | null {
  for (const s of selectors) {
    try {
      for (const el of Array.from(document.querySelectorAll<HTMLElement>(s))) {
        if (el.getClientRects().length > 0) return el;
      }
    } catch {
      // Unsupported selector on this build; ignore it.
    }
  }
  return null;
}

export function readText(el: HTMLElement): string {
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) return el.value;
  return el.innerText;
}

/** Replace the composer text (used to strip an allowlist prefix). */
export function setText(el: HTMLElement, text: string): void {
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')?.set;
    setter ? setter.call(el, text) : (el.value = text);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }
  el.focus();
  const sel = window.getSelection();
  if (sel) {
    const range = document.createRange();
    range.selectNodeContents(el);
    sel.removeAllRanges();
    sel.addRange(range);
  }
  // execCommand is deprecated but still the one API ProseMirror/Quill honor as a user edit.
  const ok = document.execCommand('insertText', false, text);
  if (!ok) {
    el.textContent = text;
    el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
  }
}

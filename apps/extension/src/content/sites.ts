export type SiteId = 'chatgpt' | 'claude' | 'gemini';

export interface SiteAdapter {
  id: SiteId;
  composer: string[];
  send: string[];
}

/**
 * Selectors are ordered most-specific first and will need maintenance when the
 * sites ship new composers. Keep several fallbacks per site.
 */
const SITES: SiteAdapter[] = [
  {
    id: 'chatgpt',
    composer: ['#prompt-textarea', 'div[contenteditable="true"][data-id="root"]', 'textarea[data-id]', 'form textarea'],
    send: ['button[data-testid="send-button"]', 'button[aria-label="Send prompt"]', 'form button[type="submit"]'],
  },
  {
    id: 'claude',
    composer: ['div[contenteditable="true"].ProseMirror', 'div[contenteditable="true"][data-placeholder]', 'fieldset div[contenteditable="true"]'],
    send: ['button[aria-label="Send message"]', 'button[aria-label="Send Message"]', 'fieldset button[type="button"]:has(svg)'],
  },
  {
    id: 'gemini',
    composer: ['div.ql-editor[contenteditable="true"]', 'rich-textarea div[contenteditable="true"]', 'div[contenteditable="true"][aria-label*="prompt" i]'],
    send: ['button.send-button', 'button[aria-label="Send message"]', 'button[mattooltip="Send message"]'],
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
  return first(site.composer);
}

export function findSend(site: SiteAdapter): HTMLButtonElement | null {
  return first(site.send) as HTMLButtonElement | null;
}

function first(selectors: string[]): HTMLElement | null {
  for (const s of selectors) {
    try {
      const el = document.querySelector<HTMLElement>(s);
      if (el) return el;
    } catch {
      // :has() may be unsupported on old builds; ignore that selector.
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

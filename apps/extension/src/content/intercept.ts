import { GateSession, type SessionResult } from '@mull/core/session';
import { BridgeProvider, getState, record } from './bridge.ts';
import { Overlay } from './overlay.ts';
import { findComposer, findSend, readText, setText, type SiteAdapter } from './sites.ts';

/**
 * Sits in front of the site's own submit handling. Capture-phase listeners on
 * the document run before the site's React/ProseMirror handlers, so a gated
 * prompt never reaches them. On release we click the site's send button (or
 * re-dispatch Enter) with a bypass flag set.
 */
export function installIntercept(site: SiteAdapter): void {
  let releasing = false;
  let active = false;
  let overlay: Overlay | null = null;
  let session: GateSession | null = null;
  let lastHow: 'enter' | 'click' = 'enter';

  document.addEventListener('keydown', onKeydown, true);
  document.addEventListener('click', onClick, true);
  document.documentElement.dataset.mullReady = '1';

  function onKeydown(e: KeyboardEvent): void {
    if (releasing || e.key !== 'Enter' || e.shiftKey || e.isComposing || e.altKey || e.ctrlKey) return;
    const composer = findComposer(site);
    if (!composer || !(e.target instanceof Node) || !composer.contains(e.target)) return;
    intercept(e, composer, 'enter');
  }

  function onClick(e: MouseEvent): void {
    if (releasing) return;
    const send = findSend(site);
    if (!send || !(e.target instanceof Node) || !send.contains(e.target)) return;
    const composer = findComposer(site);
    if (!composer) return;
    intercept(e, composer, 'click');
  }

  function intercept(e: Event, composer: HTMLElement, how: 'enter' | 'click'): void {
    const text = readText(composer).trim();
    if (!text) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (active) return;
    active = true;
    lastHow = how;
    void run(text, composer);
  }

  async function run(text: string, composer: HTMLElement): Promise<void> {
    try {
      const state = await getState();
      if (!state.settings.enabled || !state.settings.sites[site.id]) {
        active = false;
        release(composer);
        return;
      }
      overlay = new Overlay(state.settings);
      session = new GateSession({
        provider: new BridgeProvider(),
        settings: state.settings,
        memory: state.memory,
        block: state.block,
        site: site.id,
      });
      overlay.render({ kind: 'classifying' }, handlers(composer));
      const result = await session.submit(text);
      await handle(result, composer, text);
    } catch (err) {
      // Anything unexpected: fail open, never trap the user.
      console.warn('[mull] intercept error, releasing', err);
      overlay?.hide();
      active = false;
      release(composer);
    }
  }

  async function handle(result: SessionResult, composer: HTMLElement, original: string): Promise<void> {
    void record({ event: result.event, rememberConcept: result.rememberConcept, block: result.block ?? undefined });
    const st = result.state;
    if (st.kind === 'release') {
      overlay?.hide();
      if (st.prompt !== original) setText(composer, st.prompt);
      active = false;
      release(composer);
      return;
    }
    if (st.kind === 'loading-card') {
      overlay?.render(st, handlers(composer));
      return;
    }
    overlay?.render(st, handlers(composer));
  }

  function handlers(composer: HTMLElement) {
    return {
      onRead: () => session && void handle(session.startQuiz(), composer, readText(composer).trim()),
      onAnswer: (answers: Array<number | null>) => session && void handle(session.answer(answers), composer, readText(composer).trim()),
      onSkip: () => session && void handle(session.skip(), composer, readText(composer).trim()),
      onSendAnyway: () => session && void handle(session.releaseAfterError(), composer, readText(composer).trim()),
      onCancel: () => {
        overlay?.hide();
        active = false;
      },
    };
  }

  function release(composer: HTMLElement): void {
    releasing = true;
    try {
      const btn = findSend(site);
      if (btn && !btn.disabled && lastHow === 'click') {
        btn.click();
      } else {
        composer.focus();
        const ev = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true });
        const handled = !composer.dispatchEvent(ev);
        // Sites that ignore synthetic Enter still have a clickable send button.
        if (!handled && btn && !btn.disabled) btn.click();
      }
    } finally {
      // click() and dispatchEvent() run the site's handlers synchronously, so the
      // bypass can close immediately. A timer here left a window where the next
      // real keystroke slipped past the gate.
      releasing = false;
    }
  }
}

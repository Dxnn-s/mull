import { GateSession, type SessionResult } from '@mull/core/session';
import { BridgeProvider, getState, record } from './bridge.ts';
import { Overlay } from './overlay.ts';
import { findComposer, findSend, readText, setText, type SiteAdapter } from './sites.ts';

const DOUBLE_ENTER_MS = 2_000;
const BUTTON_ENABLE_WAIT_MS = 200;

/**
 * Sits in front of the site's own submit handling. Capture-phase listeners on
 * the document run before the site's React/ProseMirror handlers, so a gated
 * prompt never reaches them. On release we click the site's send button with a
 * bypass flag set, and fall back to a synthetic Enter only when no button exists.
 */
export function installIntercept(site: SiteAdapter): void {
  let releasing = false;
  let active = false;
  let overlay: Overlay | null = null;
  let session: GateSession | null = null;
  let lastEnterTs = 0;

  document.addEventListener('keydown', onKeydown, true);
  document.addEventListener('click', onClick, true);
  document.documentElement.dataset.mullReady = '1';

  function pending(): boolean {
    const k = session?.state.kind;
    return k === 'classifying' || k === 'loading-card';
  }

  function onKeydown(e: KeyboardEvent): void {
    if (releasing || e.key !== 'Enter' || e.shiftKey || e.isComposing || e.altKey || e.ctrlKey) return;
    const composer = findComposer(site);
    if (!composer || !(e.target instanceof Node) || !composer.contains(e.target)) return;
    // Enter twice while Mull is still waiting on the provider = "send anyway".
    if (active && pending()) {
      e.preventDefault();
      e.stopImmediatePropagation();
      const now = Date.now();
      if (now - lastEnterTs < DOUBLE_ENTER_MS) sendAnyway(composer);
      lastEnterTs = now;
      return;
    }
    lastEnterTs = Date.now();
    intercept(e, composer);
  }

  function onClick(e: MouseEvent): void {
    if (releasing) return;
    const send = findSend(site);
    if (!send || !(e.target instanceof Node) || !send.contains(e.target)) return;
    const composer = findComposer(site);
    if (!composer) return;
    intercept(e, composer);
  }

  function intercept(e: Event, composer: HTMLElement): void {
    const text = readText(composer).trim();
    if (!text) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (active) return;
    active = true;
    void run(text, composer);
  }

  async function run(text: string, composer: HTMLElement): Promise<void> {
    try {
      const state = await getState();
      if (!state.settings.enabled || !state.settings.sites[site.id]) {
        active = false;
        await release(composer);
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
      const current = session;
      const result = await current.submit(text);
      // A send-anyway or cancel may have retired this session while we waited.
      if (session !== current || result.state.kind === 'idle') return;
      await handle(result, composer, text);
    } catch (err) {
      // Anything unexpected: fail open, never trap the user.
      console.warn('[mull] intercept error, releasing', err instanceof Error ? err.message : err);
      overlay?.hide();
      active = false;
      await release(composer);
    }
  }

  async function handle(result: SessionResult, composer: HTMLElement, original: string): Promise<void> {
    void record({ event: result.event, rememberConcept: result.rememberConcept, block: result.block ?? undefined, correction: result.correction });
    const st = result.state;
    if (st.kind === 'release') {
      overlay?.hide();
      if (st.prompt !== original) setText(composer, st.prompt);
      active = false;
      session = null;
      await release(composer);
      return;
    }
    if (st.kind === 'idle') {
      overlay?.hide();
      active = false;
      session = null;
      return;
    }
    overlay?.render(st, handlers(composer));
  }

  function sendAnyway(composer: HTMLElement): void {
    if (!session) return;
    const r = session.state.kind === 'error' ? session.releaseAfterError() : session.sendAnyway();
    void handle(r, composer, readText(composer).trim());
  }

  function handlers(composer: HTMLElement) {
    const text = () => readText(composer).trim();
    return {
      onRead: () => session && void handle(session.startQuiz(), composer, text()),
      onAnswer: (answers: Array<number | null>) => session && void handle(session.answer(answers), composer, text()),
      onSkip: () => session && void handle(session.skip(), composer, text()),
      onLegit: () => session && void handle(session.markLegit(), composer, text()),
      onSendAnyway: () => sendAnyway(composer),
      onCancel: () => {
        if (session) void handle(session.cancel(), composer, text());
        else {
          overlay?.hide();
          active = false;
        }
      },
    };
  }

  /**
   * Click the site's own send button. Wait a frame (and up to 200 ms) for the
   * framework to re-enable it after a setText. Synthetic Enter is the last resort:
   * untrusted KeyboardEvents do not drive ProseMirror reliably.
   */
  async function release(composer: HTMLElement): Promise<void> {
    releasing = true;
    try {
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      let btn = findSend(site);
      const deadline = Date.now() + BUTTON_ENABLE_WAIT_MS;
      while (btn && btn.disabled && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 25));
        btn = findSend(site);
      }
      if (btn && !btn.disabled) {
        btn.click();
      } else {
        composer.focus();
        composer.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }));
      }
    } finally {
      releasing = false;
    }
  }
}

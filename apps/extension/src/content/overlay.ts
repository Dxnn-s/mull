import type { SessionState } from '@mull/core/session';
import type { Settings } from '@mull/core/types';
import { THEME_CSS } from '../shared/theme.ts';

export interface OverlayHandlers {
  onRead(): void;
  onAnswer(answers: Array<number | null>): void;
  onSkip(): void;
  onCancel(): void;
  onSendAnyway(): void;
}

const OVERLAY_CSS = `
${THEME_CSS}
* { box-sizing: border-box; }
.scrim { position: fixed; inset: 0; background: rgba(0,0,0,0.55); backdrop-filter: blur(6px); z-index: 2147483646; display: flex; align-items: center; justify-content: center; padding: 24px; font-family: var(--sans); color: var(--fg); }
.card { width: min(560px, 100%); max-height: min(85vh, 760px); overflow: auto; background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow); padding: 22px 24px 18px; position: relative; }
.card::before { content: ""; position: absolute; inset: 0; border-radius: inherit; background: var(--surface); pointer-events: none; }
.card > * { position: relative; }
.eyebrow { font-family: var(--mono); font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent); display: flex; align-items: center; gap: 8px; }
.eyebrow .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 0 4px var(--accent-soft); }
h1 { font-family: var(--serif); font-weight: 400; font-size: 30px; line-height: 1.1; margin: 10px 0 4px; letter-spacing: -0.01em; }
.sub { color: var(--fg-muted); font-size: 13px; margin: 0 0 16px; }
p.body { font-size: 15.5px; line-height: 1.55; margin: 0 0 14px; }
.example { font-family: var(--mono); font-size: 12.5px; color: var(--fg-muted); border-left: 2px solid var(--accent-border); padding: 4px 10px; margin: 0 0 16px; }
.q { border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; margin: 0 0 10px; background: var(--surface); }
.q.missed { border-color: var(--danger); }
.q .qt { font-size: 14.5px; margin: 0 0 8px; }
.q label { display: flex; gap: 10px; align-items: flex-start; padding: 6px 8px; border-radius: 8px; cursor: pointer; font-size: 14px; }
.q label:hover { background: var(--surface-2); }
.q input { accent-color: var(--accent); margin-top: 3px; }
.row { display: flex; gap: 10px; align-items: center; justify-content: space-between; margin-top: 14px; flex-wrap: wrap; }
.row .left { display: flex; gap: 10px; align-items: center; }
button { font-family: var(--sans); font-size: 14px; border-radius: 10px; padding: 9px 16px; cursor: pointer; border: 1px solid var(--border); background: var(--surface-2); color: var(--fg); }
button.primary { background: var(--accent); border-color: var(--accent); color: #0a0a0e; font-weight: 600; }
button.primary:hover { background: var(--accent-bright); }
button.ghost { background: transparent; border-color: transparent; color: var(--fg-muted); padding: 9px 8px; }
button.ghost:hover { color: var(--fg); }
.foot { font-family: var(--mono); font-size: 11px; color: var(--fg-muted); margin-top: 12px; }
.banner { background: var(--accent-soft); border: 1px solid var(--accent-border); border-radius: 10px; padding: 8px 12px; font-size: 13px; margin: 0 0 14px; }
.banner.bad { background: rgba(239,68,68,0.10); border-color: rgba(239,68,68,0.35); }
.pill { position: fixed; right: 18px; bottom: 18px; z-index: 2147483646; font-family: var(--mono); font-size: 12px; color: var(--fg); background: var(--bg); border: 1px solid var(--accent-border); border-radius: 999px; padding: 8px 14px; box-shadow: var(--shadow); display: flex; align-items: center; gap: 8px; }
.pill .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); animation: pulse 1s infinite alternate; }
@keyframes pulse { from { opacity: 0.4 } to { opacity: 1 } }
.big { font-family: var(--serif); font-size: 44px; margin: 8px 0 2px; }
`;

export class Overlay {
  private host: HTMLElement | null = null;
  private root: ShadowRoot | null = null;
  private handlers: OverlayHandlers | null = null;

  constructor(private readonly settings: Pick<Settings, 'palette' | 'theme' | 'hardMode'>) {}

  private mount(): ShadowRoot {
    if (this.root) return this.root;
    this.host = document.createElement('div');
    this.host.id = 'mull-host';
    this.host.setAttribute('data-palette', this.settings.palette);
    this.host.setAttribute('data-theme', this.settings.theme);
    this.root = this.host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = OVERLAY_CSS;
    this.root.appendChild(style);
    this.root.addEventListener('click', (e) => this.onClick(e));
    document.documentElement.appendChild(this.host);
    return this.root;
  }

  hide(): void {
    this.host?.remove();
    this.host = null;
    this.root = null;
  }

  render(state: SessionState, handlers: OverlayHandlers): void {
    this.handlers = handlers;
    const root = this.mount();
    for (const el of Array.from(root.children)) if (el.tagName !== 'STYLE') el.remove();
    const wrap = document.createElement('div');
    wrap.innerHTML = this.html(state);
    root.appendChild(wrap);
    if (state.kind === 'blocked') this.tickCountdown(state.until);
  }

  private html(state: SessionState): string {
    switch (state.kind) {
      case 'classifying':
        return `<div class="pill"><span class="dot"></span>mull is reading your prompt</div>`;
      case 'loading-card':
        return `<div class="pill"><span class="dot"></span>writing a 40-second lesson on ${esc(state.classification.concept ?? 'this')}</div>`;
      case 'explain': {
        const banner = state.missed.length
          ? `<div class="banner bad">Not quite. ${state.missed.length === 1 ? 'One question' : `${state.missed.length} questions`} missed. Read it again, then retry.</div>`
          : '';
        return `<div class="scrim"><div class="card">
          <div class="eyebrow"><span class="dot"></span>mull · think first</div>
          <h1>${esc(state.card.concept)}</h1>
          <p class="sub">${esc(state.classification.reason || 'This looks like something worth understanding before you get the answer.')}</p>
          ${banner}
          <p class="body">${esc(state.card.explanation)}</p>
          <div class="row">
            <div class="left">
              <button class="primary" data-act="read">I've read it, quiz me</button>
              ${this.settings.hardMode.enabled ? '' : '<button class="ghost" data-act="skip">Skip (counts against you)</button>'}
            </div>
            <button class="ghost" data-act="cancel">Cancel</button>
          </div>
          <div class="foot">${state.card.questions.length} question${state.card.questions.length === 1 ? '' : 's'} · pass = every one right · your prompt is untouched</div>
        </div></div>`;
      }
      case 'quiz':
        return `<div class="scrim"><div class="card">
          <div class="eyebrow"><span class="dot"></span>mull · quiz</div>
          <h1>${esc(state.card.concept)}</h1>
          <p class="sub">Attempt ${state.attempts + 1}. Every answer must be right.</p>
          <form data-form="quiz">
            ${state.card.questions
              .map(
                (q, i) => `<div class="q" data-q="${i}">
                <div class="qt">${i + 1}. ${esc(q.q)}</div>
                ${q.choices.map((c, j) => `<label><input type="radio" name="q${i}" value="${j}"><span>${esc(c)}</span></label>`).join('')}
              </div>`,
              )
              .join('')}
            <div class="row">
              <div class="left">
                <button class="primary" type="submit">Check answers</button>
                ${this.settings.hardMode.enabled ? '' : '<button class="ghost" type="button" data-act="skip">Skip</button>'}
              </div>
              <button class="ghost" type="button" data-act="cancel">Cancel</button>
            </div>
          </form>
        </div></div>`;
      case 'blocked':
        return `<div class="scrim"><div class="card">
          <div class="eyebrow"><span class="dot"></span>mull · hard mode</div>
          <h1>Blocked.</h1>
          <p class="sub">Two misses in hard mode. Go think without the machine for a bit.</p>
          <div class="big" data-countdown="${state.until}">--:--</div>
          <div class="row"><div></div><button class="ghost" data-act="cancel">Close</button></div>
        </div></div>`;
      case 'error':
        return `<div class="scrim"><div class="card">
          <div class="eyebrow"><span class="dot"></span>mull · couldn't check</div>
          <h1>Gate is down.</h1>
          <p class="sub">${esc(state.message)}</p>
          <div class="row">
            <div class="left"><button class="primary" data-act="send-anyway">Send anyway</button></div>
            <button class="ghost" data-act="cancel">Cancel</button>
          </div>
          <div class="foot">Mull fails open. Fix the key in settings and it will gate again.</div>
        </div></div>`;
      default:
        return '';
    }
  }

  private onClick(e: Event): void {
    const h = this.handlers;
    if (!h || !this.root) return;
    const target = e.target as HTMLElement;
    const btn = target.closest<HTMLElement>('[data-act]');
    if (btn) {
      e.preventDefault();
      const act = btn.dataset.act;
      if (act === 'read') h.onRead();
      else if (act === 'skip') h.onSkip();
      else if (act === 'cancel') h.onCancel();
      else if (act === 'send-anyway') h.onSendAnyway();
      return;
    }
    if (target.closest('button[type="submit"]')) {
      e.preventDefault();
      const form = this.root.querySelector<HTMLFormElement>('form[data-form="quiz"]');
      if (!form) return;
      const answers = Array.from(form.querySelectorAll<HTMLElement>('.q')).map((q) => {
        const checked = q.querySelector<HTMLInputElement>('input:checked');
        return checked ? Number(checked.value) : null;
      });
      h.onAnswer(answers);
    }
  }

  private tickCountdown(until: number): void {
    const el = this.root?.querySelector<HTMLElement>('[data-countdown]');
    if (!el) return;
    const tick = () => {
      const left = Math.max(0, until - Date.now());
      const m = Math.floor(left / 60000);
      const s = Math.floor((left % 60000) / 1000);
      el.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      if (left > 0 && el.isConnected) setTimeout(tick, 500);
    };
    tick();
  }
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

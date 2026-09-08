import type {
  BlockState,
  Classification,
  ConceptMemory,
  Correction,
  GateCard,
  Outcome,
  Provider,
  ReviewItem,
  Settings,
  StatsEvent,
} from './types.ts';
import { classify, shouldGate } from './classify.ts';
import { buildGateCard, grade, shuffleChoices } from './gate.ts';
import { isAllowlisted, stripAllowlistPrefix } from './settings.ts';
import { isRemembered, promptHash } from './stats.ts';

/**
 * One prompt's journey through the gate. Pure-ish: the caller supplies the provider,
 * settings, memory, and block state, and receives events to persist. UI layers
 * (extension overlay, web app) render `state` and call the transition methods.
 */
export type SessionState =
  | { kind: 'idle' }
  | { kind: 'classifying' }
  | { kind: 'release'; prompt: string; outcome: Outcome; classification: Classification | null }
  | { kind: 'blocked'; until: number; classification: Classification; review: ReviewItem[] }
  | { kind: 'loading-card'; classification: Classification }
  | { kind: 'explain'; card: GateCard; classification: Classification; attempts: number; review: ReviewItem[] }
  | { kind: 'quiz'; card: GateCard; classification: Classification; attempts: number }
  | { kind: 'error'; message: string; prompt: string };

export interface SessionDeps {
  provider: Provider;
  settings: Settings;
  memory: ConceptMemory;
  block: BlockState | null;
  site: string;
  now?: () => number;
}

export interface SessionResult {
  state: SessionState;
  event?: StatsEvent;
  /** Set when the concept should be recorded as passed. */
  rememberConcept?: string;
  /** Set when hard mode just tripped. */
  block?: BlockState;
  /** Set when the user corrected the classifier. */
  correction?: Correction;
}

const CLASSIFY_TIMEOUT_MS = 15_000;
const CARD_TIMEOUT_MS = 30_000;
const SLOW_MS = 8_000;

export class GateSession {
  state: SessionState = { kind: 'idle' };
  private prompt = '';
  private cardShownAt = 0;
  private abandoned = false;
  private readonly now: () => number;

  constructor(private readonly deps: SessionDeps) {
    this.now = deps.now ?? (() => Date.now());
  }

  /** Step 1. Decide whether this prompt needs a gate. */
  async submit(prompt: string): Promise<SessionResult> {
    this.prompt = prompt;
    const { settings, memory, block, site } = this.deps;
    const ts = this.now();

    if (!settings.enabled) {
      return this.release(prompt, 'released', null, false);
    }
    if (isAllowlisted(prompt, settings.allowlist)) {
      return this.release(stripAllowlistPrefix(prompt, settings.allowlist), 'allowlisted', null, false);
    }
    if (block && block.until > ts) {
      const classification: Classification = {
        verdict: 'LAZY',
        confidence: 1,
        concept: null,
        subject: null,
        reason: 'Hard mode block is active.',
      };
      this.state = { kind: 'blocked', until: block.until, classification, review: [] };
      return { state: this.state, event: { ts, site, verdict: 'LAZY', gated: true, outcome: 'blocked' } };
    }

    this.state = { kind: 'classifying' };
    let classification: Classification;
    const started = this.now();
    try {
      classification = await classify(prompt, settings, this.deps.provider, CLASSIFY_TIMEOUT_MS);
    } catch (err) {
      if (this.abandoned) return { state: this.state };
      // Never trap the user behind a broken classifier. Fail open, but say so.
      this.state = { kind: 'error', message: errorMessage(err), prompt };
      return { state: this.state, event: { ts, site, verdict: null, gated: false, outcome: 'released', reason: isTimeout(err) ? 'timeout' : 'error' } };
    }
    if (this.abandoned) return { state: this.state };
    const slow = this.now() - started > SLOW_MS;

    if (!shouldGate(classification, settings.strictness) || !classification.concept) {
      return this.release(prompt, 'released', classification, false, slow);
    }
    if (isRemembered(memory, classification.concept, settings.conceptMemoryDays, ts)) {
      return this.release(prompt, 'remembered', classification, false, slow);
    }

    this.state = { kind: 'loading-card', classification };
    try {
      const card = shuffleChoices(
        await buildGateCard(prompt, classification.concept, classification.subject, settings.questionsPerGate, this.deps.provider, CARD_TIMEOUT_MS),
        ts,
      );
      if (this.abandoned) return { state: this.state };
      this.cardShownAt = this.now();
      this.state = { kind: 'explain', card, classification, attempts: 0, review: [] };
      return { state: this.state };
    } catch (err) {
      if (this.abandoned) return { state: this.state };
      this.state = { kind: 'error', message: errorMessage(err), prompt };
      return { state: this.state, event: { ts, site, verdict: classification.verdict, gated: false, outcome: 'released', reason: isTimeout(err) ? 'timeout' : 'error' } };
    }
  }

  /** Step 2. User finished reading, move to the quiz. */
  startQuiz(): SessionResult {
    if (this.state.kind !== 'explain') return { state: this.state };
    const { card, classification, attempts } = this.state;
    this.state = { kind: 'quiz', card, classification, attempts };
    return { state: this.state };
  }

  /**
   * Step 3. Grade. Pass releases the prompt. Fail shows the answer key, reshuffles the
   * choices so the retry cannot be passed by elimination, and returns to explain,
   * or blocks in hard mode.
   */
  answer(answers: Array<number | null | undefined>): SessionResult {
    if (this.state.kind !== 'quiz') return { state: this.state };
    const { card, classification } = this.state;
    const attempts = this.state.attempts + 1;
    const result = grade(card, answers);
    const ts = this.now();
    const { settings, site } = this.deps;
    const base = { ts, site, verdict: classification.verdict, gated: true, concept: card.concept, attempts, ms: this.elapsed() };

    if (result.passed) {
      this.state = { kind: 'release', prompt: this.prompt, outcome: 'passed', classification };
      return { state: this.state, event: { ...base, outcome: 'passed' }, rememberConcept: card.concept };
    }

    const review: ReviewItem[] = result.missed.map((i) => {
      const q = card.questions[i]!;
      const picked = answers[i];
      return {
        q: q.q,
        picked: typeof picked === 'number' ? (q.choices[picked] ?? null) : null,
        correct: q.choices[q.answer]!,
        why: q.why,
      };
    });

    if (settings.hardMode.enabled && attempts >= settings.hardMode.failsBeforeBlock) {
      const until = ts + settings.hardMode.blockMinutes * 60_000;
      this.state = { kind: 'blocked', until, classification, review };
      return { state: this.state, event: { ...base, outcome: 'blocked' }, block: { until } };
    }

    const reshuffled = shuffleChoices(card, ts + attempts * 7919);
    this.state = { kind: 'explain', card: reshuffled, classification, attempts, review };
    return { state: this.state, event: { ...base, outcome: 'failed' } };
  }

  /** Escape hatch. Not available in hard mode. Counts against the streak. */
  skip(): SessionResult {
    if (this.state.kind !== 'explain' && this.state.kind !== 'quiz') return { state: this.state };
    if (this.deps.settings.hardMode.enabled) return { state: this.state };
    const { classification, card, attempts } = this.state;
    this.state = { kind: 'release', prompt: this.prompt, outcome: 'skipped', classification };
    return {
      state: this.state,
      event: { ts: this.now(), site: this.deps.site, verdict: classification.verdict, gated: true, outcome: 'skipped', concept: card.concept, attempts, ms: this.elapsed() },
    };
  }

  /** User closed the card without sending. The prompt stays in the composer. */
  cancel(): SessionResult {
    const st = this.state;
    if (st.kind === 'explain' || st.kind === 'quiz' || st.kind === 'blocked') {
      const concept = 'card' in st ? st.card.concept : st.classification.concept ?? undefined;
      const attempts = 'attempts' in st ? st.attempts : undefined;
      this.state = { kind: 'idle' };
      return {
        state: this.state,
        event: { ts: this.now(), site: this.deps.site, verdict: st.classification.verdict, gated: true, outcome: 'cancelled', concept, attempts, ms: this.elapsed() },
      };
    }
    this.abandoned = true;
    this.state = { kind: 'idle' };
    return { state: this.state };
  }

  /**
   * "This was real work." Releases the prompt and records a correction row the
   * owner can export as a labeled example. The row carries a hash, never the text.
   */
  markLegit(): SessionResult {
    const st = this.state;
    if (st.kind !== 'explain' && st.kind !== 'quiz') return { state: this.state };
    const ts = this.now();
    const correction: Correction = { ts, hash: promptHash(this.prompt), verdict: st.classification.verdict, label: 'LEGIT', concept: st.card.concept };
    this.state = { kind: 'release', prompt: this.prompt, outcome: 'released', classification: st.classification };
    return {
      state: this.state,
      event: { ts, site: this.deps.site, verdict: st.classification.verdict, gated: true, outcome: 'released', concept: st.card.concept, attempts: st.attempts, ms: this.elapsed(), reason: 'user-legit' },
      correction,
    };
  }

  /**
   * Give up waiting on the provider (classifying or loading the card) and send the
   * prompt as typed. Any late result from the pending call is ignored.
   */
  sendAnyway(): SessionResult {
    if (this.state.kind !== 'classifying' && this.state.kind !== 'loading-card' && this.state.kind !== 'error') return { state: this.state };
    this.abandoned = true;
    const prompt = this.state.kind === 'error' ? this.state.prompt : this.prompt;
    return this.release(prompt, 'released', null, false, false, 'send-anyway');
  }

  /** After an error, the caller can let the prompt through. */
  releaseAfterError(): SessionResult {
    if (this.state.kind !== 'error') return { state: this.state };
    return this.release(this.state.prompt, 'released', null, false, false, 'error');
  }

  private elapsed(): number {
    return this.cardShownAt ? this.now() - this.cardShownAt : 0;
  }

  private release(prompt: string, outcome: Outcome, classification: Classification | null, gated: boolean, slow = false, reason?: string): SessionResult {
    this.state = { kind: 'release', prompt, outcome, classification };
    return {
      state: this.state,
      event: {
        ts: this.now(),
        site: this.deps.site,
        verdict: classification?.verdict ?? null,
        gated,
        outcome,
        concept: classification?.concept ?? undefined,
        ...(slow ? { slow } : {}),
        ...(reason ? { reason } : {}),
      },
    };
  }
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function isTimeout(err: unknown): boolean {
  return err instanceof Error && /timed out|timeout|abort/i.test(err.message);
}

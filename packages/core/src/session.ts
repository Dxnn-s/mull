import type {
  BlockState,
  Classification,
  ConceptMemory,
  GateCard,
  Outcome,
  Provider,
  Settings,
  StatsEvent,
} from './types.ts';
import { classify, shouldGate } from './classify.ts';
import { buildGateCard, grade, shuffleChoices } from './gate.ts';
import { isAllowlisted, stripAllowlistPrefix } from './settings.ts';
import { isRemembered } from './stats.ts';

/**
 * One prompt's journey through the gate. Pure-ish: the caller supplies the provider,
 * settings, memory, and block state, and receives events to persist. UI layers
 * (extension overlay, web app) render `state` and call the transition methods.
 */
export type SessionState =
  | { kind: 'idle' }
  | { kind: 'classifying' }
  | { kind: 'release'; prompt: string; outcome: Outcome; classification: Classification | null }
  | { kind: 'blocked'; until: number; classification: Classification }
  | { kind: 'loading-card'; classification: Classification }
  | { kind: 'explain'; card: GateCard; classification: Classification; attempts: number; missed: number[] }
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
}

export class GateSession {
  state: SessionState = { kind: 'idle' };
  private prompt = '';
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
      this.state = { kind: 'blocked', until: block.until, classification };
      return { state: this.state, event: { ts, site, verdict: 'LAZY', gated: true, outcome: 'blocked' } };
    }

    this.state = { kind: 'classifying' };
    let classification: Classification;
    try {
      classification = await classify(prompt, settings, this.deps.provider);
    } catch (err) {
      // Never trap the user behind a broken classifier. Fail open, but say so.
      this.state = { kind: 'error', message: errorMessage(err), prompt };
      return { state: this.state, event: { ts, site, verdict: null, gated: false, outcome: 'released' } };
    }

    if (!shouldGate(classification, settings.strictness) || !classification.concept) {
      return this.release(prompt, 'released', classification, false);
    }
    if (isRemembered(memory, classification.concept, settings.conceptMemoryDays, ts)) {
      return this.release(prompt, 'remembered', classification, false);
    }

    this.state = { kind: 'loading-card', classification };
    try {
      const card = shuffleChoices(
        await buildGateCard(prompt, classification.concept, classification.subject, settings.questionsPerGate, this.deps.provider),
        ts,
      );
      this.state = { kind: 'explain', card, classification, attempts: 0, missed: [] };
      return { state: this.state };
    } catch (err) {
      this.state = { kind: 'error', message: errorMessage(err), prompt };
      return { state: this.state, event: { ts, site, verdict: classification.verdict, gated: false, outcome: 'released' } };
    }
  }

  /** Step 2. User finished reading, move to the quiz. */
  startQuiz(): SessionResult {
    if (this.state.kind !== 'explain') return { state: this.state };
    const { card, classification, attempts } = this.state;
    this.state = { kind: 'quiz', card, classification, attempts };
    return { state: this.state };
  }

  /** Step 3. Grade. Pass releases the prompt; fail returns to explain, or blocks in hard mode. */
  answer(answers: Array<number | null | undefined>): SessionResult {
    if (this.state.kind !== 'quiz') return { state: this.state };
    const { card, classification } = this.state;
    const attempts = this.state.attempts + 1;
    const result = grade(card, answers);
    const ts = this.now();
    const { settings, site } = this.deps;
    const base = { ts, site, verdict: classification.verdict, gated: true, concept: card.concept, attempts };

    if (result.passed) {
      this.state = { kind: 'release', prompt: this.prompt, outcome: 'passed', classification };
      return { state: this.state, event: { ...base, outcome: 'passed' }, rememberConcept: card.concept };
    }

    if (settings.hardMode.enabled && attempts >= settings.hardMode.failsBeforeBlock) {
      const until = ts + settings.hardMode.blockMinutes * 60_000;
      this.state = { kind: 'blocked', until, classification };
      return { state: this.state, event: { ...base, outcome: 'blocked' }, block: { until } };
    }

    this.state = { kind: 'explain', card, classification, attempts, missed: result.missed };
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
      event: {
        ts: this.now(),
        site: this.deps.site,
        verdict: classification.verdict,
        gated: true,
        outcome: 'skipped',
        concept: card.concept,
        attempts,
      },
    };
  }

  /** After an error, the caller can let the prompt through. */
  releaseAfterError(): SessionResult {
    if (this.state.kind !== 'error') return { state: this.state };
    return this.release(this.state.prompt, 'released', null, false);
  }

  private release(prompt: string, outcome: Outcome, classification: Classification | null, gated: boolean): SessionResult {
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
      },
    };
  }
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

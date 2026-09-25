import type { ConceptMemory, StatsEvent } from './types.ts';
import { conceptKey, promptHash } from './stats.ts';

/**
 * Why someone is asking, not what they asked.
 *
 * The classifier reads the prompt, and the prompt is not enough. "What is the
 * chain rule" from someone who has never seen it and "what is the chain rule"
 * from someone who passed a card on it last week are the same eighteen
 * characters and completely different events. One is a first encounter. The
 * other is a memory that did not stick. Treating them the same is what makes a
 * gate feel like a toll booth: it reacts to the text and ignores the person.
 *
 * Everything here is read from behaviour already on the device. No model, no
 * network, no cost, and nothing leaves the phone. Behaviour is where intent
 * lives, and behaviour is local.
 */
export type Intent =
  /** Never seen this. Teach it properly. */
  | 'first'
  /** Passed it before and lost it. A reminder, not a lesson. */
  | 'forgot'
  /** Submitted the instant the screen opened. Did not think, by definition. */
  | 'reflex'
  /** Same question again, or skipping repeatedly. Not asking in good faith. */
  | 'grinding';

export interface IntentRead {
  intent: Intent;
  /** Plain sentence, shown to the user. They should be able to argue with it. */
  why: string;
  /** How many questions this deserves. A reminder is not worth two. */
  questions: number;
  /** Whether to lead with the full explanation or a short reminder. */
  brief: boolean;
}

export interface IntentSignals {
  /** Concept being taught, when known. */
  concept: string | null;
  /** What they typed, for repeat detection. Hashed, never stored raw. */
  prompt?: string;
  memory: ConceptMemory;
  recent: StatsEvent[];
  /** Milliseconds from the gate opening to them submitting. */
  msToSubmit?: number;
  now?: number;
}

/** Under this, nobody read anything. Pasted or reflex. */
const REFLEX_MS = 2500;
/** Consecutive walk-aways that mean they are not really here. */
const GRIND_STREAK = 3;

/**
 * Rules are ordered by how much they should override each other. Grinding wins,
 * because someone gaming the gate should not get an easier card for it. Then
 * reflex, which is about how they arrived. Then forgot, which is about the
 * concept. First is the default, and the default is generous on purpose: a
 * wrong 'first' costs one extra question, a wrong 'grinding' accuses someone.
 */
export function readIntent(s: IntentSignals): IntentRead {
  const now = s.now ?? Date.now();
  const recent = s.recent ?? [];

  // Walking away from the last few cards in a row.
  const tail = recent.slice(-GRIND_STREAK);
  const walked = tail.length === GRIND_STREAK && tail.every((e) => e.outcome === 'skipped' || e.outcome === 'cancelled');

  // The identical question again, within the day.
  const repeated =
    !!s.prompt &&
    recent.some((e) => e.promptHash && e.promptHash === promptHash(s.prompt!) && now - e.ts < 24 * 3_600_000);

  if (walked || repeated) {
    return {
      intent: 'grinding',
      why: repeated ? 'You asked this already today.' : 'Third one in a row you have walked away from.',
      questions: 2,
      brief: false,
    };
  }

  if (typeof s.msToSubmit === 'number' && s.msToSubmit >= 0 && s.msToSubmit < REFLEX_MS) {
    return {
      intent: 'reflex',
      why: 'That was faster than reading it.',
      questions: 2,
      brief: false,
    };
  }

  const key = s.concept ? conceptKey(s.concept) : null;
  const known = key ? s.memory[key] : undefined;
  if (known && known.passes > 0) {
    const days = Math.max(0, Math.round((now - known.passedAt) / 86_400_000));
    return {
      intent: 'forgot',
      why: days <= 0 ? 'You passed this earlier today.' : `You had this ${days} day${days === 1 ? '' : 's'} ago.`,
      // It is already in there somewhere. One question is a retrieval cue, and
      // retrieval is the thing that makes it stick. Two is a punishment.
      questions: 1,
      brief: true,
    };
  }

  return { intent: 'first', why: 'New one.', questions: 2, brief: false };
}

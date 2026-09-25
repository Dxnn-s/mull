import { buildGateCard, grade, shuffleChoices } from '@mull/core/gate';
import { classify, shouldGate } from '@mull/core/classify';
import { createProvider } from '@mull/core';
import { CARDS, demoCard } from '@mull/core/cards';
import { listConcepts } from '@mull/core/stats';
import { isResting } from '@mull/core/ladder';
import type { ConceptMemory, GateCard, ReviewItem, Settings } from '@mull/core/types';

/**
 * The app has no user prompt to classify. A card comes from a subject the user
 * picked and a concept that is not currently remembered. v0 draws from a small
 * built-in bank per subject; the spaced ladder and a server-side concept list
 * come later (app-plan.md).
 */
export const CONCEPT_BANK: Record<string, string[]> = {
  Calculus: ['the chain rule', 'integration by parts', 'the fundamental theorem of calculus', 'limits at infinity', 'implicit differentiation', 'u-substitution', 'the mean value theorem', 'Taylor series'],
  Statistics: ['p-values', 'the central limit theorem', 'standard deviation vs standard error', 'confidence intervals', 'type I and type II errors', 'correlation vs causation', 'the normal distribution', 'sampling bias'],
  Chemistry: ["Le Chatelier's principle", 'limiting reagents', 'molarity', 'ideal gas law', 'electronegativity', 'enthalpy vs entropy', 'oxidation states', 'buffer solutions'],
  Biology: ['osmosis', 'mitosis vs meiosis', 'the Krebs cycle', 'natural selection', 'DNA replication', 'enzyme kinetics', 'photosynthesis light reactions', 'Hardy-Weinberg equilibrium'],
  Physics: ['kinetic energy', "Newton's second law", 'conservation of momentum', 'torque', 'simple harmonic motion', 'electric fields', "Ohm's law", 'the work-energy theorem'],
  Economics: ['supply and demand', 'elasticity of demand', 'opportunity cost', 'comparative advantage', 'marginal cost', 'inflation', 'fiscal vs monetary policy', 'deadweight loss'],
  'Computer science': ['big O notation', 'recursion', 'hash tables', 'binary search', 'pointers and references', 'stacks vs queues', 'the call stack', 'dynamic programming'],
  History: ['the causes of World War I', 'the Cold War containment policy', 'mercantilism', 'the Industrial Revolution', 'the Reformation', 'the Marshall Plan', 'imperialism', 'the New Deal'],
  Spanish: ['the preterite vs the imperfect', 'ser vs estar', 'the subjunctive mood', 'direct object pronouns', 'reflexive verbs', 'por vs para', 'gustar-type verbs', 'the conditional tense'],
  Writing: ['thesis statements', 'topic sentences', 'active vs passive voice', 'the Oxford comma', 'MLA in-text citations', 'counterarguments', 'transitions', 'parallel structure'],
};

/**
 * The written cards, grouped by the subject they belong to. Derived from the
 * bank rather than listed again here: the first version kept a separate list of
 * concept names and matched it to the bank by string, the names drifted, and
 * Chemistry and History silently ended up with no reachable card at all.
 */
const WRITTEN_BY_SUBJECT: Record<string, string[]> = {};
for (const card of CARDS) (WRITTEN_BY_SUBJECT[card.subject] ??= []).push(card.concept);

/** Subjects that can be taught with no provider at all. */
export const WRITTEN_SUBJECTS = Object.keys(WRITTEN_BY_SUBJECT);

/**
 * `writtenOnly` keeps the pick inside the shipped bank, which is the default
 * when no AI account is linked. It narrows per subject rather than across the
 * whole pool, so a Calculus plus Chemistry user still gets asked about
 * Chemistry, and it drops a subject with no written card instead of quietly
 * handing back a concept nothing can teach.
 */
export function pickConcept(subjects: string[], memory: ConceptMemory, memoryDays: number, seed = Date.now(), writtenOnly = false): { subject: string; concept: string } | null {
  const perSubject = subjects
    .map((subject) => {
      const names = writtenOnly ? (WRITTEN_BY_SUBJECT[subject] ?? []) : (CONCEPT_BANK[subject] ?? []);
      return { subject, names };
    })
    .filter((s) => s.names.length);
  if (!perSubject.length) return null;

  // Take the freshest concept each subject can offer, then choose between
  // subjects. Flattening first let a subject with more concepts crowd out one
  // with fewer, which is how mixed subjects starved.
  const passed = new Map(listConcepts(memory).map((c) => [c.concept, c.passedAt] as const));
  const best = perSubject.map(({ subject, names }) => {
    const all = names.map((concept) => ({ subject, concept }));
    // The ladder decides, so a concept you have held for weeks stays out of the
    // way and one you keep dropping comes back sooner.
    const fresh = all.filter((c) => !isResting(memory, c.concept));
    const pool = fresh.length ? fresh : all;
    pool.sort((a, b) => (passed.get(a.concept.toLowerCase()) ?? 0) - (passed.get(b.concept.toLowerCase()) ?? 0));
    return { pick: pool[0]!, fresh: fresh.length > 0, seen: passed.get(pool[0]!.concept.toLowerCase()) ?? 0 };
  });

  // Prefer a subject that still has something unseen, oldest first.
  const withFresh = best.filter((b) => b.fresh);
  const from = withFresh.length ? withFresh : best;
  from.sort((a, b) => a.seen - b.seen);
  const slice = from.slice(0, Math.max(1, Math.min(4, from.length)));
  return slice[Math.abs(seed) % slice.length]?.pick ?? null;
}

export async function makeCard(settings: Settings, subject: string, concept: string): Promise<GateCard> {
  // The bank answers first. These are written to the same rules the model gets,
  // so a written card is not a downgrade, and it costs nothing and arrives with
  // no network at all.
  const written = demoCard(concept);
  if (written) return shuffleChoices(written, Date.now());

  // The mock provider answers with a placeholder whose choices read "The
  // correct one" and "A silly one". That is fine in a test and humiliating in
  // front of a user, so it never stands in for a real card.
  if (settings.provider === 'mock' || !settings.apiKey.trim()) {
    throw new Error(`No card written for ${concept} yet. Pick another subject, or link an AI account to write one.`);
  }

  const provider = createProvider(settings);
  const card = await buildGateCard(`Teach me ${concept} for ${subject}.`, concept, subject, settings.questionsPerGate, provider, 30_000);
  return shuffleChoices(card, Date.now());
}

export function gradeCard(card: GateCard, answers: Array<number | null>): { passed: boolean; review: ReviewItem[]; reshuffled: GateCard } {
  const g = grade(card, answers);
  const review: ReviewItem[] = g.missed.map((i) => {
    const q = card.questions[i]!;
    const picked = answers[i];
    return { q: q.q, picked: typeof picked === 'number' ? (q.choices[picked] ?? null) : null, correct: q.choices[q.answer]!, why: q.why };
  });
  return { passed: g.passed, review, reshuffled: shuffleChoices(card, Date.now() + 7919) };
}

export function formatSaved(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  return h ? `${h}h ${String(m % 60).padStart(2, '0')}m` : `${m}m`;
}

export function formatClock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** What ask mode gets back: either it let you through, or here is the card. */
export type AskResult =
  | { kind: 'released'; reason: string }
  | { kind: 'card'; card: GateCard; subject: string; concept: string };

/**
 * The dynamic path. A linked account means the card is written for whatever was
 * actually asked, not matched against a list, so it covers the topic somebody is
 * studying this week rather than the ten subjects we happened to write.
 *
 * The classifier runs first and can let the question through on its own. That
 * matters: a question with real thinking in it should never be gated just
 * because no written card matched, and the preClassify rules only catch the
 * obvious shapes.
 */
export async function makeCardForQuestion(settings: Settings, prompt: string): Promise<AskResult> {
  const provider = createProvider(settings);
  const verdict = await classify(prompt, settings, provider, 15_000);
  if (!shouldGate(verdict, settings.strictness)) {
    return { kind: 'released', reason: verdict.reason || 'that reads like real work' };
  }
  const concept = verdict.concept ?? prompt.trim().slice(0, 60);
  const subject = verdict.subject ?? settings.subjects[0] ?? 'this';
  const card = await buildGateCard(prompt, concept, subject, settings.questionsPerGate, provider, 30_000);
  return { kind: 'card', card: shuffleChoices(card, Date.now()), subject, concept };
}

/** Whether the dynamic path is available at all. */
export function isLinked(settings: Settings): boolean {
  return settings.provider !== 'mock' && settings.apiKey.trim().length > 0;
}

import { buildGateCard, grade, shuffleChoices } from '@mull/core/gate';
import { createProvider } from '@mull/core';
import { CARDS, demoCard } from '@mull/core/cards';
import { isRemembered, listConcepts } from '@mull/core/stats';
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

/** Concepts the bank has a written card for, so they need no provider at all. */
const WRITTEN = new Set(CARDS.map((c) => c.concept.toLowerCase()));

/**
 * `writtenOnly` keeps the pick inside the shipped bank. That is the default
 * when no AI account is linked, which is how the app works out of the box
 * rather than sitting there demanding a key.
 */
export function pickConcept(subjects: string[], memory: ConceptMemory, memoryDays: number, seed = Date.now(), writtenOnly = false): { subject: string; concept: string } | null {
  const active = subjects.filter((s) => CONCEPT_BANK[s]?.length);
  if (!active.length) return null;
  let all = active.flatMap((subject) => CONCEPT_BANK[subject]!.map((concept) => ({ subject, concept })));
  if (writtenOnly) {
    const written = all.filter((c) => WRITTEN.has(c.concept.toLowerCase()));
    // Only narrow if something survives, or picking a subject with no written
    // card yet would hand back nothing at all.
    if (written.length) all = written;
  }
  const fresh = all.filter((c) => !isRemembered(memory, c.concept, memoryDays));
  const pool = fresh.length ? fresh : all;
  // Least-recently-passed first, then a seeded pick among the least seen.
  const passed = new Map(listConcepts(memory).map((c) => [c.concept, c.passedAt] as const));
  pool.sort((a, b) => (passed.get(a.concept.toLowerCase()) ?? 0) - (passed.get(b.concept.toLowerCase()) ?? 0));
  const slice = pool.slice(0, Math.max(1, Math.min(4, pool.length)));
  return slice[Math.abs(seed) % slice.length] ?? null;
}

export async function makeCard(settings: Settings, subject: string, concept: string): Promise<GateCard> {
  // The bank answers first. These are written to the same rules the model gets,
  // so a written card is not a downgrade, and it costs nothing and arrives with
  // no network at all.
  const written = demoCard(concept);
  if (written) return shuffleChoices(written, Date.now());

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

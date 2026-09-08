import type { GateCard, Provider, QuizQuestion } from './types.ts';
import { gateSystemPrompt, gateUserPrompt } from './prompts.ts';
import { extractJson } from './json.ts';

export async function buildGateCard(
  prompt: string,
  concept: string,
  subject: string | null,
  questionsPerGate: number,
  provider: Provider,
  timeoutMs?: number,
): Promise<GateCard> {
  const raw = await provider.complete({
    system: gateSystemPrompt(questionsPerGate),
    user: gateUserPrompt(prompt, concept, subject),
    maxTokens: 900,
    ...(timeoutMs ? { timeoutMs } : {}),
  });
  return normalizeGateCard(extractJson<Partial<GateCard>>(raw), concept, questionsPerGate);
}

export function normalizeGateCard(card: Partial<GateCard>, fallbackConcept: string, questionsPerGate: number): GateCard {
  const concept = typeof card.concept === 'string' && card.concept.trim() ? card.concept.trim() : fallbackConcept;
  const explanation = typeof card.explanation === 'string' ? card.explanation.trim() : '';
  if (!explanation) throw new Error('gate card missing explanation');
  const questions = (Array.isArray(card.questions) ? card.questions : [])
    .map(normalizeQuestion)
    .filter((q): q is QuizQuestion => q !== null)
    .slice(0, questionsPerGate);
  if (questions.length === 0) throw new Error('gate card has no usable questions');
  return { concept, explanation, questions };
}

function normalizeQuestion(q: unknown): QuizQuestion | null {
  if (!q || typeof q !== 'object') return null;
  const { q: text, choices, answer, why } = q as Partial<QuizQuestion>;
  if (typeof text !== 'string' || !text.trim()) return null;
  if (!Array.isArray(choices) || choices.length < 2) return null;
  const clean = choices.map((c) => String(c).trim()).filter(Boolean);
  const idx = Number(answer);
  if (!Number.isInteger(idx) || idx < 0 || idx >= clean.length) return null;
  const out: QuizQuestion = { q: text.trim(), choices: clean, answer: idx };
  if (typeof why === 'string' && why.trim()) out.why = why.trim();
  return out;
}

export interface GradeResult {
  correct: number;
  total: number;
  passed: boolean;
  /** Indices of questions answered wrong. */
  missed: number[];
}

/** Pass = every question right. One miss is a fail; the card re-explains and the user retries. */
export function grade(card: GateCard, answers: Array<number | null | undefined>): GradeResult {
  const missed: number[] = [];
  card.questions.forEach((q, i) => {
    if (answers[i] !== q.answer) missed.push(i);
  });
  return {
    correct: card.questions.length - missed.length,
    total: card.questions.length,
    passed: missed.length === 0,
    missed,
  };
}

/** Shuffle choices so the correct answer is not always first. Deterministic given seed. */
export function shuffleChoices(card: GateCard, seed = Date.now()): GateCard {
  let s = seed >>> 0;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
  return {
    ...card,
    questions: card.questions.map((q) => {
      const order = q.choices.map((_, i) => i);
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [order[i], order[j]] = [order[j]!, order[i]!];
      }
      return {
        q: q.q,
        choices: order.map((i) => q.choices[i]!),
        answer: order.indexOf(q.answer),
        ...(q.why ? { why: q.why } : {}),
      };
    }),
  };
}

import type { Classification, Provider, Settings, Strictness, Verdict } from './types.ts';
import { classifierSystemPrompt, classifierUserPrompt } from './prompts.ts';
import { extractJson } from './json.ts';

const VERDICTS: Verdict[] = ['LAZY', 'LEGIT', 'EDGE'];

export async function classify(
  prompt: string,
  settings: Pick<Settings, 'subjects' | 'strictness'>,
  provider: Provider,
): Promise<Classification> {
  const raw = await provider.complete({
    system: classifierSystemPrompt(settings),
    user: classifierUserPrompt(prompt),
    maxTokens: 200,
  });
  return normalizeClassification(extractJson<Partial<Classification>>(raw));
}

export function normalizeClassification(c: Partial<Classification>): Classification {
  const verdict = VERDICTS.includes(c.verdict as Verdict) ? (c.verdict as Verdict) : 'EDGE';
  const confidence = clamp(Number(c.confidence), 0, 1, 0.5);
  const concept = typeof c.concept === 'string' && c.concept.trim() ? c.concept.trim() : null;
  const subject = typeof c.subject === 'string' && c.subject.trim() ? c.subject.trim() : null;
  const reason = typeof c.reason === 'string' ? c.reason.trim() : '';
  return { verdict, confidence, concept: verdict === 'LEGIT' ? null : concept, subject, reason };
}

/**
 * The one place the strictness policy lives.
 * lenient: gate only confident LAZY.
 * normal:  gate LAZY unless the model is unsure.
 * strict:  gate LAZY and EDGE.
 */
export function shouldGate(c: Classification, strictness: Strictness): boolean {
  if (c.verdict === 'LEGIT') return false;
  if (c.verdict === 'EDGE') return strictness === 'strict';
  switch (strictness) {
    case 'lenient':
      return c.confidence >= 0.8;
    case 'normal':
      return c.confidence >= 0.6;
    case 'strict':
      return true;
  }
}

function clamp(n: number, lo: number, hi: number, fallback: number): number {
  if (!Number.isFinite(n)) return fallback;
  return Math.min(hi, Math.max(lo, n));
}

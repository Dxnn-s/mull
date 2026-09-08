/**
 * Zero-cost rules that run before the model. A prompt that visibly carries the
 * user's own work is LEGIT by rule 1 of the classifier, and the prompts users
 * care most about (a pasted draft, a stack trace, a code block) are exactly the
 * ones that must never wait on a network call or get gated by mistake.
 *
 * Returns a reason string when the prompt should be released without a model
 * call, or null to continue to the classifier.
 */
export function preClassify(prompt: string): string | null {
  const p = prompt.trim();
  if (/```/.test(p)) return 'effort shown: code block';
  if (p.length > 600) return 'effort shown: long prompt';
  const breaks = (p.match(/\n/g) ?? []).length;
  if (breaks >= 4) return 'effort shown: multi-line';
  return null;
}

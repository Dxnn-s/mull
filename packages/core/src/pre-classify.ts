/**
 * Zero-cost rules that run before the model.
 *
 * A prompt visibly carrying the user's own work is LEGIT by rule 1 of the
 * classifier, and those are the prompts that must never wait on a network call
 * or get gated by mistake. Releasing them here is free, instant, and works with
 * no account linked.
 *
 * The rules used to be easy to play. Counting newline characters meant pressing
 * Enter four times and then typing the question walked straight past the gate,
 * and a student works that out in a week. The point is to recognise work, so
 * each rule now wants substance rather than a character: lines with something
 * on them, and length that is not one phrase repeated.
 *
 * It is still not a wall and is not meant to be. Someone determined will paste
 * filler. But faking the work should cost more than doing the card, and before
 * it cost four keystrokes.
 *
 * Returns a reason when the prompt should be released without a model call, or
 * null to continue to the classifier.
 */

/** Lines carrying something. Blank and whitespace-only ones do not count. */
function substantialLines(p: string): number {
  return p.split('\n').filter((line) => line.trim().length >= 12).length;
}

/** Varied rather than one thing repeated to reach a length. */
function looksVaried(p: string): boolean {
  const words = p.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length < 12) return false;
  // Real writing keeps a good share of unique words. Padding by repeating a
  // phrase collapses this ratio quickly.
  return new Set(words).size / words.length > 0.35;
}

export function preClassify(prompt: string): string | null {
  const p = prompt.trim();

  // A fenced block is pasted code or output. Faking one means pasting something
  // that looks like code, which is itself more work than the card.
  if (/```[\s\S]*?```/.test(p) || /```[\s\S]{40,}/.test(p)) return 'effort shown: code block';

  // A stack trace is distinctive and strong evidence of a real problem.
  if (p.includes('\n') && /^\s*(at |File "|Traceback|Exception in|\w*Error:|\w*Exception:)/m.test(p)) {
    return 'effort shown: error output';
  }

  // Long, and actually written rather than padded out.
  if (p.length > 600 && looksVaried(p)) return 'effort shown: long prompt';

  // Four lines that each carry something, not four taps of Enter.
  if (substantialLines(p) >= 4) return 'effort shown: multi-line';

  return null;
}

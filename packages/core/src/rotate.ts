import type { GateCard } from './types.ts';
import type { BankCard } from './cards.ts';

/**
 * Ask a different pair of questions each time a card comes back.
 *
 * The bank is twenty cards. Two subjects is four of them, and the ladder brings
 * a concept back after a day, so a daily user meets the same card with the same
 * two questions inside a week. Recognising "it was the second one" is not
 * learning, and a card you have memorised the shape of is a toll again.
 *
 * Writing a hundred more cards is the obvious answer and the expensive one.
 * Carrying four questions and asking two multiplies what the bank can ask by
 * six, for a couple of sentences per card rather than a whole new lesson.
 *
 * The pick is seeded by how many times the concept has been passed, so it walks
 * the pairs in order rather than landing on the same one twice by luck, and the
 * same record always produces the same card, which keeps tests and the demo
 * reproducible.
 */

/** Every unordered pair of indices, in a stable order. */
function pairs(n: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) out.push([i, j]);
  return out;
}

/**
 * Pick `count` questions from everything the card carries, varying with how
 * many times this concept has already been passed.
 */
export function rotateQuestions<T extends GateCard | BankCard>(card: T, passes: number, count = 2): T {
  const all = card.questions;
  if (all.length <= count) return card;

  // Two is the normal case and deserves the even walk through pairs.
  if (count === 2) {
    const combos = pairs(all.length);
    const [a, b] = combos[Math.abs(passes) % combos.length]!;
    return { ...card, questions: [all[a]!, all[b]!] };
  }

  // Any other count: rotate the start point so successive passes shift along.
  const start = Math.abs(passes * count) % all.length;
  const picked = Array.from({ length: count }, (_, k) => all[(start + k) % all.length]!);
  return { ...card, questions: picked };
}

/** How many distinct question sets a card can produce. For the record screen. */
export function variations(card: GateCard, count = 2): number {
  if (card.questions.length <= count) return 1;
  return count === 2 ? pairs(card.questions.length).length : card.questions.length;
}

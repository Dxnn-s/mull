import { describe, expect, it } from 'vitest';
import { SUBJECT_CHIPS } from '@mull/core/consent';
import { mergeSettings } from '@mull/core/settings';
import { makeCard, pickConcept } from './quiz';

/**
 * These walk the path the app actually takes, which is the whole point.
 *
 * The bank had ten subjects with two written cards each and a test asserting
 * exactly that. The app never called the function that test called: it went
 * through pickConcept, which matched a separate list of concept names against
 * the bank by string. The names drifted, Chemistry and History reached nothing,
 * and their users were served a placeholder card reading "The correct one".
 * Green tests the whole time. So test the real entry points, one subject at a
 * time, the way a user who picked one subject would hit them.
 */
const unlinked = mergeSettings({ provider: 'mock', apiKey: '', questionsPerGate: 2 });

describe('a card is reachable for every subject with nothing linked', () => {
  for (const subject of SUBJECT_CHIPS) {
    it(`${subject} reaches a real written card`, async () => {
      const pick = pickConcept([subject], {}, 2, Date.now(), true);
      expect(pick, `${subject} produced no concept`).not.toBeNull();
      expect(pick!.subject).toBe(subject);

      const card = await makeCard(unlinked, pick!.subject, pick!.concept);
      expect(card.questions.length).toBeGreaterThan(0);
      // The placeholder's choices are unmistakable. None of them may appear.
      const text = JSON.stringify(card);
      expect(text, `${subject} was served the placeholder card`).not.toMatch(/The correct one|A plausible wrong one|A silly one/);
      for (const q of card.questions) expect(q.choices[q.answer]).toBeTruthy();
    });
  }
});

describe('picking concepts', () => {
  it('never offers a concept it cannot teach when nothing is linked', async () => {
    // Every subject at once, many draws: each one has to come back teachable.
    for (let i = 0; i < 60; i++) {
      const pick = pickConcept(SUBJECT_CHIPS, {}, 2, i * 7919, true);
      expect(pick).not.toBeNull();
      await expect(makeCard(unlinked, pick!.subject, pick!.concept)).resolves.toBeTruthy();
    }
  });

  it('asks about both subjects rather than starving the smaller one', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 80; i++) {
      const pick = pickConcept(['Calculus', 'Chemistry'], {}, 2, i * 104729, true);
      if (pick) seen.add(pick.subject);
    }
    expect([...seen].sort()).toEqual(['Calculus', 'Chemistry']);
  });

  it('prefers a concept that has not been passed yet', () => {
    const first = pickConcept(['Physics'], {}, 7, 1, true)!;
    const memory = { [first.concept.toLowerCase()]: { passedAt: Date.now(), passes: 1 } };
    const second = pickConcept(['Physics'], memory, 7, 1, true)!;
    expect(second.concept).not.toBe(first.concept);
  });

  it('refuses rather than inventing when the subject is unknown', () => {
    expect(pickConcept(['Underwater basket weaving'], {}, 2, 1, true)).toBeNull();
    expect(pickConcept([], {}, 2, 1, true)).toBeNull();
  });

  it('says so plainly instead of serving a placeholder', async () => {
    await expect(makeCard(unlinked, 'Chemistry', 'buffer solutions')).rejects.toThrow(/No card written/);
  });
});

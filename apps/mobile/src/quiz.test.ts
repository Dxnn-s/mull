import { describe, expect, it } from 'vitest';
import { mergeSettings } from '@mull/core/settings';
import { rememberPass } from '@mull/core/stats';
import { CONCEPT_BANK, formatClock, formatSaved, gradeCard, makeCard, pickConcept } from './quiz';

describe('pickConcept', () => {
  it('returns null with no usable subjects', () => {
    expect(pickConcept([], {}, 2)).toBeNull();
    expect(pickConcept(['Underwater basket weaving'], {}, 2)).toBeNull();
  });
  it('draws from the chosen subjects and skips remembered concepts', () => {
    const memory = CONCEPT_BANK.Calculus!.slice(0, 7).reduce((m, c) => rememberPass(m, c), {});
    for (let seed = 0; seed < 20; seed++) {
      const pick = pickConcept(['Calculus'], memory, 30, seed);
      expect(pick?.subject).toBe('Calculus');
      expect(pick?.concept).toBe(CONCEPT_BANK.Calculus![7]);
    }
  });
  it('falls back to the least recently passed when everything is remembered', () => {
    let memory = {};
    CONCEPT_BANK.Physics!.forEach((c, i) => (memory = rememberPass(memory, c, 1000 + i)));
    const pick = pickConcept(['Physics'], memory, 365, 3);
    expect(CONCEPT_BANK.Physics!.slice(0, 4)).toContain(pick?.concept);
  });
});

describe('makeCard + gradeCard with the demo provider', () => {
  it('builds a card, grades a miss with a review, and reshuffles', async () => {
    const settings = mergeSettings({ provider: 'mock', apiKey: '', questionsPerGate: 2 });
    const card = await makeCard(settings, 'Calculus', 'the chain rule');
    expect(card.concept).toBe('the chain rule');
    expect(card.questions).toHaveLength(2);
    const wrong = card.questions.map((q) => (q.answer + 1) % q.choices.length);
    const g = gradeCard(card, wrong);
    expect(g.passed).toBe(false);
    expect(g.review).toHaveLength(2);
    expect(g.review[0]!.correct).toBe(card.questions[0]!.choices[card.questions[0]!.answer]);
    expect(g.reshuffled.questions[0]!.choices[g.reshuffled.questions[0]!.answer]).toBe(g.review[0]!.correct);
    expect(gradeCard(card, card.questions.map((q) => q.answer)).passed).toBe(true);
  });
});

describe('formatting', () => {
  it('formats saved time and clocks', () => {
    expect(formatSaved(59)).toBe('0m');
    expect(formatSaved(5040)).toBe('1h 24m');
    expect(formatClock(18 * 60_000 + 42_000)).toBe('18:42');
    expect(formatClock(-5)).toBe('00:00');
  });
});

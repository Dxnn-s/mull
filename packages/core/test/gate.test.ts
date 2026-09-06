import { describe, expect, it } from 'vitest';
import { buildGateCard, grade, normalizeGateCard, shuffleChoices } from '../src/gate.ts';
import { MockProvider } from '../src/providers/mock.ts';

describe('buildGateCard', () => {
  it('returns a card capped at questionsPerGate', async () => {
    const card = await buildGateCard('integrate x*e^x', 'integration by parts', 'calculus', 2, new MockProvider());
    expect(card.concept).toBe('integration by parts');
    expect(card.questions).toHaveLength(2);
    expect(card.explanation.length).toBeGreaterThan(20);
  });
});

describe('normalizeGateCard', () => {
  it('drops malformed questions and throws when none survive', () => {
    expect(() => normalizeGateCard({ explanation: 'x', questions: [{ q: 'a', choices: ['1'], answer: 0 }] }, 'c', 2)).toThrow();
  });
  it('rejects out-of-range answers', () => {
    expect(() => normalizeGateCard({ explanation: 'x', questions: [{ q: 'a', choices: ['1', '2'], answer: 5 }] }, 'c', 2)).toThrow();
  });
  it('requires an explanation', () => {
    expect(() => normalizeGateCard({ questions: [{ q: 'a', choices: ['1', '2'], answer: 0 }] }, 'c', 2)).toThrow();
  });
});

describe('grade', () => {
  const card = {
    concept: 'c',
    explanation: 'e',
    questions: [
      { q: '1', choices: ['a', 'b'], answer: 1 },
      { q: '2', choices: ['a', 'b'], answer: 0 },
    ],
  };
  it('passes only when every answer is right', () => {
    expect(grade(card, [1, 0])).toMatchObject({ passed: true, correct: 2, missed: [] });
    expect(grade(card, [1, 1])).toMatchObject({ passed: false, correct: 1, missed: [1] });
    expect(grade(card, [null, undefined])).toMatchObject({ passed: false, missed: [0, 1] });
  });
});

describe('shuffleChoices', () => {
  it('keeps the correct answer pointing at the same text', () => {
    const card = {
      concept: 'c',
      explanation: 'e',
      questions: [{ q: '1', choices: ['right', 'w1', 'w2', 'w3'], answer: 0 }],
    };
    for (let seed = 1; seed < 20; seed++) {
      const s = shuffleChoices(card, seed);
      expect(s.questions[0]!.choices[s.questions[0]!.answer]).toBe('right');
      expect([...s.questions[0]!.choices].sort()).toEqual(['right', 'w1', 'w2', 'w3']);
    }
  });
});

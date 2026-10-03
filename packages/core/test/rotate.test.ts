import { describe, expect, it } from 'vitest';
import { rotateQuestions, variations } from '../src/rotate.ts';
import type { GateCard } from '../src/types.ts';

const card = (n: number): GateCard => ({
  concept: 'osmosis',
  explanation: 'x',
  questions: Array.from({ length: n }, (_, i) => ({
    q: `question ${i}`,
    choices: ['a', 'b', 'c', 'd'],
    answer: 0,
    why: 'because',
  })),
});

describe('rotating questions', () => {
  it('asks a different pair the next time the concept comes back', () => {
    const c = card(4);
    const first = rotateQuestions(c, 0).questions.map((q) => q.q);
    const second = rotateQuestions(c, 1).questions.map((q) => q.q);
    expect(first).not.toEqual(second);
  });

  it('walks every pair before repeating one', () => {
    const c = card(4);
    const seen = new Set<string>();
    // Four questions make six pairs.
    for (let p = 0; p < 6; p++) seen.add(rotateQuestions(c, p).questions.map((q) => q.q).sort().join('|'));
    expect(seen.size).toBe(6);
    expect(variations(c)).toBe(6);
  });

  it('comes back round rather than running out', () => {
    const c = card(4);
    expect(rotateQuestions(c, 6).questions).toEqual(rotateQuestions(c, 0).questions);
  });

  it('always asks the number it was told to', () => {
    for (const n of [2, 3, 4, 5, 6]) {
      for (let p = 0; p < 8; p++) expect(rotateQuestions(card(n), p).questions).toHaveLength(2);
    }
  });

  it('never asks the same question twice in one card', () => {
    for (const n of [3, 4, 5]) {
      for (let p = 0; p < 12; p++) {
        const qs = rotateQuestions(card(n), p).questions.map((q) => q.q);
        expect(new Set(qs).size).toBe(qs.length);
      }
    }
  });

  it('leaves a card alone when it has nothing spare', () => {
    const two = card(2);
    expect(rotateQuestions(two, 5)).toBe(two);
    expect(variations(two)).toBe(1);
  });

  it('is stable, so the same record gives the same card', () => {
    const c = card(4);
    expect(rotateQuestions(c, 3).questions).toEqual(rotateQuestions(c, 3).questions);
  });

  it('keeps everything else about the card', () => {
    const c = card(4);
    const r = rotateQuestions(c, 2);
    expect(r.concept).toBe(c.concept);
    expect(r.explanation).toBe(c.explanation);
  });

  it('handles a negative or silly pass count without throwing', () => {
    expect(() => rotateQuestions(card(4), -3)).not.toThrow();
    expect(rotateQuestions(card(4), -3).questions).toHaveLength(2);
  });
});

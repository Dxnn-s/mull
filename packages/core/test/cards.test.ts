import { describe, expect, it } from 'vitest';
import { BANK_SUBJECTS, CARDS, demoCard, pickCard } from '../src/cards.ts';
import { SUBJECT_CHIPS } from '../src/consent.ts';
import { normalizeGateCard } from '../src/gate.ts';

describe('card bank', () => {
  it('covers every subject the app offers, so nobody picks one with nothing behind it', () => {
    const missing = SUBJECT_CHIPS.filter((s) => !BANK_SUBJECTS.includes(s));
    expect(missing).toEqual([]);
  });

  it('has more than one card per subject, or the same card returns every time', () => {
    for (const subject of BANK_SUBJECTS) {
      expect(CARDS.filter((c) => c.subject === subject).length, subject).toBeGreaterThan(1);
    }
  });

  it('every card survives the same validation a model reply gets', () => {
    for (const card of CARDS) {
      expect(() => normalizeGateCard(JSON.parse(JSON.stringify(card)), card.concept, card.questions.length), card.concept).not.toThrow();
    }
  });

  it('every answer index points at a real choice, and every question has a why', () => {
    for (const card of CARDS) {
      for (const q of card.questions) {
        expect(q.choices[q.answer], `${card.concept}: ${q.q}`).toBeTruthy();
        expect(q.why, `${card.concept}: ${q.q}`).toBeTruthy();
      }
    }
  });

  it('has no duplicate concepts, which would make memory ambiguous', () => {
    const names = CARDS.map((c) => c.concept);
    expect(new Set(names).size).toBe(names.length);
  });

  it('picks only from the subjects asked for', () => {
    for (let i = 0; i < 30; i++) {
      expect(pickCard(['Physics', 'Writing'])?.subject).toMatch(/Physics|Writing/);
    }
  });

  it('prefers a concept that has not been passed yet', () => {
    const physics = CARDS.filter((c) => c.subject === 'Physics');
    const seen = Object.fromEntries(physics.slice(0, -1).map((c) => [c.concept, { passedAt: 1, passes: 1 }]));
    const last = physics[physics.length - 1]!;
    for (let i = 0; i < 20; i++) expect(pickCard(['Physics'], seen)?.concept).toBe(last.concept);
  });

  it('falls back to repeating rather than returning nothing once all are passed', () => {
    const seen = Object.fromEntries(CARDS.map((c) => [c.concept, { passedAt: 1, passes: 1 }]));
    expect(pickCard(['Physics'], seen)).not.toBeNull();
  });

  it('returns null only when it knows none of the subjects, which is when a model is needed', () => {
    expect(pickCard(['Underwater basket weaving'])).toBeNull();
    expect(pickCard([])).toBeNull();
  });

  it('looks a concept up whatever the casing', () => {
    expect(demoCard('The Chain Rule')?.subject).toBe('Calculus');
    expect(demoCard('  osmosis  ')?.subject).toBe('Biology');
    expect(demoCard('nothing like this')).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { matchConcept } from '../src/cards.ts';

/**
 * A wrong card is worse than no card here. The promise of ask mode is that the
 * lesson is about the thing you asked, so a near miss breaks it more thoroughly
 * than falling back would.
 */
describe('matching a question to a written card', () => {
  it('finds the concept named outright', () => {
    expect(matchConcept('what is the chain rule')?.concept).toBe('the chain rule');
    expect(matchConcept('explain osmosis to me')?.concept).toBe('osmosis');
    expect(matchConcept('ser vs estar??')?.concept).toBe('ser vs estar');
    expect(matchConcept('whats a p-value')?.concept).toBe('p-values');
  });

  it('ignores the filler people wrap a question in', () => {
    expect(matchConcept('hey can you help me understand kinetic energy please')?.concept).toBe('kinetic energy');
    expect(matchConcept('I do not get big O notation at all')?.concept).toBe('big O notation');
  });

  it('needs every distinctive word, so a near miss does not match', () => {
    // "rule" alone must not reach "the chain rule".
    expect(matchConcept('what is the rule of thirds')).toBeNull();
    // "energy" alone must not reach "kinetic energy".
    expect(matchConcept('where does energy come from')).toBeNull();
  });

  it('returns nothing for a question the bank cannot teach', () => {
    expect(matchConcept('write my history essay about the Ming dynasty')).toBeNull();
    expect(matchConcept('why is my python script returning None')).toBeNull();
    expect(matchConcept('')).toBeNull();
    expect(matchConcept('what how why the a an')).toBeNull();
  });

  it('prefers the longer name when two could match', () => {
    // "the mole" is named, but so is nothing else here; check it does not lose
    // to a keyword-only match elsewhere.
    expect(matchConcept('how do I use the mole in stoichiometry')?.concept).toBe('the mole');
  });
});

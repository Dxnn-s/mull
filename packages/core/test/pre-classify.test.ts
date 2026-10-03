import { describe, expect, it } from 'vitest';
import { preClassify } from '../src/pre-classify.ts';

/**
 * Two things pull against each other here and both matter.
 *
 * Real work must never be gated. That is the escape hatch that stops Mull being
 * the thing you delete on Wednesday, and it has to run with no account linked,
 * so it is rules rather than a model.
 *
 * And the rules must cost more to fake than the card costs to do. The first
 * version counted newline characters, so four taps of Enter was a skeleton key.
 */
describe('releasing real work', () => {
  it('lets a pasted code block through', () => {
    expect(preClassify('why does this return None\n\n```\ndef rev(n):\n  return n\n```')).toMatch(/code block/);
  });

  it('lets a stack trace through', () => {
    const trace = 'my script broke\nTraceback (most recent call last):\n  File "a.py", line 3, in <module>\n    main()';
    expect(preClassify(trace)).toBeTruthy();
  });

  it('lets a genuinely written multi-line question through', () => {
    const real = [
      'I am trying to prove that the sequence converges.',
      'I started by showing it is bounded above by 2.',
      'Then I tried induction to show it is increasing.',
      'The induction step is where I get stuck.',
    ].join('\n');
    expect(preClassify(real)).toMatch(/multi-line/);
  });

  it('lets a long pasted draft through', () => {
    const essay =
      'The French Revolution began for reasons that historians still argue over. ' +
      'Food shortages in the late 1780s made bread unaffordable for ordinary people in Paris, ' +
      'and the harvest failures of 1788 turned a difficult situation into a desperate one. ' +
      'At the same time the monarchy was effectively bankrupt after years of expensive wars, ' +
      'which forced Louis to call the Estates General for the first time since 1614. ' +
      'Enlightenment writing had also given educated people a vocabulary for criticising ' +
      'absolute rule, though whether that caused the revolution or merely described it afterwards ' +
      'remains contested among serious historians of the period. Here is my introduction, does it work?';
    expect(essay.length).toBeGreaterThan(600);
    expect(preClassify(essay)).toMatch(/long prompt/);
  });
});

describe('not falling for the obvious tricks', () => {
  it('does not accept four taps of Enter', () => {
    // The whole original hole: newlines were counted as characters.
    expect(preClassify('\n\n\n\nwhat is the chain rule')).toBeNull();
    expect(preClassify('what is the chain rule\n\n\n\n')).toBeNull();
  });

  it('does not accept blank lines padded with spaces', () => {
    expect(preClassify('what is osmosis\n   \n   \n   \n   ')).toBeNull();
  });

  it('does not accept four tiny fragments', () => {
    // Four lines, none of them carrying anything.
    expect(preClassify('hi\nok\nyo\nso\nwhat is a p-value')).toBeNull();
  });

  it('does not accept length made of one phrase repeated', () => {
    const padded = ('please help me please help me ').repeat(40);
    expect(padded.length).toBeGreaterThan(600);
    expect(preClassify(padded)).toBeNull();
  });

  it('does not accept a bare backtick run with nothing in it', () => {
    expect(preClassify('``` what is the chain rule')).toBeNull();
  });

  it('still gates an ordinary lazy question', () => {
    expect(preClassify('what is the chain rule')).toBeNull();
    expect(preClassify('explain osmosis')).toBeNull();
    expect(preClassify('write me a 500 word essay on WW1')).toBeNull();
  });
});

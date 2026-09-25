import { describe, expect, it } from 'vitest';
import { readIntent } from '../src/intent.ts';
import { promptHash } from '../src/stats.ts';
import type { StatsEvent } from '../src/types.ts';

const NOW = 1_700_000_000_000;
const DAY = 86_400_000;

const ev = (over: Partial<StatsEvent> = {}): StatsEvent => ({
  ts: NOW - 1000,
  site: 'app',
  verdict: 'LAZY',
  gated: true,
  outcome: 'passed',
  ...over,
});

describe('reading intent from behaviour', () => {
  it('treats an unseen concept as a first encounter, and teaches it properly', () => {
    const r = readIntent({ concept: 'osmosis', memory: {}, recent: [], now: NOW });
    expect(r.intent).toBe('first');
    expect(r.questions).toBe(2);
    expect(r.brief).toBe(false);
  });

  it('knows a concept that was passed and lost is a reminder, not a lesson', () => {
    const r = readIntent({
      concept: 'osmosis',
      memory: { osmosis: { passedAt: NOW - 9 * DAY, passes: 1 } },
      recent: [],
      now: NOW,
    });
    expect(r.intent).toBe('forgot');
    // One question is a retrieval cue. Two, for something they already learned
    // once, is just a fine.
    expect(r.questions).toBe(1);
    expect(r.brief).toBe(true);
    expect(r.why).toMatch(/9 days ago/);
  });

  it('says today rather than 0 days', () => {
    const r = readIntent({
      concept: 'osmosis',
      memory: { osmosis: { passedAt: NOW - 3_600_000, passes: 2 } },
      recent: [],
      now: NOW,
    });
    expect(r.why).toMatch(/earlier today/);
  });

  it('catches a question submitted faster than anyone could read it', () => {
    const r = readIntent({ concept: 'torque', memory: {}, recent: [], msToSubmit: 700, now: NOW });
    expect(r.intent).toBe('reflex');
    expect(r.questions).toBe(2);
  });

  it('does not call a considered answer a reflex', () => {
    const r = readIntent({ concept: 'torque', memory: {}, recent: [], msToSubmit: 12_000, now: NOW });
    expect(r.intent).toBe('first');
  });

  it('spots the same question asked again today', () => {
    const prompt = 'what is the chain rule';
    const r = readIntent({
      concept: 'the chain rule',
      prompt,
      memory: {},
      recent: [ev({ promptHash: promptHash(prompt), ts: NOW - 2 * 3_600_000 })],
      now: NOW,
    });
    expect(r.intent).toBe('grinding');
    expect(r.why).toMatch(/already today/);
  });

  it('lets the same question go a week later', () => {
    const prompt = 'what is the chain rule';
    const r = readIntent({
      concept: 'the chain rule',
      prompt,
      memory: {},
      recent: [ev({ promptHash: promptHash(prompt), ts: NOW - 7 * DAY })],
      now: NOW,
    });
    expect(r.intent).not.toBe('grinding');
  });

  it('spots three walk-aways in a row', () => {
    const r = readIntent({
      concept: 'torque',
      memory: {},
      recent: [ev({ outcome: 'skipped' }), ev({ outcome: 'cancelled' }), ev({ outcome: 'skipped' })],
      now: NOW,
    });
    expect(r.intent).toBe('grinding');
  });

  it('does not accuse someone who walked away once and came back', () => {
    const r = readIntent({
      concept: 'torque',
      memory: {},
      recent: [ev({ outcome: 'skipped' }), ev({ outcome: 'passed' }), ev({ outcome: 'passed' })],
      now: NOW,
    });
    expect(r.intent).toBe('first');
  });

  it('will not hand out an easier card for gaming the gate', () => {
    // Grinding on a concept they have passed before must not get the one
    // question reminder that 'forgot' would give them.
    const prompt = 'what is osmosis';
    const r = readIntent({
      concept: 'osmosis',
      prompt,
      memory: { osmosis: { passedAt: NOW - 9 * DAY, passes: 1 } },
      recent: [ev({ promptHash: promptHash(prompt), ts: NOW - 3_600_000 })],
      now: NOW,
    });
    expect(r.intent).toBe('grinding');
    expect(r.questions).toBe(2);
  });

  it('every read gives a reason a person could argue with', () => {
    const cases = [
      readIntent({ concept: 'x', memory: {}, recent: [], now: NOW }),
      readIntent({ concept: 'x', memory: { x: { passedAt: NOW - DAY, passes: 1 } }, recent: [], now: NOW }),
      readIntent({ concept: 'x', memory: {}, recent: [], msToSubmit: 100, now: NOW }),
    ];
    for (const r of cases) {
      expect(r.why.length).toBeGreaterThan(0);
      expect(r.why).toMatch(/\.$/);
    }
  });
});

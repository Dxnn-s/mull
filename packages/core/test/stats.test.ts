import { describe, expect, it } from 'vitest';
import { EMPTY_STATS, applyEvent, holdRate, isRemembered, listConcepts, rememberPass } from '../src/stats.ts';
import { isAllowlisted, mergeSettings, stripAllowlistPrefix } from '../src/settings.ts';
import { DEFAULT_SETTINGS } from '../src/settings.ts';

const ev = (outcome: 'passed' | 'skipped' | 'failed' | 'released', gated = true) => ({ ts: 1, site: 't', verdict: 'LAZY' as const, gated, outcome });

describe('stats reducer', () => {
  it('tracks streaks and hold rate', () => {
    let s = EMPTY_STATS;
    s = applyEvent(s, ev('passed'));
    s = applyEvent(s, ev('passed'));
    s = applyEvent(s, ev('skipped'));
    s = applyEvent(s, ev('passed'));
    expect(s).toMatchObject({ total: 4, gated: 4, passed: 3, skipped: 1, streak: 1, bestStreak: 2 });
    expect(holdRate(s)).toBeCloseTo(0.75);
  });
  it('caps recent at 200', () => {
    let s = EMPTY_STATS;
    for (let i = 0; i < 250; i++) s = applyEvent(s, ev('released', false));
    expect(s.recent).toHaveLength(200);
    expect(s.total).toBe(250);
  });
});

describe('concept memory', () => {
  it('remembers within the window and forgets after', () => {
    const m = rememberPass({}, '  The Chain Rule ', 1000);
    expect(isRemembered(m, 'the chain rule', 7, 1000 + 6 * 86_400_000)).toBe(true);
    expect(isRemembered(m, 'the chain rule', 7, 1000 + 8 * 86_400_000)).toBe(false);
    expect(isRemembered(m, 'the chain rule', 0, 1001)).toBe(false);
    expect(listConcepts(m)[0]).toMatchObject({ concept: 'the chain rule', passes: 1 });
  });
});

describe('allowlist', () => {
  it('prefix entries match the start, others match anywhere', () => {
    expect(isAllowlisted('work: what is x', ['work:'])).toBe(true);
    expect(isAllowlisted('what is work: x', ['work:'])).toBe(false);
    expect(isAllowlisted('fix my regex please', ['regex'])).toBe(true);
    expect(isAllowlisted('', [])).toBe(true);
  });
  it('strips only prefix entries', () => {
    expect(stripAllowlistPrefix('  WORK: hello', ['work:'])).toBe('hello');
    expect(stripAllowlistPrefix('regex hello', ['regex'])).toBe('regex hello');
  });
});

describe('mergeSettings', () => {
  it('fills defaults and tolerates partial nested objects', () => {
    const s = mergeSettings({ sites: { chatgpt: false } as never, subjects: 'bad' as never });
    expect(s.sites).toEqual({ chatgpt: false, claude: true, gemini: true });
    expect(s.subjects).toEqual([]);
    expect(s.hardMode).toEqual(DEFAULT_SETTINGS.hardMode);
  });
});

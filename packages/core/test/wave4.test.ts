import { describe, expect, it } from 'vitest';
import { EXAM_WEEK, SCHOOL_NIGHTS, hardModeUntil, isHardModeNow } from '../src/schedule.ts';
import { buildRecap, weekStart } from '../src/recap.ts';
import { needsConsent } from '../src/consent.ts';
import { DEAD_KEY_FAILURES, normalizeHealth } from '../src/types.ts';
import { EMPTY_STATS } from '../src/stats.ts';
import { mergeSettings } from '../src/settings.ts';
import { createProvider } from '../src/index.ts';

const at = (dow: number, hh: number, mm = 0) => {
  // 2026-09-06 is a Sunday.
  const d = new Date(2026, 8, 6 + dow, hh, mm, 0, 0);
  return d;
};
const hm = (schedule: typeof EXAM_WEEK | null, enabled = true) => ({ hardMode: { enabled, blockMinutes: 10, failsBeforeBlock: 2, schedule } });

describe('study hours', () => {
  it('master switch off means never', () => {
    expect(isHardModeNow(hm(EXAM_WEEK, false), at(1, 20))).toBe(false);
  });
  it('no schedule means always', () => {
    expect(isHardModeNow(hm(null), at(6, 3))).toBe(true);
    expect(hardModeUntil(hm(null), at(6, 3))).toBe('always');
  });
  it('school nights: Mon-Thu 7-11 pm', () => {
    expect(isHardModeNow(hm(SCHOOL_NIGHTS), at(1, 19, 0))).toBe(true);
    expect(isHardModeNow(hm(SCHOOL_NIGHTS), at(1, 18, 59))).toBe(false);
    expect(isHardModeNow(hm(SCHOOL_NIGHTS), at(1, 23, 0))).toBe(true);
    expect(isHardModeNow(hm(SCHOOL_NIGHTS), at(1, 23, 1))).toBe(false);
    expect(isHardModeNow(hm(SCHOOL_NIGHTS), at(5, 20))).toBe(false);
    expect(hardModeUntil(hm(SCHOOL_NIGHTS), at(2, 20))).toBe('until 11:00 pm');
  });
  it('a window across midnight', () => {
    const late = { days: [5], start: '22:00', end: '02:00' };
    expect(isHardModeNow(hm(late), at(5, 23))).toBe(true);
    expect(isHardModeNow(hm(late), at(6, 1))).toBe(true);
    expect(isHardModeNow(hm(late), at(6, 3))).toBe(false);
    expect(isHardModeNow(hm(late), at(4, 23))).toBe(false);
  });
  it('exam week is every hour of every day', () => {
    expect(isHardModeNow(hm(EXAM_WEEK), at(0, 0, 0))).toBe(true);
    expect(isHardModeNow(hm(EXAM_WEEK), at(6, 23, 59))).toBe(true);
  });
  it('old settings without a schedule still merge', () => {
    const s = mergeSettings({ hardMode: { enabled: true, blockMinutes: 5, failsBeforeBlock: 1 } } as never);
    expect(s.hardMode.schedule).toBeNull();
    expect(isHardModeNow(s)).toBe(true);
  });
});

describe('monday recap', () => {
  it('weekStart lands on Monday 00:00', () => {
    const ws = weekStart(at(3, 15));
    expect(ws.getDay()).toBe(1);
    expect(ws.getHours()).toBe(0);
  });
  it('builds the paste-able line from this week only', () => {
    const start = weekStart(at(3, 15));
    const t = (dayOffset: number) => start.getTime() + dayOffset * 86_400_000 + 3600_000;
    const stats = {
      ...EMPTY_STATS,
      recent: [
        { ts: t(-3), site: 'web', verdict: 'LAZY' as const, gated: true, outcome: 'passed' as const, concept: 'old' },
        { ts: t(0), site: 'web', verdict: 'LAZY' as const, gated: true, outcome: 'passed' as const, concept: 'chain rule' },
        { ts: t(1), site: 'web', verdict: 'LAZY' as const, gated: true, outcome: 'passed' as const, concept: 'p-value' },
        { ts: t(1), site: 'web', verdict: 'LAZY' as const, gated: true, outcome: 'skipped' as const },
        { ts: t(2), site: 'web', verdict: 'LEGIT' as const, gated: false, outcome: 'released' as const },
      ],
    };
    const memory = { 'chain rule': { passedAt: t(0), passes: 1 }, 'p-value': { passedAt: t(1), passes: 1 }, old: { passedAt: t(-3), passes: 1 } };
    const text = buildRecap(stats, memory, start, at(3, 15));
    expect(text).toMatch(/^Mull, week of /);
    expect(text).toContain('4 prompts, 3 gated, held 2 of 3 (67%)');
    expect(text).toContain('Concepts learned: chain rule, p-value.');
    expect(text).not.toContain('old');
    expect(text).toContain('Longest streak 2.');
  });
  it('is honest when nothing happened', () => {
    expect(buildRecap(EMPTY_STATS, {}, weekStart(at(2, 12)), at(2, 12))).toContain('0 prompts, 0 gated. Concepts learned: none yet.');
  });
});

describe('consent and dead key', () => {
  it('a fresh install needs consent; a key, a history, or an agreement clears it', () => {
    expect(needsConsent({ consentedAt: undefined, apiKey: '', provider: 'mock' }, { total: 0 })).toBe(true);
    expect(needsConsent({ consentedAt: undefined, apiKey: 'sk', provider: 'openai' }, { total: 0 })).toBe(false);
    expect(needsConsent({ consentedAt: undefined, apiKey: '', provider: 'mock' }, { total: 5 })).toBe(false);
    expect(needsConsent({ consentedAt: 1, apiKey: '', provider: 'mock' }, { total: 0 })).toBe(false);
  });
  it('health normalizes and the broken mock throws', async () => {
    expect(normalizeHealth(null)).toEqual({ sites: {}, keyFailures: 0 });
    expect(normalizeHealth({ keyFailures: 2 }).sites).toEqual({});
    expect(DEAD_KEY_FAILURES).toBe(3);
    const p = createProvider({ provider: 'mock', apiKey: '', model: 'broken' });
    await expect(p.complete({ system: 's', user: 'u' })).rejects.toThrow(/bad key/);
  });
});

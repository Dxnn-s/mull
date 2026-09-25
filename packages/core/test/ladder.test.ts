import { describe, expect, it } from 'vitest';
import { TOP_RUNG, dueAt, intervalDays, isResting, rememberMiss, strength } from '../src/ladder.ts';
import { rememberPass } from '../src/stats.ts';

const NOW = 1_700_000_000_000;
const DAY = 86_400_000;

describe('the ladder', () => {
  it('stretches the interval as a concept is held', () => {
    const seen = [1, 2, 3, 4, 5].map(intervalDays);
    expect(seen).toEqual([1, 3, 7, 16, 35]);
    // Each rung is longer than the one below it. That is the whole idea.
    for (let i = 1; i < seen.length; i++) expect(seen[i]!).toBeGreaterThan(seen[i - 1]!);
  });

  it('does not keep growing past the top rung', () => {
    expect(intervalDays(20)).toBe(intervalDays(TOP_RUNG));
  });

  it('never rests something that has not been passed', () => {
    expect(intervalDays(0)).toBe(0);
    expect(dueAt({}, 'osmosis')).toBe(0);
    expect(isResting({}, 'osmosis', NOW)).toBe(false);
  });

  it('rests a new pass for a day, and a well held one for weeks', () => {
    const fresh = { osmosis: { passedAt: NOW, passes: 1 } };
    expect(isResting(fresh, 'osmosis', NOW + 12 * 3_600_000)).toBe(true);
    expect(isResting(fresh, 'osmosis', NOW + 2 * DAY)).toBe(false);

    const held = { osmosis: { passedAt: NOW, passes: 5 } };
    expect(isResting(held, 'osmosis', NOW + 30 * DAY)).toBe(true);
    expect(isResting(held, 'osmosis', NOW + 36 * DAY)).toBe(false);
  });

  it('passing again buys more rest than the pass before it', () => {
    let m = rememberPass({}, 'osmosis', NOW);
    const first = dueAt(m, 'osmosis') - NOW;
    m = rememberPass(m, 'osmosis', NOW);
    const second = dueAt(m, 'osmosis') - NOW;
    expect(second).toBeGreaterThan(first);
  });

  it('a miss drops one rung, not the whole history', () => {
    const m = { osmosis: { passedAt: NOW - 40 * DAY, passes: 4 } };
    const after = rememberMiss(m, 'osmosis', NOW);
    expect(after.osmosis!.passes).toBe(3);
    // And it comes back sooner than it would have.
    expect(dueAt(after, 'osmosis')).toBeLessThan(NOW + intervalDays(4) * DAY);
  });

  it('a miss cannot push the count below zero', () => {
    const after = rememberMiss({ osmosis: { passedAt: NOW, passes: 0 } }, 'osmosis', NOW);
    expect(after.osmosis!.passes).toBe(0);
  });

  it('ignores a miss on something never learned', () => {
    const m = {};
    expect(rememberMiss(m, 'osmosis', NOW)).toBe(m);
  });

  it('forgetting brings a concept back sooner, which is the point', () => {
    const held = { osmosis: { passedAt: NOW, passes: 4 } };
    const dropped = rememberMiss(held, 'osmosis', NOW);
    expect(dueAt(dropped, 'osmosis') - NOW).toBeLessThan(dueAt(held, 'osmosis') - NOW);
  });

  it('reports what is held rather than how long you sat there', () => {
    const m = {
      osmosis: { passedAt: NOW, passes: 5 },
      torque: { passedAt: NOW, passes: 1 },
      'p-values': { passedAt: NOW - 40 * DAY, passes: 2 },
    };
    const s = strength(m, NOW);
    expect(s.total).toBe(3);
    expect(s.holding).toBe(2);
    expect(s.due).toBe(1);
    expect(s.solid).toBe(1);
  });
});

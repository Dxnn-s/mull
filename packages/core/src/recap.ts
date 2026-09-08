import type { ConceptMemory, Stats } from './types.ts';
import { listConcepts } from './stats.ts';

/** Monday 00:00 local of the week containing `d`. */
export function weekStart(d: Date = new Date()): Date {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  const back = (s.getDay() + 6) % 7;
  s.setDate(s.getDate() - back);
  return s;
}

/**
 * Plain text a student can paste into a group chat. No canvas, no server.
 * Covers the seven days starting at `start` (default: this week so far).
 */
export function buildRecap(stats: Stats, memory: ConceptMemory, start: Date = weekStart(), now: Date = new Date()): string {
  const from = start.getTime();
  const to = Math.min(now.getTime(), from + 7 * 86_400_000);
  const evs = stats.recent.filter((e) => e.ts >= from && e.ts < to);
  const gated = evs.filter((e) => e.gated).length;
  const passed = evs.filter((e) => e.outcome === 'passed').length;
  const skipped = evs.filter((e) => e.outcome === 'skipped').length;
  const cancelled = evs.filter((e) => e.outcome === 'cancelled').length;
  const decided = passed + skipped + cancelled;
  const held = decided === 0 ? '' : `, held ${passed} of ${decided} (${Math.round((100 * passed) / decided)}%)`;
  const learned = listConcepts(memory)
    .filter((c) => c.passedAt >= from && c.passedAt < to)
    .sort((a, b) => a.passedAt - b.passedAt)
    .map((c) => c.concept);
  let streak = 0;
  let best = 0;
  for (const e of evs) {
    if (e.outcome === 'passed') best = Math.max(best, ++streak);
    else if (e.outcome === 'skipped' || e.outcome === 'cancelled') streak = 0;
  }
  const date = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const lines = [`Mull, week of ${date}. ${evs.length} prompt${evs.length === 1 ? '' : 's'}, ${gated} gated${held}.`];
  lines.push(learned.length ? `Concepts learned: ${learned.join(', ')}.` : 'Concepts learned: none yet.');
  if (best > 0) lines.push(`Longest streak ${best}.`);
  return lines.join(' ');
}

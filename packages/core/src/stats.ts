import type { ConceptMemory, Correction, Stats, StatsEvent } from './types.ts';

export const EMPTY_STATS: Stats = {
  total: 0,
  gated: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  cancelled: 0,
  blocked: 0,
  allowlisted: 0,
  remembered: 0,
  streak: 0,
  bestStreak: 0,
  recent: [],
  corrections: [],
};

const RECENT_CAP = 200;

/** Pure reducer. Storage layers persist the result. */
export function applyEvent(stats: Stats, ev: StatsEvent): Stats {
  const next: Stats = { ...stats, recent: [...stats.recent, ev].slice(-RECENT_CAP) };
  next.total += 1;
  if (ev.gated) next.gated += 1;
  switch (ev.outcome) {
    case 'passed':
      next.passed += 1;
      next.streak += 1;
      next.bestStreak = Math.max(next.bestStreak, next.streak);
      break;
    case 'failed':
      next.failed += 1;
      break;
    case 'skipped':
      next.skipped += 1;
      next.streak = 0;
      break;
    case 'cancelled':
      next.cancelled += 1;
      next.streak = 0;
      break;
    case 'blocked':
      next.blocked += 1;
      break;
    case 'allowlisted':
      next.allowlisted += 1;
      break;
    case 'remembered':
      next.remembered += 1;
      break;
    case 'released':
      break;
  }
  return next;
}

export function addCorrection(stats: Stats, c: Correction): Stats {
  return { ...stats, corrections: [...stats.corrections, c].slice(-RECENT_CAP) };
}

export function normalizeStats(s: Partial<Stats> | null | undefined): Stats {
  return {
    ...EMPTY_STATS,
    ...(s ?? {}),
    recent: Array.isArray(s?.recent) ? s.recent : [],
    corrections: Array.isArray(s?.corrections) ? s.corrections : [],
  };
}

/** ScreenZen-style "how often did the gate hold". Skips and cancels both count as not holding. */
export function holdRate(stats: Stats): number {
  const decided = stats.passed + stats.skipped + stats.cancelled;
  return decided === 0 ? 0 : stats.passed / decided;
}

/** Median time a card was on screen before pass, fail, skip, or cancel. 0 when nothing is recorded. */
export function medianCardMs(stats: Stats): number {
  const times = stats.recent.map((e) => e.ms).filter((m): m is number => typeof m === 'number' && m > 0).sort((a, b) => a - b);
  if (!times.length) return 0;
  const mid = Math.floor(times.length / 2);
  return times.length % 2 ? times[mid]! : Math.round((times[mid - 1]! + times[mid]!) / 2);
}

export function conceptKey(concept: string): string {
  return concept.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function rememberPass(memory: ConceptMemory, concept: string, now = Date.now()): ConceptMemory {
  const key = conceptKey(concept);
  const prev = memory[key];
  return { ...memory, [key]: { passedAt: now, passes: (prev?.passes ?? 0) + 1 } };
}

export function isRemembered(memory: ConceptMemory, concept: string, days: number, now = Date.now()): boolean {
  if (days <= 0) return false;
  const entry = memory[conceptKey(concept)];
  if (!entry) return false;
  return now - entry.passedAt < days * 24 * 60 * 60 * 1000;
}

/** Concepts sorted by most recent pass, for the dashboard. */
export function listConcepts(memory: ConceptMemory): Array<{ concept: string; passedAt: number; passes: number }> {
  return Object.entries(memory)
    .map(([concept, v]) => ({ concept, ...v }))
    .sort((a, b) => b.passedAt - a.passedAt);
}

/** djb2 over the trimmed, lowercased prompt. Recognizable, not reversible. */
export function promptHash(prompt: string): string {
  const s = prompt.trim().toLowerCase();
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, '0');
}

import type { ConceptMemory, Stats, StatsEvent } from './types.ts';

export const EMPTY_STATS: Stats = {
  total: 0,
  gated: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  blocked: 0,
  allowlisted: 0,
  remembered: 0,
  streak: 0,
  bestStreak: 0,
  recent: [],
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

export function normalizeStats(s: Partial<Stats> | null | undefined): Stats {
  return { ...EMPTY_STATS, ...(s ?? {}), recent: Array.isArray(s?.recent) ? s.recent : [] };
}

/** ScreenZen-style "how often did the gate hold". */
export function holdRate(stats: Stats): number {
  const decided = stats.passed + stats.skipped;
  return decided === 0 ? 0 : stats.passed / decided;
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

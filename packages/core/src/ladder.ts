import type { ConceptMemory } from './types.ts';
import { conceptKey } from './stats.ts';

/**
 * Progressive overload for remembering things.
 *
 * The first version rested every concept for a flat number of days, whether you
 * had passed it once or ten times. Passing more bought you nothing, and
 * forgetting cost you nothing. That is a toll schedule: the same fee every time,
 * regardless of what you can actually do.
 *
 * A gym works the other way round. Hold a thing and the interval stretches, so
 * you spend your attention on what is weak. Drop it and the interval collapses,
 * because forgetting is the signal that you needed it sooner, not later. The
 * rungs below expand roughly twofold, which is the shape spaced repetition has
 * settled on across decades of it being studied.
 *
 * Nothing migrates. The rung is derived from the pass count that ConceptMemory
 * already stores, so an existing record just starts behaving better.
 */
const RUNGS_DAYS = [1, 3, 7, 16, 35];

/** How long a concept rests after this many clean passes. */
export function intervalDays(passes: number): number {
  if (passes <= 0) return 0;
  return RUNGS_DAYS[Math.min(passes, RUNGS_DAYS.length) - 1]!;
}

/** The top rung, for anything that wants to show progress out of a total. */
export const TOP_RUNG = RUNGS_DAYS.length;

/** When this concept is next worth asking about. 0 when it has never been passed. */
export function dueAt(memory: ConceptMemory, concept: string): number {
  const e = memory[conceptKey(concept)];
  if (!e || e.passes <= 0) return 0;
  return e.passedAt + intervalDays(e.passes) * 86_400_000;
}

/** Resting means held recently enough that asking again would be busywork. */
export function isResting(memory: ConceptMemory, concept: string, now = Date.now()): boolean {
  const due = dueAt(memory, concept);
  return due > 0 && now < due;
}

/**
 * Missed it. Fall one rung rather than back to the floor: one bad rep does not
 * mean you never knew it, and resetting to zero punishes a whole history for a
 * single evening. passedAt moves to now so the shorter interval starts running
 * from here.
 */
export function rememberMiss(memory: ConceptMemory, concept: string, now = Date.now()): ConceptMemory {
  const key = conceptKey(concept);
  const prev = memory[key];
  if (!prev) return memory;
  return { ...memory, [key]: { passedAt: now, passes: Math.max(0, prev.passes - 1) } };
}

/**
 * What the record should show. Not minutes survived, which measures obedience,
 * but how much you are actually holding, which is the thing that got better.
 */
export function strength(memory: ConceptMemory, now = Date.now()): {
  holding: number;
  due: number;
  total: number;
  /** Concepts at the top rung: held across more than a month. */
  solid: number;
} {
  const all = Object.values(memory);
  let holding = 0;
  let due = 0;
  let solid = 0;
  for (const [concept, e] of Object.entries(memory)) {
    if (e.passes <= 0) continue;
    if (isResting(memory, concept, now)) holding += 1;
    else due += 1;
    if (e.passes >= TOP_RUNG) solid += 1;
  }
  return { holding, due, total: all.length, solid };
}

/**
 * Guilloché: the engine-turned engraving on banknotes, share certificates and
 * watch dials. A rose engine cuts one continuous line while the work rotates and
 * the cutter rocks, so the line crosses its own previous turns and the crossings
 * make the tone. Same idea here: one spiral whose radius carries a sine, drawn
 * dense enough that adjacent turns interleave.
 *
 * One path element, no fill, no gradient, no shader. Deterministic, so the same
 * record always draws the same seal.
 */

export interface RosetteParams {
  /** Radius where the engraving starts. Leave the middle clear for the numerals. */
  rInner: number;
  /** Radius where it ends. */
  rOuter: number;
  /** How many times the line goes around. Density. */
  turns: number;
  /** Lobes per revolution. Fractional values precess and look richer. */
  petals: number;
  /**
   * Wave height as a multiple of the pitch between turns. Below 1 the turns never
   * touch and it reads as a plain spiral; around 1.4 to 2.2 they cross and the
   * interference appears. Above 3 it goes to mush.
   */
  amplitude: number;
  /** Radians. Rotates the whole figure. */
  phase?: number;
  /** Points per revolution. 120 is smooth at phone sizes. */
  resolution?: number;
}

export interface Seal {
  /** What the pattern is derived from, so the same record redraws the same seal. */
  concepts: number;
  streak: number;
}

/** Builds the SVG `d` string for one continuous engraved spiral. */
export function rosettePath(cx: number, cy: number, p: RosetteParams): string {
  const res = p.resolution ?? 120;
  const steps = Math.max(2, Math.round(p.turns * res));
  const band = p.rOuter - p.rInner;
  const pitch = band / p.turns;
  const amp = pitch * p.amplitude;
  const phase = p.phase ?? 0;

  const out: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const theta = t * p.turns * Math.PI * 2;
    const r = p.rInner + band * t + amp * Math.sin(p.petals * theta + phase);
    const x = cx + r * Math.cos(theta);
    const y = cy + r * Math.sin(theta);
    out.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return out.join('');
}

/**
 * The seal grows with the record. Petals come from concepts learned so the figure
 * gains lobes as you cover ground; amplitude comes from the streak so a run of
 * passes deepens the cut. Both are clamped, because past a point more is mush.
 */
export function paramsForSeal(seal: Seal, rInner: number, rOuter: number): RosetteParams {
  const concepts = Math.max(0, seal.concepts);
  const streak = Math.max(0, seal.streak);
  return {
    rInner,
    rOuter,
    turns: 30,
    // 6 lobes at zero, one more per two concepts, capped at 22. The .5 keeps it
    // precessing so the figure never closes into a plain flower.
    petals: Math.min(22, 6 + Math.floor(concepts / 2)) + 0.5,
    amplitude: Math.min(2.4, 1.3 + streak * 0.08),
  };
}

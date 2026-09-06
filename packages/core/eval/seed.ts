import { readFileSync } from 'node:fs';
import type { Verdict } from '../src/types.ts';

export interface LabeledPrompt {
  id: number;
  prompt: string;
  label: Verdict;
  note: string;
  part: 'A' | 'B';
}

/**
 * Reads Brain/projects/mull/data/prompt-labels-seed.md. Each row:
 * | # | Prompt | Label | Note |
 */
export function loadSeed(path: string): LabeledPrompt[] {
  const text = readFileSync(path, 'utf8');
  const out: LabeledPrompt[] = [];
  let part: 'A' | 'B' = 'A';
  for (const line of text.split(/\r?\n/)) {
    if (/^## Part B/.test(line)) part = 'B';
    const m = line.match(/^\|\s*(\d+)\s*\|\s*(.*?)\s*\|\s*(LAZY|LEGIT|EDGE)\s*\|\s*(.*?)\s*\|\s*$/);
    if (!m) continue;
    out.push({ id: Number(m[1]), prompt: unescapePipes(m[2]!), label: m[3] as Verdict, note: m[4]!, part });
  }
  return out;
}

function unescapePipes(s: string): string {
  return s.replace(/\\\|/g, '|');
}

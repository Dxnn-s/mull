/**
 * Classifier eval against the labeled seed set.
 *
 *   pnpm --filter @mull/core eval                 # provider from env (see below)
 *   MULL_EVAL_PROVIDER=claude-cli pnpm eval       # local claude CLI, no key
 *   ANTHROPIC_API_KEY=... MULL_EVAL_PROVIDER=anthropic pnpm eval
 *   MULL_EVAL_PROVIDER=mock pnpm eval             # keyword rules, sanity only
 *
 * Reports precision/recall per label and the two numbers that matter for the
 * product: LEGIT prompts wrongly gated (must be ~0) and LAZY prompts gated (want high).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { classify, shouldGate } from '../src/classify.ts';
import { MockProvider } from '../src/providers/mock.ts';
import { AnthropicProvider } from '../src/providers/anthropic.ts';
import { OpenAIProvider } from '../src/providers/openai.ts';
import { GeminiProvider } from '../src/providers/gemini.ts';
import type { Provider, Strictness, Verdict } from '../src/types.ts';
import { ClaudeCliProvider } from './claude-cli.ts';
import { loadSeed, type LabeledPrompt } from './seed.ts';

const SEED = process.env.MULL_SEED ?? resolve(process.env.USERPROFILE ?? process.env.HOME ?? '.', 'Brain/projects/mull/data/prompt-labels-seed.md');
const STRICTNESS = (process.env.MULL_STRICTNESS ?? 'normal') as Strictness;
const CONCURRENCY = Number(process.env.MULL_CONCURRENCY ?? 4);

function pickProvider(): Provider {
  const which = process.env.MULL_EVAL_PROVIDER ?? (process.env.ANTHROPIC_API_KEY ? 'anthropic' : 'claude-cli');
  switch (which) {
    case 'anthropic':
      return new AnthropicProvider(process.env.ANTHROPIC_API_KEY ?? '', process.env.MULL_MODEL || undefined);
    case 'openai':
      return new OpenAIProvider(process.env.OPENAI_API_KEY ?? '', process.env.MULL_MODEL || undefined);
    case 'gemini':
      return new GeminiProvider(process.env.GEMINI_API_KEY ?? '', process.env.MULL_MODEL || undefined);
    case 'claude-cli':
      return new ClaudeCliProvider(process.env.MULL_MODEL || 'haiku');
    case 'mock':
      return new MockProvider();
    default:
      throw new Error(`unknown MULL_EVAL_PROVIDER ${which}`);
  }
}

interface Row extends LabeledPrompt {
  predicted: Verdict | 'ERROR';
  confidence: number;
  concept: string | null;
  gated: boolean;
  reason: string;
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]!);
      }
    }),
  );
  return out;
}

async function main() {
  const seed = loadSeed(SEED);
  const provider = pickProvider();
  console.log(`eval: ${seed.length} prompts, provider=${provider.id}, strictness=${STRICTNESS}`);

  const rows = await mapLimit(seed, CONCURRENCY, async (item): Promise<Row> => {
    try {
      const c = await classify(item.prompt, { subjects: [], strictness: STRICTNESS }, provider);
      process.stdout.write('.');
      return { ...item, predicted: c.verdict, confidence: c.confidence, concept: c.concept, gated: shouldGate(c, STRICTNESS) && !!c.concept, reason: c.reason };
    } catch (err) {
      process.stdout.write('x');
      return { ...item, predicted: 'ERROR', confidence: 0, concept: null, gated: false, reason: String(err).slice(0, 120) };
    }
  });
  console.log('\n');

  const labels: Verdict[] = ['LAZY', 'LEGIT', 'EDGE'];
  const matrix: Record<string, Record<string, number>> = {};
  for (const a of labels) {
    matrix[a] = {};
    for (const b of [...labels, 'ERROR']) matrix[a]![b] = 0;
  }
  for (const r of rows) matrix[r.label]![r.predicted]! += 1;

  console.log('confusion (rows = truth, cols = predicted)');
  console.log('         ' + [...labels, 'ERROR'].map((l) => l.padStart(7)).join(''));
  for (const a of labels) console.log(a.padEnd(9) + [...labels, 'ERROR'].map((b) => String(matrix[a]![b]).padStart(7)).join(''));

  const legitGated = rows.filter((r) => r.label === 'LEGIT' && r.gated);
  const lazyGated = rows.filter((r) => r.label === 'LAZY' && r.gated);
  const lazyTotal = rows.filter((r) => r.label === 'LAZY').length;
  const legitTotal = rows.filter((r) => r.label === 'LEGIT').length;
  const exact = rows.filter((r) => r.label === r.predicted).length;

  console.log('');
  console.log(`exact label match : ${exact}/${rows.length} (${pct(exact, rows.length)})`);
  console.log(`LEGIT wrongly gated: ${legitGated.length}/${legitTotal} (${pct(legitGated.length, legitTotal)})  <- must be ~0`);
  console.log(`LAZY gated         : ${lazyGated.length}/${lazyTotal} (${pct(lazyGated.length, lazyTotal)})  <- want high`);
  console.log(`errors             : ${rows.filter((r) => r.predicted === 'ERROR').length}`);

  const misses = rows.filter((r) => r.label !== r.predicted);
  if (misses.length) {
    console.log('\nmisses:');
    for (const r of misses) console.log(`  #${r.id} ${r.label}->${r.predicted} (${r.confidence.toFixed(2)}${r.gated ? ', GATED' : ''}) ${r.prompt.slice(0, 70)} | ${r.reason.slice(0, 80)}`);
  }

  const outDir = resolve(import.meta.dirname, '../eval-results');
  mkdirSync(outDir, { recursive: true });
  const file = resolve(outDir, `${new Date().toISOString().replace(/[:.]/g, '-')}-${provider.id}-${STRICTNESS}.json`);
  writeFileSync(file, JSON.stringify({ provider: provider.id, strictness: STRICTNESS, rows, matrix }, null, 2));
  console.log(`\nwrote ${file}`);
}

function pct(a: number, b: number): string {
  return b === 0 ? 'n/a' : `${((100 * a) / b).toFixed(0)}%`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

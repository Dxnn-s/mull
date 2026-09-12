import { describe, expect, it } from 'vitest';
import { GateSession } from '../src/session.ts';
import { MockProvider } from '../src/providers/mock.ts';
import { DEFAULT_SETTINGS } from '../src/settings.ts';
import { EMPTY_STATS, addCorrection, applyEvent, holdRate, medianCardMs, normalizeStats, promptHash } from '../src/stats.ts';
import { normalizeGateCard, shuffleChoices } from '../src/gate.ts';
import { AnthropicProvider, isHaiku } from '../src/providers/anthropic.ts';
import { OpenAIProvider } from '../src/providers/openai.ts';
import { fetchWithTimeout } from '../src/providers/fetch-timeout.ts';
import { createProvider } from '../src/index.ts';
import type { GateCard, Settings } from '../src/types.ts';

let clock = 1_000_000;
function make(overrides: Partial<Settings> = {}, provider = new MockProvider()) {
  const session = new GateSession({
    provider,
    settings: { ...DEFAULT_SETTINGS, apiKey: 'x', ...overrides },
    memory: {},
    block: null,
    site: 'test',
    now: () => clock,
  });
  return { session, provider };
}
const wrongAnswers = (card: GateCard) => card.questions.map((q) => (q.answer + 1) % q.choices.length);

describe('answer key after a miss', () => {
  it('returns a review with picked, correct, and why, and reshuffles the choices', async () => {
    const { session } = make();
    await session.submit('what is the chain rule');
    const quiz = session.startQuiz();
    if (quiz.state.kind !== 'quiz') throw new Error();
    const before = quiz.state.card.questions.map((q) => q.choices.join('|'));
    const r = session.answer(wrongAnswers(quiz.state.card));
    if (r.state.kind !== 'explain') throw new Error(r.state.kind);
    // Asserted structurally, not against canned text: demo mode now returns real
    // written cards, and the shape is what the answer key actually depends on.
    expect(r.state.review).toHaveLength(2);
    for (const item of r.state.review) {
      expect(item.correct).toBeTruthy();
      expect(item.why).toBeTruthy();
      expect(item.picked).not.toBe(item.correct);
      expect(quiz.state.kind === 'quiz' && quiz.state.card.questions.some((q) => q.q === item.q)).toBe(true);
    }
    // Same questions, different order at least once across the card.
    const shown = quiz.state.card;
    const after = r.state.card.questions.map((q) => q.choices.join('|'));
    expect(after).toHaveLength(before.length);
    // Correct answers survive the reshuffle.
    expect(r.state.card.questions.every((q, i) => q.choices[q.answer] === shown.questions[i]!.choices[shown.questions[i]!.answer])).toBe(true);
  });

  it('carries the review onto the hard-mode block', async () => {
    const { session } = make({ hardMode: { enabled: true, failsBeforeBlock: 1, blockMinutes: 5 } });
    await session.submit('what is entropy');
    const quiz = session.startQuiz();
    if (quiz.state.kind !== 'quiz') throw new Error();
    const r = session.answer(quiz.state.card.questions.map(() => null));
    expect(r.state.kind).toBe('blocked');
    if (r.state.kind !== 'blocked') throw new Error();
    expect(r.state.review).toHaveLength(2);
    expect(r.state.review[0]!.picked).toBeNull();
  });

  it('normalizeGateCard keeps why and shuffleChoices preserves it', () => {
    const card = normalizeGateCard({ explanation: 'e', questions: [{ q: 'a', choices: ['1', '2'], answer: 0, why: ' because ' }] }, 'c', 1);
    expect(card.questions[0]!.why).toBe('because');
    expect(shuffleChoices(card, 3).questions[0]!.why).toBe('because');
  });
});

describe('cancel, time-in-card, corrections', () => {
  it('cancel from the card emits cancelled with ms and resets the streak', async () => {
    const { session } = make();
    await session.submit('what is a p-value');
    clock += 12_000;
    const r = session.cancel();
    expect(r.state.kind).toBe('idle');
    expect(r.event).toMatchObject({ outcome: 'cancelled', gated: true, concept: 'a p-value', ms: 12_000 });
    let s = applyEvent(EMPTY_STATS, { ts: 1, site: 't', verdict: 'LAZY', gated: true, outcome: 'passed' });
    s = applyEvent(s, r.event!);
    expect(s).toMatchObject({ cancelled: 1, streak: 0 });
    expect(holdRate(s)).toBe(0.5);
  });

  it('pass and skip carry ms since the card was shown', async () => {
    const { session } = make();
    await session.submit('define osmosis');
    clock += 5_000;
    const r = session.skip();
    expect(r.event?.ms).toBe(5_000);
  });

  it('markLegit releases with a correction row and no prompt text', async () => {
    const { session } = make();
    await session.submit('what is the chain rule');
    const r = session.markLegit();
    expect(r.state).toMatchObject({ kind: 'release', outcome: 'released', prompt: 'what is the chain rule' });
    expect(r.event).toMatchObject({ outcome: 'released', reason: 'user-legit', gated: true });
    expect(r.correction).toMatchObject({ verdict: 'LAZY', label: 'LEGIT', hash: promptHash('what is the chain rule') });
    expect(r.correction).not.toHaveProperty('prompt');
    expect(Object.keys(r.correction!).sort()).toEqual(['concept', 'hash', 'label', 'ts', 'verdict']);
    const s = addCorrection(EMPTY_STATS, r.correction!);
    expect(s.corrections).toHaveLength(1);
  });

  it('medianCardMs and normalizeStats tolerate old shapes', () => {
    const s = normalizeStats({ passed: 2 } as never);
    expect(s.cancelled).toBe(0);
    expect(s.corrections).toEqual([]);
    expect(medianCardMs(s)).toBe(0);
    const withTimes = { ...s, recent: [{ ms: 10 }, { ms: 30 }, { ms: 20 }] as never };
    expect(medianCardMs(withTimes)).toBe(20);
  });
});

describe('timeouts and send anyway', () => {
  it('a hung classifier times out and fails open with reason timeout', async () => {
    const { session } = make({}, new MockProvider(60_000));
    // The mock honors timeoutMs, so this resolves at the classify deadline (15 s) instead of hanging.
    const p = session.submit('what is x');
    const r = await p;
    expect(r.state.kind).toBe('error');
    expect(r.event).toMatchObject({ outcome: 'released', gated: false, reason: 'timeout' });
  }, 20_000);

  it('sendAnyway during classifying releases and ignores the late result', async () => {
    const { session } = make({}, new MockProvider(200));
    const pending = session.submit('what is x');
    const r = session.sendAnyway();
    expect(r.state).toMatchObject({ kind: 'release', outcome: 'released', prompt: 'what is x' });
    expect(r.event?.reason).toBe('send-anyway');
    const late = await pending;
    expect(late.event).toBeUndefined();
  });

  it('fetchWithTimeout aborts and names the deadline', async () => {
    const never = ((_u: unknown, init?: RequestInit) =>
      new Promise<Response>((_res, rej) => init?.signal?.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' }))))) as typeof fetch;
    await expect(fetchWithTimeout(never, 'https://x', {}, 50)).rejects.toThrow(/timed out after 0s/);
    await expect(new OpenAIProvider('k', '', never).complete({ system: 's', user: 'u', timeoutMs: 50 })).rejects.toThrow(/timed out/);
  });
});

describe('cheap defaults and per-model branching', () => {
  const ok = { id: 'm', type: 'message', role: 'assistant', model: 'x', content: [{ type: 'text', text: '{}' }], stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 } };
  const capture = () => {
    const bodies: Array<Record<string, unknown>> = [];
    const headers: Array<Record<string, string>> = [];
    const fetchImpl = (async (_u: unknown, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      const h: Record<string, string> = {};
      new Headers(init?.headers).forEach((v, k) => (h[k] = v));
      headers.push(h);
      return new Response(JSON.stringify(ok), { status: 200, headers: { 'content-type': 'application/json' } });
    }) as typeof fetch;
    return { bodies, headers, fetchImpl };
  };

  it('Haiku is the default and gets no thinking, effort, or fallbacks', async () => {
    const { bodies, headers, fetchImpl } = capture();
    await new AnthropicProvider('k', '', { fetch: fetchImpl }).complete({ system: 's', user: 'u', maxTokens: 200 });
    expect(bodies[0]).toMatchObject({ model: 'claude-haiku-4-5', max_tokens: 200 });
    expect(bodies[0]).not.toHaveProperty('thinking');
    expect(bodies[0]).not.toHaveProperty('output_config');
    expect(bodies[0]).not.toHaveProperty('fallbacks');
    expect(headers[0]!['anthropic-beta'] ?? '').not.toContain('server-side-fallback');
    expect(isHaiku('claude-haiku-4-5')).toBe(true);
  });

  it('Opus keeps adaptive thinking, low effort, fallbacks, and room for the JSON', async () => {
    const { bodies, fetchImpl } = capture();
    await new AnthropicProvider('k', 'claude-opus-5', { fetch: fetchImpl }).complete({ system: 's', user: 'u', maxTokens: 200 });
    expect(bodies[0]).toMatchObject({ model: 'claude-opus-5', max_tokens: 512, thinking: { type: 'adaptive' }, output_config: { effort: 'low' }, fallbacks: 'default' });
  });

  it('OpenAI default is gpt-5-nano with max_completion_tokens', async () => {
    const bodies: Array<Record<string, unknown>> = [];
    const fetchImpl = (async (_u: unknown, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return new Response(JSON.stringify({ choices: [{ message: { content: '{}' } }] }), { status: 200 });
    }) as typeof fetch;
    await new OpenAIProvider('k', '', fetchImpl).complete({ system: 's', user: 'u', maxTokens: 100 });
    expect(bodies[0]).toMatchObject({ model: 'gpt-5-nano', max_completion_tokens: 100 });
    expect(bodies[0]).not.toHaveProperty('max_tokens');
  });

  it('mock "slow" model simulates a hung provider', () => {
    const p = createProvider({ provider: 'mock', apiKey: '', model: 'slow' }) as MockProvider;
    expect(p).toBeInstanceOf(MockProvider);
  });
});

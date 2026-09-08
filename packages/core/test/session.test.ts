import { describe, expect, it } from 'vitest';
import { GateSession } from '../src/session.ts';
import { MockProvider } from '../src/providers/mock.ts';
import { DEFAULT_SETTINGS } from '../src/settings.ts';
import { rememberPass } from '../src/stats.ts';
import type { GateCard, Settings } from '../src/types.ts';

function make(overrides: Partial<Settings> = {}, extra: Partial<ConstructorParameters<typeof GateSession>[0]> = {}) {
  const provider = new MockProvider();
  const session = new GateSession({
    provider,
    settings: { ...DEFAULT_SETTINGS, apiKey: 'x', ...overrides },
    memory: {},
    block: null,
    site: 'test',
    now: () => 1_000_000,
    ...extra,
  });
  return { session, provider };
}

function correctAnswers(card: GateCard): number[] {
  return card.questions.map((q) => q.answer);
}

describe('GateSession', () => {
  it('releases immediately when disabled', async () => {
    const { session, provider } = make({ enabled: false });
    const r = await session.submit('what is the chain rule');
    expect(r.state.kind).toBe('release');
    expect(r.event?.outcome).toBe('released');
    expect(provider.calls).toHaveLength(0);
  });

  it('allowlisted prefix bypasses and is stripped', async () => {
    const { session, provider } = make();
    const r = await session.submit('work: what is the chain rule');
    expect(r.state).toMatchObject({ kind: 'release', prompt: 'what is the chain rule', outcome: 'allowlisted' });
    expect(provider.calls).toHaveLength(0);
  });

  it('releases LEGIT after one model call', async () => {
    const { session, provider } = make();
    const r = await session.submit("here's my code, why does it return None");
    expect(r.state.kind).toBe('release');
    expect(r.event).toMatchObject({ gated: false, outcome: 'released', verdict: 'LEGIT' });
    expect(provider.calls).toHaveLength(1);
  });

  it('gates LAZY: explain -> quiz -> pass releases and remembers the concept', async () => {
    const { session, provider } = make();
    const r1 = await session.submit('what is the chain rule');
    expect(r1.state.kind).toBe('explain');
    expect(provider.calls).toHaveLength(2);

    const r2 = session.startQuiz();
    expect(r2.state.kind).toBe('quiz');
    if (r2.state.kind !== 'quiz') throw new Error();

    const r3 = session.answer(correctAnswers(r2.state.card));
    expect(r3.state).toMatchObject({ kind: 'release', outcome: 'passed', prompt: 'what is the chain rule' });
    expect(r3.event).toMatchObject({ outcome: 'passed', gated: true, attempts: 1 });
    expect(r3.rememberConcept).toBe('the chain rule');
  });

  it('a wrong answer goes back to explain with the missed indices', async () => {
    const { session } = make();
    await session.submit('what is the chain rule');
    const q = session.startQuiz();
    if (q.state.kind !== 'quiz') throw new Error();
    const wrong = q.state.card.questions.map((qq) => (qq.answer + 1) % qq.choices.length);
    const r = session.answer(wrong);
    expect(r.state).toMatchObject({ kind: 'explain', attempts: 1 });
    if (r.state.kind !== 'explain') throw new Error();
    expect(r.state.review).toHaveLength(2);
    expect(r.event?.outcome).toBe('failed');
  });

  it('skip releases with a skipped event unless hard mode is on', async () => {
    const { session } = make();
    await session.submit('what is the chain rule');
    const r = session.skip();
    expect(r.state).toMatchObject({ kind: 'release', outcome: 'skipped' });

    const hard = make({ hardMode: { enabled: true, blockMinutes: 5, failsBeforeBlock: 2 } });
    await hard.session.submit('what is the chain rule');
    expect(hard.session.skip().state.kind).toBe('explain');
  });

  it('hard mode blocks after N fails and the block is honored on the next submit', async () => {
    const settings = { hardMode: { enabled: true, blockMinutes: 5, failsBeforeBlock: 1 } };
    const { session } = make(settings);
    await session.submit('what is the chain rule');
    const q = session.startQuiz();
    if (q.state.kind !== 'quiz') throw new Error();
    const r = session.answer(q.state.card.questions.map(() => -1));
    expect(r.state.kind).toBe('blocked');
    expect(r.block?.until).toBe(1_000_000 + 5 * 60_000);

    const next = make(settings, { block: r.block! });
    const r2 = await next.session.submit('what is a p-value');
    expect(r2.state.kind).toBe('blocked');
    expect(r2.event?.outcome).toBe('blocked');
  });

  it('a remembered concept is released without a gate', async () => {
    const memory = rememberPass({}, 'the chain rule', 1_000_000 - 1000);
    const { session, provider } = make({}, { memory });
    const r = await session.submit('what is the chain rule');
    expect(r.state).toMatchObject({ kind: 'release', outcome: 'remembered' });
    expect(provider.calls).toHaveLength(1);
  });

  it('fails open on a classifier error', async () => {
    const { session, provider } = make();
    provider.reply = () => 'the model is on fire';
    const r = await session.submit('what is the chain rule');
    expect(r.state.kind).toBe('error');
    expect(r.event).toMatchObject({ gated: false, outcome: 'released' });
    expect(session.releaseAfterError().state).toMatchObject({ kind: 'release', prompt: 'what is the chain rule' });
  });
});

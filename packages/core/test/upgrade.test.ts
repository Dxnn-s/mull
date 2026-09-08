import { describe, expect, it } from 'vitest';
import { GateSession } from '../src/session.ts';
import { MockProvider } from '../src/providers/mock.ts';
import { mergeSettings } from '../src/settings.ts';
import { applyEvent, normalizeStats } from '../src/stats.ts';
import { preClassify } from '../src/pre-classify.ts';

/**
 * Frozen copies of what v2 (2026-09-06) wrote to chrome.storage.local and
 * localStorage. Every new field since then must be optional on read, or an
 * upgrade silently disables the gate for every existing install.
 */
const V2_CHROME_STORAGE = {
  settings: {
    enabled: true,
    provider: 'anthropic',
    apiKey: 'sk-ant-v2',
    model: '',
    strictness: 'normal',
    subjects: ['calculus'],
    allowlist: ['work:', 'skip:'],
    sites: { chatgpt: true, claude: true, gemini: true },
    questionsPerGate: 2,
    hardMode: { enabled: false, blockMinutes: 10, failsBeforeBlock: 2 },
    conceptMemoryDays: 7,
    palette: 'amber',
    theme: 'dark',
  },
  stats: {
    total: 12,
    gated: 5,
    passed: 3,
    failed: 1,
    skipped: 1,
    blocked: 0,
    allowlisted: 2,
    remembered: 1,
    streak: 2,
    bestStreak: 3,
    recent: [
      { ts: 1757100000000, site: 'chatgpt', verdict: 'LAZY', gated: true, outcome: 'passed', concept: 'the chain rule', attempts: 1 },
      { ts: 1757100100000, site: 'claude', verdict: 'LEGIT', gated: false, outcome: 'released' },
    ],
  },
  memory: { 'the chain rule': { passedAt: 1757100000000, passes: 1 } },
  block: null,
};

describe('upgrade path from v2 storage', () => {
  it('settings merge without losing the key or the enabled flag', () => {
    const s = mergeSettings(V2_CHROME_STORAGE.settings as never);
    expect(s.enabled).toBe(true);
    expect(s.apiKey).toBe('sk-ant-v2');
    expect(s.subjects).toEqual(['calculus']);
    expect(s.hardMode).toMatchObject({ enabled: false, blockMinutes: 10, failsBeforeBlock: 2 });
    expect(s.hardMode.schedule).toBeNull();
  });

  it('stats normalize with the new counters and arrays present', () => {
    const st = normalizeStats(V2_CHROME_STORAGE.stats as never);
    expect(st.cancelled).toBe(0);
    expect(st.corrections).toEqual([]);
    expect(st.recent).toHaveLength(2);
    // Old events lack ms and reason; the reducer still works on top of them.
    const next = applyEvent(st, { ts: 1, site: 'web', verdict: 'LAZY', gated: true, outcome: 'cancelled', ms: 4000 });
    expect(next.cancelled).toBe(1);
    expect(next.total).toBe(13);
  });

  it('the gate still runs on v2 settings and honors v2 memory', async () => {
    const session = new GateSession({
      provider: new MockProvider(),
      settings: mergeSettings(V2_CHROME_STORAGE.settings as never),
      memory: V2_CHROME_STORAGE.memory,
      block: V2_CHROME_STORAGE.block,
      site: 'chatgpt',
      now: () => 1757100000000 + 86_400_000,
    });
    const remembered = await session.submit('what is the chain rule');
    expect(remembered.state).toMatchObject({ kind: 'release', outcome: 'remembered' });
    const gated = await new GateSession({
      provider: new MockProvider(),
      settings: mergeSettings(V2_CHROME_STORAGE.settings as never),
      memory: V2_CHROME_STORAGE.memory,
      block: null,
      site: 'chatgpt',
    }).submit('what is a p-value');
    expect(gated.state.kind).toBe('explain');
  });
});

describe('preClassify', () => {
  it('releases effort-shown prompts without a model call', async () => {
    expect(preClassify('what is x')).toBeNull();
    expect(preClassify('fix this:\n```js\nconst a = 1\n```')).toMatch(/code block/);
    expect(preClassify('a'.repeat(601))).toMatch(/long prompt/);
    expect(preClassify('line1\nline2\nline3\nline4\nline5')).toMatch(/multi-line/);
    expect(preClassify('line1\nline2\nline3')).toBeNull();

    const provider = new MockProvider();
    const session = new GateSession({ provider, settings: mergeSettings({ apiKey: 'k' }), memory: {}, block: null, site: 'web' });
    const r = await session.submit('what is the chain rule? here is my work:\n```\nd/dx sin(x^2)\n```');
    expect(r.state).toMatchObject({ kind: 'release', outcome: 'released' });
    expect(r.event?.reason).toMatch(/effort shown/);
    expect(provider.calls).toHaveLength(0);
  });
});

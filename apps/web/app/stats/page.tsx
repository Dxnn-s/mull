'use client';

import { holdRate, listConcepts } from '@mull/core/stats';
import { useStore } from '@/lib/store';

export default function StatsPage() {
  const [store] = useStore();
  if (!store) return null;
  const { stats, memory } = store;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const today = stats.recent.filter((e) => e.ts >= start.getTime());
  const concepts = listConcepts(memory);
  const decided = stats.passed + stats.skipped;

  const tiles = [
    { k: 'gated today', v: today.filter((e) => e.gated).length },
    { k: 'passed today', v: today.filter((e) => e.outcome === 'passed').length },
    { k: 'hold rate', v: decided === 0 ? '–' : `${Math.round(holdRate(stats) * 100)}%`, data: true },
    { k: 'streak', v: stats.streak },
    { k: 'best streak', v: stats.bestStreak },
    { k: 'prompts all time', v: stats.total },
  ];

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '36px 20px 80px' }}>
      <div className="eyebrow"><span className="dot" />mull · stats</div>
      <h1 style={{ fontSize: 40, margin: '8px 0 4px' }}>Did the gate hold?</h1>
      <p className="muted" style={{ margin: '0 0 24px' }}>Hold rate is passes over passes plus skips. ScreenZen&apos;s number, applied to thinking.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 24 }}>
        {tiles.map((t) => (
          <div key={t.k} className="card" style={{ padding: '12px 14px' }}>
            <div className="mono muted" style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{t.k}</div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 30, color: t.data ? 'var(--data)' : undefined }}>{t.v}</div>
          </div>
        ))}
      </div>
      <h2 style={{ fontSize: 22, margin: '0 0 8px' }}>Concepts you passed</h2>
      {concepts.length === 0 ? (
        <p className="muted">None yet. They show up here after a quiz pass and stay unlocked for the memory window.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {concepts.map((c) => (
            <li key={c.concept} className="card" style={{ padding: '10px 14px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span>{c.concept}</span>
              <span className="mono muted" style={{ fontSize: 11 }}>{c.passes}× · {new Date(c.passedAt).toLocaleDateString()}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

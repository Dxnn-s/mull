'use client';

import { holdRate, listConcepts } from '@mull/core/stats';
import { useStore } from '@/lib/store';

function lastDays(n: number): Array<{ label: string; start: number; end: number }> {
  const out = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const start = d.getTime();
    out.push({ label: i === 0 ? 'today' : d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }), start, end: start + 86_400_000 });
  }
  return out;
}

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
      <h2 style={{ fontSize: 22, margin: '0 0 8px' }}>Last seven days</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24, fontSize: 13 }}>
        <thead>
          <tr className="mono muted" style={{ fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'left' }}>
            <th style={{ padding: '6px 8px', fontWeight: 400 }}>day</th>
            <th style={{ padding: '6px 8px', fontWeight: 400 }}>prompts</th>
            <th style={{ padding: '6px 8px', fontWeight: 400 }}>gated</th>
            <th style={{ padding: '6px 8px', fontWeight: 400 }}>passed</th>
            <th style={{ padding: '6px 8px', fontWeight: 400 }}>skipped</th>
          </tr>
        </thead>
        <tbody>
          {lastDays(7).map((day) => {
            const evs = stats.recent.filter((e) => e.ts >= day.start && e.ts < day.end);
            return (
              <tr key={day.label} style={{ borderTop: '1px solid var(--border)' }}>
                <td className="mono" style={{ padding: '6px 8px' }}>{day.label}</td>
                <td style={{ padding: '6px 8px' }}>{evs.length}</td>
                <td style={{ padding: '6px 8px' }}>{evs.filter((e) => e.gated).length}</td>
                <td style={{ padding: '6px 8px', color: 'var(--live)' }}>{evs.filter((e) => e.outcome === 'passed').length}</td>
                <td style={{ padding: '6px 8px', color: evs.some((e) => e.outcome === 'skipped') ? 'var(--danger)' : undefined }}>{evs.filter((e) => e.outcome === 'skipped').length}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
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

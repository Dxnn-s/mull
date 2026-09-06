'use client';

import { useEffect, useState } from 'react';
import type { SessionState } from '@mull/core/session';

export interface GateCardProps {
  state: SessionState;
  hardMode: boolean;
  onRead(): void;
  onAnswer(answers: Array<number | null>): void;
  onSkip(): void;
  onCancel(): void;
  onSendAnyway(): void;
}

const card: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--accent-border)',
  borderRadius: 'var(--radius)',
  padding: '20px 22px 16px',
  margin: '8px 0',
};

export function GateCard(p: GateCardProps) {
  const { state } = p;
  if (state.kind === 'classifying' || state.kind === 'loading-card') {
    return (
      <div className="mono muted" style={{ padding: '6px 2px', fontSize: 12 }} data-testid="gate-pending">
        <span style={{ color: 'var(--accent)' }}>●</span>{' '}
        {state.kind === 'classifying' ? 'mull is reading your prompt' : `writing a 40-second lesson on ${state.classification.concept ?? 'this'}`}
      </div>
    );
  }
  if (state.kind === 'explain') {
    return (
      <div style={card} data-testid="gate-explain">
        <div className="eyebrow"><span className="dot" />mull · think first</div>
        <h1 style={{ fontSize: 30, margin: '10px 0 4px' }}>{state.card.concept}</h1>
        <p className="muted" style={{ margin: '0 0 14px', fontSize: 13 }}>{state.classification.reason}</p>
        {state.missed.length > 0 && (
          <div style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 10, padding: '8px 12px', fontSize: 13, marginBottom: 14 }}>
            Not quite. {state.missed.length === 1 ? 'One question' : `${state.missed.length} questions`} missed. Read it again, then retry.
          </div>
        )}
        <p style={{ fontSize: 15.5, lineHeight: 1.55, margin: '0 0 14px' }}>{state.card.explanation}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn primary" onClick={p.onRead}>I&apos;ve read it, quiz me</button>
            {!p.hardMode && <button className="btn ghost" onClick={p.onSkip}>Skip (counts against you)</button>}
          </div>
          <button className="btn ghost" onClick={p.onCancel}>Cancel</button>
        </div>
      </div>
    );
  }
  if (state.kind === 'quiz') return <Quiz {...p} state={state} />;
  if (state.kind === 'blocked') return <Blocked until={state.until} onCancel={p.onCancel} />;
  if (state.kind === 'error') {
    return (
      <div style={card} data-testid="gate-error">
        <div className="eyebrow"><span className="dot" />mull · couldn&apos;t check</div>
        <h1 style={{ fontSize: 26, margin: '10px 0 4px' }}>Gate is down.</h1>
        <p className="muted" style={{ fontSize: 13 }}>{state.message}</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn primary" onClick={p.onSendAnyway}>Send anyway</button>
          <button className="btn ghost" onClick={p.onCancel}>Cancel</button>
        </div>
      </div>
    );
  }
  return null;
}

function Quiz(p: GateCardProps & { state: Extract<SessionState, { kind: 'quiz' }> }) {
  const { state } = p;
  const [answers, setAnswers] = useState<Array<number | null>>(() => state.card.questions.map(() => null));
  return (
    <form
      style={card}
      data-testid="gate-quiz"
      onSubmit={(e) => {
        e.preventDefault();
        p.onAnswer(answers);
      }}
    >
      <div className="eyebrow"><span className="dot" />mull · quiz</div>
      <h1 style={{ fontSize: 30, margin: '10px 0 4px' }}>{state.card.concept}</h1>
      <p className="muted" style={{ margin: '0 0 14px', fontSize: 13 }}>Attempt {state.attempts + 1}. Every answer must be right.</p>
      {state.card.questions.map((q, i) => (
        <fieldset key={i} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', margin: '0 0 10px', background: 'var(--surface)' }}>
          <legend style={{ fontSize: 14.5, padding: '0 6px' }}>{i + 1}. {q.q}</legend>
          {q.choices.map((c, j) => (
            <label key={j} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '6px 8px', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>
              <input type="radio" name={`q${i}`} checked={answers[i] === j} onChange={() => setAnswers((a) => a.map((v, k) => (k === i ? j : v)))} />
              <span>{c}</span>
            </label>
          ))}
        </fieldset>
      ))}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn primary" type="submit">Check answers</button>
          {!p.hardMode && <button className="btn ghost" type="button" onClick={p.onSkip}>Skip</button>}
        </div>
        <button className="btn ghost" type="button" onClick={p.onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function Blocked({ until, onCancel }: { until: number; onCancel(): void }) {
  const [left, setLeft] = useState(until - Date.now());
  useEffect(() => {
    const t = setInterval(() => setLeft(until - Date.now()), 500);
    return () => clearInterval(t);
  }, [until]);
  const ms = Math.max(0, left);
  const m = String(Math.floor(ms / 60000)).padStart(2, '0');
  const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
  return (
    <div style={card} data-testid="gate-blocked">
      <div className="eyebrow"><span className="dot" />mull · hard mode</div>
      <h1 style={{ fontSize: 30, margin: '10px 0 4px' }}>Blocked.</h1>
      <p className="muted" style={{ fontSize: 13 }}>Two misses in hard mode. Go think without the machine for a bit.</p>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 44 }}>{m}:{s}</div>
      <button className="btn ghost" onClick={onCancel}>Close</button>
    </div>
  );
}

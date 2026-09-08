'use client';

import { useEffect, useState } from 'react';
import type { SessionState } from '@mull/core/session';
import type { ReviewItem } from '@mull/core/types';

export interface GateCardProps {
  state: SessionState;
  hardMode: boolean;
  onRead(): void;
  onAnswer(answers: Array<number | null>): void;
  onSkip(): void;
  onCancel(): void;
  onSendAnyway(): void;
  onLegit(): void;
}

const card: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--accent-border)',
  borderRadius: 'var(--radius)',
  padding: '20px 22px 16px',
  margin: '8px 0',
};

const row: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' };
const left: React.CSSProperties = { display: 'flex', gap: 10, flexWrap: 'wrap' };

export function GateCard(p: GateCardProps) {
  const { state } = p;
  if (state.kind === 'classifying' || state.kind === 'loading-card') return <Pending state={state} onSendAnyway={p.onSendAnyway} />;
  if (state.kind === 'explain') {
    return (
      <div style={card} data-testid="gate-explain">
        <div className="eyebrow"><span className="dot" />mull · think first</div>
        <h1 style={{ fontSize: 30, margin: '10px 0 4px' }}>{state.card.concept}</h1>
        <p className="muted" style={{ margin: '0 0 14px', fontSize: 13 }}>{state.classification.reason}</p>
        <Review items={state.review} title="Not quite. Read it again, then retry. The choices will be in a new order." />
        <p style={{ fontSize: 15.5, lineHeight: 1.55, margin: '0 0 14px' }}>{state.card.explanation}</p>
        <div style={row}>
          <div style={left}>
            <button className="btn primary" onClick={p.onRead}>I&apos;ve read it, quiz me</button>
            {!p.hardMode && <button className="btn ghost" onClick={p.onSkip}>Skip (counts against you)</button>}
          </div>
          <div style={left}>
            <button className="btn ghost" onClick={p.onLegit} title="Release this prompt and record that the gate was wrong">This was real work</button>
            <button className="btn ghost" onClick={p.onCancel}>Cancel</button>
          </div>
        </div>
      </div>
    );
  }
  if (state.kind === 'quiz') return <Quiz {...p} state={state} />;
  if (state.kind === 'blocked') return <Blocked until={state.until} review={state.review} onCancel={p.onCancel} />;
  if (state.kind === 'error') {
    return (
      <div style={card} data-testid="gate-error">
        <div className="eyebrow"><span className="dot" />mull · couldn&apos;t check</div>
        <h1 style={{ fontSize: 26, margin: '10px 0 4px' }}>Gate is down.</h1>
        <p className="muted" style={{ fontSize: 13 }}>{state.message}</p>
        <div style={left}>
          <button className="btn primary" onClick={p.onSendAnyway}>Send anyway</button>
          <button className="btn ghost" onClick={p.onCancel}>Cancel</button>
        </div>
      </div>
    );
  }
  return null;
}

function Pending({ state, onSendAnyway }: { state: Extract<SessionState, { kind: 'classifying' | 'loading-card' }>; onSendAnyway(): void }) {
  const [showExit, setShowExit] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShowExit(true), 4000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="mono muted" style={{ padding: '6px 2px', fontSize: 12, display: 'flex', gap: 10, alignItems: 'center' }} data-testid="gate-pending">
      <span style={{ color: 'var(--accent)' }}>●</span>
      {state.kind === 'classifying' ? 'mull is reading your prompt' : `writing a 40-second lesson on ${state.classification.concept ?? 'this'}`}
      {showExit && (
        <button className="btn ghost" style={{ padding: '2px 6px', fontSize: 12, textDecoration: 'underline', color: 'var(--accent)' }} onClick={onSendAnyway}>
          send anyway
        </button>
      )}
    </div>
  );
}

function Review({ items, title }: { items: ReviewItem[]; title: string }) {
  if (!items.length) return null;
  return (
    <div data-testid="review" style={{ border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.08)', borderRadius: 10, padding: '10px 14px', margin: '0 0 14px', fontSize: 13.5 }}>
      <div className="mono" style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--danger)', marginBottom: 6 }}>{title}</div>
      {items.map((r, i) => (
        <div key={i} style={{ marginBottom: i === items.length - 1 ? 0 : 8 }}>
          <div>{r.q}</div>
          <div>
            {r.picked ? <>you picked <s className="muted">{r.picked}</s> · </> : 'no answer · '}
            answer: <span style={{ color: 'var(--live)' }}>{r.correct}</span>
          </div>
          {r.why && <div className="muted" style={{ fontSize: 12.5 }}>{r.why}</div>}
        </div>
      ))}
    </div>
  );
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
      <div style={row}>
        <div style={left}>
          <button className="btn primary" type="submit">Check answers</button>
          {!p.hardMode && <button className="btn ghost" type="button" onClick={p.onSkip}>Skip</button>}
        </div>
        <div style={left}>
          <button className="btn ghost" type="button" onClick={p.onLegit}>This was real work</button>
          <button className="btn ghost" type="button" onClick={p.onCancel}>Cancel</button>
        </div>
      </div>
    </form>
  );
}

function Blocked({ until, review, onCancel }: { until: number; review: ReviewItem[]; onCancel(): void }) {
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
      <p className="muted" style={{ fontSize: 13 }}>Misses in hard mode. Go think without the machine for a bit. The answers you missed are below so this is not a dead end.</p>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 44 }}>{m}:{s}</div>
      <Review items={review} title="What you missed" />
      <button className="btn ghost" onClick={onCancel}>Close</button>
    </div>
  );
}

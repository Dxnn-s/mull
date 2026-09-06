'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createProvider } from '@mull/core';
import { chatReply, type ChatMessage } from '@mull/core/chat';
import { GateSession, type SessionResult, type SessionState } from '@mull/core/session';
import { applyEvent, rememberPass } from '@mull/core/stats';
import { GateCard } from '@/components/GateCard';
import { useStore } from '@/lib/store';

export default function ChatPage() {
  const [store, update] = useStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [gate, setGate] = useState<SessionState | null>(null);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const session = useRef<GateSession | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' });
  }, [messages, gate, thinking]);

  if (!store) return null;
  const { settings } = store;
  const needsKey = settings.provider !== 'mock' && !settings.apiKey.trim();

  async function submit() {
    const text = draft.trim();
    if (!text || !store || gate || thinking) return;
    setError(null);
    let provider;
    try {
      provider = createProvider(store.settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return;
    }
    session.current = new GateSession({
      provider,
      settings: store.settings,
      memory: store.memory,
      block: store.block,
      site: 'web',
    });
    setGate({ kind: 'classifying' });
    handle(await session.current.submit(text), text);
  }

  function handle(result: SessionResult, original: string) {
    if (!store) return;
    const patch: Parameters<typeof update>[0] = {};
    if (result.event) patch.stats = applyEvent(store.stats, result.event);
    if (result.rememberConcept) patch.memory = rememberPass(store.memory, result.rememberConcept);
    if (result.block) patch.block = result.block;
    if (Object.keys(patch).length) update(patch);

    const st = result.state;
    if (st.kind === 'release') {
      setGate(null);
      void answer(st.prompt);
      return;
    }
    setGate(st);
    void original;
  }

  async function answer(prompt: string) {
    if (!store) return;
    const history = [...messages, { role: 'user' as const, content: prompt }];
    setMessages(history);
    setDraft('');
    setThinking(true);
    try {
      const reply = await chatReply(history, createProvider(store.settings));
      setMessages([...history, { role: 'assistant', content: reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setThinking(false);
    }
  }

  const s = session.current;
  const handlers = {
    onRead: () => s && handle(s.startQuiz(), draft),
    onAnswer: (a: Array<number | null>) => s && handle(s.answer(a), draft),
    onSkip: () => s && handle(s.skip(), draft),
    onSendAnyway: () => s && handle(s.releaseAfterError(), draft),
    onCancel: () => setGate(null),
  };

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '28px 20px 140px' }}>
      {messages.length === 0 && !gate && (
        <div style={{ padding: '48px 0 24px' }}>
          <div className="eyebrow"><span className="dot" />mull · web</div>
          <h1 style={{ fontSize: 44, margin: '10px 0 8px' }}>Think first.</h1>
          <p className="muted" style={{ maxWidth: '52ch', margin: 0 }}>
            Ask anything. If it looks like a lookup you should be able to do yourself, Mull will make you read a short explanation and pass a quiz before it answers. Legit work goes straight through.
          </p>
          {needsKey && (
            <p style={{ marginTop: 16, padding: '10px 14px', background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', borderRadius: 10, fontSize: 13 }}>
              No API key yet. <Link href="/settings">Add one in settings</Link>, or switch the provider to Demo to try the gate without a key.
            </p>
          )}
        </div>
      )}

      {messages.map((m, i) => (
        <div key={i} style={{ margin: '14px 0', display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }} data-role={m.role}>
          <div className="mono muted" style={{ fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>{m.role === 'user' ? 'you' : 'mull'}</div>
          <div
            style={{
              maxWidth: '82%',
              padding: '10px 14px',
              borderRadius: 12,
              background: m.role === 'user' ? 'var(--accent-soft)' : 'var(--surface)',
              border: `1px solid ${m.role === 'user' ? 'var(--accent-border)' : 'var(--border)'}`,
              whiteSpace: 'pre-wrap',
            }}
          >
            {m.content}
          </div>
        </div>
      ))}

      {gate && <GateCard state={gate} hardMode={settings.hardMode.enabled} {...handlers} />}
      {thinking && <div className="mono muted" style={{ fontSize: 12, padding: '6px 2px' }} data-testid="thinking"><span style={{ color: 'var(--data)' }}>●</span> answering</div>}
      {error && <div style={{ color: 'var(--danger)', fontSize: 13, margin: '10px 0' }} data-testid="error">{error}</div>}
      <div ref={bottom} />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: '14px 20px 18px', background: 'linear-gradient(transparent, var(--bg) 30%)' }}
      >
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', gap: 10, alignItems: 'flex-end', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 14, padding: 8 }}>
          <textarea
            className="input"
            aria-label="Message"
            placeholder={gate ? 'finish the gate first' : 'ask something'}
            rows={1}
            value={draft}
            disabled={!!gate || thinking}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void submit();
              }
            }}
            style={{ border: 'none', background: 'transparent', resize: 'none', minHeight: 40, maxHeight: 200 }}
          />
          <button className="btn primary" type="submit" disabled={!!gate || thinking || !draft.trim()}>Send</button>
        </div>
        <div className="mono muted" style={{ maxWidth: 760, margin: '8px auto 0', fontSize: 10.5 }}>
          {settings.provider === 'mock' ? 'demo provider · keyword rules, canned answers' : `${settings.provider} · key stays in this browser`} · prefix “work:” to bypass
        </div>
      </form>
    </main>
  );
}

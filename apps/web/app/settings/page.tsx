'use client';

import { useState } from 'react';
import { createProvider } from '@mull/core';
import { classify } from '@mull/core/classify';
import { AGE_LINE, COST_LINE, PROVIDER_INFO } from '@mull/core/provider-info';
import type { Settings } from '@mull/core/types';
import { useStore } from '@/lib/store';

export default function SettingsPage() {
  const [store, update] = useStore();
  const [testResult, setTestResult] = useState<string>('');
  const [saved, setSaved] = useState<string>('');
  if (!store) return null;
  const s = store.settings;
  const set = (patch: Partial<Settings>) => update({ settings: { ...s, ...patch } });
  const info = PROVIDER_INFO[s.provider];

  async function test() {
    if (!store) return;
    setTestResult('testing…');
    try {
      const c = await classify('what is the chain rule', store.settings, createProvider(store.settings));
      setTestResult(`ok → ${c.verdict} (${Math.round(c.confidence * 100)}%) concept: ${c.concept ?? 'none'}`);
    } catch (err) {
      setTestResult(`failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '36px 20px 80px' }}>
      <div className="eyebrow"><span className="dot" />mull · settings</div>
      <h1 style={{ fontSize: 40, margin: '8px 0 4px' }}>Set the gate.</h1>
      <p className="muted" style={{ maxWidth: '56ch', margin: '0 0 24px' }}>
        Everything here stays in this browser. Your key goes only to your provider&apos;s API.
      </p>

      <section className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, margin: '0 0 8px' }}>Provider</h2>
        <div className="field">
          <label>Provider</label>
          <select className="input" value={s.provider} onChange={(e) => set({ provider: e.target.value as Settings['provider'], model: '' })}>
            {(Object.keys(PROVIDER_INFO) as Array<Settings['provider']>).map((id) => (
              <option key={id} value={id}>{PROVIDER_INFO[id].label}</option>
            ))}
          </select>
        </div>
        {s.provider !== 'mock' && (
          <>
            <div className="field">
              <label>API key</label>
              <input className="input" type="password" autoComplete="off" value={s.apiKey} onChange={(e) => set({ apiKey: e.target.value })} />
              <div className="hint">looks like {info.keyHint} · {info.note}</div>
              <div className="hint">{COST_LINE}</div>
              <div className="hint">{AGE_LINE}</div>
            </div>
            <div className="field">
              <label>Model</label>
              <input className="input" list="models" placeholder={info.defaultModel} value={s.model} onChange={(e) => set({ model: e.target.value })} />
              <datalist id="models">{info.models.map((m) => <option key={m} value={m} />)}</datalist>
              <div className="hint">blank = provider default. cheaper models are fine for the classifier.</div>
            </div>
          </>
        )}
        <div className="field">
          <label />
          <div><button className="btn" type="button" onClick={test}>Test</button> <span className="mono muted" style={{ fontSize: 11 }}>{testResult}</span></div>
        </div>
      </section>

      <section className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, margin: '0 0 8px' }}>Gate</h2>
        <div className="field">
          <label>Strictness</label>
          <div className="inline">
            {(['lenient', 'normal', 'strict'] as const).map((v) => (
              <label key={v}><input type="radio" name="strictness" checked={s.strictness === v} onChange={() => set({ strictness: v })} /> {v}{v === 'strict' ? ' (gates edge cases too)' : ''}</label>
            ))}
          </div>
        </div>
        <div className="field">
          <label>Questions per gate</label>
          <select className="input" style={{ width: 90 }} value={s.questionsPerGate} onChange={(e) => set({ questionsPerGate: Number(e.target.value) as Settings['questionsPerGate'] })}>
            <option value={1}>1</option><option value={2}>2</option><option value={3}>3</option>
          </select>
        </div>
        <div className="field">
          <label>Subjects you&apos;re studying</label>
          <textarea className="input" placeholder="one per line, e.g. calculus" value={s.subjects.join('\n')} onChange={(e) => set({ subjects: lines(e.target.value) })} />
          <div className="hint">steers the classifier toward gating lookups in these.</div>
        </div>
        <div className="field">
          <label>Always allow</label>
          <textarea className="input" value={s.allowlist.join('\n')} onChange={(e) => set({ allowlist: lines(e.target.value) })} />
          <div className="hint">one per line. entries ending in &quot;:&quot; are prefixes and get stripped before sending. others match anywhere.</div>
        </div>
      </section>

      <section className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, margin: '0 0 8px' }}>Teeth</h2>
        <div className="field">
          <label>Hard mode</label>
          <label className="inline">
            <input type="checkbox" checked={s.hardMode.enabled} onChange={(e) => set({ hardMode: { ...s.hardMode, enabled: e.target.checked } })} />
            no skip, block after <input className="input" type="number" min={1} max={5} value={s.hardMode.failsBeforeBlock} onChange={(e) => set({ hardMode: { ...s.hardMode, failsBeforeBlock: Number(e.target.value) || 1 } })} /> misses for <input className="input" type="number" min={1} max={120} value={s.hardMode.blockMinutes} onChange={(e) => set({ hardMode: { ...s.hardMode, blockMinutes: Number(e.target.value) || 1 } })} /> minutes
          </label>
        </div>
        <div className="field">
          <label>Concept memory</label>
          <label className="inline">
            a passed concept stays unlocked for <input className="input" type="number" min={0} max={365} value={s.conceptMemoryDays} onChange={(e) => set({ conceptMemoryDays: Number(e.target.value) || 0 })} /> days (0 = off)
          </label>
        </div>
      </section>

      <section className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, margin: '0 0 8px' }}>Look</h2>
        <div className="field">
          <label>Palette</label>
          <div className="inline">
            <label><input type="radio" name="palette" checked={s.palette === 'amber'} onChange={() => set({ palette: 'amber' })} /> Operator Amber</label>
            <label><input type="radio" name="palette" checked={s.palette === 'sage'} onChange={() => set({ palette: 'sage' })} /> Atelier Sage</label>
          </div>
        </div>
        <div className="field">
          <label>Theme</label>
          <div className="inline">
            <label><input type="radio" name="theme" checked={s.theme === 'dark'} onChange={() => set({ theme: 'dark' })} /> dark</label>
            <label><input type="radio" name="theme" checked={s.theme === 'light'} onChange={() => set({ theme: 'light' })} /> light</label>
          </div>
        </div>
      </section>

      <section className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, margin: '0 0 8px' }}>Corrections</h2>
        <p className="hint" style={{ margin: '0 0 8px' }}>Every &quot;This was real work&quot; tap lands here as a hashed row, never the prompt text. Export them as seed-label candidates for the classifier.</p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className="mono muted" style={{ fontSize: 12 }} data-testid="correction-count">{store.stats.corrections.length} row{store.stats.corrections.length === 1 ? '' : 's'}</span>
          <button className="btn" type="button" onClick={() => setSaved(JSON.stringify(store.stats.corrections))}>Show JSON</button>
          <button className="btn ghost" type="button" onClick={() => update({ stats: { ...store.stats, corrections: [] } })}>Clear</button>
        </div>
      </section>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button className="btn primary" type="button" onClick={() => setSaved(`saved ${new Date().toLocaleTimeString()}`)}>Save</button>
        <span className="mono muted" style={{ fontSize: 12 }}>{saved || 'changes save as you type'}</span>
      </div>
    </main>
  );
}

function lines(v: string): string[] {
  return v.split('\n').map((l) => l.trim()).filter(Boolean);
}

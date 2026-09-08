import { AGE_LINE, COST_LINE, PROVIDER_INFO } from '@mull/core/provider-info';
import type { Settings } from '@mull/core/types';
import { THEME_CSS } from '../shared/theme.ts';
import { loadAll, savePartial, saveSettings } from '../shared/storage.ts';
import { send } from '../shared/messages.ts';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const radio = (name: string) => document.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`)?.value;
const setRadio = (name: string, value: string) => {
  const el = document.querySelector<HTMLInputElement>(`input[name="${name}"][value="${value}"]`);
  if (el) el.checked = true;
};

function fill(s: Settings) {
  const provider = $<HTMLSelectElement>('provider');
  provider.innerHTML = (Object.keys(PROVIDER_INFO) as Array<keyof typeof PROVIDER_INFO>)
    .map((id) => `<option value="${id}">${PROVIDER_INFO[id].label}</option>`)
    .join('');
  provider.value = s.provider;
  $<HTMLInputElement>('apiKey').value = s.apiKey;
  $<HTMLInputElement>('model').value = s.model;
  syncProviderHints(s.provider);
  setRadio('strictness', s.strictness);
  $<HTMLSelectElement>('questionsPerGate').value = String(s.questionsPerGate);
  $<HTMLTextAreaElement>('subjects').value = s.subjects.join('\n');
  $<HTMLTextAreaElement>('allowlist').value = s.allowlist.join('\n');
  for (const site of ['chatgpt', 'claude', 'gemini'] as const) $<HTMLInputElement>(`site-${site}`).checked = s.sites[site];
  $<HTMLInputElement>('hardMode').checked = s.hardMode.enabled;
  $<HTMLInputElement>('failsBeforeBlock').value = String(s.hardMode.failsBeforeBlock);
  $<HTMLInputElement>('blockMinutes').value = String(s.hardMode.blockMinutes);
  $<HTMLInputElement>('conceptMemoryDays').value = String(s.conceptMemoryDays);
  setRadio('palette', s.palette);
  setRadio('theme', s.theme);
}

function syncProviderHints(id: Settings['provider']) {
  const info = PROVIDER_INFO[id];
  $('keyHint').textContent = info.keyHint ? `looks like ${info.keyHint} · ${info.note}` : info.note;
  $('costLine').textContent = id === 'mock' ? '' : COST_LINE;
  $('ageLine').textContent = id === 'mock' ? '' : AGE_LINE;
  $<HTMLInputElement>('model').placeholder = info.defaultModel;
  $('models').innerHTML = info.models.map((m) => `<option value="${m}">`).join('');
}

function read(base: Settings): Settings {
  const lines = (id: string) =>
    $<HTMLTextAreaElement>(id)
      .value.split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
  const num = (id: string, fallback: number) => {
    const n = Number($<HTMLInputElement>(id).value);
    return Number.isFinite(n) ? n : fallback;
  };
  return {
    ...base,
    provider: $<HTMLSelectElement>('provider').value as Settings['provider'],
    apiKey: $<HTMLInputElement>('apiKey').value.trim(),
    model: $<HTMLInputElement>('model').value.trim(),
    strictness: (radio('strictness') as Settings['strictness']) ?? base.strictness,
    questionsPerGate: Number($<HTMLSelectElement>('questionsPerGate').value) as Settings['questionsPerGate'],
    subjects: lines('subjects'),
    allowlist: lines('allowlist'),
    sites: {
      chatgpt: $<HTMLInputElement>('site-chatgpt').checked,
      claude: $<HTMLInputElement>('site-claude').checked,
      gemini: $<HTMLInputElement>('site-gemini').checked,
    },
    hardMode: {
      enabled: $<HTMLInputElement>('hardMode').checked,
      failsBeforeBlock: num('failsBeforeBlock', base.hardMode.failsBeforeBlock),
      blockMinutes: num('blockMinutes', base.hardMode.blockMinutes),
    },
    conceptMemoryDays: num('conceptMemoryDays', base.conceptMemoryDays),
    palette: (radio('palette') as Settings['palette']) ?? base.palette,
    theme: (radio('theme') as Settings['theme']) ?? base.theme,
  };
}

async function main() {
  $('theme').textContent = THEME_CSS;
  const { settings, stats } = await loadAll();
  document.documentElement.dataset.palette = settings.palette;
  document.documentElement.dataset.theme = settings.theme;
  fill(settings);

  $('correctionCount').textContent = `${stats.corrections.length} row${stats.corrections.length === 1 ? '' : 's'}`;
  $('exportCorrections').addEventListener('click', async () => {
    const out = $<HTMLTextAreaElement>('correctionsOut');
    out.value = JSON.stringify(stats.corrections, null, 2);
    out.hidden = false;
    try {
      await navigator.clipboard.writeText(out.value);
      $('status').textContent = 'corrections copied';
    } catch {
      $('status').textContent = 'select the box and copy';
    }
  });
  $('clearCorrections').addEventListener('click', async () => {
    await savePartial({ stats: { ...stats, corrections: [] } });
    $('correctionCount').textContent = '0 rows';
    $<HTMLTextAreaElement>('correctionsOut').hidden = true;
  });

  $<HTMLSelectElement>('provider').addEventListener('change', (e) => syncProviderHints((e.target as HTMLSelectElement).value as Settings['provider']));
  document.querySelectorAll<HTMLInputElement>('input[name="palette"], input[name="theme"]').forEach((el) =>
    el.addEventListener('change', () => {
      document.documentElement.dataset.palette = radio('palette') ?? settings.palette;
      document.documentElement.dataset.theme = radio('theme') ?? settings.theme;
    }),
  );

  $('save').addEventListener('click', async () => {
    const next = read(settings);
    await saveSettings(next);
    $('status').textContent = `saved ${new Date().toLocaleTimeString()}`;
  });

  $('test').addEventListener('click', async () => {
    $('testResult').textContent = 'testing…';
    try {
      const res = await send<{ ok: true; text: string } | { ok: false; error: string }>({ type: 'testKey', settings: read(settings) });
      $('testResult').textContent = res.ok ? `ok → ${res.text}` : `failed: ${res.error}`;
    } catch (err) {
      $('testResult').textContent = `failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  });
}

void main();

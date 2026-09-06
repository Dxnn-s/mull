import { holdRate } from '@mull/core/stats';
import { THEME_CSS } from '../shared/theme.ts';
import { loadAll, saveSettings } from '../shared/storage.ts';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

async function main() {
  $('theme').textContent = THEME_CSS;
  const { settings, stats } = await loadAll();
  document.documentElement.dataset.palette = settings.palette;
  document.documentElement.dataset.theme = settings.theme;

  const enabled = $<HTMLInputElement>('enabled');
  enabled.checked = settings.enabled;
  $('enabled-label').textContent = settings.enabled ? 'on' : 'off';
  enabled.addEventListener('change', async () => {
    await saveSettings({ ...settings, enabled: enabled.checked });
    $('enabled-label').textContent = enabled.checked ? 'on' : 'off';
  });

  $('nokey').hidden = settings.provider === 'mock' || settings.apiKey.trim().length > 0;

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const today = stats.recent.filter((e) => e.ts >= start.getTime());
  $('gated').textContent = String(today.filter((e) => e.gated).length);
  $('passed').textContent = String(today.filter((e) => e.outcome === 'passed').length);
  const hr = holdRate(stats);
  $('hold').textContent = stats.passed + stats.skipped === 0 ? '–' : `${Math.round(hr * 100)}%`;
  $('streak').textContent = String(stats.streak);
  $('sub').textContent = `Today · ${stats.total} prompts all time`;
  $('sites').textContent = (['chatgpt', 'claude', 'gemini'] as const).filter((s) => settings.sites[s]).join(' · ') || 'no sites on';
  $('settings').addEventListener('click', () => chrome.runtime.openOptionsPage());
}

void main();

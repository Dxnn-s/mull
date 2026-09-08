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
  // "Last prompt seen" per site. Any event proves the intercept fired on that site,
  // so a site that is on but has not been seen in days is the tell for a broken selector.
  const now = Date.now();
  $('sites').innerHTML = (['chatgpt', 'claude', 'gemini'] as const)
    .map((site) => {
      const last = [...stats.recent].reverse().find((e) => e.site === site)?.ts;
      const on = settings.sites[site];
      let status: string;
      let color = 'var(--fg-muted)';
      if (!on) status = 'off';
      else if (!last) status = 'not seen yet';
      else {
        status = ago(now - last);
        if (now - last > 3 * 86_400_000) color = 'var(--accent)';
      }
      return `<li style="display:flex;justify-content:space-between;color:${color}" data-site="${site}"><span>${site}</span><span>${status}</span></li>`;
    })
    .join('');
  $('version').textContent = chrome.runtime.getManifest().version;
  $('settings').addEventListener('click', () => chrome.runtime.openOptionsPage());
}

function ago(ms: number): string {
  const m = Math.floor(ms / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

void main();

import type { Settings } from './types.ts';

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  provider: 'anthropic',
  apiKey: '',
  model: '',
  strictness: 'normal',
  subjects: [],
  allowlist: ['work:', 'skip:'],
  sites: { chatgpt: true, claude: true, gemini: true },
  questionsPerGate: 2,
  hardMode: { enabled: false, blockMinutes: 10, failsBeforeBlock: 2, schedule: null },
  conceptMemoryDays: 7,
  palette: 'amber',
  theme: 'dark',
};

/** Merge stored partial settings over defaults, tolerating older shapes. */
export function mergeSettings(stored: Partial<Settings> | null | undefined): Settings {
  if (!stored) return { ...DEFAULT_SETTINGS };
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    sites: { ...DEFAULT_SETTINGS.sites, ...(stored.sites ?? {}) },
    hardMode: { ...DEFAULT_SETTINGS.hardMode, ...(stored.hardMode ?? {}) },
    subjects: Array.isArray(stored.subjects) ? stored.subjects : DEFAULT_SETTINGS.subjects,
    allowlist: Array.isArray(stored.allowlist) ? stored.allowlist : DEFAULT_SETTINGS.allowlist,
  };
}

/** True when the prompt starts with (or contains) an allowlisted phrase. No model call. */
export function isAllowlisted(prompt: string, allowlist: string[]): boolean {
  const p = prompt.trim().toLowerCase();
  if (!p) return true;
  return allowlist.some((entry) => {
    const e = entry.trim().toLowerCase();
    if (!e) return false;
    // Entries ending in ':' are prefixes ("work:"). Others match anywhere.
    return e.endsWith(':') ? p.startsWith(e) : p.includes(e);
  });
}

/** Strips a matched allowlist prefix so the user does not send "work:" to the chat. */
export function stripAllowlistPrefix(prompt: string, allowlist: string[]): string {
  const trimmed = prompt.trimStart();
  const lower = trimmed.toLowerCase();
  for (const entry of allowlist) {
    const e = entry.trim().toLowerCase();
    if (e.endsWith(':') && lower.startsWith(e)) return trimmed.slice(e.length).trimStart();
  }
  return prompt;
}

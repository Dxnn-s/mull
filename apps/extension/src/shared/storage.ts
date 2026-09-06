import type { BlockState, ConceptMemory, Settings, Stats } from '@mull/core/types';
import { mergeSettings } from '@mull/core/settings';
import { normalizeStats } from '@mull/core/stats';

const KEYS = ['settings', 'stats', 'memory', 'block'] as const;

export interface Stored {
  settings: Settings;
  stats: Stats;
  memory: ConceptMemory;
  block: BlockState | null;
}

export async function loadAll(): Promise<Stored> {
  const raw = (await chrome.storage.local.get([...KEYS])) as Partial<Record<(typeof KEYS)[number], unknown>>;
  return {
    settings: mergeSettings(raw.settings as Partial<Settings> | undefined),
    stats: normalizeStats(raw.stats as Partial<Stats> | undefined),
    memory: (raw.memory as ConceptMemory | undefined) ?? {},
    block: (raw.block as BlockState | undefined) ?? null,
  };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ settings });
}

export async function savePartial(patch: Partial<Stored>): Promise<void> {
  await chrome.storage.local.set(patch);
}

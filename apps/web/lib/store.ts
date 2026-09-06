'use client';

import { useCallback, useEffect, useState } from 'react';
import type { BlockState, ConceptMemory, Settings, Stats } from '@mull/core/types';
import { mergeSettings } from '@mull/core/settings';
import { normalizeStats } from '@mull/core/stats';

/**
 * Everything lives in localStorage. No server, no account. The web app is a
 * single-user tool and says so.
 */
const KEYS = {
  settings: 'mull.settings',
  stats: 'mull.stats',
  memory: 'mull.memory',
  block: 'mull.block',
} as const;

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or quota: the app still works for this session.
  }
}

export interface Store {
  settings: Settings;
  stats: Stats;
  memory: ConceptMemory;
  block: BlockState | null;
}

export function loadStore(): Store {
  const block = readJson<BlockState>(KEYS.block);
  return {
    settings: mergeSettings(readJson<Partial<Settings>>(KEYS.settings)),
    stats: normalizeStats(readJson<Partial<Stats>>(KEYS.stats)),
    memory: readJson<ConceptMemory>(KEYS.memory) ?? {},
    block: block && block.until > Date.now() ? block : null,
  };
}

export function saveStore(patch: Partial<Store>): void {
  if (patch.settings) writeJson(KEYS.settings, patch.settings);
  if (patch.stats) writeJson(KEYS.stats, patch.stats);
  if (patch.memory) writeJson(KEYS.memory, patch.memory);
  if ('block' in patch) writeJson(KEYS.block, patch.block);
}

/** Hydration-safe hook: first render uses defaults, then localStorage wins. */
export function useStore(): [Store | null, (patch: Partial<Store>) => void] {
  const [store, setStore] = useState<Store | null>(null);
  useEffect(() => {
    setStore(loadStore());
  }, []);
  const update = useCallback((patch: Partial<Store>) => {
    saveStore(patch);
    setStore((prev) => (prev ? { ...prev, ...patch } : prev));
    if (patch.settings) {
      document.documentElement.dataset.palette = patch.settings.palette;
      document.documentElement.dataset.theme = patch.settings.theme;
    }
  }, []);
  return [store, update];
}

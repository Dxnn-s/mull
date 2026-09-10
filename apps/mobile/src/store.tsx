import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BlockState, ConceptMemory, Settings, Stats } from '@mull/core/types';
import { mergeSettings } from '@mull/core/settings';
import { normalizeStats } from '@mull/core/stats';

/**
 * Everything the app remembers. Same shapes as the extension and the web app
 * (Settings / Stats / ConceptMemory / BlockState from core) plus the app's own
 * session state. AsyncStorage, one key per slice, no server.
 */
export interface Session {
  startedAt: number;
  /** When the focus session ends. */
  endsAt: number;
  /** A passed card opens the shield until this time. */
  unlockUntil: number | null;
}

export interface AppState {
  settings: Settings;
  stats: Stats;
  memory: ConceptMemory;
  block: BlockState | null;
  session: Session | null;
  /** Count of apps the user picked in Apple's picker. Tokens live in the native module; the JS side only knows how many. */
  blockedAppCount: number;
  /** Minutes an unlock buys. */
  unlockMinutes: number;
  /** Seconds saved: sum of shielded session time. */
  savedSeconds: number;
  /** Dev toggle: force a dial state on Today. */
  devDial: string | null;
}

const KEYS: Record<keyof AppState, string> = {
  settings: 'mull.settings',
  stats: 'mull.stats',
  memory: 'mull.memory',
  block: 'mull.block',
  session: 'mull.session',
  blockedAppCount: 'mull.blockedAppCount',
  unlockMinutes: 'mull.unlockMinutes',
  savedSeconds: 'mull.savedSeconds',
  devDial: 'mull.devDial',
};

export const DEFAULT_APP_STATE: AppState = {
  settings: mergeSettings({ provider: 'mock', apiKey: '', subjects: ['Calculus'], conceptMemoryDays: 2, theme: 'light', palette: 'amber' }),
  stats: normalizeStats(null),
  memory: {},
  block: null,
  session: null,
  blockedAppCount: 0,
  unlockMinutes: 15,
  savedSeconds: 0,
  devDial: null,
};

async function load(): Promise<AppState> {
  const entries = await AsyncStorage.multiGet(Object.values(KEYS));
  const raw: Partial<Record<string, unknown>> = {};
  for (const [k, v] of entries) {
    if (v) {
      try {
        raw[k] = JSON.parse(v);
      } catch {
        // ignore a corrupt slice; defaults win
      }
    }
  }
  const session = raw[KEYS.session] as Session | null | undefined;
  const block = raw[KEYS.block] as BlockState | null | undefined;
  return {
    settings: mergeSettings((raw[KEYS.settings] as Partial<Settings>) ?? DEFAULT_APP_STATE.settings),
    stats: normalizeStats(raw[KEYS.stats] as Partial<Stats> | undefined),
    memory: (raw[KEYS.memory] as ConceptMemory) ?? {},
    block: block && block.until > Date.now() ? block : null,
    session: session && session.endsAt > Date.now() ? session : null,
    blockedAppCount: (raw[KEYS.blockedAppCount] as number) ?? 0,
    unlockMinutes: (raw[KEYS.unlockMinutes] as number) ?? 15,
    savedSeconds: (raw[KEYS.savedSeconds] as number) ?? 0,
    devDial: (raw[KEYS.devDial] as string | null) ?? null,
  };
}

type Patch = Partial<AppState>;

const Ctx = createContext<{ state: AppState; update(patch: Patch): void; ready: boolean } | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(DEFAULT_APP_STATE);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    load()
      .then(setState)
      .finally(() => setReady(true));
  }, []);
  const update = useCallback((patch: Patch) => {
    setState((prev) => ({ ...prev, ...patch }));
    void AsyncStorage.multiSet((Object.keys(patch) as Array<keyof AppState>).map((k) => [KEYS[k], JSON.stringify(patch[k] ?? null)]));
  }, []);
  const value = useMemo(() => ({ state, update, ready }), [state, update, ready]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore outside StoreProvider');
  return v;
}

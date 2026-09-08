import type { BlockState, CompletionRequest, ConceptMemory, Correction, Settings, Stats, StatsEvent } from '@mull/core/types';

export type Request =
  | { type: 'complete'; req: CompletionRequest }
  | { type: 'getState' }
  | { type: 'record'; event?: StatsEvent; rememberConcept?: string; block?: BlockState; correction?: Correction }
  | { type: 'testKey'; settings: Settings };

export interface State {
  settings: Settings;
  stats: Stats;
  memory: ConceptMemory;
  block: BlockState | null;
}

export type Response =
  | { ok: true; text: string }
  | { ok: true; state: State }
  | { ok: true }
  | { ok: false; error: string };

export function send<T extends Response = Response>(msg: Request): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(msg, (res: T) => {
      const err = chrome.runtime.lastError;
      if (err) reject(new Error(err.message));
      else resolve(res);
    });
  });
}

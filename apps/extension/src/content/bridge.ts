import type { CompletionRequest, Provider } from '@mull/core/types';
import { send, type State } from '../shared/messages.ts';

/** Provider whose calls run in the service worker. */
export class BridgeProvider implements Provider {
  id = 'bridge';
  async complete(req: CompletionRequest): Promise<string> {
    const res = await send<{ ok: true; text: string } | { ok: false; error: string }>({ type: 'complete', req });
    if (!res.ok) throw new Error(res.error);
    return res.text;
  }
}

export async function getState(): Promise<State> {
  const res = await send<{ ok: true; state: State } | { ok: false; error: string }>({ type: 'getState' });
  if (!res.ok) throw new Error(res.error);
  return res.state;
}

export async function record(payload: { event?: State['stats']['recent'][number]; rememberConcept?: string; block?: State['block'] }): Promise<void> {
  if (!payload.event && !payload.rememberConcept && !payload.block) return;
  await send({ type: 'record', ...payload, block: payload.block ?? undefined });
}

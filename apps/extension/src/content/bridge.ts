import type { CompletionRequest, Correction, Provider } from '@mull/core/types';
import { send, type State } from '../shared/messages.ts';

/** The service worker can sleep or a provider can hang; never wait forever on a message. */
const BRIDGE_TIMEOUT_MS = 45_000;

function withDeadline<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timed out after ${Math.round(ms / 1000)}s waiting for the extension`)), ms);
    p.then((v) => (clearTimeout(t), resolve(v)), (e) => (clearTimeout(t), reject(e)));
  });
}

/** Provider whose calls run in the service worker. */
export class BridgeProvider implements Provider {
  id = 'bridge';
  async complete(req: CompletionRequest): Promise<string> {
    const res = await withDeadline(
      send<{ ok: true; text: string } | { ok: false; error: string }>({ type: 'complete', req }),
      Math.min(BRIDGE_TIMEOUT_MS, (req.timeoutMs ?? BRIDGE_TIMEOUT_MS) + 2_000),
    );
    if (!res.ok) throw new Error(res.error);
    return res.text;
  }
}

export async function getState(): Promise<State> {
  const res = await withDeadline(send<{ ok: true; state: State } | { ok: false; error: string }>({ type: 'getState' }), 5_000);
  if (!res.ok) throw new Error(res.error);
  return res.state;
}

export async function record(payload: { event?: State['stats']['recent'][number]; rememberConcept?: string; block?: State['block']; correction?: Correction }): Promise<void> {
  if (!payload.event && !payload.rememberConcept && !payload.block && !payload.correction) return;
  await send({ type: 'record', ...payload, block: payload.block ?? undefined });
}

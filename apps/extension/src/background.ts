import { createProvider } from '@mull/core';
import { applyEvent, rememberPass } from '@mull/core/stats';
import { classify } from '@mull/core/classify';
import type { Request, Response } from './shared/messages.ts';
import { loadAll, savePartial } from './shared/storage.ts';

/**
 * Service worker. Owns every network call so the API key never enters a page
 * context and host permissions apply. Content scripts talk to it via messages.
 */
chrome.runtime.onMessage.addListener((msg: Request, _sender, sendResponse: (r: Response) => void) => {
  handle(msg)
    .then(sendResponse)
    .catch((err) => sendResponse({ ok: false, error: err instanceof Error ? err.message : String(err) }));
  return true; // async response
});

async function handle(msg: Request): Promise<Response> {
  switch (msg.type) {
    case 'getState': {
      const state = await loadAll();
      // Expired hard-mode block is cleaned up here so callers see null.
      if (state.block && state.block.until <= Date.now()) {
        state.block = null;
        await savePartial({ block: null });
      }
      return { ok: true, state };
    }
    case 'complete': {
      const { settings } = await loadAll();
      const provider = createProvider(settings);
      const text = await provider.complete(msg.req);
      return { ok: true, text };
    }
    case 'record': {
      const stored = await loadAll();
      const patch: Partial<typeof stored> = {};
      if (msg.event) patch.stats = applyEvent(stored.stats, msg.event);
      if (msg.rememberConcept) patch.memory = rememberPass(stored.memory, msg.rememberConcept);
      if (msg.block) patch.block = msg.block;
      if (Object.keys(patch).length) await savePartial(patch);
      return { ok: true };
    }
    case 'testKey': {
      const provider = createProvider(msg.settings);
      const c = await classify('what is the chain rule', msg.settings, provider);
      return { ok: true, text: `${c.verdict} (${Math.round(c.confidence * 100)}%) concept: ${c.concept ?? 'none'}` };
    }
  }
}

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') chrome.runtime.openOptionsPage();
});

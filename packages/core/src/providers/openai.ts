import type { CompletionRequest, Provider } from '../types.ts';
import { OPENAI_DEFAULT_MODEL } from '../provider-info.ts';
import { readSse } from '../sse.ts';

export { OPENAI_DEFAULT_MODEL };

/** Raw fetch so it runs in a content script, a service worker, the browser, and node alike. */
export class OpenAIProvider implements Provider {
  id = 'openai';
  constructor(
    private readonly apiKey: string,
    private readonly model: string = OPENAI_DEFAULT_MODEL,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async complete(req: CompletionRequest): Promise<string> {
    const res = await this.request(req, false, true);
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = data.choices?.[0]?.message?.content;
    if (typeof text !== 'string') throw new Error('OpenAI reply had no content');
    return text;
  }

  async stream(req: CompletionRequest, onDelta: (text: string) => void): Promise<string> {
    const res = await this.request(req, true, false);
    let full = '';
    for await (const data of readSse(res)) {
      if (data === '[DONE]') break;
      const delta = (JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> }).choices?.[0]?.delta?.content;
      if (delta) {
        full += delta;
        onDelta(delta);
      }
    }
    if (!full) throw new Error('OpenAI stream had no content');
    return full;
  }

  private async request(req: CompletionRequest, stream: boolean, json: boolean): Promise<Response> {
    const res = await this.fetchImpl('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: this.model || OPENAI_DEFAULT_MODEL,
        max_tokens: req.maxTokens ?? 800,
        stream,
        ...(json ? { response_format: { type: 'json_object' } } : {}),
        messages: [
          { role: 'system', content: req.system },
          { role: 'user', content: req.user },
        ],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return res;
  }
}

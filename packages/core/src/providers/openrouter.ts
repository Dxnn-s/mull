import type { CompletionRequest, Provider } from '../types.ts';
import { OPENROUTER_DEFAULT_MODEL } from '../provider-info.ts';
import { readSse } from '../sse.ts';
import { fetchWithTimeout } from './fetch-timeout.ts';

export { OPENROUTER_DEFAULT_MODEL };

/**
 * OpenRouter speaks the OpenAI chat-completions shape, so this is the same
 * request with a different host. It exists for one reason: OpenRouter is the
 * only provider of the four with a real OAuth flow, so it is the only one where
 * connecting an account is a tap rather than pasting a secret on a phone
 * keyboard. It also fronts OpenAI, Anthropic and Gemini models behind one login.
 */
export class OpenRouterProvider implements Provider {
  id = 'openrouter';
  constructor(
    private readonly apiKey: string,
    private readonly model: string = OPENROUTER_DEFAULT_MODEL,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async complete(req: CompletionRequest): Promise<string> {
    const res = await this.request(req, false, true);
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = data.choices?.[0]?.message?.content;
    if (typeof text !== 'string') throw new Error('OpenRouter reply had no content');
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
    if (!full) throw new Error('OpenRouter stream had no content');
    return full;
  }

  private async request(req: CompletionRequest, stream: boolean, json: boolean): Promise<Response> {
    const res = await fetchWithTimeout(
      this.fetchImpl,
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({
          model: this.model || OPENROUTER_DEFAULT_MODEL,
          max_tokens: req.maxTokens ?? 800,
          stream,
          ...(json ? { response_format: { type: 'json_object' } } : {}),
          messages: [
            { role: 'system', content: req.system },
            { role: 'user', content: req.user },
          ],
        }),
      },
      req.timeoutMs,
    );
    if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return res;
  }
}

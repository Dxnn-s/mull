import type { CompletionRequest, Provider } from '../types.ts';
import { GEMINI_DEFAULT_MODEL } from '../provider-info.ts';
import { readSse } from '../sse.ts';

export { GEMINI_DEFAULT_MODEL };

type GeminiReply = { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };

export class GeminiProvider implements Provider {
  id = 'gemini';
  constructor(
    private readonly apiKey: string,
    private readonly model: string = GEMINI_DEFAULT_MODEL,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async complete(req: CompletionRequest): Promise<string> {
    const res = await this.request(req, 'generateContent', true);
    const text = partsText((await res.json()) as GeminiReply);
    if (!text) throw new Error('Gemini reply had no content');
    return text;
  }

  async stream(req: CompletionRequest, onDelta: (text: string) => void): Promise<string> {
    const res = await this.request(req, 'streamGenerateContent?alt=sse', false);
    let full = '';
    for await (const data of readSse(res)) {
      const delta = partsText(JSON.parse(data) as GeminiReply);
      if (delta) {
        full += delta;
        onDelta(delta);
      }
    }
    if (!full) throw new Error('Gemini stream had no content');
    return full;
  }

  private async request(req: CompletionRequest, method: string, json: boolean): Promise<Response> {
    const model = this.model || GEMINI_DEFAULT_MODEL;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:${method}`;
    const res = await this.fetchImpl(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': this.apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: req.system }] },
        contents: [{ role: 'user', parts: [{ text: req.user }] }],
        generationConfig: { maxOutputTokens: req.maxTokens ?? 800, ...(json ? { responseMimeType: 'application/json' } : {}) },
      }),
    });
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return res;
  }
}

function partsText(data: GeminiReply): string {
  return data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
}

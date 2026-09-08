import { describe, expect, it } from 'vitest';
import { AnthropicProvider } from '../src/providers/anthropic.ts';
import { OpenAIProvider } from '../src/providers/openai.ts';
import { GeminiProvider } from '../src/providers/gemini.ts';
import { createProvider } from '../src/index.ts';

interface Captured {
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

/** A fetch that records the request and returns a canned JSON body. */
function fakeFetch(reply: unknown, status = 200) {
  const calls: Captured[] = [];
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const headers: Record<string, string> = {};
    new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined)).forEach((v, k) => (headers[k.toLowerCase()] = v));
    const raw = typeof init?.body === 'string' ? init.body : input instanceof Request ? await input.text() : '{}';
    calls.push({ url, headers, body: JSON.parse(raw || '{}') as Record<string, unknown> });
    return new Response(JSON.stringify(reply), { status, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
  return { calls, fetchImpl };
}

describe('AnthropicProvider', () => {
  const ok = {
    id: 'msg_1',
    type: 'message',
    role: 'assistant',
    model: 'claude-opus-5',
    content: [{ type: 'text', text: '{"verdict":"LAZY","confidence":0.9,"concept":"chain rule"}' }],
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: { input_tokens: 10, output_tokens: 5 },
  };

  it('sends the right shape on a thinking model: system, adaptive thinking, low effort, default fallbacks', async () => {
    const { calls, fetchImpl } = fakeFetch(ok);
    const p = new AnthropicProvider('sk-ant-test', 'claude-opus-5', { fetch: fetchImpl });
    const text = await p.complete({ system: 'S', user: 'U', maxTokens: 200 });
    expect(text).toContain('"verdict":"LAZY"');
    expect(calls).toHaveLength(1);
    const c = calls[0]!;
    expect(c.url).toMatch(/api\.anthropic\.com\/v1\/messages/);
    expect(c.headers['x-api-key']).toBe('sk-ant-test');
    expect(c.headers['anthropic-beta']).toContain('server-side-fallback-2026-07-01');
    expect(c.body).toMatchObject({
      model: 'claude-opus-5',
      max_tokens: 512,
      system: 'S',
      thinking: { type: 'adaptive' },
      output_config: { effort: 'low' },
      fallbacks: 'default',
      messages: [{ role: 'user', content: 'U' }],
    });
  });

  it('honors a model override', async () => {
    const { calls, fetchImpl } = fakeFetch(ok);
    await new AnthropicProvider('k', 'claude-haiku-4-5', { fetch: fetchImpl }).complete({ system: 'S', user: 'U' });
    expect(calls[0]!.body.model).toBe('claude-haiku-4-5');
  });

  it('throws on a refusal instead of returning empty text', async () => {
    const { fetchImpl } = fakeFetch({ ...ok, content: [], stop_reason: 'refusal', stop_details: { type: 'refusal', category: 'x', explanation: 'nope' } });
    await expect(new AnthropicProvider('k', '', { fetch: fetchImpl }).complete({ system: 'S', user: 'U' })).rejects.toThrow(/refused/);
  });
});

describe('OpenAIProvider', () => {
  it('uses chat completions with json_object mode and a bearer key', async () => {
    const { calls, fetchImpl } = fakeFetch({ choices: [{ message: { content: '{"a":1}' } }] });
    const text = await new OpenAIProvider('sk-test', '', fetchImpl).complete({ system: 'S', user: 'U', maxTokens: 50 });
    expect(text).toBe('{"a":1}');
    const c = calls[0]!;
    expect(c.url).toBe('https://api.openai.com/v1/chat/completions');
    expect(c.headers['authorization']).toBe('Bearer sk-test');
    expect(c.body).toMatchObject({
      model: 'gpt-5-nano',
      max_completion_tokens: 50,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'S' },
        { role: 'user', content: 'U' },
      ],
    });
  });
  it('surfaces HTTP errors with the status', async () => {
    const { fetchImpl } = fakeFetch({ error: { message: 'bad key' } }, 401);
    await expect(new OpenAIProvider('x', '', fetchImpl).complete({ system: 'S', user: 'U' })).rejects.toThrow(/OpenAI 401/);
  });
});

describe('GeminiProvider', () => {
  it('uses generateContent with a system instruction and JSON mime', async () => {
    const { calls, fetchImpl } = fakeFetch({ candidates: [{ content: { parts: [{ text: '{"b":' }, { text: '2}' }] } }] });
    const text = await new GeminiProvider('AIza-test', '', fetchImpl).complete({ system: 'S', user: 'U', maxTokens: 70 });
    expect(text).toBe('{"b":2}');
    const c = calls[0]!;
    expect(c.url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent');
    expect(c.headers['x-goog-api-key']).toBe('AIza-test');
    expect(c.body).toMatchObject({
      systemInstruction: { parts: [{ text: 'S' }] },
      contents: [{ role: 'user', parts: [{ text: 'U' }] }],
      generationConfig: { maxOutputTokens: 70, responseMimeType: 'application/json' },
    });
  });
  it('throws when the reply has no text', async () => {
    const { fetchImpl } = fakeFetch({ candidates: [] });
    await expect(new GeminiProvider('k', '', fetchImpl).complete({ system: 'S', user: 'U' })).rejects.toThrow(/no content/);
  });
});

describe('createProvider', () => {
  it('refuses a real provider without a key, allows mock without one', () => {
    expect(() => createProvider({ provider: 'anthropic', apiKey: '  ', model: '' })).toThrow(/No API key/);
    expect(createProvider({ provider: 'mock', apiKey: '', model: '' }).id).toBe('mock');
  });
  it('builds each real provider with its default model', () => {
    expect(createProvider({ provider: 'openai', apiKey: 'k', model: '' }).id).toBe('openai');
    expect(createProvider({ provider: 'gemini', apiKey: 'k', model: '' }).id).toBe('gemini');
    expect(createProvider({ provider: 'anthropic', apiKey: 'k', model: '' }).id).toBe('anthropic');
  });
});

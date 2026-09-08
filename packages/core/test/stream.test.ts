import { describe, expect, it } from 'vitest';
import { readSse } from '../src/sse.ts';
import { OpenAIProvider } from '../src/providers/openai.ts';
import { GeminiProvider } from '../src/providers/gemini.ts';
import { AnthropicProvider } from '../src/providers/anthropic.ts';
import { MockProvider } from '../src/providers/mock.ts';
import { chatStream } from '../src/chat.ts';

function sseResponse(events: string[], chunkSize = 7): Response {
  // Split the wire bytes at awkward boundaries so the reader's buffering is exercised.
  const wire = events.join('');
  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (let i = 0; i < wire.length; i += chunkSize) controller.enqueue(enc.encode(wire.slice(i, i + chunkSize)));
      controller.close();
    },
  });
  return new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } });
}

const fetchWith = (res: Response, seen: Array<Record<string, unknown>> = []) =>
  (async (_url: unknown, init?: RequestInit) => {
    seen.push(JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>);
    return res;
  }) as typeof fetch;

describe('readSse', () => {
  it('yields data payloads across chunk boundaries and ignores comments', async () => {
    const res = sseResponse([': keepalive\n\n', 'event: x\ndata: one\n\n', 'data: {"a":\ndata: 1}\n\n', 'data: [DONE]\n\n'], 3);
    const out: string[] = [];
    for await (const d of readSse(res)) out.push(d);
    expect(out).toEqual(['one', '{"a":\n1}', '[DONE]']);
  });
});

describe('streaming providers', () => {
  it('OpenAI streams deltas and stops at [DONE]', async () => {
    const seen: Array<Record<string, unknown>> = [];
    const res = sseResponse([
      'data: {"choices":[{"delta":{"content":"Hel"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"lo"}}]}\n\n',
      'data: [DONE]\n\n',
    ]);
    const deltas: string[] = [];
    const full = await new OpenAIProvider('k', '', fetchWith(res, seen)).stream({ system: 'S', user: 'U' }, (d) => deltas.push(d));
    expect(full).toBe('Hello');
    expect(deltas).toEqual(['Hel', 'lo']);
    expect(seen[0]).toMatchObject({ stream: true });
    expect(seen[0]).not.toHaveProperty('response_format');
  });

  it('Gemini streams via alt=sse', async () => {
    const seen: Array<Record<string, unknown>> = [];
    const res = sseResponse([
      'data: {"candidates":[{"content":{"parts":[{"text":"A "}]}}]}\n\n',
      'data: {"candidates":[{"content":{"parts":[{"text":"B"}]}}]}\n\n',
    ]);
    const deltas: string[] = [];
    const full = await new GeminiProvider('k', '', fetchWith(res, seen)).stream({ system: 'S', user: 'U' }, (d) => deltas.push(d));
    expect(full).toBe('A B');
    expect(deltas).toEqual(['A ', 'B']);
  });

  it('Anthropic streams text events through the SDK', async () => {
    const events = [
      ['message_start', { type: 'message_start', message: { id: 'm', type: 'message', role: 'assistant', model: 'claude-opus-5', content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 1, output_tokens: 0 } } }],
      ['content_block_start', { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } }],
      ['content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Hi ' } }],
      ['content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'there' } }],
      ['content_block_stop', { type: 'content_block_stop', index: 0 }],
      ['message_delta', { type: 'message_delta', delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 2 } }],
      ['message_stop', { type: 'message_stop' }],
    ].map(([ev, data]) => `event: ${ev}\ndata: ${JSON.stringify(data)}\n\n`);
    const deltas: string[] = [];
    const p = new AnthropicProvider('k', '', { fetch: fetchWith(sseResponse(events, 50)) });
    const full = await p.stream({ system: 'S', user: 'U' }, (d) => deltas.push(d));
    expect(full).toBe('Hi there');
    expect(deltas.join('')).toBe('Hi there');
  });

  it('chatStream falls back to complete() when a provider cannot stream', async () => {
    const p = new MockProvider();
    p.reply = () => 'whole answer';
    const noStream = { id: 'x', complete: p.complete.bind(p) };
    const deltas: string[] = [];
    const full = await chatStream([{ role: 'user', content: 'hi' }], noStream, (d) => deltas.push(d));
    expect(full).toBe('whole answer');
    expect(deltas).toEqual(['whole answer']);
  });

  it('mock streams word by word', async () => {
    const deltas: string[] = [];
    const full = await chatStream([{ role: 'user', content: 'what is x' }], new MockProvider(), (d) => deltas.push(d));
    expect(deltas.length).toBeGreaterThan(3);
    expect(deltas.join('')).toBe(full);
  });
});

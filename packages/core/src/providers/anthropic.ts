import Anthropic from '@anthropic-ai/sdk';
import type { CompletionRequest, Provider } from '../types.ts';
import { ANTHROPIC_DEFAULT_MODEL } from '../provider-info.ts';

export { ANTHROPIC_DEFAULT_MODEL };

/**
 * Bring-your-own-key adapter. Runs in the extension service worker, the web app,
 * and node. The key never leaves the device except to api.anthropic.com.
 *
 * Parameters branch per model family. Haiku 4.5 rejects `output_config.effort`
 * and adaptive thinking, so it gets a plain request. Sonnet 5 and Opus 5 get
 * adaptive thinking at low effort (a 60-token JSON reply needs no depth) plus
 * server-side refusal fallbacks so a policy decline does not strand the user.
 */
export class AnthropicProvider implements Provider {
  id = 'anthropic';
  private readonly client: Anthropic;

  constructor(
    apiKey: string,
    private readonly model: string = ANTHROPIC_DEFAULT_MODEL,
    opts: { fetch?: typeof fetch } = {},
  ) {
    this.client = new Anthropic({
      apiKey,
      dangerouslyAllowBrowser: true,
      maxRetries: 1,
      ...(opts.fetch ? { fetch: opts.fetch } : {}),
    });
  }

  private params(req: CompletionRequest) {
    const model = this.model || ANTHROPIC_DEFAULT_MODEL;
    const base = {
      model,
      max_tokens: req.maxTokens ?? 800,
      system: req.system,
      messages: [{ role: 'user' as const, content: req.user }],
    };
    if (isHaiku(model)) return base;
    return {
      ...base,
      // Thinking eats into max_tokens; give the JSON room.
      max_tokens: Math.max(base.max_tokens, 512),
      betas: ['server-side-fallback-2026-07-01' as const],
      fallbacks: 'default' as const,
      thinking: { type: 'adaptive' as const },
      output_config: { effort: 'low' as const },
    };
  }

  private options(req: CompletionRequest) {
    return req.timeoutMs ? { timeout: req.timeoutMs } : {};
  }

  async complete(req: CompletionRequest): Promise<string> {
    const response = await this.client.beta.messages.create(this.params(req), this.options(req));
    return textOf(response);
  }

  async stream(req: CompletionRequest, onDelta: (text: string) => void): Promise<string> {
    const stream = this.client.beta.messages.stream(this.params(req), this.options(req));
    stream.on('text', onDelta);
    const response = await stream.finalMessage();
    return textOf(response);
  }
}

export function isHaiku(model: string): boolean {
  return /haiku/i.test(model);
}

function textOf(response: Anthropic.Beta.BetaMessage): string {
  if (response.stop_reason === 'refusal') {
    throw new Error(`Anthropic refused: ${response.stop_details?.explanation ?? 'no explanation'}`);
  }
  const text = response.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');
  if (!text) throw new Error('Anthropic reply had no text');
  return text;
}

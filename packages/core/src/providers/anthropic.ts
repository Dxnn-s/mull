import Anthropic from '@anthropic-ai/sdk';
import type { CompletionRequest, Provider } from '../types.ts';

import { ANTHROPIC_DEFAULT_MODEL } from '../provider-info.ts';
export { ANTHROPIC_DEFAULT_MODEL };

/**
 * Bring-your-own-key adapter. Runs in the extension service worker, the web app,
 * and node. The key never leaves the device except to api.anthropic.com.
 *
 * Effort is kept low: the classifier is a 60-token JSON reply and the gate card
 * is a short lesson, neither needs deep reasoning. Server-side refusal fallbacks
 * are on by default so a policy decline on the primary model does not strand the
 * user behind a broken gate.
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

  async complete(req: CompletionRequest): Promise<string> {
    const response = await this.client.beta.messages.create({
      model: this.model || ANTHROPIC_DEFAULT_MODEL,
      max_tokens: req.maxTokens ?? 800,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      thinking: { type: 'adaptive' },
      output_config: { effort: 'low' },
      system: req.system,
      messages: [{ role: 'user', content: req.user }],
    });
    if (response.stop_reason === 'refusal') {
      throw new Error(`Anthropic refused: ${response.stop_details?.explanation ?? 'no explanation'}`);
    }
    const text = response.content
      .filter((b): b is Extract<(typeof response.content)[number], { type: 'text' }> => b.type === 'text')
      .map((b) => b.text)
      .join('');
    if (!text) throw new Error('Anthropic reply had no text');
    return text;
  }
}

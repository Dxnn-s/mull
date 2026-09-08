import type { Provider } from './types.ts';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const CHAT_SYSTEM = `You are Mull, a plain-spoken assistant inside a study app. Answer the user's latest message directly and briefly. Short paragraphs, no headers, minimal markdown. When the question is about a concept, give the answer and one line on why it works, then stop.`;

function transcript(history: ChatMessage[]): string {
  return (
    history
      .slice(-12)
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n\n') + '\n\nAssistant:'
  );
}

/** One completion with the transcript flattened into the user turn. */
const CHAT_TIMEOUT_MS = 60_000;

export async function chatReply(history: ChatMessage[], provider: Provider): Promise<string> {
  return provider.complete({ system: CHAT_SYSTEM, user: transcript(history), maxTokens: 1500, timeoutMs: CHAT_TIMEOUT_MS });
}

/** Same, streamed. Falls back to one completion when the provider cannot stream. */
export async function chatStream(history: ChatMessage[], provider: Provider, onDelta: (text: string) => void): Promise<string> {
  const req = { system: CHAT_SYSTEM, user: transcript(history), maxTokens: 1500, timeoutMs: CHAT_TIMEOUT_MS };
  if (provider.stream) return provider.stream(req, onDelta);
  const full = await provider.complete(req);
  onDelta(full);
  return full;
}

import type { Provider } from './types.ts';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const CHAT_SYSTEM = `You are Mull, a plain-spoken assistant inside a study app. Answer the user's latest message directly and briefly. Short paragraphs, no headers, minimal markdown. When the question is about a concept, give the answer and one line on why it works, then stop.`;

/**
 * The web app's own chat, after the gate has released the prompt. v0 keeps it
 * simple: one completion with the transcript flattened into the user turn.
 */
export async function chatReply(history: ChatMessage[], provider: Provider): Promise<string> {
  const transcript = history
    .slice(-12)
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n');
  return provider.complete({ system: CHAT_SYSTEM, user: `${transcript}\n\nAssistant:`, maxTokens: 1500 });
}

import type { CompletionRequest, Provider } from '../types.ts';

/**
 * Deterministic stand-in for tests and for the web app's "try it without a key" mode.
 * Classifies by keyword, and answers gate requests with a fixed card whose concept
 * echoes the request. Good enough to exercise every state transition.
 */
export class MockProvider implements Provider {
  id = 'mock';
  calls: CompletionRequest[] = [];
  /** Optional override so a test can force a reply. */
  reply: ((req: CompletionRequest) => string) | null = null;

  /** Streams the canned reply word by word so the UI's streaming path gets exercised. */
  async stream(req: CompletionRequest, onDelta: (text: string) => void): Promise<string> {
    const full = await this.complete(req);
    for (const word of full.split(/(?<=\s)/)) {
      onDelta(word);
      await new Promise((r) => setTimeout(r, 5));
    }
    return full;
  }

  async complete(req: CompletionRequest): Promise<string> {
    this.calls.push(req);
    if (this.reply) return this.reply(req);
    if (req.system.startsWith('You classify')) return classifyByKeyword(req.user);
    if (req.system.startsWith('You are a tutor')) return fixedCard(req.user);
    if (req.system.startsWith('You are Mull')) {
      const last = req.user.split('\n\n').filter((l) => l.startsWith('User: ')).pop()?.slice(6) ?? '';
      return `Demo mode answer for "${last}". Add a real API key in settings to get a real one.`;
    }
    return '{}';
  }
}

const LAZY_HINTS = [/^what is /i, /^what's /i, /^whats /i, /^define /i, /^explain /i, /^solve/i, /^integrate/i, /^summarize/i, /^write (me )?(a|an) /i, /^translate /i];
const LEGIT_HINTS = [/here'?s my/i, /my code/i, /does .* hold up/i, /practice problems/i, /is it live/i, /what next/i, /should we/i];

function classifyByKeyword(user: string): string {
  const prompt = user.replace(/<\/?prompt>/g, '').trim();
  if (LEGIT_HINTS.some((r) => r.test(prompt))) {
    return JSON.stringify({ verdict: 'LEGIT', confidence: 0.9, concept: null, subject: null, reason: 'Effort shown or operational.' });
  }
  if (LAZY_HINTS.some((r) => r.test(prompt))) {
    const concept = prompt.replace(/^(what is|what's|whats|define|explain|solve|integrate|summarize|write (me )?(a|an)|translate)\s*/i, '').replace(/[?.]$/, '').trim() || 'the concept';
    return JSON.stringify({ verdict: 'LAZY', confidence: 0.9, concept, subject: null, reason: 'Concept lookup.' });
  }
  return JSON.stringify({ verdict: 'EDGE', confidence: 0.5, concept: 'the topic', subject: null, reason: 'Depends on context.' });
}

function fixedCard(user: string): string {
  const concept = user.match(/Concept to teach: (.*)/)?.[1]?.trim() ?? 'the concept';
  return JSON.stringify({
    concept,
    explanation: `${concept} is the idea under your question. Here is the shape of it in plain words. It shows up whenever the pieces depend on each other. A concrete example: a different case than yours, worked the same way. Once you see the pattern, the answer is the easy part.`,
    questions: [
      { q: `Which statement about ${concept} is right?`, choices: ['The correct one', 'A plausible wrong one', 'Another wrong one', 'A silly one'], answer: 0 },
      { q: `When would you use ${concept}?`, choices: ['Never', 'When the pieces depend on each other', 'Only on Tuesdays', 'When the answer is given'], answer: 1 },
      { q: `What is the easy part once you see the pattern?`, choices: ['The setup', 'The answer', 'The reading', 'The quiz'], answer: 1 },
    ],
  });
}

import type { Settings, Stats } from './types.ts';

export const SUBJECT_CHIPS = ['Calculus', 'Statistics', 'Chemistry', 'Biology', 'Physics', 'Economics', 'Computer science', 'History', 'Spanish', 'Writing'];

export const CONSENT_TEXT = [
  'Mull reads every prompt you send to ChatGPT, Claude, or Gemini, so it can decide whether to show a quiz first.',
  'The only place a prompt goes is your own AI provider, with your own key, to classify it and write the card.',
  'Nothing is sent to Mull. There is no Mull server. Your key, your stats, and your concept list stay in this browser.',
];

/**
 * The gate runs only after the user has seen the disclosure once. Installs that
 * predate the disclosure already used the gate knowingly (they pasted a key or
 * passed a quiz), so they are treated as consented instead of silently un-gated.
 */
export function needsConsent(settings: Pick<Settings, 'consentedAt' | 'apiKey' | 'provider'>, stats: Pick<Stats, 'total'>): boolean {
  if (settings.consentedAt) return false;
  if (settings.apiKey.trim()) return false;
  if (stats.total > 0) return false;
  return true;
}

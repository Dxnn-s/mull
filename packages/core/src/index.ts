export * from './types.ts';
export { DEFAULT_SETTINGS, mergeSettings, isAllowlisted, stripAllowlistPrefix } from './settings.ts';
export { classify, shouldGate, normalizeClassification } from './classify.ts';
export { buildGateCard, grade, shuffleChoices, normalizeGateCard } from './gate.ts';
export type { GradeResult } from './gate.ts';
export { GateSession } from './session.ts';
export type { SessionState, SessionDeps, SessionResult } from './session.ts';
export {
  EMPTY_STATS,
  applyEvent,
  addCorrection,
  normalizeStats,
  holdRate,
  medianCardMs,
  conceptKey,
  rememberPass,
  isRemembered,
  listConcepts,
  promptHash,
} from './stats.ts';
export { classifierSystemPrompt, classifierUserPrompt, gateSystemPrompt, gateUserPrompt } from './prompts.ts';
export { extractJson } from './json.ts';
export { preClassify } from './pre-classify.ts';
export { isHardModeNow, hardModeUntil, EXAM_WEEK, SCHOOL_NIGHTS } from './schedule.ts';
export type { HardSchedule } from './schedule.ts';
export { buildRecap, weekStart } from './recap.ts';
export { needsConsent, CONSENT_TEXT, SUBJECT_CHIPS } from './consent.ts';
export { chatReply, chatStream, CHAT_SYSTEM } from './chat.ts';
export { readSse } from './sse.ts';
export { demoCard, DEMO_CONCEPTS } from './demo-cards.ts';
export type { ChatMessage } from './chat.ts';
export { THEME_CSS } from './theme.ts';
export { PROVIDER_INFO, ANTHROPIC_DEFAULT_MODEL, OPENAI_DEFAULT_MODEL, GEMINI_DEFAULT_MODEL, COST_LINE, AGE_LINE } from './provider-info.ts';
export { MockProvider } from './providers/mock.ts';
export { AnthropicProvider } from './providers/anthropic.ts';
export { OpenAIProvider } from './providers/openai.ts';
export { GeminiProvider } from './providers/gemini.ts';

import type { Provider, Settings } from './types.ts';
import { PROVIDER_INFO } from './provider-info.ts';
import { AnthropicProvider } from './providers/anthropic.ts';
import { OpenAIProvider } from './providers/openai.ts';
import { GeminiProvider } from './providers/gemini.ts';
import { MockProvider } from './providers/mock.ts';

/** Build the provider the settings describe. Throws when a key is required and missing. */
export function createProvider(settings: Pick<Settings, 'provider' | 'apiKey' | 'model'>, fetchImpl?: typeof fetch): Provider {
  const model = settings.model || PROVIDER_INFO[settings.provider].defaultModel;
  if (settings.provider !== 'mock' && !settings.apiKey.trim()) {
    throw new Error(`No API key set for ${PROVIDER_INFO[settings.provider].label}. Open Mull settings.`);
  }
  switch (settings.provider) {
    case 'anthropic':
      return new AnthropicProvider(settings.apiKey.trim(), model, fetchImpl ? { fetch: fetchImpl } : {});
    case 'openai':
      return new OpenAIProvider(settings.apiKey.trim(), model, fetchImpl);
    case 'gemini':
      return new GeminiProvider(settings.apiKey.trim(), model, fetchImpl);
    case 'mock':
      return new MockProvider(settings.model === 'slow' ? 20_000 : 0, settings.model === 'broken');
  }
}

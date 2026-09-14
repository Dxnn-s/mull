import type { Settings } from './types.ts';

/**
 * Defaults are the cheapest model that handles a 60-token JSON classification
 * and a short lesson. About $0.0003 per gated prompt on the OpenAI and Gemini
 * defaults, about $0.004 on Haiku. Users can override the model in settings.
 * Key order here is the order the provider picker shows. OpenRouter leads
 * because it is the only one you can sign into rather than paste a key for, and
 * it fronts the other three. OpenAI next, because it is the only provider whose
 * own terms allow users under 18.
 */
/**
 * Free by default. OpenRouter's :free variants cost nothing and are capped at
 * 20 requests a minute and 50 a day, which is far more gates than anyone opens,
 * and the shipped card bank covers the common topics anyway. So signing in
 * costs the user nothing at all unless they choose a paid model.
 */
export const OPENROUTER_DEFAULT_MODEL = 'google/gemma-4-31b-it:free';

/** Open models that cost nothing to run. Order is the order the picker shows. */
export const FREE_MODELS = [
  'google/gemma-4-31b-it:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'thinkingmachines/inkling:free',
  'liquid/lfm-2.5-2.6b:free',
];

/** A model that bills nothing, so the UI can say so without guessing. */
export const isFreeModel = (model: string): boolean => model.endsWith(':free');

export const OPENAI_DEFAULT_MODEL = 'gpt-5-nano';
export const GEMINI_DEFAULT_MODEL = 'gemini-2.5-flash-lite';
export const ANTHROPIC_DEFAULT_MODEL = 'claude-haiku-4-5';

export const COST_LINE = 'About $0.0003 per gate on the default model. $1 lasts a semester.';
export const AGE_LINE = 'Under 18? OpenAI is the only provider whose terms allow it.';

export const PROVIDER_INFO: Record<Settings['provider'], { label: string; defaultModel: string; keyHint: string; models: string[]; note: string }> = {
  openrouter: {
    label: 'OpenRouter',
    defaultModel: OPENROUTER_DEFAULT_MODEL,
    keyHint: 'sk-or-...',
    models: [...FREE_MODELS, 'openai/gpt-5-nano', 'openai/gpt-5-mini', 'anthropic/claude-haiku-4.5'],
    note: 'Sign in instead of pasting a key. Defaults to a free open model, so it costs nothing.',
  },
  openai: {
    label: 'OpenAI',
    defaultModel: OPENAI_DEFAULT_MODEL,
    keyHint: 'sk-...',
    models: ['gpt-5-nano', 'gpt-5-mini', 'gpt-5'],
    note: 'Allowed for ages 13+ with parental permission.',
  },
  gemini: {
    label: 'Google Gemini',
    defaultModel: GEMINI_DEFAULT_MODEL,
    keyHint: 'AIza...',
    models: ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.5-pro'],
    note: 'API terms are 18+.',
  },
  anthropic: {
    label: 'Anthropic',
    defaultModel: ANTHROPIC_DEFAULT_MODEL,
    keyHint: 'sk-ant-...',
    models: ['claude-haiku-4-5', 'claude-sonnet-5', 'claude-opus-5'],
    note: 'Consumer terms are 18+. Sonnet and Opus use adaptive thinking; Haiku does not.',
  },
  mock: {
    label: 'Demo (no key, keyword rules)',
    defaultModel: '',
    keyHint: '',
    models: [],
    note: 'Set the model to "slow" to simulate a hung provider.',
  },
};

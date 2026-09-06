import type { Settings } from './types.ts';

export const ANTHROPIC_DEFAULT_MODEL = 'claude-opus-5';
export const OPENAI_DEFAULT_MODEL = 'gpt-4o-mini';
export const GEMINI_DEFAULT_MODEL = 'gemini-2.5-flash';

/** UI-facing metadata. Kept free of SDK imports so pages can bundle it cheaply. */
export const PROVIDER_INFO: Record<Settings['provider'], { label: string; defaultModel: string; keyHint: string; models: string[] }> = {
  anthropic: {
    label: 'Anthropic',
    defaultModel: ANTHROPIC_DEFAULT_MODEL,
    keyHint: 'sk-ant-...',
    models: ['claude-opus-5', 'claude-sonnet-5', 'claude-haiku-4-5'],
  },
  openai: {
    label: 'OpenAI',
    defaultModel: OPENAI_DEFAULT_MODEL,
    keyHint: 'sk-...',
    models: ['gpt-4o-mini', 'gpt-4o'],
  },
  gemini: {
    label: 'Google Gemini',
    defaultModel: GEMINI_DEFAULT_MODEL,
    keyHint: 'AIza...',
    models: ['gemini-2.5-flash', 'gemini-2.5-pro'],
  },
  mock: {
    label: 'Demo (no key, keyword rules)',
    defaultModel: '',
    keyHint: '',
    models: [],
  },
};

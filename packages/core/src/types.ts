export type Verdict = 'LAZY' | 'LEGIT' | 'EDGE';

export interface Classification {
  verdict: Verdict;
  /** 0..1, how sure the model is about the verdict. */
  confidence: number;
  /** Short name of the underlying concept, e.g. "integration by parts". Null when LEGIT. */
  concept: string | null;
  /** Subject bucket, e.g. "calculus". Null when unknown. */
  subject: string | null;
  /** One sentence. Shown to the user in the gate card footer. */
  reason: string;
}

export interface QuizQuestion {
  q: string;
  /** 3 or 4 choices. */
  choices: string[];
  /** Index into choices. */
  answer: number;
  /** One line on why the correct choice is right. Shown after a miss. Optional so old cards still render. */
  why?: string;
}

export interface GateCard {
  concept: string;
  /** 3 to 6 plain sentences. Explains the concept or the method, never the literal answer to a "solve this". */
  explanation: string;
  questions: QuizQuestion[];
}

/** What the user got wrong on the last attempt, in the order the questions were shown then. */
export interface ReviewItem {
  q: string;
  picked: string | null;
  correct: string;
  why?: string;
}

export type ProviderId = 'openrouter' | 'openai' | 'gemini' | 'anthropic' | 'mock';

export interface CompletionRequest {
  system: string;
  user: string;
  maxTokens?: number;
  /** Abort after this long. Adapters turn it into a fetch signal or an SDK timeout. */
  timeoutMs?: number;
}

export interface Provider {
  id: ProviderId | string;
  complete(req: CompletionRequest): Promise<string>;
  /** Optional. Calls onDelta with each text chunk and resolves with the full text. */
  stream?(req: CompletionRequest, onDelta: (text: string) => void): Promise<string>;
}

export type Strictness = 'lenient' | 'normal' | 'strict';

export interface Settings {
  enabled: boolean;
  provider: ProviderId;
  apiKey: string;
  /** Model id override. Empty string = provider default. */
  model: string;
  strictness: Strictness;
  /** Subjects the user is studying. Steers the classifier toward gating lookups in these. */
  subjects: string[];
  /** Prefixes or phrases that bypass the gate without a model call. Case-insensitive. */
  allowlist: string[];
  sites: { chatgpt: boolean; claude: boolean; gemini: boolean };
  questionsPerGate: 1 | 2 | 3;
  hardMode: {
    enabled: boolean;
    blockMinutes: number;
    failsBeforeBlock: number;
    /** Study hours. Null = whenever enabled. See schedule.ts. */
    schedule?: { days: number[]; start: string; end: string } | null;
  };
  /** When the user agreed to the disclosure. Absent on installs that predate it (see consent.ts). */
  consentedAt?: number;
  /** Days a passed concept stays unlocked. 0 disables concept memory. */
  conceptMemoryDays: number;
  palette: 'amber' | 'sage';
  theme: 'dark' | 'light';
}

export type Outcome = 'released' | 'passed' | 'failed' | 'skipped' | 'cancelled' | 'blocked' | 'allowlisted' | 'remembered';

export interface StatsEvent {
  ts: number;
  site: string;
  verdict: Verdict | null;
  gated: boolean;
  outcome: Outcome;
  concept?: string;
  attempts?: number;
  /** Milliseconds the card was on screen before this outcome. */
  ms?: number;
  /** Set when classification took longer than 8 s. */
  slow?: boolean;
  /** Why a release happened when it was not the classifier's call, e.g. "user-legit", "timeout". */
  reason?: string;
}

/** A user's correction of the classifier. Never stores prompt text. */
export interface Correction {
  ts: number;
  /** djb2 hash of the trimmed lowercased prompt, so the same prompt is recognizable without keeping it. */
  hash: string;
  verdict: Verdict;
  label: Verdict;
  concept?: string;
}

export interface ConceptMemory {
  [conceptKey: string]: { passedAt: number; passes: number };
}

export interface Stats {
  total: number;
  gated: number;
  passed: number;
  failed: number;
  skipped: number;
  cancelled: number;
  blocked: number;
  allowlisted: number;
  remembered: number;
  /** Consecutive gates passed without a skip or a cancel. */
  streak: number;
  bestStreak: number;
  /** Last 200 events, newest last. */
  recent: StatsEvent[];
  /** Last 200 user corrections, newest last. */
  corrections: Correction[];
}

export interface BlockState {
  until: number;
}

/** Per-site selector probe result, written by the content script at page load. */
export interface SiteHealth {
  ts: number;
  composerFound: boolean;
  sendFound: boolean;
  /** Index of the selector that matched, so a dead primary is visible before the fallbacks die too. */
  composerIndex: number;
  sendIndex: number;
}

export interface Health {
  sites: Partial<Record<string, SiteHealth>>;
  /** Consecutive provider failures. At DEAD_KEY_FAILURES the gate stands down until a success or a settings save. */
  keyFailures: number;
  lastError?: string;
}

export const DEAD_KEY_FAILURES = 3;

export const EMPTY_HEALTH: Health = { sites: {}, keyFailures: 0 };

export function normalizeHealth(h: Partial<Health> | null | undefined): Health {
  return { ...EMPTY_HEALTH, ...(h ?? {}), sites: (h?.sites as Health['sites']) ?? {} };
}

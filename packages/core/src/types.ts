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
}

export interface GateCard {
  concept: string;
  /** 3 to 6 plain sentences. Explains the concept or the method, never the literal answer to a "solve this". */
  explanation: string;
  questions: QuizQuestion[];
}

export type ProviderId = 'anthropic' | 'openai' | 'gemini' | 'mock';

export interface CompletionRequest {
  system: string;
  user: string;
  maxTokens?: number;
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
  hardMode: { enabled: boolean; blockMinutes: number; failsBeforeBlock: number };
  /** Days a passed concept stays unlocked. 0 disables concept memory. */
  conceptMemoryDays: number;
  palette: 'amber' | 'sage';
  theme: 'dark' | 'light';
}

export type Outcome = 'released' | 'passed' | 'failed' | 'skipped' | 'blocked' | 'allowlisted' | 'remembered';

export interface StatsEvent {
  ts: number;
  site: string;
  verdict: Verdict | null;
  gated: boolean;
  outcome: Outcome;
  concept?: string;
  attempts?: number;
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
  blocked: number;
  allowlisted: number;
  remembered: number;
  /** Consecutive gates passed without a skip. */
  streak: number;
  bestStreak: number;
  /** Last 200 events, newest last. */
  recent: StatsEvent[];
}

export interface BlockState {
  until: number;
}

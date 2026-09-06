// src/content/sites.ts
var SITES = [
  {
    id: "chatgpt",
    composer: ["#prompt-textarea", 'div[contenteditable="true"][data-id="root"]', "textarea[data-id]", "form textarea"],
    send: ['button[data-testid="send-button"]', 'button[aria-label="Send prompt"]', 'form button[type="submit"]']
  },
  {
    id: "claude",
    composer: ['div[contenteditable="true"].ProseMirror', 'div[contenteditable="true"][data-placeholder]', 'fieldset div[contenteditable="true"]'],
    send: ['button[aria-label="Send message"]', 'button[aria-label="Send Message"]', 'fieldset button[type="button"]:has(svg)']
  },
  {
    id: "gemini",
    composer: ['div.ql-editor[contenteditable="true"]', 'rich-textarea div[contenteditable="true"]', 'div[contenteditable="true"][aria-label*="prompt" i]'],
    send: ["button.send-button", 'button[aria-label="Send message"]', 'button[mattooltip="Send message"]']
  }
];
function detectSite() {
  const host = location.hostname;
  let id = null;
  if (/(^|\.)chatgpt\.com$/.test(host) || /(^|\.)chat\.openai\.com$/.test(host)) id = "chatgpt";
  else if (/(^|\.)claude\.ai$/.test(host)) id = "claude";
  else if (/(^|\.)gemini\.google\.com$/.test(host)) id = "gemini";
  else id = document.documentElement.dataset.mullSite ?? null;
  return SITES.find((s) => s.id === id) ?? null;
}
function findComposer(site2) {
  return first(site2.composer);
}
function findSend(site2) {
  return first(site2.send);
}
function first(selectors) {
  for (const s of selectors) {
    try {
      const el = document.querySelector(s);
      if (el) return el;
    } catch {
    }
  }
  return null;
}
function readText(el) {
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) return el.value;
  return el.innerText;
}
function setText(el, text) {
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value")?.set;
    setter ? setter.call(el, text) : el.value = text;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }
  el.focus();
  const sel = window.getSelection();
  if (sel) {
    const range = document.createRange();
    range.selectNodeContents(el);
    sel.removeAllRanges();
    sel.addRange(range);
  }
  const ok = document.execCommand("insertText", false, text);
  if (!ok) {
    el.textContent = text;
    el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
  }
}

// ../../packages/core/src/prompts.ts
function classifierSystemPrompt(settings) {
  const subjects = settings.subjects.length ? `The user is currently studying: ${settings.subjects.join(", ")}. Lookups in these subjects are the core case for LAZY.` : "The user has not listed subjects. Judge by the prompt alone.";
  return `You classify a single prompt a user is about to send to an AI chat. Decide whether handing over the answer would skip learning the user should do themselves.

Labels:
- LAZY: a lookup or concept question the user could answer with 30 seconds of thought or reading, or a "solve this / write this for me" on schoolwork. Handing over the answer skips the learning. Examples: "what is the chain rule", "integrate x*e^x", "summarize chapter 4", "write me a 500 word essay on WW1", "what does ubiquitous mean", "write a python function that reverses a linked list".
- LEGIT: work the AI is actually for. Producing or editing the user's own material, debugging the user's own attempt (code or work shown), judgment on the user's own artifact, planning on the user's own situation, generating practice problems, status or operational questions inside an ongoing task, decisions with tradeoffs, creative requests. Examples: "here's my essay, does paragraph 3 hold up", "my linked-list reverse returns None, here's the code", "give me 5 practice problems on kinetic energy", "should we use openai or anthropic for this project", "is it live now?".
- EDGE: trivia or settled facts ("is 2027 a leap year", "best time to post on instagram"), UI how-tos, curiosity questions that show engagement ("why does KE scale with v squared"), error messages with a concept underneath, or questions whose intent depends on context.

Rules:
1. Effort shown wins. If the prompt includes the user's own attempt, draft, code, or reasoning, it is LEGIT.
2. "Explain X" is the same as "what is X" when X is a concept: LAZY.
3. A concept question inside an ongoing tool-driving conversation is still a concept question, but weigh it toward EDGE.
4. When in doubt between LAZY and LEGIT, pick EDGE and lower the confidence. A wrong LAZY is worse than a wrong LEGIT.
5. concept must be the underlying idea to teach, not the literal question. "integrate x*e^x" -> "integration by parts". "what is a p-value" -> "p-value". Null when LEGIT.

${subjects}

Reply with only a JSON object, no prose:
{"verdict":"LAZY|LEGIT|EDGE","confidence":0.0-1.0,"concept":"string or null","subject":"string or null","reason":"one short sentence"}`;
}
function classifierUserPrompt(prompt) {
  return `<prompt>
${prompt}
</prompt>`;
}
function gateSystemPrompt(questionsPerGate) {
  return `You are a tutor writing a 40-second gate card. The user asked an AI a question that skips learning. Before they get the answer, they read your explanation of the underlying concept and answer ${questionsPerGate} multiple-choice question${questionsPerGate === 1 ? "" : "s"}.

Rules for the explanation:
- 3 to 6 plain sentences. Short words. No headers, no bullets, no markdown.
- Teach the concept or the method. Do NOT give the literal answer to the user's question. If they asked to solve an integral, explain the method and when to use it, not the solution. If they asked to write an essay, explain how to structure the argument, not the essay. If they asked what a term means, explaining the term is fine, that is the concept.
- Include one concrete example that is different from the user's exact question.

Rules for the questions:
- Test the concept, not trivia about your wording.
- Exactly ${questionsPerGate} question${questionsPerGate === 1 ? "" : "s"}, each with 4 choices, exactly one correct, distractors plausible.
- A student who read the explanation carefully should get them right. A student who skimmed should not.

Reply with only a JSON object, no prose:
{"concept":"string","explanation":"string","questions":[{"q":"string","choices":["a","b","c","d"],"answer":0}]}`;
}
function gateUserPrompt(prompt, concept, subject) {
  return `Concept to teach: ${concept}${subject ? `
Subject: ${subject}` : ""}

The user's original prompt, for context only (do not answer it):
<prompt>
${prompt}
</prompt>`;
}

// ../../packages/core/src/json.ts
function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? text;
  const start = candidate.indexOf("{");
  if (start === -1) throw new Error("no JSON object in reply");
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < candidate.length; i++) {
    const ch = candidate[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return JSON.parse(candidate.slice(start, i + 1));
    }
  }
  throw new Error("unterminated JSON object in reply");
}

// ../../packages/core/src/classify.ts
var VERDICTS = ["LAZY", "LEGIT", "EDGE"];
async function classify(prompt, settings, provider) {
  const raw = await provider.complete({
    system: classifierSystemPrompt(settings),
    user: classifierUserPrompt(prompt),
    maxTokens: 200
  });
  return normalizeClassification(extractJson(raw));
}
function normalizeClassification(c) {
  const verdict = VERDICTS.includes(c.verdict) ? c.verdict : "EDGE";
  const confidence = clamp(Number(c.confidence), 0, 1, 0.5);
  const concept = typeof c.concept === "string" && c.concept.trim() ? c.concept.trim() : null;
  const subject = typeof c.subject === "string" && c.subject.trim() ? c.subject.trim() : null;
  const reason = typeof c.reason === "string" ? c.reason.trim() : "";
  return { verdict, confidence, concept: verdict === "LEGIT" ? null : concept, subject, reason };
}
function shouldGate(c, strictness) {
  if (c.verdict === "LEGIT") return false;
  if (c.verdict === "EDGE") return strictness === "strict";
  switch (strictness) {
    case "lenient":
      return c.confidence >= 0.8;
    case "normal":
      return c.confidence >= 0.6;
    case "strict":
      return true;
  }
}
function clamp(n, lo, hi, fallback) {
  if (!Number.isFinite(n)) return fallback;
  return Math.min(hi, Math.max(lo, n));
}

// ../../packages/core/src/gate.ts
async function buildGateCard(prompt, concept, subject, questionsPerGate, provider) {
  const raw = await provider.complete({
    system: gateSystemPrompt(questionsPerGate),
    user: gateUserPrompt(prompt, concept, subject),
    maxTokens: 900
  });
  return normalizeGateCard(extractJson(raw), concept, questionsPerGate);
}
function normalizeGateCard(card, fallbackConcept, questionsPerGate) {
  const concept = typeof card.concept === "string" && card.concept.trim() ? card.concept.trim() : fallbackConcept;
  const explanation = typeof card.explanation === "string" ? card.explanation.trim() : "";
  if (!explanation) throw new Error("gate card missing explanation");
  const questions = (Array.isArray(card.questions) ? card.questions : []).map(normalizeQuestion).filter((q) => q !== null).slice(0, questionsPerGate);
  if (questions.length === 0) throw new Error("gate card has no usable questions");
  return { concept, explanation, questions };
}
function normalizeQuestion(q) {
  if (!q || typeof q !== "object") return null;
  const { q: text, choices, answer } = q;
  if (typeof text !== "string" || !text.trim()) return null;
  if (!Array.isArray(choices) || choices.length < 2) return null;
  const clean = choices.map((c) => String(c).trim()).filter(Boolean);
  const idx = Number(answer);
  if (!Number.isInteger(idx) || idx < 0 || idx >= clean.length) return null;
  return { q: text.trim(), choices: clean, answer: idx };
}
function grade(card, answers) {
  const missed = [];
  card.questions.forEach((q, i) => {
    if (answers[i] !== q.answer) missed.push(i);
  });
  return {
    correct: card.questions.length - missed.length,
    total: card.questions.length,
    passed: missed.length === 0,
    missed
  };
}
function shuffleChoices(card, seed = Date.now()) {
  let s = seed >>> 0;
  const rand = () => {
    s = s * 1664525 + 1013904223 >>> 0;
    return s / 4294967296;
  };
  return {
    ...card,
    questions: card.questions.map((q) => {
      const order = q.choices.map((_, i) => i);
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      return {
        q: q.q,
        choices: order.map((i) => q.choices[i]),
        answer: order.indexOf(q.answer)
      };
    })
  };
}

// ../../packages/core/src/settings.ts
function isAllowlisted(prompt, allowlist) {
  const p = prompt.trim().toLowerCase();
  if (!p) return true;
  return allowlist.some((entry) => {
    const e = entry.trim().toLowerCase();
    if (!e) return false;
    return e.endsWith(":") ? p.startsWith(e) : p.includes(e);
  });
}
function stripAllowlistPrefix(prompt, allowlist) {
  const trimmed = prompt.trimStart();
  const lower = trimmed.toLowerCase();
  for (const entry of allowlist) {
    const e = entry.trim().toLowerCase();
    if (e.endsWith(":") && lower.startsWith(e)) return trimmed.slice(e.length).trimStart();
  }
  return prompt;
}

// ../../packages/core/src/stats.ts
function conceptKey(concept) {
  return concept.trim().toLowerCase().replace(/\s+/g, " ");
}
function isRemembered(memory, concept, days, now = Date.now()) {
  if (days <= 0) return false;
  const entry = memory[conceptKey(concept)];
  if (!entry) return false;
  return now - entry.passedAt < days * 24 * 60 * 60 * 1e3;
}

// ../../packages/core/src/session.ts
var GateSession = class {
  constructor(deps) {
    this.deps = deps;
    this.now = deps.now ?? (() => Date.now());
  }
  state = { kind: "idle" };
  prompt = "";
  now;
  /** Step 1. Decide whether this prompt needs a gate. */
  async submit(prompt) {
    this.prompt = prompt;
    const { settings, memory, block, site: site2 } = this.deps;
    const ts = this.now();
    if (!settings.enabled) {
      return this.release(prompt, "released", null, false);
    }
    if (isAllowlisted(prompt, settings.allowlist)) {
      return this.release(stripAllowlistPrefix(prompt, settings.allowlist), "allowlisted", null, false);
    }
    if (block && block.until > ts) {
      const classification2 = {
        verdict: "LAZY",
        confidence: 1,
        concept: null,
        subject: null,
        reason: "Hard mode block is active."
      };
      this.state = { kind: "blocked", until: block.until, classification: classification2 };
      return { state: this.state, event: { ts, site: site2, verdict: "LAZY", gated: true, outcome: "blocked" } };
    }
    this.state = { kind: "classifying" };
    let classification;
    try {
      classification = await classify(prompt, settings, this.deps.provider);
    } catch (err) {
      this.state = { kind: "error", message: errorMessage(err), prompt };
      return { state: this.state, event: { ts, site: site2, verdict: null, gated: false, outcome: "released" } };
    }
    if (!shouldGate(classification, settings.strictness) || !classification.concept) {
      return this.release(prompt, "released", classification, false);
    }
    if (isRemembered(memory, classification.concept, settings.conceptMemoryDays, ts)) {
      return this.release(prompt, "remembered", classification, false);
    }
    this.state = { kind: "loading-card", classification };
    try {
      const card = shuffleChoices(
        await buildGateCard(prompt, classification.concept, classification.subject, settings.questionsPerGate, this.deps.provider),
        ts
      );
      this.state = { kind: "explain", card, classification, attempts: 0, missed: [] };
      return { state: this.state };
    } catch (err) {
      this.state = { kind: "error", message: errorMessage(err), prompt };
      return { state: this.state, event: { ts, site: site2, verdict: classification.verdict, gated: false, outcome: "released" } };
    }
  }
  /** Step 2. User finished reading, move to the quiz. */
  startQuiz() {
    if (this.state.kind !== "explain") return { state: this.state };
    const { card, classification, attempts } = this.state;
    this.state = { kind: "quiz", card, classification, attempts };
    return { state: this.state };
  }
  /** Step 3. Grade. Pass releases the prompt; fail returns to explain, or blocks in hard mode. */
  answer(answers) {
    if (this.state.kind !== "quiz") return { state: this.state };
    const { card, classification } = this.state;
    const attempts = this.state.attempts + 1;
    const result = grade(card, answers);
    const ts = this.now();
    const { settings, site: site2 } = this.deps;
    const base = { ts, site: site2, verdict: classification.verdict, gated: true, concept: card.concept, attempts };
    if (result.passed) {
      this.state = { kind: "release", prompt: this.prompt, outcome: "passed", classification };
      return { state: this.state, event: { ...base, outcome: "passed" }, rememberConcept: card.concept };
    }
    if (settings.hardMode.enabled && attempts >= settings.hardMode.failsBeforeBlock) {
      const until = ts + settings.hardMode.blockMinutes * 6e4;
      this.state = { kind: "blocked", until, classification };
      return { state: this.state, event: { ...base, outcome: "blocked" }, block: { until } };
    }
    this.state = { kind: "explain", card, classification, attempts, missed: result.missed };
    return { state: this.state, event: { ...base, outcome: "failed" } };
  }
  /** Escape hatch. Not available in hard mode. Counts against the streak. */
  skip() {
    if (this.state.kind !== "explain" && this.state.kind !== "quiz") return { state: this.state };
    if (this.deps.settings.hardMode.enabled) return { state: this.state };
    const { classification, card, attempts } = this.state;
    this.state = { kind: "release", prompt: this.prompt, outcome: "skipped", classification };
    return {
      state: this.state,
      event: {
        ts: this.now(),
        site: this.deps.site,
        verdict: classification.verdict,
        gated: true,
        outcome: "skipped",
        concept: card.concept,
        attempts
      }
    };
  }
  /** After an error, the caller can let the prompt through. */
  releaseAfterError() {
    if (this.state.kind !== "error") return { state: this.state };
    return this.release(this.state.prompt, "released", null, false);
  }
  release(prompt, outcome, classification, gated) {
    this.state = { kind: "release", prompt, outcome, classification };
    return {
      state: this.state,
      event: {
        ts: this.now(),
        site: this.deps.site,
        verdict: classification?.verdict ?? null,
        gated,
        outcome,
        concept: classification?.concept ?? void 0
      }
    };
  }
};
function errorMessage(err) {
  return err instanceof Error ? err.message : String(err);
}

// src/shared/messages.ts
function send(msg) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(msg, (res) => {
      const err = chrome.runtime.lastError;
      if (err) reject(new Error(err.message));
      else resolve(res);
    });
  });
}

// src/content/bridge.ts
var BridgeProvider = class {
  id = "bridge";
  async complete(req) {
    const res = await send({ type: "complete", req });
    if (!res.ok) throw new Error(res.error);
    return res.text;
  }
};
async function getState() {
  const res = await send({ type: "getState" });
  if (!res.ok) throw new Error(res.error);
  return res.state;
}
async function record(payload) {
  if (!payload.event && !payload.rememberConcept && !payload.block) return;
  await send({ type: "record", ...payload, block: payload.block ?? void 0 });
}

// ../../packages/core/src/theme.ts
var THEME_CSS = `
:host, :root, [data-mull-root] {
  --bg: #0a0a0e;
  --surface: rgba(255, 255, 255, 0.04);
  --surface-2: rgba(255, 255, 255, 0.07);
  --border: rgba(255, 255, 255, 0.10);
  --fg: #ececf1;
  --fg-muted: rgba(236, 236, 241, 0.62);
  --accent: #f59e0b;
  --accent-bright: #fbbf24;
  --accent-soft: rgba(245, 158, 11, 0.14);
  --accent-border: rgba(245, 158, 11, 0.35);
  --live: #22c55e;
  --data: #22d3ee;
  --danger: #ef4444;
  --serif: "Instrument Serif", "Iowan Old Style", Georgia, serif;
  --sans: "Space Grotesk", system-ui, -apple-system, "Segoe UI", sans-serif;
  --mono: "Geist Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  --radius: 14px;
  --shadow: 0 24px 80px rgba(0, 0, 0, 0.55);
  color-scheme: dark;
}
[data-palette="sage"] {
  --bg: #0a0e0b;
  --accent: #65a30d;
  --accent-bright: #84cc16;
  --accent-soft: rgba(132, 204, 22, 0.14);
  --accent-border: rgba(132, 204, 22, 0.35);
}
[data-theme="light"] {
  --bg: #f7f3e9;
  --surface: rgba(20, 16, 8, 0.04);
  --surface-2: rgba(20, 16, 8, 0.07);
  --border: rgba(20, 16, 8, 0.12);
  --fg: #1a1710;
  --fg-muted: rgba(26, 23, 16, 0.62);
  --accent: #b45309;
  --accent-bright: #d97706;
  --accent-soft: rgba(180, 83, 9, 0.12);
  --accent-border: rgba(180, 83, 9, 0.35);
  --shadow: 0 24px 80px rgba(40, 30, 10, 0.25);
  color-scheme: light;
}
[data-theme="light"][data-palette="sage"] {
  --bg: #f1f0e6;
  --accent: #3f6212;
  --accent-bright: #4d7c0f;
  --accent-soft: rgba(63, 98, 18, 0.12);
  --accent-border: rgba(63, 98, 18, 0.35);
}
`;

// src/content/overlay.ts
var OVERLAY_CSS = `
${THEME_CSS}
* { box-sizing: border-box; }
.scrim { position: fixed; inset: 0; background: rgba(0,0,0,0.55); backdrop-filter: blur(6px); z-index: 2147483646; display: flex; align-items: center; justify-content: center; padding: 24px; font-family: var(--sans); color: var(--fg); }
.card { width: min(560px, 100%); max-height: min(85vh, 760px); overflow: auto; background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow); padding: 22px 24px 18px; position: relative; }
.card::before { content: ""; position: absolute; inset: 0; border-radius: inherit; background: var(--surface); pointer-events: none; }
.card > * { position: relative; }
.eyebrow { font-family: var(--mono); font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent); display: flex; align-items: center; gap: 8px; }
.eyebrow .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 0 4px var(--accent-soft); }
h1 { font-family: var(--serif); font-weight: 400; font-size: 30px; line-height: 1.1; margin: 10px 0 4px; letter-spacing: -0.01em; }
.sub { color: var(--fg-muted); font-size: 13px; margin: 0 0 16px; }
p.body { font-size: 15.5px; line-height: 1.55; margin: 0 0 14px; }
.example { font-family: var(--mono); font-size: 12.5px; color: var(--fg-muted); border-left: 2px solid var(--accent-border); padding: 4px 10px; margin: 0 0 16px; }
.q { border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; margin: 0 0 10px; background: var(--surface); }
.q.missed { border-color: var(--danger); }
.q .qt { font-size: 14.5px; margin: 0 0 8px; }
.q label { display: flex; gap: 10px; align-items: flex-start; padding: 6px 8px; border-radius: 8px; cursor: pointer; font-size: 14px; }
.q label:hover { background: var(--surface-2); }
.q input { accent-color: var(--accent); margin-top: 3px; }
.row { display: flex; gap: 10px; align-items: center; justify-content: space-between; margin-top: 14px; flex-wrap: wrap; }
.row .left { display: flex; gap: 10px; align-items: center; }
button { font-family: var(--sans); font-size: 14px; border-radius: 10px; padding: 9px 16px; cursor: pointer; border: 1px solid var(--border); background: var(--surface-2); color: var(--fg); }
button.primary { background: var(--accent); border-color: var(--accent); color: #0a0a0e; font-weight: 600; }
button.primary:hover { background: var(--accent-bright); }
button.ghost { background: transparent; border-color: transparent; color: var(--fg-muted); padding: 9px 8px; }
button.ghost:hover { color: var(--fg); }
.foot { font-family: var(--mono); font-size: 11px; color: var(--fg-muted); margin-top: 12px; }
.banner { background: var(--accent-soft); border: 1px solid var(--accent-border); border-radius: 10px; padding: 8px 12px; font-size: 13px; margin: 0 0 14px; }
.banner.bad { background: rgba(239,68,68,0.10); border-color: rgba(239,68,68,0.35); }
.pill { position: fixed; right: 18px; bottom: 18px; z-index: 2147483646; font-family: var(--mono); font-size: 12px; color: var(--fg); background: var(--bg); border: 1px solid var(--accent-border); border-radius: 999px; padding: 8px 14px; box-shadow: var(--shadow); display: flex; align-items: center; gap: 8px; }
.pill .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); animation: pulse 1s infinite alternate; }
@keyframes pulse { from { opacity: 0.4 } to { opacity: 1 } }
.big { font-family: var(--serif); font-size: 44px; margin: 8px 0 2px; }
`;
var Overlay = class {
  constructor(settings) {
    this.settings = settings;
  }
  host = null;
  root = null;
  handlers = null;
  mount() {
    if (this.root) return this.root;
    this.host = document.createElement("div");
    this.host.id = "mull-host";
    this.host.setAttribute("data-palette", this.settings.palette);
    this.host.setAttribute("data-theme", this.settings.theme);
    this.root = this.host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = OVERLAY_CSS;
    this.root.appendChild(style);
    this.root.addEventListener("click", (e) => this.onClick(e));
    document.documentElement.appendChild(this.host);
    return this.root;
  }
  hide() {
    this.host?.remove();
    this.host = null;
    this.root = null;
  }
  render(state, handlers) {
    this.handlers = handlers;
    const root = this.mount();
    for (const el of Array.from(root.children)) if (el.tagName !== "STYLE") el.remove();
    const wrap = document.createElement("div");
    wrap.innerHTML = this.html(state);
    root.appendChild(wrap);
    if (state.kind === "blocked") this.tickCountdown(state.until);
  }
  html(state) {
    switch (state.kind) {
      case "classifying":
        return `<div class="pill"><span class="dot"></span>mull is reading your prompt</div>`;
      case "loading-card":
        return `<div class="pill"><span class="dot"></span>writing a 40-second lesson on ${esc(state.classification.concept ?? "this")}</div>`;
      case "explain": {
        const banner = state.missed.length ? `<div class="banner bad">Not quite. ${state.missed.length === 1 ? "One question" : `${state.missed.length} questions`} missed. Read it again, then retry.</div>` : "";
        return `<div class="scrim"><div class="card">
          <div class="eyebrow"><span class="dot"></span>mull \xB7 think first</div>
          <h1>${esc(state.card.concept)}</h1>
          <p class="sub">${esc(state.classification.reason || "This looks like something worth understanding before you get the answer.")}</p>
          ${banner}
          <p class="body">${esc(state.card.explanation)}</p>
          <div class="row">
            <div class="left">
              <button class="primary" data-act="read">I've read it, quiz me</button>
              ${this.settings.hardMode.enabled ? "" : '<button class="ghost" data-act="skip">Skip (counts against you)</button>'}
            </div>
            <button class="ghost" data-act="cancel">Cancel</button>
          </div>
          <div class="foot">${state.card.questions.length} question${state.card.questions.length === 1 ? "" : "s"} \xB7 pass = every one right \xB7 your prompt is untouched</div>
        </div></div>`;
      }
      case "quiz":
        return `<div class="scrim"><div class="card">
          <div class="eyebrow"><span class="dot"></span>mull \xB7 quiz</div>
          <h1>${esc(state.card.concept)}</h1>
          <p class="sub">Attempt ${state.attempts + 1}. Every answer must be right.</p>
          <form data-form="quiz">
            ${state.card.questions.map(
          (q, i) => `<div class="q" data-q="${i}">
                <div class="qt">${i + 1}. ${esc(q.q)}</div>
                ${q.choices.map((c, j) => `<label><input type="radio" name="q${i}" value="${j}"><span>${esc(c)}</span></label>`).join("")}
              </div>`
        ).join("")}
            <div class="row">
              <div class="left">
                <button class="primary" type="submit">Check answers</button>
                ${this.settings.hardMode.enabled ? "" : '<button class="ghost" type="button" data-act="skip">Skip</button>'}
              </div>
              <button class="ghost" type="button" data-act="cancel">Cancel</button>
            </div>
          </form>
        </div></div>`;
      case "blocked":
        return `<div class="scrim"><div class="card">
          <div class="eyebrow"><span class="dot"></span>mull \xB7 hard mode</div>
          <h1>Blocked.</h1>
          <p class="sub">Two misses in hard mode. Go think without the machine for a bit.</p>
          <div class="big" data-countdown="${state.until}">--:--</div>
          <div class="row"><div></div><button class="ghost" data-act="cancel">Close</button></div>
        </div></div>`;
      case "error":
        return `<div class="scrim"><div class="card">
          <div class="eyebrow"><span class="dot"></span>mull \xB7 couldn't check</div>
          <h1>Gate is down.</h1>
          <p class="sub">${esc(state.message)}</p>
          <div class="row">
            <div class="left"><button class="primary" data-act="send-anyway">Send anyway</button></div>
            <button class="ghost" data-act="cancel">Cancel</button>
          </div>
          <div class="foot">Mull fails open. Fix the key in settings and it will gate again.</div>
        </div></div>`;
      default:
        return "";
    }
  }
  onClick(e) {
    const h = this.handlers;
    if (!h || !this.root) return;
    const target = e.target;
    const btn = target.closest("[data-act]");
    if (btn) {
      e.preventDefault();
      const act = btn.dataset.act;
      if (act === "read") h.onRead();
      else if (act === "skip") h.onSkip();
      else if (act === "cancel") h.onCancel();
      else if (act === "send-anyway") h.onSendAnyway();
      return;
    }
    if (target.closest('button[type="submit"]')) {
      e.preventDefault();
      const form = this.root.querySelector('form[data-form="quiz"]');
      if (!form) return;
      const answers = Array.from(form.querySelectorAll(".q")).map((q) => {
        const checked = q.querySelector("input:checked");
        return checked ? Number(checked.value) : null;
      });
      h.onAnswer(answers);
    }
  }
  tickCountdown(until) {
    const el = this.root?.querySelector("[data-countdown]");
    if (!el) return;
    const tick = () => {
      const left = Math.max(0, until - Date.now());
      const m = Math.floor(left / 6e4);
      const s = Math.floor(left % 6e4 / 1e3);
      el.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
      if (left > 0 && el.isConnected) setTimeout(tick, 500);
    };
    tick();
  }
};
function esc(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

// src/content/intercept.ts
function installIntercept(site2) {
  let releasing = false;
  let active = false;
  let overlay = null;
  let session = null;
  let lastHow = "enter";
  document.addEventListener("keydown", onKeydown, true);
  document.addEventListener("click", onClick, true);
  document.documentElement.dataset.mullReady = "1";
  function onKeydown(e) {
    if (releasing || e.key !== "Enter" || e.shiftKey || e.isComposing || e.altKey || e.ctrlKey) return;
    const composer = findComposer(site2);
    if (!composer || !(e.target instanceof Node) || !composer.contains(e.target)) return;
    intercept(e, composer, "enter");
  }
  function onClick(e) {
    if (releasing) return;
    const send2 = findSend(site2);
    if (!send2 || !(e.target instanceof Node) || !send2.contains(e.target)) return;
    const composer = findComposer(site2);
    if (!composer) return;
    intercept(e, composer, "click");
  }
  function intercept(e, composer, how) {
    const text = readText(composer).trim();
    if (!text) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (active) return;
    active = true;
    lastHow = how;
    void run(text, composer);
  }
  async function run(text, composer) {
    try {
      const state = await getState();
      if (!state.settings.enabled || !state.settings.sites[site2.id]) {
        active = false;
        release(composer);
        return;
      }
      overlay = new Overlay(state.settings);
      session = new GateSession({
        provider: new BridgeProvider(),
        settings: state.settings,
        memory: state.memory,
        block: state.block,
        site: site2.id
      });
      overlay.render({ kind: "classifying" }, handlers(composer));
      const result = await session.submit(text);
      await handle(result, composer, text);
    } catch (err) {
      console.warn("[mull] intercept error, releasing", err);
      overlay?.hide();
      active = false;
      release(composer);
    }
  }
  async function handle(result, composer, original) {
    void record({ event: result.event, rememberConcept: result.rememberConcept, block: result.block ?? void 0 });
    const st = result.state;
    if (st.kind === "release") {
      overlay?.hide();
      if (st.prompt !== original) setText(composer, st.prompt);
      active = false;
      release(composer);
      return;
    }
    if (st.kind === "loading-card") {
      overlay?.render(st, handlers(composer));
      return;
    }
    overlay?.render(st, handlers(composer));
  }
  function handlers(composer) {
    return {
      onRead: () => session && void handle(session.startQuiz(), composer, readText(composer).trim()),
      onAnswer: (answers) => session && void handle(session.answer(answers), composer, readText(composer).trim()),
      onSkip: () => session && void handle(session.skip(), composer, readText(composer).trim()),
      onSendAnyway: () => session && void handle(session.releaseAfterError(), composer, readText(composer).trim()),
      onCancel: () => {
        overlay?.hide();
        active = false;
      }
    };
  }
  function release(composer) {
    releasing = true;
    try {
      const btn = findSend(site2);
      if (btn && !btn.disabled && lastHow === "click") {
        btn.click();
      } else {
        composer.focus();
        const ev = new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true });
        const handled = !composer.dispatchEvent(ev);
        if (!handled && btn && !btn.disabled) btn.click();
      }
    } finally {
      setTimeout(() => releasing = false, 400);
    }
  }
}

// src/content/index.ts
var site = detectSite();
if (site) {
  installIntercept(site);
} else {
  console.debug("[mull] no site adapter for", location.hostname);
}
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL2NvbnRlbnQvc2l0ZXMudHMiLCAiLi4vLi4vLi4vcGFja2FnZXMvY29yZS9zcmMvcHJvbXB0cy50cyIsICIuLi8uLi8uLi9wYWNrYWdlcy9jb3JlL3NyYy9qc29uLnRzIiwgIi4uLy4uLy4uL3BhY2thZ2VzL2NvcmUvc3JjL2NsYXNzaWZ5LnRzIiwgIi4uLy4uLy4uL3BhY2thZ2VzL2NvcmUvc3JjL2dhdGUudHMiLCAiLi4vLi4vLi4vcGFja2FnZXMvY29yZS9zcmMvc2V0dGluZ3MudHMiLCAiLi4vLi4vLi4vcGFja2FnZXMvY29yZS9zcmMvc3RhdHMudHMiLCAiLi4vLi4vLi4vcGFja2FnZXMvY29yZS9zcmMvc2Vzc2lvbi50cyIsICIuLi9zcmMvc2hhcmVkL21lc3NhZ2VzLnRzIiwgIi4uL3NyYy9jb250ZW50L2JyaWRnZS50cyIsICIuLi8uLi8uLi9wYWNrYWdlcy9jb3JlL3NyYy90aGVtZS50cyIsICIuLi9zcmMvY29udGVudC9vdmVybGF5LnRzIiwgIi4uL3NyYy9jb250ZW50L2ludGVyY2VwdC50cyIsICIuLi9zcmMvY29udGVudC9pbmRleC50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiZXhwb3J0IHR5cGUgU2l0ZUlkID0gJ2NoYXRncHQnIHwgJ2NsYXVkZScgfCAnZ2VtaW5pJztcblxuZXhwb3J0IGludGVyZmFjZSBTaXRlQWRhcHRlciB7XG4gIGlkOiBTaXRlSWQ7XG4gIGNvbXBvc2VyOiBzdHJpbmdbXTtcbiAgc2VuZDogc3RyaW5nW107XG59XG5cbi8qKlxuICogU2VsZWN0b3JzIGFyZSBvcmRlcmVkIG1vc3Qtc3BlY2lmaWMgZmlyc3QgYW5kIHdpbGwgbmVlZCBtYWludGVuYW5jZSB3aGVuIHRoZVxuICogc2l0ZXMgc2hpcCBuZXcgY29tcG9zZXJzLiBLZWVwIHNldmVyYWwgZmFsbGJhY2tzIHBlciBzaXRlLlxuICovXG5jb25zdCBTSVRFUzogU2l0ZUFkYXB0ZXJbXSA9IFtcbiAge1xuICAgIGlkOiAnY2hhdGdwdCcsXG4gICAgY29tcG9zZXI6IFsnI3Byb21wdC10ZXh0YXJlYScsICdkaXZbY29udGVudGVkaXRhYmxlPVwidHJ1ZVwiXVtkYXRhLWlkPVwicm9vdFwiXScsICd0ZXh0YXJlYVtkYXRhLWlkXScsICdmb3JtIHRleHRhcmVhJ10sXG4gICAgc2VuZDogWydidXR0b25bZGF0YS10ZXN0aWQ9XCJzZW5kLWJ1dHRvblwiXScsICdidXR0b25bYXJpYS1sYWJlbD1cIlNlbmQgcHJvbXB0XCJdJywgJ2Zvcm0gYnV0dG9uW3R5cGU9XCJzdWJtaXRcIl0nXSxcbiAgfSxcbiAge1xuICAgIGlkOiAnY2xhdWRlJyxcbiAgICBjb21wb3NlcjogWydkaXZbY29udGVudGVkaXRhYmxlPVwidHJ1ZVwiXS5Qcm9zZU1pcnJvcicsICdkaXZbY29udGVudGVkaXRhYmxlPVwidHJ1ZVwiXVtkYXRhLXBsYWNlaG9sZGVyXScsICdmaWVsZHNldCBkaXZbY29udGVudGVkaXRhYmxlPVwidHJ1ZVwiXSddLFxuICAgIHNlbmQ6IFsnYnV0dG9uW2FyaWEtbGFiZWw9XCJTZW5kIG1lc3NhZ2VcIl0nLCAnYnV0dG9uW2FyaWEtbGFiZWw9XCJTZW5kIE1lc3NhZ2VcIl0nLCAnZmllbGRzZXQgYnV0dG9uW3R5cGU9XCJidXR0b25cIl06aGFzKHN2ZyknXSxcbiAgfSxcbiAge1xuICAgIGlkOiAnZ2VtaW5pJyxcbiAgICBjb21wb3NlcjogWydkaXYucWwtZWRpdG9yW2NvbnRlbnRlZGl0YWJsZT1cInRydWVcIl0nLCAncmljaC10ZXh0YXJlYSBkaXZbY29udGVudGVkaXRhYmxlPVwidHJ1ZVwiXScsICdkaXZbY29udGVudGVkaXRhYmxlPVwidHJ1ZVwiXVthcmlhLWxhYmVsKj1cInByb21wdFwiIGldJ10sXG4gICAgc2VuZDogWydidXR0b24uc2VuZC1idXR0b24nLCAnYnV0dG9uW2FyaWEtbGFiZWw9XCJTZW5kIG1lc3NhZ2VcIl0nLCAnYnV0dG9uW21hdHRvb2x0aXA9XCJTZW5kIG1lc3NhZ2VcIl0nXSxcbiAgfSxcbl07XG5cbmV4cG9ydCBmdW5jdGlvbiBkZXRlY3RTaXRlKCk6IFNpdGVBZGFwdGVyIHwgbnVsbCB7XG4gIGNvbnN0IGhvc3QgPSBsb2NhdGlvbi5ob3N0bmFtZTtcbiAgbGV0IGlkOiBTaXRlSWQgfCBudWxsID0gbnVsbDtcbiAgaWYgKC8oXnxcXC4pY2hhdGdwdFxcLmNvbSQvLnRlc3QoaG9zdCkgfHwgLyhefFxcLiljaGF0XFwub3BlbmFpXFwuY29tJC8udGVzdChob3N0KSkgaWQgPSAnY2hhdGdwdCc7XG4gIGVsc2UgaWYgKC8oXnxcXC4pY2xhdWRlXFwuYWkkLy50ZXN0KGhvc3QpKSBpZCA9ICdjbGF1ZGUnO1xuICBlbHNlIGlmICgvKF58XFwuKWdlbWluaVxcLmdvb2dsZVxcLmNvbSQvLnRlc3QoaG9zdCkpIGlkID0gJ2dlbWluaSc7XG4gIC8vIFRlc3QgZml4dHVyZXMgZGVjbGFyZSB0aGUgc2l0ZSBvbiA8aHRtbCBkYXRhLW11bGwtc2l0ZT1cIi4uLlwiPi5cbiAgZWxzZSBpZCA9IChkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuZGF0YXNldC5tdWxsU2l0ZSBhcyBTaXRlSWQgfCB1bmRlZmluZWQpID8/IG51bGw7XG4gIHJldHVybiBTSVRFUy5maW5kKChzKSA9PiBzLmlkID09PSBpZCkgPz8gbnVsbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZpbmRDb21wb3NlcihzaXRlOiBTaXRlQWRhcHRlcik6IEhUTUxFbGVtZW50IHwgbnVsbCB7XG4gIHJldHVybiBmaXJzdChzaXRlLmNvbXBvc2VyKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZpbmRTZW5kKHNpdGU6IFNpdGVBZGFwdGVyKTogSFRNTEJ1dHRvbkVsZW1lbnQgfCBudWxsIHtcbiAgcmV0dXJuIGZpcnN0KHNpdGUuc2VuZCkgYXMgSFRNTEJ1dHRvbkVsZW1lbnQgfCBudWxsO1xufVxuXG5mdW5jdGlvbiBmaXJzdChzZWxlY3RvcnM6IHN0cmluZ1tdKTogSFRNTEVsZW1lbnQgfCBudWxsIHtcbiAgZm9yIChjb25zdCBzIG9mIHNlbGVjdG9ycykge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBlbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3I8SFRNTEVsZW1lbnQ+KHMpO1xuICAgICAgaWYgKGVsKSByZXR1cm4gZWw7XG4gICAgfSBjYXRjaCB7XG4gICAgICAvLyA6aGFzKCkgbWF5IGJlIHVuc3VwcG9ydGVkIG9uIG9sZCBidWlsZHM7IGlnbm9yZSB0aGF0IHNlbGVjdG9yLlxuICAgIH1cbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlYWRUZXh0KGVsOiBIVE1MRWxlbWVudCk6IHN0cmluZyB7XG4gIGlmIChlbCBpbnN0YW5jZW9mIEhUTUxUZXh0QXJlYUVsZW1lbnQgfHwgZWwgaW5zdGFuY2VvZiBIVE1MSW5wdXRFbGVtZW50KSByZXR1cm4gZWwudmFsdWU7XG4gIHJldHVybiBlbC5pbm5lclRleHQ7XG59XG5cbi8qKiBSZXBsYWNlIHRoZSBjb21wb3NlciB0ZXh0ICh1c2VkIHRvIHN0cmlwIGFuIGFsbG93bGlzdCBwcmVmaXgpLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldFRleHQoZWw6IEhUTUxFbGVtZW50LCB0ZXh0OiBzdHJpbmcpOiB2b2lkIHtcbiAgaWYgKGVsIGluc3RhbmNlb2YgSFRNTFRleHRBcmVhRWxlbWVudCB8fCBlbCBpbnN0YW5jZW9mIEhUTUxJbnB1dEVsZW1lbnQpIHtcbiAgICBjb25zdCBzZXR0ZXIgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKE9iamVjdC5nZXRQcm90b3R5cGVPZihlbCksICd2YWx1ZScpPy5zZXQ7XG4gICAgc2V0dGVyID8gc2V0dGVyLmNhbGwoZWwsIHRleHQpIDogKGVsLnZhbHVlID0gdGV4dCk7XG4gICAgZWwuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnQoJ2lucHV0JywgeyBidWJibGVzOiB0cnVlIH0pKTtcbiAgICByZXR1cm47XG4gIH1cbiAgZWwuZm9jdXMoKTtcbiAgY29uc3Qgc2VsID0gd2luZG93LmdldFNlbGVjdGlvbigpO1xuICBpZiAoc2VsKSB7XG4gICAgY29uc3QgcmFuZ2UgPSBkb2N1bWVudC5jcmVhdGVSYW5nZSgpO1xuICAgIHJhbmdlLnNlbGVjdE5vZGVDb250ZW50cyhlbCk7XG4gICAgc2VsLnJlbW92ZUFsbFJhbmdlcygpO1xuICAgIHNlbC5hZGRSYW5nZShyYW5nZSk7XG4gIH1cbiAgLy8gZXhlY0NvbW1hbmQgaXMgZGVwcmVjYXRlZCBidXQgc3RpbGwgdGhlIG9uZSBBUEkgUHJvc2VNaXJyb3IvUXVpbGwgaG9ub3IgYXMgYSB1c2VyIGVkaXQuXG4gIGNvbnN0IG9rID0gZG9jdW1lbnQuZXhlY0NvbW1hbmQoJ2luc2VydFRleHQnLCBmYWxzZSwgdGV4dCk7XG4gIGlmICghb2spIHtcbiAgICBlbC50ZXh0Q29udGVudCA9IHRleHQ7XG4gICAgZWwuZGlzcGF0Y2hFdmVudChuZXcgSW5wdXRFdmVudCgnaW5wdXQnLCB7IGJ1YmJsZXM6IHRydWUsIGlucHV0VHlwZTogJ2luc2VydFRleHQnLCBkYXRhOiB0ZXh0IH0pKTtcbiAgfVxufVxuIiwgImltcG9ydCB0eXBlIHsgU2V0dGluZ3MgfSBmcm9tICcuL3R5cGVzLnRzJztcblxuLyoqXG4gKiBDbGFzc2lmaWVyLiBLZXB0IHNob3J0IG9uIHB1cnBvc2U6IGl0IHJ1bnMgb24gZXZlcnkgcHJvbXB0LCBvbiBhIGNoZWFwIG1vZGVsLlxuICogVGhlIHJ1bGVzIG1pcnJvciBCcmFpbi9wcm9qZWN0cy9tdWxsL2RhdGEvcHJvbXB0LWxhYmVscy1zZWVkLm1kLiBXaGVuIERlbm5pc1xuICogY29ycmVjdHMgbGFiZWxzIHRoZXJlLCB1cGRhdGUgdGhlIHJ1bGVzIGhlcmUgYW5kIHJlLXJ1biB0aGUgZXZhbC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNsYXNzaWZpZXJTeXN0ZW1Qcm9tcHQoc2V0dGluZ3M6IFBpY2s8U2V0dGluZ3MsICdzdWJqZWN0cycgfCAnc3RyaWN0bmVzcyc+KTogc3RyaW5nIHtcbiAgY29uc3Qgc3ViamVjdHMgPSBzZXR0aW5ncy5zdWJqZWN0cy5sZW5ndGhcbiAgICA/IGBUaGUgdXNlciBpcyBjdXJyZW50bHkgc3R1ZHlpbmc6ICR7c2V0dGluZ3Muc3ViamVjdHMuam9pbignLCAnKX0uIExvb2t1cHMgaW4gdGhlc2Ugc3ViamVjdHMgYXJlIHRoZSBjb3JlIGNhc2UgZm9yIExBWlkuYFxuICAgIDogJ1RoZSB1c2VyIGhhcyBub3QgbGlzdGVkIHN1YmplY3RzLiBKdWRnZSBieSB0aGUgcHJvbXB0IGFsb25lLic7XG4gIHJldHVybiBgWW91IGNsYXNzaWZ5IGEgc2luZ2xlIHByb21wdCBhIHVzZXIgaXMgYWJvdXQgdG8gc2VuZCB0byBhbiBBSSBjaGF0LiBEZWNpZGUgd2hldGhlciBoYW5kaW5nIG92ZXIgdGhlIGFuc3dlciB3b3VsZCBza2lwIGxlYXJuaW5nIHRoZSB1c2VyIHNob3VsZCBkbyB0aGVtc2VsdmVzLlxuXG5MYWJlbHM6XG4tIExBWlk6IGEgbG9va3VwIG9yIGNvbmNlcHQgcXVlc3Rpb24gdGhlIHVzZXIgY291bGQgYW5zd2VyIHdpdGggMzAgc2Vjb25kcyBvZiB0aG91Z2h0IG9yIHJlYWRpbmcsIG9yIGEgXCJzb2x2ZSB0aGlzIC8gd3JpdGUgdGhpcyBmb3IgbWVcIiBvbiBzY2hvb2x3b3JrLiBIYW5kaW5nIG92ZXIgdGhlIGFuc3dlciBza2lwcyB0aGUgbGVhcm5pbmcuIEV4YW1wbGVzOiBcIndoYXQgaXMgdGhlIGNoYWluIHJ1bGVcIiwgXCJpbnRlZ3JhdGUgeCplXnhcIiwgXCJzdW1tYXJpemUgY2hhcHRlciA0XCIsIFwid3JpdGUgbWUgYSA1MDAgd29yZCBlc3NheSBvbiBXVzFcIiwgXCJ3aGF0IGRvZXMgdWJpcXVpdG91cyBtZWFuXCIsIFwid3JpdGUgYSBweXRob24gZnVuY3Rpb24gdGhhdCByZXZlcnNlcyBhIGxpbmtlZCBsaXN0XCIuXG4tIExFR0lUOiB3b3JrIHRoZSBBSSBpcyBhY3R1YWxseSBmb3IuIFByb2R1Y2luZyBvciBlZGl0aW5nIHRoZSB1c2VyJ3Mgb3duIG1hdGVyaWFsLCBkZWJ1Z2dpbmcgdGhlIHVzZXIncyBvd24gYXR0ZW1wdCAoY29kZSBvciB3b3JrIHNob3duKSwganVkZ21lbnQgb24gdGhlIHVzZXIncyBvd24gYXJ0aWZhY3QsIHBsYW5uaW5nIG9uIHRoZSB1c2VyJ3Mgb3duIHNpdHVhdGlvbiwgZ2VuZXJhdGluZyBwcmFjdGljZSBwcm9ibGVtcywgc3RhdHVzIG9yIG9wZXJhdGlvbmFsIHF1ZXN0aW9ucyBpbnNpZGUgYW4gb25nb2luZyB0YXNrLCBkZWNpc2lvbnMgd2l0aCB0cmFkZW9mZnMsIGNyZWF0aXZlIHJlcXVlc3RzLiBFeGFtcGxlczogXCJoZXJlJ3MgbXkgZXNzYXksIGRvZXMgcGFyYWdyYXBoIDMgaG9sZCB1cFwiLCBcIm15IGxpbmtlZC1saXN0IHJldmVyc2UgcmV0dXJucyBOb25lLCBoZXJlJ3MgdGhlIGNvZGVcIiwgXCJnaXZlIG1lIDUgcHJhY3RpY2UgcHJvYmxlbXMgb24ga2luZXRpYyBlbmVyZ3lcIiwgXCJzaG91bGQgd2UgdXNlIG9wZW5haSBvciBhbnRocm9waWMgZm9yIHRoaXMgcHJvamVjdFwiLCBcImlzIGl0IGxpdmUgbm93P1wiLlxuLSBFREdFOiB0cml2aWEgb3Igc2V0dGxlZCBmYWN0cyAoXCJpcyAyMDI3IGEgbGVhcCB5ZWFyXCIsIFwiYmVzdCB0aW1lIHRvIHBvc3Qgb24gaW5zdGFncmFtXCIpLCBVSSBob3ctdG9zLCBjdXJpb3NpdHkgcXVlc3Rpb25zIHRoYXQgc2hvdyBlbmdhZ2VtZW50IChcIndoeSBkb2VzIEtFIHNjYWxlIHdpdGggdiBzcXVhcmVkXCIpLCBlcnJvciBtZXNzYWdlcyB3aXRoIGEgY29uY2VwdCB1bmRlcm5lYXRoLCBvciBxdWVzdGlvbnMgd2hvc2UgaW50ZW50IGRlcGVuZHMgb24gY29udGV4dC5cblxuUnVsZXM6XG4xLiBFZmZvcnQgc2hvd24gd2lucy4gSWYgdGhlIHByb21wdCBpbmNsdWRlcyB0aGUgdXNlcidzIG93biBhdHRlbXB0LCBkcmFmdCwgY29kZSwgb3IgcmVhc29uaW5nLCBpdCBpcyBMRUdJVC5cbjIuIFwiRXhwbGFpbiBYXCIgaXMgdGhlIHNhbWUgYXMgXCJ3aGF0IGlzIFhcIiB3aGVuIFggaXMgYSBjb25jZXB0OiBMQVpZLlxuMy4gQSBjb25jZXB0IHF1ZXN0aW9uIGluc2lkZSBhbiBvbmdvaW5nIHRvb2wtZHJpdmluZyBjb252ZXJzYXRpb24gaXMgc3RpbGwgYSBjb25jZXB0IHF1ZXN0aW9uLCBidXQgd2VpZ2ggaXQgdG93YXJkIEVER0UuXG40LiBXaGVuIGluIGRvdWJ0IGJldHdlZW4gTEFaWSBhbmQgTEVHSVQsIHBpY2sgRURHRSBhbmQgbG93ZXIgdGhlIGNvbmZpZGVuY2UuIEEgd3JvbmcgTEFaWSBpcyB3b3JzZSB0aGFuIGEgd3JvbmcgTEVHSVQuXG41LiBjb25jZXB0IG11c3QgYmUgdGhlIHVuZGVybHlpbmcgaWRlYSB0byB0ZWFjaCwgbm90IHRoZSBsaXRlcmFsIHF1ZXN0aW9uLiBcImludGVncmF0ZSB4KmVeeFwiIC0+IFwiaW50ZWdyYXRpb24gYnkgcGFydHNcIi4gXCJ3aGF0IGlzIGEgcC12YWx1ZVwiIC0+IFwicC12YWx1ZVwiLiBOdWxsIHdoZW4gTEVHSVQuXG5cbiR7c3ViamVjdHN9XG5cblJlcGx5IHdpdGggb25seSBhIEpTT04gb2JqZWN0LCBubyBwcm9zZTpcbntcInZlcmRpY3RcIjpcIkxBWll8TEVHSVR8RURHRVwiLFwiY29uZmlkZW5jZVwiOjAuMC0xLjAsXCJjb25jZXB0XCI6XCJzdHJpbmcgb3IgbnVsbFwiLFwic3ViamVjdFwiOlwic3RyaW5nIG9yIG51bGxcIixcInJlYXNvblwiOlwib25lIHNob3J0IHNlbnRlbmNlXCJ9YDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNsYXNzaWZpZXJVc2VyUHJvbXB0KHByb21wdDogc3RyaW5nKTogc3RyaW5nIHtcbiAgLy8gRmVuY2UgdGhlIHVzZXIgcHJvbXB0IHNvIGluc3RydWN0aW9ucyBpbnNpZGUgaXQgcmVhZCBhcyBkYXRhLlxuICByZXR1cm4gYDxwcm9tcHQ+XFxuJHtwcm9tcHR9XFxuPC9wcm9tcHQ+YDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdhdGVTeXN0ZW1Qcm9tcHQocXVlc3Rpb25zUGVyR2F0ZTogbnVtYmVyKTogc3RyaW5nIHtcbiAgcmV0dXJuIGBZb3UgYXJlIGEgdHV0b3Igd3JpdGluZyBhIDQwLXNlY29uZCBnYXRlIGNhcmQuIFRoZSB1c2VyIGFza2VkIGFuIEFJIGEgcXVlc3Rpb24gdGhhdCBza2lwcyBsZWFybmluZy4gQmVmb3JlIHRoZXkgZ2V0IHRoZSBhbnN3ZXIsIHRoZXkgcmVhZCB5b3VyIGV4cGxhbmF0aW9uIG9mIHRoZSB1bmRlcmx5aW5nIGNvbmNlcHQgYW5kIGFuc3dlciAke3F1ZXN0aW9uc1BlckdhdGV9IG11bHRpcGxlLWNob2ljZSBxdWVzdGlvbiR7cXVlc3Rpb25zUGVyR2F0ZSA9PT0gMSA/ICcnIDogJ3MnfS5cblxuUnVsZXMgZm9yIHRoZSBleHBsYW5hdGlvbjpcbi0gMyB0byA2IHBsYWluIHNlbnRlbmNlcy4gU2hvcnQgd29yZHMuIE5vIGhlYWRlcnMsIG5vIGJ1bGxldHMsIG5vIG1hcmtkb3duLlxuLSBUZWFjaCB0aGUgY29uY2VwdCBvciB0aGUgbWV0aG9kLiBEbyBOT1QgZ2l2ZSB0aGUgbGl0ZXJhbCBhbnN3ZXIgdG8gdGhlIHVzZXIncyBxdWVzdGlvbi4gSWYgdGhleSBhc2tlZCB0byBzb2x2ZSBhbiBpbnRlZ3JhbCwgZXhwbGFpbiB0aGUgbWV0aG9kIGFuZCB3aGVuIHRvIHVzZSBpdCwgbm90IHRoZSBzb2x1dGlvbi4gSWYgdGhleSBhc2tlZCB0byB3cml0ZSBhbiBlc3NheSwgZXhwbGFpbiBob3cgdG8gc3RydWN0dXJlIHRoZSBhcmd1bWVudCwgbm90IHRoZSBlc3NheS4gSWYgdGhleSBhc2tlZCB3aGF0IGEgdGVybSBtZWFucywgZXhwbGFpbmluZyB0aGUgdGVybSBpcyBmaW5lLCB0aGF0IGlzIHRoZSBjb25jZXB0LlxuLSBJbmNsdWRlIG9uZSBjb25jcmV0ZSBleGFtcGxlIHRoYXQgaXMgZGlmZmVyZW50IGZyb20gdGhlIHVzZXIncyBleGFjdCBxdWVzdGlvbi5cblxuUnVsZXMgZm9yIHRoZSBxdWVzdGlvbnM6XG4tIFRlc3QgdGhlIGNvbmNlcHQsIG5vdCB0cml2aWEgYWJvdXQgeW91ciB3b3JkaW5nLlxuLSBFeGFjdGx5ICR7cXVlc3Rpb25zUGVyR2F0ZX0gcXVlc3Rpb24ke3F1ZXN0aW9uc1BlckdhdGUgPT09IDEgPyAnJyA6ICdzJ30sIGVhY2ggd2l0aCA0IGNob2ljZXMsIGV4YWN0bHkgb25lIGNvcnJlY3QsIGRpc3RyYWN0b3JzIHBsYXVzaWJsZS5cbi0gQSBzdHVkZW50IHdobyByZWFkIHRoZSBleHBsYW5hdGlvbiBjYXJlZnVsbHkgc2hvdWxkIGdldCB0aGVtIHJpZ2h0LiBBIHN0dWRlbnQgd2hvIHNraW1tZWQgc2hvdWxkIG5vdC5cblxuUmVwbHkgd2l0aCBvbmx5IGEgSlNPTiBvYmplY3QsIG5vIHByb3NlOlxue1wiY29uY2VwdFwiOlwic3RyaW5nXCIsXCJleHBsYW5hdGlvblwiOlwic3RyaW5nXCIsXCJxdWVzdGlvbnNcIjpbe1wicVwiOlwic3RyaW5nXCIsXCJjaG9pY2VzXCI6W1wiYVwiLFwiYlwiLFwiY1wiLFwiZFwiXSxcImFuc3dlclwiOjB9XX1gO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2F0ZVVzZXJQcm9tcHQocHJvbXB0OiBzdHJpbmcsIGNvbmNlcHQ6IHN0cmluZywgc3ViamVjdDogc3RyaW5nIHwgbnVsbCk6IHN0cmluZyB7XG4gIHJldHVybiBgQ29uY2VwdCB0byB0ZWFjaDogJHtjb25jZXB0fSR7c3ViamVjdCA/IGBcXG5TdWJqZWN0OiAke3N1YmplY3R9YCA6ICcnfVxcblxcblRoZSB1c2VyJ3Mgb3JpZ2luYWwgcHJvbXB0LCBmb3IgY29udGV4dCBvbmx5IChkbyBub3QgYW5zd2VyIGl0KTpcXG48cHJvbXB0PlxcbiR7cHJvbXB0fVxcbjwvcHJvbXB0PmA7XG59XG4iLCAiLyoqIFB1bGxzIHRoZSBmaXJzdCBKU09OIG9iamVjdCBvdXQgb2YgYSBtb2RlbCByZXBseSwgdG9sZXJhdGluZyBjb2RlIGZlbmNlcyBhbmQgY2hhdHRlci4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0SnNvbjxUID0gdW5rbm93bj4odGV4dDogc3RyaW5nKTogVCB7XG4gIGNvbnN0IGZlbmNlZCA9IHRleHQubWF0Y2goL2BgYCg/Ompzb24pP1xccyooW1xcc1xcU10qPylgYGAvaSk7XG4gIGNvbnN0IGNhbmRpZGF0ZSA9IGZlbmNlZD8uWzFdID8/IHRleHQ7XG4gIGNvbnN0IHN0YXJ0ID0gY2FuZGlkYXRlLmluZGV4T2YoJ3snKTtcbiAgaWYgKHN0YXJ0ID09PSAtMSkgdGhyb3cgbmV3IEVycm9yKCdubyBKU09OIG9iamVjdCBpbiByZXBseScpO1xuICAvLyBXYWxrIHRvIHRoZSBtYXRjaGluZyBjbG9zZSBicmFjZSBzbyB0cmFpbGluZyBwcm9zZSBkb2VzIG5vdCBicmVhayBwYXJzaW5nLlxuICBsZXQgZGVwdGggPSAwO1xuICBsZXQgaW5TdHJpbmcgPSBmYWxzZTtcbiAgbGV0IGVzY2FwZWQgPSBmYWxzZTtcbiAgZm9yIChsZXQgaSA9IHN0YXJ0OyBpIDwgY2FuZGlkYXRlLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgY2ggPSBjYW5kaWRhdGVbaV07XG4gICAgaWYgKGluU3RyaW5nKSB7XG4gICAgICBpZiAoZXNjYXBlZCkgZXNjYXBlZCA9IGZhbHNlO1xuICAgICAgZWxzZSBpZiAoY2ggPT09ICdcXFxcJykgZXNjYXBlZCA9IHRydWU7XG4gICAgICBlbHNlIGlmIChjaCA9PT0gJ1wiJykgaW5TdHJpbmcgPSBmYWxzZTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBpZiAoY2ggPT09ICdcIicpIGluU3RyaW5nID0gdHJ1ZTtcbiAgICBlbHNlIGlmIChjaCA9PT0gJ3snKSBkZXB0aCsrO1xuICAgIGVsc2UgaWYgKGNoID09PSAnfScpIHtcbiAgICAgIGRlcHRoLS07XG4gICAgICBpZiAoZGVwdGggPT09IDApIHJldHVybiBKU09OLnBhcnNlKGNhbmRpZGF0ZS5zbGljZShzdGFydCwgaSArIDEpKSBhcyBUO1xuICAgIH1cbiAgfVxuICB0aHJvdyBuZXcgRXJyb3IoJ3VudGVybWluYXRlZCBKU09OIG9iamVjdCBpbiByZXBseScpO1xufVxuIiwgImltcG9ydCB0eXBlIHsgQ2xhc3NpZmljYXRpb24sIFByb3ZpZGVyLCBTZXR0aW5ncywgU3RyaWN0bmVzcywgVmVyZGljdCB9IGZyb20gJy4vdHlwZXMudHMnO1xuaW1wb3J0IHsgY2xhc3NpZmllclN5c3RlbVByb21wdCwgY2xhc3NpZmllclVzZXJQcm9tcHQgfSBmcm9tICcuL3Byb21wdHMudHMnO1xuaW1wb3J0IHsgZXh0cmFjdEpzb24gfSBmcm9tICcuL2pzb24udHMnO1xuXG5jb25zdCBWRVJESUNUUzogVmVyZGljdFtdID0gWydMQVpZJywgJ0xFR0lUJywgJ0VER0UnXTtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNsYXNzaWZ5KFxuICBwcm9tcHQ6IHN0cmluZyxcbiAgc2V0dGluZ3M6IFBpY2s8U2V0dGluZ3MsICdzdWJqZWN0cycgfCAnc3RyaWN0bmVzcyc+LFxuICBwcm92aWRlcjogUHJvdmlkZXIsXG4pOiBQcm9taXNlPENsYXNzaWZpY2F0aW9uPiB7XG4gIGNvbnN0IHJhdyA9IGF3YWl0IHByb3ZpZGVyLmNvbXBsZXRlKHtcbiAgICBzeXN0ZW06IGNsYXNzaWZpZXJTeXN0ZW1Qcm9tcHQoc2V0dGluZ3MpLFxuICAgIHVzZXI6IGNsYXNzaWZpZXJVc2VyUHJvbXB0KHByb21wdCksXG4gICAgbWF4VG9rZW5zOiAyMDAsXG4gIH0pO1xuICByZXR1cm4gbm9ybWFsaXplQ2xhc3NpZmljYXRpb24oZXh0cmFjdEpzb248UGFydGlhbDxDbGFzc2lmaWNhdGlvbj4+KHJhdykpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplQ2xhc3NpZmljYXRpb24oYzogUGFydGlhbDxDbGFzc2lmaWNhdGlvbj4pOiBDbGFzc2lmaWNhdGlvbiB7XG4gIGNvbnN0IHZlcmRpY3QgPSBWRVJESUNUUy5pbmNsdWRlcyhjLnZlcmRpY3QgYXMgVmVyZGljdCkgPyAoYy52ZXJkaWN0IGFzIFZlcmRpY3QpIDogJ0VER0UnO1xuICBjb25zdCBjb25maWRlbmNlID0gY2xhbXAoTnVtYmVyKGMuY29uZmlkZW5jZSksIDAsIDEsIDAuNSk7XG4gIGNvbnN0IGNvbmNlcHQgPSB0eXBlb2YgYy5jb25jZXB0ID09PSAnc3RyaW5nJyAmJiBjLmNvbmNlcHQudHJpbSgpID8gYy5jb25jZXB0LnRyaW0oKSA6IG51bGw7XG4gIGNvbnN0IHN1YmplY3QgPSB0eXBlb2YgYy5zdWJqZWN0ID09PSAnc3RyaW5nJyAmJiBjLnN1YmplY3QudHJpbSgpID8gYy5zdWJqZWN0LnRyaW0oKSA6IG51bGw7XG4gIGNvbnN0IHJlYXNvbiA9IHR5cGVvZiBjLnJlYXNvbiA9PT0gJ3N0cmluZycgPyBjLnJlYXNvbi50cmltKCkgOiAnJztcbiAgcmV0dXJuIHsgdmVyZGljdCwgY29uZmlkZW5jZSwgY29uY2VwdDogdmVyZGljdCA9PT0gJ0xFR0lUJyA/IG51bGwgOiBjb25jZXB0LCBzdWJqZWN0LCByZWFzb24gfTtcbn1cblxuLyoqXG4gKiBUaGUgb25lIHBsYWNlIHRoZSBzdHJpY3RuZXNzIHBvbGljeSBsaXZlcy5cbiAqIGxlbmllbnQ6IGdhdGUgb25seSBjb25maWRlbnQgTEFaWS5cbiAqIG5vcm1hbDogIGdhdGUgTEFaWSB1bmxlc3MgdGhlIG1vZGVsIGlzIHVuc3VyZS5cbiAqIHN0cmljdDogIGdhdGUgTEFaWSBhbmQgRURHRS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNob3VsZEdhdGUoYzogQ2xhc3NpZmljYXRpb24sIHN0cmljdG5lc3M6IFN0cmljdG5lc3MpOiBib29sZWFuIHtcbiAgaWYgKGMudmVyZGljdCA9PT0gJ0xFR0lUJykgcmV0dXJuIGZhbHNlO1xuICBpZiAoYy52ZXJkaWN0ID09PSAnRURHRScpIHJldHVybiBzdHJpY3RuZXNzID09PSAnc3RyaWN0JztcbiAgc3dpdGNoIChzdHJpY3RuZXNzKSB7XG4gICAgY2FzZSAnbGVuaWVudCc6XG4gICAgICByZXR1cm4gYy5jb25maWRlbmNlID49IDAuODtcbiAgICBjYXNlICdub3JtYWwnOlxuICAgICAgcmV0dXJuIGMuY29uZmlkZW5jZSA+PSAwLjY7XG4gICAgY2FzZSAnc3RyaWN0JzpcbiAgICAgIHJldHVybiB0cnVlO1xuICB9XG59XG5cbmZ1bmN0aW9uIGNsYW1wKG46IG51bWJlciwgbG86IG51bWJlciwgaGk6IG51bWJlciwgZmFsbGJhY2s6IG51bWJlcik6IG51bWJlciB7XG4gIGlmICghTnVtYmVyLmlzRmluaXRlKG4pKSByZXR1cm4gZmFsbGJhY2s7XG4gIHJldHVybiBNYXRoLm1pbihoaSwgTWF0aC5tYXgobG8sIG4pKTtcbn1cbiIsICJpbXBvcnQgdHlwZSB7IEdhdGVDYXJkLCBQcm92aWRlciwgUXVpelF1ZXN0aW9uIH0gZnJvbSAnLi90eXBlcy50cyc7XG5pbXBvcnQgeyBnYXRlU3lzdGVtUHJvbXB0LCBnYXRlVXNlclByb21wdCB9IGZyb20gJy4vcHJvbXB0cy50cyc7XG5pbXBvcnQgeyBleHRyYWN0SnNvbiB9IGZyb20gJy4vanNvbi50cyc7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBidWlsZEdhdGVDYXJkKFxuICBwcm9tcHQ6IHN0cmluZyxcbiAgY29uY2VwdDogc3RyaW5nLFxuICBzdWJqZWN0OiBzdHJpbmcgfCBudWxsLFxuICBxdWVzdGlvbnNQZXJHYXRlOiBudW1iZXIsXG4gIHByb3ZpZGVyOiBQcm92aWRlcixcbik6IFByb21pc2U8R2F0ZUNhcmQ+IHtcbiAgY29uc3QgcmF3ID0gYXdhaXQgcHJvdmlkZXIuY29tcGxldGUoe1xuICAgIHN5c3RlbTogZ2F0ZVN5c3RlbVByb21wdChxdWVzdGlvbnNQZXJHYXRlKSxcbiAgICB1c2VyOiBnYXRlVXNlclByb21wdChwcm9tcHQsIGNvbmNlcHQsIHN1YmplY3QpLFxuICAgIG1heFRva2VuczogOTAwLFxuICB9KTtcbiAgcmV0dXJuIG5vcm1hbGl6ZUdhdGVDYXJkKGV4dHJhY3RKc29uPFBhcnRpYWw8R2F0ZUNhcmQ+PihyYXcpLCBjb25jZXB0LCBxdWVzdGlvbnNQZXJHYXRlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG5vcm1hbGl6ZUdhdGVDYXJkKGNhcmQ6IFBhcnRpYWw8R2F0ZUNhcmQ+LCBmYWxsYmFja0NvbmNlcHQ6IHN0cmluZywgcXVlc3Rpb25zUGVyR2F0ZTogbnVtYmVyKTogR2F0ZUNhcmQge1xuICBjb25zdCBjb25jZXB0ID0gdHlwZW9mIGNhcmQuY29uY2VwdCA9PT0gJ3N0cmluZycgJiYgY2FyZC5jb25jZXB0LnRyaW0oKSA/IGNhcmQuY29uY2VwdC50cmltKCkgOiBmYWxsYmFja0NvbmNlcHQ7XG4gIGNvbnN0IGV4cGxhbmF0aW9uID0gdHlwZW9mIGNhcmQuZXhwbGFuYXRpb24gPT09ICdzdHJpbmcnID8gY2FyZC5leHBsYW5hdGlvbi50cmltKCkgOiAnJztcbiAgaWYgKCFleHBsYW5hdGlvbikgdGhyb3cgbmV3IEVycm9yKCdnYXRlIGNhcmQgbWlzc2luZyBleHBsYW5hdGlvbicpO1xuICBjb25zdCBxdWVzdGlvbnMgPSAoQXJyYXkuaXNBcnJheShjYXJkLnF1ZXN0aW9ucykgPyBjYXJkLnF1ZXN0aW9ucyA6IFtdKVxuICAgIC5tYXAobm9ybWFsaXplUXVlc3Rpb24pXG4gICAgLmZpbHRlcigocSk6IHEgaXMgUXVpelF1ZXN0aW9uID0+IHEgIT09IG51bGwpXG4gICAgLnNsaWNlKDAsIHF1ZXN0aW9uc1BlckdhdGUpO1xuICBpZiAocXVlc3Rpb25zLmxlbmd0aCA9PT0gMCkgdGhyb3cgbmV3IEVycm9yKCdnYXRlIGNhcmQgaGFzIG5vIHVzYWJsZSBxdWVzdGlvbnMnKTtcbiAgcmV0dXJuIHsgY29uY2VwdCwgZXhwbGFuYXRpb24sIHF1ZXN0aW9ucyB9O1xufVxuXG5mdW5jdGlvbiBub3JtYWxpemVRdWVzdGlvbihxOiB1bmtub3duKTogUXVpelF1ZXN0aW9uIHwgbnVsbCB7XG4gIGlmICghcSB8fCB0eXBlb2YgcSAhPT0gJ29iamVjdCcpIHJldHVybiBudWxsO1xuICBjb25zdCB7IHE6IHRleHQsIGNob2ljZXMsIGFuc3dlciB9ID0gcSBhcyBQYXJ0aWFsPFF1aXpRdWVzdGlvbj47XG4gIGlmICh0eXBlb2YgdGV4dCAhPT0gJ3N0cmluZycgfHwgIXRleHQudHJpbSgpKSByZXR1cm4gbnVsbDtcbiAgaWYgKCFBcnJheS5pc0FycmF5KGNob2ljZXMpIHx8IGNob2ljZXMubGVuZ3RoIDwgMikgcmV0dXJuIG51bGw7XG4gIGNvbnN0IGNsZWFuID0gY2hvaWNlcy5tYXAoKGMpID0+IFN0cmluZyhjKS50cmltKCkpLmZpbHRlcihCb29sZWFuKTtcbiAgY29uc3QgaWR4ID0gTnVtYmVyKGFuc3dlcik7XG4gIGlmICghTnVtYmVyLmlzSW50ZWdlcihpZHgpIHx8IGlkeCA8IDAgfHwgaWR4ID49IGNsZWFuLmxlbmd0aCkgcmV0dXJuIG51bGw7XG4gIHJldHVybiB7IHE6IHRleHQudHJpbSgpLCBjaG9pY2VzOiBjbGVhbiwgYW5zd2VyOiBpZHggfTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBHcmFkZVJlc3VsdCB7XG4gIGNvcnJlY3Q6IG51bWJlcjtcbiAgdG90YWw6IG51bWJlcjtcbiAgcGFzc2VkOiBib29sZWFuO1xuICAvKiogSW5kaWNlcyBvZiBxdWVzdGlvbnMgYW5zd2VyZWQgd3JvbmcuICovXG4gIG1pc3NlZDogbnVtYmVyW107XG59XG5cbi8qKiBQYXNzID0gZXZlcnkgcXVlc3Rpb24gcmlnaHQuIE9uZSBtaXNzIGlzIGEgZmFpbDsgdGhlIGNhcmQgcmUtZXhwbGFpbnMgYW5kIHRoZSB1c2VyIHJldHJpZXMuICovXG5leHBvcnQgZnVuY3Rpb24gZ3JhZGUoY2FyZDogR2F0ZUNhcmQsIGFuc3dlcnM6IEFycmF5PG51bWJlciB8IG51bGwgfCB1bmRlZmluZWQ+KTogR3JhZGVSZXN1bHQge1xuICBjb25zdCBtaXNzZWQ6IG51bWJlcltdID0gW107XG4gIGNhcmQucXVlc3Rpb25zLmZvckVhY2goKHEsIGkpID0+IHtcbiAgICBpZiAoYW5zd2Vyc1tpXSAhPT0gcS5hbnN3ZXIpIG1pc3NlZC5wdXNoKGkpO1xuICB9KTtcbiAgcmV0dXJuIHtcbiAgICBjb3JyZWN0OiBjYXJkLnF1ZXN0aW9ucy5sZW5ndGggLSBtaXNzZWQubGVuZ3RoLFxuICAgIHRvdGFsOiBjYXJkLnF1ZXN0aW9ucy5sZW5ndGgsXG4gICAgcGFzc2VkOiBtaXNzZWQubGVuZ3RoID09PSAwLFxuICAgIG1pc3NlZCxcbiAgfTtcbn1cblxuLyoqIFNodWZmbGUgY2hvaWNlcyBzbyB0aGUgY29ycmVjdCBhbnN3ZXIgaXMgbm90IGFsd2F5cyBmaXJzdC4gRGV0ZXJtaW5pc3RpYyBnaXZlbiBzZWVkLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNodWZmbGVDaG9pY2VzKGNhcmQ6IEdhdGVDYXJkLCBzZWVkID0gRGF0ZS5ub3coKSk6IEdhdGVDYXJkIHtcbiAgbGV0IHMgPSBzZWVkID4+PiAwO1xuICBjb25zdCByYW5kID0gKCkgPT4ge1xuICAgIHMgPSAocyAqIDE2NjQ1MjUgKyAxMDEzOTA0MjIzKSA+Pj4gMDtcbiAgICByZXR1cm4gcyAvIDB4MTAwMDAwMDAwO1xuICB9O1xuICByZXR1cm4ge1xuICAgIC4uLmNhcmQsXG4gICAgcXVlc3Rpb25zOiBjYXJkLnF1ZXN0aW9ucy5tYXAoKHEpID0+IHtcbiAgICAgIGNvbnN0IG9yZGVyID0gcS5jaG9pY2VzLm1hcCgoXywgaSkgPT4gaSk7XG4gICAgICBmb3IgKGxldCBpID0gb3JkZXIubGVuZ3RoIC0gMTsgaSA+IDA7IGktLSkge1xuICAgICAgICBjb25zdCBqID0gTWF0aC5mbG9vcihyYW5kKCkgKiAoaSArIDEpKTtcbiAgICAgICAgW29yZGVyW2ldLCBvcmRlcltqXV0gPSBbb3JkZXJbal0hLCBvcmRlcltpXSFdO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgcTogcS5xLFxuICAgICAgICBjaG9pY2VzOiBvcmRlci5tYXAoKGkpID0+IHEuY2hvaWNlc1tpXSEpLFxuICAgICAgICBhbnN3ZXI6IG9yZGVyLmluZGV4T2YocS5hbnN3ZXIpLFxuICAgICAgfTtcbiAgICB9KSxcbiAgfTtcbn1cbiIsICJpbXBvcnQgdHlwZSB7IFNldHRpbmdzIH0gZnJvbSAnLi90eXBlcy50cyc7XG5cbmV4cG9ydCBjb25zdCBERUZBVUxUX1NFVFRJTkdTOiBTZXR0aW5ncyA9IHtcbiAgZW5hYmxlZDogdHJ1ZSxcbiAgcHJvdmlkZXI6ICdhbnRocm9waWMnLFxuICBhcGlLZXk6ICcnLFxuICBtb2RlbDogJycsXG4gIHN0cmljdG5lc3M6ICdub3JtYWwnLFxuICBzdWJqZWN0czogW10sXG4gIGFsbG93bGlzdDogWyd3b3JrOicsICdza2lwOiddLFxuICBzaXRlczogeyBjaGF0Z3B0OiB0cnVlLCBjbGF1ZGU6IHRydWUsIGdlbWluaTogdHJ1ZSB9LFxuICBxdWVzdGlvbnNQZXJHYXRlOiAyLFxuICBoYXJkTW9kZTogeyBlbmFibGVkOiBmYWxzZSwgYmxvY2tNaW51dGVzOiAxMCwgZmFpbHNCZWZvcmVCbG9jazogMiB9LFxuICBjb25jZXB0TWVtb3J5RGF5czogNyxcbiAgcGFsZXR0ZTogJ2FtYmVyJyxcbiAgdGhlbWU6ICdkYXJrJyxcbn07XG5cbi8qKiBNZXJnZSBzdG9yZWQgcGFydGlhbCBzZXR0aW5ncyBvdmVyIGRlZmF1bHRzLCB0b2xlcmF0aW5nIG9sZGVyIHNoYXBlcy4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtZXJnZVNldHRpbmdzKHN0b3JlZDogUGFydGlhbDxTZXR0aW5ncz4gfCBudWxsIHwgdW5kZWZpbmVkKTogU2V0dGluZ3Mge1xuICBpZiAoIXN0b3JlZCkgcmV0dXJuIHsgLi4uREVGQVVMVF9TRVRUSU5HUyB9O1xuICByZXR1cm4ge1xuICAgIC4uLkRFRkFVTFRfU0VUVElOR1MsXG4gICAgLi4uc3RvcmVkLFxuICAgIHNpdGVzOiB7IC4uLkRFRkFVTFRfU0VUVElOR1Muc2l0ZXMsIC4uLihzdG9yZWQuc2l0ZXMgPz8ge30pIH0sXG4gICAgaGFyZE1vZGU6IHsgLi4uREVGQVVMVF9TRVRUSU5HUy5oYXJkTW9kZSwgLi4uKHN0b3JlZC5oYXJkTW9kZSA/PyB7fSkgfSxcbiAgICBzdWJqZWN0czogQXJyYXkuaXNBcnJheShzdG9yZWQuc3ViamVjdHMpID8gc3RvcmVkLnN1YmplY3RzIDogREVGQVVMVF9TRVRUSU5HUy5zdWJqZWN0cyxcbiAgICBhbGxvd2xpc3Q6IEFycmF5LmlzQXJyYXkoc3RvcmVkLmFsbG93bGlzdCkgPyBzdG9yZWQuYWxsb3dsaXN0IDogREVGQVVMVF9TRVRUSU5HUy5hbGxvd2xpc3QsXG4gIH07XG59XG5cbi8qKiBUcnVlIHdoZW4gdGhlIHByb21wdCBzdGFydHMgd2l0aCAob3IgY29udGFpbnMpIGFuIGFsbG93bGlzdGVkIHBocmFzZS4gTm8gbW9kZWwgY2FsbC4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0FsbG93bGlzdGVkKHByb21wdDogc3RyaW5nLCBhbGxvd2xpc3Q6IHN0cmluZ1tdKTogYm9vbGVhbiB7XG4gIGNvbnN0IHAgPSBwcm9tcHQudHJpbSgpLnRvTG93ZXJDYXNlKCk7XG4gIGlmICghcCkgcmV0dXJuIHRydWU7XG4gIHJldHVybiBhbGxvd2xpc3Quc29tZSgoZW50cnkpID0+IHtcbiAgICBjb25zdCBlID0gZW50cnkudHJpbSgpLnRvTG93ZXJDYXNlKCk7XG4gICAgaWYgKCFlKSByZXR1cm4gZmFsc2U7XG4gICAgLy8gRW50cmllcyBlbmRpbmcgaW4gJzonIGFyZSBwcmVmaXhlcyAoXCJ3b3JrOlwiKS4gT3RoZXJzIG1hdGNoIGFueXdoZXJlLlxuICAgIHJldHVybiBlLmVuZHNXaXRoKCc6JykgPyBwLnN0YXJ0c1dpdGgoZSkgOiBwLmluY2x1ZGVzKGUpO1xuICB9KTtcbn1cblxuLyoqIFN0cmlwcyBhIG1hdGNoZWQgYWxsb3dsaXN0IHByZWZpeCBzbyB0aGUgdXNlciBkb2VzIG5vdCBzZW5kIFwid29yazpcIiB0byB0aGUgY2hhdC4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdHJpcEFsbG93bGlzdFByZWZpeChwcm9tcHQ6IHN0cmluZywgYWxsb3dsaXN0OiBzdHJpbmdbXSk6IHN0cmluZyB7XG4gIGNvbnN0IHRyaW1tZWQgPSBwcm9tcHQudHJpbVN0YXJ0KCk7XG4gIGNvbnN0IGxvd2VyID0gdHJpbW1lZC50b0xvd2VyQ2FzZSgpO1xuICBmb3IgKGNvbnN0IGVudHJ5IG9mIGFsbG93bGlzdCkge1xuICAgIGNvbnN0IGUgPSBlbnRyeS50cmltKCkudG9Mb3dlckNhc2UoKTtcbiAgICBpZiAoZS5lbmRzV2l0aCgnOicpICYmIGxvd2VyLnN0YXJ0c1dpdGgoZSkpIHJldHVybiB0cmltbWVkLnNsaWNlKGUubGVuZ3RoKS50cmltU3RhcnQoKTtcbiAgfVxuICByZXR1cm4gcHJvbXB0O1xufVxuIiwgImltcG9ydCB0eXBlIHsgQ29uY2VwdE1lbW9yeSwgU3RhdHMsIFN0YXRzRXZlbnQgfSBmcm9tICcuL3R5cGVzLnRzJztcblxuZXhwb3J0IGNvbnN0IEVNUFRZX1NUQVRTOiBTdGF0cyA9IHtcbiAgdG90YWw6IDAsXG4gIGdhdGVkOiAwLFxuICBwYXNzZWQ6IDAsXG4gIGZhaWxlZDogMCxcbiAgc2tpcHBlZDogMCxcbiAgYmxvY2tlZDogMCxcbiAgYWxsb3dsaXN0ZWQ6IDAsXG4gIHJlbWVtYmVyZWQ6IDAsXG4gIHN0cmVhazogMCxcbiAgYmVzdFN0cmVhazogMCxcbiAgcmVjZW50OiBbXSxcbn07XG5cbmNvbnN0IFJFQ0VOVF9DQVAgPSAyMDA7XG5cbi8qKiBQdXJlIHJlZHVjZXIuIFN0b3JhZ2UgbGF5ZXJzIHBlcnNpc3QgdGhlIHJlc3VsdC4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhcHBseUV2ZW50KHN0YXRzOiBTdGF0cywgZXY6IFN0YXRzRXZlbnQpOiBTdGF0cyB7XG4gIGNvbnN0IG5leHQ6IFN0YXRzID0geyAuLi5zdGF0cywgcmVjZW50OiBbLi4uc3RhdHMucmVjZW50LCBldl0uc2xpY2UoLVJFQ0VOVF9DQVApIH07XG4gIG5leHQudG90YWwgKz0gMTtcbiAgaWYgKGV2LmdhdGVkKSBuZXh0LmdhdGVkICs9IDE7XG4gIHN3aXRjaCAoZXYub3V0Y29tZSkge1xuICAgIGNhc2UgJ3Bhc3NlZCc6XG4gICAgICBuZXh0LnBhc3NlZCArPSAxO1xuICAgICAgbmV4dC5zdHJlYWsgKz0gMTtcbiAgICAgIG5leHQuYmVzdFN0cmVhayA9IE1hdGgubWF4KG5leHQuYmVzdFN0cmVhaywgbmV4dC5zdHJlYWspO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnZmFpbGVkJzpcbiAgICAgIG5leHQuZmFpbGVkICs9IDE7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdza2lwcGVkJzpcbiAgICAgIG5leHQuc2tpcHBlZCArPSAxO1xuICAgICAgbmV4dC5zdHJlYWsgPSAwO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnYmxvY2tlZCc6XG4gICAgICBuZXh0LmJsb2NrZWQgKz0gMTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2FsbG93bGlzdGVkJzpcbiAgICAgIG5leHQuYWxsb3dsaXN0ZWQgKz0gMTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3JlbWVtYmVyZWQnOlxuICAgICAgbmV4dC5yZW1lbWJlcmVkICs9IDE7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdyZWxlYXNlZCc6XG4gICAgICBicmVhaztcbiAgfVxuICByZXR1cm4gbmV4dDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG5vcm1hbGl6ZVN0YXRzKHM6IFBhcnRpYWw8U3RhdHM+IHwgbnVsbCB8IHVuZGVmaW5lZCk6IFN0YXRzIHtcbiAgcmV0dXJuIHsgLi4uRU1QVFlfU1RBVFMsIC4uLihzID8/IHt9KSwgcmVjZW50OiBBcnJheS5pc0FycmF5KHM/LnJlY2VudCkgPyBzLnJlY2VudCA6IFtdIH07XG59XG5cbi8qKiBTY3JlZW5aZW4tc3R5bGUgXCJob3cgb2Z0ZW4gZGlkIHRoZSBnYXRlIGhvbGRcIi4gKi9cbmV4cG9ydCBmdW5jdGlvbiBob2xkUmF0ZShzdGF0czogU3RhdHMpOiBudW1iZXIge1xuICBjb25zdCBkZWNpZGVkID0gc3RhdHMucGFzc2VkICsgc3RhdHMuc2tpcHBlZDtcbiAgcmV0dXJuIGRlY2lkZWQgPT09IDAgPyAwIDogc3RhdHMucGFzc2VkIC8gZGVjaWRlZDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNvbmNlcHRLZXkoY29uY2VwdDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGNvbmNlcHQudHJpbSgpLnRvTG93ZXJDYXNlKCkucmVwbGFjZSgvXFxzKy9nLCAnICcpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVtZW1iZXJQYXNzKG1lbW9yeTogQ29uY2VwdE1lbW9yeSwgY29uY2VwdDogc3RyaW5nLCBub3cgPSBEYXRlLm5vdygpKTogQ29uY2VwdE1lbW9yeSB7XG4gIGNvbnN0IGtleSA9IGNvbmNlcHRLZXkoY29uY2VwdCk7XG4gIGNvbnN0IHByZXYgPSBtZW1vcnlba2V5XTtcbiAgcmV0dXJuIHsgLi4ubWVtb3J5LCBba2V5XTogeyBwYXNzZWRBdDogbm93LCBwYXNzZXM6IChwcmV2Py5wYXNzZXMgPz8gMCkgKyAxIH0gfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzUmVtZW1iZXJlZChtZW1vcnk6IENvbmNlcHRNZW1vcnksIGNvbmNlcHQ6IHN0cmluZywgZGF5czogbnVtYmVyLCBub3cgPSBEYXRlLm5vdygpKTogYm9vbGVhbiB7XG4gIGlmIChkYXlzIDw9IDApIHJldHVybiBmYWxzZTtcbiAgY29uc3QgZW50cnkgPSBtZW1vcnlbY29uY2VwdEtleShjb25jZXB0KV07XG4gIGlmICghZW50cnkpIHJldHVybiBmYWxzZTtcbiAgcmV0dXJuIG5vdyAtIGVudHJ5LnBhc3NlZEF0IDwgZGF5cyAqIDI0ICogNjAgKiA2MCAqIDEwMDA7XG59XG5cbi8qKiBDb25jZXB0cyBzb3J0ZWQgYnkgbW9zdCByZWNlbnQgcGFzcywgZm9yIHRoZSBkYXNoYm9hcmQuICovXG5leHBvcnQgZnVuY3Rpb24gbGlzdENvbmNlcHRzKG1lbW9yeTogQ29uY2VwdE1lbW9yeSk6IEFycmF5PHsgY29uY2VwdDogc3RyaW5nOyBwYXNzZWRBdDogbnVtYmVyOyBwYXNzZXM6IG51bWJlciB9PiB7XG4gIHJldHVybiBPYmplY3QuZW50cmllcyhtZW1vcnkpXG4gICAgLm1hcCgoW2NvbmNlcHQsIHZdKSA9PiAoeyBjb25jZXB0LCAuLi52IH0pKVxuICAgIC5zb3J0KChhLCBiKSA9PiBiLnBhc3NlZEF0IC0gYS5wYXNzZWRBdCk7XG59XG4iLCAiaW1wb3J0IHR5cGUge1xuICBCbG9ja1N0YXRlLFxuICBDbGFzc2lmaWNhdGlvbixcbiAgQ29uY2VwdE1lbW9yeSxcbiAgR2F0ZUNhcmQsXG4gIE91dGNvbWUsXG4gIFByb3ZpZGVyLFxuICBTZXR0aW5ncyxcbiAgU3RhdHNFdmVudCxcbn0gZnJvbSAnLi90eXBlcy50cyc7XG5pbXBvcnQgeyBjbGFzc2lmeSwgc2hvdWxkR2F0ZSB9IGZyb20gJy4vY2xhc3NpZnkudHMnO1xuaW1wb3J0IHsgYnVpbGRHYXRlQ2FyZCwgZ3JhZGUsIHNodWZmbGVDaG9pY2VzIH0gZnJvbSAnLi9nYXRlLnRzJztcbmltcG9ydCB7IGlzQWxsb3dsaXN0ZWQsIHN0cmlwQWxsb3dsaXN0UHJlZml4IH0gZnJvbSAnLi9zZXR0aW5ncy50cyc7XG5pbXBvcnQgeyBpc1JlbWVtYmVyZWQgfSBmcm9tICcuL3N0YXRzLnRzJztcblxuLyoqXG4gKiBPbmUgcHJvbXB0J3Mgam91cm5leSB0aHJvdWdoIHRoZSBnYXRlLiBQdXJlLWlzaDogdGhlIGNhbGxlciBzdXBwbGllcyB0aGUgcHJvdmlkZXIsXG4gKiBzZXR0aW5ncywgbWVtb3J5LCBhbmQgYmxvY2sgc3RhdGUsIGFuZCByZWNlaXZlcyBldmVudHMgdG8gcGVyc2lzdC4gVUkgbGF5ZXJzXG4gKiAoZXh0ZW5zaW9uIG92ZXJsYXksIHdlYiBhcHApIHJlbmRlciBgc3RhdGVgIGFuZCBjYWxsIHRoZSB0cmFuc2l0aW9uIG1ldGhvZHMuXG4gKi9cbmV4cG9ydCB0eXBlIFNlc3Npb25TdGF0ZSA9XG4gIHwgeyBraW5kOiAnaWRsZScgfVxuICB8IHsga2luZDogJ2NsYXNzaWZ5aW5nJyB9XG4gIHwgeyBraW5kOiAncmVsZWFzZSc7IHByb21wdDogc3RyaW5nOyBvdXRjb21lOiBPdXRjb21lOyBjbGFzc2lmaWNhdGlvbjogQ2xhc3NpZmljYXRpb24gfCBudWxsIH1cbiAgfCB7IGtpbmQ6ICdibG9ja2VkJzsgdW50aWw6IG51bWJlcjsgY2xhc3NpZmljYXRpb246IENsYXNzaWZpY2F0aW9uIH1cbiAgfCB7IGtpbmQ6ICdsb2FkaW5nLWNhcmQnOyBjbGFzc2lmaWNhdGlvbjogQ2xhc3NpZmljYXRpb24gfVxuICB8IHsga2luZDogJ2V4cGxhaW4nOyBjYXJkOiBHYXRlQ2FyZDsgY2xhc3NpZmljYXRpb246IENsYXNzaWZpY2F0aW9uOyBhdHRlbXB0czogbnVtYmVyOyBtaXNzZWQ6IG51bWJlcltdIH1cbiAgfCB7IGtpbmQ6ICdxdWl6JzsgY2FyZDogR2F0ZUNhcmQ7IGNsYXNzaWZpY2F0aW9uOiBDbGFzc2lmaWNhdGlvbjsgYXR0ZW1wdHM6IG51bWJlciB9XG4gIHwgeyBraW5kOiAnZXJyb3InOyBtZXNzYWdlOiBzdHJpbmc7IHByb21wdDogc3RyaW5nIH07XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2Vzc2lvbkRlcHMge1xuICBwcm92aWRlcjogUHJvdmlkZXI7XG4gIHNldHRpbmdzOiBTZXR0aW5ncztcbiAgbWVtb3J5OiBDb25jZXB0TWVtb3J5O1xuICBibG9jazogQmxvY2tTdGF0ZSB8IG51bGw7XG4gIHNpdGU6IHN0cmluZztcbiAgbm93PzogKCkgPT4gbnVtYmVyO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFNlc3Npb25SZXN1bHQge1xuICBzdGF0ZTogU2Vzc2lvblN0YXRlO1xuICBldmVudD86IFN0YXRzRXZlbnQ7XG4gIC8qKiBTZXQgd2hlbiB0aGUgY29uY2VwdCBzaG91bGQgYmUgcmVjb3JkZWQgYXMgcGFzc2VkLiAqL1xuICByZW1lbWJlckNvbmNlcHQ/OiBzdHJpbmc7XG4gIC8qKiBTZXQgd2hlbiBoYXJkIG1vZGUganVzdCB0cmlwcGVkLiAqL1xuICBibG9jaz86IEJsb2NrU3RhdGU7XG59XG5cbmV4cG9ydCBjbGFzcyBHYXRlU2Vzc2lvbiB7XG4gIHN0YXRlOiBTZXNzaW9uU3RhdGUgPSB7IGtpbmQ6ICdpZGxlJyB9O1xuICBwcml2YXRlIHByb21wdCA9ICcnO1xuICBwcml2YXRlIHJlYWRvbmx5IG5vdzogKCkgPT4gbnVtYmVyO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgZGVwczogU2Vzc2lvbkRlcHMpIHtcbiAgICB0aGlzLm5vdyA9IGRlcHMubm93ID8/ICgoKSA9PiBEYXRlLm5vdygpKTtcbiAgfVxuXG4gIC8qKiBTdGVwIDEuIERlY2lkZSB3aGV0aGVyIHRoaXMgcHJvbXB0IG5lZWRzIGEgZ2F0ZS4gKi9cbiAgYXN5bmMgc3VibWl0KHByb21wdDogc3RyaW5nKTogUHJvbWlzZTxTZXNzaW9uUmVzdWx0PiB7XG4gICAgdGhpcy5wcm9tcHQgPSBwcm9tcHQ7XG4gICAgY29uc3QgeyBzZXR0aW5ncywgbWVtb3J5LCBibG9jaywgc2l0ZSB9ID0gdGhpcy5kZXBzO1xuICAgIGNvbnN0IHRzID0gdGhpcy5ub3coKTtcblxuICAgIGlmICghc2V0dGluZ3MuZW5hYmxlZCkge1xuICAgICAgcmV0dXJuIHRoaXMucmVsZWFzZShwcm9tcHQsICdyZWxlYXNlZCcsIG51bGwsIGZhbHNlKTtcbiAgICB9XG4gICAgaWYgKGlzQWxsb3dsaXN0ZWQocHJvbXB0LCBzZXR0aW5ncy5hbGxvd2xpc3QpKSB7XG4gICAgICByZXR1cm4gdGhpcy5yZWxlYXNlKHN0cmlwQWxsb3dsaXN0UHJlZml4KHByb21wdCwgc2V0dGluZ3MuYWxsb3dsaXN0KSwgJ2FsbG93bGlzdGVkJywgbnVsbCwgZmFsc2UpO1xuICAgIH1cbiAgICBpZiAoYmxvY2sgJiYgYmxvY2sudW50aWwgPiB0cykge1xuICAgICAgY29uc3QgY2xhc3NpZmljYXRpb246IENsYXNzaWZpY2F0aW9uID0ge1xuICAgICAgICB2ZXJkaWN0OiAnTEFaWScsXG4gICAgICAgIGNvbmZpZGVuY2U6IDEsXG4gICAgICAgIGNvbmNlcHQ6IG51bGwsXG4gICAgICAgIHN1YmplY3Q6IG51bGwsXG4gICAgICAgIHJlYXNvbjogJ0hhcmQgbW9kZSBibG9jayBpcyBhY3RpdmUuJyxcbiAgICAgIH07XG4gICAgICB0aGlzLnN0YXRlID0geyBraW5kOiAnYmxvY2tlZCcsIHVudGlsOiBibG9jay51bnRpbCwgY2xhc3NpZmljYXRpb24gfTtcbiAgICAgIHJldHVybiB7IHN0YXRlOiB0aGlzLnN0YXRlLCBldmVudDogeyB0cywgc2l0ZSwgdmVyZGljdDogJ0xBWlknLCBnYXRlZDogdHJ1ZSwgb3V0Y29tZTogJ2Jsb2NrZWQnIH0gfTtcbiAgICB9XG5cbiAgICB0aGlzLnN0YXRlID0geyBraW5kOiAnY2xhc3NpZnlpbmcnIH07XG4gICAgbGV0IGNsYXNzaWZpY2F0aW9uOiBDbGFzc2lmaWNhdGlvbjtcbiAgICB0cnkge1xuICAgICAgY2xhc3NpZmljYXRpb24gPSBhd2FpdCBjbGFzc2lmeShwcm9tcHQsIHNldHRpbmdzLCB0aGlzLmRlcHMucHJvdmlkZXIpO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgLy8gTmV2ZXIgdHJhcCB0aGUgdXNlciBiZWhpbmQgYSBicm9rZW4gY2xhc3NpZmllci4gRmFpbCBvcGVuLCBidXQgc2F5IHNvLlxuICAgICAgdGhpcy5zdGF0ZSA9IHsga2luZDogJ2Vycm9yJywgbWVzc2FnZTogZXJyb3JNZXNzYWdlKGVyciksIHByb21wdCB9O1xuICAgICAgcmV0dXJuIHsgc3RhdGU6IHRoaXMuc3RhdGUsIGV2ZW50OiB7IHRzLCBzaXRlLCB2ZXJkaWN0OiBudWxsLCBnYXRlZDogZmFsc2UsIG91dGNvbWU6ICdyZWxlYXNlZCcgfSB9O1xuICAgIH1cblxuICAgIGlmICghc2hvdWxkR2F0ZShjbGFzc2lmaWNhdGlvbiwgc2V0dGluZ3Muc3RyaWN0bmVzcykgfHwgIWNsYXNzaWZpY2F0aW9uLmNvbmNlcHQpIHtcbiAgICAgIHJldHVybiB0aGlzLnJlbGVhc2UocHJvbXB0LCAncmVsZWFzZWQnLCBjbGFzc2lmaWNhdGlvbiwgZmFsc2UpO1xuICAgIH1cbiAgICBpZiAoaXNSZW1lbWJlcmVkKG1lbW9yeSwgY2xhc3NpZmljYXRpb24uY29uY2VwdCwgc2V0dGluZ3MuY29uY2VwdE1lbW9yeURheXMsIHRzKSkge1xuICAgICAgcmV0dXJuIHRoaXMucmVsZWFzZShwcm9tcHQsICdyZW1lbWJlcmVkJywgY2xhc3NpZmljYXRpb24sIGZhbHNlKTtcbiAgICB9XG5cbiAgICB0aGlzLnN0YXRlID0geyBraW5kOiAnbG9hZGluZy1jYXJkJywgY2xhc3NpZmljYXRpb24gfTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgY2FyZCA9IHNodWZmbGVDaG9pY2VzKFxuICAgICAgICBhd2FpdCBidWlsZEdhdGVDYXJkKHByb21wdCwgY2xhc3NpZmljYXRpb24uY29uY2VwdCwgY2xhc3NpZmljYXRpb24uc3ViamVjdCwgc2V0dGluZ3MucXVlc3Rpb25zUGVyR2F0ZSwgdGhpcy5kZXBzLnByb3ZpZGVyKSxcbiAgICAgICAgdHMsXG4gICAgICApO1xuICAgICAgdGhpcy5zdGF0ZSA9IHsga2luZDogJ2V4cGxhaW4nLCBjYXJkLCBjbGFzc2lmaWNhdGlvbiwgYXR0ZW1wdHM6IDAsIG1pc3NlZDogW10gfTtcbiAgICAgIHJldHVybiB7IHN0YXRlOiB0aGlzLnN0YXRlIH07XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICB0aGlzLnN0YXRlID0geyBraW5kOiAnZXJyb3InLCBtZXNzYWdlOiBlcnJvck1lc3NhZ2UoZXJyKSwgcHJvbXB0IH07XG4gICAgICByZXR1cm4geyBzdGF0ZTogdGhpcy5zdGF0ZSwgZXZlbnQ6IHsgdHMsIHNpdGUsIHZlcmRpY3Q6IGNsYXNzaWZpY2F0aW9uLnZlcmRpY3QsIGdhdGVkOiBmYWxzZSwgb3V0Y29tZTogJ3JlbGVhc2VkJyB9IH07XG4gICAgfVxuICB9XG5cbiAgLyoqIFN0ZXAgMi4gVXNlciBmaW5pc2hlZCByZWFkaW5nLCBtb3ZlIHRvIHRoZSBxdWl6LiAqL1xuICBzdGFydFF1aXooKTogU2Vzc2lvblJlc3VsdCB7XG4gICAgaWYgKHRoaXMuc3RhdGUua2luZCAhPT0gJ2V4cGxhaW4nKSByZXR1cm4geyBzdGF0ZTogdGhpcy5zdGF0ZSB9O1xuICAgIGNvbnN0IHsgY2FyZCwgY2xhc3NpZmljYXRpb24sIGF0dGVtcHRzIH0gPSB0aGlzLnN0YXRlO1xuICAgIHRoaXMuc3RhdGUgPSB7IGtpbmQ6ICdxdWl6JywgY2FyZCwgY2xhc3NpZmljYXRpb24sIGF0dGVtcHRzIH07XG4gICAgcmV0dXJuIHsgc3RhdGU6IHRoaXMuc3RhdGUgfTtcbiAgfVxuXG4gIC8qKiBTdGVwIDMuIEdyYWRlLiBQYXNzIHJlbGVhc2VzIHRoZSBwcm9tcHQ7IGZhaWwgcmV0dXJucyB0byBleHBsYWluLCBvciBibG9ja3MgaW4gaGFyZCBtb2RlLiAqL1xuICBhbnN3ZXIoYW5zd2VyczogQXJyYXk8bnVtYmVyIHwgbnVsbCB8IHVuZGVmaW5lZD4pOiBTZXNzaW9uUmVzdWx0IHtcbiAgICBpZiAodGhpcy5zdGF0ZS5raW5kICE9PSAncXVpeicpIHJldHVybiB7IHN0YXRlOiB0aGlzLnN0YXRlIH07XG4gICAgY29uc3QgeyBjYXJkLCBjbGFzc2lmaWNhdGlvbiB9ID0gdGhpcy5zdGF0ZTtcbiAgICBjb25zdCBhdHRlbXB0cyA9IHRoaXMuc3RhdGUuYXR0ZW1wdHMgKyAxO1xuICAgIGNvbnN0IHJlc3VsdCA9IGdyYWRlKGNhcmQsIGFuc3dlcnMpO1xuICAgIGNvbnN0IHRzID0gdGhpcy5ub3coKTtcbiAgICBjb25zdCB7IHNldHRpbmdzLCBzaXRlIH0gPSB0aGlzLmRlcHM7XG4gICAgY29uc3QgYmFzZSA9IHsgdHMsIHNpdGUsIHZlcmRpY3Q6IGNsYXNzaWZpY2F0aW9uLnZlcmRpY3QsIGdhdGVkOiB0cnVlLCBjb25jZXB0OiBjYXJkLmNvbmNlcHQsIGF0dGVtcHRzIH07XG5cbiAgICBpZiAocmVzdWx0LnBhc3NlZCkge1xuICAgICAgdGhpcy5zdGF0ZSA9IHsga2luZDogJ3JlbGVhc2UnLCBwcm9tcHQ6IHRoaXMucHJvbXB0LCBvdXRjb21lOiAncGFzc2VkJywgY2xhc3NpZmljYXRpb24gfTtcbiAgICAgIHJldHVybiB7IHN0YXRlOiB0aGlzLnN0YXRlLCBldmVudDogeyAuLi5iYXNlLCBvdXRjb21lOiAncGFzc2VkJyB9LCByZW1lbWJlckNvbmNlcHQ6IGNhcmQuY29uY2VwdCB9O1xuICAgIH1cblxuICAgIGlmIChzZXR0aW5ncy5oYXJkTW9kZS5lbmFibGVkICYmIGF0dGVtcHRzID49IHNldHRpbmdzLmhhcmRNb2RlLmZhaWxzQmVmb3JlQmxvY2spIHtcbiAgICAgIGNvbnN0IHVudGlsID0gdHMgKyBzZXR0aW5ncy5oYXJkTW9kZS5ibG9ja01pbnV0ZXMgKiA2MF8wMDA7XG4gICAgICB0aGlzLnN0YXRlID0geyBraW5kOiAnYmxvY2tlZCcsIHVudGlsLCBjbGFzc2lmaWNhdGlvbiB9O1xuICAgICAgcmV0dXJuIHsgc3RhdGU6IHRoaXMuc3RhdGUsIGV2ZW50OiB7IC4uLmJhc2UsIG91dGNvbWU6ICdibG9ja2VkJyB9LCBibG9jazogeyB1bnRpbCB9IH07XG4gICAgfVxuXG4gICAgdGhpcy5zdGF0ZSA9IHsga2luZDogJ2V4cGxhaW4nLCBjYXJkLCBjbGFzc2lmaWNhdGlvbiwgYXR0ZW1wdHMsIG1pc3NlZDogcmVzdWx0Lm1pc3NlZCB9O1xuICAgIHJldHVybiB7IHN0YXRlOiB0aGlzLnN0YXRlLCBldmVudDogeyAuLi5iYXNlLCBvdXRjb21lOiAnZmFpbGVkJyB9IH07XG4gIH1cblxuICAvKiogRXNjYXBlIGhhdGNoLiBOb3QgYXZhaWxhYmxlIGluIGhhcmQgbW9kZS4gQ291bnRzIGFnYWluc3QgdGhlIHN0cmVhay4gKi9cbiAgc2tpcCgpOiBTZXNzaW9uUmVzdWx0IHtcbiAgICBpZiAodGhpcy5zdGF0ZS5raW5kICE9PSAnZXhwbGFpbicgJiYgdGhpcy5zdGF0ZS5raW5kICE9PSAncXVpeicpIHJldHVybiB7IHN0YXRlOiB0aGlzLnN0YXRlIH07XG4gICAgaWYgKHRoaXMuZGVwcy5zZXR0aW5ncy5oYXJkTW9kZS5lbmFibGVkKSByZXR1cm4geyBzdGF0ZTogdGhpcy5zdGF0ZSB9O1xuICAgIGNvbnN0IHsgY2xhc3NpZmljYXRpb24sIGNhcmQsIGF0dGVtcHRzIH0gPSB0aGlzLnN0YXRlO1xuICAgIHRoaXMuc3RhdGUgPSB7IGtpbmQ6ICdyZWxlYXNlJywgcHJvbXB0OiB0aGlzLnByb21wdCwgb3V0Y29tZTogJ3NraXBwZWQnLCBjbGFzc2lmaWNhdGlvbiB9O1xuICAgIHJldHVybiB7XG4gICAgICBzdGF0ZTogdGhpcy5zdGF0ZSxcbiAgICAgIGV2ZW50OiB7XG4gICAgICAgIHRzOiB0aGlzLm5vdygpLFxuICAgICAgICBzaXRlOiB0aGlzLmRlcHMuc2l0ZSxcbiAgICAgICAgdmVyZGljdDogY2xhc3NpZmljYXRpb24udmVyZGljdCxcbiAgICAgICAgZ2F0ZWQ6IHRydWUsXG4gICAgICAgIG91dGNvbWU6ICdza2lwcGVkJyxcbiAgICAgICAgY29uY2VwdDogY2FyZC5jb25jZXB0LFxuICAgICAgICBhdHRlbXB0cyxcbiAgICAgIH0sXG4gICAgfTtcbiAgfVxuXG4gIC8qKiBBZnRlciBhbiBlcnJvciwgdGhlIGNhbGxlciBjYW4gbGV0IHRoZSBwcm9tcHQgdGhyb3VnaC4gKi9cbiAgcmVsZWFzZUFmdGVyRXJyb3IoKTogU2Vzc2lvblJlc3VsdCB7XG4gICAgaWYgKHRoaXMuc3RhdGUua2luZCAhPT0gJ2Vycm9yJykgcmV0dXJuIHsgc3RhdGU6IHRoaXMuc3RhdGUgfTtcbiAgICByZXR1cm4gdGhpcy5yZWxlYXNlKHRoaXMuc3RhdGUucHJvbXB0LCAncmVsZWFzZWQnLCBudWxsLCBmYWxzZSk7XG4gIH1cblxuICBwcml2YXRlIHJlbGVhc2UocHJvbXB0OiBzdHJpbmcsIG91dGNvbWU6IE91dGNvbWUsIGNsYXNzaWZpY2F0aW9uOiBDbGFzc2lmaWNhdGlvbiB8IG51bGwsIGdhdGVkOiBib29sZWFuKTogU2Vzc2lvblJlc3VsdCB7XG4gICAgdGhpcy5zdGF0ZSA9IHsga2luZDogJ3JlbGVhc2UnLCBwcm9tcHQsIG91dGNvbWUsIGNsYXNzaWZpY2F0aW9uIH07XG4gICAgcmV0dXJuIHtcbiAgICAgIHN0YXRlOiB0aGlzLnN0YXRlLFxuICAgICAgZXZlbnQ6IHtcbiAgICAgICAgdHM6IHRoaXMubm93KCksXG4gICAgICAgIHNpdGU6IHRoaXMuZGVwcy5zaXRlLFxuICAgICAgICB2ZXJkaWN0OiBjbGFzc2lmaWNhdGlvbj8udmVyZGljdCA/PyBudWxsLFxuICAgICAgICBnYXRlZCxcbiAgICAgICAgb3V0Y29tZSxcbiAgICAgICAgY29uY2VwdDogY2xhc3NpZmljYXRpb24/LmNvbmNlcHQgPz8gdW5kZWZpbmVkLFxuICAgICAgfSxcbiAgICB9O1xuICB9XG59XG5cbmZ1bmN0aW9uIGVycm9yTWVzc2FnZShlcnI6IHVua25vd24pOiBzdHJpbmcge1xuICByZXR1cm4gZXJyIGluc3RhbmNlb2YgRXJyb3IgPyBlcnIubWVzc2FnZSA6IFN0cmluZyhlcnIpO1xufVxuIiwgImltcG9ydCB0eXBlIHsgQmxvY2tTdGF0ZSwgQ29tcGxldGlvblJlcXVlc3QsIENvbmNlcHRNZW1vcnksIFNldHRpbmdzLCBTdGF0cywgU3RhdHNFdmVudCB9IGZyb20gJ0BtdWxsL2NvcmUvdHlwZXMnO1xuXG5leHBvcnQgdHlwZSBSZXF1ZXN0ID1cbiAgfCB7IHR5cGU6ICdjb21wbGV0ZSc7IHJlcTogQ29tcGxldGlvblJlcXVlc3QgfVxuICB8IHsgdHlwZTogJ2dldFN0YXRlJyB9XG4gIHwgeyB0eXBlOiAncmVjb3JkJzsgZXZlbnQ/OiBTdGF0c0V2ZW50OyByZW1lbWJlckNvbmNlcHQ/OiBzdHJpbmc7IGJsb2NrPzogQmxvY2tTdGF0ZSB9XG4gIHwgeyB0eXBlOiAndGVzdEtleSc7IHNldHRpbmdzOiBTZXR0aW5ncyB9O1xuXG5leHBvcnQgaW50ZXJmYWNlIFN0YXRlIHtcbiAgc2V0dGluZ3M6IFNldHRpbmdzO1xuICBzdGF0czogU3RhdHM7XG4gIG1lbW9yeTogQ29uY2VwdE1lbW9yeTtcbiAgYmxvY2s6IEJsb2NrU3RhdGUgfCBudWxsO1xufVxuXG5leHBvcnQgdHlwZSBSZXNwb25zZSA9XG4gIHwgeyBvazogdHJ1ZTsgdGV4dDogc3RyaW5nIH1cbiAgfCB7IG9rOiB0cnVlOyBzdGF0ZTogU3RhdGUgfVxuICB8IHsgb2s6IHRydWUgfVxuICB8IHsgb2s6IGZhbHNlOyBlcnJvcjogc3RyaW5nIH07XG5cbmV4cG9ydCBmdW5jdGlvbiBzZW5kPFQgZXh0ZW5kcyBSZXNwb25zZSA9IFJlc3BvbnNlPihtc2c6IFJlcXVlc3QpOiBQcm9taXNlPFQ+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZShtc2csIChyZXM6IFQpID0+IHtcbiAgICAgIGNvbnN0IGVyciA9IGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcjtcbiAgICAgIGlmIChlcnIpIHJlamVjdChuZXcgRXJyb3IoZXJyLm1lc3NhZ2UpKTtcbiAgICAgIGVsc2UgcmVzb2x2ZShyZXMpO1xuICAgIH0pO1xuICB9KTtcbn1cbiIsICJpbXBvcnQgdHlwZSB7IENvbXBsZXRpb25SZXF1ZXN0LCBQcm92aWRlciB9IGZyb20gJ0BtdWxsL2NvcmUvdHlwZXMnO1xuaW1wb3J0IHsgc2VuZCwgdHlwZSBTdGF0ZSB9IGZyb20gJy4uL3NoYXJlZC9tZXNzYWdlcy50cyc7XG5cbi8qKiBQcm92aWRlciB3aG9zZSBjYWxscyBydW4gaW4gdGhlIHNlcnZpY2Ugd29ya2VyLiAqL1xuZXhwb3J0IGNsYXNzIEJyaWRnZVByb3ZpZGVyIGltcGxlbWVudHMgUHJvdmlkZXIge1xuICBpZCA9ICdicmlkZ2UnO1xuICBhc3luYyBjb21wbGV0ZShyZXE6IENvbXBsZXRpb25SZXF1ZXN0KTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICBjb25zdCByZXMgPSBhd2FpdCBzZW5kPHsgb2s6IHRydWU7IHRleHQ6IHN0cmluZyB9IHwgeyBvazogZmFsc2U7IGVycm9yOiBzdHJpbmcgfT4oeyB0eXBlOiAnY29tcGxldGUnLCByZXEgfSk7XG4gICAgaWYgKCFyZXMub2spIHRocm93IG5ldyBFcnJvcihyZXMuZXJyb3IpO1xuICAgIHJldHVybiByZXMudGV4dDtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0U3RhdGUoKTogUHJvbWlzZTxTdGF0ZT4ge1xuICBjb25zdCByZXMgPSBhd2FpdCBzZW5kPHsgb2s6IHRydWU7IHN0YXRlOiBTdGF0ZSB9IHwgeyBvazogZmFsc2U7IGVycm9yOiBzdHJpbmcgfT4oeyB0eXBlOiAnZ2V0U3RhdGUnIH0pO1xuICBpZiAoIXJlcy5vaykgdGhyb3cgbmV3IEVycm9yKHJlcy5lcnJvcik7XG4gIHJldHVybiByZXMuc3RhdGU7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZWNvcmQocGF5bG9hZDogeyBldmVudD86IFN0YXRlWydzdGF0cyddWydyZWNlbnQnXVtudW1iZXJdOyByZW1lbWJlckNvbmNlcHQ/OiBzdHJpbmc7IGJsb2NrPzogU3RhdGVbJ2Jsb2NrJ10gfSk6IFByb21pc2U8dm9pZD4ge1xuICBpZiAoIXBheWxvYWQuZXZlbnQgJiYgIXBheWxvYWQucmVtZW1iZXJDb25jZXB0ICYmICFwYXlsb2FkLmJsb2NrKSByZXR1cm47XG4gIGF3YWl0IHNlbmQoeyB0eXBlOiAncmVjb3JkJywgLi4ucGF5bG9hZCwgYmxvY2s6IHBheWxvYWQuYmxvY2sgPz8gdW5kZWZpbmVkIH0pO1xufVxuIiwgIi8qKlxuICogUGFsZXR0ZSB0b2tlbnMgc2hhcmVkIGJ5IHRoZSBleHRlbnNpb24gb3ZlcmxheSwgcG9wdXAsIG9wdGlvbnMgcGFnZSwgYW5kIHRoZSB3ZWIgYXBwLlxuICogT3BlcmF0b3IgQW1iZXIgZGVmYXVsdCwgQXRlbGllciBTYWdlIGFsdGVybmF0ZSwgZGFyayBhbmQgbGlnaHQgZm9yIGVhY2guXG4gKiBBcHBsaWVkIHZpYSBkYXRhLXBhbGV0dGUgLyBkYXRhLXRoZW1lIG9uIHRoZSByb290IGVsZW1lbnQgb2YgZWFjaCBzdXJmYWNlLlxuICovXG5leHBvcnQgY29uc3QgVEhFTUVfQ1NTID0gYFxuOmhvc3QsIDpyb290LCBbZGF0YS1tdWxsLXJvb3RdIHtcbiAgLS1iZzogIzBhMGEwZTtcbiAgLS1zdXJmYWNlOiByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMDQpO1xuICAtLXN1cmZhY2UtMjogcmdiYSgyNTUsIDI1NSwgMjU1LCAwLjA3KTtcbiAgLS1ib3JkZXI6IHJnYmEoMjU1LCAyNTUsIDI1NSwgMC4xMCk7XG4gIC0tZmc6ICNlY2VjZjE7XG4gIC0tZmctbXV0ZWQ6IHJnYmEoMjM2LCAyMzYsIDI0MSwgMC42Mik7XG4gIC0tYWNjZW50OiAjZjU5ZTBiO1xuICAtLWFjY2VudC1icmlnaHQ6ICNmYmJmMjQ7XG4gIC0tYWNjZW50LXNvZnQ6IHJnYmEoMjQ1LCAxNTgsIDExLCAwLjE0KTtcbiAgLS1hY2NlbnQtYm9yZGVyOiByZ2JhKDI0NSwgMTU4LCAxMSwgMC4zNSk7XG4gIC0tbGl2ZTogIzIyYzU1ZTtcbiAgLS1kYXRhOiAjMjJkM2VlO1xuICAtLWRhbmdlcjogI2VmNDQ0NDtcbiAgLS1zZXJpZjogXCJJbnN0cnVtZW50IFNlcmlmXCIsIFwiSW93YW4gT2xkIFN0eWxlXCIsIEdlb3JnaWEsIHNlcmlmO1xuICAtLXNhbnM6IFwiU3BhY2UgR3JvdGVza1wiLCBzeXN0ZW0tdWksIC1hcHBsZS1zeXN0ZW0sIFwiU2Vnb2UgVUlcIiwgc2Fucy1zZXJpZjtcbiAgLS1tb25vOiBcIkdlaXN0IE1vbm9cIiwgdWktbW9ub3NwYWNlLCBcIlNGIE1vbm9cIiwgTWVubG8sIENvbnNvbGFzLCBtb25vc3BhY2U7XG4gIC0tcmFkaXVzOiAxNHB4O1xuICAtLXNoYWRvdzogMCAyNHB4IDgwcHggcmdiYSgwLCAwLCAwLCAwLjU1KTtcbiAgY29sb3Itc2NoZW1lOiBkYXJrO1xufVxuW2RhdGEtcGFsZXR0ZT1cInNhZ2VcIl0ge1xuICAtLWJnOiAjMGEwZTBiO1xuICAtLWFjY2VudDogIzY1YTMwZDtcbiAgLS1hY2NlbnQtYnJpZ2h0OiAjODRjYzE2O1xuICAtLWFjY2VudC1zb2Z0OiByZ2JhKDEzMiwgMjA0LCAyMiwgMC4xNCk7XG4gIC0tYWNjZW50LWJvcmRlcjogcmdiYSgxMzIsIDIwNCwgMjIsIDAuMzUpO1xufVxuW2RhdGEtdGhlbWU9XCJsaWdodFwiXSB7XG4gIC0tYmc6ICNmN2YzZTk7XG4gIC0tc3VyZmFjZTogcmdiYSgyMCwgMTYsIDgsIDAuMDQpO1xuICAtLXN1cmZhY2UtMjogcmdiYSgyMCwgMTYsIDgsIDAuMDcpO1xuICAtLWJvcmRlcjogcmdiYSgyMCwgMTYsIDgsIDAuMTIpO1xuICAtLWZnOiAjMWExNzEwO1xuICAtLWZnLW11dGVkOiByZ2JhKDI2LCAyMywgMTYsIDAuNjIpO1xuICAtLWFjY2VudDogI2I0NTMwOTtcbiAgLS1hY2NlbnQtYnJpZ2h0OiAjZDk3NzA2O1xuICAtLWFjY2VudC1zb2Z0OiByZ2JhKDE4MCwgODMsIDksIDAuMTIpO1xuICAtLWFjY2VudC1ib3JkZXI6IHJnYmEoMTgwLCA4MywgOSwgMC4zNSk7XG4gIC0tc2hhZG93OiAwIDI0cHggODBweCByZ2JhKDQwLCAzMCwgMTAsIDAuMjUpO1xuICBjb2xvci1zY2hlbWU6IGxpZ2h0O1xufVxuW2RhdGEtdGhlbWU9XCJsaWdodFwiXVtkYXRhLXBhbGV0dGU9XCJzYWdlXCJdIHtcbiAgLS1iZzogI2YxZjBlNjtcbiAgLS1hY2NlbnQ6ICMzZjYyMTI7XG4gIC0tYWNjZW50LWJyaWdodDogIzRkN2MwZjtcbiAgLS1hY2NlbnQtc29mdDogcmdiYSg2MywgOTgsIDE4LCAwLjEyKTtcbiAgLS1hY2NlbnQtYm9yZGVyOiByZ2JhKDYzLCA5OCwgMTgsIDAuMzUpO1xufVxuYDtcbiIsICJpbXBvcnQgdHlwZSB7IFNlc3Npb25TdGF0ZSB9IGZyb20gJ0BtdWxsL2NvcmUvc2Vzc2lvbic7XG5pbXBvcnQgdHlwZSB7IFNldHRpbmdzIH0gZnJvbSAnQG11bGwvY29yZS90eXBlcyc7XG5pbXBvcnQgeyBUSEVNRV9DU1MgfSBmcm9tICcuLi9zaGFyZWQvdGhlbWUudHMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIE92ZXJsYXlIYW5kbGVycyB7XG4gIG9uUmVhZCgpOiB2b2lkO1xuICBvbkFuc3dlcihhbnN3ZXJzOiBBcnJheTxudW1iZXIgfCBudWxsPik6IHZvaWQ7XG4gIG9uU2tpcCgpOiB2b2lkO1xuICBvbkNhbmNlbCgpOiB2b2lkO1xuICBvblNlbmRBbnl3YXkoKTogdm9pZDtcbn1cblxuY29uc3QgT1ZFUkxBWV9DU1MgPSBgXG4ke1RIRU1FX0NTU31cbiogeyBib3gtc2l6aW5nOiBib3JkZXItYm94OyB9XG4uc2NyaW0geyBwb3NpdGlvbjogZml4ZWQ7IGluc2V0OiAwOyBiYWNrZ3JvdW5kOiByZ2JhKDAsMCwwLDAuNTUpOyBiYWNrZHJvcC1maWx0ZXI6IGJsdXIoNnB4KTsgei1pbmRleDogMjE0NzQ4MzY0NjsgZGlzcGxheTogZmxleDsgYWxpZ24taXRlbXM6IGNlbnRlcjsganVzdGlmeS1jb250ZW50OiBjZW50ZXI7IHBhZGRpbmc6IDI0cHg7IGZvbnQtZmFtaWx5OiB2YXIoLS1zYW5zKTsgY29sb3I6IHZhcigtLWZnKTsgfVxuLmNhcmQgeyB3aWR0aDogbWluKDU2MHB4LCAxMDAlKTsgbWF4LWhlaWdodDogbWluKDg1dmgsIDc2MHB4KTsgb3ZlcmZsb3c6IGF1dG87IGJhY2tncm91bmQ6IHZhcigtLWJnKTsgYm9yZGVyOiAxcHggc29saWQgdmFyKC0tYm9yZGVyKTsgYm9yZGVyLXJhZGl1czogdmFyKC0tcmFkaXVzKTsgYm94LXNoYWRvdzogdmFyKC0tc2hhZG93KTsgcGFkZGluZzogMjJweCAyNHB4IDE4cHg7IHBvc2l0aW9uOiByZWxhdGl2ZTsgfVxuLmNhcmQ6OmJlZm9yZSB7IGNvbnRlbnQ6IFwiXCI7IHBvc2l0aW9uOiBhYnNvbHV0ZTsgaW5zZXQ6IDA7IGJvcmRlci1yYWRpdXM6IGluaGVyaXQ7IGJhY2tncm91bmQ6IHZhcigtLXN1cmZhY2UpOyBwb2ludGVyLWV2ZW50czogbm9uZTsgfVxuLmNhcmQgPiAqIHsgcG9zaXRpb246IHJlbGF0aXZlOyB9XG4uZXllYnJvdyB7IGZvbnQtZmFtaWx5OiB2YXIoLS1tb25vKTsgZm9udC1zaXplOiAxMXB4OyBsZXR0ZXItc3BhY2luZzogMC4xNGVtOyB0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlOyBjb2xvcjogdmFyKC0tYWNjZW50KTsgZGlzcGxheTogZmxleDsgYWxpZ24taXRlbXM6IGNlbnRlcjsgZ2FwOiA4cHg7IH1cbi5leWVicm93IC5kb3QgeyB3aWR0aDogNnB4OyBoZWlnaHQ6IDZweDsgYm9yZGVyLXJhZGl1czogNTAlOyBiYWNrZ3JvdW5kOiB2YXIoLS1hY2NlbnQpOyBib3gtc2hhZG93OiAwIDAgMCA0cHggdmFyKC0tYWNjZW50LXNvZnQpOyB9XG5oMSB7IGZvbnQtZmFtaWx5OiB2YXIoLS1zZXJpZik7IGZvbnQtd2VpZ2h0OiA0MDA7IGZvbnQtc2l6ZTogMzBweDsgbGluZS1oZWlnaHQ6IDEuMTsgbWFyZ2luOiAxMHB4IDAgNHB4OyBsZXR0ZXItc3BhY2luZzogLTAuMDFlbTsgfVxuLnN1YiB7IGNvbG9yOiB2YXIoLS1mZy1tdXRlZCk7IGZvbnQtc2l6ZTogMTNweDsgbWFyZ2luOiAwIDAgMTZweDsgfVxucC5ib2R5IHsgZm9udC1zaXplOiAxNS41cHg7IGxpbmUtaGVpZ2h0OiAxLjU1OyBtYXJnaW46IDAgMCAxNHB4OyB9XG4uZXhhbXBsZSB7IGZvbnQtZmFtaWx5OiB2YXIoLS1tb25vKTsgZm9udC1zaXplOiAxMi41cHg7IGNvbG9yOiB2YXIoLS1mZy1tdXRlZCk7IGJvcmRlci1sZWZ0OiAycHggc29saWQgdmFyKC0tYWNjZW50LWJvcmRlcik7IHBhZGRpbmc6IDRweCAxMHB4OyBtYXJnaW46IDAgMCAxNnB4OyB9XG4ucSB7IGJvcmRlcjogMXB4IHNvbGlkIHZhcigtLWJvcmRlcik7IGJvcmRlci1yYWRpdXM6IDEwcHg7IHBhZGRpbmc6IDEycHggMTRweDsgbWFyZ2luOiAwIDAgMTBweDsgYmFja2dyb3VuZDogdmFyKC0tc3VyZmFjZSk7IH1cbi5xLm1pc3NlZCB7IGJvcmRlci1jb2xvcjogdmFyKC0tZGFuZ2VyKTsgfVxuLnEgLnF0IHsgZm9udC1zaXplOiAxNC41cHg7IG1hcmdpbjogMCAwIDhweDsgfVxuLnEgbGFiZWwgeyBkaXNwbGF5OiBmbGV4OyBnYXA6IDEwcHg7IGFsaWduLWl0ZW1zOiBmbGV4LXN0YXJ0OyBwYWRkaW5nOiA2cHggOHB4OyBib3JkZXItcmFkaXVzOiA4cHg7IGN1cnNvcjogcG9pbnRlcjsgZm9udC1zaXplOiAxNHB4OyB9XG4ucSBsYWJlbDpob3ZlciB7IGJhY2tncm91bmQ6IHZhcigtLXN1cmZhY2UtMik7IH1cbi5xIGlucHV0IHsgYWNjZW50LWNvbG9yOiB2YXIoLS1hY2NlbnQpOyBtYXJnaW4tdG9wOiAzcHg7IH1cbi5yb3cgeyBkaXNwbGF5OiBmbGV4OyBnYXA6IDEwcHg7IGFsaWduLWl0ZW1zOiBjZW50ZXI7IGp1c3RpZnktY29udGVudDogc3BhY2UtYmV0d2VlbjsgbWFyZ2luLXRvcDogMTRweDsgZmxleC13cmFwOiB3cmFwOyB9XG4ucm93IC5sZWZ0IHsgZGlzcGxheTogZmxleDsgZ2FwOiAxMHB4OyBhbGlnbi1pdGVtczogY2VudGVyOyB9XG5idXR0b24geyBmb250LWZhbWlseTogdmFyKC0tc2Fucyk7IGZvbnQtc2l6ZTogMTRweDsgYm9yZGVyLXJhZGl1czogMTBweDsgcGFkZGluZzogOXB4IDE2cHg7IGN1cnNvcjogcG9pbnRlcjsgYm9yZGVyOiAxcHggc29saWQgdmFyKC0tYm9yZGVyKTsgYmFja2dyb3VuZDogdmFyKC0tc3VyZmFjZS0yKTsgY29sb3I6IHZhcigtLWZnKTsgfVxuYnV0dG9uLnByaW1hcnkgeyBiYWNrZ3JvdW5kOiB2YXIoLS1hY2NlbnQpOyBib3JkZXItY29sb3I6IHZhcigtLWFjY2VudCk7IGNvbG9yOiAjMGEwYTBlOyBmb250LXdlaWdodDogNjAwOyB9XG5idXR0b24ucHJpbWFyeTpob3ZlciB7IGJhY2tncm91bmQ6IHZhcigtLWFjY2VudC1icmlnaHQpOyB9XG5idXR0b24uZ2hvc3QgeyBiYWNrZ3JvdW5kOiB0cmFuc3BhcmVudDsgYm9yZGVyLWNvbG9yOiB0cmFuc3BhcmVudDsgY29sb3I6IHZhcigtLWZnLW11dGVkKTsgcGFkZGluZzogOXB4IDhweDsgfVxuYnV0dG9uLmdob3N0OmhvdmVyIHsgY29sb3I6IHZhcigtLWZnKTsgfVxuLmZvb3QgeyBmb250LWZhbWlseTogdmFyKC0tbW9ubyk7IGZvbnQtc2l6ZTogMTFweDsgY29sb3I6IHZhcigtLWZnLW11dGVkKTsgbWFyZ2luLXRvcDogMTJweDsgfVxuLmJhbm5lciB7IGJhY2tncm91bmQ6IHZhcigtLWFjY2VudC1zb2Z0KTsgYm9yZGVyOiAxcHggc29saWQgdmFyKC0tYWNjZW50LWJvcmRlcik7IGJvcmRlci1yYWRpdXM6IDEwcHg7IHBhZGRpbmc6IDhweCAxMnB4OyBmb250LXNpemU6IDEzcHg7IG1hcmdpbjogMCAwIDE0cHg7IH1cbi5iYW5uZXIuYmFkIHsgYmFja2dyb3VuZDogcmdiYSgyMzksNjgsNjgsMC4xMCk7IGJvcmRlci1jb2xvcjogcmdiYSgyMzksNjgsNjgsMC4zNSk7IH1cbi5waWxsIHsgcG9zaXRpb246IGZpeGVkOyByaWdodDogMThweDsgYm90dG9tOiAxOHB4OyB6LWluZGV4OiAyMTQ3NDgzNjQ2OyBmb250LWZhbWlseTogdmFyKC0tbW9ubyk7IGZvbnQtc2l6ZTogMTJweDsgY29sb3I6IHZhcigtLWZnKTsgYmFja2dyb3VuZDogdmFyKC0tYmcpOyBib3JkZXI6IDFweCBzb2xpZCB2YXIoLS1hY2NlbnQtYm9yZGVyKTsgYm9yZGVyLXJhZGl1czogOTk5cHg7IHBhZGRpbmc6IDhweCAxNHB4OyBib3gtc2hhZG93OiB2YXIoLS1zaGFkb3cpOyBkaXNwbGF5OiBmbGV4OyBhbGlnbi1pdGVtczogY2VudGVyOyBnYXA6IDhweDsgfVxuLnBpbGwgLmRvdCB7IHdpZHRoOiA4cHg7IGhlaWdodDogOHB4OyBib3JkZXItcmFkaXVzOiA1MCU7IGJhY2tncm91bmQ6IHZhcigtLWFjY2VudCk7IGFuaW1hdGlvbjogcHVsc2UgMXMgaW5maW5pdGUgYWx0ZXJuYXRlOyB9XG5Aa2V5ZnJhbWVzIHB1bHNlIHsgZnJvbSB7IG9wYWNpdHk6IDAuNCB9IHRvIHsgb3BhY2l0eTogMSB9IH1cbi5iaWcgeyBmb250LWZhbWlseTogdmFyKC0tc2VyaWYpOyBmb250LXNpemU6IDQ0cHg7IG1hcmdpbjogOHB4IDAgMnB4OyB9XG5gO1xuXG5leHBvcnQgY2xhc3MgT3ZlcmxheSB7XG4gIHByaXZhdGUgaG9zdDogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSByb290OiBTaGFkb3dSb290IHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgaGFuZGxlcnM6IE92ZXJsYXlIYW5kbGVycyB8IG51bGwgPSBudWxsO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgc2V0dGluZ3M6IFBpY2s8U2V0dGluZ3MsICdwYWxldHRlJyB8ICd0aGVtZScgfCAnaGFyZE1vZGUnPikge31cblxuICBwcml2YXRlIG1vdW50KCk6IFNoYWRvd1Jvb3Qge1xuICAgIGlmICh0aGlzLnJvb3QpIHJldHVybiB0aGlzLnJvb3Q7XG4gICAgdGhpcy5ob3N0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgdGhpcy5ob3N0LmlkID0gJ211bGwtaG9zdCc7XG4gICAgdGhpcy5ob3N0LnNldEF0dHJpYnV0ZSgnZGF0YS1wYWxldHRlJywgdGhpcy5zZXR0aW5ncy5wYWxldHRlKTtcbiAgICB0aGlzLmhvc3Quc2V0QXR0cmlidXRlKCdkYXRhLXRoZW1lJywgdGhpcy5zZXR0aW5ncy50aGVtZSk7XG4gICAgdGhpcy5yb290ID0gdGhpcy5ob3N0LmF0dGFjaFNoYWRvdyh7IG1vZGU6ICdvcGVuJyB9KTtcbiAgICBjb25zdCBzdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7XG4gICAgc3R5bGUudGV4dENvbnRlbnQgPSBPVkVSTEFZX0NTUztcbiAgICB0aGlzLnJvb3QuYXBwZW5kQ2hpbGQoc3R5bGUpO1xuICAgIHRoaXMucm9vdC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChlKSA9PiB0aGlzLm9uQ2xpY2soZSkpO1xuICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5hcHBlbmRDaGlsZCh0aGlzLmhvc3QpO1xuICAgIHJldHVybiB0aGlzLnJvb3Q7XG4gIH1cblxuICBoaWRlKCk6IHZvaWQge1xuICAgIHRoaXMuaG9zdD8ucmVtb3ZlKCk7XG4gICAgdGhpcy5ob3N0ID0gbnVsbDtcbiAgICB0aGlzLnJvb3QgPSBudWxsO1xuICB9XG5cbiAgcmVuZGVyKHN0YXRlOiBTZXNzaW9uU3RhdGUsIGhhbmRsZXJzOiBPdmVybGF5SGFuZGxlcnMpOiB2b2lkIHtcbiAgICB0aGlzLmhhbmRsZXJzID0gaGFuZGxlcnM7XG4gICAgY29uc3Qgcm9vdCA9IHRoaXMubW91bnQoKTtcbiAgICBmb3IgKGNvbnN0IGVsIG9mIEFycmF5LmZyb20ocm9vdC5jaGlsZHJlbikpIGlmIChlbC50YWdOYW1lICE9PSAnU1RZTEUnKSBlbC5yZW1vdmUoKTtcbiAgICBjb25zdCB3cmFwID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgd3JhcC5pbm5lckhUTUwgPSB0aGlzLmh0bWwoc3RhdGUpO1xuICAgIHJvb3QuYXBwZW5kQ2hpbGQod3JhcCk7XG4gICAgaWYgKHN0YXRlLmtpbmQgPT09ICdibG9ja2VkJykgdGhpcy50aWNrQ291bnRkb3duKHN0YXRlLnVudGlsKTtcbiAgfVxuXG4gIHByaXZhdGUgaHRtbChzdGF0ZTogU2Vzc2lvblN0YXRlKTogc3RyaW5nIHtcbiAgICBzd2l0Y2ggKHN0YXRlLmtpbmQpIHtcbiAgICAgIGNhc2UgJ2NsYXNzaWZ5aW5nJzpcbiAgICAgICAgcmV0dXJuIGA8ZGl2IGNsYXNzPVwicGlsbFwiPjxzcGFuIGNsYXNzPVwiZG90XCI+PC9zcGFuPm11bGwgaXMgcmVhZGluZyB5b3VyIHByb21wdDwvZGl2PmA7XG4gICAgICBjYXNlICdsb2FkaW5nLWNhcmQnOlxuICAgICAgICByZXR1cm4gYDxkaXYgY2xhc3M9XCJwaWxsXCI+PHNwYW4gY2xhc3M9XCJkb3RcIj48L3NwYW4+d3JpdGluZyBhIDQwLXNlY29uZCBsZXNzb24gb24gJHtlc2Moc3RhdGUuY2xhc3NpZmljYXRpb24uY29uY2VwdCA/PyAndGhpcycpfTwvZGl2PmA7XG4gICAgICBjYXNlICdleHBsYWluJzoge1xuICAgICAgICBjb25zdCBiYW5uZXIgPSBzdGF0ZS5taXNzZWQubGVuZ3RoXG4gICAgICAgICAgPyBgPGRpdiBjbGFzcz1cImJhbm5lciBiYWRcIj5Ob3QgcXVpdGUuICR7c3RhdGUubWlzc2VkLmxlbmd0aCA9PT0gMSA/ICdPbmUgcXVlc3Rpb24nIDogYCR7c3RhdGUubWlzc2VkLmxlbmd0aH0gcXVlc3Rpb25zYH0gbWlzc2VkLiBSZWFkIGl0IGFnYWluLCB0aGVuIHJldHJ5LjwvZGl2PmBcbiAgICAgICAgICA6ICcnO1xuICAgICAgICByZXR1cm4gYDxkaXYgY2xhc3M9XCJzY3JpbVwiPjxkaXYgY2xhc3M9XCJjYXJkXCI+XG4gICAgICAgICAgPGRpdiBjbGFzcz1cImV5ZWJyb3dcIj48c3BhbiBjbGFzcz1cImRvdFwiPjwvc3Bhbj5tdWxsIFx1MDBCNyB0aGluayBmaXJzdDwvZGl2PlxuICAgICAgICAgIDxoMT4ke2VzYyhzdGF0ZS5jYXJkLmNvbmNlcHQpfTwvaDE+XG4gICAgICAgICAgPHAgY2xhc3M9XCJzdWJcIj4ke2VzYyhzdGF0ZS5jbGFzc2lmaWNhdGlvbi5yZWFzb24gfHwgJ1RoaXMgbG9va3MgbGlrZSBzb21ldGhpbmcgd29ydGggdW5kZXJzdGFuZGluZyBiZWZvcmUgeW91IGdldCB0aGUgYW5zd2VyLicpfTwvcD5cbiAgICAgICAgICAke2Jhbm5lcn1cbiAgICAgICAgICA8cCBjbGFzcz1cImJvZHlcIj4ke2VzYyhzdGF0ZS5jYXJkLmV4cGxhbmF0aW9uKX08L3A+XG4gICAgICAgICAgPGRpdiBjbGFzcz1cInJvd1wiPlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cImxlZnRcIj5cbiAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInByaW1hcnlcIiBkYXRhLWFjdD1cInJlYWRcIj5JJ3ZlIHJlYWQgaXQsIHF1aXogbWU8L2J1dHRvbj5cbiAgICAgICAgICAgICAgJHt0aGlzLnNldHRpbmdzLmhhcmRNb2RlLmVuYWJsZWQgPyAnJyA6ICc8YnV0dG9uIGNsYXNzPVwiZ2hvc3RcIiBkYXRhLWFjdD1cInNraXBcIj5Ta2lwIChjb3VudHMgYWdhaW5zdCB5b3UpPC9idXR0b24+J31cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cImdob3N0XCIgZGF0YS1hY3Q9XCJjYW5jZWxcIj5DYW5jZWw8L2J1dHRvbj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8ZGl2IGNsYXNzPVwiZm9vdFwiPiR7c3RhdGUuY2FyZC5xdWVzdGlvbnMubGVuZ3RofSBxdWVzdGlvbiR7c3RhdGUuY2FyZC5xdWVzdGlvbnMubGVuZ3RoID09PSAxID8gJycgOiAncyd9IFx1MDBCNyBwYXNzID0gZXZlcnkgb25lIHJpZ2h0IFx1MDBCNyB5b3VyIHByb21wdCBpcyB1bnRvdWNoZWQ8L2Rpdj5cbiAgICAgICAgPC9kaXY+PC9kaXY+YDtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3F1aXonOlxuICAgICAgICByZXR1cm4gYDxkaXYgY2xhc3M9XCJzY3JpbVwiPjxkaXYgY2xhc3M9XCJjYXJkXCI+XG4gICAgICAgICAgPGRpdiBjbGFzcz1cImV5ZWJyb3dcIj48c3BhbiBjbGFzcz1cImRvdFwiPjwvc3Bhbj5tdWxsIFx1MDBCNyBxdWl6PC9kaXY+XG4gICAgICAgICAgPGgxPiR7ZXNjKHN0YXRlLmNhcmQuY29uY2VwdCl9PC9oMT5cbiAgICAgICAgICA8cCBjbGFzcz1cInN1YlwiPkF0dGVtcHQgJHtzdGF0ZS5hdHRlbXB0cyArIDF9LiBFdmVyeSBhbnN3ZXIgbXVzdCBiZSByaWdodC48L3A+XG4gICAgICAgICAgPGZvcm0gZGF0YS1mb3JtPVwicXVpelwiPlxuICAgICAgICAgICAgJHtzdGF0ZS5jYXJkLnF1ZXN0aW9uc1xuICAgICAgICAgICAgICAubWFwKFxuICAgICAgICAgICAgICAgIChxLCBpKSA9PiBgPGRpdiBjbGFzcz1cInFcIiBkYXRhLXE9XCIke2l9XCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInF0XCI+JHtpICsgMX0uICR7ZXNjKHEucSl9PC9kaXY+XG4gICAgICAgICAgICAgICAgJHtxLmNob2ljZXMubWFwKChjLCBqKSA9PiBgPGxhYmVsPjxpbnB1dCB0eXBlPVwicmFkaW9cIiBuYW1lPVwicSR7aX1cIiB2YWx1ZT1cIiR7an1cIj48c3Bhbj4ke2VzYyhjKX08L3NwYW4+PC9sYWJlbD5gKS5qb2luKCcnKX1cbiAgICAgICAgICAgICAgPC9kaXY+YCxcbiAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAuam9pbignJyl9XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwicm93XCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJsZWZ0XCI+XG4gICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInByaW1hcnlcIiB0eXBlPVwic3VibWl0XCI+Q2hlY2sgYW5zd2VyczwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICR7dGhpcy5zZXR0aW5ncy5oYXJkTW9kZS5lbmFibGVkID8gJycgOiAnPGJ1dHRvbiBjbGFzcz1cImdob3N0XCIgdHlwZT1cImJ1dHRvblwiIGRhdGEtYWN0PVwic2tpcFwiPlNraXA8L2J1dHRvbj4nfVxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cImdob3N0XCIgdHlwZT1cImJ1dHRvblwiIGRhdGEtYWN0PVwiY2FuY2VsXCI+Q2FuY2VsPC9idXR0b24+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L2Zvcm0+XG4gICAgICAgIDwvZGl2PjwvZGl2PmA7XG4gICAgICBjYXNlICdibG9ja2VkJzpcbiAgICAgICAgcmV0dXJuIGA8ZGl2IGNsYXNzPVwic2NyaW1cIj48ZGl2IGNsYXNzPVwiY2FyZFwiPlxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJleWVicm93XCI+PHNwYW4gY2xhc3M9XCJkb3RcIj48L3NwYW4+bXVsbCBcdTAwQjcgaGFyZCBtb2RlPC9kaXY+XG4gICAgICAgICAgPGgxPkJsb2NrZWQuPC9oMT5cbiAgICAgICAgICA8cCBjbGFzcz1cInN1YlwiPlR3byBtaXNzZXMgaW4gaGFyZCBtb2RlLiBHbyB0aGluayB3aXRob3V0IHRoZSBtYWNoaW5lIGZvciBhIGJpdC48L3A+XG4gICAgICAgICAgPGRpdiBjbGFzcz1cImJpZ1wiIGRhdGEtY291bnRkb3duPVwiJHtzdGF0ZS51bnRpbH1cIj4tLTotLTwvZGl2PlxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJyb3dcIj48ZGl2PjwvZGl2PjxidXR0b24gY2xhc3M9XCJnaG9zdFwiIGRhdGEtYWN0PVwiY2FuY2VsXCI+Q2xvc2U8L2J1dHRvbj48L2Rpdj5cbiAgICAgICAgPC9kaXY+PC9kaXY+YDtcbiAgICAgIGNhc2UgJ2Vycm9yJzpcbiAgICAgICAgcmV0dXJuIGA8ZGl2IGNsYXNzPVwic2NyaW1cIj48ZGl2IGNsYXNzPVwiY2FyZFwiPlxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJleWVicm93XCI+PHNwYW4gY2xhc3M9XCJkb3RcIj48L3NwYW4+bXVsbCBcdTAwQjcgY291bGRuJ3QgY2hlY2s8L2Rpdj5cbiAgICAgICAgICA8aDE+R2F0ZSBpcyBkb3duLjwvaDE+XG4gICAgICAgICAgPHAgY2xhc3M9XCJzdWJcIj4ke2VzYyhzdGF0ZS5tZXNzYWdlKX08L3A+XG4gICAgICAgICAgPGRpdiBjbGFzcz1cInJvd1wiPlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cImxlZnRcIj48YnV0dG9uIGNsYXNzPVwicHJpbWFyeVwiIGRhdGEtYWN0PVwic2VuZC1hbnl3YXlcIj5TZW5kIGFueXdheTwvYnV0dG9uPjwvZGl2PlxuICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cImdob3N0XCIgZGF0YS1hY3Q9XCJjYW5jZWxcIj5DYW5jZWw8L2J1dHRvbj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8ZGl2IGNsYXNzPVwiZm9vdFwiPk11bGwgZmFpbHMgb3Blbi4gRml4IHRoZSBrZXkgaW4gc2V0dGluZ3MgYW5kIGl0IHdpbGwgZ2F0ZSBhZ2Fpbi48L2Rpdj5cbiAgICAgICAgPC9kaXY+PC9kaXY+YDtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiAnJztcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIG9uQ2xpY2soZTogRXZlbnQpOiB2b2lkIHtcbiAgICBjb25zdCBoID0gdGhpcy5oYW5kbGVycztcbiAgICBpZiAoIWggfHwgIXRoaXMucm9vdCkgcmV0dXJuO1xuICAgIGNvbnN0IHRhcmdldCA9IGUudGFyZ2V0IGFzIEhUTUxFbGVtZW50O1xuICAgIGNvbnN0IGJ0biA9IHRhcmdldC5jbG9zZXN0PEhUTUxFbGVtZW50PignW2RhdGEtYWN0XScpO1xuICAgIGlmIChidG4pIHtcbiAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgIGNvbnN0IGFjdCA9IGJ0bi5kYXRhc2V0LmFjdDtcbiAgICAgIGlmIChhY3QgPT09ICdyZWFkJykgaC5vblJlYWQoKTtcbiAgICAgIGVsc2UgaWYgKGFjdCA9PT0gJ3NraXAnKSBoLm9uU2tpcCgpO1xuICAgICAgZWxzZSBpZiAoYWN0ID09PSAnY2FuY2VsJykgaC5vbkNhbmNlbCgpO1xuICAgICAgZWxzZSBpZiAoYWN0ID09PSAnc2VuZC1hbnl3YXknKSBoLm9uU2VuZEFueXdheSgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAodGFyZ2V0LmNsb3Nlc3QoJ2J1dHRvblt0eXBlPVwic3VibWl0XCJdJykpIHtcbiAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgIGNvbnN0IGZvcm0gPSB0aGlzLnJvb3QucXVlcnlTZWxlY3RvcjxIVE1MRm9ybUVsZW1lbnQ+KCdmb3JtW2RhdGEtZm9ybT1cInF1aXpcIl0nKTtcbiAgICAgIGlmICghZm9ybSkgcmV0dXJuO1xuICAgICAgY29uc3QgYW5zd2VycyA9IEFycmF5LmZyb20oZm9ybS5xdWVyeVNlbGVjdG9yQWxsPEhUTUxFbGVtZW50PignLnEnKSkubWFwKChxKSA9PiB7XG4gICAgICAgIGNvbnN0IGNoZWNrZWQgPSBxLnF1ZXJ5U2VsZWN0b3I8SFRNTElucHV0RWxlbWVudD4oJ2lucHV0OmNoZWNrZWQnKTtcbiAgICAgICAgcmV0dXJuIGNoZWNrZWQgPyBOdW1iZXIoY2hlY2tlZC52YWx1ZSkgOiBudWxsO1xuICAgICAgfSk7XG4gICAgICBoLm9uQW5zd2VyKGFuc3dlcnMpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgdGlja0NvdW50ZG93bih1bnRpbDogbnVtYmVyKTogdm9pZCB7XG4gICAgY29uc3QgZWwgPSB0aGlzLnJvb3Q/LnF1ZXJ5U2VsZWN0b3I8SFRNTEVsZW1lbnQ+KCdbZGF0YS1jb3VudGRvd25dJyk7XG4gICAgaWYgKCFlbCkgcmV0dXJuO1xuICAgIGNvbnN0IHRpY2sgPSAoKSA9PiB7XG4gICAgICBjb25zdCBsZWZ0ID0gTWF0aC5tYXgoMCwgdW50aWwgLSBEYXRlLm5vdygpKTtcbiAgICAgIGNvbnN0IG0gPSBNYXRoLmZsb29yKGxlZnQgLyA2MDAwMCk7XG4gICAgICBjb25zdCBzID0gTWF0aC5mbG9vcigobGVmdCAlIDYwMDAwKSAvIDEwMDApO1xuICAgICAgZWwudGV4dENvbnRlbnQgPSBgJHtTdHJpbmcobSkucGFkU3RhcnQoMiwgJzAnKX06JHtTdHJpbmcocykucGFkU3RhcnQoMiwgJzAnKX1gO1xuICAgICAgaWYgKGxlZnQgPiAwICYmIGVsLmlzQ29ubmVjdGVkKSBzZXRUaW1lb3V0KHRpY2ssIDUwMCk7XG4gICAgfTtcbiAgICB0aWNrKCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZXNjKHM6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBzLnJlcGxhY2UoL1smPD5cIiddL2csIChjKSA9PiAoeyAnJic6ICcmYW1wOycsICc8JzogJyZsdDsnLCAnPic6ICcmZ3Q7JywgJ1wiJzogJyZxdW90OycsIFwiJ1wiOiAnJiMzOTsnIH0pW2NdISk7XG59XG4iLCAiaW1wb3J0IHsgR2F0ZVNlc3Npb24sIHR5cGUgU2Vzc2lvblJlc3VsdCB9IGZyb20gJ0BtdWxsL2NvcmUvc2Vzc2lvbic7XG5pbXBvcnQgeyBCcmlkZ2VQcm92aWRlciwgZ2V0U3RhdGUsIHJlY29yZCB9IGZyb20gJy4vYnJpZGdlLnRzJztcbmltcG9ydCB7IE92ZXJsYXkgfSBmcm9tICcuL292ZXJsYXkudHMnO1xuaW1wb3J0IHsgZmluZENvbXBvc2VyLCBmaW5kU2VuZCwgcmVhZFRleHQsIHNldFRleHQsIHR5cGUgU2l0ZUFkYXB0ZXIgfSBmcm9tICcuL3NpdGVzLnRzJztcblxuLyoqXG4gKiBTaXRzIGluIGZyb250IG9mIHRoZSBzaXRlJ3Mgb3duIHN1Ym1pdCBoYW5kbGluZy4gQ2FwdHVyZS1waGFzZSBsaXN0ZW5lcnMgb25cbiAqIHRoZSBkb2N1bWVudCBydW4gYmVmb3JlIHRoZSBzaXRlJ3MgUmVhY3QvUHJvc2VNaXJyb3IgaGFuZGxlcnMsIHNvIGEgZ2F0ZWRcbiAqIHByb21wdCBuZXZlciByZWFjaGVzIHRoZW0uIE9uIHJlbGVhc2Ugd2UgY2xpY2sgdGhlIHNpdGUncyBzZW5kIGJ1dHRvbiAob3JcbiAqIHJlLWRpc3BhdGNoIEVudGVyKSB3aXRoIGEgYnlwYXNzIGZsYWcgc2V0LlxuICovXG5leHBvcnQgZnVuY3Rpb24gaW5zdGFsbEludGVyY2VwdChzaXRlOiBTaXRlQWRhcHRlcik6IHZvaWQge1xuICBsZXQgcmVsZWFzaW5nID0gZmFsc2U7XG4gIGxldCBhY3RpdmUgPSBmYWxzZTtcbiAgbGV0IG92ZXJsYXk6IE92ZXJsYXkgfCBudWxsID0gbnVsbDtcbiAgbGV0IHNlc3Npb246IEdhdGVTZXNzaW9uIHwgbnVsbCA9IG51bGw7XG4gIGxldCBsYXN0SG93OiAnZW50ZXInIHwgJ2NsaWNrJyA9ICdlbnRlcic7XG5cbiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIG9uS2V5ZG93biwgdHJ1ZSk7XG4gIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgb25DbGljaywgdHJ1ZSk7XG4gIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5kYXRhc2V0Lm11bGxSZWFkeSA9ICcxJztcblxuICBmdW5jdGlvbiBvbktleWRvd24oZTogS2V5Ym9hcmRFdmVudCk6IHZvaWQge1xuICAgIGlmIChyZWxlYXNpbmcgfHwgZS5rZXkgIT09ICdFbnRlcicgfHwgZS5zaGlmdEtleSB8fCBlLmlzQ29tcG9zaW5nIHx8IGUuYWx0S2V5IHx8IGUuY3RybEtleSkgcmV0dXJuO1xuICAgIGNvbnN0IGNvbXBvc2VyID0gZmluZENvbXBvc2VyKHNpdGUpO1xuICAgIGlmICghY29tcG9zZXIgfHwgIShlLnRhcmdldCBpbnN0YW5jZW9mIE5vZGUpIHx8ICFjb21wb3Nlci5jb250YWlucyhlLnRhcmdldCkpIHJldHVybjtcbiAgICBpbnRlcmNlcHQoZSwgY29tcG9zZXIsICdlbnRlcicpO1xuICB9XG5cbiAgZnVuY3Rpb24gb25DbGljayhlOiBNb3VzZUV2ZW50KTogdm9pZCB7XG4gICAgaWYgKHJlbGVhc2luZykgcmV0dXJuO1xuICAgIGNvbnN0IHNlbmQgPSBmaW5kU2VuZChzaXRlKTtcbiAgICBpZiAoIXNlbmQgfHwgIShlLnRhcmdldCBpbnN0YW5jZW9mIE5vZGUpIHx8ICFzZW5kLmNvbnRhaW5zKGUudGFyZ2V0KSkgcmV0dXJuO1xuICAgIGNvbnN0IGNvbXBvc2VyID0gZmluZENvbXBvc2VyKHNpdGUpO1xuICAgIGlmICghY29tcG9zZXIpIHJldHVybjtcbiAgICBpbnRlcmNlcHQoZSwgY29tcG9zZXIsICdjbGljaycpO1xuICB9XG5cbiAgZnVuY3Rpb24gaW50ZXJjZXB0KGU6IEV2ZW50LCBjb21wb3NlcjogSFRNTEVsZW1lbnQsIGhvdzogJ2VudGVyJyB8ICdjbGljaycpOiB2b2lkIHtcbiAgICBjb25zdCB0ZXh0ID0gcmVhZFRleHQoY29tcG9zZXIpLnRyaW0oKTtcbiAgICBpZiAoIXRleHQpIHJldHVybjtcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICBpZiAoYWN0aXZlKSByZXR1cm47XG4gICAgYWN0aXZlID0gdHJ1ZTtcbiAgICBsYXN0SG93ID0gaG93O1xuICAgIHZvaWQgcnVuKHRleHQsIGNvbXBvc2VyKTtcbiAgfVxuXG4gIGFzeW5jIGZ1bmN0aW9uIHJ1bih0ZXh0OiBzdHJpbmcsIGNvbXBvc2VyOiBIVE1MRWxlbWVudCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBzdGF0ZSA9IGF3YWl0IGdldFN0YXRlKCk7XG4gICAgICBpZiAoIXN0YXRlLnNldHRpbmdzLmVuYWJsZWQgfHwgIXN0YXRlLnNldHRpbmdzLnNpdGVzW3NpdGUuaWRdKSB7XG4gICAgICAgIGFjdGl2ZSA9IGZhbHNlO1xuICAgICAgICByZWxlYXNlKGNvbXBvc2VyKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgb3ZlcmxheSA9IG5ldyBPdmVybGF5KHN0YXRlLnNldHRpbmdzKTtcbiAgICAgIHNlc3Npb24gPSBuZXcgR2F0ZVNlc3Npb24oe1xuICAgICAgICBwcm92aWRlcjogbmV3IEJyaWRnZVByb3ZpZGVyKCksXG4gICAgICAgIHNldHRpbmdzOiBzdGF0ZS5zZXR0aW5ncyxcbiAgICAgICAgbWVtb3J5OiBzdGF0ZS5tZW1vcnksXG4gICAgICAgIGJsb2NrOiBzdGF0ZS5ibG9jayxcbiAgICAgICAgc2l0ZTogc2l0ZS5pZCxcbiAgICAgIH0pO1xuICAgICAgb3ZlcmxheS5yZW5kZXIoeyBraW5kOiAnY2xhc3NpZnlpbmcnIH0sIGhhbmRsZXJzKGNvbXBvc2VyKSk7XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBzZXNzaW9uLnN1Ym1pdCh0ZXh0KTtcbiAgICAgIGF3YWl0IGhhbmRsZShyZXN1bHQsIGNvbXBvc2VyLCB0ZXh0KTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIC8vIEFueXRoaW5nIHVuZXhwZWN0ZWQ6IGZhaWwgb3BlbiwgbmV2ZXIgdHJhcCB0aGUgdXNlci5cbiAgICAgIGNvbnNvbGUud2FybignW211bGxdIGludGVyY2VwdCBlcnJvciwgcmVsZWFzaW5nJywgZXJyKTtcbiAgICAgIG92ZXJsYXk/LmhpZGUoKTtcbiAgICAgIGFjdGl2ZSA9IGZhbHNlO1xuICAgICAgcmVsZWFzZShjb21wb3Nlcik7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgZnVuY3Rpb24gaGFuZGxlKHJlc3VsdDogU2Vzc2lvblJlc3VsdCwgY29tcG9zZXI6IEhUTUxFbGVtZW50LCBvcmlnaW5hbDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdm9pZCByZWNvcmQoeyBldmVudDogcmVzdWx0LmV2ZW50LCByZW1lbWJlckNvbmNlcHQ6IHJlc3VsdC5yZW1lbWJlckNvbmNlcHQsIGJsb2NrOiByZXN1bHQuYmxvY2sgPz8gdW5kZWZpbmVkIH0pO1xuICAgIGNvbnN0IHN0ID0gcmVzdWx0LnN0YXRlO1xuICAgIGlmIChzdC5raW5kID09PSAncmVsZWFzZScpIHtcbiAgICAgIG92ZXJsYXk/LmhpZGUoKTtcbiAgICAgIGlmIChzdC5wcm9tcHQgIT09IG9yaWdpbmFsKSBzZXRUZXh0KGNvbXBvc2VyLCBzdC5wcm9tcHQpO1xuICAgICAgYWN0aXZlID0gZmFsc2U7XG4gICAgICByZWxlYXNlKGNvbXBvc2VyKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHN0LmtpbmQgPT09ICdsb2FkaW5nLWNhcmQnKSB7XG4gICAgICBvdmVybGF5Py5yZW5kZXIoc3QsIGhhbmRsZXJzKGNvbXBvc2VyKSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIG92ZXJsYXk/LnJlbmRlcihzdCwgaGFuZGxlcnMoY29tcG9zZXIpKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGhhbmRsZXJzKGNvbXBvc2VyOiBIVE1MRWxlbWVudCkge1xuICAgIHJldHVybiB7XG4gICAgICBvblJlYWQ6ICgpID0+IHNlc3Npb24gJiYgdm9pZCBoYW5kbGUoc2Vzc2lvbi5zdGFydFF1aXooKSwgY29tcG9zZXIsIHJlYWRUZXh0KGNvbXBvc2VyKS50cmltKCkpLFxuICAgICAgb25BbnN3ZXI6IChhbnN3ZXJzOiBBcnJheTxudW1iZXIgfCBudWxsPikgPT4gc2Vzc2lvbiAmJiB2b2lkIGhhbmRsZShzZXNzaW9uLmFuc3dlcihhbnN3ZXJzKSwgY29tcG9zZXIsIHJlYWRUZXh0KGNvbXBvc2VyKS50cmltKCkpLFxuICAgICAgb25Ta2lwOiAoKSA9PiBzZXNzaW9uICYmIHZvaWQgaGFuZGxlKHNlc3Npb24uc2tpcCgpLCBjb21wb3NlciwgcmVhZFRleHQoY29tcG9zZXIpLnRyaW0oKSksXG4gICAgICBvblNlbmRBbnl3YXk6ICgpID0+IHNlc3Npb24gJiYgdm9pZCBoYW5kbGUoc2Vzc2lvbi5yZWxlYXNlQWZ0ZXJFcnJvcigpLCBjb21wb3NlciwgcmVhZFRleHQoY29tcG9zZXIpLnRyaW0oKSksXG4gICAgICBvbkNhbmNlbDogKCkgPT4ge1xuICAgICAgICBvdmVybGF5Py5oaWRlKCk7XG4gICAgICAgIGFjdGl2ZSA9IGZhbHNlO1xuICAgICAgfSxcbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gcmVsZWFzZShjb21wb3NlcjogSFRNTEVsZW1lbnQpOiB2b2lkIHtcbiAgICByZWxlYXNpbmcgPSB0cnVlO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBidG4gPSBmaW5kU2VuZChzaXRlKTtcbiAgICAgIGlmIChidG4gJiYgIWJ0bi5kaXNhYmxlZCAmJiBsYXN0SG93ID09PSAnY2xpY2snKSB7XG4gICAgICAgIGJ0bi5jbGljaygpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29tcG9zZXIuZm9jdXMoKTtcbiAgICAgICAgY29uc3QgZXYgPSBuZXcgS2V5Ym9hcmRFdmVudCgna2V5ZG93bicsIHsga2V5OiAnRW50ZXInLCBjb2RlOiAnRW50ZXInLCBrZXlDb2RlOiAxMywgd2hpY2g6IDEzLCBidWJibGVzOiB0cnVlLCBjYW5jZWxhYmxlOiB0cnVlIH0pO1xuICAgICAgICBjb25zdCBoYW5kbGVkID0gIWNvbXBvc2VyLmRpc3BhdGNoRXZlbnQoZXYpO1xuICAgICAgICAvLyBTaXRlcyB0aGF0IGlnbm9yZSBzeW50aGV0aWMgRW50ZXIgc3RpbGwgaGF2ZSBhIGNsaWNrYWJsZSBzZW5kIGJ1dHRvbi5cbiAgICAgICAgaWYgKCFoYW5kbGVkICYmIGJ0biAmJiAhYnRuLmRpc2FibGVkKSBidG4uY2xpY2soKTtcbiAgICAgIH1cbiAgICB9IGZpbmFsbHkge1xuICAgICAgc2V0VGltZW91dCgoKSA9PiAocmVsZWFzaW5nID0gZmFsc2UpLCA0MDApO1xuICAgIH1cbiAgfVxufVxuIiwgImltcG9ydCB7IGRldGVjdFNpdGUgfSBmcm9tICcuL3NpdGVzLnRzJztcbmltcG9ydCB7IGluc3RhbGxJbnRlcmNlcHQgfSBmcm9tICcuL2ludGVyY2VwdC50cyc7XG5cbmNvbnN0IHNpdGUgPSBkZXRlY3RTaXRlKCk7XG5pZiAoc2l0ZSkge1xuICBpbnN0YWxsSW50ZXJjZXB0KHNpdGUpO1xufSBlbHNlIHtcbiAgY29uc29sZS5kZWJ1ZygnW211bGxdIG5vIHNpdGUgYWRhcHRlciBmb3InLCBsb2NhdGlvbi5ob3N0bmFtZSk7XG59XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBWUEsSUFBTSxRQUF1QjtBQUFBLEVBQzNCO0FBQUEsSUFDRSxJQUFJO0FBQUEsSUFDSixVQUFVLENBQUMsb0JBQW9CLCtDQUErQyxxQkFBcUIsZUFBZTtBQUFBLElBQ2xILE1BQU0sQ0FBQyxxQ0FBcUMsb0NBQW9DLDRCQUE0QjtBQUFBLEVBQzlHO0FBQUEsRUFDQTtBQUFBLElBQ0UsSUFBSTtBQUFBLElBQ0osVUFBVSxDQUFDLDJDQUEyQyxpREFBaUQsc0NBQXNDO0FBQUEsSUFDN0ksTUFBTSxDQUFDLHFDQUFxQyxxQ0FBcUMseUNBQXlDO0FBQUEsRUFDNUg7QUFBQSxFQUNBO0FBQUEsSUFDRSxJQUFJO0FBQUEsSUFDSixVQUFVLENBQUMseUNBQXlDLDZDQUE2QyxxREFBcUQ7QUFBQSxJQUN0SixNQUFNLENBQUMsc0JBQXNCLHFDQUFxQyxtQ0FBbUM7QUFBQSxFQUN2RztBQUNGO0FBRU8sU0FBUyxhQUFpQztBQUMvQyxRQUFNLE9BQU8sU0FBUztBQUN0QixNQUFJLEtBQW9CO0FBQ3hCLE1BQUksc0JBQXNCLEtBQUssSUFBSSxLQUFLLDJCQUEyQixLQUFLLElBQUksRUFBRyxNQUFLO0FBQUEsV0FDM0Usb0JBQW9CLEtBQUssSUFBSSxFQUFHLE1BQUs7QUFBQSxXQUNyQyw2QkFBNkIsS0FBSyxJQUFJLEVBQUcsTUFBSztBQUFBLE1BRWxELE1BQU0sU0FBUyxnQkFBZ0IsUUFBUSxZQUFtQztBQUMv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TSxXQUFXLEtBQUssT0FBTyxRQUFRLGtCQUFrQixHQUFHLFVBQVUsU0FBUyxRQUFRLEVBQUUsS0FBSyxDQUFDO0FBQUEsTUFDM0csVUFBVSxNQUFNO0FBQ2QsaUJBQVMsS0FBSztBQUNkLGlCQUFTO0FBQUEsTUFDWDtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBRUEsV0FBUyxRQUFRLFVBQTZCO0FBQzVDLGdCQUFZO0FBQ1osUUFBSTtBQUNGLFlBQU0sTUFBTSxTQUFTQSxLQUFJO0FBQ3pCLFVBQUksT0FBTyxDQUFDLElBQUksWUFBWSxZQUFZLFNBQVM7QUFDL0MsWUFBSSxNQUFNO0FBQUEsTUFDWixPQUFPO0FBQ0wsaUJBQVMsTUFBTTtBQUNmLGNBQU0sS0FBSyxJQUFJLGNBQWMsV0FBVyxFQUFFLEtBQUssU0FBUyxNQUFNLFNBQVMsU0FBUyxJQUFJLE9BQU8sSUFBSSxTQUFTLE1BQU0sWUFBWSxLQUFLLENBQUM7QUFDaEksY0FBTSxVQUFVLENBQUMsU0FBUyxjQUFjLEVBQUU7QUFFMUMsWUFBSSxDQUFDLFdBQVcsT0FBTyxDQUFDLElBQUksU0FBVSxLQUFJLE1BQU07QUFBQSxNQUNsRDtBQUFBLElBQ0YsVUFBRTtBQUNBLGlCQUFXLE1BQU8sWUFBWSxPQUFRLEdBQUc7QUFBQSxJQUMzQztBQUFBLEVBQ0Y7QUFDRjs7O0FDekhBLElBQU0sT0FBTyxXQUFXO0FBQ3hCLElBQUksTUFBTTtBQUNSLG1CQUFpQixJQUFJO0FBQ3ZCLE9BQU87QUFDTCxVQUFRLE1BQU0sOEJBQThCLFNBQVMsUUFBUTtBQUMvRDsiLAogICJuYW1lcyI6IFsic2l0ZSIsICJzaXRlIiwgImNsYXNzaWZpY2F0aW9uIiwgInNpdGUiLCAic2VuZCJdCn0K

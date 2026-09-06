# Mull

Opal for AI. You type a lazy, low-effort question into ChatGPT, Claude, or Gemini. Mull catches it and makes you read a short explanation of the concept and pass a small quiz before the answer comes through. Legit work goes straight through.

Every provider ships a "study mode" toggle. Nobody keeps it on. Mull is the version with teeth: it sits in front of the chat you already use, and the unlock is comprehension instead of a timer.

- **No account.** You sign in with your own AI provider key.
- **No server, no telemetry.** Your prompts go to your provider and nowhere else. Your key lives in your browser.
- **Two surfaces, one engine.** A browser extension for chatgpt.com, claude.ai, and gemini.google.com, and a web app that is its own chat client with the gate built in.

## How the gate works

1. You hit send. Mull's classifier reads the prompt and labels it LAZY, LEGIT, or EDGE with a confidence.
2. LEGIT (your own draft, your own code, a decision, a status check) is released immediately.
3. LAZY (a concept lookup, a "solve this for me") gets a card: 3 to 6 plain sentences on the underlying concept, then 1 to 3 multiple-choice questions.
4. Every question right releases the prompt. A miss sends you back to the explanation. In hard mode, misses block you for a while.
5. A concept you passed stays unlocked for a week, so you are never quizzed twice on the same idea.

Prefix a prompt with `work:` to bypass the gate. Skips are allowed outside hard mode but count against your hold rate.

## Install the extension (unpacked)

```bash
pnpm install
pnpm build:ext
```

Then open `chrome://extensions`, turn on Developer mode, choose **Load unpacked**, and pick `apps/extension/dist`. The options page opens on install; pick a provider and paste a key. Use **Test key** to confirm it works.

To make a zip for sharing: `pnpm --filter @mull/extension zip`.

## Run the web app

```bash
pnpm dev:web
```

Open http://localhost:3111. Settings are in the nav. Pick **Demo** as the provider to try the gate without a key.

## Providers

| Provider | Key | Default model |
|---|---|---|
| Anthropic | `sk-ant-...` | `claude-opus-5` |
| OpenAI | `sk-...` | `gpt-4o-mini` |
| Google Gemini | `AIza...` | `gemini-2.5-flash` |
| Demo | none | keyword rules, canned answers |

The classifier is a ~60-token JSON reply and the card is a short lesson, so cheaper models are fine. Override the model in settings.

## Development

```
packages/core      gate engine: classifier, card builder, session state machine, stats, providers
apps/extension     MV3 extension (esbuild). Service worker owns network; content script owns the gate.
apps/web           Next 16 chat client with the same engine, localStorage only.
```

```bash
pnpm test                       # core vitest + extension + web Playwright
pnpm --filter @mull/core eval   # classifier eval against the labeled prompt set
```

The eval reads `Brain/projects/mull/data/prompt-labels-seed.md` by default; set `MULL_SEED` to point elsewhere. `MULL_EVAL_PROVIDER` picks `anthropic`, `openai`, `gemini`, `claude-cli` (local Claude Code CLI, no key), or `mock`.

## Not in this version

Accounts, server, payments, provider OAuth, native iOS, Chrome Web Store listing.

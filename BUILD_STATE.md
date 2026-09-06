# Loop state · mull-build

## Last run
2026-09-06 (session 1, one sitting). v0 -> v1 -> v2 reached. Loop stopped per VISION stop condition. Next run resumes from "Open follow-ups".

## In progress
- (nothing; v2 reached)

## Open follow-ups (not in v2 scope, ranked)
1. Real-site selector check: load dist/ unpacked and try chatgpt.com, claude.ai, gemini with a real key. Fixtures mimic the composers; the live DOMs will drift.
2. Streaming chat replies in the web app (v0 chat is one completion, no stream).
3. "Last gate seen" indicator in the popup so a silently broken selector is visible.
4. Eval on Dennis's corrected labels once he edits the seed file; rerun `MULL_EVAL_PROVIDER=claude-cli pnpm eval` and update the prompt rules.
5. Gemini sign-in research + Anthropic third-party app developer path (open loop in Brain).

## Completed
- 2026-09-06 core: types, prompts, classify/shouldGate, gate card + grading + shuffle, GateSession state machine, stats reducer + concept memory, allowlist, providers (anthropic SDK / openai / gemini / mock), 35 vitest green, typecheck clean.
- 2026-09-06 eval harness: seed-table parser, confusion matrix, per-label gating numbers; mock baseline 53% exact (keyword rules, expected).
- 2026-09-06 v2 DONE. Icons (Playwright-rendered PNG), zip packager (78 KB, 11 files), README, SECURITY notes, /about landing copy, seven-day stats table, font-variable fix (html-level next/font classes), screenshot scripts for both surfaces, all four palette/theme combos checked by eye. Extension 11 Playwright green, web 4 green, core 44 vitest green, both production builds clean.
- 2026-09-06 v1 DONE. Provider adapter request-shape tests, gemini fixture, concept-memory / hard-mode / popup tests, release-bypass race fixed. Eval on Haiku (local CLI), normal strictness, after prompt fix: exact 42/55 (76%), LEGIT wrongly gated 0/21, LAZY gated 16/22 (73%). Before fix: 41/55, 1/21, 18/22.
- 2026-09-06 v0 DONE. web app shell: Next 16 chat + inline gate card + settings + stats, localStorage only, mock provider demo mode; 4 Playwright tests green (gate+answer, legit passthrough, stats reflect pass, palette persists). `next build` clean, 4 static routes.
- 2026-09-06 extension: MV3 (esbuild), background SW owns provider calls, content script capture-phase intercept on Enter + send click, shadow-DOM overlay (classifying / explain / quiz / blocked / error), popup, options. 7 Playwright tests green on chatgpt + claude fixtures (gate, wrong answers bounce, legit passthrough, allowlist strip, skip counted, disabled passthrough, click-release).

## Escalated to Dennis
- Buy mull.school (deferred by Dennis 2026-09-06).
- Correct labels in `Brain/projects/mull/data/prompt-labels-seed.md` (classifier spec).

## Lessons learned (write here, not in chat)
- Import core by subpath (`@mull/core/session`, `/stats`, `/provider-info`) from anything that is not the service worker. The index re-exports the Anthropic SDK and esbuild cannot tree-shake it: options.js went 3.0 MB -> 34 KB.
- node `--experimental-strip-types` rejects TS parameter properties; use `--experimental-transform-types` for the eval runner.
- next/font variables must sit on <html> if any :root rule references them; on <body> the :root var chain resolves to nothing and every font silently falls back to Times. Screenshot pass caught it, typecheck and tests did not.
- Next 16 dev blocks /_next chunks for origins not in `allowedDevOrigins`; a Playwright baseURL of 127.0.0.1 silently renders SSR-only pages (nav shows, client pages stay empty, no console error). Add 127.0.0.1 + localhost.
- Playwright `addInitScript` re-runs on every navigation; seed localStorage once via page.evaluate after a first goto or reloads wipe what the test just saved.
- The claude CLI in -p mode keeps its own agent system prompt and ignores --system-prompt-file; fold instructions into the stdin prompt for eval use.
- Playwright + MV3: launchPersistentContext with --load-extension, then `context.serviceWorkers()[0]` to seed chrome.storage. Fixtures declare the site on `<html data-mull-site>` so the content script matches 127.0.0.1 under the --test manifest.

## Stop conditions
- v2 checklist in VISION.md fully green, or Dennis says stop.

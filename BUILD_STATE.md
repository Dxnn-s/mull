# Loop state · mull-build

## Last run
2026-09-06 (session 1). Repo scaffolded. Target: v2 per VISION.md.

## In progress
- v1: provider adapter request-shape tests (fake fetch), gemini fixture, extension tests for concept memory / hard mode / popup, real-model eval numbers.

## Completed
- 2026-09-06 core: types, prompts, classify/shouldGate, gate card + grading + shuffle, GateSession state machine, stats reducer + concept memory, allowlist, providers (anthropic SDK / openai / gemini / mock), 35 vitest green, typecheck clean.
- 2026-09-06 eval harness: seed-table parser, confusion matrix, per-label gating numbers; mock baseline 53% exact (keyword rules, expected).
- 2026-09-06 v0 DONE. web app shell: Next 16 chat + inline gate card + settings + stats, localStorage only, mock provider demo mode; 4 Playwright tests green (gate+answer, legit passthrough, stats reflect pass, palette persists). `next build` clean, 4 static routes.
- 2026-09-06 extension: MV3 (esbuild), background SW owns provider calls, content script capture-phase intercept on Enter + send click, shadow-DOM overlay (classifying / explain / quiz / blocked / error), popup, options. 7 Playwright tests green on chatgpt + claude fixtures (gate, wrong answers bounce, legit passthrough, allowlist strip, skip counted, disabled passthrough, click-release).

## Escalated to Dennis
- Buy mull.school (deferred by Dennis 2026-09-06).
- Correct labels in `Brain/projects/mull/data/prompt-labels-seed.md` (classifier spec).

## Lessons learned (write here, not in chat)
- Import core by subpath (`@mull/core/session`, `/stats`, `/provider-info`) from anything that is not the service worker. The index re-exports the Anthropic SDK and esbuild cannot tree-shake it: options.js went 3.0 MB -> 34 KB.
- node `--experimental-strip-types` rejects TS parameter properties; use `--experimental-transform-types` for the eval runner.
- Next 16 dev blocks /_next chunks for origins not in `allowedDevOrigins`; a Playwright baseURL of 127.0.0.1 silently renders SSR-only pages (nav shows, client pages stay empty, no console error). Add 127.0.0.1 + localhost.
- Playwright `addInitScript` re-runs on every navigation; seed localStorage once via page.evaluate after a first goto or reloads wipe what the test just saved.
- The claude CLI in -p mode keeps its own agent system prompt and ignores --system-prompt-file; fold instructions into the stdin prompt for eval use.
- Playwright + MV3: launchPersistentContext with --load-extension, then `context.serviceWorkers()[0]` to seed chrome.storage. Fixtures declare the site on `<html data-mull-site>` so the content script matches 127.0.0.1 under the --test manifest.

## Stop conditions
- v2 checklist in VISION.md fully green, or Dennis says stop.

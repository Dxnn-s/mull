# Security and privacy notes

Mull reads every prompt the user sends to an AI chat. That is the whole product, so the bar is: nothing leaves the device except the calls the user already expects to their own provider.

## What leaves the device

- Classifier and gate-card requests to the provider the user picked (`api.anthropic.com`, `api.openai.com`, `generativelanguage.googleapis.com`). Each carries the user's prompt text and the user's own key.
- Nothing else. No analytics, no crash reporting, no update pings, no Mull server.

## Where things are stored

- **Extension:** `chrome.storage.local` only (not `sync`, so the key never rides Google's sync). Keys: `settings` (includes the API key), `stats`, `memory`, `block`.
- **Web app:** `localStorage` under `mull.*`. Same shapes.
- Stats keep the last 200 events with timestamps, site, verdict, outcome, concept name, attempt count, and time on card. They never store prompt text.
- Corrections ("This was real work") keep a djb2 hash of the prompt, the verdict, and the concept name. The hash is recognizable, not reversible, and the export is a local copy to the clipboard.

## Extension surface

- The service worker owns every network call. Content scripts never see the key and never fetch; they message the worker. Host permissions are limited to the three provider API origins.
- The content script runs only on the three chat hosts (plus 127.0.0.1 in the `--test` build, which is never shipped).
- The overlay renders inside a closed-off shadow root. All model-generated text goes through `esc()` before `innerHTML`. Model output is never executed.
- Prompts are wrapped in `<prompt>` tags in the classifier call so instructions inside the user's text read as data. A prompt that tries to steer the classifier can at worst mislabel itself, and a wrong LEGIT just means no gate.
- The gate fails open: a provider error releases the prompt and shows why. Every provider call has a deadline (15 s classify, 30 s card, 60 s chat) and the content script's bridge to the service worker has its own. While Mull is waiting, Enter twice or "send anyway" releases the prompt as typed. Mull never traps the user behind a broken key or a sleeping worker.
- Age terms: Anthropic consumer terms and the Gemini API terms are 18+; OpenAI is 13+ with parental permission. The settings pages say so next to the key field.

## Web app surface

- `dangerouslySetInnerHTML` is used twice, both for static strings authored in the repo (palette CSS and the pre-paint theme script). Never for user or model content.
- No server routes. `next build` produces four static pages.

## Known limits

- The user can disable the extension or use a private window. Same limit ScreenZen and one sec accept on desktop; the stats are the counter-pressure.
- An API key in `chrome.storage.local` is readable by anyone with the profile's filesystem. That is the same threat model as every BYO-key tool.
- Site selectors will break when chatgpt.com, claude.ai, or gemini change their composers. When that happens the gate silently does nothing; the popup still shows the sites toggle as on. A "last gate seen" indicator is a good follow-up.

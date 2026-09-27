# Security and privacy notes

The shipping product is the phone app in `apps/mobile`, a PWA served from Vercel. `apps/extension` and `apps/web` are shelved; this document is about what ships.

Mull's job is to sit between a student and an AI chat, so it handles two things worth being careful with: what they type, and an API key. The bar is that nothing leaves the device except calls the user asked for, to a provider they chose.

## What leaves the device

- **Nothing, with no account linked.** The card bank ships inside the app. Once the page has loaded, Mull makes no provider calls at all and works offline.
- **With an account linked:** a classifier call and a card call to the one provider the user picked (`openrouter.ai`, `api.openai.com`, `api.anthropic.com`, `generativelanguage.googleapis.com`). Each carries their question and their own key, direct from the device.
- The app is a website, so loading it fetches HTML, the bundle and fonts from Vercel, which keeps ordinary web server logs. That is the only thing any Mull-controlled host ever sees, and it sees a page load, not a question.
- No analytics, no crash reporting, no telemetry, no Mull server. Verified: no such dependency, and no `fetch` outside the provider adapters.

## What is stored, on the device only

`localStorage` under `mull.*` (AsyncStorage on native).

- Settings, including the API key, in cleartext. Subjects, streak, age band.
- Concept memory: the **name of each topic passed** and when, which drives the spaced ladder. The name comes from the model, not from the user's words — if the model returns no concept the app refuses the card rather than falling back to the text.
- The last 200 gate events: timestamp, verdict, outcome, concept name, attempts, time on card.
- A djb2 checksum of recent prompts, so "you asked this already today" works. **This is a 32-bit checksum, not a one-way function.** Against a list of likely student questions it is guessable, and collisions happen. It is a speed bump, not a lock.
- **Raw prompt text is never written to storage.**

## The key

A user-supplied platform key spends the whole account it belongs to, which matters because the realistic case is a teenager using a parent's. The paste box says so.

- OAuth (OpenRouter) is preferred: PKCE, no client secret, no backend, and the key is scoped to that user and revocable from their dashboard.
- `localStorage` is the same exposure as every BYO-key tool. There is no HTML sink in the app — every model string renders into a React Native `<Text>`, and there is no `innerHTML` or `dangerouslySetInnerHTML` outside static repo-authored CSS — so the realistic vector is a compromised dependency or hosting account, not a bug here.
- `Content-Security-Policy` in `apps/mobile/vercel.json` pins `connect-src` to the four provider hosts. Even with script execution on the origin, a stolen key cannot be posted anywhere else. `frame-ancestors 'none'`, `object-src 'none'`, `Referrer-Policy: no-referrer` so the OAuth code never rides a referer header.
- On native this must move to `expo-secure-store`. It has not, and native has not shipped.

## Age

Every provider states a minimum age in its own terms, and the audience is school students. The app asks once for a band, never verifies it, and never sends it anywhere.

- Under 13: nothing can be linked. The card bank is the whole product for this band and needs no account.
- 13 to 17: OpenAI only, the one provider whose terms allow it, with parental permission.
- 18 and over: all four.

Providers a band cannot use are absent from the screen rather than shown with a warning beside a working button.

## Model input and output

- User text is fenced in `<prompt>` tags, and angle brackets are stripped from it first, so the delimiter cannot be closed from inside. The card prompt also tells the model that anything inside the fence is a question, never an instruction.
- Model output is parsed by a brace-matching walk ending in `JSON.parse` — no `eval`, no `new Function` — and every field is type-checked, with bad answer indices rejected. Hostile output throws and the bank answers instead.
- Output length is capped by `maxTokens`, so a hostile model cannot flood the UI.
- What remains: a determined student can still talk a weak model into odd explanation text, and that text is rendered. There is no moderation layer and no in-app reporting. Both are required before any store submission that declares a child audience.

## Free models

OpenRouter's `:free` endpoints require the account to permit logging of what they receive, and that is their condition, not ours. The provider screen and the privacy page both say so before anything is sent.

## Known limits

- **The gate is bypassable.** `preClassify` releases any prompt with a code fence, over 600 characters, or four or more newlines, before any model call. A student works that out quickly. It is deliberate — it is the escape hatch that stops real work being blocked — but it is a hole and the record should not flatter someone using it.
- A key in `localStorage` is readable by anyone with the device unlocked or the profile's filesystem.
- The iOS Shortcuts block is soft. It opens Mull when a blocked app opens; it cannot stop the user closing Mull and going back. The real shield needs Apple's Screen Time entitlement, which needs a paid developer account.
- There is no age verification, only a question. Nothing on a device can verify age, and claiming otherwise would be worse than saying this.

## Reporting

Open an issue at github.com/Dxnn-s/mull. There is no user data on any server to breach; the realistic report is a bug in this app or a mistaken claim in this file.

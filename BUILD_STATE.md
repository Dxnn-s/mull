# Loop state · mull-build

## Last run
2026-09-11 (session 4). LIVE as a PWA: https://mull-dxnn-s-projects.vercel.app · repo https://github.com/Dxnn-s/mull · auto-deploys on push to master.

## Earlier
2026-09-08 (session 2). Wave 3 shipped from `Brain/projects/mull/ideas-2026-09-08.md` (the ranked plan: 10 findings, 35 ideas, integrations table, build order). Session 1 (2026-09-06) reached v2.

## In progress
- Session B (Screen Time module) still gated on the Apple Developer enrolment. Everything else that does not need Apple is done.

## Done in session 4 (2026-09-10/11)
- Paper-and-ink redesign, light by default. Orb replaced by a tick-mark dial. One accent, no glow, no cyan, print radii, editorial layout, label-only tabs.
- Guilloché seal as the signature visual: `src/guilloche.ts` draws one engraved spiral whose figure comes from the record (lobes from concepts, depth from streak). Fills the dial, stamps the Record page, and is the icon set in a bolder small-size cut.
- PWA: manifest, service worker, apple-touch-icon, Add to Home Screen hint, and the Shortcuts recipe on the web build's blocked-apps screen.
- Shipped: pushed to GitHub (first backup this project has ever had), linked Vercel on the dxnn-s team with rootDirectory apps/mobile, disabled SSO protection so the URL is public.
- Fixed three deploy-only failures: Vercel ran no build at all (needed an explicit vercel.json for a pnpm workspace); routes 404'd (cleanUrls); and the dial rendered 0x0 on a cold load.
- Bundle: dropped 30 unused font faces (35 ttf -> 5) and shrank the grain plate. Web export 4.8MB -> 2.9MB.

## Old in progress
- PIVOT 2026-09-08 evening: Dennis wants the app, not the extension ("hard to market and monetize"; "heavy inspo from Opal"). Product = iPhone app that shields the AI apps the user picks (Screen Time API) with a subject quiz as the unlock. Plan: `Brain/projects/mull/app-plan.md`. Design spec DONE: `Brain/projects/mull/design/mobile-spec.md` (483 lines: tokens, orb states, seven screens, nav, shield text, a11y, do-nots).
- Session A (in progress, after a crash mid-install): `apps/mobile` Expo SDK 57 + expo-router, `.npmrc node-linker=hoisted` for the workspace, metro watches the root. Written: theme provider with all four token sets and Dynamic Type caps, AsyncStorage store (core shapes + session/unlock/saved), quiz wrapper (per-subject concept bank, pickConcept with memory, makeCard via core, gradeCard with review + reshuffle), Orb (halo/core/ring layers, six states, breathe/pulse, reduced motion), UI kit, and routes: (tabs) home/sessions/stats/you, unlock modal (loading/explain/quiz/missed/blocked), subjects, blocked-apps placeholder, paywall layout. Session A DONE (commit 'mobile: Expo app scaffold'): tsc clean, 5 vitest on the quiz wrapper, `expo export --platform ios` bundles 3.3 MB hbc. Not yet run on a phone (no Expo Go run yet; needs Dennis's iPhone + `pnpm --filter @mull/mobile start`). Next: Session B = Screen Time module (kingstinct/react-native-device-activity, custom dev client via EAS, entitlement request the same day), Session C = quiz server + RevenueCat paywall.
- Wave 3 tail landed: answer-leak guard, pre-classifier, upgrade test; plus schedule/recap/consent/health in core (79 vitest). Extension UI for those (dead-key, health probe, first-run, study hours, recap) is PAUSED pending Dennis's call on whether the extension stays as a companion.

## Next, in the plan's order (see the ideas file for the 4-condition test on each)
1. **Live pass (idea 2, needs Dennis + a key).** Load `apps/extension/dist` unpacked, send 3 lazy + 2 legit prompts on gemini.google.com first, then chatgpt.com, then claude.ai. Save each real composer subtree as a fixture. Record the 10-second Gemini clip.
2. Idea 15 dead-key handling (S), 9 selector health probe (S), 13 first-run chips + consent (S, after 8), 12 study hours (S), 14 Monday recap text (S).
3. Idea 18 Chrome Web Store unlisted paperwork (M): developer account under a parent ($5), `apps/extension/store/` copy, hosted privacy policy. Longest pole, start in parallel.
4. Idea 20 user-zero week with the stop rule (hold rate under 40% or Mull turned off twice = fix the card before any distribution idea).
5. Then 11 spaced ladder, 17 classifier fix loop, 19 measurement, 16 demo front door, 22 landing page, 26 vault export spine + 27 brief line.

## Completed
- 2026-09-08 wave 3 (commit "wave 3: ..."): answer key after a miss with reshuffle; timeouts on every provider path + bridge, send-anyway pill link and double-Enter; cheap defaults (gpt-5-nano / gemini-2.5-flash-lite / claude-haiku-4-5) with per-model parameter branching, cost + age lines; cancelled outcome + time-in-card + median tile + walked-away column; "This was real work" with hashed correction rows exportable from both settings pages; sites.ts rewritten from 2026 recon, click-first release with enable wait. core 64 vitest, extension 14 Playwright, web 6 Playwright. Extension 0.1.0.
- 2026-09-08 follow-ups from session 1: streaming chat replies on every provider (b2128ab); per-site "last prompt seen" in the popup (bf6ef7e).
- 2026-09-08 research + plan: `ideas-2026-09-08.md` via a 12-agent workflow (six research lanes, three idea angles, two judges, one synthesizer). Key findings: ChatGPT textarea fallbacks were an un-gate bug; no provider sign-in is open to indie apps (OpenRouter PKCE is the only one-click path); Opus default cost 50x too much and a naive swap to Haiku would 400; Gemini is the school-issued surface and Claude is 18+; the retry loop taught the lure (no feedback, same order); no timeout anywhere was the one way Mull could trap a user.
- 2026-09-06 v2 DONE. Icons (Playwright-rendered PNG), zip packager, README, SECURITY notes, /about landing copy, seven-day stats table, font-variable fix (html-level next/font classes), screenshot scripts for both surfaces, all four palette/theme combos checked by eye.
- 2026-09-06 v1 DONE. Provider adapter request-shape tests, gemini fixture, concept-memory / hard-mode / popup tests, release-bypass race fixed. Eval on Haiku (local CLI), normal strictness, after prompt fix: exact 42/55 (76%), LEGIT wrongly gated 0/21, LAZY gated 16/22 (73%).
- 2026-09-06 v0 DONE. Core engine + tests, MV3 extension on fixture composers, Next 16 web shell.

## Escalated to Dennis
- The live pass on the three real sites (item 1 above). Fixtures cannot prove the selectors; the session-2 rewrite is from published recon, not from a logged-in page.
- Buy mull.school (deferred 2026-09-06).
- Correct labels in `Brain/projects/mull/data/prompt-labels-seed.md`; the "This was real work" export now produces candidate rows too.
- Chrome Web Store developer account must be held by an adult and its email can never change (idea 18).

## Not doing (from the plan)
Sign in with Claude, Codex/ChatGPT OAuth, Google sign-in, a Mull-hosted tier (held), fetch-level blocking, Safari, native iOS, district channel, Socratic chat drift, confidence sliders, MutationObserver on body, auto-importing subjects, extra permissions.

## Lessons learned (write here, not in chat)
- The screenshot harness seeded localStorage then navigated a SECOND time, so every shot was a warm load. That hid a dial that collapsed to 0x0 on a genuine first paint, and it only surfaced on the live site. `useWindowDimensions` returns 0 during static render; measure with onLayout instead. The harness now shoots a cold load first and fails if any svg comes back 0 wide.
- Vercel auto-detects nothing useful for an Expo app in a pnpm workspace: the first deploy ran no build at all (25ms, no install) and served only `public/`, so every route 404'd but the manifest still resolved, which made it look half-working. With rootDirectory set to a subfolder it never looks at the workspace root, so the install command has to point there by hand.
- New Vercel projects default to SSO protection on all deployment URLs, which returns the login page with HTTP 200. Checking status codes alone says the site is fine; check the body.
- Importing from a font package's root pulls every weight and italic it ships. Use the per-weight subpath.
- A fixture written from the selector file proves the selectors match the fixture, not the site. Save real composer subtrees as fixtures.
- Test assertions like "no prompt text in the row" must not grep for words that legitimately appear in the concept name. Assert the key set instead.
- Haiku 4.5 rejects `output_config.effort` and adaptive thinking. Any model default change on Anthropic needs the params branch or it 400s.
- Import core by subpath from anything that is not the service worker; the index re-exports the Anthropic SDK and esbuild cannot tree-shake it (options.js 3.0 MB -> 34 KB).
- node `--experimental-strip-types` rejects TS parameter properties; use `--experimental-transform-types` for the eval runner.
- next/font variables must sit on <html> if any :root rule references them, or every font silently falls back to Times. Only a screenshot pass catches it.
- Next 16 dev blocks /_next chunks for origins not in `allowedDevOrigins`; a Playwright baseURL of 127.0.0.1 renders SSR-only pages with no console error.
- Playwright `addInitScript` re-runs on every navigation; seed localStorage once via page.evaluate.
- The claude CLI in -p mode keeps its own agent system prompt and ignores --system-prompt-file; fold instructions into the stdin prompt for eval use.
- Playwright + MV3: launchPersistentContext with --load-extension, `context.serviceWorkers()[0]` to seed chrome.storage, `<html data-mull-site>` on fixtures.

## Stop conditions
- Dennis says stop, or the plan's session-2 list is exhausted and the live pass is the only item left (it needs him).

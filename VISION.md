# Mull — vision (the loop rereads this every run)

**One line.** Opal / ScreenZen, but for AI. You type a lazy, low-effort question into ChatGPT, Claude, or Gemini. Mull catches it and makes you read a short explanation of the concept and pass a small quiz before the answer comes through.

**Why it exists.** Every provider ships a "study mode" toggle. Nobody keeps it on. Opal exists even though iOS has Screen Time because the built-in version has no teeth. Mull is the version with teeth: it sits in front of the chat you already use, and the unlock is comprehension instead of a timer.

**Who it is for.** Students first (high school, college), then anyone who notices they stopped thinking. Dennis is user zero.

**Non-negotiables.**
- Every prompt the user types passes through Mull. So: no telemetry, no server, keys never leave the device. Say it loudly in the UI.
- False positives kill it. Gating one real work prompt makes people uninstall. Bias toward letting prompts through. Ship an always-allow list from day one.
- The gate must feel like a good tutor for 40 seconds, not a captcha. Explanation is plain and short. Questions test the concept, not trivia about the explanation.
- Copy rule: never "get Mull", never "Mull your ...". The name stands alone.

**Surfaces.** Browser extension (enforcement on desktop, where the chats are) and a web app that is its own chat client with the gate built in (phones, non-technical users, and the thing a Screen Time shield redirects into later). Both share `packages/core`.

**Design anchor.** Operator Amber default, Atelier Sage alternate, dark and light. Instrument Serif headline, Space Grotesk body, Geist Mono labels. Command-center feel, sparing motion. Not a SaaS template.

**Version ladder.** See BUILD_STATE.md for progress.
- v0: skeleton works (core + tests, extension intercepts on fixtures, web shell chats with a BYO key).
- v1: the gate loop is real on both surfaces, with stats, settings, allowlist, site toggles, and an eval harness against the labeled prompt set.
- v2: something Dennis would keep installed. Concept memory, hard mode, subjects setting, stats dashboard, both palettes, README + landing copy, security pass, packaged extension zip.

**Explicitly not in v2.** Accounts, server, payments, provider OAuth, native iOS, Chrome Web Store submission.

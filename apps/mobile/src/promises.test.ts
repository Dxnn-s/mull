import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { mergeSettings } from '@mull/core/settings';
import { PROVIDER_INFO, isFreeModel } from '@mull/core';
import { makeCardForQuestion } from './quiz';

/**
 * The promises the app makes out loud, checked against what it does.
 *
 * Two bugs motivated this file and both were the same shape: a fix that was
 * real in one place and absent where it counted. The service worker stamp ran
 * in the npm script and not in the command Vercel runs, so production shipped
 * an unstamped worker for days while the tests went green. The free model
 * logging warning was written, and rendered on a condition that is never true
 * for the users it was for. Neither had a test that could see the gap, because
 * every test looked at the side where the fix existed.
 *
 * So these assert the deployed configuration and the user-facing claims, not
 * the code that was supposed to produce them.
 */
const vercel = JSON.parse(readFileSync(resolve(__dirname, '../vercel.json'), 'utf8')) as {
  buildCommand: string;
  headers?: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
};

describe('what actually deploys', () => {
  it('stamps the service worker, or installed users can never be updated', () => {
    // The whole point of the stamp is that sw.js changes every release. Build
    // without it and the browser has no reason to look for a new worker, so no
    // fix ever reaches anyone who added Mull to their home screen.
    expect(vercel.buildCommand).toMatch(/stamp-sw\.mjs/);
    // And it has to stamp the directory it actually builds into.
    const out = vercel.buildCommand.match(/--output-dir\s+(\S+)/)?.[1];
    expect(out).toBeTruthy();
    expect(vercel.buildCommand).toMatch(new RegExp(`stamp-sw\\.mjs\\s+${out}`));
  });

  it('sends a CSP that pins where a stolen key could be sent', () => {
    const csp = vercel.headers?.[0]?.headers.find((h) => h.key === 'Content-Security-Policy')?.value ?? '';
    expect(csp).toBeTruthy();
    // connect-src is the one that matters: the API key sits in localStorage, so
    // the cap worth having is that it cannot be posted to anywhere but these.
    const connect = csp.match(/connect-src ([^;]+)/)?.[1] ?? '';
    expect(connect).toMatch(/openrouter\.ai/);
    expect(connect).toMatch(/api\.openai\.com/);
    expect(connect).toMatch(/api\.anthropic\.com/);
    expect(connect).toMatch(/generativelanguage\.googleapis\.com/);
    expect(connect).not.toMatch(/\*/);
    expect(csp).toMatch(/frame-ancestors 'none'/);
    expect(csp).toMatch(/object-src 'none'/);
  });

  it('keeps the OAuth code out of referer headers', () => {
    const ref = vercel.headers?.[0]?.headers.find((h) => h.key === 'Referrer-Policy')?.value;
    expect(ref).toBe('no-referrer');
  });
});

describe('"what you type is never stored"', () => {
  it('refuses rather than turning the question itself into a stored concept', async () => {
    // A weak model returning no concept used to mean the first sixty characters
    // of the user's own words became a concept, and a concept is written to
    // memory as a key, to the stats log, and into the shareable recap.
    const secret = 'my essay about my parents divorce is due tomorrow help';
    const settings = mergeSettings({ provider: 'openai', apiKey: 'sk-test', questionsPerGate: 2 });
    const noConcept: typeof fetch = async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: '{"verdict":"LAZY","confidence":0.9,"concept":null,"subject":null,"reason":"x"}' } }] }), { status: 200 });

    const original = globalThis.fetch;
    globalThis.fetch = noConcept;
    try {
      await expect(makeCardForQuestion(settings, secret)).rejects.toThrow();
      // Whatever the error says, it must not carry their words along with it.
      await makeCardForQuestion(settings, secret).catch((e: Error) => {
        expect(e.message).not.toContain('divorce');
        expect(e.message).not.toContain(secret.slice(0, 20));
      });
    } finally {
      globalThis.fetch = original;
    }
  });
});

describe('the free model warning reaches the people it is for', () => {
  it('an empty model means the provider default, which for OpenRouter is free', () => {
    // The disclosure used to test settings.model directly. After OAuth that
    // string is empty, so the check was false for every signed-in user, which
    // is exactly who the warning existed for.
    const stored = '';
    const effective = stored || PROVIDER_INFO.openrouter.defaultModel;
    expect(isFreeModel(stored)).toBe(false);
    expect(isFreeModel(effective)).toBe(true);
  });

  it('the OpenRouter default really is a free model, so the warning is needed', () => {
    expect(PROVIDER_INFO.openrouter.defaultModel).toMatch(/:free$/);
  });
});

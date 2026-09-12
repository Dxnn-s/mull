import { describe, expect, it } from 'vitest';
import { authorizeUrl, challengeFor, codeFromCallback, createVerifier, exchangeCode } from '../src/oauth.ts';

describe('openrouter pkce', () => {
  it('makes a fresh high-entropy verifier every time', () => {
    const a = createVerifier();
    const b = createVerifier();
    expect(a).not.toBe(b);
    // base64url of 32 bytes, so 43 chars and nothing needing escaping in a URL.
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('hashes the verifier to a base64url S256 challenge', async () => {
    // Known answer from RFC 7636 appendix B, which is what OpenRouter implements.
    const challenge = await challengeFor('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk');
    expect(challenge).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });

  it('sends the challenge and callback, and never a secret', () => {
    const url = new URL(authorizeUrl('https://mull.school/link', 'CHALLENGE'));
    expect(url.origin + url.pathname).toBe('https://openrouter.ai/auth');
    expect(url.searchParams.get('callback_url')).toBe('https://mull.school/link');
    expect(url.searchParams.get('code_challenge')).toBe('CHALLENGE');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.search).not.toMatch(/secret|client_id/i);
  });

  it('reads the code back off the callback url', () => {
    expect(codeFromCallback('https://mull.school/link?code=abc123')).toBe('abc123');
    expect(codeFromCallback('https://mull.school/link')).toBeNull();
    expect(codeFromCallback('not a url')).toBeNull();
  });

  it('exchanges a code for a key, posting the verifier', async () => {
    let seen: { url: string; body: unknown } | null = null;
    const fake: typeof fetch = async (url, init) => {
      seen = { url: String(url), body: JSON.parse(String(init?.body)) };
      return new Response(JSON.stringify({ key: 'sk-or-v1-test' }), { status: 200 });
    };
    const key = await exchangeCode('the-code', 'the-verifier', fake);
    expect(key).toBe('sk-or-v1-test');
    expect(seen!.url).toBe('https://openrouter.ai/api/v1/auth/keys');
    expect(seen!.body).toEqual({ code: 'the-code', code_verifier: 'the-verifier', code_challenge_method: 'S256' });
  });

  it('explains an expired code rather than throwing a status', async () => {
    const fake: typeof fetch = async () => new Response('gone', { status: 400 });
    await expect(exchangeCode('stale', 'v', fake)).rejects.toThrow(/ten minutes/);
  });

  it('refuses a reply with no key in it', async () => {
    const fake: typeof fetch = async () => new Response(JSON.stringify({}), { status: 200 });
    await expect(exchangeCode('c', 'v', fake)).rejects.toThrow(/no key/);
  });
});

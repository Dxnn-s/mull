/**
 * OpenRouter's OAuth PKCE flow: the one way a user can hand Mull a working key
 * without typing a secret on a phone keyboard. They tap, approve on
 * openrouter.ai, and come back with a key scoped to their own account, so every
 * token is billed to them and Mull never holds a credential of its own.
 *
 * PKCE with no client secret, which is what makes this safe to run entirely on
 * the device. There is no Mull server in the flow and there is nothing here
 * worth stealing: the verifier only matters for the ten minutes the code lives.
 *
 * The other three providers have no equivalent. OpenAI, Anthropic and Google
 * all expect a key created by hand on their dashboard, so those stay a paste.
 */

const AUTH_URL = 'https://openrouter.ai/auth';
const EXCHANGE_URL = 'https://openrouter.ai/api/v1/auth/keys';

/** Crypto that works in a browser, a service worker, React Native and node. */
function subtle(): SubtleCrypto {
  const c = globalThis.crypto;
  if (!c?.subtle) throw new Error('This device has no WebCrypto, so OpenRouter sign in is unavailable.');
  return c.subtle;
}

function base64Url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** A fresh high-entropy verifier. 32 bytes is the length the spec asks for. */
export function createVerifier(): string {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

/** S256 challenge for a verifier. */
export async function challengeFor(verifier: string): Promise<string> {
  const digest = await subtle().digest('SHA-256', new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(digest));
}

/** Where to send the user. Open this in a real browser, not a webview. */
export function authorizeUrl(callbackUrl: string, challenge: string): string {
  const q = new URLSearchParams({ callback_url: callbackUrl, code_challenge: challenge, code_challenge_method: 'S256' });
  return `${AUTH_URL}?${q.toString()}`;
}

/**
 * Trade the code from the callback for a key. Codes are single use and expire
 * ten minutes after they are issued, so this runs the moment the user returns.
 */
export async function exchangeCode(code: string, verifier: string, fetchImpl: typeof fetch = fetch): Promise<string> {
  const res = await fetchImpl(EXCHANGE_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ code, code_verifier: verifier, code_challenge_method: 'S256' }),
  });
  if (!res.ok) throw new Error(`OpenRouter sign in failed (${res.status}). Codes expire after ten minutes, so try again.`);
  const data = (await res.json()) as { key?: string };
  if (!data.key) throw new Error('OpenRouter sign in returned no key.');
  return data.key;
}

/** Pull the code out of whatever URL the browser came back to. */
export function codeFromCallback(url: string): string | null {
  try {
    return new URL(url).searchParams.get('code');
  } catch {
    return null;
  }
}

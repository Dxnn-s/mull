/**
 * Turn a provider failure into a sentence a person can act on.
 *
 * The adapters used to throw the first 300 characters of the upstream response
 * body, and the gate screen renders that straight onto the phone. Two problems.
 * It is raw vendor JSON shown to a fifteen year old, which tells them nothing
 * they can do. And it assumes OpenAI, Anthropic and Google will all keep
 * redacting keys from their own error bodies forever, which is a bet with no
 * upside.
 */

/** Anything shaped like a provider key, whoever echoed it back. */
const KEY_SHAPES = /\b(sk-[A-Za-z0-9_-]{8,}|sk-ant-[A-Za-z0-9_-]{8,}|AIza[A-Za-z0-9_-]{8,})/g;

/** Strip credentials from any string before it can reach a screen or a log. */
export function scrubSecrets(text: string): string {
  return text.replace(KEY_SHAPES, '[key]');
}

/**
 * What to tell the user. The status carries almost all of the meaning, so the
 * body is only used to keep a short hint, scrubbed, for the cases where the
 * status alone is ambiguous.
 */
export function providerError(provider: string, status: number, body: string): Error {
  const hint = scrubSecrets(body).replace(/\s+/g, ' ').trim().slice(0, 120);

  if (status === 401 || status === 403) {
    return new Error(`${provider} rejected that key. Link the account again from You, AI provider.`);
  }
  if (status === 402) {
    return new Error(`${provider} says the account is out of credit. Top it up, or switch to a free model.`);
  }
  if (status === 404) {
    return new Error(`${provider} does not have that model any more. Pick another one from You, AI provider.`);
  }
  if (status === 429) {
    return new Error(`${provider} is rate limiting. Free models allow about 50 cards a day, so this may be tomorrow's problem.`);
  }
  if (status >= 500) {
    return new Error(`${provider} is having trouble. Not your fault, and worth trying again in a minute.`);
  }
  return new Error(`${provider} refused the request (${status}).${hint ? ` It said: ${hint}` : ''}`);
}

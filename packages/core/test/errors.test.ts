import { describe, expect, it } from 'vitest';
import { providerError, scrubSecrets } from '../src/providers/errors.ts';

describe('provider errors', () => {
  it('never lets a key reach the message, whoever echoed it back', () => {
    const bodies = [
      'Incorrect API key provided: sk-proj-AbCdEf123456789xyz',
      '{"error":{"message":"invalid x-api-key sk-ant-api03-QQQQQQQQQQQQ"}}',
      'API key not valid. key=AIzaSyD-1234567890abcdefg',
    ];
    for (const b of bodies) {
      const msg = providerError('OpenAI', 400, b).message;
      expect(msg).not.toMatch(/sk-[A-Za-z0-9_-]{8,}/);
      expect(msg).not.toMatch(/AIza[A-Za-z0-9_-]{8,}/);
    }
  });

  it('scrubs every key in a string, not just the first', () => {
    const out = scrubSecrets('sk-aaaaaaaaaaaa and sk-bbbbbbbbbbbb');
    expect(out).toBe('[key] and [key]');
  });

  it('tells the user what to do about a rejected key', () => {
    const msg = providerError('OpenRouter', 401, 'unauthorized').message;
    expect(msg).toMatch(/rejected that key/i);
    expect(msg).toMatch(/AI provider/);
    expect(msg).not.toMatch(/401/);
  });

  it('explains an empty account rather than printing a code', () => {
    expect(providerError('OpenRouter', 402, '{}').message).toMatch(/out of credit/i);
  });

  it('points at the model when the model is gone, which free ids do', () => {
    expect(providerError('OpenRouter', 404, 'no such model').message).toMatch(/model any more/i);
  });

  it('says a rate limit is a rate limit', () => {
    expect(providerError('OpenRouter', 429, '').message).toMatch(/rate limiting/i);
  });

  it('does not blame the user for a provider outage', () => {
    expect(providerError('OpenAI', 503, '').message).toMatch(/Not your fault/i);
  });

  it('keeps a short scrubbed hint for anything unrecognised', () => {
    const msg = providerError('Gemini', 418, 'something odd happened upstream').message;
    expect(msg).toMatch(/418/);
    expect(msg).toMatch(/something odd/);
    // Short enough to read on a phone, not 300 characters of JSON.
    expect(msg.length).toBeLessThan(220);
  });
});

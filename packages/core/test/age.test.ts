import { describe, expect, it } from 'vitest';
import { AGE_BANDS, canUse, minAgeFor, providersFor, whyHidden } from '../src/age.ts';
import { PROVIDER_INFO } from '../src/provider-info.ts';
import type { ProviderId } from '../src/types.ts';

describe('age bands', () => {
  it('lets nobody under 13 link anything', () => {
    expect(providersFor('under13')).toEqual([]);
    for (const p of Object.keys(PROVIDER_INFO) as ProviderId[]) {
      if (p !== 'mock') expect(canUse('under13', p), p).toBe(false);
    }
  });

  it('still works completely for an under 13, because the bank needs no account', () => {
    // The whole reason this band can be handled honestly rather than fudged.
    expect(canUse('under13', 'mock')).toBe(true);
  });

  it('gives a 13 to 17 year old OpenAI and nothing else', () => {
    expect(providersFor('teen')).toEqual(['openai']);
  });

  it('does not offer a teenager the one-tap default, whose terms say 18', () => {
    // OpenRouter is the top of the provider screen and the easiest to link,
    // which makes it the one most likely to be tapped by someone too young.
    expect(minAgeFor('openrouter')).toBe(18);
    expect(canUse('teen', 'openrouter')).toBe(false);
  });

  it('gives an adult every provider the app supports', () => {
    const all = (Object.keys(PROVIDER_INFO) as ProviderId[]).filter((p) => p !== 'mock');
    expect(providersFor('adult').sort()).toEqual(all.sort());
  });

  it('says why something is missing, rather than leaving a gap', () => {
    expect(whyHidden('under13')).toMatch(/13/);
    expect(whyHidden('teen')).toMatch(/OpenAI/);
    expect(whyHidden('adult')).toBeNull();
  });

  it('every band the picker offers is one the rules understand', () => {
    for (const { band } of AGE_BANDS) expect(() => providersFor(band)).not.toThrow();
    expect(AGE_BANDS).toHaveLength(3);
  });

  it('every provider has a minimum age, so adding one cannot skip the gate', () => {
    for (const p of Object.keys(PROVIDER_INFO) as ProviderId[]) {
      expect(typeof minAgeFor(p), p).toBe('number');
    }
  });

  it('the stated minimum matches what the provider note claims', () => {
    // These two drift apart easily, and then the app contradicts itself on one
    // screen. Anything the note calls 18+ has to actually be gated at 18.
    for (const p of Object.keys(PROVIDER_INFO) as ProviderId[]) {
      if (/18\+/.test(PROVIDER_INFO[p].note)) expect(minAgeFor(p), p).toBe(18);
    }
  });
});

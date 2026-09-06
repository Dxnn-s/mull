import { describe, expect, it } from 'vitest';
import { extractJson } from '../src/json.ts';

describe('extractJson', () => {
  it('parses a bare object', () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });
  it('strips code fences', () => {
    expect(extractJson('Sure!\n```json\n{"a":1}\n```\nDone.')).toEqual({ a: 1 });
  });
  it('ignores trailing prose and braces inside strings', () => {
    expect(extractJson('{"a":"x}y","b":{"c":2}} and then some')).toEqual({ a: 'x}y', b: { c: 2 } });
  });
  it('throws when there is no object', () => {
    expect(() => extractJson('nope')).toThrow();
  });
});

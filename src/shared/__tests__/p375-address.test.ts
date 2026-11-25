/**
 * Phase 375, the one address shape (build/p375/SPEC.md §7.1 row B1, D4):
 * `usageAddress` over the committed corpus's DECODED addresses, and the edges
 * the corpus does not spell. Every address is invented.
 *
 * The script keeps an address over its RAW token and this function judges the
 * DECODED string, so they differ on purpose in one place only: a token written
 * with an escape that decodes to a plain address is refused by the script and
 * accepted here (`conformance:usage` G12 holds the pair to exactly that).
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { USAGE_ADDRESS_MAX, usageAddress } from '../usage';

interface Case {
  name: string;
  raw: string;
  want: string | null;
}
const CORPUS = (
  JSON.parse(readFileSync(join(process.cwd(), 'build', 'fixtures', 'p375', 'addresses.json'), 'utf8')) as {
    cases: Case[];
  }
).cases;

/** The top level `email` as `JSON.parse` reads it, or undefined when the payload does not parse. */
function decoded(raw: string): unknown {
  try {
    return (JSON.parse(raw) as Record<string, unknown>)['email'];
  } catch {
    return undefined;
  }
}

describe('B1: usageAddress', () => {
  it('B1: accepts every address the corpus keeps, as sent, and refuses every one it refuses but for an escape', () => {
    let accepted = 0;
    let refused = 0;
    for (const c of CORPUS) {
      if (c.want === 'none') continue;
      const value = decoded(c.raw);
      if (typeof c.want === 'string') {
        expect([c.name, usageAddress(value)]).toEqual([c.name, c.want]);
        accepted += 1;
        continue;
      }
      // Refused by the script. Only a token written with an escape may decode
      // to something this accepts; every other one is refused here too.
      const token = /"email":("(?:[^"\\]|\\.)*")(?![\s\S]*"email":")/.exec(c.raw)?.[1] ?? '';
      if (token.includes('\\') && usageAddress(value) !== null) continue;
      expect([c.name, usageAddress(value)]).toEqual([c.name, null]);
      refused += 1;
    }
    expect(accepted).toBeGreaterThanOrEqual(10);
    expect(refused).toBeGreaterThanOrEqual(20);
  });

  it('B1: refuses everything that is not a string', () => {
    for (const raw of [undefined, null, 0, 1, true, {}, [], ['a@example.invalid'], { email: 'a@example.invalid' }, Symbol('a'), 10n]) {
      expect(usageAddress(raw)).toBeNull();
    }
  });

  it('B1: holds at 254 characters and refuses 255', () => {
    expect(USAGE_ADDRESS_MAX).toBe(254);
    const of = (n: number): string => `a@${'d'.repeat(n - 2 - '.example.invalid'.length)}.example.invalid`;
    expect(of(254)).toHaveLength(254);
    expect(usageAddress(of(254))).toBe(of(254));
    expect(usageAddress(of(255))).toBeNull();
  });

  it('B1: wants a local part of 1 to 64, so an @ at 0 and at 65 are refused', () => {
    expect(usageAddress('@example.invalid')).toBeNull();
    expect(usageAddress(`${'a'.repeat(64)}@example.invalid`)).toBe(`${'a'.repeat(64)}@example.invalid`);
    expect(usageAddress(`${'a'.repeat(65)}@example.invalid`)).toBeNull();
    expect(usageAddress('a@example.invalid')).toBe('a@example.invalid');
  });

  it('B1: wants a dot after the @, and nothing outside its class', () => {
    for (const bad of ['person@example', 'person@example.', 'person@.example.invalid', 'a@b@example.invalid', 'a b@example.invalid', 'a"b@example.invalid', 'a\\b@example.invalid', 'a\nb@example.invalid', 'pérson@example.invalid', 'person@exämple.invalid', 'person‏@example.invalid', '<b>@example.invalid', ' person@example.invalid', 'person@example.invalid ', 'person@example..invalid']) {
      expect([bad, usageAddress(bad)]).toEqual([bad, null]);
    }
    for (const good of ["o'brien.p375@example.invalid", 'a+b%c_d-e@ex-ample.example.invalid', 'Person.P375@Example.INVALID', 'x@a.b.c.example.com']) {
      expect([good, usageAddress(good)]).toEqual([good, good]);
    }
  });
});

/**
 * Nothing on the Catch Me Up surface sets a session's status (Phase 137).
 *
 * Status semantics are frozen by the Phase 23 refusals. The page READS
 * status through effectiveStatusOf like every other surface, and this test
 * holds every module of the surface to never writing one.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = join(__dirname, '..');

const files = [
  ...readdirSync(DIR)
    .filter((name) => name.endsWith('.ts') || name.endsWith('.tsx'))
    .map((name) => join(DIR, name)),
  join(DIR, '..', 'state', 'overview-slice.ts')
];

/** The write shapes, and only the write shapes. A read is fine. */
const FORBIDDEN: [name: string, pattern: RegExp][] = [
  ['setStatus', /setStatus/],
  ['applyStatus', /applyStatus/],
  ['the sessions:status channel', /sessions:status/],
  ['a property write to .status', /\.status\s*=[^=]/],
  ['a literal status assignment', /status:\s*['"]/]
];

describe('the overview never writes a status', () => {
  it('scans the surface at all', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  for (const file of files) {
    const name = file.split('/').pop() ?? file;
    it(`${name} names no status write`, () => {
      const text = readFileSync(file, 'utf8');
      for (const [label, pattern] of FORBIDDEN) {
        expect(pattern.test(text), `${name} holds ${label}`).toBe(false);
      }
    });
  }
});

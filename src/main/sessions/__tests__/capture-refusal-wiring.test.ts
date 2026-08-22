/**
 * Phase 91 — where the capture refusal is read, and the order is the whole
 * point.
 *
 * `createSession` has two exits that matter here. A create on another machine
 * leaves the method early, at the remote branch. A create on this Mac carries
 * on to the wrap. The refusal is read ONCE, ABOVE both, so it covers both, and
 * so that a create path added later cannot be composed above it.
 *
 * THIS TEST READS THE SOURCE AS TEXT, which is the shape `create-copy.test.ts`
 * and `create-machine-ready.test.tsx` already use for a rule that lives in
 * source order. There is no way to observe "this line is above that line" by
 * calling the function, and a mock that proved the ordering would be proving
 * the mock.
 *
 * PHASE 125 moved the create body out of `../core.ts` into `../create-local.ts`
 * and changed no line of it. The file this test reads changed with it, and the
 * four claims below are the ones it made before the move.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(import.meta.dirname, '../create-local.ts'),
  'utf8'
);

describe('the guard is read once, and it is read first', () => {
  it('has exactly one call site', () => {
    const calls = source.split('captureRefusedOnMachine(').length - 1;
    // One import line and one call. The import names it without a paren.
    expect(calls).toBe(1);
  });

  it('is read above the remote branch and below the empty name check', () => {
    const nameCheck = source.indexOf("'Session name cannot be empty.'");
    const guard = source.indexOf('captureRefusedOnMachine(');
    const remote = source.indexOf('const session = await remoteCreate({');
    expect(nameCheck).toBeGreaterThan(-1);
    expect(guard).toBeGreaterThan(nameCheck);
    expect(remote).toBeGreaterThan(guard);
  });
});

describe('what each half of createSession does with the answer', () => {
  it('the remote branch says it, on the channel Phase 15 already shipped', () => {
    // The session still starts. A refused capture has never been fatal in this
    // product and it does not become fatal here.
    const branch = source.slice(
      source.indexOf('const session = await remoteCreate({'),
      source.indexOf('deps.broadcastSessions();\n    return session;')
    );
    expect(branch).toContain('EVT_CAPTURE_NOTICE');
    expect(branch).toContain("kind: 'declined'");
    expect(branch).toContain('captureRefused !== null');
    // And only for a person who asked. Silence is for the person who did not.
    expect(branch).toContain('input.capture === true');
  });

  it('the wrap is guarded by the same answer', () => {
    expect(source).toContain('captureRefused === null &&');
  });
});

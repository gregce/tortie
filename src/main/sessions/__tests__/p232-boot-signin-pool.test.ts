/**
 * The launch sign-in talks to machines side by side, at most four at once
 * (Phase 232, item 1).
 *
 * WHAT THIS PINS AND WHY IT IS A SOURCE-SHAPE TEST. `signInToConfirmedMachines`
 * walked `machines.json` one row at a time, awaiting each `prepareMachine`
 * before starting the next, so a machine that did not answer held every row
 * after it behind two version reads at the ten second deadline: research 85
 * section 4.2 measured 19,789 ms to Source control's first row on the Mac Pro
 * with an unreachable row listed first, against 510 ms alone, and research 91
 * section 4.1 read 20,043 ms against 108 ms at this phase's parent. The method
 * needs a manifest, a tmux server and a machines file to run, which is why
 * p109-boot-signin-label.test.ts reads its body instead, and this file uses
 * the same instrument for the same reason. The timing proof is the app run
 * against the Mac Pro, which is the phase's Tier 3 evidence.
 *
 * Three things are pinned:
 *  1. the ceiling is four, which is CLAUDE.md's own probe ceiling;
 *  2. the body sizes its pool from that ceiling and the row count, and settles
 *     every slot with one `Promise.all`;
 *  3. the per-row confirm ask and both `markMachineQuiet` sites are still in
 *     the body, because the pool changes the loop's shape and nothing else.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const CORE = join(dirname(fileURLToPath(import.meta.url)), '..', 'core.ts');

function signInBody(): string {
  const src = readFileSync(CORE, 'utf8');
  const start = src.indexOf('private async signInToConfirmedMachines()');
  expect(start).toBeGreaterThan(-1);
  const end = src.indexOf('\n  }', start);
  expect(end).toBeGreaterThan(start);
  return src.slice(start, end);
}

describe('signInToConfirmedMachines runs as a pool (Phase 232)', () => {
  it('caps the pool at four', () => {
    const src = readFileSync(CORE, 'utf8');
    expect(src).toContain('export const LAUNCH_SIGN_IN_CONCURRENCY = 4;');
  });

  it('sizes the pool from the ceiling and the rows, and settles every slot', () => {
    const body = signInBody();
    expect(body).toContain(
      'Math.min(LAUNCH_SIGN_IN_CONCURRENCY, rows.length)'
    );
    expect(body).toContain('await Promise.all(');
    // The sequential shape awaited prepareMachine directly inside a `for` over
    // the rows. The pool awaits it inside a per-row function that a worker
    // calls, so no `for (const row of` walk may be left in the body.
    expect(body).not.toContain('for (const row of');
  });

  it('keeps the confirm ask and both quiet marks per row', () => {
    const body = signInBody();
    expect(body).toContain('if (!isMachineConfirmed(row.id, fields)) return;');
    expect(body.split('markMachineQuiet(row.id);').length - 1).toBe(2);
  });
});

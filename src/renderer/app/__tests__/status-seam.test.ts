/**
 * Every surface reads a session's status through ONE expression (Phase 71).
 *
 * ## Why this is source shape rather than behaviour, and it is not laziness
 *
 * `effectiveStatusOf` in ../../state/store.ts is `return session.status`. It has
 * been exactly that since Phase 13, on purpose: main decides status and the
 * renderer applies no refinement of its own. So a surface that reads
 * `session.status` directly produces the SAME value today, and no behavioural
 * test can tell the two apart. MEASURED 2026-08-17: reverting `machineUnreachable`,
 * `unreachableMachines` and `paneAccepts` to `session.status` left the whole
 * 4,986 test suite green.
 *
 * The seam is still worth having, and Phase 71 is when it started to matter.
 * Each machine now has its own reconcile, so a row's status and a bar's opinion
 * of that row can be written by different passes. One expression is what stops a
 * bar deciding from a different reading than the row beside it, which is the
 * disagreement Phase 67 existed to end.
 *
 * An invariant no test can catch by behaviour gets a source assertion. That is
 * the instrument ../../../main/sessions/__tests__/unreachable-boundary.test.ts
 * already uses for the same class of claim, and this file is the renderer's
 * copy of it.
 *
 * ## What this file does NOT claim
 *
 * It does not say every read of `.status` in the renderer is wrong. The four
 * sites below are the ones that decide a CONDITION or an ACTION from status, and
 * they are named one by one rather than swept for, so adding a fifth is a
 * deliberate edit to this list rather than something a regular expression
 * quietly covers.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const HERE = dirname(fileURLToPath(import.meta.url));
const read = (...parts: string[]): string =>
  readFileSync(join(HERE, '..', ...parts), 'utf8');

/** The body of one declaration, from its first line to the next marker. */
function body(src: string, decl: string, end: string): string {
  const start = src.indexOf(decl);
  expect(start, `found ${decl}`).toBeGreaterThan(-1);
  const stop = src.indexOf(end, start);
  expect(stop, `found ${end} after ${decl}`).toBeGreaterThan(start);
  return src.slice(start, stop);
}

describe('the four sites that decide from status', () => {
  const status = read('status.ts');
  const region = read('TerminalRegion.tsx');
  const target = read('..', 'terminal', 'drop', 'target.ts');

  /**
   * The machine condition bar. A bar that read `.status` while the rows read
   * `effectiveStatusOf` would be the two disagreeing on one screen.
   */
  it('machineUnreachable reads through effectiveStatusOf', () => {
    const fn = body(
      status,
      'export function machineUnreachable(',
      'The machines that went quiet'
    );
    expect(fn).toContain('effectiveStatusOf(s)');
    expect(fn).not.toMatch(/\bs\.status\b/);
  });

  /** The badges beside that bar, from the same rows and the same reading. */
  it('unreachableMachines reads through effectiveStatusOf', () => {
    const fn = body(
      status,
      'export function unreachableMachines(',
      'Roll-up for a project tab'
    );
    expect(fn).toContain('effectiveStatusOf(s)');
    expect(fn).not.toMatch(/\bs\.status\b/);
  });

  /**
   * This one decides whether Tortie WRITES BYTES into a session, so it is the
   * costliest of the four to get wrong.
   */
  it('paneAccepts reads through effectiveStatusOf', () => {
    const fn = body(
      target,
      'export function paneAccepts(',
      'Focus the target pane first'
    );
    expect(fn).toContain('effectiveStatusOf(session)');
    expect(fn).not.toMatch(/session\.status/);
  });

  /** The bar that offers an action, which is refused for a remote row. */
  it('the restore-all bar reads through effectiveStatusOf and skips machines', () => {
    const fn = body(region, 'function RestoreAllBar(', 'return (');
    expect(fn).toContain("effectiveStatusOf(x) === 'restorable'");
    expect(fn).toContain('x.machine === undefined');
    expect(fn).not.toMatch(/x\.status/);
  });
});

/**
 * The seam itself, stated so a reader of this file knows why the assertions
 * above cannot be behavioural.
 */
describe('the seam', () => {
  it('is one expression whose body is main s verdict and nothing else', () => {
    const store = read('..', 'state', 'store.ts');
    const fn = body(
      store,
      'export function effectiveStatusOf(',
      'Pure tab-order sort'
    );
    expect(fn).toContain('return session.status;');
  });
});

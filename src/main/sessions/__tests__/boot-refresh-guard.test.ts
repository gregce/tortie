/**
 * boot() must not be able to fail because of a reconcile (Phase 16.1).
 *
 * `GmuxCore.boot()` awaited `core.refresh()` bare. Every OTHER reconcile
 * caller goes through `scheduleRefresh()`, which catches and warns — so a
 * transient manifest problem is a stale status dot everywhere except the one
 * place where it rejected boot(), which rejects getGmuxCore(), which leaves
 * the window that asked for the core with no sessions at all. (The concrete
 * trigger was SQLITE_BUSY_SNAPSHOT out of the reconcile transaction; see
 * ../../db/__tests__/sqlite.test.ts, which reproduces that deterministically.)
 *
 * This is a SOURCE-SHAPE test, and deliberately so: boot() needs a live tmux
 * server, a control client and a hook channel, so exercising the failure
 * functionally would mean either mocking three subsystems (proving the mocks,
 * not the code) or driving the real app with a wedged manifest. The property
 * that actually matters is one line long and is worth pinning cheaply, the way
 * this repo already pins its other structural invariants. The behavioural
 * evidence for the catch itself lives in the smoke harness, which boots the
 * real core on every run.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const CORE = join(dirname(fileURLToPath(import.meta.url)), '..', 'core.ts');

function bootBody(): string {
  const src = readFileSync(CORE, 'utf8');
  const start = src.indexOf('static async boot()');
  expect(start).toBeGreaterThan(-1);
  const end = src.indexOf('return core;', start);
  expect(end).toBeGreaterThan(start);
  return src.slice(start, end);
}

describe('GmuxCore.boot', () => {
  it('degrades a failed initial reconcile to a warning, not a failed boot', () => {
    const body = bootBody();
    expect(body).toMatch(/core\.refresh\(\)\s*\.catch\(/);
    expect(body).not.toMatch(/await core\.refresh\(\);/);
  });
});

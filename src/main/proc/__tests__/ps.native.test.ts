/**
 * The live half of the process-lineage seam (Phase 145 stage 5).
 *
 * Check type: adapter integration test, native lane. Environment requirement:
 * a unix host with `/bin/ps`; the machine's real process table is read, read
 * only, and the one process spawned is this test's own child, ended in a
 * finally block. Skip rule: none on macOS; a `ps` that cannot answer makes
 * this lane fail rather than skip, because an empty answer is exactly the
 * degraded shape the production caller must survive and this lane is the only
 * proof the happy shape exists at all. Run this lane alone with
 * `npm run test:native`; `npm test` includes it.
 *
 * Every RULE about lineage, being the orphan conditions and the refusals, is
 * pinned against injected fixtures in orphans.test.ts and never against this
 * machine's processes. What this file proves is only that the production
 * reader, `readPsTable` through the guarded spawn, really parses this host's
 * live table: our own process appears under its true parent, and a child we
 * spawn appears in `descendantsOf` our own pid.
 */

import { spawn } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { childIndex, descendantsOf, readPsTable } from '../ps';

describe('readPsTable over the live process table', () => {
  it('sees this process under its true parent', async () => {
    const rows = await readPsTable();
    expect(rows.size).toBeGreaterThan(0);
    const me = rows.get(process.pid);
    expect(me).toBeDefined();
    expect(me?.ppid).toBe(process.ppid);
    expect(me?.command.length).toBeGreaterThan(0);
  });

  it('finds a child this test spawned among the descendants of this pid', async () => {
    const child = spawn('/bin/sleep', ['30'], { stdio: 'ignore' });
    try {
      expect(child.pid).toBeDefined();
      const rows = await readPsTable();
      const below = descendantsOf(childIndex(rows), process.pid);
      expect(below).toContain(child.pid);
    } finally {
      child.kill('SIGKILL');
    }
  });
});

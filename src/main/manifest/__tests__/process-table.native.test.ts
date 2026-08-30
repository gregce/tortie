/**
 * The live half of the harvest process table (Phase 171).
 *
 * Check type: adapter integration test, native lane. Environment requirement:
 * a unix host with `ps` on PATH; the machine's real process table is read,
 * read only, and nothing is spawned but `ps` itself. Skip rule: none on
 * macOS; a `ps` that cannot answer makes this lane fail rather than skip,
 * because an empty table is exactly the degraded shape the harvest callers
 * survive, and this lane is the only proof the live shape exists at all. Run
 * it alone with `npm run test:native`; `npm test` includes it.
 *
 * Every RULE about the walk, being the qwen grandchild shape, the hop bound
 * and the refusal to match on a table that could not be read, is pinned in
 * harvest.test.ts against a scripted table. Until Phase 171 that file asked
 * the live `ps` about the test runner's own parent instead, which made the
 * hermetic lane depend on the host. That one assertion moved here, where the
 * lane says so in its name.
 */

import { describe, expect, it } from 'vitest';
import {
  isDescendantOf,
  processTable,
  resetProcessParentCache
} from '../harvest/process-table';

describe('the harvest process table over the live ps', () => {
  it('sees this process under its true parent and walks the chain to it', async () => {
    resetProcessParentCache();
    const rows = await processTable();
    expect(rows.size).toBeGreaterThan(0);
    const me = rows.get(process.pid);
    expect(me).toBeDefined();
    expect(me?.ppid).toBe(process.ppid);
    expect(process.ppid).toBeGreaterThan(1);
    expect(await isDescendantOf(process.pid, process.ppid)).toBe(true);
    expect(await isDescendantOf(process.pid, 999_999)).toBe(false);
  });
});

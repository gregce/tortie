/**
 * The saved output panel must be reachable for a remote session that HAS a
 * manifest row, which is every remote session this build creates (Phase 72,
 * second fix round).
 *
 * The defect this closes: `listSessions` merges two lists. The manifest loop
 * ran first, projected a remote row through `projectRemoteRecord` and added
 * its id to `covered`. The feed loop below it, which is the loop that stamped
 * `savedOutputAt`, then skipped every id already covered. So the stamp reached
 * only the rows an OLDER Tortie created, which are the rows that have no
 * manifest row. The copies were on disk the whole time. The menu item stayed
 * disabled with "Tortie has no saved output for this session." and the
 * kept-here line never drew, because both read this one field.
 *
 * TWO INSTRUMENTS, for the reason ./unreachable-boundary.test.ts gives.
 *
 * The first is behavioural against the real producer, because the claim that
 * `projectRemoteRecord` cannot carry the field is the whole reason the stamp
 * has to live in core.ts. That is worth pinning for real, so that if someone
 * later teaches the machines layer to stamp it, this test says so rather than
 * leaving two writers racing.
 *
 * The second is source shape over core.ts, because `listSessions` needs a
 * booted core, a live tmux server and a control client, so exercising it here
 * would prove the mocks rather than the code. The live evidence for this field
 * is the phase's driven matrix, not a unit test.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { projectRemoteRecord } from '../../machines/remote-sessions';

// ---------------------------------------------------------------------------
// Instrument one: the producer, for real
// ---------------------------------------------------------------------------

describe('projectRemoteRecord', () => {
  const record = {
    id: 'sess-remote-1',
    name: 'api',
    tmuxName: 'gmux-api',
    projectPath: '/repo',
    cwd: '/repo',
    agent: 'claude' as const,
    status: 'running' as const,
    createdAt: 1_787_000_000_000,
    machineId: 'mac-pro'
  };

  /**
   * The machines layer is not allowed to reach into the restore layer, and its
   * own test holds that rule. So this projection cannot know when the copy was
   * taken, and the merge in core.ts is the only place that can.
   */
  it('does not carry savedOutputAt, so core.ts must stamp it', () => {
    const projected = projectRemoteRecord(record);
    expect(projected.savedOutputAt).toBeUndefined();
  });

  it('still projects the row itself', () => {
    expect(projectRemoteRecord(record).id).toBe('sess-remote-1');
  });
});

// ---------------------------------------------------------------------------
// Instrument two: the merge, as source shape over core.ts
// ---------------------------------------------------------------------------

const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'core.ts'),
  'utf8'
);

function body(decl: string, end: string): string {
  const start = src.indexOf(decl);
  expect(start, `found ${decl}`).toBeGreaterThan(-1);
  const stop = src.indexOf(end, start);
  expect(stop, `found ${end} after ${decl}`).toBeGreaterThan(start);
  return src.slice(start, stop);
}

describe('listSessions, the manifest loop', () => {
  // PHASE 152 changed the tail of this loop from `return out;` to a call that
  // stamps where each session's record lives, and the fix round made that call
  // take the whole list at once so the re-asking has a budget for the pass. The
  // marker follows it and still ends the slice at the same statement.
  const loop = body('const covered = new Set<string>();', 'return stampRecordLocations(out)');

  it('stamps savedOutputAt on a remote manifest row', () => {
    const manifestArm = loop.slice(0, loop.indexOf('for (const session of'));
    expect(manifestArm).toContain('projectRemoteRecord(rec)');
    expect(manifestArm).toContain('savedOutputAt(');
  });

  /**
   * PHASE 152. Where the agent keeps this conversation's record is stamped on
   * BOTH arms at once, after the merge, because the answer does not depend on
   * which list the row came from. The instrument reads the tail rather than the
   * loop, so a future edit that stamps only one arm fails here.
   */
  it('stamps the record location on every row, after the merge', () => {
    const tail = body('for (const session of remoteSessions())', '\n  }');
    expect(tail).toContain('stampRecordLocation');
    expect(src).toContain("from './record-path'");
  });

  /**
   * The feed loop keeps its own stamp. Both arms need it, because a remote
   * session either has a manifest row or does not, and the panel has to be
   * reachable either way.
   */
  it('keeps the stamp on the feed loop too', () => {
    const feedArm = loop.slice(loop.indexOf('for (const session of'));
    expect(feedArm).toContain('savedOutputAt(session.id)');
  });

  /**
   * The bug was that the manifest loop covered an id the stamping loop then
   * skipped. If the only `savedOutputAt` call sits after that skip, the remote
   * manifest rows are unreachable again.
   */
  it('does not leave the only stamp behind the covered skip', () => {
    const firstStamp = loop.indexOf('savedOutputAt(');
    const skip = loop.indexOf('if (covered.has(session.id)) continue;');
    expect(firstStamp).toBeGreaterThan(-1);
    expect(skip).toBeGreaterThan(-1);
    expect(firstStamp).toBeLessThan(skip);
  });
});

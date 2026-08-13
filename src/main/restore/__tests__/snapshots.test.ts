/**
 * Scrollback snapshots on disk (Phase 19 item 3).
 *
 * These run against a real filesystem in a temporary directory, because the
 * thing under test IS the filesystem behaviour. The durable write module is
 * not mocked either: a test that stubs the write proves nothing about the
 * order the bytes and the record reach the disk in.
 *
 * What is pinned here.
 *  - A capture never overwrites a body. Each one is the next generation and
 *    the ring keeps three.
 *  - The record is written after the body and the body is removed when the
 *    record cannot be written, so a body that nothing names never survives.
 *  - A reader is given the newest body that proves out, and falls through to
 *    the one before it when the newest is damaged.
 *  - A body with no record is never returned. A pre-Phase-19 file with no
 *    record is, exactly once, and is deleted as soon as a proven body exists.
 *  - Two captures of one session serialise instead of colliding.
 *  - The capsule carries everything Phase 20 reconstruction needs.
 */

import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let userData = '';
let paneText = '';
let listPanesCalls = 0;
let fleetOutput = '';

vi.mock('electron', () => ({
  app: { getPath: () => userData }
}));

vi.mock('../../settings/store', () => ({
  getSettings: () => ({ savedScrollbackLines: 10_000 })
}));

vi.mock('../../tmux', () => ({
  resolvePaneTarget: (target: string) => Promise.resolve(target),
  capturePane: () => Promise.resolve(paneText),
  execTmux: (args: readonly string[]) => {
    if (args[0] === 'list-panes') {
      listPanesCalls += 1;
      return Promise.resolve(fleetOutput);
    }
    return Promise.resolve('');
  }
}));

const {
  captureSessionSnapshot,
  capsuleIndexPath,
  classifySnapshotFile,
  deleteSnapshot,
  existingSnapshotPath,
  legacySnapshotPath,
  readCapsules,
  resetPaneCwdCacheForTests,
  resolveSnapshot,
  snapshotBodyPath,
  snapshotMaterialExists,
  snapshotPath,
  snapshotsDir,
  CAPSULE_VERSION,
  SNAPSHOT_GENERATIONS
} = await import('../snapshots');

const SESSION = '11111111-2222-3333-4444-555555555555';
const OTHER = '99999999-8888-7777-6666-555555555555';

function bodies(sessionId = SESSION): string[] {
  return readdirSync(snapshotsDir())
    .filter((name) => {
      const seen = classifySnapshotFile(name);
      return seen.kind === 'body' && seen.sessionId === sessionId;
    })
    .sort();
}

function sha(data: Buffer | string): string {
  return createHash('sha256').update(data).digest('hex');
}

beforeEach(() => {
  userData = mkdtempSync(join(tmpdir(), 'gmux-snap-'));
  mkdirSync(snapshotsDir(), { recursive: true });
  paneText = 'hello from the pane\n';
  fleetOutput = '';
  listPanesCalls = 0;
  resetPaneCwdCacheForTests();
});

afterEach(() => {
  rmSync(userData, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------

describe('file names', () => {
  it('classifies every kind of file the directory holds', () => {
    expect(classifySnapshotFile(`${SESSION}.txt.000003`)).toEqual({
      kind: 'body',
      sessionId: SESSION
    });
    expect(classifySnapshotFile(`${SESSION}.capsules.json`)).toEqual({
      kind: 'index',
      sessionId: SESSION
    });
    expect(classifySnapshotFile(`${SESSION}.txt`)).toEqual({
      kind: 'legacy',
      sessionId: SESSION
    });
    expect(classifySnapshotFile(`.${SESSION}.txt.abc-1234.part`).kind).toBe('staged');
    expect(classifySnapshotFile('.DS_Store').kind).toBe('other');
    expect(classifySnapshotFile('notes.md').kind).toBe('other');
  });

  it('reads a session id back out of a body name', () => {
    const name = `${SESSION}.txt.000012`;
    expect(snapshotBodyPath(SESSION, 12)).toBe(join(snapshotsDir(), name));
    expect(classifySnapshotFile(name).sessionId).toBe(SESSION);
  });
});

describe('capture', () => {
  it('publishes generation 1 with a record and no fixed temporary name', async () => {
    await expect(captureSessionSnapshot('$1', SESSION)).resolves.toBe(true);

    expect(bodies()).toEqual([`${SESSION}.txt.000001`]);
    expect(existsSync(capsuleIndexPath(SESSION))).toBe(true);
    // The defect this replaced: `.${sessionId}.tmp`, one name for every write.
    expect(existsSync(join(snapshotsDir(), `.${SESSION}.tmp`))).toBe(false);
    expect(readdirSync(snapshotsDir()).filter((n) => n.endsWith('.part'))).toEqual([]);
  });

  it('writes the next generation instead of replacing the last one', async () => {
    await captureSessionSnapshot('$1', SESSION);
    paneText = 'a second turn of the pane\n';
    await captureSessionSnapshot('$1', SESSION);

    expect(bodies()).toEqual([`${SESSION}.txt.000001`, `${SESSION}.txt.000002`]);
    const [newest, older] = readCapsules(SESSION);
    expect(newest?.generation).toBe(2);
    expect(newest?.parent).toBe(1);
    expect(older?.generation).toBe(1);
    expect(older?.parent).toBe(null);
    expect(readFileSync(join(snapshotsDir(), `${SESSION}.txt.000001`), 'utf8')).toContain(
      'hello from the pane'
    );
  });

  it('keeps a ring of three and no more', async () => {
    for (let turn = 1; turn <= 6; turn += 1) {
      paneText = `turn ${String(turn)}\n`;
      await captureSessionSnapshot('$1', SESSION);
    }
    expect(bodies()).toEqual([
      `${SESSION}.txt.000004`,
      `${SESSION}.txt.000005`,
      `${SESSION}.txt.000006`
    ]);
    expect(readCapsules(SESSION).map((c) => c.generation)).toEqual([6, 5, 4]);
    expect(SNAPSHOT_GENERATIONS).toBe(3);
  });

  it('writes nothing at all when the pane is empty', async () => {
    paneText = '   \n\n';
    await expect(captureSessionSnapshot('$1', SESSION)).resolves.toBe(false);
    expect(readdirSync(snapshotsDir())).toEqual([]);
  });

  it('keeps one session out of another session ring', async () => {
    await captureSessionSnapshot('$1', SESSION);
    await captureSessionSnapshot('$2', OTHER);
    expect(bodies(SESSION)).toEqual([`${SESSION}.txt.000001`]);
    expect(bodies(OTHER)).toEqual([`${OTHER}.txt.000001`]);
    expect(readCapsules(SESSION)[0]?.sessionId).toBe(SESSION);
    expect(readCapsules(OTHER)[0]?.sessionId).toBe(OTHER);
  });
});

describe('the capsule', () => {
  it('carries everything Phase 20 reconstruction needs', async () => {
    fleetOutput = `$1\t1\t/Users/gdc/work/tortie\n$2\t1\t/tmp\n`;
    paneText = 'line one\nline two\nline three\n';
    await captureSessionSnapshot('$1', SESSION, { reason: 'app-quit' });

    const capsule = readCapsules(SESSION)[0];
    const body = readFileSync(snapshotBodyPath(SESSION, 1));
    expect(capsule).toMatchObject({
      // Derived, not written out again. The number is the record shape and it
      // moves whenever a field changes meaning, so a test that hardcodes it
      // fails for a reason that has nothing to do with what it is checking.
      version: CAPSULE_VERSION,
      sessionId: SESSION,
      generation: 1,
      parent: null,
      reason: 'app-quit',
      path: snapshotBodyPath(SESSION, 1),
      cwd: '/Users/gdc/work/tortie',
      lines: 3,
      bytes: body.length,
      sha256: sha(body)
    });
    expect(capsule?.capturedAt).toBeGreaterThan(0);
  });

  // Phase 21 changed what `agentVersion` means. In a version 1 capsule it held
  // the SpecStory wrapper's version under a name that said agent. The manifest
  // now records the agent's own version, so the capsule carries two versions
  // and each one is named for the binary it describes. These two cases are the
  // meaning change and the old records it has to keep reading.
  it('keeps the agent version and the wrapper version apart', async () => {
    await captureSessionSnapshot('$1', SESSION, {
      cwd: '/opt/known',
      session: {
        name: 'work',
        tmuxName: 'work',
        projectPath: '/opt/known',
        cwd: '/opt/known',
        agent: 'claude',
        agentSessionId: null,
        argv: ['/Users/gdc/.local/bin/claude'],
        resumeArgv: null,
        agentVersion: '2.1.229',
        specstoryVersion: '0.6.1'
      }
    });

    expect(readCapsules(SESSION)[0]?.session).toMatchObject({
      agentVersion: '2.1.229',
      specstoryVersion: '0.6.1'
    });
  });

  it('reads a version 1 recipe, which has no wrapper version field, as null', () => {
    mkdirSync(snapshotsDir(), { recursive: true });
    writeFileSync(
      capsuleIndexPath(SESSION),
      JSON.stringify({
        version: 1,
        sessionId: SESSION,
        capsules: [
        {
          version: 1,
          sessionId: SESSION,
          generation: 1,
          parent: null,
          reason: 'app-quit',
          path: snapshotBodyPath(SESSION, 1),
          cwd: '/opt/known',
          session: {
            name: 'work',
            tmuxName: 'work',
            projectPath: '/opt/known',
            cwd: '/opt/known',
            agent: 'claude',
            agentSessionId: null,
            argv: ['/Users/gdc/.local/bin/claude'],
            resumeArgv: null,
            agentVersion: '0.6.1'
          },
          lines: 1,
          bytes: 1,
          sha256: '0'.repeat(64),
          capturedAt: 1
        }
        ]
      })
    );

    const capsule = readCapsules(SESSION)[0];
    expect(capsule?.version).toBe(1);
    expect(capsule?.session?.specstoryVersion).toBeNull();
  });

  it('takes the working directory the caller already knows without asking tmux', async () => {
    await captureSessionSnapshot('$1', SESSION, { cwd: '/opt/known' });
    expect(readCapsules(SESSION)[0]?.cwd).toBe('/opt/known');
    expect(listPanesCalls).toBe(0);
  });

  it('reads the fleet once for many sessions rather than once per session', async () => {
    fleetOutput = `$1\t1\t/one\n$2\t1\t/two\n$3\t1\t/three\n`;
    await Promise.all([
      captureSessionSnapshot('$1', SESSION),
      captureSessionSnapshot('$2', OTHER),
      captureSessionSnapshot('$3', '77777777-6666-5555-4444-333333333333')
    ]);
    expect(listPanesCalls).toBe(1);
    expect(readCapsules(SESSION)[0]?.cwd).toBe('/one');
    expect(readCapsules(OTHER)[0]?.cwd).toBe('/two');
  });

  it('records a null working directory rather than failing when tmux will not answer', async () => {
    fleetOutput = '';
    await captureSessionSnapshot('$1', SESSION, { reason: 'server-exit' });
    expect(readCapsules(SESSION)[0]).toMatchObject({ cwd: null, reason: 'server-exit' });
  });

  it('defaults the reason rather than leaving it out', async () => {
    await captureSessionSnapshot('$1', SESSION);
    expect(readCapsules(SESSION)[0]?.reason).toBe('unknown');
  });
});

describe('resolving what to replay', () => {
  it('returns the newest body, proven against its record', async () => {
    await captureSessionSnapshot('$1', SESSION);
    paneText = 'the newer text\n';
    await captureSessionSnapshot('$1', SESSION);

    const hit = resolveSnapshot(SESSION);
    expect(hit).toMatchObject({
      path: snapshotBodyPath(SESSION, 2),
      verified: true,
      source: 'generation'
    });
    expect(existingSnapshotPath(SESSION)).toBe(snapshotBodyPath(SESSION, 2));
  });

  it('falls back to the previous generation when the newest body is damaged', async () => {
    await captureSessionSnapshot('$1', SESSION);
    paneText = 'the newer text\n';
    await captureSessionSnapshot('$1', SESSION);

    writeFileSync(snapshotBodyPath(SESSION, 2), 'corrupted');
    expect(resolveSnapshot(SESSION)).toMatchObject({
      path: snapshotBodyPath(SESSION, 1),
      verified: true,
      // One newer generation was rejected. This is what item 9's
      // `snapshot-repaired` notice fires on, so the count is part of the
      // contract rather than debug information.
      rejected: 1
    });
  });

  it('falls back when the newest body is truncated to nothing', async () => {
    await captureSessionSnapshot('$1', SESSION);
    paneText = 'the newer text\n';
    await captureSessionSnapshot('$1', SESSION);

    writeFileSync(snapshotBodyPath(SESSION, 2), '');
    expect(resolveSnapshot(SESSION)?.path).toBe(snapshotBodyPath(SESSION, 1));
  });

  it('falls back when the newest body is missing entirely', async () => {
    await captureSessionSnapshot('$1', SESSION);
    paneText = 'the newer text\n';
    await captureSessionSnapshot('$1', SESSION);

    rmSync(snapshotBodyPath(SESSION, 2));
    expect(resolveSnapshot(SESSION)?.path).toBe(snapshotBodyPath(SESSION, 1));
  });

  it('reports nothing rather than replaying bytes no record vouches for', async () => {
    await captureSessionSnapshot('$1', SESSION);
    writeFileSync(snapshotBodyPath(SESSION, 1), 'rewritten behind our back');
    expect(resolveSnapshot(SESSION)).toBe(null);
    expect(existingSnapshotPath(SESSION)).toBe(null);
  });

  it('never returns a body the record does not name', () => {
    writeFileSync(snapshotBodyPath(SESSION, 7), 'an orphan from a crash\n');
    expect(resolveSnapshot(SESSION)).toBe(null);
  });

  it('numbers past an orphan body and still names a recorded parent', async () => {
    await captureSessionSnapshot('$1', SESSION);
    // What a crash between the body and its record leaves behind.
    writeFileSync(snapshotBodyPath(SESSION, 2), 'an orphan from a crash\n');

    paneText = 'the capture after the crash\n';
    await captureSessionSnapshot('$1', SESSION);

    const newest = readCapsules(SESSION)[0];
    expect(newest?.generation).toBe(3);
    expect(newest?.parent).toBe(1);
    expect(resolveSnapshot(SESSION)?.path).toBe(snapshotBodyPath(SESSION, 3));
  });

  it('treats a damaged record as no record rather than as an error', async () => {
    await captureSessionSnapshot('$1', SESSION);
    writeFileSync(capsuleIndexPath(SESSION), '{ this is not json');
    expect(readCapsules(SESSION)).toEqual([]);
    expect(resolveSnapshot(SESSION)).toBe(null);
  });

  it('drops a single malformed capsule and keeps the rest', async () => {
    await captureSessionSnapshot('$1', SESSION);
    paneText = 'the newer text\n';
    await captureSessionSnapshot('$1', SESSION);

    const file = JSON.parse(readFileSync(capsuleIndexPath(SESSION), 'utf8')) as {
      capsules: Record<string, unknown>[];
    };
    file.capsules[0] = { generation: 2, path: '', sha256: 'short' };
    writeFileSync(capsuleIndexPath(SESSION), JSON.stringify(file));

    expect(readCapsules(SESSION).map((c) => c.generation)).toEqual([1]);
    expect(resolveSnapshot(SESSION)?.path).toBe(snapshotBodyPath(SESSION, 1));
  });
});

describe('a snapshot written before Phase 19', () => {
  it('is replayed once, and says it was not proven', () => {
    writeFileSync(legacySnapshotPath(SESSION), 'scrollback from the old layout\n');
    expect(resolveSnapshot(SESSION)).toEqual({
      path: legacySnapshotPath(SESSION),
      capsule: null,
      verified: false,
      source: 'legacy',
      rejected: 0
    });
  });

  it('is removed only once a proven body has replaced it', async () => {
    writeFileSync(legacySnapshotPath(SESSION), 'scrollback from the old layout\n');
    await captureSessionSnapshot('$1', SESSION);
    expect(existsSync(legacySnapshotPath(SESSION))).toBe(false);
    expect(resolveSnapshot(SESSION)).toMatchObject({ verified: true, source: 'generation' });
  });

  it('is ignored when it is empty', () => {
    writeFileSync(legacySnapshotPath(SESSION), '');
    expect(resolveSnapshot(SESSION)).toBe(null);
  });

  it('is what snapshotPath names when there is nothing else', () => {
    expect(snapshotPath(SESSION)).toBe(legacySnapshotPath(SESSION));
  });
});

describe('the record and the body stay in step', () => {
  it('removes the body when its record cannot be written', async () => {
    // A directory where the record goes is the cheapest way to make the
    // rename that publishes it fail on a real filesystem.
    mkdirSync(capsuleIndexPath(SESSION));
    await expect(captureSessionSnapshot('$1', SESSION)).rejects.toThrow();
    expect(bodies()).toEqual([]);
    expect(readdirSync(snapshotsDir()).filter((n) => n.endsWith('.part'))).toEqual([]);
  });

  it('leaves the previous generation readable when a later capture fails', async () => {
    await captureSessionSnapshot('$1', SESSION);
    const good = resolveSnapshot(SESSION);

    rmSync(capsuleIndexPath(SESSION));
    mkdirSync(capsuleIndexPath(SESSION));
    paneText = 'the capture that will not record\n';
    await expect(captureSessionSnapshot('$1', SESSION)).rejects.toThrow();

    rmSync(capsuleIndexPath(SESSION), { recursive: true });
    expect(bodies()).toEqual([`${SESSION}.txt.000001`]);
    expect(good?.path).toBe(snapshotBodyPath(SESSION, 1));
  });
});

describe('the per-session write lock', () => {
  it('serialises two captures of one session into two generations', async () => {
    const both = Promise.all([
      captureSessionSnapshot('$1', SESSION, { reason: 'app-quit' }),
      captureSessionSnapshot('$1', SESSION, { reason: 'server-exit' })
    ]);
    await expect(both).resolves.toEqual([true, true]);

    expect(bodies()).toEqual([`${SESSION}.txt.000001`, `${SESSION}.txt.000002`]);
    expect(readCapsules(SESSION).map((c) => c.generation)).toEqual([2, 1]);
    expect(readCapsules(SESSION).map((c) => c.parent)).toEqual([1, null]);
  });

  it('lets the next capture run after one fails', async () => {
    mkdirSync(capsuleIndexPath(SESSION));
    const first = captureSessionSnapshot('$1', SESSION);
    await expect(first).rejects.toThrow();
    rmSync(capsuleIndexPath(SESSION), { recursive: true });

    await expect(captureSessionSnapshot('$1', SESSION)).resolves.toBe(true);
    expect(bodies()).toEqual([`${SESSION}.txt.000001`]);
  });
});

describe('material presence (Phase 26.3)', () => {
  // The contract is PRESENCE, NOT PROOF. The probe answers "may an ended row
  // offer Restore", runs per ended row per broadcast, and therefore stats
  // without reading or hashing. Whether the recorded bytes verify stays in
  // resolveSnapshot, inside the restore itself.
  it('is false when the session has never been captured', () => {
    expect(snapshotMaterialExists(SESSION)).toBe(false);
  });

  it('is true once a capture has published a completion record', async () => {
    await captureSessionSnapshot('$1', SESSION);
    expect(snapshotMaterialExists(SESSION)).toBe(true);
  });

  it('is true for a pre-Phase-19 body with no record', () => {
    writeFileSync(legacySnapshotPath(SESSION), 'scrollback from the old layout\n');
    expect(snapshotMaterialExists(SESSION)).toBe(true);
  });

  it('is false for an empty legacy body, which resolve also refuses', () => {
    writeFileSync(legacySnapshotPath(SESSION), '');
    expect(snapshotMaterialExists(SESSION)).toBe(false);
  });

  it('answers presence even when the record would not verify', async () => {
    // A damaged body still counts as material here: the verb may be offered,
    // and the restore itself is the layer that is honest about what replays.
    await captureSessionSnapshot('$1', SESSION);
    writeFileSync(snapshotBodyPath(SESSION, 1), 'rewritten behind our back');
    expect(resolveSnapshot(SESSION)).toBe(null);
    expect(snapshotMaterialExists(SESSION)).toBe(true);
  });

  it('is false again after the session snapshots are deleted', async () => {
    await captureSessionSnapshot('$1', SESSION);
    await deleteSnapshot(SESSION);
    expect(snapshotMaterialExists(SESSION)).toBe(false);
  });

  it('never confuses one session material with another', async () => {
    await captureSessionSnapshot('$1', SESSION);
    expect(snapshotMaterialExists(OTHER)).toBe(false);
  });
});

describe('deleting a session snapshots', () => {
  it('removes every body, the record and the pre-Phase-19 file', async () => {
    writeFileSync(legacySnapshotPath(OTHER), 'old\n');
    await captureSessionSnapshot('$1', SESSION);
    paneText = 'more\n';
    await captureSessionSnapshot('$1', SESSION);
    await captureSessionSnapshot('$2', OTHER);
    writeFileSync(legacySnapshotPath(SESSION), 'old\n');

    await deleteSnapshot(SESSION);

    expect(bodies(SESSION)).toEqual([]);
    expect(existsSync(capsuleIndexPath(SESSION))).toBe(false);
    expect(existsSync(legacySnapshotPath(SESSION))).toBe(false);
    // The other session is untouched.
    expect(bodies(OTHER)).toEqual([`${OTHER}.txt.000001`]);
    expect(existsSync(capsuleIndexPath(OTHER))).toBe(true);
  });

  it('is fine when there was never a snapshot', async () => {
    await expect(deleteSnapshot(SESSION)).resolves.toBeUndefined();
  });
});

/**
 * The stage results a restore is no longer allowed to throw away (item 6).
 *
 * THE DEFECT, IN ONE SENTENCE. `restoreSessionInTmux` computed whether the
 * scrollback replayed and whether the resume was armed, wrapped both stages in
 * a `try/catch` that only warned, and returned both facts to a caller that
 * dropped them on one line and wrote `running`. A restore where both stages
 * threw was stored and broadcast as a healthy working session.
 *
 * Every case below makes a real stage fail by making the tmux call throw, and
 * asserts that the failure reaches the returned record. tmux is mocked because
 * this is about what the function reports, not about the plumbing.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ManifestSessionRecord } from '../../manifest';
import type { DurabilityNotice } from '@shared/notice';

/** Which `send-keys` calls should throw. Set per test. */
let failOn: { replay?: boolean; arm?: boolean } = {};
/** Set to make `new-session` itself fail. */
let createFails: Error | null = null;
let snapshot: string | null = null;
/** How many newer generations `resolveSnapshot` rejected. Set per test. */
let rejectedGenerations = 0;

const createSession = vi.fn(async (opts: { cwd: string }) => {
  if (createFails !== null) throw createFails;
  return {
    sessionId: '$99',
    tmuxName: 'zz-outcome-test',
    cwd: opts.cwd,
    panePid: 4242
  };
});

vi.mock('../../tmux', async () => {
  const errors =
    await vi.importActual<typeof import('../../tmux/errors')>('../../tmux/errors');
  return {
    ...errors,
    // PHASE 81. `restoreSessionInTmux` awaits the login shell PATH install
    // before it touches anything. A unit test has no login shell to ask, and
    // the value is not what any assertion here is about, so it resolves at
    // once with the PATH this process already has.
    installUserPath: () => Promise.resolve(process.env['PATH'] ?? ''),
    createSession: (opts: { cwd: string }) => createSession(opts),
    execTmux: vi.fn(async (argv: string[]) => {
      // The replay is typed WITH Enter and the armed line WITHOUT, but both
      // start as a literal `send-keys -l`. The payload is what tells them
      // apart: the replay is a `cat <snapshot>` command line, with a leading
      // space so it stays out of shell history.
      const literal = argv.includes('-l');
      const payload = argv[argv.length - 1] ?? '';
      const isReplay = literal && payload.trimStart().startsWith('cat ');
      if (isReplay && failOn.replay === true) throw new Error('send-keys refused');
      if (literal && !isReplay && failOn.arm === true) {
        throw new Error('pane is dead');
      }
      return '';
    }),
    managedPaneEnv: () => ({})
  };
});

vi.mock('../snapshots', () => ({
  resolveSnapshot: () =>
    snapshot === null
      ? null
      : {
          path: snapshot,
          capsule: null,
          verified: true,
          source: 'generation',
          rejected: rejectedGenerations
        }
}));

/** Every durability notice the restore posted. */
const notices: DurabilityNotice[] = [];
vi.mock('../../typed-events', () => ({
  broadcastEvent: (_channel: string, notice: DurabilityNotice) => {
    notices.push(notice);
  }
}));
const { resetDurabilityNoticesForTests, takePendingNotices } = await import(
  '../../notice'
);

const { restoreRecordOf, restoreSessionInTmux } = await import('../restore');

let root: string;

beforeEach(() => {
  createSession.mockClear();
  failOn = {};
  createFails = null;
  rejectedGenerations = 0;
  notices.length = 0;
  resetDurabilityNoticesForTests();
  root = mkdtempSync(join(tmpdir(), 'gmux-restore-outcome-'));
  snapshot = join(root, 'snap.txt');
  writeFileSync(snapshot, 'old scrollback\n');
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function rec(over: Partial<ManifestSessionRecord> = {}): ManifestSessionRecord {
  return {
    id: 'sess-1',
    name: 'claude-1',
    tmuxName: 'claude-1',
    projectPath: root,
    cwd: root,
    agent: 'claude',
    status: 'restorable',
    createdAt: 1,
    lastSeen: 2,
    argv: ['/abs/claude'],
    resumeArgv: ['/abs/claude', '--resume', 'ID'],
    ...over
  } as ManifestSessionRecord;
}

describe('restoreSessionInTmux — every stage failure survives', () => {
  it('both stages fail: shell_only, with both reasons, and NOT a healthy session', async () => {
    failOn = { replay: true, arm: true };
    const out = await restoreSessionInTmux(rec());
    expect(out.kind).toBe('shell_only');
    if (out.kind !== 'shell_only') return;
    expect(out.replayFailure).toBe('send-keys refused');
    expect(out.armFailure).toBe('pane is dead');
    // The record that gets stored carries both, which is the whole fix.
    expect(restoreRecordOf(out, 7)).toEqual({
      kind: 'shell_only',
      at: 7,
      replayFailure: 'send-keys refused',
      armFailure: 'pane is dead'
    });
  });

  it('only the replay fails: armed, and the lost scrollback is still reported', async () => {
    failOn = { replay: true };
    const out = await restoreSessionInTmux(rec());
    expect(out.kind).toBe('armed');
    if (out.kind !== 'armed') return;
    expect(out.armedCommand).toBe('/abs/claude --resume ID');
    expect(out.replayFailure).toBe('send-keys refused');
    expect(restoreRecordOf(out, 7).replayFailure).toBe('send-keys refused');
  });

  it('only the arm fails: transcript, and the lost resume is reported', async () => {
    failOn = { arm: true };
    const out = await restoreSessionInTmux(rec());
    expect(out.kind).toBe('transcript');
    if (out.kind !== 'transcript') return;
    expect(out.armFailure).toBe('pane is dead');
  });

  it('nothing fails: armed, with no failure strings at all', async () => {
    const out = await restoreSessionInTmux(rec());
    expect(out.kind).toBe('armed');
    expect(restoreRecordOf(out, 7)).toEqual({ kind: 'armed', at: 7 });
  });

  it('a plain shell with a replayed snapshot is transcript, not a shortfall', async () => {
    const out = await restoreSessionInTmux(
      rec({ agent: 'shell', resumeArgv: [] })
    );
    expect(out.kind).toBe('transcript');
    if (out.kind !== 'transcript') return;
    // There was no conversation to arm. That is not a failure and must not be
    // recorded as one.
    expect(out.armFailure).toBeUndefined();
  });

  it('create failing returns the failed arm carrying the original error', async () => {
    createFails = new Error('no server');
    const out = await restoreSessionInTmux(rec());
    expect(out.kind).toBe('failed');
    if (out.kind !== 'failed') return;
    expect(out.stage).toBe('create');
    expect(out.error).toBe(createFails);
    expect(out.reason).toMatch(/no server/);
    // No `info` on this arm, which is what stops a caller writing a live
    // status for a session that was never created.
    expect('info' in out).toBe(false);
  });
});

describe('the journal hook — item 7', () => {
  it('fires the instant new-session returns, before anything is typed', async () => {
    const order: string[] = [];
    const { execTmux } = await import('../../tmux');
    (execTmux as unknown as { mockClear: () => void }).mockClear();

    await restoreSessionInTmux(rec(), {
      onCreated: (info) => {
        order.push(`created:${info.sessionId}`);
      }
    });
    // Every send-keys happened after the hook. The window this closes is the
    // one where Tortie holds a session it has no record of creating.
    expect(order).toEqual(['created:$99']);
    expect(
      (execTmux as unknown as { mock: { calls: unknown[] } }).mock.calls.length
    ).toBeGreaterThan(0);
  });

  it('never fires when nothing was created', async () => {
    createFails = new Error('no server');
    const fired: string[] = [];
    await restoreSessionInTmux(rec(), {
      onCreated: (info) => fired.push(info.sessionId)
    });
    expect(fired).toEqual([]);
  });

  it('a throwing hook does not lose the restore', async () => {
    const out = await restoreSessionInTmux(rec(), {
      onCreated: () => {
        throw new Error('the database is locked');
      }
    });
    // The session exists. Losing the restore over a bookkeeping error would
    // be the larger loss, so the hook's failure is logged and swallowed.
    expect(out.kind).toBe('armed');
  });
});

describe('the snapshot ring had to reach past the newest generation', () => {
  /** Notices posted, whether or not a renderer was listening. */
  const posted = (): DurabilityNotice[] => [...notices, ...takePendingNotices()];

  it('tells the user their most recent scrollback did not survive', async () => {
    // Item 3 keeps three generations. When the newest body fails its hash the
    // reader silently uses an older one, the restore succeeds, and without
    // this notice nothing anywhere says the newest capture is gone.
    rejectedGenerations = 1;
    const out = await restoreSessionInTmux(rec());
    expect(out.kind).toBe('armed');
    expect(posted()).toEqual([
      { kind: 'snapshot-repaired', sessionName: 'claude-1' }
    ]);
  });

  it('says nothing when the newest generation verified', async () => {
    const out = await restoreSessionInTmux(rec());
    expect(out.kind).toBe('armed');
    expect(posted()).toEqual([]);
  });

  it('says nothing when there was no snapshot at all', async () => {
    snapshot = null;
    await restoreSessionInTmux(rec());
    expect(posted()).toEqual([]);
  });
});

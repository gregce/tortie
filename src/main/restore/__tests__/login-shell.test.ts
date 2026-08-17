/**
 * What argv a restore hands to tmux (Phase 74, GitHub issue 8).
 *
 * Two separate claims are checked here, and only the first one was reported.
 *
 *  1. A restored SHELL session starts as a login shell, so the person's own
 *     ~/.zprofile runs and completion behaves the way it does in Terminal.app.
 *  2. A restored shell session comes back with the argv the manifest recorded.
 *     This function used to spawn `[shell]` and never read `rec.argv`, so every
 *     extra flag a shell session was launched with was dropped at restore. On
 *     that one path the manifest was not the source of truth.
 *
 * The gate is the third claim and it is why Phase 33 does not block this. This
 * function opens a holder shell for EVERY row, whatever agent the row names, so
 * an ungated flag would run agent writable rc code before every agent restore.
 * The last case below is the proof that an agent restore is unchanged.
 *
 * tmux is mocked, the way ./cwd-guard.test.ts mocks it. This is about the argv,
 * not the plumbing.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ManifestSessionRecord } from '../../manifest';

const createSession = vi.fn(async (opts: { cwd: string; argv: string[] }) => ({
  sessionId: '$98',
  tmuxName: 'zz-login-shell-test',
  cwd: opts.cwd,
  panePid: 4343
}));

vi.mock('../../tmux', async () => {
  const errors =
    await vi.importActual<typeof import('../../tmux/errors')>('../../tmux/errors');
  return {
    ...errors,
    createSession: (opts: { cwd: string; argv: string[] }) => createSession(opts),
    execTmux: vi.fn(async () => ''),
    managedPaneEnv: () => ({})
  };
});

// No Electron userData in a unit test; no snapshot means no replay.
vi.mock('../snapshots', () => ({ resolveSnapshot: () => null }));

import { restoreSessionInTmux } from '../restore';

/** The same fallback the module uses when the environment names no shell. */
const FALLBACK_SHELL = process.env['SHELL'] ?? '/bin/zsh';

/** A binary that certainly exists on the machine running this test. */
const REAL_SHELL = process.execPath;

let root: string;

/** Sessions carry more agent ids at runtime than the frozen AgentKind union. */
const as = (id: string): ManifestSessionRecord['agent'] =>
  id as ManifestSessionRecord['agent'];

beforeEach(() => {
  createSession.mockClear();
  root = mkdtempSync(join(tmpdir(), 'gmux-login-shell-'));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function rec(over: Partial<ManifestSessionRecord>): ManifestSessionRecord {
  return {
    id: 'sess-74',
    name: 'shell-1',
    tmuxName: 'shell-1',
    projectPath: root,
    cwd: root,
    agent: as('shell'),
    status: 'restorable',
    createdAt: 1,
    lastSeen: 2,
    argv: [REAL_SHELL],
    ...over
  } as ManifestSessionRecord;
}

/** The argv the single createSession call was made with. */
function spawnedArgv(): string[] {
  expect(createSession).toHaveBeenCalledTimes(1);
  const call = createSession.mock.calls[0]?.[0];
  if (call === undefined) throw new Error('createSession was never called');
  return call.argv;
}

describe('a restored shell session', () => {
  it('comes back with the argv the row recorded, flag included', async () => {
    await restoreSessionInTmux(rec({ argv: [REAL_SHELL, '-l', '--no-rcs'] }));
    expect(spawnedArgv()).toEqual([REAL_SHELL, '-l', '--no-rcs']);
  });

  it('keeps every extra flag, which the old code dropped', async () => {
    await restoreSessionInTmux(rec({ argv: [REAL_SHELL, '--no-rcs', '-f'] }));
    // The flag goes in at index 1 and the user's flags keep their order.
    expect(spawnedArgv()).toEqual([REAL_SHELL, '-l', '--no-rcs', '-f']);
  });

  it('a row from an older build gains the flag with no migration', async () => {
    await restoreSessionInTmux(rec({ argv: [REAL_SHELL] }));
    expect(spawnedArgv()).toEqual([REAL_SHELL, '-l']);
  });

  it('a shell that is gone falls back to $SHELL and says so', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      await restoreSessionInTmux(rec({ argv: ['/nope/zsh', '--no-rcs'] }));
      expect(spawnedArgv()).toEqual([FALLBACK_SHELL, '-l']);
      const said = warn.mock.calls.map((c) => String(c[0])).join('\n');
      expect(said).toContain('/nope/zsh');
      expect(said).toContain('no longer');
    } finally {
      warn.mockRestore();
    }
  });

  it('an empty argv falls back to $SHELL rather than spawning nothing', async () => {
    await restoreSessionInTmux(rec({ argv: [] }));
    expect(spawnedArgv()).toEqual([FALLBACK_SHELL, '-l']);
  });
});

describe('an agent restore is byte for byte what it was, which is the gate', () => {
  it('claude still gets a bare holder shell with no login flag', async () => {
    await restoreSessionInTmux(
      rec({
        name: 'claude-1',
        agent: as('claude'),
        argv: ['/usr/local/bin/claude', '--session-id', 'ID'],
        resumeArgv: ['/usr/local/bin/claude', '--resume', 'ID']
      })
    );
    const argv = spawnedArgv();
    expect(argv).toEqual([FALLBACK_SHELL]);
    expect(argv).not.toContain('-l');
  });

  it('the agent binary is not what the holder shell runs', async () => {
    await restoreSessionInTmux(
      rec({
        name: 'codex-1',
        agent: as('codex'),
        argv: ['/usr/local/bin/codex']
      })
    );
    expect(spawnedArgv()).toEqual([FALLBACK_SHELL]);
  });
});

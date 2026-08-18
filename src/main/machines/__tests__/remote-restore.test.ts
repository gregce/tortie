/**
 * The remote restore verb, at the level a unit test can prove (Phase 72, M5).
 *
 * ## What this file tests and what it deliberately leaves to the harness
 *
 * The verb sends commands to another computer. Mocking that spawn would prove
 * the mock, which is why the end to end restore is watched in
 * `GMUX_SMOKE=remote-sessions` and graded by the ten row matrix.
 *
 * What IS provable here is the half that decides whether anything gets sent at
 * all, and it is the half that can lose a person's work:
 *
 *  - a row with no record on this Mac is refused before anything is composed
 *  - a row whose machine is not known is refused with the sentence for that
 *  - the launch argv is recomposed from the row's absolute path, with the
 *    bare name asked of the machine again and its answer put back at
 *    `argv[0]`. Phase 84's fix round moved the restore onto that answer,
 *    because a pane on another machine does not get that machine's own
 *    program search list and a bare name launch left a dead pane there.
 *  - the saved output instant comes from this Mac and is reported honestly
 *
 * The gate itself has its own file, `./restore-gate.test.ts`. This one is about
 * what the verb does with the gate's answer.
 */

import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let userData = '';

vi.mock('electron', () => ({
  app: { getPath: () => userData, getVersion: () => '0.36.0' }
}));

const { ManifestStore } = await import('../../manifest/store');
const { setRemoteManifest, writeRemoteRow } = await import('../remote-record');
const { resetRemoteSessionsForTests } = await import('../remote-sessions');
const { resetMachinesStoreForTests, addMachineRow, reloadMachines } =
  await import('../store');
const {
  REPLAY_IS_NOT_ATTEMPTED,
  RESTORE_NO_RECORD,
  restoreRemoteSession
} = await import('../remote-restore');
// PHASE 72 FIX ROUND. The restore used to keep its own copy of this read. There
// is one, in the module that owns the durable ring, and both callers use it.
const { savedOutputAt } = await import('../../restore/snapshots');
const { RESTORE_FORGOTTEN, RESUME_NOT_COLLECTED } = await import('../remote-copy');

type Store = InstanceType<typeof ManifestStore>;

let root = '';
let store: Store;

const CREATED_AT = 1_700_000_000_000;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'gmux-p72-restore-'));
  userData = root;
  store = new ManifestStore(join(root, 'manifest.db'));
  setRemoteManifest(store);
  resetRemoteSessionsForTests();
  resetMachinesStoreForTests();
});

afterEach(() => {
  setRemoteManifest(null);
  resetRemoteSessionsForTests();
  resetMachinesStoreForTests();
  store.close();
  rmSync(root, { recursive: true, force: true });
});

function writeRow(machineId = 'studio'): void {
  writeRemoteRow({
    sessionId: 'sess-1',
    machineId,
    name: 'the remote one',
    tmuxName: 'the-remote-one',
    projectPath: '/Users/them/work',
    cwd: '/Users/them/work/api',
    agent: 'claude',
    argv: ['/opt/homebrew/bin/claude', '--model', 'opus'],
    bin: '/opt/homebrew/bin/claude',
    createdAt: CREATED_AT
  });
}

/** The message a refused call carried, as a person would read it. */
async function refusalOf(work: () => Promise<unknown>): Promise<string> {
  try {
    await work();
  } catch (err) {
    const raw = (err as Error).message;
    try {
      return String((JSON.parse(raw) as { message?: string }).message ?? raw);
    } catch {
      return raw;
    }
  }
  return '';
}

// ---------------------------------------------------------------------------
// What is refused before anything is composed
// ---------------------------------------------------------------------------

describe('the refusals that run before anything is sent', () => {
  /**
   * Every remote session created by 0.34 or 0.35 is one of these. Those builds
   * wrote no row, so there is no recorded folder, no recorded program and no
   * recorded machine to compose from.
   */
  it('refuses a session with no record on this Mac', async () => {
    const said = await refusalOf(() => restoreRemoteSession('never-written'));
    expect(said).toBe(RESTORE_NO_RECORD);
  });

  it('names the older version rather than blaming the machine', () => {
    expect(RESTORE_NO_RECORD).toContain('an older version');
    expect(RESTORE_NO_RECORD).toContain('Nothing was started.');
    expect(RESTORE_NO_RECORD).not.toContain('—');
  });

  /**
   * The row is there, and its machine is not. The gate's first arm, reached
   * through the verb, and it is the one whose fix belongs to the person: add
   * the machine again.
   */
  it('refuses a row whose machine is no longer in the machines file', async () => {
    writeRow();
    const said = await refusalOf(() => restoreRemoteSession('sess-1'));
    expect(said).toBe(RESTORE_FORGOTTEN);
  });

  /**
   * The machine is in the file and nobody has signed in to it in this run, so
   * nothing can be composed for it and nothing is.
   */
  it('refuses a machine nobody signed in to, and says how to fix it', async () => {
    addMachineRow({
      id: 'studio',
      label: 'Studio',
      color: 'blue',
      host: '127.0.0.1',
      user: 'nobody',
      port: 65_000,
      remoteTmuxPath: '/usr/bin/tmux'
    });
    reloadMachines();
    writeRow();
    const said = await refusalOf(() => restoreRemoteSession('sess-1'));
    expect(said).toContain('Open Settings and then Machines');
  });
});

// ---------------------------------------------------------------------------
// The two sentences the outcome always carries
// ---------------------------------------------------------------------------

describe('what a restore promises and what it does not', () => {
  /**
   * No conversation comes back, in this release, for every remote row. It is a
   * fact about the build rather than a case that sometimes applies, so the
   * sentence is on the outcome unconditionally.
   */
  it('says the session comes back and the conversation does not', () => {
    expect(RESUME_NOT_COLLECTED).toContain('The session comes back');
    expect(RESUME_NOT_COLLECTED).toContain('The conversation does not come back');
  });

  /**
   * The saved output stays on this Mac. Three mechanisms could put it back and
   * `remote-restore.ts` refuses all three with its reasons, so the sentence has
   * to say plainly that it was not put back rather than staying silent.
   */
  it('says the saved output was not put back on that machine', () => {
    expect(REPLAY_IS_NOT_ATTEMPTED).toContain('kept on this Mac');
    expect(REPLAY_IS_NOT_ATTEMPTED).toContain('not');
    expect(REPLAY_IS_NOT_ATTEMPTED).toContain('put back on that machine');
  });

  it('neither sentence carries a dash the writing rules refuse', () => {
    for (const sentence of [
      REPLAY_IS_NOT_ATTEMPTED,
      RESTORE_NO_RECORD,
      RESUME_NOT_COLLECTED
    ]) {
      expect(sentence).not.toContain('—');
      expect(sentence).not.toContain('–');
    }
  });
});

// ---------------------------------------------------------------------------
// PHASE 84, item 9. Saying yes is still not typing
// ---------------------------------------------------------------------------

describe('what an armed verdict does not do', () => {
  /**
   * WHAT THIS TEST IS AND IS NOT. It reads the source of the verb rather than
   * driving it, because driving it sends commands to another computer and a
   * mocked spawn would prove the mock. What it proves is narrow and it is the
   * thing Phase 84 could have broken: the field is a LITERAL false with no
   * branch in front of it.
   *
   * Phase 84 gave the arming gate a second shape of row it says yes to, being a
   * row whose conversation id Tortie put on the launch line itself. Nothing in
   * this release types a resume command into a pane on another machine, because
   * `send-keys` is on the permanently refused verb list. So a later round that
   * wires the gate's yes to this field would be claiming a conversation was
   * continued when nothing continued it, and this test fails on that edit.
   *
   * The end to end proof is `GMUX_SMOKE=remote-sessions`, which restores a real
   * row on a real machine and reads the field back.
   */
  it('reports resumeArmed false with no branch in front of it', () => {
    const source = readFileSync(
      join(import.meta.dirname, '..', 'remote-restore.ts'),
      'utf8'
    );
    expect(source).toContain('resumeArmed: false');
    expect(source).not.toMatch(/resumeArmed:\s*arming\.arm/);
    expect(source).not.toMatch(/resumeArmed:\s*[a-zA-Z]+\s*\?/);
  });
});

// ---------------------------------------------------------------------------
// The saved output instant
// ---------------------------------------------------------------------------

describe('the saved output instant', () => {
  /**
   * Null rather than zero, so a surface cannot render "1 January 1970" for a
   * session Tortie has never captured.
   */
  it('is null when Tortie holds no saved output for the session', () => {
    expect(savedOutputAt('sess-1')).toBeNull();
  });
});

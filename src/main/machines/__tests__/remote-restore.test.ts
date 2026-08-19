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
 *  - PHASE 89: which argv the create takes, and where `resumeArmed` comes
 *    from. Both are read off the source rather than driven, for the reason
 *    above, and the driven proof is live probe 1 in the remote smoke.
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
   * The sentence for a row whose conversation id Tortie never collected, which
   * is nine of the thirteen agents on a machine and did not change in Phase 89.
   * Such a row comes back running its own program and nothing is typed into it.
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
// PHASE 89. The gate's answer picks the argv, and the screen decides the field
// ---------------------------------------------------------------------------

/**
 * WHAT THESE TESTS ARE AND ARE NOT. They read the source of the verb rather
 * than driving it, because driving it sends commands to another computer and a
 * mocked spawn would prove the mock. What they prove is narrow and it is the
 * set of things a later edit could quietly break.
 *
 * The driven proof is live probe 1 of `GMUX_SMOKE=remote-sessions`, which
 * restores a real agent row on a real machine over a real connection, reads
 * that session's screen and counts the copies of the command on it.
 */
describe('the shape a remote restore takes, read off its own source', () => {
  const source = readFileSync(
    join(import.meta.dirname, '..', 'remote-restore.ts'),
    'utf8'
  );
  /**
   * The same file with its prose taken out, so an assertion about what the CODE
   * does is not answered by a comment that happens to name the thing it stopped
   * doing. The header of that file names `RESUME_NOT_TYPED_HERE` on purpose,
   * because a reader needs to know the sentence was deleted and why.
   */
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  /**
   * THE ORDER IS THE PHASE. Before Phase 89 the gate was asked after the
   * create, because its answer only picked a sentence. It picks the argv now,
   * so a version that asks it afterwards would compose the create from the
   * launch argv and then type a resume command into a pane already running the
   * agent, which puts the text in that agent's input box and continues nothing.
   */
  it('asks the arming gate before it composes the create', () => {
    const gate = source.indexOf('resumeArmingVerdict(');
    const create = source.indexOf('remoteCreateArgs(');
    expect(gate).toBeGreaterThan(-1);
    expect(create).toBeGreaterThan(-1);
    expect(gate).toBeLessThan(create);
  });

  /**
   * The empty argv is what makes tmux start that machine's own shell, which is
   * the same thing the local restore does before it types the command.
   */
  it('creates with an empty argv only when there is a command to type into it', () => {
    expect(source).toContain('const createArgv = armsForReal ? [] : launchArgv;');
    expect(source).toContain(
      'const armsForReal = composed !== null && composed.text !== null;'
    );
    expect(source).toContain('argv: createArgv,');
  });

  /**
   * THE FIX ROUND'S OWN TEST, AND IT IS A REGRESSION TEST.
   *
   * The gate saying yes is not the same answer as Tortie composing a command.
   * The gate reads the row's provenance. The composer reads every word of the
   * recorded command against the compiled catalogue, so an agent a person added
   * in Settings is armed by the gate and refused by the composer.
   *
   * The first version composed AFTER the create. Such a row came back running a
   * bare shell with no agent in it, which is worse than what it got before this
   * phase, while `RESUME_NOT_COMPOSED` told the person the session comes back
   * with its program. Composing before the create is what makes that sentence
   * true, so the order is asserted here rather than trusted.
   */
  it('composes the command before it composes the create', () => {
    const compose = source.indexOf('composeArmedResumeText(');
    const create = source.indexOf('remoteCreateArgs(');
    expect(compose).toBeGreaterThan(-1);
    expect(compose).toBeLessThan(create);
  });

  it('hands the composed answer to the arming path rather than asking twice', () => {
    // One `composeArmedResumeText(` call in the code, and the answer travels to
    // `armRemoteResume` as its third argument. Two calls would be two
    // decisions, and only one of them chose the create.
    expect(code.match(/composeArmedResumeText\(/gu)?.length ?? 0).toBe(1);
    expect(code).toMatch(
      /armRemoteResume\(\s*\{ \.\.\.armBase, target: tmuxId \},\s*undefined,\s*composed\s*\)/u
    );
  });

  /**
   * `resumeArmed` is a claim that a person's conversation is waiting for them.
   * It may only come from a screen Tortie read back, never from the gate that
   * allowed the attempt, because a send can fail and a machine can take the
   * text twice.
   */
  it('reports resumeArmed from the screen it read back, never from the gate', () => {
    expect(source).toContain(
      "resumeArmed: armed !== null && armed.landing === 'armed'"
    );
    expect(code).not.toMatch(/resumeArmed:\s*arming\.arm/);
    expect(code).not.toMatch(/resumeArmed:\s*true/);
  });

  /**
   * ENTER IS NEVER SENT, and this file cannot send it even by accident: it
   * composes no argv for the far side's `send-keys` at all. The five element
   * argv is composed inside `../exec-plane.ts`, which is the only module that
   * can hand the ledger the guard the unsafe row names.
   */
  it('composes no key press and no send-keys argv of its own', () => {
    expect(code).not.toContain("'Enter'");
    expect(code).not.toContain('send-keys');
  });

  /**
   * The sentence said that continuing a conversation on another machine is
   * something this release does not do. This release does it, so the sentence
   * was deleted rather than left standing, the way Phase 72 deleted
   * `RESTORE_REFUSED` when it became false.
   */
  it('no longer names the sentence that said this cannot be done', () => {
    expect(code).not.toContain('RESUME_NOT_TYPED_HERE');
    expect(code).not.toContain('not-typed-here');
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

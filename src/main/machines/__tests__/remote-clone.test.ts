/**
 * Putting this project on a machine that does not have it (Phase 90.2, item 3).
 *
 * NOTHING HERE CROSSES TO A MACHINE. The write door in `../remote-run.ts` is
 * replaced by a function that records what it was asked to send and answers
 * with what a machine would have printed. Every property below is about what
 * Tortie sends, what it refuses to send, and what it says about the answer.
 *
 * THE ORDER OF THE CHECKS IS THE SAFETY, so the tests assert the order rather
 * than only the outcome. A refusal that fires after the write is not a refusal.
 *
 * WHAT THIS FILE CANNOT SHOW. It cannot show that git on a machine copies
 * anything, that a destination that is already there survives untouched, or
 * that a copy of an address nobody can reach creates nothing. Those are the
 * scratch machine steps in `GMUX_SMOKE=remote-sessions` and the live runs in
 * `npm run probe:remoteclone`.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GmuxError } from '../../errors';
import type { RemoteMachineContext } from '../context';

const CTX: RemoteMachineContext = {
  kind: 'remote',
  machineId: 'studio',
  sshBin: '/usr/bin/ssh',
  host: '127.0.0.1',
  user: null,
  port: 45731,
  remoteTmuxPath: '/usr/bin/tmux',
  socket: 'gmux-p902-unit',
  controlPath: '/tmp/tortie-501/m-0123456789ab',
  hostKeys: { tortie: '/t/known-machines', user: '/u/known_hosts' }
};

/** Every write and every read the door was asked for, in order. */
let asked: { door: 'read' | 'write'; script: string; args: string[] }[] = [];
/** What each script answers with, keyed by its id. */
let answers: Record<string, string | Error> = {};
/** What `git config --get remote.origin.url` prints here, or a refusal. */
let origin: string | null = 'https://github.com/gregce/tortie.git';
/** Whether the link reads as answering. */
let connected = true;
/** Phase 118. What the write door was told this piece of work is. */
let execution: unknown = null;

vi.mock('../remote-run', () => ({
  machineIsConnected: (): boolean => connected,
  runRemoteRead: (
    _ctx: unknown,
    script: string,
    args: readonly string[]
  ): Promise<{ payload: string; generation: number; bytes: number }> => {
    asked.push({ door: 'read', script, args: [...args] });
    const answer = answers[script];
    if (answer instanceof Error) return Promise.reject(answer);
    return Promise.resolve({ payload: answer ?? 'none', generation: 3, bytes: 0 });
  },
  runRemoteWrite: (
    _ctx: unknown,
    script: string,
    args: readonly string[],
    options?: { execution?: unknown }
  ): Promise<{ payload: string; generation: number; bytes: number }> => {
    asked.push({ door: 'write', script, args: [...args] });
    execution = options?.execution ?? null;
    const answer = answers[script];
    if (answer instanceof Error) return Promise.reject(answer);
    return Promise.resolve({ payload: answer ?? '', generation: 3, bytes: 0 });
  }
}));

vi.mock('../ready-context', () => ({
  readyRemoteContext: (): RemoteMachineContext => CTX
}));

/** Phase 118. Whether the ledger is still accepting remote work. */
let accepting = true;

/**
 * Phase 144. What the real `isRemoteExecUnjournaled` matches: a GmuxError
 * whose code is FS_FAILED and whose payload message is the pinned sentence.
 * The mock reads the payload off the error the same way the real one does, so
 * the arm under test cannot pass here while missing the real shape.
 */
const NOT_RECORDED =
  'Tortie could not write down that this work was starting, so nothing was ' +
  'sent to that machine. Try again.';

vi.mock('../execution-ledger', () => ({
  remoteExecutionsAccepted: (): boolean => accepting,
  // The real constants, so the arms that read them here cannot drift from the
  // ones the exec plane throws.
  REMOTE_EXEC_SHUTDOWN:
    'Tortie is quitting, so nothing more was sent to that machine.',
  REMOTE_EXEC_NOT_RECORDED: NOT_RECORDED,
  isRemoteExecUnjournaled: (err: unknown): boolean => {
    const payload = (err as { payload?: { code?: string; message?: string } })
      .payload;
    return payload?.code === 'FS_FAILED' && payload.message === NOT_RECORDED;
  }
}));

vi.mock('../store', () => ({
  machineRow: (id: string) => ({ id, host: '127.0.0.1' }),
  machineLabelOf: () => "Greg's Mac Pro"
}));

vi.mock('../context', () => ({
  machineGeneration: () => ({ generation: 3 })
}));

vi.mock('../remote-image', () => ({
  remoteMachineHome: (): Promise<string> => Promise.resolve('/Users/gdc')
}));

// Phase 126: `../project-counterpart.ts` takes `runGit` from the `../../git/exec`
// leaf rather than the `../../git` barrel, so the barrel no longer pulls the git
// service and the git IPC registrar into this test's graph.
vi.mock('../../git/exec', () => ({
  runGit: (): Promise<{ code: number; stdout: Buffer; stderr: string }> =>
    Promise.resolve(
      origin === null
        ? { code: 1, stdout: Buffer.from(''), stderr: 'not a repository' }
        : { code: 0, stdout: Buffer.from(`${origin}\n`), stderr: '' }
    )
}));

const { cloneProjectOnMachine, parseCloneAnswer } = await import(
  '../remote-clone'
);
const {
  CLONE_CHANGED,
  CLONE_NOT_WEB_ADDRESS,
  CLONE_PATH_NOT_ABSOLUTE
} = await import('../remote-copy');
const { findProjectOnMachine, resetRemoteProjectFindForTests } = await import(
  '../project-counterpart'
);

const URL_HERE = 'https://github.com/gregce/tortie.git';

/** One `git-clone` answer, in the shape the catalogue prints. */
function said(word: string, detail: string, path: string): string {
  const middle =
    detail.length === 0 ? 'none' : Buffer.from(detail, 'utf8').toString('base64');
  return `${word} ${middle} ${path}`;
}

/** One `repo-find` line. */
function row(url: string, path: string): string {
  return `${Buffer.from(url, 'utf8').toString('base64')} ${path}`;
}

/** The ordinary call, with the address the sheet drew. */
function call(overrides: Partial<Parameters<typeof cloneProjectOnMachine>[0]> = {}) {
  return cloneProjectOnMachine({
    machineId: 'studio',
    localPath: '/Users/gdc/gmux',
    expectUrl: URL_HERE,
    path: '/Users/gdc/gmux',
    ...overrides
  });
}

beforeEach(() => {
  asked = [];
  answers = {};
  origin = URL_HERE;
  connected = true;
  accepting = true;
  execution = null;
  resetRemoteProjectFindForTests();
});

describe('reading what the machine said', () => {
  it('reads the word, what git printed and the folder', () => {
    expect(parseCloneAnswer(said('failed', 'fatal: nope', '/tmp/a'))).toEqual({
      word: 'failed',
      detail: 'fatal: nope',
      path: '/tmp/a'
    });
  });

  it('keeps a folder whose name holds a space', () => {
    expect(parseCloneAnswer(said('cloned', '', '/Users/gdc/my work'))?.path).toBe(
      '/Users/gdc/my work'
    );
  });

  it('answers nothing for a word nobody wrote down', () => {
    expect(parseCloneAnswer('removed none /tmp/a')).toBeNull();
    expect(parseCloneAnswer('')).toBeNull();
    expect(parseCloneAnswer('cloned none')).toBeNull();
  });
});

describe('what is refused before anything is sent', () => {
  it('sends nothing when Tortie is not connected to the machine', async () => {
    connected = false;
    const out = await call();
    expect(out.outcome).toBe('offline');
    expect(asked).toEqual([]);
    expect(out.url).toBe('');
  });

  it('sends nothing when main own read disagrees with the sheet', async () => {
    // This is why the renderer cannot choose the address. Main derives it from
    // the project folder and refuses when it does not equal what it was given.
    origin = 'https://github.com/someone/else.git';
    const out = await call();
    expect(out.outcome).toBe('changed');
    expect(out.sentences).toEqual([CLONE_CHANGED]);
    expect(asked).toEqual([]);
  });

  it('sends nothing when the project stopped having a remote', async () => {
    origin = null;
    const out = await call();
    expect(out.outcome).toBe('changed');
    expect(asked).toEqual([]);
  });

  it('sends nothing for an address that is not a web address', async () => {
    // A caller reaches this only by handing main an address main itself would
    // not derive, so the sheet cannot produce it. It is pinned in
    // build/assert-bundle-refusals.mjs for exactly that reason.
    origin = 'git@github.com:gregce/tortie.git';
    const out = await call({ expectUrl: 'git@github.com:gregce/tortie.git' });
    expect(out.outcome).toBe('changed');
    expect(asked).toEqual([]);
    expect(CLONE_NOT_WEB_ADDRESS).toContain('nothing was sent to that machine');
  });

  it('sends nothing for a destination that is not a full path', async () => {
    const out = await call({ path: 'gmux' });
    expect(out.outcome).toBe('refused');
    expect(out.sentences).toEqual([CLONE_PATH_NOT_ABSOLUTE]);
    expect(asked).toEqual([]);
  });
});

describe('the one write', () => {
  it('sends the address main derived and the destination, in that order', async () => {
    answers['git-clone'] = said('cloned', '', '/Users/gdc/gmux');
    await call();
    expect(asked).toEqual([
      {
        door: 'write',
        script: 'git-clone',
        args: [URL_HERE, '/Users/gdc/gmux']
      }
    ]);
  });

  it('rewrites the address before it sends it', async () => {
    origin = 'git@github.com:gregce/tortie.git';
    answers['git-clone'] = said('cloned', '', '/Users/gdc/gmux');
    const out = await call({ expectUrl: URL_HERE });
    expect(out.outcome).toBe('cloned');
    expect(asked[0]?.args[0]).toBe(URL_HERE);
  });

  it('says the copy finished, and that nothing here changed', async () => {
    answers['git-clone'] = said('cloned', '', '/Users/gdc/gmux');
    const out = await call();
    expect(out.outcome).toBe('cloned');
    expect(out.sentences[0]).toContain('Nothing on this Mac changed.');
  });

  it('says nothing was written when the machine could not reach the address', async () => {
    answers['git-clone'] = said('unreachable', '', '/Users/gdc/gmux');
    const out = await call();
    expect(out.outcome).toBe('unreachable');
    expect(out.sentences[0]).toContain('Nothing was written');
  });

  it('carries what git printed when git refused', async () => {
    answers['git-clone'] = said(
      'failed',
      'fatal: could not create leading directories',
      '/Users/gdc/gmux'
    );
    const out = await call();
    expect(out.outcome).toBe('failed');
    expect(out.detail).toBe('fatal: could not create leading directories');
  });

  it('answers failed rather than throwing when the link dropped', async () => {
    answers['git-clone'] = new Error('the link dropped');
    const out = await call();
    expect(out.outcome).toBe('failed');
    expect(out.detail).toBe('the link dropped');
  });

  it('answers failed rather than guessing at an answer it could not read', async () => {
    answers['git-clone'] = 'something else entirely';
    const out = await call();
    expect(out.outcome).toBe('failed');
  });
});

/**
 * PHASE 118. A quit that ended the ssh child produces the same rejected promise
 * a dropped link does, and the two are different things to a person. The ledger
 * stops accepting work on the first line of the quit, so a copy that failed
 * while it was refusing is a copy Tortie itself ended.
 */
describe('a copy the quit cut off', () => {
  it('names the quit rather than blaming the link', async () => {
    accepting = false;
    answers['git-clone'] = new Error('Command failed: ssh ... SIGTERM');
    const out = await call();
    expect(out.outcome).toBe('cutOff');
    expect(out.sentences[0]).toContain('You quit Tortie while this copy was running');
    // The consequence is the same as a deadline, so the sentence names both
    // halves of it: the machine, and the folder that may hold part of the copy.
    expect(out.sentences[0]).toContain("Greg's Mac Pro");
    expect(out.sentences[0]).toContain('/Users/gdc/gmux');
  });

  it('carries the kind, the destination and the label to the ledger', async () => {
    // The label travels because the row this copy writes outlives the run, and
    // the machine may be removed before anybody reads it.
    answers['git-clone'] = said('cloned', '', '/Users/gdc/gmux');
    await call();
    expect(execution).toEqual({
      kind: 'clone',
      subject: '/Users/gdc/gmux',
      machineLabel: "Greg's Mac Pro"
    });
  });

  /**
   * The ledger's own refusal fires BEFORE an argv is composed, so nothing
   * crossed. Telling a person to go and look at a folder that was never touched
   * would be false, so this arm names no path at all.
   */
  it('says nothing was sent when the ledger refused before anything crossed', async () => {
    accepting = false;
    answers['git-clone'] = new Error(
      'Tortie is quitting, so nothing more was sent to that machine.'
    );
    const out = await call();
    expect(out.outcome).toBe('cutOff');
    expect(out.sentences[0]).toContain('nothing was sent to');
    expect(out.sentences[0]).toContain('nothing was written there');
    expect(out.sentences[0]).not.toContain('/Users/gdc/gmux');
    expect(out.sentences[0]).not.toContain('may still be running');
  });

  it('still says timeout when the quit is not what ended it', async () => {
    accepting = true;
    answers['git-clone'] = new Error('the link dropped');
    const out = await call();
    expect(out.outcome).toBe('failed');
  });
});

/**
 * PHASE 144, stage 2 of the 36 plan. A copy whose durable start row could not
 * be written is refused by the ledger before an argv is composed. The person
 * reads a sentence that names the machine, says nothing crossed, and tells
 * them to try again. It names no path, because no folder over there was
 * touched, and it is a different fact from the quit having started.
 */
describe('a copy whose record could not be written', () => {
  it('is refused with the sentence that names the machine and no path', async () => {
    answers['git-clone'] = new GmuxError(
      'FS_FAILED',
      NOT_RECORDED,
      'refused clone for machine studio: the start row could not be written'
    );
    const out = await call();
    expect(out.outcome).toBe('refused');
    expect(out.sentences[0]).toContain('could not write down');
    expect(out.sentences[0]).toContain("Greg's Mac Pro");
    expect(out.sentences[0]).toContain('nothing was written there');
    expect(out.sentences[0]).toContain('Try again.');
    expect(out.sentences[0]).not.toContain('/Users/gdc/gmux');
    expect(out.sentences[0]).not.toContain('may still be running');
  });

  it('is not read as a quit, even while the ledger is refusing new work', async () => {
    // The refusal can only fire while the ledger is still accepting, but the
    // order of the arms is asserted anyway: a typed durability refusal is its
    // own fact, and neither shutdown arm may claim it.
    accepting = false;
    answers['git-clone'] = new GmuxError('FS_FAILED', NOT_RECORDED, 'why');
    const out = await call();
    expect(out.outcome).toBe('refused');
    expect(out.sentences[0]).toContain('could not write down');
  });

  it('leaves an ordinary filesystem failure on the failed arm', async () => {
    answers['git-clone'] = new GmuxError(
      'FS_FAILED',
      'some other filesystem failure'
    );
    const out = await call();
    expect(out.outcome).toBe('failed');
  });
});

describe('a destination that is already there', () => {
  it('refuses it when it holds something else', async () => {
    answers['git-clone'] = said('exists', '', '/Users/gdc/gmux');
    answers['repo-find'] = row(
      'https://github.com/someone/else.git',
      '/Users/gdc/gmux'
    );
    const out = await call();
    expect(out.outcome).toBe('exists');
    expect(out.sentences[0]).toContain('never writes into a folder');
  });

  it('uses it when it holds a copy of this same project', async () => {
    // A link that dies after the far side finished leaves a good copy Tortie
    // never heard about. The retry reads `exists` for a folder Tortie itself
    // made, and reporting that as a refusal would be wrong.
    answers['git-clone'] = said('exists', '', '/Users/gdc/gmux');
    answers['repo-find'] = row(
      'git@github.com:gregce/tortie.git',
      '/Users/gdc/gmux'
    );
    const out = await call();
    expect(out.outcome).toBe('existsSame');
    expect(out.sentences[0]).toContain('copied nothing');
  });

  it('looks only at that one folder', async () => {
    answers['git-clone'] = said('exists', '', '/Users/gdc/gmux');
    answers['repo-find'] = 'none';
    await call();
    const read = asked.filter((one) => one.door === 'read');
    expect(read).toHaveLength(1);
    expect(read[0]?.script).toBe('repo-find');
    expect(read[0]?.args[0]).toBe('/Users/gdc/gmux');
    expect(read[0]?.args[1]).toBe('1');
  });

  it('refuses rather than guessing when that one read failed', async () => {
    answers['git-clone'] = said('exists', '', '/Users/gdc/gmux');
    answers['repo-find'] = new Error('the link dropped');
    const out = await call();
    expect(out.outcome).toBe('exists');
  });

  it('does the read AFTER the write and never before it', async () => {
    answers['git-clone'] = said('exists', '', '/Users/gdc/gmux');
    answers['repo-find'] = 'none';
    await call();
    expect(asked.map((one) => one.door)).toEqual(['write', 'read']);
  });
});

describe('what one copy does to the answer the sheet remembers', () => {
  /**
   * `findProjectOnMachine` holds what one machine answered for the life of one
   * connection, so a second lookup costs nothing. A copy makes that held answer
   * wrong, because a folder is now there that was not there when the walk ran.
   *
   * The visible harm is a wrong sentence rather than lost work. A person who
   * copies into the suggested folder and opens the sheet again on the same
   * connection would read that no folder over there has this project's git
   * remote, and would be offered the copy a second time. Pressing it copies
   * nothing, because the script tests the destination first, so what they get
   * is `existsSame` and a sentence that says nothing was copied.
   */
  it('asks the machine again after a copy, on the same connection', async () => {
    answers['repo-find'] = 'none';
    await findProjectOnMachine({ machineId: 'studio', localPath: '/Users/gdc/gmux' });
    // The held answer, proven by a second lookup that crosses nothing.
    await findProjectOnMachine({ machineId: 'studio', localPath: '/Users/gdc/gmux' });
    expect(asked.filter((one) => one.script === 'repo-find')).toHaveLength(1);

    answers['git-clone'] = said('cloned', '', '/Users/gdc/gmux');
    const out = await call();
    expect(out.outcome).toBe('cloned');

    answers['repo-find'] = row(URL_HERE, '/Users/gdc/gmux');
    const after = await findProjectOnMachine({
      machineId: 'studio',
      localPath: '/Users/gdc/gmux'
    });
    expect(asked.filter((one) => one.script === 'repo-find')).toHaveLength(2);
    expect(after.outcome).toBe('found');
  });

  it('forgets it even when the copy failed', async () => {
    // A copy that hit the deadline or lost its link part way can leave a folder
    // behind, so the held answer is dropped on every outcome after the send.
    answers['repo-find'] = 'none';
    await findProjectOnMachine({ machineId: 'studio', localPath: '/Users/gdc/gmux' });
    answers['git-clone'] = said('failed', 'fatal: repository not found', '/Users/gdc/gmux');
    expect((await call()).outcome).toBe('failed');
    await findProjectOnMachine({ machineId: 'studio', localPath: '/Users/gdc/gmux' });
    expect(asked.filter((one) => one.script === 'repo-find')).toHaveLength(2);
  });

  it('forgets nothing when the copy was refused before it was sent', async () => {
    // A refusal sends nothing, so nothing over there moved and the held answer
    // is still true. Dropping it would cost a walk for no reason.
    answers['repo-find'] = 'none';
    await findProjectOnMachine({ machineId: 'studio', localPath: '/Users/gdc/gmux' });
    expect((await call({ path: 'gmux' })).outcome).toBe('refused');
    await findProjectOnMachine({ machineId: 'studio', localPath: '/Users/gdc/gmux' });
    expect(asked.filter((one) => one.script === 'repo-find')).toHaveLength(1);
  });
});

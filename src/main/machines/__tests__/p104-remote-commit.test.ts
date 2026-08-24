/**
 * Phase 104 — committing what is staged in one repository on another machine.
 *
 * The pure halves are tested exhaustively, because they are what decides
 * whether the command ever leaves this Mac and what a person reads afterwards.
 *
 * ONE TABLE HERE IS NOT A UNIT TEST OF ONE FUNCTION. `stagedPathsOf` in
 * `../remote-commit.ts` and `groupRemoteFiles` in
 * `src/renderer/scm/groups.ts` read the same two characters in two processes,
 * and main cannot import the renderer module in production source. The table
 * over XY pairs asserts the two answers are equal, which is the only thing that
 * keeps main's guard and the panel's Staged group one rule. A test may cross
 * that boundary and `src/renderer/state/__tests__` already does.
 *
 * The live half spawns nothing. The write door, the review read, the confirm
 * gate, the machine registry and the far side are all replaced, so what these
 * tests hold is the ORDER of the checks and what is sent when each one fails,
 * which in every case is nothing. The send counter is read after every refusal
 * so that "nothing was sent" is measured rather than assumed.
 *
 * WHAT THIS FILE CANNOT SHOW. It cannot show a real commit landing on a real
 * machine, what a hook that refuses actually prints, whether the 300,000 ms
 * deadline is in force over a real link, or whether a multi line message
 * carrying a quote and a backtick survives the carriage. That is
 * `node build/probe-p104-commit.mjs`, which runs against a real sign in server
 * on 127.0.0.1 and reads the far side with git itself.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MachineCommitInput, MachineReviewFile } from '@shared/ipc';
import { groupRemoteFiles } from '../../../renderer/scm/groups';

// ---------------------------------------------------------------------------
// The world this module lives in, replaced
// ---------------------------------------------------------------------------

/** Every script the door was asked to run, in order. */
let ran: Array<{ id: string; args: string[]; timeoutMs: number | undefined }> =
  [];
/** What the far side answers, per call, taken in order. */
let answers: string[] = [];
/** Every call the confirm gate was asked to make, in order. */
let gated: string[] = [];
/** The row the store holds, or null for a machine that is not in the file. */
let row: Record<string, unknown> | null = null;
/** Whether the link reads as connected. */
let connected = true;
/** What the review read answers. */
let listing: {
  repoPath: string;
  headSha: string;
  files: MachineReviewFile[];
} = { repoPath: '', headSha: '', files: [] };
/** How many review reads happened. */
let reads = 0;

vi.mock('../remote-run', () => ({
  machineIsConnected: (): boolean => connected,
  runRemoteWrite: async (
    _ctx: unknown,
    id: string,
    args: readonly string[],
    options: { timeoutMs?: number } = {}
  ): Promise<{ payload: string; generation: number; bytes: number }> => {
    ran.push({ id, args: [...args], timeoutMs: options.timeoutMs });
    const payload = answers.shift() ?? 'committed none abc1234';
    if (payload === '__throw__') {
      throw new Error('Command failed: /usr/bin/ssh');
    }
    return { payload, generation: 3, bytes: payload.length };
  }
}));

vi.mock('../remote-review', () => ({
  reviewFilesOn: async (): Promise<unknown> => {
    reads += 1;
    return {
      machineId: 'studio',
      machineLabel: 'studio',
      repoPath: listing.repoPath,
      headSha: listing.headSha,
      files: listing.files,
      total: listing.files.length,
      untracked: [],
      untrackedTotal: 0,
      note: null
    };
  }
}));

vi.mock('../ready-context', () => ({
  readyRemoteContext: (machineId: string) => ({ kind: 'remote', machineId })
}));

vi.mock('../confirm', () => ({
  assertMachineMayConnect: (id: string): void => {
    gated.push(id);
  }
}));

vi.mock('../store', () => ({
  machineRow: () => row,
  machineLabelOf: () => 'Mac Pro',
  machineFieldsOf: (one: Record<string, unknown>) => ({
    host: one['host'] ?? '',
    user: null,
    port: null,
    remoteTmuxPath: null,
    acceptedTmuxVersion: null,
    writeRoot: one['writeRoot'] ?? null
  })
}));

const {
  REMOTE_COMMIT_ANSWER_MAX_BYTES,
  REMOTE_COMMIT_TIMEOUT_MS,
  commitOnMachine,
  holdsConflict,
  identityUnset,
  parseCommitAnswer,
  remoteCommitSendCount,
  resetRemoteCommitSendCountForTests,
  stagedPathsOf
} = await import('../remote-commit');

const ROOT = '/Users/gdc/code';
const REPO = '/Users/gdc/code/api';
const HEAD = '2b9e5f1aa0c1de3f4b5a6c7d8e9f0a1b2c3d4e5f';

/** One row in the shape the review read reports. */
function file(
  path: string,
  index: string,
  worktree: string
): MachineReviewFile {
  return {
    path,
    origPath: null,
    status: 'M',
    indexState: index as MachineReviewFile['indexState'],
    worktreeState: worktree as MachineReviewFile['worktreeState']
  };
}

beforeEach(() => {
  ran = [];
  answers = [];
  gated = [];
  reads = 0;
  connected = true;
  row = { id: 'studio', host: 'studio.example', writeRoot: ROOT };
  listing = {
    repoPath: REPO,
    headSha: HEAD,
    files: [file('src/a.ts', 'M', '.'), file('src/b.ts', '.', 'M')]
  };
  resetRemoteCommitSendCountForTests();
});

/** The input every good call sends. */
function good(over: Partial<MachineCommitInput> = {}): MachineCommitInput {
  return {
    machineId: 'studio',
    cwd: REPO,
    headSha: HEAD,
    staged: ['src/a.ts'],
    message: 'a message',
    ...over
  };
}

// ---------------------------------------------------------------------------
// parseCommitAnswer
// ---------------------------------------------------------------------------

describe('parseCommitAnswer', () => {
  it('reads the three fields of a commit that landed', () => {
    expect(parseCommitAnswer('committed none abc1234')).toEqual({
      word: 'committed',
      said: null,
      headSha: 'abc1234'
    });
  });

  it('reads a moved answer and carries the sha that machine holds', () => {
    expect(parseCommitAnswer('moved none 7d1c40a')).toEqual({
      word: 'moved',
      said: null,
      headSha: '7d1c40a'
    });
  });

  it('decodes what that machine printed on a failure', () => {
    const blob = Buffer.from('pre-commit refused\n', 'utf8').toString('base64');
    expect(parseCommitAnswer(`failed ${blob} ${HEAD}`)).toEqual({
      word: 'failed',
      said: 'pre-commit refused',
      headSha: HEAD
    });
  });

  it('reads none as no commit at all rather than as a sha', () => {
    expect(parseCommitAnswer('moved none none')?.headSha).toBe('');
  });

  it('refuses any field count other than three', () => {
    // This is parseIndexWriteAnswer's rule reused. Reading one field out of an
    // answer with a different shape would be a guess.
    expect(parseCommitAnswer('committed none')).toBeNull();
    expect(parseCommitAnswer('committed none abc1234 extra')).toBeNull();
    expect(parseCommitAnswer('')).toBeNull();
  });

  it('refuses a word that is not one of the three', () => {
    expect(parseCommitAnswer('done none abc1234')).toBeNull();
    expect(parseCommitAnswer('cloned none abc1234')).toBeNull();
  });

  it('refuses a blob holding a character base64 does not use', () => {
    // Buffer.from drops such a character and hands back plausible nonsense, and
    // a person cannot tell nonsense from what a hook said.
    expect(parseCommitAnswer('failed not!base64 abc1234')).toBeNull();
  });

  it('refuses a sha that is not hexadecimal', () => {
    expect(parseCommitAnswer('committed none ../../etc/passwd')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// stagedPathsOf, and the one rule it must not drift from
// ---------------------------------------------------------------------------

describe('stagedPathsOf', () => {
  it('agrees with groupRemoteFiles over a table of XY pairs', () => {
    // TWELVE PAIRS, INCLUDING EVERY SHAPE THAT DECIDES A GROUP. `MD`, `AA`,
    // `DD` and `UU` are the conflict shapes, `.M` and `M.` are the ordinary
    // ones, and `??` and `!!` are rows that reached the wrong array.
    const rows: MachineReviewFile[] = [
      file('m-index.ts', 'M', '.'),
      file('m-worktree.ts', '.', 'M'),
      file('m-both.ts', 'M', 'M'),
      file('renamed.ts', 'R', '.'),
      file('added.ts', 'A', '.'),
      file('deleted.ts', 'D', '.'),
      file('md.ts', 'M', 'D'),
      file('conflict-aa.ts', 'A', 'A'),
      file('conflict-dd.ts', 'D', 'D'),
      file('conflict-uu.ts', 'U', 'U'),
      file('untracked.ts', '?', '?'),
      file('ignored.ts', '!', '!')
    ];
    expect(stagedPathsOf(rows)).toEqual(
      groupRemoteFiles(rows)
        .staged.map((one) => one.path)
        .sort()
    );
  });

  it('agrees with groupRemoteFiles for an empty list', () => {
    expect(stagedPathsOf([])).toEqual(
      groupRemoteFiles([]).staged.map((one) => one.path)
    );
  });

  it('sorts, so two reads in a different order compare equal', () => {
    const one = [file('b.ts', 'M', '.'), file('a.ts', 'M', '.')];
    expect(stagedPathsOf(one)).toEqual(['a.ts', 'b.ts']);
  });

  it('keeps a conflicted row out of the staged set', () => {
    // A conflicted row goes to Changes on a remote tab and to nowhere else, and
    // a commit with one in the folder is refused before anything is sent.
    expect(stagedPathsOf([file('c.ts', 'U', 'U')])).toEqual([]);
    expect(holdsConflict([file('c.ts', 'U', 'U')])).toBe(true);
    expect(holdsConflict([file('a.ts', 'M', '.')])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// identityUnset, whose phrasings were recorded from git rather than assumed
// ---------------------------------------------------------------------------

describe('identityUnset', () => {
  it('matches the two lines git actually printed', () => {
    expect(
      identityUnset('Author identity unknown\n\n*** Please tell me who you are.')
    ).toBe(true);
  });

  it('matches the auto detect and the empty ident phrasings', () => {
    expect(
      identityUnset('unable to auto-detect email address (got \'gdc@x.(none)\')')
    ).toBe(true);
    expect(identityUnset('fatal: empty ident name not allowed')).toBe(true);
  });

  it('says nothing about a hook that refused', () => {
    expect(identityUnset('pre-commit hook failed: lint found 3 problems')).toBe(
      false
    );
    expect(identityUnset(null)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// The two numbers
// ---------------------------------------------------------------------------

describe('the two constants', () => {
  it('gives a remote commit the leash a local one gets', () => {
    expect(REMOTE_COMMIT_TIMEOUT_MS).toBe(300_000);
  });

  it('caps what that machine says at the number written into the script', () => {
    expect(REMOTE_COMMIT_ANSWER_MAX_BYTES).toBe(8_192);
  });
});

// ---------------------------------------------------------------------------
// commitOnMachine, being the order of the checks
// ---------------------------------------------------------------------------

describe('commitOnMachine', () => {
  it('sends one command and reports the sha for a commit that landed', async () => {
    answers = [`committed none ${HEAD.replace('2b9e', '7d1c')}`];
    const out = await commitOnMachine(good());
    expect(out.outcome).toBe('committed');
    expect(out.sha).toBe(HEAD.replace('2b9e', '7d1c'));
    expect(out.sent).toBe(1);
    expect(ran).toHaveLength(1);
    expect(ran[0]?.id).toBe('git-commit');
    expect(ran[0]?.timeoutMs).toBe(REMOTE_COMMIT_TIMEOUT_MS);
    // The three values, being the root THAT MACHINE reported, main's own sha
    // and the person's message.
    expect(ran[0]?.args).toEqual([REPO, HEAD, 'a message']);
    expect(out.sentences.join(' ')).toContain('Mac Pro');
  });

  it('sends the word none as the guard for a repository with no commit', async () => {
    // WHAT THIS TEST CANNOT SHOW, and it is why a second one runs the shipped
    // script bytes. This test mocks the far side answer, so it proves only
    // that main sends the word `none` when its own read found no sha. It
    // cannot see that the script itself reaches the `none` path, and the first
    // build of this phase shipped a script that never did, because a bare
    // `git rev-parse HEAD` prints the word `HEAD` in that repository. The
    // script is RUN against a real repository with no commit in
    // `remote-scripts.test.ts`, under "the Phase 104 writer, run against a
    // real repository".
    listing = { ...listing, headSha: '' };
    answers = ['committed none abc1234'];
    const out = await commitOnMachine(good({ headSha: '' }));
    expect(out.outcome).toBe('committed');
    expect(ran[0]?.args[1]).toBe('none');
  });

  it('refuses a message that is empty after trimming and sends nothing', async () => {
    const out = await commitOnMachine(good({ message: '   \n  ' }));
    expect(out.outcome).toBe('refused');
    expect(out.sent).toBe(0);
    expect(remoteCommitSendCount()).toBe(0);
    expect(ran).toEqual([]);
    // Nothing was read either, so the machine was never contacted at all.
    expect(reads).toBe(0);
  });

  it('refuses a message holding a NUL and sends nothing', async () => {
    const out = await commitOnMachine(good({ message: 'one\0two' }));
    expect(out.outcome).toBe('refused');
    expect(remoteCommitSendCount()).toBe(0);
  });

  it('refuses a machine with no confirmed folder and sends nothing', async () => {
    row = { id: 'studio', host: 'studio.example', writeRoot: null };
    const out = await commitOnMachine(good());
    expect(out.outcome).toBe('refused');
    expect(out.sentences.join(' ')).toContain('Settings');
    expect(remoteCommitSendCount()).toBe(0);
    expect(reads).toBe(0);
    // The confirm gate was still asked, which is what makes the folder on the
    // row a confirmed fact rather than a value read off disk.
    expect(gated).toEqual(['studio']);
  });

  it('refuses a folder outside the confirmed folder before it reads', async () => {
    const out = await commitOnMachine(good({ cwd: '/Users/gdc/secret' }));
    expect(out.outcome).toBe('refused');
    expect(remoteCommitSendCount()).toBe(0);
    expect(reads).toBe(0);
  });

  it('answers offline when the link is not up, and reads nothing', async () => {
    connected = false;
    const out = await commitOnMachine(good());
    expect(out.outcome).toBe('offline');
    expect(reads).toBe(0);
    expect(remoteCommitSendCount()).toBe(0);
  });

  it('refuses a folder that is not a repository', async () => {
    listing = { repoPath: '', headSha: '', files: [] };
    const out = await commitOnMachine(good());
    expect(out.outcome).toBe('refused');
    expect(reads).toBe(1);
    expect(remoteCommitSendCount()).toBe(0);
  });

  it('refuses a sha the panel drew that main does not agree with', async () => {
    const out = await commitOnMachine(good({ headSha: 'something-else' }));
    expect(out.outcome).toBe('refused');
    expect(out.headSha).toBe(HEAD);
    expect(remoteCommitSendCount()).toBe(0);
  });

  it('answers staged-changed when the staged set moved after the panel drew', async () => {
    // HEAD does not move for a `git add`, so the sha guard alone would let this
    // commit content nobody read in the Changes list.
    listing = {
      ...listing,
      files: [file('src/a.ts', 'M', '.'), file('src/c.ts', 'M', '.')]
    };
    const out = await commitOnMachine(good({ staged: ['src/a.ts'] }));
    expect(out.outcome).toBe('staged-changed');
    expect(remoteCommitSendCount()).toBe(0);
  });

  it('compares the staged set without caring what order it arrived in', async () => {
    listing = {
      ...listing,
      files: [file('src/a.ts', 'M', '.'), file('src/c.ts', 'M', '.')]
    };
    answers = ['committed none abc1234'];
    const out = await commitOnMachine(good({ staged: ['src/c.ts', 'src/a.ts'] }));
    expect(out.outcome).toBe('committed');
  });

  it('refuses a folder holding a conflicted file', async () => {
    listing = {
      ...listing,
      files: [file('src/a.ts', 'M', '.'), file('src/x.ts', 'U', 'U')]
    };
    const out = await commitOnMachine(good({ staged: ['src/a.ts'] }));
    expect(out.outcome).toBe('refused');
    expect(out.sentences.join(' ')).toContain('conflicted');
    expect(remoteCommitSendCount()).toBe(0);
  });

  it('refuses an empty staged set', async () => {
    listing = { ...listing, files: [file('src/b.ts', '.', 'M')] };
    const out = await commitOnMachine(good({ staged: [] }));
    expect(out.outcome).toBe('refused');
    expect(remoteCommitSendCount()).toBe(0);
  });

  it('answers moved when that machine says its HEAD is not the sha', async () => {
    answers = ['moved none 7d1c40a'];
    const out = await commitOnMachine(good());
    expect(out.outcome).toBe('moved');
    expect(out.headSha).toBe('7d1c40a');
    expect(out.sha).toBe('');
    // ONE command crossed and it committed nothing, which is what makes a
    // second send of one request safe.
    expect(remoteCommitSendCount()).toBe(1);
  });

  it('carries what a hook printed and adds no identity sentence for it', async () => {
    const blob = Buffer.from('pre-commit: lint failed', 'utf8').toString(
      'base64'
    );
    answers = [`failed ${blob} ${HEAD}`];
    const out = await commitOnMachine(good());
    expect(out.outcome).toBe('failed');
    expect(out.machineSaid).toBe('pre-commit: lint failed');
    expect(out.sentences).toHaveLength(1);
  });

  it('adds the identity sentence when the machine words say git has none', async () => {
    const blob = Buffer.from(
      'Author identity unknown\n*** Please tell me who you are.',
      'utf8'
    ).toString('base64');
    answers = [`failed ${blob} ${HEAD}`];
    const out = await commitOnMachine(good());
    expect(out.outcome).toBe('failed');
    expect(out.sentences).toHaveLength(2);
    expect(out.sentences[1]).toContain('user.name');
  });

  it('answers unsure for an answer it cannot read', async () => {
    answers = ['who knows'];
    const out = await commitOnMachine(good());
    expect(out.outcome).toBe('unsure');
    // The word never means nothing changed, and the sentence names the read
    // that resolves it.
    expect(out.sentences.join(' ')).toContain('Check what happened');
  });

  it('answers unsure when the link dropped well inside the deadline', async () => {
    answers = ['__throw__'];
    const out = await commitOnMachine(good());
    expect(out.outcome).toBe('unsure');
    expect(remoteCommitSendCount()).toBe(1);
  });

  it('counts one send per call and never one per refusal', async () => {
    answers = ['committed none abc1234', 'committed none def5678'];
    await commitOnMachine(good());
    await commitOnMachine(good());
    await commitOnMachine(good({ message: '  ' }));
    expect(remoteCommitSendCount()).toBe(2);
  });
});

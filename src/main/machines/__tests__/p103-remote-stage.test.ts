/**
 * Phase 103 — staging and unstaging in one repository on another machine.
 *
 * The pure halves are tested exhaustively, because they are what decides
 * whether either command ever leaves this Mac. The far side script cannot bound
 * the repository by the folder the person confirmed, because it receives the
 * repository root and not that folder, so every layer of that check lives in
 * `../remote-stage.ts` and is read here.
 *
 * The live half spawns nothing. The write door, the review read, the confirm
 * gate, the machine registry and the far side are all replaced, so what these
 * tests hold is the ORDER of the checks and what is sent when each one fails,
 * which in every case is nothing. The send counter is read after every refusal
 * so that "nothing was sent" is measured rather than assumed.
 *
 * WHAT THIS FILE CANNOT SHOW. It cannot show that a machine moved a porcelain
 * pair from `.M` to `M.`, what a git with no commit at all prints, what the far
 * side's own guard does when main is bypassed, or what an interrupted link
 * leaves behind. That is `node build/probe-p103-stage.mjs`, which runs against
 * a real sign in server on 127.0.0.1 and reads the far side with git itself.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MachineReviewFile } from '@shared/ipc';
import { GmuxError } from '../../errors';

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
/** What the review read answers. */
let listing: {
  repoPath: string;
  files: MachineReviewFile[];
  untracked: MachineReviewFile[];
} = { repoPath: '', files: [], untracked: [] };
/** How many review reads happened. */
let reads = 0;

vi.mock('../remote-run', async () => {
  // The COMPOSER IS THE REAL ONE, because the chunking measures with it and a
  // fake would make the byte budget a guess.
  const real = await vi.importActual<typeof import('../remote-run')>(
    '../remote-run'
  );
  return {
    composeRemoteScriptCommand: real.composeRemoteScriptCommand,
    remoteScriptName: real.remoteScriptName,
    runRemoteRead: async (): Promise<never> => {
      throw new Error('this module never reads through the door');
    },
    runRemoteWrite: async (
      _ctx: unknown,
      id: string,
      args: readonly string[],
      options: { timeoutMs?: number } = {}
    ): Promise<{ payload: string; generation: number; bytes: number }> => {
      ran.push({ id, args: [...args], timeoutMs: options.timeoutMs });
      const payload = answers.shift() ?? '0 none';
      if (payload === '__throw__') {
        throw new Error('Command failed: /usr/bin/ssh');
      }
      return { payload, generation: 3, bytes: payload.length };
    }
  };
});

vi.mock('../remote-review', () => ({
  reviewFilesOn: async (): Promise<unknown> => {
    reads += 1;
    return {
      machineId: 'studio',
      machineLabel: 'studio',
      repoPath: listing.repoPath,
      files: listing.files,
      total: listing.files.length,
      untracked: listing.untracked,
      untrackedTotal: listing.untracked.length,
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
  REMOTE_STAGE_BUDGET_BYTES,
  REMOTE_STAGE_TIMEOUT_MS,
  chunkIndexPaths,
  parseIndexWriteAnswer,
  remoteStageSendCount,
  reportedPaths,
  resetRemoteStageSendCountForTests,
  rootHolds,
  stageOnMachine,
  unstageOnMachine
} = await import('../remote-stage');

const {
  STAGE_NAME_HOLDS_LINE_BREAK,
  STAGE_PATH_NOT_REPORTED,
  STAGE_PATH_TOO_LONG
} = await import('../remote-copy');

const ROOT = '/Users/gdc/code';
const REPO = '/Users/gdc/code/api';

/** One row in the shape the review read reports. */
function file(
  path: string,
  index: string,
  worktree: string,
  origPath: string | null = null
): MachineReviewFile {
  return {
    path,
    origPath,
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
  row = { id: 'studio', host: 'studio.example', writeRoot: ROOT };
  listing = {
    repoPath: REPO,
    files: [file('src/a.ts', '.', 'M'), file('src/b.ts', 'M', '.')],
    untracked: [file('new.ts', '?', '?')]
  };
  resetRemoteStageSendCountForTests();
});

// ---------------------------------------------------------------------------
// rootHolds, which is layer 2
// ---------------------------------------------------------------------------

describe('rootHolds', () => {
  it('answers true for the root itself, which relativeUnderRoot cannot', () => {
    // This is the whole reason it exists rather than reusing that function. The
    // common case is a confirmed folder that IS the repository root, and
    // `relativeUnderRoot` answers null for an empty relative part.
    expect(rootHolds('/Users/gdc/code', '/Users/gdc/code')).toBe(true);
  });

  it('answers true for a folder under it and resolves both sides', () => {
    expect(rootHolds('/Users/gdc/code', '/Users/gdc/code/api')).toBe(true);
    expect(rootHolds('/Users/gdc/code', '/Users/gdc/./code/api')).toBe(true);
    expect(rootHolds('/Users/gdc/./code', '/Users/gdc/code/api/deep')).toBe(true);
  });

  it('makes the separator part of the comparison', () => {
    // Without it a root of /Users/gdc would contain /Users/gdcx.
    expect(rootHolds('/Users/gdc', '/Users/gdcx')).toBe(false);
    expect(rootHolds('/Users/gdc/code', '/Users/gdc/codex/api')).toBe(false);
  });

  it('answers false for a path above it and for a relative side', () => {
    expect(rootHolds('/Users/gdc/code', '/Users/gdc')).toBe(false);
    expect(rootHolds('/Users/gdc/code', '/etc')).toBe(false);
    expect(rootHolds('code', '/Users/gdc/code')).toBe(false);
    expect(rootHolds('/Users/gdc/code', 'api')).toBe(false);
    expect(rootHolds('', '/Users/gdc/code')).toBe(false);
    expect(rootHolds('/Users/gdc/code', '')).toBe(false);
  });

  it('answers false for one folder written two ways, which is why it is not given a resolved path', () => {
    // THE DEFECT THIS PINS. `/tmp` is a link to `/private/tmp` on this Mac, and
    // git prints the resolved form. A confirmed folder of `/tmp/p103` against a
    // repository root of `/private/tmp/p103/far` is one folder and two strings,
    // and comparing them refused every stage and every unstage. The fix is that
    // no resolved path reaches this function, not that this function learns to
    // follow a link, which it cannot do for another computer.
    expect(rootHolds('/tmp/p103', '/private/tmp/p103/far')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// The answer parser
// ---------------------------------------------------------------------------

describe('parseIndexWriteAnswer', () => {
  it('reads a status of 0 with no word', () => {
    expect(parseIndexWriteAnswer('0 none')).toEqual({ ok: true, said: null });
  });

  it('decodes what git printed on a status of 1', () => {
    const said = "fatal: pathspec ':(literal)nope.txt' did not match any files";
    const word = Buffer.from(said, 'utf8').toString('base64');
    expect(parseIndexWriteAnswer(`1 ${word}`)).toEqual({ ok: false, said });
  });

  it('refuses an answer that is not two fields', () => {
    // The catalogue's rule. A shorter answer is a machine that printed
    // something else, and reading one field out of it would be a guess.
    expect(parseIndexWriteAnswer('0')).toBeNull();
    expect(parseIndexWriteAnswer('0 none extra')).toBeNull();
    expect(parseIndexWriteAnswer('')).toBeNull();
  });

  it('refuses a status that is not 0 or 1', () => {
    expect(parseIndexWriteAnswer('2 none')).toBeNull();
    expect(parseIndexWriteAnswer('ok none')).toBeNull();
  });

  it('refuses a word holding a character base64 does not use', () => {
    // `Buffer.from` drops such a character and hands back plausible nonsense,
    // and prose about somebody's repository cannot be nonsense.
    expect(parseIndexWriteAnswer('1 not base64!')).toBeNull();
    expect(parseIndexWriteAnswer('1 %%%%')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The reported set and the chunking
// ---------------------------------------------------------------------------

describe('reportedPaths', () => {
  it('holds both ends of a rename and both groups', () => {
    const set = reportedPaths(
      [file('src/new.ts', 'R', '.', 'src/old.ts')],
      [file('made.ts', '?', '?')]
    );
    expect([...set].sort()).toEqual(['made.ts', 'src/new.ts', 'src/old.ts']);
  });
});

describe('chunkIndexPaths', () => {
  it('puts a short list in one chunk', () => {
    expect(chunkIndexPaths('stage', REPO, ['a.ts', 'b.ts'])).toEqual([
      ['a.ts', 'b.ts']
    ]);
  });

  it('measures rather than counts, so 100 paths are still one command', () => {
    // The counted alternative would split at a number, and a number is not a
    // bound on bytes. One `git add` per call is the whole cost claim.
    const many = Array.from({ length: 100 }, (_, at) => `src/file-${String(at)}.ts`);
    expect(chunkIndexPaths('stage', REPO, many)).toHaveLength(1);
  });

  it('starts a second chunk when the composed command would pass the budget', () => {
    const long = 'x'.repeat(4_000);
    const many = Array.from({ length: 60 }, (_, at) => `${long}-${String(at)}.ts`);
    const chunks = chunkIndexPaths('stage', REPO, many);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.flat()).toEqual(many);
  });

  it('refuses one path that alone passes the budget, by name', () => {
    // No smaller chunk can fix it, and the door would otherwise refuse the
    // whole call with a programming error rather than a sentence.
    let thrown: unknown = null;
    try {
      chunkIndexPaths('stage', REPO, ['y'.repeat(REMOTE_STAGE_BUDGET_BYTES)]);
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(GmuxError);
    expect((thrown as GmuxError).payload.message).toBe(STAGE_PATH_TOO_LONG);
  });
});

// ---------------------------------------------------------------------------
// The order of the checks, and what is sent when each one fails
// ---------------------------------------------------------------------------

describe('what leaves this Mac', () => {
  it('answers nothingToDo for an empty list, and asks the gate nothing', () => {
    return stageOnMachine({ machineId: 'studio', cwd: REPO, paths: [] }).then(
      (out) => {
        expect(out.outcome).toBe('nothingToDo');
        expect(gated).toEqual([]);
        expect(reads).toBe(0);
        expect(remoteStageSendCount()).toBe(0);
      }
    );
  });

  it('answers writesOff for a machine with no confirmed folder', async () => {
    row = { id: 'studio', host: 'studio.example' };
    const out = await stageOnMachine({
      machineId: 'studio',
      cwd: REPO,
      paths: ['src/a.ts']
    });
    expect(out.outcome).toBe('writesOff');
    expect(out.writeRoot).toBeNull();
    // The gate still ran, because the folder is read out of the row at call
    // time and the agreement is what makes that value a confirmed fact.
    expect(gated).toEqual(['studio']);
    expect(reads).toBe(0);
    expect(remoteStageSendCount()).toBe(0);
  });

  it('refuses a name holding a line break BEFORE it reads anything', async () => {
    // The list travels as one value split on a newline, so such a name would
    // arrive as two paths and stage a file nobody named.
    let thrown: unknown = null;
    try {
      await stageOnMachine({
        machineId: 'studio',
        cwd: REPO,
        paths: ['src/a.ts', 'two\nlines.ts']
      });
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(GmuxError);
    expect((thrown as GmuxError).payload.message).toBe(
      STAGE_NAME_HOLDS_LINE_BREAK
    );
    expect(reads).toBe(0);
    expect(remoteStageSendCount()).toBe(0);
  });

  it('answers notRepo when that machine reports no repository root', async () => {
    listing = { repoPath: '', files: [], untracked: [] };
    const out = await stageOnMachine({
      machineId: 'studio',
      // Under the confirmed folder, so layer 2 passes and the read happens.
      cwd: `${ROOT}/elsewhere`,
      paths: ['src/a.ts']
    });
    expect(out.outcome).toBe('notRepo');
    expect(reads).toBe(1);
    expect(remoteStageSendCount()).toBe(0);
  });

  it('answers outsideRoot for a tab folder outside the confirmed folder, and contacts nothing', async () => {
    // This is the layer the far side cannot make, because parameter 1 is the
    // repository root and not the confirmed folder. It is decided before the
    // read, so this answer costs that machine nothing at all.
    const out = await stageOnMachine({
      machineId: 'studio',
      cwd: '/Users/gdc/other/api',
      paths: ['src/a.ts']
    });
    expect(out.outcome).toBe('outsideRoot');
    expect(out.writeRoot).toBe(ROOT);
    expect(reads).toBe(0);
    expect(remoteStageSendCount()).toBe(0);
  });

  it('stages when the confirmed folder and the tab folder differ only by a link the far side resolved', async () => {
    // THE DEFECT THIS PINS, at the level of the verb rather than the helper.
    // The confirmed folder and the tab's folder are both as the person gave
    // them. The repository root is what that machine's git printed, with the
    // link followed, and it is NOT compared with either of them.
    row = { id: 'studio', host: 'studio.example', writeRoot: '/tmp/p103' };
    listing = {
      repoPath: '/private/tmp/p103/far',
      files: [file('src/a.ts', '.', 'M')],
      untracked: []
    };
    answers = ['0 none'];
    const out = await stageOnMachine({
      machineId: 'studio',
      cwd: '/tmp/p103/far',
      paths: ['src/a.ts']
    });
    expect(out.outcome).toBe('done');
    expect(out.repoPath).toBe('/private/tmp/p103/far');
    expect(remoteStageSendCount()).toBe(1);
    expect(ran[0]?.args?.[0]).toBe('/private/tmp/p103/far');
  });

  it('refuses a path the fresh read did not report, and sends nothing', async () => {
    let thrown: unknown = null;
    try {
      await stageOnMachine({
        machineId: 'studio',
        cwd: REPO,
        paths: ['src/a.ts', '../above.txt']
      });
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(GmuxError);
    expect((thrown as GmuxError).payload.message).toBe(STAGE_PATH_NOT_REPORTED);
    expect(remoteStageSendCount()).toBe(0);
  });

  it('takes the repository root from that machine and never from the caller', async () => {
    answers = ['0 none'];
    await stageOnMachine({
      machineId: 'studio',
      cwd: '/Users/gdc/code/api/src',
      paths: ['src/a.ts']
    });
    expect(ran).toHaveLength(1);
    expect(ran[0]?.id).toBe('git-stage');
    expect(ran[0]?.args[0]).toBe(REPO);
    expect(ran[0]?.timeoutMs).toBe(REMOTE_STAGE_TIMEOUT_MS);
  });

  it('sends a rename with BOTH of its paths', async () => {
    // `git status` reports the new path for a git detected rename and staging
    // it needs the old one too.
    listing = {
      repoPath: REPO,
      files: [file('src/new.ts', 'R', '.', 'src/old.ts')],
      untracked: []
    };
    answers = ['0 none'];
    const out = await stageOnMachine({
      machineId: 'studio',
      cwd: REPO,
      paths: ['src/new.ts']
    });
    expect(ran[0]?.args[1]?.split('\n')).toEqual(['src/new.ts', 'src/old.ts']);
    expect(out.paths).toBe(2);
    expect(out.outcome).toBe('done');
  });

  it('sends the list one path per line, and each path once', async () => {
    answers = ['0 none'];
    await stageOnMachine({
      machineId: 'studio',
      cwd: REPO,
      paths: ['src/a.ts', 'src/a.ts', 'new.ts']
    });
    expect(ran[0]?.args[1]).toBe('src/a.ts\nnew.ts');
  });

  it('runs git-unstage for the other verb and changes nothing else', async () => {
    answers = ['0 none'];
    await unstageOnMachine({
      machineId: 'studio',
      cwd: REPO,
      paths: ['src/b.ts']
    });
    expect(ran[0]?.id).toBe('git-unstage');
    expect(ran[0]?.args[0]).toBe(REPO);
  });
});

// ---------------------------------------------------------------------------
// What each answer means
// ---------------------------------------------------------------------------

describe('what the machine said', () => {
  it('answers done when every command exited 0', async () => {
    answers = ['0 none'];
    const out = await stageOnMachine({
      machineId: 'studio',
      cwd: REPO,
      paths: ['src/a.ts']
    });
    expect(out.outcome).toBe('done');
    expect(out.chunks).toBe(1);
    expect(out.machineSaid).toBeNull();
  });

  it('answers partial and keeps the FIRST thing git said', async () => {
    // git reports one status for a whole list, so Tortie cannot say which
    // files landed. The sentence a person reads names no count for that
    // reason, and the re-read afterwards is what tells them the truth.
    const first = Buffer.from('fatal: one', 'utf8').toString('base64');
    const second = Buffer.from('fatal: two', 'utf8').toString('base64');
    const long = 'x'.repeat(4_000);
    const many = Array.from({ length: 60 }, (_, at) => `${long}-${String(at)}.ts`);
    listing = {
      repoPath: REPO,
      files: many.map((path) => file(path, '.', 'M')),
      untracked: []
    };
    answers = [`1 ${first}`, `1 ${second}`];
    const out = await stageOnMachine({
      machineId: 'studio',
      cwd: REPO,
      paths: many
    });
    expect(out.outcome).toBe('partial');
    expect(out.machineSaid).toBe('fatal: one');
    // IT STOPS AT THE FIRST CHUNK GIT REFUSED. The sentence a person reads for
    // this word says Tortie stopped, so main has to stop. The first build sent
    // every remaining chunk after the failure and the sentence was false.
    expect(ran.length).toBe(1);
    expect(out.chunks).toBe(1);
  });

  it('answers unsure when the door threw, and never says nothing changed', async () => {
    // Phase 101 measured a killed ssh completing the far side write. This verb
    // always re-reads afterwards, so the honest shape is a word the panel can
    // draw beside fresh rows rather than an error that replaces them.
    answers = ['__throw__'];
    const out = await stageOnMachine({
      machineId: 'studio',
      cwd: REPO,
      paths: ['src/a.ts']
    });
    expect(out.outcome).toBe('unsure');
    expect(out.chunks).toBe(0);
    expect(remoteStageSendCount()).toBe(1);
  });

  it('answers unsure for a payload the parser does not know', async () => {
    answers = ['what'];
    const out = await stageOnMachine({
      machineId: 'studio',
      cwd: REPO,
      paths: ['src/a.ts']
    });
    expect(out.outcome).toBe('unsure');
  });

  it('stops at the first chunk it could not read', async () => {
    const long = 'x'.repeat(4_000);
    const many = Array.from({ length: 60 }, (_, at) => `${long}-${String(at)}.ts`);
    listing = {
      repoPath: REPO,
      files: many.map((path) => file(path, '.', 'M')),
      untracked: []
    };
    const wanted = chunkIndexPaths('stage', REPO, many).length;
    expect(wanted).toBeGreaterThan(1);
    answers = ['__throw__'];
    await stageOnMachine({ machineId: 'studio', cwd: REPO, paths: many });
    expect(ran).toHaveLength(1);
  });
});

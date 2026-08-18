/**
 * The read only review of a folder on another machine (Phase 73, M6, item 4).
 *
 * NOTHING HERE OPENS A CONNECTION. The one door in `../remote-run.ts` is
 * replaced by a function that records the script id and the values it was
 * handed, and answers with text a machine would have printed. That is the point
 * rather than a convenience: every property below is about what Tortie ASKS FOR
 * and what it does with the answer, and a test that let a command through to
 * find out would be the thing it is testing for.
 *
 * The read only claim itself is MEASURED rather than asserted, and not here.
 * `build/probe-remote-review.mjs` compares `git status --porcelain` byte for
 * byte before and after a review on a real repository, and compares the size
 * and modification time of every file under `.git`.
 */

import { describe, expect, it, beforeEach, vi } from 'vitest';
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
  socket: 'gmux-p73-unit',
  controlPath: '/tmp/tortie-501/m-0123456789ab',
  hostKeys: { tortie: '/t/known-machines', user: '/u/known_hosts' }
};

/** Every read the door was asked for, in order. */
let asked: { script: string; args: string[] }[] = [];
/**
 * What each script answers with, keyed by its id.
 *
 * A function is called at the moment the read is made, so one test can answer
 * differently for two reads of the same script, which is what a rename needs.
 */
let answers: Record<string, string | Error | (() => string)> = {};

vi.mock('../remote-run', () => ({
  runRemoteRead: (
    _ctx: unknown,
    script: string,
    args: readonly string[]
  ): Promise<{ payload: string; generation: number }> => {
    asked.push({ script, args: [...args] });
    const answer = answers[script];
    if (answer instanceof Error) return Promise.reject(answer);
    if (typeof answer === 'function') {
      return Promise.resolve({ payload: answer(), generation: 3 });
    }
    return Promise.resolve({ payload: answer ?? '', generation: 3 });
  }
}));

vi.mock('../remote-sessions', () => ({
  readyRemoteContext: (): RemoteMachineContext => CTX
}));

vi.mock('../store', () => ({
  machineRow: (id: string) => ({ id, host: '127.0.0.1' }),
  machineLabelOf: () => 'Studio'
}));

const {
  REMOTE_REVIEW_MAX_BYTES,
  REMOTE_REVIEW_MAX_FILES,
  REVIEW_ANSWER_UNREADABLE,
  parseRemoteReviewListing,
  parseRemoteReviewPair,
  reviewFileOn,
  reviewFilesOn
} = await import('../remote-review');

const { REVIEW_NOTHING_CHANGED, REVIEW_NOT_A_REPOSITORY } = await import(
  '../remote-copy'
);

/** One porcelain v2 tracked record. */
function tracked(xy: string, path: string): string {
  return `1 ${xy} N... 100644 100644 100644 1111111 2222222 ${path}`;
}

/** One porcelain v2 rename record, with its old path as the next token. */
function renamed(xy: string, path: string, orig: string): string {
  return `2 ${xy} N... 100644 100644 100644 1111111 2222222 R100 ${path}\0${orig}`;
}

const b64 = (text: string): string =>
  text.length === 0 ? 'none' : Buffer.from(text, 'utf8').toString('base64');

/**
 * The whole `review-list` answer, in the shape the catalogue prints: two base64
 * words separated by one space, with `none` for a side that is not there.
 */
function listing(root: string, records: readonly string[]): string {
  const body =
    records.length === 0
      ? '# branch.oid abc123\0# branch.head main\0'
      : `# branch.oid abc123\0# branch.head main\0${records.join('\0')}\0`;
  return `${b64(root)} ${b64(body)}`;
}

/** The whole `review-file` answer, in the same shape. */
function sides(head: string, work: string): string {
  return `${b64(head)} ${b64(work)}`;
}

beforeEach(() => {
  asked = [];
  answers = {};
});

describe('reading the listing', () => {
  it('takes the repository root from the first line', () => {
    const parsed = parseRemoteReviewListing(
      listing('/home/greg/work/api', [tracked('.M', 'src/a.ts')])
    );
    expect(parsed?.repoPath).toBe('/home/greg/work/api');
  });

  it('answers null for a folder that is not inside a repository', () => {
    // The script prints nothing usable, and no answer is a refusal rather than
    // a guess. That is `../remote-path.ts`'s own rule, reused.
    expect(parseRemoteReviewListing('none none')).toBeNull();
    expect(parseRemoteReviewListing('')).toBeNull();
    // A root that is not an absolute path is not a repository root.
    expect(parseRemoteReviewListing(`${b64('nope')} none`)).toBeNull();
  });

  it('carries the worktree letter, and the staged one when the worktree is clean', () => {
    const parsed = parseRemoteReviewListing(
      listing('/r', [tracked('.M', 'worktree.ts'), tracked('A.', 'staged.ts')])
    );
    expect(parsed?.files).toEqual([
      { path: 'worktree.ts', origPath: null, status: 'M' },
      { path: 'staged.ts', origPath: null, status: 'A' }
    ]);
  });

  it('keeps a rename with both of its paths', () => {
    // Without the old path the left side has no blob and the file renders as
    // one whole addition. That is the Phase 11 carried finding (a), and this
    // is the line that stops it happening again over a wire.
    const parsed = parseRemoteReviewListing(
      listing('/r', [renamed('R.', 'src/new.ts', 'src/old.ts')])
    );
    expect(parsed?.files).toEqual([
      { path: 'src/new.ts', origPath: 'src/old.ts', status: 'R' }
    ]);
  });

  it('leaves untracked and ignored files out', () => {
    // A review is about what changed against the last commit. A file git has
    // never seen has no other side to show.
    const parsed = parseRemoteReviewListing(
      listing('/r', [tracked('.M', 'a.ts'), '? new.ts', '! build/out.js'])
    );
    expect(parsed?.files.map((one) => one.path)).toEqual(['a.ts']);
  });

  it('refuses an answer that is not porcelain v2, and says so', () => {
    // The one contract this module has with the script catalogue. A mismatch
    // that produced an empty list would read as "nothing has changed", which
    // is a false statement about somebody's work.
    let thrown: unknown = null;
    try {
      parseRemoteReviewListing(`${b64('/r')} ${b64(' M src/a.ts\n?? new.ts\n')}`);
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(GmuxError);
    expect((thrown as GmuxError).payload.message).toBe(REVIEW_ANSWER_UNREADABLE);
  });
});

describe('reading one file', () => {
  it('decodes both sides', () => {
    const pair = parseRemoteReviewPair(sides('old\n', 'new\n'));
    expect(pair.oldContents).toBe('old\n');
    expect(pair.newContents).toBe('new\n');
    expect(pair.binary).toBe(false);
    expect(pair.truncated).toBe(false);
  });

  it('reads an absent committed copy as an empty left side, not as the right one', () => {
    // A file that is not in the last commit answers with the word `none` on
    // the left. Reading that as the working copy would draw a new file as an
    // unchanged one.
    const pair = parseRemoteReviewPair(sides('', 'brand new\n'));
    expect(pair.oldContents).toBe('');
    expect(pair.newContents).toBe('brand new\n');
  });

  it('reads an absent working copy as an empty right side', () => {
    const pair = parseRemoteReviewPair(sides('was here\n', ''));
    expect(pair.oldContents).toBe('was here\n');
    expect(pair.newContents).toBe('');
  });

  it('calls a side with a zero byte binary and shows neither side', () => {
    const pair = parseRemoteReviewPair(
      `${Buffer.from([0x89, 0x50, 0x00, 0x01]).toString('base64')} none`
    );
    expect(pair.binary).toBe(true);
    expect(pair.oldContents).toBe('');
    expect(pair.newContents).toBe('');
  });

  it('says when a side was cut at the cap', () => {
    const big = 'x'.repeat(64);
    const pair = parseRemoteReviewPair(sides(big, big), 64);
    expect(pair.truncated).toBe(true);
    expect(pair.note).not.toBeNull();
  });

  it('refuses a side that is not base64 rather than decoding nonsense', () => {
    // `Buffer.from` drops a character it does not recognise and hands back
    // something plausible. A person reading a diff cannot tell that from a
    // file, so it is refused instead.
    expect(() => parseRemoteReviewPair('not-base64!! none')).toThrow();
  });
});

describe('the two answers', () => {
  it('asks for the folder ON THAT MACHINE and nothing else', async () => {
    answers['review-list'] = listing('/home/greg/api', [tracked('.M', 'a.ts')]);
    const list = await reviewFilesOn({
      machineId: 'studio',
      cwd: '/home/greg/api/service'
    });
    expect(asked).toEqual([
      { script: 'review-list', args: ['/home/greg/api/service'] }
    ]);
    expect(list.machineLabel).toBe('Studio');
    expect(list.repoPath).toBe('/home/greg/api');
    expect(list.note).toBeNull();
  });

  it('says so when nothing has changed', async () => {
    answers['review-list'] = listing('/home/greg/api', []);
    const list = await reviewFilesOn({ machineId: 'studio', cwd: '/home/greg/api' });
    expect(list.files).toEqual([]);
    expect(list.note).toBe(REVIEW_NOTHING_CHANGED);
  });

  it('says so when the folder is not inside a repository', async () => {
    answers['review-list'] = 'none none';
    const list = await reviewFilesOn({ machineId: 'studio', cwd: '/tmp' });
    expect(list.repoPath).toBe('');
    expect(list.note).toBe(REVIEW_NOT_A_REPOSITORY);
  });

  it('lists the first files and counts the rest', async () => {
    const many = Array.from({ length: REMOTE_REVIEW_MAX_FILES + 4 }, (_one, at) =>
      tracked('.M', `src/file-${String(at)}.ts`)
    );
    answers['review-list'] = listing('/r', many);
    const list = await reviewFilesOn({ machineId: 'studio', cwd: '/r' });
    expect(list.files).toHaveLength(REMOTE_REVIEW_MAX_FILES);
    expect(list.total).toBe(REMOTE_REVIEW_MAX_FILES + 4);
    expect(list.note).toContain(String(REMOTE_REVIEW_MAX_FILES + 4));
  });

  it('reads one file at its own path, with the cap as a value', async () => {
    answers['review-file'] = sides('a\n', 'b\n');
    const pair = await reviewFileOn({
      machineId: 'studio',
      repoPath: '/r',
      path: 'src/a.ts',
      origPath: null
    });
    expect(asked).toEqual([
      {
        script: 'review-file',
        args: ['/r', 'src/a.ts', String(REMOTE_REVIEW_MAX_BYTES)]
      }
    ]);
    expect(pair.oldContents).toBe('a\n');
    expect(pair.newContents).toBe('b\n');
  });

  it('reads a rename at BOTH paths, and takes one side from each', async () => {
    // The script answers about one path. After a rename the HEAD copy lives at
    // the old path and the working copy at the new one, so asking once would
    // answer with one empty side and draw the file as a whole addition.
    let call = 0;
    // The module asks about the NEW path first and the old one second.
    const scripted = [sides('', 'the new one\n'), sides('the old one\n', '')];
    answers['review-file'] = (): string => scripted[call++] ?? '';
    const pair = await reviewFileOn({
      machineId: 'studio',
      repoPath: '/r',
      path: 'src/new.ts',
      origPath: 'src/old.ts'
    });
    expect(asked.map((one) => one.args[1])).toEqual(['src/new.ts', 'src/old.ts']);
    expect(pair.oldContents).toBe('the old one\n');
    expect(pair.newContents).toBe('the new one\n');
  });
});

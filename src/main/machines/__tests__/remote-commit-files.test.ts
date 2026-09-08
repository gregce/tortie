/**
 * What ONE commit changed in one folder on another machine (Phase 233).
 *
 * NOTHING HERE OPENS A CONNECTION. The one door in `../remote-run.ts` is
 * replaced by a function that records the script id and the values it was
 * handed, and answers with text a machine would have printed. What these tests
 * hold is the SHAPE: which script is asked for, what the four values are, that
 * a rename is two reads, that the refusals send nothing at all, and that the
 * parser reads the three name-status shapes git can print for one commit,
 * being a rename whose paths hold `*` and `[`, a copy, and a delete.
 *
 * THE PARSER IS THE LOCAL ONE. `parseNameStatusZ` is what the local History
 * row reads through, so the fixtures below are written as the bytes
 * `git show -z --name-status -M --format=` prints, NUL separated with no
 * leading newline, which is the shape a single `git show` has and a `git log`
 * walk does not (see `readNameStatusChunk` in `../../git/parse.ts`).
 *
 * EACH CASE GOES RED ON ABLATION. Drop the rename pairing and the first case
 * reads the old path as a file called `R100`; drop the copy letter and the
 * second case answers `X`; drop the size words and the pair answers null.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { REMOTE_FILE_MAX_BYTES } from '@shared/ipc';
import { GmuxError } from '../../errors';
import type { RemoteMachineContext } from '../context';
import { remoteScript } from '../remote-scripts';

const CTX: RemoteMachineContext = {
  kind: 'remote',
  machineId: 'studio',
  sshBin: '/usr/bin/ssh',
  host: '127.0.0.1',
  user: null,
  port: 45731,
  remoteTmuxPath: '/usr/bin/tmux',
  socket: 'gmux-p233-unit',
  controlPath: '/tmp/tortie-501/m-0123456789ab',
  hostKeys: { tortie: '/t/known-machines', user: '/u/known_hosts' }
};

/** Every read the door was asked for, in order. */
let asked: { script: string; args: string[] }[] = [];
/** What each read answers with, in order of asking. */
let answers: (string | Error)[] = [];
let connected = true;
let contextReady = true;

vi.mock('../remote-run', () => ({
  machineLinkAnswering: () => connected,
  runRemoteRead: (
    _ctx: unknown,
    script: string,
    args: readonly string[]
  ): Promise<{ payload: string; generation: number; bytes: number }> => {
    asked.push({ script, args: [...args] });
    const answer = answers.shift() ?? '';
    if (answer instanceof Error) return Promise.reject(answer);
    return Promise.resolve({
      payload: answer,
      generation: 3,
      bytes: answer.length
    });
  }
}));

vi.mock('../ready-context', () => ({
  readyRemoteContext: (): RemoteMachineContext => {
    if (!contextReady) throw new Error('not connected');
    return CTX;
  }
}));

vi.mock('../store', () => ({
  machineRow: (id: string) => ({ id, host: '127.0.0.1' }),
  machineLabelOf: () => 'Studio'
}));

const {
  COMMIT_NAME_REFUSED,
  commitNameToSend,
  commitPathToSend,
  parseCommitFileAnswer,
  parseCommitFilesAnswer,
  readCommitFileOnMachine,
  readCommitFilesOnMachine
} = await import('../remote-commit-files');

const SHA = '53ba88fe1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f';
const CWD = '/home/greg/api';

const b64 = (text: string): string =>
  text.length === 0 ? 'none' : Buffer.from(text, 'utf8').toString('base64');

/** The `list` answer, from the tokens git prints between NULs. */
function list(...tokens: string[]): string {
  return `list ${b64(tokens.length === 0 ? '' : `${tokens.join('\0')}\0`)}`;
}

/** The `file` answer. */
function file(a: string, b: string, sizes?: [number, number]): string {
  const [as, bs] = sizes ?? [Buffer.byteLength(a), Buffer.byteLength(b)];
  return `file ${String(as)} ${String(bs)} ${b64(a)} ${b64(b)}`;
}

beforeEach(() => {
  asked = [];
  answers = [];
  connected = true;
  contextReady = true;
});

// ---------------------------------------------------------------------------
// The parser, over the three shapes
// ---------------------------------------------------------------------------

describe('reading the list one commit changed', () => {
  it('pairs a rename whose paths hold * and [ as old and new', () => {
    const files = parseCommitFilesAnswer(
      list('R100', 'docs/a*[1].md', 'docs/b*[2]-renamed.md', 'A', 'lib/h5.ts')
    );
    expect(files).toEqual([
      { path: 'docs/b*[2]-renamed.md', origPath: 'docs/a*[1].md', status: 'R' },
      { path: 'lib/h5.ts', status: 'A' }
    ]);
  });

  it('reads a copy as C with both paths', () => {
    expect(parseCommitFilesAnswer(list('C75', 'src/a.ts', 'src/a-copy.ts'))).toEqual([
      { path: 'src/a-copy.ts', origPath: 'src/a.ts', status: 'C' }
    ]);
  });

  it('reads a delete as D with one path', () => {
    expect(
      parseCommitFilesAnswer(list('D', 'tests/core.test.ts', 'M', 'docs/changelog.md'))
    ).toEqual([
      { path: 'tests/core.test.ts', status: 'D' },
      { path: 'docs/changelog.md', status: 'M' }
    ]);
  });

  it('answers an empty list for a commit that changed nothing', () => {
    expect(parseCommitFilesAnswer('list none')).toEqual([]);
  });

  it('answers null for an answer that is not a list', () => {
    expect(parseCommitFilesAnswer('file 0 0 none none')).toBe(null);
    expect(parseCommitFilesAnswer('repo none')).toBe(null);
    expect(parseCommitFilesAnswer('')).toBe(null);
  });

  it('refuses a payload that is not base64 rather than decoding nonsense', () => {
    expect(() => parseCommitFilesAnswer('list not*base64!')).toThrow(GmuxError);
  });
});

describe('reading both sides of one file', () => {
  it('decodes both sides and carries the whole sizes', () => {
    const pair = parseCommitFileAnswer(
      file('before\n', 'after\n', [90_001, 7])
    );
    expect(pair).toEqual({
      oldContents: 'before\n',
      newContents: 'after\n',
      binary: false,
      oldBytes: 90_001,
      newBytes: 7
    });
  });

  it('reads an absent side as empty and 0, which is an add or a delete', () => {
    expect(parseCommitFileAnswer(file('', 'new\n'))).toEqual({
      oldContents: '',
      newContents: 'new\n',
      binary: false,
      oldBytes: 0,
      newBytes: 4
    });
  });

  it('calls a side holding a zero byte binary and shows no text', () => {
    const pair = parseCommitFileAnswer(file('a\0b', 'text'));
    expect(pair?.binary).toBe(true);
    expect(pair?.oldContents).toBe('');
    expect(pair?.newContents).toBe('');
  });

  it('answers null when a size word is not a number', () => {
    expect(parseCommitFileAnswer('file x 4 none bmV3Cg==')).toBe(null);
    expect(parseCommitFileAnswer('file 0 4 none')).toBe(null);
    expect(parseCommitFileAnswer('list none')).toBe(null);
  });
});

describe('what may be sent', () => {
  it('sends only a full lowercase hex commit name', () => {
    expect(commitNameToSend(SHA)).toBe(SHA);
    expect(commitNameToSend('a'.repeat(64))).toBe('a'.repeat(64));
    expect(commitNameToSend(SHA.toUpperCase())).toBe(null);
    expect(commitNameToSend('HEAD')).toBe(null);
    expect(commitNameToSend('-p')).toBe(null);
    expect(commitNameToSend(SHA.slice(0, 7))).toBe(null);
    expect(commitNameToSend(`${SHA}^`)).toBe(null);
  });

  it('sends only a relative path with no .. in it', () => {
    expect(commitPathToSend('src/a.ts')).toBe('src/a.ts');
    expect(commitPathToSend('/etc/passwd')).toBe(null);
    expect(commitPathToSend('../above.txt')).toBe(null);
    expect(commitPathToSend('')).toBe(null);
  });
});

// ---------------------------------------------------------------------------
// The two reads, and what they send
// ---------------------------------------------------------------------------

describe('the list read', () => {
  it('asks commit-files once with an empty path and the ceiling', async () => {
    answers = [list('A', 'docs/changelog.md', 'D', 'tests/core.test.ts')];
    const result = await readCommitFilesOnMachine({ machineId: 'studio', cwd: CWD, sha: SHA });
    expect(asked).toEqual([
      { script: 'commit-files', args: [CWD, SHA, '', String(REMOTE_FILE_MAX_BYTES)] }
    ]);
    expect(result.mode).toBe('ok');
    expect(result.files.map((f) => `${f.status} ${f.path}`)).toEqual([
      'A docs/changelog.md',
      'D tests/core.test.ts'
    ]);
    expect(result.machineLabel).toBe('Studio');
  });

  it('answers notConnected and sends nothing when the link is not answering', async () => {
    connected = false;
    const result = await readCommitFilesOnMachine({ machineId: 'studio', cwd: CWD, sha: SHA });
    expect(result.mode).toBe('notConnected');
    expect(asked).toEqual([]);
  });

  it('answers unreachable when the machine did not answer or said something else', async () => {
    answers = [new Error('link dropped')];
    const dropped = await readCommitFilesOnMachine({ machineId: 'studio', cwd: CWD, sha: SHA });
    expect(dropped.mode).toBe('unreachable');
    answers = ['repo none none none none none'];
    const odd = await readCommitFilesOnMachine({ machineId: 'studio', cwd: CWD, sha: SHA });
    expect(odd.mode).toBe('unreachable');
    expect(odd.files).toEqual([]);
  });

  it('refuses a commit name that is not hex before anything is sent', async () => {
    await expect(
      readCommitFilesOnMachine({ machineId: 'studio', cwd: CWD, sha: 'HEAD' })
    ).rejects.toMatchObject({ payload: { message: COMMIT_NAME_REFUSED } });
    expect(asked).toEqual([]);
  });
});

describe('the pair read', () => {
  it('asks once at the path for a plain change', async () => {
    answers = [file('before\n', 'after\n')];
    const pair = await readCommitFileOnMachine({
      machineId: 'studio', cwd: CWD, sha: SHA, path: 'docs/changelog.md', origPath: null
    });
    expect(asked).toEqual([
      { script: 'commit-files', args: [CWD, SHA, 'docs/changelog.md', String(REMOTE_FILE_MAX_BYTES)] }
    ]);
    expect(pair.oldContents).toBe('before\n');
    expect(pair.newContents).toBe('after\n');
  });

  it('reads a rename at both paths, old side from the old path', async () => {
    answers = [file('', 'moved\n'), file('original\n', '')];
    const pair = await readCommitFileOnMachine({
      machineId: 'studio', cwd: CWD, sha: SHA,
      path: 'docs/design-renamed.md', origPath: 'docs/design.md'
    });
    expect(asked.map((a) => a.args[2])).toEqual(['docs/design-renamed.md', 'docs/design.md']);
    expect(pair.oldContents).toBe('original\n');
    expect(pair.newContents).toBe('moved\n');
    expect(pair.oldBytes).toBe(9);
    expect(pair.newBytes).toBe(6);
  });

  it('refuses a path that climbs out, and sends nothing', async () => {
    await expect(
      readCommitFileOnMachine({ machineId: 'studio', cwd: CWD, sha: SHA, path: '../x', origPath: null })
    ).rejects.toBeInstanceOf(GmuxError);
    expect(asked).toEqual([]);
  });

  it('throws when the machine answered something that is not a pair', async () => {
    answers = ['list none'];
    await expect(
      readCommitFileOnMachine({ machineId: 'studio', cwd: CWD, sha: SHA, path: 'a.ts', origPath: null })
    ).rejects.toBeInstanceOf(GmuxError);
  });
});

describe('the catalogue row', () => {
  it('is a read with four values that names show and nothing that writes', () => {
    const row = remoteScript('commit-files');
    expect(row?.mode).toBe('read');
    expect(row?.params).toBe(4);
    const verbs = [...(row?.text ?? '').matchAll(/git (?:--no-pager )?([a-z-]+)/g)].map((m) => m[1]);
    expect(new Set(verbs)).toEqual(new Set(['show']));
    expect(row?.text).toContain('--diff-merges=first-parent');
    expect(row?.text).toContain('case "$3" in /*|*..*) exit 1;; esac');
  });
});

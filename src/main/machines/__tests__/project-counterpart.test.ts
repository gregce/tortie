/**
 * Where this project already is on another machine (Phase 90.2, item 2).
 *
 * NOTHING HERE OPENS A CONNECTION AND NOTHING HERE RUNS GIT. The one door in
 * `../remote-run.ts` is replaced by a function that records the script id and
 * the values it was handed, and `runGit` is replaced by a function that answers
 * with one address. That is the point rather than a convenience: every property
 * below is about what Tortie ASKS FOR, how it matches, and what it says, and a
 * test that let a command through to find out would be testing the machine.
 *
 * WHAT THIS FILE CANNOT SHOW. It cannot show that a machine runs `repo-find`,
 * and it cannot show what the walk costs. Those are the scratch machine steps
 * in `GMUX_SMOKE=remote-sessions` and `npm run probe:remoteclone -- --measure`
 * against a real machine.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
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

/** Every read the door was asked for, in order. */
let asked: { script: string; args: string[] }[] = [];
/** What each script answers with, keyed by its id. */
let answers: Record<string, string | Error> = {};
/** What `git config --get remote.origin.url` prints here, or a refusal. */
let origin: string | null = 'https://github.com/gregce/tortie.git';
/** Whether the machine has a registered connection at all. */
let ready = true;
/** The connection generation, which a caller can move to drop the memo. */
let generation = 3;

vi.mock('../remote-run', () => ({
  runRemoteRead: (
    _ctx: unknown,
    script: string,
    args: readonly string[]
  ): Promise<{ payload: string; generation: number; bytes: number }> => {
    asked.push({ script, args: [...args] });
    const answer = answers[script];
    if (answer instanceof Error) return Promise.reject(answer);
    return Promise.resolve({
      payload: answer ?? 'none',
      generation,
      bytes: 0
    });
  }
}));

vi.mock('../remote-sessions', () => ({
  readyRemoteContext: (): RemoteMachineContext => {
    if (!ready) throw new Error('no registered connection');
    return CTX;
  }
}));

vi.mock('../store', () => ({
  machineRow: (id: string) => ({ id, host: '127.0.0.1' }),
  machineLabelOf: () => "Greg's Mac Pro"
}));

vi.mock('../context', () => ({
  machineGeneration: () => ({ generation })
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

const {
  REMOTE_REPO_FIND_DEPTH,
  REMOTE_REPO_FIND_MAX,
  findProjectOnMachine,
  parseRepoAddress,
  parseRepoFind,
  remoteCloneUrl,
  remoteRepoFindFolderDepth,
  remoteRepoKey,
  resetRemoteProjectFindForTests,
  suggestedClonePath
} = await import('../project-counterpart');

/** One line of a `repo-find` answer. */
function row(url: string, path: string): string {
  return `${Buffer.from(url, 'utf8').toString('base64')} ${path}`;
}

beforeEach(() => {
  asked = [];
  answers = {};
  origin = 'https://github.com/gregce/tortie.git';
  ready = true;
  generation = 3;
  resetRemoteProjectFindForTests();
});

describe('reading an address', () => {
  it('reads the four schemes and the short form', () => {
    expect(parseRepoAddress('https://github.com/gregce/tortie.git')).toEqual({
      host: 'github.com',
      path: 'gregce/tortie.git'
    });
    expect(parseRepoAddress('ssh://git@github.com:22/gregce/tortie.git')).toEqual(
      { host: 'github.com', path: 'gregce/tortie.git' }
    );
    expect(parseRepoAddress('git://github.com/gregce/tortie.git')).toEqual({
      host: 'github.com',
      path: 'gregce/tortie.git'
    });
    expect(parseRepoAddress('git@github.com:gregce/tortie.git')).toEqual({
      host: 'github.com',
      path: 'gregce/tortie.git'
    });
  });

  it('answers nothing for a folder on this Mac', () => {
    // A folder on this Mac names nothing another computer can reach, so there
    // is nothing to look for and nothing to copy from.
    expect(parseRepoAddress('/Users/gdc/gmux')).toBeNull();
    expect(parseRepoAddress('file:///Users/gdc/gmux')).toBeNull();
    expect(parseRepoAddress('../sibling')).toBeNull();
    expect(parseRepoAddress('')).toBeNull();
  });
});

describe('the key two addresses are compared on', () => {
  it('makes one key out of every form of one repository', () => {
    const key = 'github.com/gregce/tortie';
    for (const url of [
      'https://github.com/gregce/tortie.git',
      'https://github.com/gregce/tortie',
      'https://github.com/gregce/tortie/',
      'git@github.com:gregce/tortie.git',
      'ssh://git@github.com:22/gregce/tortie.git',
      'git://github.com/gregce/tortie.git',
      'HTTPS://GitHub.com/gregce/tortie.git'
    ]) {
      expect(remoteRepoKey(url), url).toBe(key);
    }
  });

  it('keeps two different repositories apart', () => {
    expect(remoteRepoKey('https://github.com/gregce/tortie.git')).not.toBe(
      remoteRepoKey('https://github.com/gregce/tortiedotsh.git')
    );
    expect(remoteRepoKey('https://github.com/a/b.git')).not.toBe(
      remoteRepoKey('https://gitlab.com/a/b.git')
    );
  });

  it('answers nothing for an address that names no host', () => {
    expect(remoteRepoKey('/Users/gdc/gmux')).toBeNull();
    expect(remoteRepoKey('https://github.com/')).toBeNull();
  });
});

describe('the address that would cross', () => {
  it('rewrites every form to a web address and leaves a web address alone', () => {
    expect(remoteCloneUrl('https://github.com/gregce/tortie.git')).toBe(
      'https://github.com/gregce/tortie.git'
    );
    expect(remoteCloneUrl('git@github.com:gregce/tortie.git')).toBe(
      'https://github.com/gregce/tortie.git'
    );
    expect(remoteCloneUrl('ssh://git@github.com:22/gregce/tortie.git')).toBe(
      'https://github.com/gregce/tortie.git'
    );
    expect(remoteCloneUrl('git://github.com/gregce/tortie.git')).toBe(
      'https://github.com/gregce/tortie.git'
    );
  });

  it('offers nothing for a folder on this Mac', () => {
    expect(remoteCloneUrl('/Users/gdc/gmux')).toBeNull();
  });
});

describe('reading what the machine walked', () => {
  it('reads the address and the folder off one line', () => {
    expect(parseRepoFind(row('https://github.com/a/b.git', '/Users/gdc/b'))).toEqual(
      [{ url: 'https://github.com/a/b.git', path: '/Users/gdc/b' }]
    );
  });

  it('keeps a folder whose name holds a space', () => {
    const one = parseRepoFind(row('https://github.com/a/b.git', '/Users/gdc/my work'));
    expect(one[0]?.path).toBe('/Users/gdc/my work');
  });

  it('reads the empty word as nothing at all', () => {
    expect(parseRepoFind('none')).toEqual([]);
  });

  it('drops a line that carries only one part', () => {
    expect(parseRepoFind('justoneword')).toEqual([]);
  });
});

describe('the destination a copy would use', () => {
  it('is that machine own home and the folder name here', () => {
    expect(suggestedClonePath('/Users/gdc', '/Users/gdc/work/gmux')).toBe(
      '/Users/gdc/gmux'
    );
    expect(suggestedClonePath('/Users/gdc/', '/Users/gdc/work/gmux')).toBe(
      '/Users/gdc/gmux'
    );
  });

  it('offers nothing when the machine did not say what its home is', () => {
    // Tortie composes no home path for another computer out of a guess.
    expect(suggestedClonePath('', '/Users/gdc/gmux')).toBeNull();
    expect(suggestedClonePath('~', '/Users/gdc/gmux')).toBeNull();
  });
});

describe('the six outcomes', () => {
  it('fills the field when exactly one folder over there matches', async () => {
    answers['repo-find'] = [
      row('https://github.com/gregce/other.git', '/Users/gdc/other'),
      row('git@github.com:gregce/tortie.git', '/Users/gdc/gmux')
    ].join('\n');
    const found = await findProjectOnMachine({
      machineId: 'studio',
      localPath: '/Users/gdc/gmux'
    });
    expect(found.outcome).toBe('found');
    expect(found.matches).toEqual([{ path: '/Users/gdc/gmux' }]);
    expect(found.searched).toBe(2);
    expect(found.suggestedPath).toBeNull();
    // The sentence says what Tortie did NOT do, which is compare the contents.
    expect(found.sentences[0]).toContain(
      'Tortie has not compared what is in the two folders.'
    );
  });

  it('fills nothing when two folders over there match', async () => {
    answers['repo-find'] = [
      row('https://github.com/gregce/tortie.git', '/Users/gdc/one'),
      row('https://github.com/gregce/tortie.git', '/Users/gdc/two')
    ].join('\n');
    const several = await findProjectOnMachine({
      machineId: 'studio',
      localPath: '/Users/gdc/gmux'
    });
    expect(several.outcome).toBe('several');
    expect(several.matchTotal).toBe(2);
    expect(several.matches).toHaveLength(2);
    expect(several.sentences[0]).toContain('They may hold different work');
  });

  it('names at most five folders while counting all of them', async () => {
    answers['repo-find'] = Array.from({ length: 9 }, (_, at) =>
      row('https://github.com/gregce/tortie.git', `/Users/gdc/c${String(at)}`)
    ).join('\n');
    const several = await findProjectOnMachine({
      machineId: 'studio',
      localPath: '/Users/gdc/gmux'
    });
    expect(several.matchTotal).toBe(9);
    expect(several.matches).toHaveLength(5);
  });

  it('offers a destination when nothing over there matches', async () => {
    answers['repo-find'] = row(
      'https://github.com/gregce/other.git',
      '/Users/gdc/other'
    );
    const absent = await findProjectOnMachine({
      machineId: 'studio',
      localPath: '/Users/gdc/work/gmux'
    });
    expect(absent.outcome).toBe('absent');
    expect(absent.searched).toBe(1);
    expect(absent.suggestedPath).toBe('/Users/gdc/gmux');
    expect(absent.cloneUrl).toBe('https://github.com/gregce/tortie.git');
  });

  it('says the address was rewritten, and shows both', async () => {
    origin = 'git@github.com:gregce/tortie.git';
    answers['repo-find'] = 'none';
    const absent = await findProjectOnMachine({
      machineId: 'studio',
      localPath: '/Users/gdc/gmux'
    });
    expect(absent.translated).toBe(true);
    const said = absent.sentences.join(' ');
    expect(said).toContain('git@github.com:gregce/tortie.git');
    expect(said).toContain('https://github.com/gregce/tortie.git');
  });

  it('contacts the machine ZERO times for a project with no remote', async () => {
    origin = null;
    const none = await findProjectOnMachine({
      machineId: 'studio',
      localPath: '/Users/gdc/test-prime-agent'
    });
    expect(none.outcome).toBe('noRemote');
    expect(asked).toEqual([]);
    expect(none.tookMs).toBe(0);
  });

  it('contacts the machine ZERO times for a remote on this Mac', async () => {
    origin = '/Users/gdc/some/bare.git';
    const local = await findProjectOnMachine({
      machineId: 'studio',
      localPath: '/Users/gdc/gmux'
    });
    expect(local.outcome).toBe('localRemote');
    expect(asked).toEqual([]);
    expect(local.sentences[0]).toContain('cannot reach it');
  });

  it('answers unreachable rather than throwing when the machine went quiet', async () => {
    answers['repo-find'] = new Error('the link dropped');
    const gone = await findProjectOnMachine({
      machineId: 'studio',
      localPath: '/Users/gdc/gmux'
    });
    expect(gone.outcome).toBe('unreachable');
    expect(gone.matches).toEqual([]);
  });

  it('answers unreachable for a machine with no registered connection', async () => {
    ready = false;
    const gone = await findProjectOnMachine({
      machineId: 'studio',
      localPath: '/Users/gdc/gmux'
    });
    expect(gone.outcome).toBe('unreachable');
    expect(asked).toEqual([]);
  });
});

describe('the one call, and what is held between two of them', () => {
  it('asks the machine once per gesture, with the machine own home', async () => {
    answers['repo-find'] = 'none';
    await findProjectOnMachine({
      machineId: 'studio',
      localPath: '/Users/gdc/gmux'
    });
    const walk = asked.filter((one) => one.script === 'repo-find');
    expect(walk).toHaveLength(1);
    // An empty root is that machine own HOME, resolved by that machine own
    // shell. Tortie composes no home path for another computer.
    expect(walk[0]?.args).toEqual([
      '',
      String(REMOTE_REPO_FIND_DEPTH),
      String(REMOTE_REPO_FIND_MAX)
    ]);
  });

  it('reuses one answer inside one connection', async () => {
    answers['repo-find'] = 'none';
    await findProjectOnMachine({ machineId: 'studio', localPath: '/a' });
    await findProjectOnMachine({ machineId: 'studio', localPath: '/b' });
    expect(asked.filter((one) => one.script === 'repo-find')).toHaveLength(1);
  });

  it('asks again when the connection moved', async () => {
    answers['repo-find'] = 'none';
    await findProjectOnMachine({ machineId: 'studio', localPath: '/a' });
    generation = 4;
    await findProjectOnMachine({ machineId: 'studio', localPath: '/a' });
    expect(asked.filter((one) => one.script === 'repo-find')).toHaveLength(2);
  });

  it('remembers nothing across a reset', async () => {
    answers['repo-find'] = 'none';
    await findProjectOnMachine({ machineId: 'studio', localPath: '/a' });
    resetRemoteProjectFindForTests();
    await findProjectOnMachine({ machineId: 'studio', localPath: '/a' });
    expect(asked.filter((one) => one.script === 'repo-find')).toHaveLength(2);
  });
});

describe('the depth a person reads', () => {
  it('is one less than the depth the walk asks for', () => {
    // The constant is the maxdepth for the `.git` directory itself, so a depth
    // of 5 finds a project four folders inside the home directory.
    expect(remoteRepoFindFolderDepth()).toBe(REMOTE_REPO_FIND_DEPTH - 1);
  });
});

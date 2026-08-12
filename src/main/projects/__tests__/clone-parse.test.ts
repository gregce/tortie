/**
 * Reading git's clone output (Phase 18.6, research 35 §3.10 and §3.12).
 *
 * The frames below are real lines from a depth 1 clone of
 * microsoft/TypeScript and a full clone of expressjs/express, captured on
 * 2026-08-12. The failure strings are git's own text for each case in the
 * research table.
 *
 * Two properties are what these tests exist to hold. Counting and
 * compressing must stay TWO phases, because collapsing them is exactly the
 * bug that makes a progress bar jump backwards. And a disk that fills up
 * must not read as a dropped connection, because git prints both messages.
 */

import { describe, expect, it } from 'vitest';
import {
  classifyCloneFailure,
  cloneFailureMessage,
  lastStderrLine,
  parseCloneFrame,
  splitFrames
} from '../clone-parse';

describe('parsing a progress frame', () => {
  it('reads all six phases, and keeps counting and compressing apart', () => {
    expect(parseCloneFrame('remote: Enumerating objects: 75447, done.')).toEqual({
      phase: 'enumerating',
      total: 75447
    });
    expect(
      parseCloneFrame('remote: Counting objects:  51% (38478/75447)')
    ).toEqual({ phase: 'counting', percent: 51, done: 38478, total: 75447 });
    expect(
      parseCloneFrame('remote: Compressing objects:  50% (27987/55974)')
    ).toEqual({ phase: 'compressing', percent: 50, done: 27987, total: 55974 });
    expect(
      parseCloneFrame('Resolving deltas:  51% (10368/20327)')
    ).toEqual({ phase: 'resolving', percent: 51, done: 10368, total: 20327 });
    expect(parseCloneFrame('Updating files:  59% (48800/81368)')).toEqual({
      phase: 'checkingOut',
      percent: 59,
      done: 48800,
      total: 81368
    });
  });

  it('reads the receiving byte figure in git’s own unit, with no denominator', () => {
    expect(
      parseCloneFrame(
        'Receiving objects:  50% (37724/75447), 18.25 MiB | 9.01 MiB/s'
      )
    ).toEqual({
      phase: 'receiving',
      percent: 50,
      done: 37724,
      total: 75447,
      bytes: '18.25 MiB'
    });
  });

  it('reads the line that ends a phase', () => {
    expect(
      parseCloneFrame(
        'Receiving objects: 100% (33522/33522), 9.62 MiB | 46.88 MiB/s, done.'
      )
    ).toMatchObject({ phase: 'receiving', percent: 100, bytes: '9.62 MiB' });
  });

  it('ignores everything that is not a frame, including the Cloning into line', () => {
    expect(parseCloneFrame("Cloning into '/tmp/.tortie-clone-ab12'...")).toBeNull();
    expect(parseCloneFrame('')).toBeNull();
    expect(parseCloneFrame('remote: Total 75447 (delta 0), reused 0')).toBeNull();
  });

  it('splits on the carriage return git actually uses, not only on newlines', () => {
    const { lines, rest } = splitFrames(
      'Receiving objects:   1% (1/100)\rReceiving objects:   2% (2/100)\rReceiving obj'
    );
    expect(lines).toHaveLength(2);
    expect(rest).toBe('Receiving obj');
  });
});

describe('classifying a failure', () => {
  const cases: ReadonlyArray<readonly [string, string]> = [
    [
      'unauthenticated',
      "fatal: could not read Username for 'https://github.com': terminal prompts disabled"
    ],
    // What Tortie's OWN command produces, measured. `-c core.askPass=` sends
    // git down the askpass path, so it never prints the sentence above.
    ['unauthenticated', 'fatal: unable to get password from user'],
    [
      'authRejected',
      "remote: Invalid username or token. Password authentication is not supported for Git operations.\nfatal: Authentication failed for 'https://github.com/o/r.git/'"
    ],
    [
      'network',
      "fatal: unable to access 'https://github.com/o/r.git/': Could not resolve host: github.com"
    ],
    [
      'unreachable',
      "fatal: unable to access 'https://x/': Failed to connect to x port 443 after 75003 ms: Couldn't connect to server"
    ],
    [
      'notFound',
      "remote: Repository not found.\nfatal: repository 'https://github.com/o/r.git/' not found"
    ],
    ['badUrl', "fatal: repository '/tmp/nope' does not exist"],
    [
      'destinationExists',
      "fatal: destination path 'x' already exists and is not an empty directory."
    ],
    [
      'permission',
      "fatal: could not create work tree dir '/x/y': Permission denied"
    ],
    ['interrupted', 'fatal: early EOF\nfatal: index-pack failed']
  ];

  for (const [kind, stderr] of cases) {
    it(`reads ${kind} from git’s own text`, () => {
      expect(classifyCloneFailure(stderr)).toBe(kind);
    });
  }

  it('calls a full disk a full disk, not a dropped connection', () => {
    // Git prints BOTH of these, and the order of the matchers is what
    // decides which one the user is told about.
    expect(
      classifyCloneFailure(
        'fatal: write error: No space left on device\nfatal: fetch-pack: invalid index-pack output'
      )
    ).toBe('diskFull');
  });

  it('reads a missing git from the spawn errno, which never reaches stderr', () => {
    expect(classifyCloneFailure('', 'ENOENT')).toBe('gitMissing');
  });

  it('invents no diagnosis for text it does not recognise', () => {
    expect(classifyCloneFailure('fatal: something nobody has seen')).toBe(
      'unknown'
    );
  });
});

describe('the sentence the user reads', () => {
  it('keeps not found and not signed in as two different remedies', () => {
    const notFound = cloneFailureMessage('notFound', {
      host: 'github.com',
      owner: 'o',
      repo: 'r'
    });
    const unauthenticated = cloneFailureMessage('unauthenticated', {
      host: 'github.com'
    });
    expect(notFound).toContain('o/r');
    expect(notFound).toContain('access');
    expect(unauthenticated).toContain('sign in');
    expect(unauthenticated).not.toBe(notFound);
  });

  it('adds the gh line only when the caller found gh signed in', () => {
    const without = cloneFailureMessage('unauthenticated', {
      host: 'github.com'
    });
    const withHint = cloneFailureMessage('unauthenticated', {
      host: 'github.com',
      ghHint: 'Running gh auth setup-git will let git use your GitHub login.'
    });
    expect(without).not.toContain('gh auth setup-git');
    expect(withHint.split('\n')).toHaveLength(2);
  });

  it('reuses the collision wording projects:create already ships', () => {
    expect(
      cloneFailureMessage('destinationExists', { host: 'github.com', name: 'got' })
    ).toBe("'got' already exists in that folder.");
  });

  it('prints git’s own last line under a heading when it recognised nothing', () => {
    const message = cloneFailureMessage('unknown', {
      host: 'github.com',
      stderr: 'remote: Enumerating objects: 5, done.\nfatal: something new\n'
    });
    expect(message).toBe('The clone did not finish.\nfatal: something new');
  });

  it('finds the last line git wrote that carries any text', () => {
    expect(lastStderrLine('one\ntwo\n\n  \n')).toBe('two');
    expect(lastStderrLine('')).toBe('');
  });
});

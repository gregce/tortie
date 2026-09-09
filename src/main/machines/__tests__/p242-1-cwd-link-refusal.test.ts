/**
 * Phase 242.1 — a link is not a way out of the confirmed folder for the three
 * verbs that take a `cwd` either.
 *
 * ## What this file holds that no other one does
 *
 * `./p242-link-refusal.test.ts` runs the shipped far side text of the three
 * verbs that take a PATH. These are the other three, being `git-stage`,
 * `git-unstage` and `git-commit`, which take a repository `cwd` instead, and
 * until 2026-09-08 they were the hole that phase left open on purpose.
 *
 * It RUNS the shipped script strings under `/bin/sh` over real directories,
 * real symbolic links and REAL GIT REPOSITORIES on this Mac, with the same
 * positional values `runRemoteWrite` composes, and it reads what they printed
 * and what the two indexes hold afterwards. `build/conformance-machines.mjs`
 * condition 88 reads the same text and asks whether the clauses are there and
 * stand above every git, which is the right question for a gate and is still a
 * question about text.
 *
 * ## The shape, measured on the operator's own Mac Pro on 2026-09-07
 *
 * A confirmed folder with a symbolic link inside it pointing at a repository
 * outside it. A tab opened THROUGH that link. `rootHolds` compares path TEXT,
 * `<confirmed folder>/escape` resolves textually under the confirmed folder, and
 * the far side's `cd "$1"` then runs git in whatever the link really points at.
 * The reading was `done`, with `repoPath` and `writeRoot` side by side in the
 * same answer, and `dirty-link.txt` staged in the repository outside.
 *
 * ## THE COMMIT ARM IS DRIVEN WITH THE GUARD SATISFIED, which is the attack
 *
 * Phase 242 read `refused` from the commit arm and the refusal was the HEAD
 * guard rather than containment: the sha it handed back was the OUTSIDE
 * repository's own HEAD, which is exactly what a tab really opened through the
 * link would have drawn. So the arm below reads that repository's HEAD with a
 * `git` this file ran itself and hands it in as the guard, which is the state
 * the guard cannot refuse. At the parent commit the commit lands outside. Here
 * it is `outside` and the outside repository still holds one commit.
 *
 * ## What it also holds, and it matters as much
 *
 * That the refusal did NOT get wider than the hole. Staging, unstaging and
 * committing inside the folder all still work; a tab in a real subdirectory
 * still works; a repository that IS the confirmed folder still works; and the
 * shape `./remote-stage.ts` says works today — a person who confirms
 * `<repo>/src` and opens a tab there, whose repository root is ABOVE the folder
 * they confirmed — still works, which is why the tab's folder is what is
 * bounded and the repository root is not.
 *
 * ## What it cannot show
 *
 * That the machine on the other side of a real link behaves the way this Mac
 * does. That is `build/probe-p242-write-path.mjs`, whose `a10` and `a11` arms
 * drive these two through the real link against the real machine.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { REMOTE_SCRIPTS } from '../remote-scripts';
import {
  parseIndexWriteAnswer,
  REMOTE_INDEX_WRITE_OUTSIDE,
  rootRelativeCwd
} from '../remote-stage';
import { parseCommitAnswer, REMOTE_COMMIT_OUTSIDE } from '../remote-commit';

/** A git that reads no configuration of the person's and signs nothing. */
const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: 'Tortie Test',
  GIT_AUTHOR_EMAIL: 'test@example.invalid',
  GIT_COMMITTER_NAME: 'Tortie Test',
  GIT_COMMITTER_EMAIL: 'test@example.invalid',
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_SYSTEM: '/dev/null'
};

const textOf = (id: string): string => {
  const row = REMOTE_SCRIPTS.find((one) => one.id === id);
  if (row === undefined) throw new Error(`no script called ${id}`);
  return row.text;
};

/** Run one shipped script text the way the far side runs it. */
function run(id: string, args: string[]): { out: string; word: string } {
  const done = spawnSync('/bin/sh', ['-c', textOf(id), 'sh', ...args], {
    encoding: 'utf8',
    env: GIT_ENV
  });
  const out = `${done.stdout ?? ''}${done.stderr ?? ''}`;
  const at = out.match(/__TORTIE_RUN__(.*?)__TORTIE_RUN__/);
  return {
    out,
    word: at === null ? '' : (at[1] ?? '').trim().split(/\s+/)[0] ?? ''
  };
}

const git = (at: string, ...args: string[]): string =>
  execFileSync('/usr/bin/git', ['-C', at, ...args], {
    encoding: 'utf8',
    env: GIT_ENV
  }).trim();

/** A repository with one commit and one file left dirty in the worktree. */
function repoAt(path: string): void {
  mkdirSync(path, { recursive: true });
  git(path, 'init', '-q', '-b', 'main');
  writeFileSync(join(path, 'kept.txt'), 'kept\n', 'utf8');
  git(path, 'add', 'kept.txt');
  git(path, 'commit', '-q', '-m', 'one');
}

/** What one repository's index holds, as a sorted list of paths. */
const stagedIn = (path: string): string[] =>
  git(path, 'diff', '--cached', '--name-only')
    .split('\n')
    .filter((one) => one.length > 0)
    .sort();

const commitsIn = (path: string): number =>
  Number(git(path, 'rev-list', '--count', 'HEAD'));

let dir = '';
/** The folder the person confirmed. It is a repository of its own. */
let root = '';
/** The repository OUTSIDE the confirmed folder that the link points at. */
let sibling = '';

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'p242-1-cwd-'));
  root = join(dir, 'root');
  sibling = join(dir, 'sibling');
  repoAt(root);
  repoAt(sibling);
  // The file the attack stages in the repository outside. It exists so this
  // file's refusal arms and its green arms can never grade each other through
  // one shared reading.
  writeFileSync(join(sibling, 'dirty-link.txt'), 'dirty\n', 'utf8');
  writeFileSync(join(root, 'dirty.txt'), 'dirty\n', 'utf8');
  mkdirSync(join(root, 'sub'), { recursive: true });
  writeFileSync(join(root, 'sub', 'inside.txt'), 'inside\n', 'utf8');
  // The link inside the confirmed folder pointing at the repository outside.
  symlinkSync(sibling, join(root, 'escape'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// The hole, which is what Phase 242 measured and did not close
// ---------------------------------------------------------------------------

describe('a cwd reached through a link is refused before any git runs', () => {
  it('git-stage refuses and the index outside the folder does not move', () => {
    // The values are the ones `stageOnMachine` composes: the repository root
    // THAT MACHINE'S git reported, the list, the confirmed folder as the person
    // gave it, and the tab's own folder relative to it.
    expect(stagedIn(sibling)).toEqual([]);
    const said = run('git-stage', [
      sibling,
      'dirty-link.txt',
      root,
      'escape'
    ]);
    expect(said.word).toBe(REMOTE_INDEX_WRITE_OUTSIDE);
    expect(stagedIn(sibling)).toEqual([]);
  });

  it('git-unstage refuses through the same link', () => {
    git(sibling, 'add', 'dirty-link.txt');
    expect(stagedIn(sibling)).toEqual(['dirty-link.txt']);
    const said = run('git-unstage', [
      sibling,
      'dirty-link.txt',
      root,
      'escape'
    ]);
    expect(said.word).toBe(REMOTE_INDEX_WRITE_OUTSIDE);
    expect(stagedIn(sibling)).toEqual(['dirty-link.txt']);
  });

  it('git-commit refuses WITH THE HEAD GUARD SATISFIED, which is the attack', () => {
    // Phase 242 read `refused` here and it was the sha guard, not containment.
    // The sha it handed back was this repository's own HEAD, so the attack is
    // to hand that sha back in — which is what a tab really opened through the
    // link would have drawn.
    git(sibling, 'add', 'dirty-link.txt');
    const head = git(sibling, 'rev-parse', 'HEAD');
    expect(commitsIn(sibling)).toBe(1);
    const said = run('git-commit', [
      sibling,
      head,
      'a message',
      root,
      'escape'
    ]);
    expect(said.word).toBe(REMOTE_COMMIT_OUTSIDE);
    expect(commitsIn(sibling)).toBe(1);
    // And the refusal did not hand the sha back either, because the walk
    // stands above the rev-parse.
    expect(said.out).not.toContain(head);
  });

  it('refuses a link that is an INTERMEDIATE component too', () => {
    mkdirSync(join(sibling, 'deep'), { recursive: true });
    const said = run('git-stage', [
      sibling,
      'dirty-link.txt',
      root,
      'escape/deep'
    ]);
    expect(said.word).toBe(REMOTE_INDEX_WRITE_OUTSIDE);
    expect(stagedIn(sibling)).toEqual([]);
  });

  it('refuses a link reached below a real folder, which is the last component again', () => {
    mkdirSync(join(root, 'a'), { recursive: true });
    symlinkSync(sibling, join(root, 'a', 'escape'));
    const said = run('git-stage', [
      sibling,
      'dirty-link.txt',
      root,
      'a/escape'
    ]);
    expect(said.word).toBe(REMOTE_INDEX_WRITE_OUTSIDE);
    expect(stagedIn(sibling)).toEqual([]);
  });

  it('refuses a relative part that is absolute or climbs, before the walk', () => {
    for (const rel of [sibling, '../sibling', 'a/../../sibling']) {
      const said = run('git-stage', [sibling, 'dirty-link.txt', root, rel]);
      expect(said.word).toBe('');
      expect(stagedIn(sibling)).toEqual([]);
    }
  });
});

// ---------------------------------------------------------------------------
// And the refusal did not get wider than the hole
// ---------------------------------------------------------------------------

describe('the refusal did not get wider than the hole', () => {
  it('a stage inside the confirmed folder still stages', () => {
    const said = run('git-stage', [root, 'dirty.txt', root, '']);
    expect(said.word).toBe('0');
    expect(stagedIn(root)).toEqual(['dirty.txt']);
  });

  it('an unstage inside the confirmed folder still unstages', () => {
    git(root, 'add', 'dirty.txt');
    const said = run('git-unstage', [root, 'dirty.txt', root, '']);
    expect(said.word).toBe('0');
    expect(stagedIn(root)).toEqual([]);
  });

  it('a commit inside the confirmed folder still commits', () => {
    git(root, 'add', 'dirty.txt');
    const head = git(root, 'rev-parse', 'HEAD');
    const said = run('git-commit', [root, head, 'a message', root, '']);
    expect(said.word).toBe('committed');
    expect(commitsIn(root)).toBe(2);
  });

  it('a tab in a real subdirectory of the confirmed folder still stages', () => {
    const said = run('git-stage', [root, 'sub/inside.txt', root, 'sub']);
    expect(said.word).toBe('0');
    expect(stagedIn(root)).toEqual(['sub/inside.txt']);
  });

  it('a repository ABOVE the confirmed folder still stages, which is the ~/code/api person', () => {
    // `../remote-stage.ts`'s stated shape: a person who confirms `<repo>/src`
    // and opens a tab there is in a repository rooted at `<repo>`. Bounding the
    // resolved REPOSITORY ROOT would have refused them; bounding the tab's own
    // folder leaves them exactly as they were.
    const said = run('git-stage', [
      root,
      'sub/inside.txt',
      join(root, 'sub'),
      ''
    ]);
    expect(said.word).toBe('0');
    expect(stagedIn(root)).toEqual(['sub/inside.txt']);
  });

  it('a link INSIDE the tab\'s own folder is not what the walk asks about', () => {
    // The walk asks about the COMPONENTS of the tab's own folder and about
    // nothing else, so a link sitting INSIDE that folder is off the path it
    // walks. THE ARM ABOVE DRIVES THE SAME CALL WITH NEITHER LINK PLANTED, so
    // the two differ by the links rather than by their text; an earlier draft
    // of this arm planted nothing and was byte for byte the arm above it, which
    // meant it could not fail for the reason it names.
    symlinkSync(sibling, join(root, 'sub', 'beside'));
    const said = run('git-stage', [root, 'sub/inside.txt', root, 'sub']);
    expect(said.word).toBe('0');
    expect(stagedIn(root)).toEqual(['sub/inside.txt']);
  });

  it('a link that points BACK INSIDE the confirmed folder is refused too, and that is deliberate', () => {
    // The stated over-refusal, in `../remote-stage.ts`'s header. Telling this
    // apart from the escape needs a `readlink` and a comparison of a RESOLVED
    // path, which is `../remote-record.ts`'s standing refusal, and Phase 242
    // shipped exactly this for the three verbs that take a path. It is pinned
    // here so a later round that changes it changes a measurement rather than a
    // sentence.
    symlinkSync(join(root, 'sub'), join(root, 'inward'));
    const said = run('git-stage', [root, 'sub/inside.txt', root, 'inward']);
    expect(said.word).toBe(REMOTE_INDEX_WRITE_OUTSIDE);
    expect(stagedIn(root)).toEqual([]);
  });

  it('a SYMBOLIC LINK inside the repository is still a file git may stage', () => {
    // The refusal is about the tab's own folder. A link among the changed files
    // is git's business and this phase did not touch it.
    symlinkSync(join(root, 'kept.txt'), join(root, 'a-link'));
    const said = run('git-stage', [root, 'a-link', root, '']);
    expect(said.word).toBe('0');
    expect(stagedIn(root)).toEqual(['a-link']);
  });
});

// ---------------------------------------------------------------------------
// Main knows the word, and it maps onto the outcome each verb already had
// ---------------------------------------------------------------------------

describe('main knows the word and maps it onto the outcome it already had', () => {
  it('the two parsers accept it with the field count their script prints', () => {
    expect(parseIndexWriteAnswer('outside none')).toEqual({
      ok: false,
      outside: true,
      said: null
    });
    expect(parseCommitAnswer('outside none none')?.word).toBe('outside');
  });

  it('a short or padded answer is still refused whole, so the word bought no laxity', () => {
    expect(parseIndexWriteAnswer('outside')).toBeNull();
    expect(parseIndexWriteAnswer('outside none extra')).toBeNull();
    expect(parseCommitAnswer('outside none')).toBeNull();
  });

  it('the word may not carry a message, because the script prints none', () => {
    const word = Buffer.from('anything', 'utf8').toString('base64');
    expect(parseIndexWriteAnswer(`outside ${word}`)).toBeNull();
  });
});

describe('rootRelativeCwd, which is the spelling both sides agree on', () => {
  it('answers the empty string for a tab at the confirmed folder itself', () => {
    expect(rootRelativeCwd('/Users/gdc/code', '/Users/gdc/code')).toBe('');
  });

  it('answers the part below it for a tab under the confirmed folder', () => {
    expect(rootRelativeCwd('/Users/gdc/code', '/Users/gdc/code/api/src')).toBe(
      'api/src'
    );
  });

  it('answers null for a folder that is not under the confirmed one', () => {
    expect(rootRelativeCwd('/Users/gdc/code', '/Users/gdc/other')).toBeNull();
    // The separator is part of it, so a sibling whose name is the confirmed one
    // plus a character is outside.
    expect(rootRelativeCwd('/Users/gdc/code', '/Users/gdc/codex')).toBeNull();
  });

  it('takes a trailing slash on the confirmed folder without eating a character', () => {
    expect(rootRelativeCwd('/Users/gdc/code/', '/Users/gdc/code/api')).toBe(
      'api'
    );
  });
});

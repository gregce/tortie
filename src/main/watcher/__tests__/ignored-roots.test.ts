/**
 * The worktree watcher's exclusion plan (Phase 151).
 *
 * Check type: pure contract tests for the parser and the plan, plus one
 * adapter test that runs the real `git ls-files` read over a throwaway
 * repository built by this file. Environment requirement: node, the
 * repository's installed dependencies, and the git binary. Skip rule: never
 * skips; a missing git is a failure, because the read is what supplies every
 * exclusion past `.git`.
 *
 * WHAT THIS FILE CANNOT PROVE, and it is most of the phase's value. It cannot
 * prove that CoreServices stops at eight paths, because that is a property of
 * macOS rather than of this code, and it is measured in `build/fsevents-cap.c`
 * and asserted by `npm run conformance:watcher`. It cannot prove that the
 * exclusions reduce the event flood or that a drop recovers a stale tree,
 * because both need a real FSEvents stream under real churn over a real
 * minute. Those belong to the verifier's churn run, and the numbers this
 * phase claims come from there and not from here.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  EXCLUSION_PATH_BUDGET,
  overflowMatcher,
  parseIgnoredRoots,
  planWorktreeIgnore,
  rankIgnoredRoots,
  readIgnoredRoots
} from '../ignored-roots';

/**
 * Ask an overflow matcher the question the watcher really asks it.
 *
 * `node_modules/@parcel/watcher/wrapper.js` does not hand a RegExp to
 * JavaScript. It takes the SOURCE, wraps it as
 * `^[\s\S]*(?:<source>)[\s\S]*$` so that the C++ side's full string
 * `std::regex_match` behaves like `.test()`, and `Watcher::isIgnored` runs it
 * against the path RELATIVE to the watch root. Testing `matcher.test(path)`
 * directly would therefore be testing something the product never runs, so
 * this rebuilds the real question instead.
 */
function excludes(matcher: RegExp, relativePath: string): boolean {
  return new RegExp(`^[\\s\\S]*(?:${matcher.source})[\\s\\S]*$`).test(
    relativePath
  );
}

let dir = '';

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'gmux-ignored-roots-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('parseIgnoredRoots', () => {
  it('keeps the directory entries and drops the ignored FILES', () => {
    // Exactly the shape of the operator's own repository, read on 2026-08-25.
    const stdout = '.claude/\0.env\0bin/\0plane/node_modules/\0runstory\0scratch/\0';
    expect(parseIgnoredRoots(stdout)).toEqual([
      '.claude',
      'bin',
      'plane/node_modules',
      'scratch'
    ]);
  });

  it('is unbothered by a path containing a space or a quote, which -z is for', () => {
    expect(parseIgnoredRoots('my build/\0a"b/\0')).toEqual(['my build', 'a"b']);
  });

  it('refuses .git and the empty trailing field', () => {
    expect(parseIgnoredRoots('.git/\0node_modules/\0')).toEqual(['node_modules']);
    expect(parseIgnoredRoots('')).toEqual([]);
  });
});

describe('rankIgnoredRoots', () => {
  it('puts the directory with the most direct entries first, then sorts by path', () => {
    mkdirSync(join(dir, 'big'));
    for (let i = 0; i < 12; i++) writeFileSync(join(dir, 'big', `f${i}`), 'x');
    mkdirSync(join(dir, 'small'));
    writeFileSync(join(dir, 'small', 'f'), 'x');
    // Two with the same count: the tie is broken by path, so the order is
    // deterministic and this test cannot flake on readdir ordering.
    mkdirSync(join(dir, 'zeta'));
    mkdirSync(join(dir, 'alpha'));
    expect(rankIgnoredRoots(dir, ['zeta', 'small', 'alpha', 'big'])).toEqual([
      'big',
      'small',
      'alpha',
      'zeta'
    ]);
  });

  it('keeps a candidate that no longer exists rather than failing the plan', () => {
    expect(rankIgnoredRoots(dir, ['gone'])).toEqual(['gone']);
  });
});

describe('planWorktreeIgnore', () => {
  const rels = (n: number): string[] =>
    Array.from({ length: n }, (_, i) => `d${String(i).padStart(2, '0')}`);

  it('always makes .git the first plain path, even with nothing else', () => {
    const plan = planWorktreeIgnore('/repo', []);
    expect(plan.paths).toEqual([join('/repo', '.git')]);
    expect(plan.overflow).toEqual([]);
    expect(plan.ignore).toEqual([join('/repo', '.git')]);
  });

  it('spends every remaining slot on plain paths at exactly the budget', () => {
    // 7 roots plus .git is 8, which is the measured maximum that still works.
    const plan = planWorktreeIgnore('/repo', rels(7));
    expect(plan.paths).toHaveLength(EXCLUSION_PATH_BUDGET);
    expect(plan.overflow).toEqual([]);
    expect(plan.paths[0]).toBe(join('/repo', '.git'));
    expect(plan.paths[7]).toBe(join('/repo', 'd06'));
  });

  it('NEVER exceeds the budget, and sends the rest to userspace instead', () => {
    // The whole point. At nine plain paths macOS returns false and applies
    // ZERO exclusions, including .git, so the eighth is a hard ceiling.
    for (const n of [8, 9, 12, 30]) {
      const plan = planWorktreeIgnore('/repo', rels(n));
      expect(plan.paths.length).toBeLessThanOrEqual(EXCLUSION_PATH_BUDGET);
      expect(plan.paths).toHaveLength(EXCLUSION_PATH_BUDGET);
      expect(plan.overflow).toHaveLength(n - (EXCLUSION_PATH_BUDGET - 1));
      // Nothing is lost: every root is either a path or a glob.
      expect(plan.ignore).toHaveLength(n + 1);
    }
  });

  it('keeps rank order, so the loudest roots get the kernel slots', () => {
    const plan = planWorktreeIgnore('/repo', ['loud', 'medium', ...rels(8)]);
    expect(plan.paths[1]).toBe(join('/repo', 'loud'));
    expect(plan.paths[2]).toBe(join('/repo', 'medium'));
    expect(plan.overflow[0]!.source).toBe(overflowMatcher('d05').source);
  });

  it('writes an overflow entry as a RegExp, which consumes no slot', () => {
    const plan = planWorktreeIgnore('/repo', [...rels(7), 'python/venv']);
    expect(plan.overflow).toHaveLength(1);
    const m = plan.overflow[0]!;
    expect(m).toBeInstanceOf(RegExp);
    // No flags, because wrapper.js throws on any flag at all: the native
    // matcher cannot honour one.
    expect(m.flags).toBe('');
    // Relative and anchored, because the matcher is run against the path
    // relative to the watch root. An absolute one would match nothing.
    expect(m.source.startsWith('^/')).toBe(false);
    expect(excludes(m, 'python/venv')).toBe(true);
    expect(excludes(m, 'python/venv/lib/site.py')).toBe(true);
    expect(excludes(m, 'python/venv-old/lib/site.py')).toBe(false);
    expect(excludes(m, 'src/python/venv/lib/site.py')).toBe(false);
  });
});

/**
 * THE HOSTILE NAME LANE, and it is the reason this file was rewritten.
 *
 * Until the Phase 151 fix round an overflow entry was the string
 * `${rel}/**`, built from a raw directory name and handed to `picomatch`. A
 * directory name is a LITERAL and a glob is a PATTERN, so a root named
 * `!archive` compiled to a negation that excluded the whole worktree and the
 * repository went blind, and a root named `build (old)` compiled to a capture
 * group that excluded a real tracked `build old/` instead of itself. Neither
 * was caught, because nothing here or in `npm run conformance:watcher` ever
 * asked what a produced entry MATCHES.
 *
 * Every row below is a name a person can really create, on a case insensitive
 * file system that permits all of them.
 */
describe('overflowMatcher on a name that is not a plain identifier', () => {
  const hostile: ReadonlyArray<{ name: string; sibling: string }> = [
    // The one that blinded the whole tree: picomatch read `!` as negation.
    { name: '!archive', sibling: 'archive' },
    // The ordinary one: parentheses became a capture group.
    { name: 'build (old)', sibling: 'build old' },
    // Brace expansion invented two directories that were not the name.
    { name: '{x,src}', sibling: 'src' },
    // An extglob excluded the real `src`.
    { name: '@(src)', sibling: 'src' },
    // A star matched a sibling whose name merely fits the pattern.
    { name: 'nor*mal', sibling: 'normal' },
    // A dot is a metacharacter too, and this shape is common.
    { name: '.tmp', sibling: 'atmp' },
    // A character class, and a name that is only metacharacters.
    { name: '[cache]', sibling: 'c' },
    { name: 'a+b', sibling: 'aab' }
  ];

  for (const { name, sibling } of hostile) {
    it(`treats ${JSON.stringify(name)} as a literal, not a pattern`, () => {
      const m = overflowMatcher(name);
      // It excludes the directory it names, and everything under it.
      expect(excludes(m, name)).toBe(true);
      expect(excludes(m, `${name}/deep/file.bin`)).toBe(true);
      // It does not touch the sibling the old glob confused it with.
      expect(excludes(m, sibling)).toBe(false);
      expect(excludes(m, `${sibling}/keep.txt`)).toBe(false);
      // It does not blind the repository, which `!archive` really did.
      expect(excludes(m, 'src/main.ts')).toBe(false);
      expect(excludes(m, 'README.md')).toBe(false);
      expect(excludes(m, '')).toBe(false);
      // It is anchored, so a nested directory of the same name is untouched.
      expect(excludes(m, `vendor/${name}/file.bin`)).toBe(false);
      // And it is a RegExp with no flags, which is what wrapper.js requires.
      expect(m.flags).toBe('');
    });
  }

  it('never compiles to something that matches every path in the tree', () => {
    // The exact failure shape of the defect, stated as its own rule so a
    // later round cannot reintroduce it by a different route.
    for (const { name } of hostile) {
      const m = overflowMatcher(name);
      const everything = ['a', 'a/b', 'src/main.ts', 'x.txt', 'deep/deep/deep/f'];
      expect(everything.some((p) => excludes(m, p))).toBe(false);
    }
  });
});

describe('readIgnoredRoots over a real repository', () => {
  it('reads the ignored directories, ranked, and never the ignored files', async () => {
    execFileSync('git', ['init', '-b', 'main'], { cwd: dir });
    writeFileSync(
      join(dir, '.gitignore'),
      'node_modules/\nscratch/\ndist/\n*.log\n'
    );
    mkdirSync(join(dir, 'node_modules'));
    for (let i = 0; i < 20; i++) {
      writeFileSync(join(dir, 'node_modules', `p${i}`), 'x');
    }
    mkdirSync(join(dir, 'scratch'));
    writeFileSync(join(dir, 'scratch', 'a'), 'x');
    mkdirSync(join(dir, 'dist'));
    writeFileSync(join(dir, 'dist', 'a'), 'x');
    writeFileSync(join(dir, 'debug.log'), 'x');

    const roots = await readIgnoredRoots(dir);
    expect(roots).toEqual(['node_modules', 'dist', 'scratch']);
    expect(roots).not.toContain('debug.log');
  });

  it('answers with an empty list for a directory that is not a repository', async () => {
    // Which leaves the watcher exactly as it was before this phase.
    expect(await readIgnoredRoots(dir)).toEqual([]);
  });
});

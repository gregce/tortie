/**
 * The probe half of `npm run conformance:watcher` (Phase 151).
 *
 * It prints, as JSON, what the worktree exclusion planner produces for a
 * range of ignored root counts, so the checker beside it
 * (`conformance-watcher.mjs`) can assert the eight path budget executably
 * rather than by reading the constant. It also asks every overflow entry what
 * it actually MATCHES, over a set of directory names that are not plain
 * identifiers, which is the half the first version of this gate was missing.
 *
 * IT SPAWNS NOTHING. It opens no FSEvents stream, starts no tmux server,
 * launches no Electron, runs no git and touches nothing under the person's
 * home. It imports three pure functions and calls them on synthetic input.
 */

import {
  EXCLUSION_PATH_BUDGET,
  overflowMatcher,
  parseIgnoredRoots,
  planWorktreeIgnore
} from '../src/main/watcher/ignored-roots';

const COUNTS = [0, 1, 6, 7, 8, 9, 12, 30, 100];

const rels = (n: number): string[] =>
  Array.from({ length: n }, (_, i) => `root${String(i).padStart(3, '0')}`);

/**
 * Ask an overflow matcher the question the watcher really asks it.
 *
 * `node_modules/@parcel/watcher/wrapper.js` takes the RegExp's SOURCE, wraps
 * it as `^[\s\S]*(?:<source>)[\s\S]*$` so the C++ side's full string
 * `std::regex_match` behaves like `.test()`, and `Watcher::isIgnored` runs the
 * result against the path RELATIVE to the watch root.
 */
const excludes = (m: RegExp, rel: string): boolean =>
  new RegExp(`^[\\s\\S]*(?:${m.source})[\\s\\S]*$`).test(rel);

/**
 * Directory names a person can really create, each one previously miscompiled
 * when an overflow entry was the glob string `<name>/**`. The sibling is the
 * innocent directory the old glob hit instead.
 */
const HOSTILE: ReadonlyArray<{ name: string; sibling: string }> = [
  { name: '!archive', sibling: 'archive' },
  { name: 'build (old)', sibling: 'build old' },
  { name: '{x,src}', sibling: 'src' },
  { name: '@(src)', sibling: 'src' },
  { name: 'nor*mal', sibling: 'normal' },
  { name: '.tmp', sibling: 'atmp' },
  { name: '[cache]', sibling: 'c' },
  { name: 'a+b', sibling: 'aab' }
];

/** Paths that must NEVER be excluded by any single ignored root. */
const NEVER = ['src/main.ts', 'README.md', 'a', 'a/b', 'deep/deep/f'];

process.stdout.write(
  JSON.stringify({
    budget: EXCLUSION_PATH_BUDGET,
    plans: COUNTS.map((n) => {
      const plan = planWorktreeIgnore('/repo', rels(n));
      return {
        roots: n,
        paths: plan.paths.length,
        overflow: plan.overflow.length,
        ignore: plan.ignore.length,
        dotGitFirst: plan.paths[0] === '/repo/.git',
        // Every overflow entry is a RegExp with no flags: wrapper.js throws on
        // any flag, and a plain string would be routed back to the
        // CoreServices array and would consume a slot.
        overflowAreRegExps: plan.overflow.every(
          (m) => m instanceof RegExp && m.flags === ''
        ),
        // Relative, because the matcher runs against the path relative to the
        // watch root. An absolute one matches nothing at all.
        overflowRelative: plan.overflow.every((m) => !m.source.startsWith('^/'))
      };
    }),
    // What an overflow entry MATCHES, which is the question that matters.
    hostile: HOSTILE.map(({ name, sibling }) => {
      const m = overflowMatcher(name);
      return {
        name,
        sibling,
        source: m.source,
        self: excludes(m, name),
        deep: excludes(m, `${name}/deep/file.bin`),
        hitsSibling: excludes(m, sibling) || excludes(m, `${sibling}/keep.txt`),
        hitsNested: excludes(m, `vendor/${name}/file.bin`),
        hitsAnythingElse: NEVER.some((p) => excludes(m, p))
      };
    }),
    // The parser is the other place a slot can be wasted: an ignored FILE
    // must never consume one.
    parsed: parseIgnoredRoots(
      '.claude/\0.env\0bin/\0plane/node_modules/\0runstory\0scratch/\0.git/\0'
    )
  })
);

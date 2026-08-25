/**
 * The worktree watcher's exclusion set (Phase 151).
 *
 * WHY THIS EXISTS. `RepoWatcher` subscribes the whole worktree with `.git`
 * excluded and nothing else, so a directory the repository itself ignores is
 * still inside the stream. On 2026-08-25 the operator ran `go test` in a
 * repository whose `scratch/` directory was being filled and emptied by a
 * probe cloning a CLI tree, and Tortie logged dozens of lines reading "Events
 * were dropped by the FSEvents client. File system must be re-scanned."
 * Measured the same day on a scratch repository of the same shape, four
 * workers copying and deleting an 800 file tree inside an ignored directory,
 * 30 seconds of churn for each row:
 *
 *     exclusion form                events reaching JS   our own CPU
 *     none beyond `.git`, today     178,208              9.06 s
 *     6 kernel paths                1                    0.03 s
 *     9 kernel paths, cap fails     1                    0.87 s
 *     globs only, userspace         1                    2.03 s
 *
 * THE EXCLUSION IS KERNEL SIDE, which is why it is worth this much care.
 * `node_modules/@parcel/watcher/src/macos/FSEventsBackend.cc` line 245 calls
 * `FSEventStreamSetExclusionPaths`, so a path excluded there never enters the
 * stream at all. Line 108 is a second, userspace filter that runs after
 * delivery, and that is where a glob is matched instead.
 *
 * THE BUDGET, AND IT IS THE WHOLE REASON THIS FILE IS NOT THREE LINES.
 * `FSEventStreamSetExclusionPaths` accepts at most EIGHT paths, and above
 * that it does NOT truncate. Measured on 2026-08-25 with a C program written
 * against CoreServices directly, 24 sibling directories under one root, the
 * first N excluded and a file touched in every one:
 *
 *     paths passed   returned   excluded directories actually suppressed
 *     0              false      0
 *     4              true       4
 *     7              true       7
 *     8              true       8
 *     9              FALSE      0
 *     12             FALSE      0
 *     20             FALSE      0
 *
 * At nine the call returns false and ZERO exclusions apply, including the
 * `.git` one that has shipped since the first version of this watcher.
 * `FSEventsBackend.cc` line 247 never checks the return value, the stream
 * still starts, and nothing is logged. So passing "all the ignored roots" to
 * a repository with nine of them would have made that repository strictly
 * worse than it is today. Only the COUNT matters: a path that does not exist,
 * a relative path, a path outside the watched root and a duplicate are all
 * accepted and all consume a slot.
 *
 * WHAT THE OVERFLOW DOES INSTEAD. `node_modules/@parcel/watcher/wrapper.js`
 * routes a plain string to `ignorePaths`, which becomes the CoreServices
 * array, and routes a glob string or a RegExp to `ignoreGlobs`, which
 * `Watcher::isIgnored` in `node_modules/@parcel/watcher/src/Watcher.cc` line
 * 234 matches with `std::regex_match` against the path relative to the watch
 * root. An overflow entry therefore does NOT consume a slot, and it still
 * keeps the events out of JavaScript. It is not free: in the table above a
 * kernel path cost 0.03 CPU seconds, a userspace entry cost 2.03, and no
 * exclusion at all cost 9.06. So the overflow is much better than nothing and
 * much worse than a slot, which is exactly why the plan below spends every
 * slot first and only then falls back.
 *
 * AN OVERFLOW ENTRY IS A REGEXP AND NEVER A GLOB STRING, and this is the
 * correction the Phase 151 verifier forced. A directory name is a LITERAL and
 * a glob is a PATTERN, so building `<name>/**` out of a raw directory name
 * hands the name to `picomatch` as source code. Driven end to end over real
 * FSEvents against a repository with eleven ignored roots, five real edits to
 * a tracked file, 600 ms apart:
 *
 *     overflow entry built as   the directory it really excluded   edits seen
 *     `!archive/**`             the WHOLE worktree                 0 of 5
 *     `build (old)/**`          a real tracked `build old/`        0 of 5
 *     `{x,src}/**`              `x/` and `src/`                    n/a
 *     `@(src)/**`               `src/`                             n/a
 *     `nor*mal/**`              `normal/` as well as `nor*mal/`    n/a
 *
 * The first row is the worst of them. `picomatch` reads the leading `!` as
 * negation and compiles a pattern matching every path in the tree EXCEPT
 * `archive/**`, so the repository goes blind and nothing at all is logged.
 * This is not a distant corner: the operator's own checkout has eight ignored
 * roots today, `.git` takes the first slot, and one root already falls to the
 * overflow on every start.
 *
 * So `overflowMatcher` escapes the name and anchors it, and the RegExp branch
 * of the wrapper carries it to the same userspace matcher at the same zero
 * slot cost. The four hostile names above then exclude the directory they are
 * named after and nothing else.
 *
 * The third row of the CPU table is worth reading twice. At nine paths the
 * kernel exclusion fails completely, and the only thing holding the CPU
 * number down is the userspace filter at line 108 running over `ignorePaths`
 * after delivery. That is 29 times the cost of the slot it replaced, and it
 * does nothing for what the kernel exclusion is really for, which is keeping
 * `.git`'s own object writes out of the stream before they are ever
 * delivered.
 *
 * THE LIMIT, NAMED RATHER THAN ENGINEERED AROUND. `FSEventStreamSetExclusionPaths`
 * can only be called before the stream starts, so the exclusion set is fixed
 * for the life of the subscription. A directory that becomes ignored AFTER
 * the watcher started, being the `node_modules` that appears when somebody
 * runs `npm install`, is not excluded until that watcher restarts. Tortie
 * does not re-subscribe to fix that, because a re-subscribe has a gap in
 * which real events are lost, and the cost of not doing it is noise rather
 * than a missed change.
 */

import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { runGit } from '../git/exec';

/**
 * How many PLAIN STRING entries an `ignore` array may carry, total, forever.
 * The measurement above is the whole justification, and `npm run
 * conformance:watcher` is what keeps a later round from adding a ninth.
 */
export const EXCLUSION_PATH_BUDGET = 8;

/** The git read is off the request path, but it must never hang a watcher. */
const IGNORED_ROOTS_TIMEOUT_MS = 5_000;

/** What the plan hands to `watcher.subscribe`, plus what it had to give up. */
export interface WorktreeIgnorePlan {
  /**
   * The `ignore` array itself: plain absolute paths first, then any overflow
   * matchers. Pass this straight through.
   */
  readonly ignore: (string | RegExp)[];
  /** The plain paths, which are the ones that consume a CoreServices slot. */
  readonly paths: string[];
  /**
   * The overflow matchers, run in userspace against the path relative to the
   * watch root. They consume no CoreServices slot.
   */
  readonly overflow: RegExp[];
}

/**
 * Parse `git ls-files --others --ignored --exclude-standard --directory
 * --no-empty-directory -z`.
 *
 * The command lists ignored FILES as well as ignored directories: on a
 * repository ignoring `*.log` it prints `build/`, `debug.log` and
 * `other.log`. Only the directory entries are kept, because a slot spent on
 * one log file is a slot wasted and a single file does not produce churn.
 * Directory entries are the ones git terminates with a slash.
 *
 * Returns repository relative POSIX paths with the trailing slash removed.
 */
export function parseIgnoredRoots(stdout: string): string[] {
  const out: string[] = [];
  for (const raw of stdout.split('\0')) {
    if (!raw.endsWith('/')) continue;
    const rel = raw.slice(0, -1);
    if (rel.length === 0 || rel === '.git') continue;
    out.push(rel);
  }
  return out;
}

/**
 * Rank the candidates so the seven that get a slot are the seven most likely
 * to be the loud ones: MOST DIRECT ENTRIES FIRST, then path ascending.
 *
 * One non recursive `readdir` per candidate, measured at 0.37 ms for twelve
 * directories of this repository, so the ranking is free, and it is
 * deterministic, which is what makes it testable.
 *
 * BE HONEST THAT IT IS A PROXY. Direct entries are not file counts. A
 * `node_modules` scores well because it really does hold hundreds of packages
 * side by side, but a `venv` or a `target` holds its thousands of files
 * several levels down and scores about five, so it can be ranked last on a
 * repository where it is the loudest thing there is. Counting recursively
 * instead would mean walking the very directories this exists to avoid, on
 * every watcher start, which costs more than it saves. The overflow fallback
 * is what makes a wrong ranking cost 2.03 CPU seconds instead of 9.06, rather
 * than costing a missed exclusion, and that is the reason it is acceptable to
 * be wrong here. That sentence is only true because an overflow entry is an
 * anchored escaped literal: while it was a glob string it could cost a missed
 * exclusion, and on one name it cost the whole worktree.
 */
export function rankIgnoredRoots(
  watchRoot: string,
  rels: readonly string[]
): string[] {
  const scored = rels.map((rel) => {
    let entries = 0;
    try {
      entries = readdirSync(join(watchRoot, ...rel.split('/'))).length;
    } catch {
      // Gone, or unreadable. It still deserves an exclusion, it just sorts
      // last among equals rather than failing the whole plan.
      entries = 0;
    }
    return { rel, entries };
  });
  scored.sort((a, b) =>
    b.entries !== a.entries ? b.entries - a.entries : a.rel < b.rel ? -1 : 1
  );
  return scored.map((s) => s.rel);
}

/**
 * Escape every regular expression metacharacter, so a directory NAME is read
 * as the literal text it is rather than as a pattern.
 *
 * The set is the ECMAScript one, being `. * + ? ^ $ { } ( ) | [ ] \`. A
 * slash is not in it because it is not a metacharacter; `RegExp.prototype
 * .source` writes it back out as `\/` anyway, and the C++ `std::regex` on the
 * other side of the wrapper accepts that, proved by a real subscription that
 * suppressed every event under a nested root.
 */
function escapeRegExp(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * The matcher for one ignored root that did not fit in the eight slots.
 *
 * It matches the directory itself and everything beneath it, and nothing
 * else, which is exactly what a CoreServices exclusion path does: `isIgnored`
 * in `node_modules/@parcel/watcher/src/Watcher.cc` line 219 accepts a plain
 * path when the event path equals it or begins with it plus a separator, and
 * `(?:/|$)` is that same rule written for the userspace side.
 *
 * The anchor matters as much as the escaping. `wrapper.js` wraps the source
 * as `^[\s\S]*(?:<source>)[\s\S]*$` to give the C++ full string matcher
 * JavaScript's substring semantics, so a matcher with no leading `^` would
 * exclude `vendor/node_modules` as well as `node_modules`.
 */
export function overflowMatcher(rel: string): RegExp {
  return new RegExp(`^${escapeRegExp(rel)}(?:/|$)`);
}

/**
 * Turn `.git` plus the ranked ignored roots into the `ignore` array.
 *
 * `.git` is ALWAYS the first plain path and is never demoted to the overflow:
 * the targeted dotgit watcher exists precisely because the worktree watcher
 * must not see that subtree, and a userspace matcher would let every object
 * write reach JavaScript first.
 *
 * Everything that fits in the remaining slots becomes a plain absolute path.
 * Everything past them becomes an anchored escaped RegExp, which the wrapper
 * routes to the userspace matcher and which therefore consumes no slot.
 */
export function planWorktreeIgnore(
  watchRoot: string,
  rankedRels: readonly string[]
): WorktreeIgnorePlan {
  const paths: string[] = [join(watchRoot, '.git')];
  const overflow: RegExp[] = [];
  for (const rel of rankedRels) {
    if (paths.length < EXCLUSION_PATH_BUDGET) {
      paths.push(join(watchRoot, ...rel.split('/')));
    } else {
      overflow.push(overflowMatcher(rel));
    }
  }
  return { ignore: [...paths, ...overflow], paths, overflow };
}

/**
 * Ask the repository which directories it ignores, ranked and ready to plan.
 *
 * `git ls-files --others --ignored --exclude-standard --directory
 * --no-empty-directory` rather than `git status --porcelain --ignored`,
 * because `--directory` stops descending the moment a directory is wholly
 * ignored. Measured on 2026-08-25 on the operator's own repository, the one
 * whose churn started this phase, ls-files took 10 to 30 ms over five runs
 * against 350 to 430 ms for `git status --porcelain --ignored` on the same
 * tree. `status` scales with the number of ignored FILES and this does not.
 *
 * Never throws and never rejects. A repository that is not one, a git that is
 * missing, and a git that hangs all resolve to an empty list, which leaves
 * the watcher exactly as it was before this phase.
 */
export async function readIgnoredRoots(watchRoot: string): Promise<string[]> {
  try {
    const res = await runGit(
      watchRoot,
      [
        'ls-files',
        '--others',
        '--ignored',
        '--exclude-standard',
        '--directory',
        '--no-empty-directory',
        '-z'
      ],
      { timeoutMs: IGNORED_ROOTS_TIMEOUT_MS }
    );
    if (res.code !== 0) return [];
    return rankIgnoredRoots(watchRoot, parseIgnoredRoots(res.stdout.toString('utf8')));
  } catch {
    return [];
  }
}

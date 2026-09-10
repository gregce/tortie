/**
 * THE FILESYSTEM HALF OF THE DOOR SEQUENCE (Phase 247).
 *
 * `src/shared/path-doors.ts` decides; this turns a spelling into the facts it
 * decides from. It is the ONLY module that does, and it has exactly two
 * callers: the classify arm of `drop:prepare`, which answers a hover, and
 * `fs:openExternalPath`, which is the one door that leaves Tortie and which
 * re-asks everything here before a byte of it reaches macOS.
 *
 * ## Metadata only, and that is the whole point
 *
 * `lstat`, `realpath` and `stat`. Nothing here opens a file, reads a byte,
 * follows a directory or writes anything, because it runs on a POINTER MOVING
 * over a terminal pane and research 107 refusal 3 says a hover never writes.
 * The one directory read anywhere in this file is the bundle probe's `stat` of
 * `Contents/Info.plist`, which is a metadata call on a name we composed.
 *
 * ## THE STATED LIMIT: a stale automount, and where it really lands
 *
 * `onRefusedMount` is asked of the SPELLING before any call is made and of the
 * REALPATH after one, and neither can stop `realpath` itself following a
 * symlink at an ordinary name onto a mount that is not answering. The three
 * calls below run on the libuv THREADPOOL rather than on main, so what that
 * costs is a pool thread and not the app — four of them at once would starve
 * the pool and stall main's other filesystem work, which is the honest shape
 * of it. There is no timeout to give a `realpath`, the corpus holds none of
 * these, and this is written down rather than guarded because a guard that
 * cannot be written should not be described as one.
 *
 * ## Why the answer is cached in the RENDERER and re-asked HERE
 *
 * A hover answer is a cache: the file at a spelling can be replaced between
 * the underline being drawn and the click landing. So the renderer's copy
 * decides only whether to draw an underline, and every acting caller asks
 * again. Phase 235 is the precedent for where a guard goes — `fs:reveal` is
 * ungated in main and its rule lives at every call site, and that shape needed
 * six doors and three rounds inside one phase to hold.
 */

import { lstat, realpath, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import type { PathDoorAnswer, PathFacts } from '@shared/path-doors';
import {
  decidePathDoor,
  hasControlCharacter,
  onRefusedMount,
  usableBase
} from '@shared/path-doors';

/** Longer than any path this Mac can hold; a guard against a pathological row. */
const MAX_SPELLING = 1024;

/**
 * Expand a leading `~/`, which is the one decoration the renderer leaves
 * alone because expanding it needs a home directory and only main has one.
 *
 * A pane whose session runs on another machine offers no path links at all
 * (research 107 refusal 5), so the home this expands against is the only home
 * in play.
 */
export function expandHome(spelling: string): string {
  if (spelling === '~') return homedir();
  if (spelling.startsWith('~/')) return homedir() + spelling.slice(1);
  return spelling;
}

/**
 * A macOS bundle: a DIRECTORY carrying an extension, or one holding
 * `Contents/Info.plist`.
 *
 * Main's own `isAppBundleOnDisk` in ./open-with.ts tests `.app` and a
 * directory, and would not catch a bundle wearing a `.png` suffix. This one
 * does, and the regular-file test below it catches every bundle anyway — the
 * two overlap on purpose so the refusal WORD is true.
 */
async function looksLikeBundle(real: string, isDir: boolean): Promise<boolean> {
  if (!isDir) return false;
  const name = real.slice(real.lastIndexOf('/') + 1);
  const dot = name.lastIndexOf('.');
  if (dot > 0) return true;
  try {
    return (await stat(join(real, 'Contents', 'Info.plist'))).isFile();
  } catch {
    return false;
  }
}

/**
 * What is really at this spelling. Every field is about the REALPATH, leaf
 * included, which is research 107 refusal 10: `stat` follows a link and
 * comparing spellings does not mean what it says.
 */
export async function factsForPath(spelling: string): Promise<PathFacts> {
  const missing: PathFacts = {
    spelling,
    realPath: null,
    kind: 'missing',
    bundle: false,
    executable: false,
    // `answerPathDoor` owns this field; nothing here knows how a spelling was
    // made, which is the whole shape of the split.
    resolvedFrom: null
  };
  if (spelling.length === 0 || spelling.length > MAX_SPELLING) return missing;
  if (hasControlCharacter(spelling)) return missing;
  if (!spelling.startsWith('/')) return missing;
  // The word for this comes from the pure decision; what matters HERE is
  // that no call is made, because a stale automount hangs the caller.
  if (onRefusedMount(spelling)) return missing;
  try {
    // lstat first, so a dangling link answers `missing` rather than throwing
    // out of `realpath` with a different errno on a different macOS.
    await lstat(spelling);
    const real = await realpath(spelling);
    // Asked AGAIN, of the realpath: a symlink at an ordinary name is what
    // carries a path onto a mount without ever spelling one, and `stat` of a
    // path on a mount that is not answering is the call this stops. The WORD
    // for it comes from the pure decision, which asks the same question.
    if (onRefusedMount(real)) return { ...missing, realPath: real };
    const st = await stat(real);
    const kind: PathFacts['kind'] = st.isDirectory()
      ? 'dir'
      : st.isFile()
        ? 'file'
        : 'other';
    return {
      spelling,
      realPath: real,
      kind,
      bundle: await looksLikeBundle(real, st.isDirectory()),
      executable: (st.mode & 0o111) !== 0,
      resolvedFrom: null
    };
  } catch {
    return missing;
  }
}

/**
 * A RELATIVE SPELLING JOINED TO THE PANE'S OWN BASE (Phase 250).
 *
 * The operator asked for this directly on 2026-09-09, having read why three
 * quarters of what his agents print does nothing: *"i also would like to
 * attempt to resolve relative paths since we know what project a session is
 * in and agents will normally refer to path."*
 *
 * ## Which base, and how right it is
 *
 * Research 114 section 4 measured the three candidates over his own 29 live
 * panes — the session's `projectPath`, tmux's `#{pane_current_path}`, and the
 * directory the agent was launched in — and found them **the same string on 29
 * of 29**, with the manifest agreeing on 229 of its 235 rows. So there is no
 * disagreement to arbitrate, and the one already in the renderer's hands is
 * the one used: `sessionRow()?.projectPath`.
 *
 * Against an oracle inside his own transcripts — a relative target whose own
 * pane also prints the same tail absolutely — the base is **right on 132 of
 * 156 (84.6%)**. The click-level reading is the one that matters, because a
 * base that is wrong about a path that does not exist costs nothing: **115 of
 * the 156 draw no link at all**, and of the **41 links drawn, 39 open the file
 * the text names and 2 open a different one — 4.9%, Clopper-Pearson 0.60% to
 * 16.53%**. Seven in ten relative targets open nothing under ANY base, which
 * is why a wrong base overwhelmingly fails closed.
 *
 * ## THE STATED LIMIT, and it is his own workflow rather than a hypothetical
 *
 * Both measured wrong opens are one shape: **a subagent working in a worktree
 * under a scratch root prints a path relative to the worktree, the pane's
 * session is the checkout, and the click opens the other copy of the same
 * file.** It is a real file with the right name and the wrong tree, which is
 * the worst kind of wrong open because it looks right. `#{pane_current_path}`
 * does not see it either — the pane's foreground process never moved — so no
 * choice of base among the three would have caught it. The lever if one in
 * twenty is judged too many is research 114 section 4.6's third narrowing, a
 * pane-wide index of absolute spellings that refuses a relative span the pane
 * has already printed under a DIFFERENT base; it removes both, at 0.2% of
 * links, and it is priced rather than built.
 *
 * ## Two clauses, and neither is in this function
 *
 * A resolved path must still be inside its base, and it may never take the Mac
 * door. Both live in the pure `decidePathDoor`, reached through
 * `PathFacts.resolvedFrom`, because a resolved path is asked EVERY question an
 * absolute one is asked — of its realpath, leaf included. A base is not a
 * bypass.
 */
async function resolveAgainstBase(
  spelling: string,
  base: string | undefined
): Promise<{ path: string; base: string } | null> {
  if (base === undefined || !usableBase(base)) return null;
  // A `~` spelling means a home directory, not a name inside the project, and
  // `expandHome` has already had its chance at it. Joining `~foo/bar` to a
  // project root would invent a path nobody named.
  if (spelling.startsWith('~')) return null;
  if (spelling.length === 0) return null;
  // NOTHING ELSE ABOUT THE SPELLING IS ASKED HERE. Its length, its control
  // characters, its mount and everything the realpath says are `factsForPath`'s
  // and `decidePathDoor`'s, of the JOINED spelling, which is what keeps the
  // refusal word naming the clause that really refused: a relative path with a
  // newline in it answers `control-character` rather than `not-absolute`.
  // `resolve` is pure string arithmetic and makes no call, so a spelling that
  // is going to be refused is refused before any syscall either way.
  // The base's own realpath, so containment compares two spellings of the same
  // tree: on this Mac `/tmp` is a symlink to `/private/tmp`, and a project
  // reached through one would otherwise contain nothing at all. When it cannot
  // be taken the literal base is kept — a file under a base that is not there
  // cannot exist either, so the sequence answers `missing` first.
  let root = base;
  try {
    root = await realpath(base);
  } catch {
    // ...and it stays the literal base.
  }
  return { path: resolve(base, spelling), base: root };
}

/**
 * The whole sequence: expand, join a relative spelling to the base when there
 * is one, read the facts, decide.
 *
 * The `spelling` handed to `decidePathDoor` is the EXPANDED and RESOLVED one,
 * so a `~/x` that expands to an absolute path is judged as absolute, a
 * relative one that was joined arrives absolute, and one that could not be
 * joined is still refused by the first clause. **That clause is untouched and
 * stays the backstop**: nothing reaches a door without an absolute spelling.
 */
export async function answerPathDoor(
  raw: string,
  base?: string
): Promise<PathDoorAnswer> {
  const spelling = expandHome(raw);
  if (!spelling.startsWith('/')) {
    const joined = await resolveAgainstBase(spelling, base);
    if (joined !== null) {
      const facts = await factsForPath(joined.path);
      return decidePathDoor({
        ...facts,
        spelling: joined.path,
        resolvedFrom: joined.base
      });
    }
  }
  const facts = await factsForPath(spelling);
  return decidePathDoor({ ...facts, spelling, resolvedFrom: null });
}

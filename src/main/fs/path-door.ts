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
import { join } from 'node:path';
import type { PathDoorAnswer, PathFacts } from '@shared/path-doors';
import {
  decidePathDoor,
  hasControlCharacter,
  onRefusedMount
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
    executable: false
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
      executable: (st.mode & 0o111) !== 0
    };
  } catch {
    return missing;
  }
}

/**
 * The whole sequence: expand, read the facts, decide.
 *
 * The `spelling` handed to `decidePathDoor` is the EXPANDED one, so a `~/x`
 * that expands to an absolute path is judged as absolute and a spelling that
 * is still relative afterwards is refused by the first clause.
 */
export async function answerPathDoor(raw: string): Promise<PathDoorAnswer> {
  const spelling = expandHome(raw);
  const facts = await factsForPath(spelling);
  return decidePathDoor({ ...facts, spelling });
}

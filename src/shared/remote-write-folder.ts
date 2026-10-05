/**
 * Which folder Tortie may write under on another machine (Phase 336).
 *
 * ## What this module decides, and who asks it
 *
 * A project open on a CONFIRMED machine is a folder Tortie may write under, the
 * way a project open on this Mac is (his ruling of 4 October 2026, research 138
 * section 9: "I don't want any grants. I want it to act like i'm operating it
 * locally."). Main asks this module before it composes any write, in
 * `src/main/machines/write-folder.ts`, and the renderer asks the SAME function
 * to decide whether a tab is an edit surface, so the two cannot disagree about
 * one path. Main is the safeguard; the renderer only draws.
 *
 * It is pure. It imports nothing and names no `node:` module, because the
 * renderer imports it.
 *
 * ## The order is the decision (build/p336/SPEC.md D2, §Attack G4)
 *
 *  1. A legacy `writeRoot` that holds the target is chosen first, whatever
 *     projects lie inside it. That is today's bound byte for byte: no pin, the
 *     far texts' legacy branch, and no never-list. Without this a project
 *     opened inside a legacy root would take the write and subject it to a pin
 *     that refuses an ordinary re-clone, which is a scenario worse than today.
 *  2. Otherwise the DEEPEST open project that holds the target and is not on
 *     the never-list.
 *  3. Otherwise `never`, naming the deepest never-listed project that holds it,
 *     when only never-listed projects hold it; else `outside`.
 *
 * ## The text is for choosing, and the stored path is what crosses
 *
 * Comparisons resolve both sides the way `posix.resolve` does for an absolute
 * path (a `.` step dropped, a `..` step climbing, a doubled or trailing slash
 * collapsed), with the separator required, no case fold and no Unicode
 * normalisation: it is a path comparison, and `conformance:samefolder` rule 23
 * is why it folds nothing. The answer's `path` is the candidate's STORED string
 * byte for byte, because that is the string the far side resolves physically,
 * the key its pin is stored under and the folder positional that crosses.
 *
 * ## The reserved names are a NAME match, and that is a different question
 *
 * `.git` and `.ssh` are refused in every writer in any case and in every
 * spelling an APFS volume folds to them (research 138 section 9, §Attack G3 and
 * M5): `.SSH`, `.Ssh`, `.ßh`, `.ſsh`, `.ẞh` and the rest are ONE folder on this
 * Mac's data volume. {@link foldReservedSegment} folds a name for that question
 * and for no other. No folder identity is decided by it.
 */

/** The two folder names Tortie never writes in on another machine. */
export const REMOTE_PROTECTED_SEGMENTS: readonly ['.git', '.ssh'] = ['.git', '.ssh'];

/**
 * Zero-width and format characters, stripped before the reserved-name match.
 *
 * Soft hyphen, the zero-width space, joiners and marks, the bidirectional
 * embeddings, the invisible operators and the byte order mark, plus every
 * other `Cf` character. A volume that ignores one of these in a name (HFS+
 * ignores several) would read `.g<ZWJ>it` as `.git`, and stripping them costs
 * only a refusal of a name nobody types.
 */
const FORMAT_CHARS =
  /[\p{Cf}­​-‏‪-‮⁠-⁯﻿]/gu;

/**
 * One path segment folded for the reserved-name question. PURE.
 *
 * NFKC (so the long s and the fullwidth forms become their plain letters),
 * then the format characters stripped, then lower case, then `ß` to `ss` (the
 * capital sharp s lower-cases to `ß` first). §Attack M5 validated it against
 * what this Mac's volume really folds: 13 reserved spellings caught, 12
 * near-misses (`.github`, `x.git`, `.gitignore`, the dotless `.gıt`, `.config`)
 * passed, none wrong.
 */
export function foldReservedSegment(segment: string): string {
  return segment
    .normalize('NFKC')
    .replace(FORMAT_CHARS, '')
    .toLowerCase()
    .replace(/ß/g, 'ss');
}

/**
 * True when any segment of `rel` folds to `.git` or `.ssh`. PURE.
 *
 * It is asked of every relative path a verb names, both ends of a rename,
 * every staged path and every cwd relative part, before anything is composed.
 * An absolute path is split the same way, so a folder can be asked too.
 */
export function isProtectedRemotePath(rel: string): boolean {
  if (rel.length === 0) return false;
  return rel.split('/').some((segment) => {
    const folded = foldReservedSegment(segment);
    return REMOTE_PROTECTED_SEGMENTS.some((name) => name === folded);
  });
}

/**
 * An absolute path resolved the way `posix.resolve` resolves one, or null for
 * a path that is not absolute. PURE.
 *
 * It exists because this module may import no `node:` module. For an absolute
 * input it answers what `posix.resolve` answers: a `.` and an empty segment
 * dropped, a `..` climbing one segment and staying at `/` there, no trailing
 * slash except on `/` itself. It never follows a link, and must not: a link on
 * another computer cannot be followed from this one.
 */
export function resolveRemotePath(path: string): string | null {
  if (path.length === 0 || !path.startsWith('/')) return null;
  const out: string[] = [];
  for (const segment of path.split('/')) {
    if (segment.length === 0 || segment === '.') continue;
    if (segment === '..') {
      out.pop();
      continue;
    }
    out.push(segment);
  }
  return `/${out.join('/')}`;
}

/** The segments of a resolved absolute path; `/` has none. */
function segmentsOf(resolved: string): string[] {
  return resolved === '/' ? [] : resolved.slice(1).split('/');
}

/**
 * True for a folder Tortie never writes under on another machine. PURE.
 *
 * Judged on the RESOLVED text, so a `.` or `..` step cannot dodge it:
 *
 *  - `/`;
 *  - `/Users` and `/home`, because a folder HOLDING a home holds every file the
 *    home rule protects;
 *  - a home itself: `/Users/<x>`, `/home/<x>`, `/root`, `/var/root`;
 *  - any path with a segment that folds to `.git` or `.ssh`, because a folder
 *    inside a reserved folder is that folder's contents.
 *
 * Nothing deeper. A folder directly inside a home (`~/dev`, `~/code`) or
 * directly under `/` (`/tmp`, `/workspace`, `/opt`) is a folder Tortie writes
 * under like any other opened project, because his Mac refuses none of them
 * (Phase 336.1, his ruling of 5 October 2026, "Yes, fix it now": only the home
 * folder itself, a folder holding it, and `/` stay off limits). Phase 336 also
 * refused a home's direct children, which greyed out his project `~/dev` on
 * his Mac Pro.
 *
 * A path that is not absolute is never a folder Tortie writes under either.
 *
 * IT IS A TEXT RULE AND A PRE-FILTER, NOT THE SAFEGUARD. This Mac cannot see
 * the other machine's home or follow a link there, so a project at `/opt/me`
 * that is a link to the far home, or a home that lives somewhere else on that
 * machine, passes it and is caught by the far prelude in
 * `src/main/machines/remote-scripts.ts`, which compares device and inode. The
 * stated cost: `/Users/Shared` is refused as a home, though `/Users/Shared/x`
 * is not. It applies to PROJECT candidates only, never to a legacy
 * `writeRoot` (SPEC D16).
 */
export function neverWriteFolder(path: string): boolean {
  const resolved = resolveRemotePath(path);
  if (resolved === null) return true;
  if (isProtectedRemotePath(resolved)) return true;
  const parts = segmentsOf(resolved);
  if (parts.length === 0) return true;
  const top = parts[0] ?? '';
  // `/Users`, `/home`, and a home under either.
  if (top === 'Users' || top === 'home') return parts.length <= 2;
  // `/root`, a home.
  if (top === 'root') return parts.length === 1;
  // `/var/root`, a home.
  if (top === 'var' && parts[1] === 'root') return parts.length === 2;
  return false;
}

/** Whether a write names a file below the folder or the folder itself. */
export type WriteFolderMode = 'file' | 'folder';

/** The folder a write is bound by, or why there is none. */
export type WriteFolderPick =
  | { readonly path: string; readonly kind: 'project' | 'legacy' }
  | { readonly refused: 'outside' }
  | { readonly refused: 'never'; readonly path: string };

/** What a pick is chosen from: one machine's open projects and its legacy root. */
export interface WriteFolderCandidates {
  /** The STORED paths of that machine's open project rows, nothing else. */
  readonly projects: readonly string[];
  /** The machine row's `writeRoot`, or null. */
  readonly legacyRoot: string | null;
}

/**
 * The target written relative to the folder, or null when the folder does not
 * hold it in this mode. PURE.
 *
 * `file` requires the target STRICTLY below the folder, which is
 * `relativeUnderRoot` in `src/main/machines/remote-file.ts`; `folder` accepts
 * the folder itself and answers the empty string for it, which is
 * `rootRelativeCwd` in `src/main/machines/remote-stage.ts`. Condition 113
 * drives the three over one corpus and requires them to agree.
 */
export function relativeInFolder(
  folder: string,
  target: string,
  mode: WriteFolderMode
): string | null {
  const base = resolveRemotePath(folder);
  const full = resolveRemotePath(target);
  if (base === null || full === null) return null;
  if (full === base) return mode === 'folder' ? '' : null;
  const prefix = base === '/' ? '/' : `${base}/`;
  if (!full.startsWith(prefix)) return null;
  const rel = full.slice(prefix.length);
  return rel.length === 0 ? (mode === 'folder' ? '' : null) : rel;
}

/** How deep a resolved folder sits, for "the deepest holder". */
function depthOf(path: string): number {
  const resolved = resolveRemotePath(path);
  return resolved === null ? -1 : segmentsOf(resolved).length;
}

/**
 * The deepest of `paths` that `holds` answers true for, or null. Ties (two
 * stored spellings of one folder) go to the bytewise-smaller stored string, so
 * the answer never depends on the order the rows arrived in.
 */
function deepest(
  paths: readonly string[],
  holds: (path: string) => boolean
): string | null {
  let best: string | null = null;
  let bestDepth = -1;
  for (const path of paths) {
    if (!holds(path)) continue;
    const depth = depthOf(path);
    if (
      depth > bestDepth ||
      (depth === bestDepth && best !== null && path < best)
    ) {
      best = path;
      bestDepth = depth;
    }
  }
  return best;
}

/** One pick, over a predicate that says whether a folder holds the target. */
function pickBy(
  candidates: WriteFolderCandidates,
  holds: (folder: string) => boolean
): WriteFolderPick {
  const legacy = candidates.legacyRoot;
  if (legacy !== null && legacy.length > 0 && holds(legacy)) {
    return { path: legacy, kind: 'legacy' };
  }
  const open = candidates.projects.filter((path) => !neverWriteFolder(path));
  const chosen = deepest(open, holds);
  if (chosen !== null) return { path: chosen, kind: 'project' };
  const never = candidates.projects.filter((path) => neverWriteFolder(path));
  const refusedAt = deepest(never, holds);
  if (refusedAt !== null) return { refused: 'never', path: refusedAt };
  return { refused: 'outside' };
}

/**
 * The folder one write on another machine is bound by. PURE.
 *
 * The order in this module's header is the decision: a legacy root that holds
 * the target first, then the deepest open project that is not never-listed,
 * then `never` or `outside`.
 */
export function pickWriteFolder(
  target: string,
  candidates: WriteFolderCandidates,
  mode: WriteFolderMode
): WriteFolderPick {
  return pickBy(
    candidates,
    (folder) => relativeInFolder(folder, target, mode) !== null
  );
}

/**
 * The folder a RENAME is bound by: the deepest candidate holding BOTH ends,
 * each strictly below it (the `file` mode, as today). PURE.
 *
 * A rename within one project, or across two nested projects, is held by the
 * innermost folder that holds both ends, and the far link walk below that
 * folder still runs on both. Two ends in two unrelated folders are held by
 * none, and the verb answers that as it always has (`outsideRoot` when the
 * source end is in a folder, `writesOff` when it is in none).
 */
export function pickWriteFolderForPair(
  from: string,
  to: string,
  candidates: WriteFolderCandidates
): WriteFolderPick {
  return pickBy(
    candidates,
    (folder) =>
      relativeInFolder(folder, from, 'file') !== null &&
      relativeInFolder(folder, to, 'file') !== null
  );
}

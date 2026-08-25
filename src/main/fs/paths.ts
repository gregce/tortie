/**
 * Path guards for every fs:* MUTATION channel (Phase 12.9).
 *
 * One function does the whole job — `resolveInsideRoot` — because a guard
 * that can be skipped is not a guard. Every mutation resolves each of its
 * paths through it before touching the disk, and it refuses four families:
 *
 *   1. `..` escapes            'src/../../etc/passwd'
 *   2. absolute paths outside  '/etc/passwd'
 *   3. symlinks out of root    a link inside the project pointing at $HOME,
 *                              including one that only appears in an
 *                              ANCESTOR of a path that does not exist yet
 *   4. `.git` at any depth     source or destination, per shared/fs-ops.ts
 *
 * SYMLINK RULE — parents are resolved, the leaf is not. `realpath` on the
 * leaf would resolve a symlinked FILE to its target, so renaming or trashing
 * a link that points outside the project would be refused (wrong: the link
 * itself lives inside), and worse, a rename could follow the link and write
 * outside. Resolving only the parent chain gives both properties: you cannot
 * reach out of the tree through a directory symlink, and a symlink leaf is
 * treated as the entry it is.
 */

import { realpath } from 'node:fs/promises';
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { isProtectedFsPath } from '@shared/fs-ops';
import { gmuxError } from '../errors';

/** A path that has been proven to live inside the project root. */
export interface ResolvedFsPath {
  /** Absolute, with every parent directory symlink already resolved. */
  abs: string;
  /** Relative to the real root; '' for the root itself. */
  rel: string;
}

function outside(input: string): Error {
  return gmuxError(
    'INVALID_INPUT',
    'That path is outside the project.',
    input
  );
}

function protectedPath(input: string): Error {
  return gmuxError(
    'INVALID_INPUT',
    'Tortie does not touch the .git folder.',
    input
  );
}

/** Containment with a separator, so '/proj-old' is not "inside" '/proj'. */
function containedIn(root: string, candidate: string): boolean {
  if (candidate === root) return true;
  const prefix = root.endsWith(sep) ? root : root + sep;
  return candidate.startsWith(prefix);
}

/**
 * Resolve the deepest EXISTING ancestor of `dir` through realpath, then
 * re-append the segments that do not exist yet. Lets a create/move target
 * that does not exist be checked as strictly as one that does.
 */
async function realpathOfAncestors(dir: string): Promise<string> {
  const missing: string[] = [];
  let current = dir;
  for (;;) {
    try {
      const real = await realpath(current);
      return missing.length === 0
        ? real
        : resolve(real, ...[...missing].reverse());
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT' && code !== 'ENOTDIR') throw err;
    }
    const parent = dirname(current);
    // Hitting the filesystem root means nothing on the chain existed, which
    // cannot happen for a path already proven to sit under an existing root.
    if (parent === current) throw outside(dir);
    missing.push(basename(current));
    current = parent;
  }
}

/**
 * Resolve a project root: absolute, existing, symlinks collapsed. Every
 * later comparison is against THIS value, never the caller's spelling.
 */
export async function resolveProjectRoot(root: unknown): Promise<string> {
  if (typeof root !== 'string' || root.trim().length === 0) {
    throw gmuxError('INVALID_INPUT', 'A project folder is required.');
  }
  if (!isAbsolute(root)) {
    throw gmuxError(
      'INVALID_INPUT',
      'A project folder must be an absolute path.',
      root
    );
  }
  try {
    return await realpath(resolve(root));
  } catch {
    throw gmuxError('INVALID_INPUT', 'That project folder does not exist.', root);
  }
}

/**
 * Resolve a project root AND prove it is one of the folders Tortie has open.
 *
 * A renderer bug must not be able to turn "/" into a project root and make
 * the whole disk writable, so every channel that takes a `root` runs it
 * through here first. The comparison is between REAL paths on both sides, so
 * a symlinked spelling of an open project is accepted and a stranger that
 * merely looks similar is not.
 *
 * Extracted in Phase 39 so the file-operations service and Open With share
 * one gate rather than two copies of it.
 */
export async function resolveOpenProjectRoot(
  root: unknown,
  listProjectRoots: () => Promise<readonly string[]>
): Promise<string> {
  const realRoot = await resolveProjectRoot(root);
  for (const candidate of await listProjectRoots()) {
    let realCandidate: string;
    try {
      realCandidate = await resolveProjectRoot(candidate);
    } catch {
      continue; // a project folder that has since gone away
    }
    if (realCandidate === realRoot) return realRoot;
  }
  throw gmuxError(
    'PROJECT_NOT_FOUND',
    'That folder is not an open project.',
    realRoot
  );
}

/**
 * Prove `input` lives inside `realRoot` and hand back both spellings.
 *
 * `input` may be absolute (must be inside the root) or relative to the root,
 * and may carry Pierre's trailing '/' for directories. `allowRoot` lets a
 * caller accept the project root itself — true for a move DESTINATION, false
 * for anything being renamed, moved or trashed.
 */
export async function resolveInsideRoot(
  realRoot: string,
  input: unknown,
  options: { allowRoot?: boolean } = {}
): Promise<ResolvedFsPath> {
  if (typeof input !== 'string') {
    throw gmuxError('INVALID_INPUT', 'A path is required.');
  }
  if (input.includes('\0')) throw outside(input);

  // PHASE 154 FOUND THIS, AND IT IS A REPAIR RATHER THAN A WIDENING.
  //
  // '' is how the ENTIRE renderer spells the project root: `parentOf` returns
  // it for a top-level entry, `destinationFor` and `planMoves` take it as the
  // destination, and the root drop on the empty space below the rows passes it
  // literally (`opsRef.current?.drop(dragged, '', false)`). Every one of those
  // reached this function through `toRel('')`, which is '', and was refused
  // here with "A path is required." So the root drop shipped in Phase 12.9 has
  // never once landed, and neither has a drop on a TOP-LEVEL FILE row, which
  // Pierre reports as `directoryPath: null` and the model hook turns into ''.
  // A move to the root toasted a sentence about a missing path.
  //
  // `allowRoot` is the flag that already means "the project folder itself is
  // an acceptable answer here", and it is true for exactly the callers that
  // want a destination directory. So the empty spelling is admitted under it
  // and under nothing else: a rename, a trash and a source path still refuse,
  // because for them the root is not a legal answer at all.
  if (input.trim().length === 0) {
    if (options.allowRoot !== true) {
      throw gmuxError('INVALID_INPUT', 'A path is required.');
    }
    return { abs: realRoot, rel: '' };
  }

  // Pierre spells directories with a trailing slash; the filesystem does not.
  let trimmed = input;
  while (trimmed.length > 1 && trimmed.endsWith('/')) {
    trimmed = trimmed.slice(0, -1);
  }

  const lexical = isAbsolute(trimmed)
    ? resolve(trimmed)
    : resolve(realRoot, trimmed);
  if (!containedIn(realRoot, lexical)) throw outside(input);

  if (lexical === realRoot) {
    if (options.allowRoot !== true) {
      throw gmuxError(
        'INVALID_INPUT',
        'The project folder itself cannot be changed here.',
        input
      );
    }
    return { abs: realRoot, rel: '' };
  }

  const realParent = await realpathOfAncestors(dirname(lexical));
  if (!containedIn(realRoot, realParent)) throw outside(input);

  const abs = resolve(realParent, basename(lexical));
  if (!containedIn(realRoot, abs) || abs === realRoot) throw outside(input);

  const rel = relative(realRoot, abs);
  if (rel.length === 0 || rel.startsWith('..')) throw outside(input);
  if (isProtectedFsPath(rel)) throw protectedPath(input);

  return { abs, rel };
}

/**
 * Validate a single new basename (the inline-rename box, and the leaf of a
 * New File / New Folder). Separators are refused here rather than silently
 * creating a subdirectory the user did not ask for.
 */
export function assertBasename(name: unknown): string {
  if (typeof name !== 'string') {
    throw gmuxError('INVALID_INPUT', 'A name is required.');
  }
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw gmuxError('INVALID_INPUT', 'A name is required.');
  }
  if (trimmed === '.' || trimmed === '..') {
    throw gmuxError('INVALID_INPUT', `"${trimmed}" is not a usable name.`);
  }
  if (trimmed.includes('/') || trimmed.includes('\0')) {
    throw gmuxError(
      'INVALID_INPUT',
      'A name cannot contain "/".',
      trimmed
    );
  }
  if (isProtectedFsPath(trimmed)) throw protectedPath(trimmed);
  return trimmed;
}

/**
 * Validate the name of a file that is arriving from OUTSIDE the project, and
 * hand it back BYTE FOR BYTE (Phase 154, repaired in the fix round).
 *
 * WHY THIS IS NOT `assertBasename`. That function exists for a name a PERSON
 * TYPED, into the inline rename box or the New File sheet, and its `trim()` is
 * the right answer there: somebody who types a trailing space did not mean it.
 * This function exists for a name that is ALREADY ON DISK, which nobody is
 * typing and which Tortie has no business editing.
 *
 * Running an incoming name through the typed-name rule did two things, both
 * measured end to end before this was written:
 *
 *  1. It SILENTLY RENAMED the file. A drop of `novel.txt ` landed as
 *     `novel.txt` and the person was told nothing. Finder does not do that,
 *     and Tortie's own internal move does not do it either: moving ` mv.ts`
 *     into `src/` keeps the space.
 *  2. Worse, it MANUFACTURED an overwrite. A file genuinely named ` keep.ts`
 *     dropped into a folder holding `keep.ts` trimmed onto the existing name,
 *     so the confirm sheet asked about `keep.ts`, a file the person never
 *     dragged. Confirming trashed the real `keep.ts` and put different bytes
 *     in its place. Recoverable from the Trash, and still the wrong question
 *     answered, which is the one thing this whole surface promises not to do.
 *
 * So the name is checked and never edited. The checks are the ones that
 * decide whether a name can escape the destination folder or name something
 * Tortie must not write, and nothing about taste:
 *
 *   - a non-empty string, and not one that is ONLY whitespace, because that
 *     is a name no sheet can show and no person can read back;
 *   - not '.' or '..' in either its real spelling or its trimmed one;
 *   - no '/' and no NUL, which are the two bytes that could reach outside the
 *     folder that was aimed at;
 *   - not `.git`, and the TRIMMED spelling is tested for that too. This is
 *     the one place the trim survives on purpose. Before this repair a folder
 *     named ` .git ` was caught by accident, because the trim ran first, and
 *     dropping the trim without this line would have quietly given that back.
 *     It is refused on how it READS rather than on what it is.
 */
export function assertIncomingBasename(name: unknown): string {
  if (typeof name !== 'string' || name.trim().length === 0) {
    throw gmuxError('INVALID_INPUT', 'A name is required.');
  }
  const trimmed = name.trim();
  if (name === '.' || name === '..' || trimmed === '.' || trimmed === '..') {
    throw gmuxError('INVALID_INPUT', `"${trimmed}" is not a usable name.`);
  }
  if (name.includes('/') || name.includes('\0')) {
    throw gmuxError('INVALID_INPUT', 'A name cannot contain "/".', name);
  }
  if (isProtectedFsPath(name) || isProtectedFsPath(trimmed)) {
    throw protectedPath(name);
  }
  return name;
}

/**
 * Resolve a path that is coming INTO the project from outside it (Phase 154).
 *
 * This is the one input in the whole fs contract that is allowed to name
 * something the project does not contain, so it gets its own function rather
 * than a flag on `resolveInsideRoot`. That refusal is the guard every other
 * mutation rests on and it stays exactly as strict as it was.
 *
 * What it proves, and each is load bearing:
 *
 *   1. It is a non empty string with no NUL. A dropped file whose path could
 *      not be read arrives as '', and copying from '' would resolve to the
 *      process's working directory.
 *   2. It is ABSOLUTE. There is no base to resolve a relative one against:
 *      the source is not in the project, so `realRoot` is the wrong anchor
 *      and the working directory is nobody's intent.
 *   3. It EXISTS, and every symlink in it is resolved, LEAF INCLUDED. This is
 *      the one place the module's own symlink rule is deliberately inverted,
 *      and the reason is containment rather than taste: the caller compares
 *      this answer against the destination to refuse a folder copied into
 *      itself, and a link left unresolved defeats that comparison. A link in
 *      /tmp pointing at the project's own folder would otherwise read as a
 *      stranger. The cost is that dropping an alias brings in what it points
 *      at, which is what "bring this in" means for a file you can only see
 *      through a link.
 */
export async function resolveIncomingSource(input: unknown): Promise<string> {
  if (typeof input !== 'string' || input.trim().length === 0) {
    throw gmuxError('INVALID_INPUT', 'Tortie could not tell where that came from.');
  }
  if (input.includes('\0')) {
    throw gmuxError(
      'INVALID_INPUT',
      'Tortie could not tell where that came from.',
      input
    );
  }
  if (!isAbsolute(input)) {
    throw gmuxError(
      'INVALID_INPUT',
      'Tortie could not tell where that came from.',
      input
    );
  }
  try {
    return await realpath(resolve(input));
  } catch {
    throw gmuxError(
      'FS_FAILED',
      `"${basename(input)}" is no longer there.`,
      'ENOENT'
    );
  }
}

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
    'gmux does not touch the .git folder.',
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
  if (typeof input !== 'string' || input.trim().length === 0) {
    throw gmuxError('INVALID_INPUT', 'A path is required.');
  }
  if (input.includes('\0')) throw outside(input);

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

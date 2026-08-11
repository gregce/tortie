/**
 * errno → a sentence the user can act on.
 *
 * Phase 12.9 requires that real failures (EEXIST, EPERM, ENOTEMPTY, ENOSPC…)
 * arrive at the renderer as typed errors with friendly messages, not as
 * "Error: ENOTEMPTY: directory not empty, rename '/Users/…'". Every fs:*
 * mutation funnels its rejections through `fsOpError`, which produces the
 * standard GmuxErrorPayload with:
 *   code    'FS_FAILED' — the existing filesystem code (see shared/types.ts)
 *   message the toast copy, already naming the entry
 *   detail  the bare errno token, so the UI can branch (offer Replace on
 *           EEXIST) without parsing prose
 */

import type { FsOpErrno } from '@shared/fs-ops';
import { GmuxError, gmuxError } from '../tmux/errors';

/** What the user asked for, in the voice used inside the messages below. */
export type FsOpVerb =
  | 'create'
  | 'rename'
  | 'duplicate'
  | 'move'
  | 'delete';

const KNOWN_ERRNOS: readonly FsOpErrno[] = [
  'EACCES',
  'EBUSY',
  'EEXIST',
  'EINVAL',
  'EISDIR',
  'ELOOP',
  'ENAMETOOLONG',
  'ENOENT',
  'ENOSPC',
  'ENOTDIR',
  'ENOTEMPTY',
  'EPERM',
  'EROFS',
  'EXDEV'
];

/** The errno token if this is a recognized filesystem failure. */
export function errnoOf(err: unknown): FsOpErrno | null {
  const code = (err as NodeJS.ErrnoException | null)?.code;
  if (typeof code !== 'string') return null;
  return KNOWN_ERRNOS.includes(code as FsOpErrno) ? (code as FsOpErrno) : null;
}

function friendly(errno: FsOpErrno, verb: FsOpVerb, name: string): string {
  switch (errno) {
    case 'EEXIST':
      return `"${name}" already exists here.`;
    case 'ENOENT':
      return `"${name}" is no longer there.`;
    case 'EPERM':
    case 'EACCES':
      return `You do not have permission to ${verb} "${name}".`;
    case 'EROFS':
      return `That location is read-only, so "${name}" could not be changed.`;
    case 'ENOTEMPTY':
      return `"${name}" is not empty.`;
    case 'ENOSPC':
      return 'There is no space left on the disk.';
    case 'EXDEV':
      return `"${name}" is on a different volume — gmux cannot move it there.`;
    case 'EISDIR':
      return `"${name}" is a folder.`;
    case 'ENOTDIR':
      return `"${name}" is not a folder.`;
    case 'EBUSY':
      return `"${name}" is in use by something else.`;
    case 'ENAMETOOLONG':
      return `That name is too long for "${name}".`;
    case 'ELOOP':
      return `"${name}" points at itself through a link.`;
    case 'EINVAL':
      return `"${name}" is not a usable name.`;
  }
}

const FALLBACK: Record<FsOpVerb, string> = {
  create: 'Could not create',
  rename: 'Could not rename',
  duplicate: 'Could not duplicate',
  move: 'Could not move',
  delete: 'Could not delete'
};

/**
 * Wrap a raw filesystem rejection. Already-classified GmuxErrors (the path
 * guards) pass through untouched — they carry better copy than any errno.
 */
export function fsOpError(err: unknown, verb: FsOpVerb, name: string): Error {
  if (err instanceof GmuxError) return err;
  const errno = errnoOf(err);
  if (errno !== null) {
    return gmuxError('FS_FAILED', friendly(errno, verb, name), errno);
  }
  return gmuxError(
    'FS_FAILED',
    `${FALLBACK[verb]} "${name}".`,
    err instanceof Error ? err.message : String(err)
  );
}

/** The toast sentence alone — for per-entry reports that do not throw. */
export function fsOpMessage(
  err: unknown,
  verb: FsOpVerb,
  name: string
): { errno: FsOpErrno | null; message: string } {
  if (err instanceof GmuxError) {
    return { errno: errnoOf(err), message: err.payload.message };
  }
  const errno = errnoOf(err);
  return {
    errno,
    message:
      errno !== null
        ? friendly(errno, verb, name)
        : `${FALLBACK[verb]} "${name}".`
  };
}

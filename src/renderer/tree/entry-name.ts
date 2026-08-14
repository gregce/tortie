/**
 * The rules for naming a new file or folder in the explorer (Phase 37) —
 * pure, so the inline editor's live refusal and its tests need no DOM.
 *
 * Every message reuses main's own vocabulary, so the box and a late disk
 * refusal say the same thing:
 *  - the "/" and "."/".." and .git rules mirror `assertBasename`
 *    (src/main/fs/paths.ts);
 *  - the control-character rule mirrors `validateProjectName`
 *    (src/shared/project-create.ts);
 *  - the duplicate message is `fsOpMessage`'s EEXIST line
 *    (src/main/fs/errors.ts).
 *
 * These rules are a strict superset of @pierre/trees' own commit validation
 * (empty, "/", exact-case duplicate), so a name this module passes never
 * makes the library fire its own error on the Enter path.
 *
 * Deliberately allowed: leading dots (`.env`), interior spaces, backslash,
 * unicode. The disk keeps the last word — a sibling only the disk knows
 * about still comes back as EEXIST from main, and the create path removes
 * the row and toasts. Nothing is created either way.
 */

import { isProtectedFsPath } from '@shared/fs-ops';

/** macOS NAME_MAX: 255 per path component. */
export const MAX_ENTRY_NAME = 255;

export type EntryNameVerdict =
  | { kind: 'empty' }
  | { kind: 'ok'; name: string }
  | { kind: 'bad'; reason: string };

/**
 * Judge a candidate name against its siblings. `takenLower` holds the
 * LOWERCASED names already present in the destination directory, because
 * the macOS default volume is case-insensitive. Checked in order; the
 * first hit wins. Empty is a dismissal, never an error.
 */
export function entryNameVerdict(
  raw: string,
  takenLower: ReadonlySet<string>
): EntryNameVerdict {
  const name = raw.trim();
  if (name.length === 0) return { kind: 'empty' };
  if (name.includes('/')) {
    return { kind: 'bad', reason: 'A name cannot contain "/".' };
  }
  if (name === '.' || name === '..') {
    return { kind: 'bad', reason: `"${name}" is not a usable name.` };
  }
  // Control characters and DEL: a NUL truncates the path at the syscall
  // boundary, and the rest are invisible in a file name.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001F\u007F]/.test(name)) {
    return {
      kind: 'bad',
      reason: 'That name contains characters a file name cannot hold.'
    };
  }
  if (isProtectedFsPath(name)) {
    return { kind: 'bad', reason: 'Tortie does not touch the .git folder.' };
  }
  if (name.length > MAX_ENTRY_NAME) {
    return { kind: 'bad', reason: 'That name is too long.' };
  }
  if (takenLower.has(name.toLowerCase())) {
    return { kind: 'bad', reason: `"${name}" already exists here.` };
  }
  return { kind: 'ok', name };
}

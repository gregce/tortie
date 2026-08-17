/**
 * What a project row is called when the folder's own name is empty (Phase 74,
 * GitHub issue 6).
 *
 * `basename('/')` is an empty string, so a person who opened the root of a
 * volume got a project row with no name, a tab with no label, and nothing on
 * screen saying why. The fallback is the folder's absolute path, which is one
 * character for the only folder this happens to and is the honest answer for
 * any other one.
 *
 * NOT "Untitled project". Two such folders would then read the same, and
 * neither would say which folder it is. Tortie has no rename verb for a
 * project today, so the name has to carry the answer by itself.
 */
import { basename } from 'node:path';

/** The project name for an absolute folder path. Never an empty string. */
export function projectNameForPath(absPath: string): string {
  const name = basename(absPath);
  return name.length > 0 ? name : absPath;
}

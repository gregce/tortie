/**
 * The rules for naming a new project folder (Phase 12.9 item 1) — shared, so
 * the dialog's inline error and the main-process guard are the SAME rule.
 *
 * Two callers, two different reasons for the same check: the renderer runs it
 * as you type so the Create button can say why it is disabled, and main runs
 * it because a main process may never trust a renderer. Splitting it would
 * mean a name the dialog accepts and the filesystem call then rejects with an
 * errno, which is exactly the class of error this product refuses to show.
 */

/**
 * Longest folder name accepted. macOS's own limit is 255 BYTES per path
 * component; this is a UTF-16 length check in front of it, so the friendly
 * error arrives before ENAMETOOLONG does.
 */
export const MAX_PROJECT_NAME = 200;

/**
 * Why this name cannot be a folder, or null when it can be one.
 *
 * Deliberately permissive: dotfiles, spaces, uppercase and emoji are all
 * legal folder names on macOS, and gmux has no business being stricter than
 * the filesystem it writes to. Only four things are refused — nothing,
 * something too long, the two directory aliases, and characters that would
 * either split the path or be invisible in it.
 */
export function validateProjectName(raw: string): string | null {
  const name = raw.trim();
  if (name.length === 0) return 'Give the project a name.';
  if (name.length > MAX_PROJECT_NAME) {
    return `That name is too long (${String(MAX_PROJECT_NAME)} characters max).`;
  }
  if (name === '.' || name === '..') return 'That name is not a folder name.';
  if (name.includes('/')) return 'Use a single folder name — no slashes.';
  // Control characters and DEL: a NUL truncates the path at the syscall
  // boundary, and the rest are invisible in a folder name.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001F\u007F]/.test(name)) {
    return 'That name contains characters a folder name cannot hold.';
  }
  return null;
}

/**
 * The absolute path a (parentDir, name) pair would create. Shared with the
 * dialog so the path preview under the fields is the same string main will
 * actually make — the line that stops a project landing somewhere the user
 * did not intend.
 */
export function projectPathFor(parentDir: string, name: string): string {
  const parent = parentDir.trim().replace(/\/+$/, '');
  return `${parent}/${name.trim()}`;
}

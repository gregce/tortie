/**
 * POSIX path fragments the editor stream needs. One home for them, so the
 * store, the markdown resolver and the tab strip cannot drift apart on what
 * "the file's directory" means.
 *
 * (`src/renderer/scm/format.ts` still carries its own copy for SCM row
 * labels — a pre-existing split Phase 14's dedup pass owns, not this one.)
 */

/** Everything after the last slash: `/a/b/c.ts` → `c.ts`. */
export function baseName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

/** Directory part, no trailing slash; `/` at the filesystem root. */
export function dirOf(path: string): string {
  const i = path.lastIndexOf('/');
  return i <= 0 ? '/' : path.slice(0, i);
}

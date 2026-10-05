/**
 * Home-relative path for display ("~/src/webapp"), the one rule (moved to
 * shared in Phase 316.7, build/p3167/SPEC.md D6).
 *
 * It lived in `src/renderer/format.ts` from Phase 90.3 onward. Phase 316.7
 * moved it here, unchanged, so main draws the folder under a phone's group
 * header with the rule the session manager draws the same folder with, rather
 * than a second spelling of it. `src/renderer/format.ts` re-exports it, so none
 * of its importers moved.
 *
 * Pure.
 */

/**
 * Home-relative path for display ("~/src/webapp").
 *
 * PHASE 90.3 GAVE IT A SECOND ARGUMENT, and the reason is that a tilde is a
 * claim about whose home folder a path is in. `/Users/gdc/src` on THIS Mac is
 * this person's home folder. The same string on another machine is that
 * machine's account, which may be a different person, and rewriting it to `~`
 * says something Tortie does not know. So a path on another machine is drawn
 * exactly as that machine states it.
 *
 * The argument is optional and an omitted value means this Mac, so every caller
 * that has never heard of a machine reads exactly what it read before.
 */
export function displayPath(path: string, machineId?: string): string {
  if (machineId !== undefined && machineId !== '' && machineId !== 'local') {
    return path;
  }
  const m = /^\/Users\/[^/]+(\/.*)?$/.exec(path);
  if (m) return `~${m[1] ?? ''}`;
  return path;
}

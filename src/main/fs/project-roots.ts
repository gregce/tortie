/**
 * The folders ON THIS MAC that Tortie has open as projects (Phase 336, research
 * 138 section 2.5 item 5 and section 4.7).
 *
 * ## The fault this closes
 *
 * Four readers on this Mac ask "is this folder a project Tortie has open?"
 * before they touch a file here: the file operations and the guarded save
 * (`defaultFileOpsDeps` in ./ipc.ts, which `fs:writeGuarded` shares), the drag
 * out (`defaultDragOutDeps` in ./ipc.ts), Open With (`defaultOpenWithDeps` in
 * ./open-with.ts) and the Redline baseline store (`baselineStore` in
 * ../baselines/ipc.ts). Each answered it with the whole project list mapped
 * to its paths, and since Phase 90.3 that list holds the folders opened on
 * OTHER machines too. A folder opened on another machine is a path on that
 * machine. Read as a path here, a row for `/Users/gdc/notes` on the Mac Pro
 * made `/Users/gdc/notes` on THIS Mac a folder the local gate admits, though
 * nobody opened it here. Research 138 named three of the four
 * readers; build/p336/SPEC.md M4 found the baseline store.
 *
 * ## The rule, and it is the rule the rest of the product already uses
 *
 * A row is local when it carries no `machineId`, or carries the word `local`,
 * which is `(project.machineId ?? 'local') === 'local'` in
 * ../sessions/core.ts. Every other value, an empty string included, is another
 * machine, so a row nobody can place reads as NOT open here: the local gate
 * fails closed rather than open.
 *
 * The local gate itself, ./paths.ts and ./guarded-write.ts, is untouched. Only
 * the list it is handed changes.
 */

import type { Project } from '@shared/types';

/**
 * The stored paths of the project rows that are folders on this Mac, in the
 * order they were given. Pure.
 */
export function localRootsOf(
  projects: readonly Pick<Project, 'path' | 'machineId'>[]
): string[] {
  const out: string[] = [];
  for (const project of projects) {
    if ((project.machineId ?? 'local') !== 'local') continue;
    out.push(project.path);
  }
  return out;
}

/**
 * The open project folders on this Mac, read through the singleton core, so
 * the authority on "what is a project root" is the same list the tabs render
 * from.
 *
 * Imported lazily, for the reason each of the four readers gave when it held
 * its own copy: the fs channels must not drag the tmux core into the module
 * graph at boot, and by the time a person renames, drags, opens or rewinds a
 * file the core has long since resolved.
 */
export async function localProjectRoots(): Promise<string[]> {
  const { getGmuxCore } = await import('../sessions');
  return localRootsOf((await getGmuxCore()).listProjects());
}

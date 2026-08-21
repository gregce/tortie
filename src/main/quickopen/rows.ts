/**
 * One ranked path into one quick open row, and one recent file back into one
 * (Phase 99, retyped in Phase 121). PURE, and it imports no worker state at
 * all.
 *
 * WHY THIS IS ITS OWN MODULE. The worker composed a hit in two places, being
 * the ranked answer and the recents answer, and Phase 99 has to add one field
 * to both of them. That field is the machine id, and it is the one thing that
 * keeps `/Users/gdc/gmux/README.md` on this Mac apart from the same path on
 * another computer. A decomposition that lives inside a `worker_threads` entry
 * point cannot be tested without starting a thread, so it lives here and
 * `src/main/quickopen/__tests__/p99-rows.test.ts` reads it directly.
 *
 * THE KEY SHAPES ARE NOT INVENTED HERE. `rootKeyOf` and `targetOfRootKey` in
 * `@shared/workspace-target` own both directions, and the renderer composes the
 * same keys from the same two functions.
 *
 * PHASE 121 ADDED THREE FUNCTIONS AND CHANGED ONE SIGNATURE. A recent file is
 * now two fields rather than one string joined by a space. `recentMapKeyOf` is
 * the worker's internal map key, `recentOfLegacyKey` reads the string an older
 * renderer still sends, and `recentsOf` normalises a whole list at the
 * boundary.
 */

import type { QuickOpenHit, QuickOpenRecent } from '@shared/ipc';
import { LOCAL_MACHINE_ID, targetOfRootKey } from '@shared/workspace-target';

/**
 * One ranked path as a hit, carrying the machine when the root is not this Mac.
 *
 * `repoPath` is the folder ON THE COMPUTER IT IS ON, so a surface that opens
 * the file hands that path to that machine rather than to this one. `machineId`
 * is ABSENT for this Mac rather than set to `local`, because the contract
 * declares it optional and every hit a build before Phase 99 produced had no
 * such field.
 */
export function hitOf(
  rootKey: string,
  relPath: string,
  positions: number[],
  score: number,
  recent: boolean
): QuickOpenHit {
  const target = targetOfRootKey(rootKey);
  const hit: QuickOpenHit = {
    repoPath: target.path,
    relPath,
    positions,
    score,
    recent
  };
  if (target.machineId === LOCAL_MACHINE_ID) return hit;
  return { ...hit, machineId: target.machineId };
}

/**
 * One recent entry as a hit, or null when either field is empty.
 *
 * PHASE 121 GAVE IT THE TUPLE. It used to take one string, `${rootKey}
 * ${relPath}`, and split it at the first space. A project folder whose path
 * holds a space, e.g. `/Users/gdc/My Projects/app`, split into a root nothing
 * matched, so the file was dropped and an empty Cmd+P listed nothing for that
 * project. Two fields cannot split wrong.
 */
export function recentHitOf(entry: QuickOpenRecent): QuickOpenHit | null {
  if (entry.root.length === 0 || entry.relPath.length === 0) return null;
  return hitOf(entry.root, entry.relPath, [], 0, true);
}

/**
 * The rank map's key for one recent file.
 *
 * The separator is NUL, which no POSIX path and no machine id can hold: a NUL
 * ends a C string, so no filesystem can produce a name containing one, and
 * `MACHINE_ID_PATTERN` in src/shared/machines.ts is `^[a-z][a-z0-9-]{0,31}$`.
 * The key is never persisted, never shown and never sent anywhere. It exists so
 * two different files cannot key one entry. Under the old space separator
 * `/a b` with `c` and `/a` with `b c` composed the same key.
 */
export function recentMapKeyOf(root: string, relPath: string): string {
  return `${root}\u0000${relPath}`;
}

/**
 * One recents key an older build composed, as the tuple it meant, or null.
 *
 * The old shape is `${root} ${relPath}` and the old rule was to split at the
 * FIRST space. This reproduces that rule exactly rather than improving on it:
 * the point is to read what that build wrote, not to read it better. A root
 * holding a space is why the shape was replaced, and such a key cannot be
 * recovered from its own text. It is read the way it was written, and it ranks
 * nothing, which is what it does today.
 */
export function recentOfLegacyKey(key: string): QuickOpenRecent | null {
  const space = key.indexOf(' ');
  if (space <= 0) return null;
  const relPath = key.slice(space + 1);
  if (relPath.length === 0) return null;
  return { root: key.slice(0, space), relPath };
}

/**
 * Every element of one `recents` input as a tuple, dropping what cannot be read.
 *
 * It runs in the coordinator, once per recents change, so exactly one shape
 * reaches the worker and the tolerance for the old wire shape sits at the one
 * boundary where renderer input arrives.
 */
export function recentsOf(
  input: readonly (QuickOpenRecent | string)[]
): QuickOpenRecent[] {
  const out: QuickOpenRecent[] = [];
  for (const item of input) {
    const one = typeof item === 'string' ? recentOfLegacyKey(item) : item;
    if (one === null) continue;
    if (one.root.length === 0 || one.relPath.length === 0) continue;
    out.push({ root: one.root, relPath: one.relPath });
  }
  return out;
}

/**
 * One ranked path into one quick open row, and one recents key back into one
 * (Phase 99). PURE, and it imports no worker state at all.
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
 */

import type { QuickOpenHit } from '@shared/ipc';
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
 * One recents key back into a hit, or null when it does not split.
 *
 * The key is `${rootKey} ${relPath}` and the split is at the FIRST space, which
 * is what the worker has always done. A root key holding a space would break
 * that, and no absolute path this product composes holds one at its start; a
 * relative path holding spaces round trips, because everything after the first
 * space is the relative path.
 */
export function recentHitOf(key: string): QuickOpenHit | null {
  const space = key.indexOf(' ');
  if (space <= 0) return null;
  const relPath = key.slice(space + 1);
  if (relPath.length === 0) return null;
  return hitOf(key.slice(0, space), relPath, [], 0, true);
}

/**
 * PHASE 334. THE FLOOR ON "A PERSON CAME BACK TO THIS TAB, READ IT AGAIN".
 *
 * A tab coming on screen by the person's choice, or its editor taking focus
 * from outside, asks ./store's `rereadOnReturn`, which asks the repository's
 * walk again (./tab-io `refreshRepo`, unchanged). This module decides only HOW
 * OFTEN: one look per repository per `REREAD_FLOOR_MS`, leading edge, and a
 * dropped look is dropped rather than queued, because the view's own focus
 * always follows an activation and a trailing walk would make every arrival
 * two. A clock that reads earlier than the last admission admits, so a clock
 * that went backwards never shuts the door.
 *
 * Measured, build/p334/SPEC.md §2: a walk is ~11 ms per open tab and it is the
 * `git show` spawn, 404 ms at worst over 30 tabs, so 1,000 ms keeps two door
 * walks of one repository from ever queueing behind each other.
 *
 * Pure: it imports nothing from the store, React, Monaco or the bridge, and
 * the clock is handed in so a test owns it.
 */

/** One look per repository per this many ms. Measured: build/p334/SPEC.md §2. */
export const REREAD_FLOOR_MS = 1_000;

export interface RereadFloor {
  /** True, and the time recorded, when no look at `repoPath` was admitted in the last floor. */
  admit(repoPath: string): boolean;
}

export function createRereadFloor(floorMs: number, now: () => number): RereadFloor {
  const admitted = new Map<string, number>();
  return {
    admit(repoPath) {
      const t = now();
      const last = admitted.get(repoPath);
      if (last !== undefined && t >= last && t - last < floorMs) return false;
      admitted.set(repoPath, t);
      return true;
    }
  };
}

/**
 * True when focus is ENTERING `container` from outside it: there was no
 * previous holder, or the previous holder is not inside it. Moving between a
 * container's own children is not entering.
 */
export function focusEntersFrom(
  container: { contains(other: Node | null): boolean },
  previous: EventTarget | null
): boolean {
  return previous === null || !container.contains(previous as Node);
}

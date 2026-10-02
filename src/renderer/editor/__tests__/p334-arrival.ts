/**
 * PHASE 334. ARRIVING AT THE REDLINE VIEW IS A LOOK, for the Phase 282 rigs
 * that mount it (./p282-view-presses, ./p2822-after-undo, ./p2822-second-undo).
 *
 * The view focuses its scroller when a tab arrives, that focus enters the
 * document from outside it, and ../store `rereadOnReturn` reads the repository
 * again: every open tab of it, the file and then git's HEAD. A rig that mounted
 * the view over an agent's write the tab had not taken would now have that
 * write read at arrival. That is this phase's promise, and it is not the case
 * those rigs press, which is an agent's write the person has NOT looked at
 * since they arrived: the press races it.
 *
 * So a rig arrives over the bytes each tab already holds, asserts the one look
 * (each open tab read once), and only then are the agent's bytes on disk, with
 * the rig's counters starting there. Every reading after the mount is the
 * Phase 282 rig's own, unchanged.
 *
 * The store's floor (../reread-on-return) reads `performance.now()` and lives
 * as long as the store, so it outlives a case. `ownTheStoreClock` gives every
 * case a fresh window and holds the clock still inside it: the arrival is
 * always admitted, whatever ran before it, and no reading after it depends on
 * how long the case took.
 */

import { afterAll, beforeEach, vi } from 'vitest';

export interface FileRead {
  contents: string;
  truncated: boolean;
}

/** Register the clock for the calling file: one fresh floor window per case, still inside it. */
export function ownTheStoreClock(): void {
  let clock = 0;
  const now = vi.spyOn(performance, 'now').mockImplementation(() => clock);
  beforeEach(() => {
    clock += 60_000;
  });
  afterAll(() => {
    now.mockRestore();
  });
}

export interface Arrival {
  /** Arrive over `tabs`: each answers the bytes it already holds until `done`. */
  begin(tabs: readonly { path: string; savedContents: string }[]): void;
  /** The look is over: how many reads it made, and the rig's own main answers from here on. */
  done(): number;
  /** The bridge's `fs.readFile`: a tab's own bytes while it is arriving, the rig's main otherwise. */
  readFile(path: string): Promise<FileRead>;
}

export function arrivalOver(main: (path: string) => Promise<FileRead>): Arrival {
  const held = new Map<string, string>();
  let reads = 0;
  return {
    begin(tabs) {
      held.clear();
      reads = 0;
      for (const t of tabs) held.set(t.path, t.savedContents);
    },
    done() {
      held.clear();
      return reads;
    },
    readFile(path) {
      const own = held.get(path);
      if (own === undefined) return main(path);
      reads += 1;
      return Promise.resolve({ contents: own, truncated: false });
    }
  };
}

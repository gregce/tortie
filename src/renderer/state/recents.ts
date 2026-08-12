/**
 * Recent projects, as the home screen reads them (zustand).
 *
 * A SEPARATE STORE, ON PURPOSE. This is one small domain with one reader and
 * its own IPC surface, so it gets its own slice rather than four more fields
 * in state/store.ts. The growth guardrail is that one module is one
 * responsibility with a small export surface, and a recents list has nothing
 * to do with sessions, projects, layout or the dock.
 *
 * IT IS A LEAF. This module imports the bridge and React and nothing else in
 * the renderer. It deliberately does not import state/store.ts, so there is no
 * cycle and no temptation to put "open this project" here. Opening a project
 * is the shell's job and it already has one function for it.
 *
 * NOTHING HERE POLLS. The list is read once, refreshed when main says the file
 * changed, and the folder existence check runs once after the first paint. The
 * home screen has no number that rises on its own, which is the line in
 * ZEN-OF-TORTIE that cut the status dot and the count badge from these rows.
 *
 * WITHOUT THE BRIDGE. A build whose preload has no `recents` surface reports
 * an empty list forever, so the home screen draws no recents block. That is a
 * state the screen already has, because it is what a first launch looks like.
 */

import { useEffect, useMemo } from 'react';
import { create } from 'zustand';
import type { GmuxRecentsExtras, RecentProject } from '@shared/ipc';

/**
 * How many rows the home screen holds. The narrow window shows three, and that
 * cap is a CSS rule rather than a second number here, so the two can never
 * disagree about which rows exist.
 */
export const HOME_RECENTS_MAX = 5;

type RecentsBridge = NonNullable<GmuxRecentsExtras['recents']>;

function bridge(): RecentsBridge | null {
  // `typeof window` is checked because this module reads the bridge as soon as
  // it loads, and a unit test imports it into a plain node environment where
  // there is no window at all.
  if (typeof window === 'undefined') return null;
  return (
    (window.gmux as (typeof window.gmux & GmuxRecentsExtras) | undefined)
      ?.recents ?? null
  );
}

/** Is this build able to remember recent projects at all? */
export function recentsAvailable(): boolean {
  return typeof bridge()?.list === 'function';
}

const NO_PATHS: ReadonlySet<string> = new Set<string>();

interface RecentsState {
  /** Every remembered project, newest first. Empty until the first read. */
  recents: RecentProject[];
  /** Paths whose folder has been moved or deleted. Empty until checked. */
  missing: ReadonlySet<string>;
  /** True once a list has come back, so a screen can tell empty from unread. */
  loaded: boolean;

  /** Read the list and subscribe to changes. Idempotent. */
  init(): void;
  /** Read the list again now. */
  refresh(): Promise<void>;
  /** Stat every remembered folder. Call after the first paint, never before. */
  checkMissing(): Promise<void>;
  /** Remove from Recent, on one row. */
  remove(path: string): Promise<void>;
}

let initialized = false;

export const useRecents = create<RecentsState>((set, get) => ({
  recents: [],
  missing: NO_PATHS,
  loaded: false,

  init() {
    if (initialized) return;
    const api = bridge();
    if (api === null) return;
    initialized = true;
    // Main wrote the file. That happens when a project is opened or closed,
    // when a row is removed, and when the native menu is cleared. The home
    // screen is on screen for the close case, which is the one that would
    // otherwise show a list one row out of date.
    api.onChanged((recents) => {
      set({ recents, loaded: true });
    });
    void get().refresh();
  },

  async refresh() {
    const api = bridge();
    if (api === null) return;
    try {
      set({ recents: await api.list(), loaded: true });
    } catch {
      // A recents read is never worth an error in front of the user. An empty
      // list is the honest fallback and the screen has a shape for it.
      set({ loaded: true });
    }
  },

  async checkMissing() {
    const api = bridge();
    if (api === null) return;
    try {
      const paths = await api.missing();
      set({ missing: paths.length === 0 ? NO_PATHS : new Set(paths) });
    } catch {
      // Leave every row unmarked. Marking a row that is fine would be worse
      // than leaving one that is gone unmarked, and the open still reports it.
    }
  },

  async remove(path) {
    const api = bridge();
    if (api === null) return;
    try {
      set({ recents: await api.remove(path), loaded: true });
    } catch {
      // The row stays. The user can try again.
    }
  }
}));

/**
 * The rows the home screen draws, plus which of them have lost their folder.
 *
 * The list is capped at five here and the narrow window hides two of those in
 * CSS. Both caps have to agree about WHICH rows exist, so there is one order
 * and one truncation, and the media query only ever hides from the bottom.
 *
 * The existence check is scheduled for the frame AFTER this one. Research 35
 * section 1.9 is explicit that the check runs after the first paint and never
 * before it, so the screen never waits on the filesystem. Because the warning
 * slot is reserved on every row, the answer arriving adds a mark and moves
 * nothing.
 */
export function useHomeRecents(): {
  recents: RecentProject[];
  missing: ReadonlySet<string>;
} {
  const all = useRecents((s) => s.recents);
  const missing = useRecents((s) => s.missing);

  useEffect(() => {
    useRecents.getState().init();
    const frame = requestAnimationFrame(() => {
      void useRecents.getState().checkMissing();
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const recents = useMemo(() => all.slice(0, HOME_RECENTS_MAX), [all]);
  return { recents, missing };
}

// The read starts when this module loads and not when the home screen mounts,
// because the screen has no loading state and the rows are meant to be there
// on its first paint. The cost is one small JSON read that main has usually
// done already. In a test, or in a build with no recents bridge, this does
// nothing at all.
useRecents.getState().init();

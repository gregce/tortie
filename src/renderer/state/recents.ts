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
 *
 * PHASE 92: A ROW CAN NAME A MACHINE. `useHomeRecents` now hands the screen a
 * prepared row rather than an entry and a set of paths, so the three rules that
 * follow from the pair are decided once here instead of at every use site. The
 * row carries its own React key, which is the pair, its own machine id, and its
 * own `missing` flag, which is false for every row on another machine.
 *
 * IT STILL DOES NOT KNOW WHAT A MACHINE IS CALLED. The label lookup belongs to
 * the screen, which already holds the machine states, and the decision to hide
 * a row whose machine has been forgotten belongs to main, which owns the file.
 * This module stays a leaf and imports the bridge, React and one pure shared
 * module.
 */

import { useEffect, useMemo } from 'react';
import { create } from 'zustand';
import type { InstalledGmuxApi, RecentProject } from '@shared/ipc';
import {
  LOCAL_MACHINE_ID,
  targetKey,
  workspaceTarget
} from '@shared/workspace-target';
import { gmuxBridge } from '../bridge';

/**
 * How many rows the home screen holds. The narrow window shows three, and that
 * cap is a CSS rule rather than a second number here, so the two can never
 * disagree about which rows exist.
 */
export const HOME_RECENTS_MAX = 5;

type RecentsBridge = NonNullable<InstalledGmuxApi['recents']>;

function bridge(): RecentsBridge | null {
  // `typeof window` is checked because this module reads the bridge as soon as
  // it loads, and a unit test imports it into a plain node environment where
  // there is no window at all.
  if (typeof window === 'undefined') return null;
  return gmuxBridge()?.recents ?? null;
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
  /**
   * Remove from Recent, on one row.
   *
   * Phase 92: the machine is optional and omitting it means this Mac, so the
   * row for a path on another machine is removed on its own.
   */
  remove(path: string, machineId?: string): Promise<void>;
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

  async remove(path, machineId) {
    const api = bridge();
    if (api === null) return;
    try {
      set({ recents: await api.remove(path, machineId), loaded: true });
    } catch {
      // The row stays. The user can try again.
    }
  }
}));

/**
 * One row of the home screen's recent list, with every decision already made.
 *
 * PHASE 92. The screen used to receive the entries and the set of missing paths
 * and work the rest out per row. Three of those decisions are wrong the moment
 * a row can name a machine, so they are made here, once, and the screen reads
 * the answers.
 */
export interface HomeRecentRow {
  /** The stored row, exactly as main sent it. */
  entry: RecentProject;
  /**
   * The React key, which is `targetKey(workspaceTarget(path, machineId))`.
   *
   * It is the PAIR and never the path. Two machines can hold the same path, and
   * a duplicate key would make React draw one row where there are two projects.
   */
  key: string;
  /** The machine the folder is on. `local` for this Mac, and never undefined. */
  machineId: string;
  /** True when the folder is on another machine. */
  remote: boolean;
  /**
   * True when the folder is gone. LOCAL ROWS ONLY.
   *
   * A row on another machine is never marked, because nothing checks. Main
   * stats local rows only, and this flag never reads the missing set for a
   * remote row even if a path in it happens to match. `/Users/gdc/test-sync`
   * can be gone here and present over there, and this Mac has no standing to
   * answer for another computer.
   */
  missing: boolean;
}

/**
 * Turn the stored rows into rows the screen can draw. Pure, and exported so the
 * three rules above are reachable by a test without rendering anything.
 */
export function homeRecentRows(
  all: readonly RecentProject[],
  missing: ReadonlySet<string>
): HomeRecentRow[] {
  return all.slice(0, HOME_RECENTS_MAX).map((entry) => {
    const target = workspaceTarget(entry.path, entry.machineId);
    const remote = target.machineId !== LOCAL_MACHINE_ID;
    return {
      entry,
      key: targetKey(target),
      machineId: target.machineId,
      remote,
      missing: !remote && missing.has(entry.path)
    };
  });
}

/**
 * The rows the home screen draws, each one ready to draw.
 *
 * The list is capped at five here and the narrow window hides some of those in
 * CSS. Both caps have to agree about WHICH rows exist, so there is one order
 * and one truncation, and the media query only ever hides from the bottom.
 *
 * The existence check is scheduled for the frame AFTER this one. Research 35
 * section 1.9 is explicit that the check runs after the first paint and never
 * before it, so the screen never waits on the filesystem. Because the warning
 * slot is reserved on every row, the answer arriving adds a mark and moves
 * nothing.
 */
export function useHomeRecents(): { rows: HomeRecentRow[] } {
  const all = useRecents((s) => s.recents);
  const missing = useRecents((s) => s.missing);

  useEffect(() => {
    useRecents.getState().init();
    const frame = requestAnimationFrame(() => {
      void useRecents.getState().checkMissing();
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const rows = useMemo(() => homeRecentRows(all, missing), [all, missing]);
  return { rows };
}

// The read starts when this module loads and not when the home screen mounts,
// because the screen has no loading state and the rows are meant to be there
// on its first paint. The cost is one small JSON read that main has usually
// done already. In a test, or in a build with no recents bridge, this does
// nothing at all.
useRecents.getState().init();

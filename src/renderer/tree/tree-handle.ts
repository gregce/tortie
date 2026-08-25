/**
 * The mounted tree's imperative surface, for the two callers that live
 * outside the component.
 *
 * 1. The Files section HEADER. The filter lives inside @pierre/trees' shadow
 *    root and is opened by typing on a focused tree — a real gesture, and an
 *    invisible one. The header button is how it becomes discoverable, and the
 *    header is a different component (FilesSection owns the band, FileTree
 *    owns the rows, and the tree is re-mounted per project root).
 * 2. The GMUX_SHOT probe, which drives the file verbs through exactly the
 *    objects the UI drives them through — the point of a probe is that
 *    nothing on the path is a stand-in.
 *
 * An unmounted tree leaves `handle` null, which is also the state where the
 * header button should be disabled anyway.
 */

import { create } from 'zustand';
import type { TreeOps } from './tree-ops';

export interface TreeHandle {
  /** The project root this tree is mounted on. */
  rootPath: string;
  /** Open (or close) the name filter and put the caret in it. */
  toggleFilter(): void;
  /** True while the filter's own field holds a query. */
  filterValue(): string;
  /** Every file verb, as the context menu and the drop handler call them. */
  ops: TreeOps;
  /** Canonical paths the tree currently knows about. */
  paths(): string[];
  /**
   * PHASE 155. Re-point the rows at what the listings say, trusting nothing.
   *
   * The Files header's Refresh calls this after the store has re-read the
   * folders. Re-reading a folder is only half of a refresh: the rows come from
   * a diff against a baseline of what the model is believed to hold, and a
   * baseline that has drifted starves that diff forever. This rebuilds the
   * baseline from the rows the model actually has and drops every hold, so a
   * drift from any cause costs one button press instead of a tab switch.
   */
  reconcile(): void;
  /** Start an inline rename on a row (F2's path). */
  startRename(canonical: string): void;
  /**
   * Where a HEADER create lands: the selected folder, the selected file's
   * parent, or '' for the project root. The header has no row under the
   * pointer, so the destination comes from the selection (header-actions.ts).
   */
  newEntryTarget(): string;
  /** Close every open folder. Returns how many were closed. */
  collapseAll(): number;
  /** The tree's shadow root, for the probe's rename-input gesture. */
  shadowRoot(): ShadowRoot | null;
}

interface TreeHandleState {
  handle: TreeHandle | null;
  /** True while the filter field is open — the header button reads as active. */
  filterOpen: boolean;
  /**
   * How many folders are open right now. The header's Collapse All is
   * DISABLED at zero rather than clicking to no effect, and a count is the
   * only thing that can say so — the mounted tree pushes it on every model
   * emit (FileTree's expansion watch already computes the set).
   */
  expandedCount: number;
  register(handle: TreeHandle | null): void;
  setFilterOpen(open: boolean): void;
  setExpandedCount(count: number): void;
}

export const useTreeHandle = create<TreeHandleState>((set) => ({
  handle: null,
  filterOpen: false,
  expandedCount: 0,
  register(handle) {
    set(
      handle === null
        ? { handle: null, filterOpen: false, expandedCount: 0 }
        : { handle }
    );
  },
  setFilterOpen(open) {
    set({ filterOpen: open });
  },
  setExpandedCount(count) {
    set((s) => (s.expandedCount === count ? s : { expandedCount: count }));
  }
}));

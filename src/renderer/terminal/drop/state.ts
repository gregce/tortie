/**
 * Transient drop-target state — armed on dragover, cleared on drop/leave.
 *
 * Its own tiny store rather than a field on the layout slice: this is not
 * split state. The split drop zone arms an armed HALF of a leaf under
 * split-specific constraints (leaf count, minimum pane size); the attach zone
 * covers a WHOLE leaf and must arm even where a split could not (research 16
 * §8.2). Sharing the field would make one gate the other.
 *
 * Never persisted. The two zones are mutually exclusive by construction: the
 * router sets exactly one of `leaf` / `window` per dragover.
 */

import { create } from 'zustand';

/** What the pane under the pointer promises to do with the drop. */
export type AttachPromise = 'attach' | 'insert' | 'blocked';

export interface AttachTarget {
  sessionId: string;
  /** Viewport rect of the target leaf (the overlay renders in a portal). */
  rect: { left: number; top: number; width: number; height: number };
  promise: AttachPromise;
  label: string;
}

interface DropUiState {
  /** Armed leaf under the pointer, or null. */
  leaf: AttachTarget | null;
  /** True while a file drag is over the app but NOT over a session. */
  window: boolean;
  setLeaf(target: AttachTarget | null): void;
  setWindow(armed: boolean): void;
  clear(): void;
}

function sameTarget(a: AttachTarget | null, b: AttachTarget | null): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  return (
    a.sessionId === b.sessionId &&
    a.promise === b.promise &&
    a.label === b.label &&
    a.rect.left === b.rect.left &&
    a.rect.top === b.rect.top &&
    a.rect.width === b.rect.width &&
    a.rect.height === b.rect.height
  );
}

export const useDropUi = create<DropUiState>((set, get) => ({
  leaf: null,
  window: false,
  setLeaf(target) {
    // dragover fires continuously; only re-render when something changed.
    if (sameTarget(get().leaf, target)) return;
    set({ leaf: target });
  },
  setWindow(armed) {
    if (get().window !== armed) set({ window: armed });
  },
  clear() {
    const s = get();
    if (s.leaf !== null || s.window) set({ leaf: null, window: false });
  }
}));

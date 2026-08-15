/**
 * Overlays — the modal and menu chrome that floats above the shell: the
 * create/new-project/shortcuts/attention dialogs, the confirm dialog, the
 * native context menu choke point, and inline session rename.
 */

import type { StateCreator } from 'zustand';
import { showNativeMenu } from '../app/ContextMenu';
import type { MenuSpec } from '../app/ContextMenu';
import { cancelPointerDrag } from '../app/split/pointer-drag';
import type { AppState } from './app-state';

// The menu vocabulary moved to ../app/ContextMenu with the bridge that
// consumes it (Phase 42 stage 8). Re-exported here so ./store.ts and every
// site importing from it keep their existing names.
export type { MenuItemSpec, MenuSpec } from '../app/ContextMenu';

export interface ConfirmSpec {
  title: string;
  body: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  /**
   * Optional THIRD choice, for the one dialog shape where two answers can
   * only lose work: "Save / Don't Save / Cancel" when closing a dirty editor
   * tab. Rendered leading-left, away from the confirm button. Omit it and the
   * dialog stays the two-button destructive confirm it has always been.
   */
  altLabel?: string;
  onAlt?: () => void;
}

export interface OverlaysSlice {
  createOpen: boolean;
  /** New Project… dialog (Phase 12.9 item 1). */
  newProjectOpen: boolean;
  shortcutsOpen: boolean;
  attentionOpen: boolean;
  confirm: ConfirmSpec | null;
  /** Session id being renamed inline (sidebar row or strip). */
  renamingSessionId: string | null;

  setCreateOpen(open: boolean): void;
  setNewProjectOpen(open: boolean): void;
  setShortcutsOpen(open: boolean): void;
  setAttentionOpen(open: boolean): void;
  setConfirm(spec: ConfirmSpec | null): void;
  /** Show a native context menu (null is accepted and ignored — native menus dismiss themselves). */
  setMenu(menu: MenuSpec | null): void;
  setRenaming(sessionId: string | null): void;
}

export const createOverlaysSlice: StateCreator<
  AppState,
  [],
  [],
  OverlaysSlice
> = (set) => ({
  createOpen: false,
  newProjectOpen: false,
  shortcutsOpen: false,
  attentionOpen: false,
  confirm: null,
  renamingSessionId: null,

  setNewProjectOpen(open) {
    set({ newProjectOpen: open });
  },

  setCreateOpen(open) {
    set({ createOpen: open });
  },

  setShortcutsOpen(open) {
    set({ shortcutsOpen: open });
  },

  setAttentionOpen(open) {
    set({ attentionOpen: open });
  },

  setConfirm(spec) {
    set({ confirm: spec });
  },

  setMenu(menu) {
    // DESIGN.md §3: context menus are native macOS menus (Menu.popup),
    // never DOM-drawn. Every trigger surface (session row, project tab,
    // SCM row, tree row, session strip, settings gear) funnels through
    // here into the one thin bridge helper. There is no DOM fallback;
    // null is a no-op (native menus dismiss themselves).
    //
    // Being the ONE choke point is also what makes it the right place to
    // revoke a pending drag (Phase 12.2): the native menu takes an OS mouse
    // grab, so the pointerup that would have torn that drag down never
    // arrives. Cancel here and no surface can be left tracking the pointer
    // underneath an open menu.
    if (menu !== null) {
      cancelPointerDrag();
      showNativeMenu(menu);
    }
  },

  setRenaming(sessionId) {
    // Belt and braces for any path that arms a drag before a rename starts
    // — the rename box must never be fought by a row tracking the pointer.
    if (sessionId !== null) cancelPointerDrag();
    set({ renamingSessionId: sessionId });
  }
});

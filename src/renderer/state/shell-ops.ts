/**
 * The shell operations the store CALLS and does not OWN (Phase 127; four
 * until Phase 260 added the fifth).
 *
 * THE RULE THIS FILE EXISTS FOR. The store is composed by the app shell and
 * by the editor, so it may not name either of them.
 * build/assert-import-boundaries.mjs enforces that as DIRECTORY_WALLS and
 * proves it with ten fixtures. Facts and sentences about the data the store
 * holds belong at or below the store, and they moved down in this phase. An
 * operation on the shell cannot move down, because it is the shell doing
 * something. It is injected here instead.
 *
 * HOW IT WORKS. This module holds one record of five functions, defaulted to
 * silent no-ops. The composition root fills it once, in
 * src/renderer/main.tsx, by calling `installShellOps` from
 * src/renderer/app/shell-ops-install.ts. Every store call site reads through
 * `shellOps()`, so the store keeps one static edge, being this file.
 *
 * WHY THE DEFAULTS ARE SILENT. That is what the product already does when a
 * dependency is absent. `showNativeMenu` in src/renderer/app/ContextMenu.tsx
 * returns without drawing anything when the preload has no `popupMenu`, and
 * there is no DOM fallback, ever (DESIGN.md §3). The same shape holds here.
 * A unit test asserts main.tsx installs the real five, so a forgotten
 * installation fails a test rather than losing a menu in front of a person.
 */

import type { MenuSpec } from '../menus/spec';

/** The operations the store needs and the app shell owns. */
export interface ShellOps {
  /** Draw a native macOS context menu. Never a DOM menu (DESIGN.md §3). */
  showNativeMenu(menu: MenuSpec): void;
  /**
   * Revoke every pending pointer drag. A native menu takes an OS mouse grab,
   * so the pointerup that would have torn a drag down never arrives.
   */
  cancelPointerDrag(): void;
  /** Hand the keyboard to the fleet's primary tile after a project opens. */
  focusFleetPrimary(): void;
  /**
   * Make sure the editor store is subscribed to the open-file bus. The call
   * is idempotent.
   */
  ensureEditorSubscribed(): void;
  /**
   * PHASE 260 (issue 19, research 119 §5.2). Close every editor tab that
   * belongs to `projectId`, through the editor's own Save / Don't Save /
   * Cancel prompt, and call `onClosed` ONLY once every one of them is gone.
   *
   * A project being closed is the ONE reason a project's tabs are closed
   * because of the project; switching projects hides them and closes nothing.
   * The callback is what lets `closeProject` remove the project AFTER the
   * prompt rather than before it: a Cancel on any prompt stops the run, the
   * callback never fires, and the project stays open with its tabs. Without
   * that order a cancelled close would leave the tab in a project that no
   * longer exists, invisible for ever.
   *
   * The silent default calls `onClosed` at once, which is what the product
   * did before this phase: a project closed with its tabs left where they
   * were.
   */
  editorCloseProjectTabs(projectId: string, onClosed: () => void): void;
}

const NO_OPS: ShellOps = {
  showNativeMenu() {},
  cancelPointerDrag() {},
  focusFleetPrimary() {},
  ensureEditorSubscribed() {},
  editorCloseProjectTabs(_projectId, onClosed) {
    onClosed();
  }
};

let installed: ShellOps = NO_OPS;

/**
 * Fill the seam. The composition root calls this once, before the first
 * render. A second call replaces the record whole, which is what the unit
 * tests use and what a future second window would need.
 */
export function installShellOps(next: ShellOps): void {
  installed = next;
}

/** Put the seam back to the silent defaults. Tests use this. */
export function resetShellOps(): void {
  installed = NO_OPS;
}

/** The operations as they stand right now. */
export function shellOps(): ShellOps {
  return installed;
}

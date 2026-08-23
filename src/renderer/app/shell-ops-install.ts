/**
 * The composition act for the store's shell seam (Phase 127).
 *
 * This is the ONE file that knows both halves. It names the four real
 * implementations, which live in the app shell and in the editor, and it
 * hands them to src/renderer/state/shell-ops.ts. src/renderer/main.tsx calls
 * it once, before createRoot, so the seam is filled before the first render
 * and before any store action can run.
 *
 * The direction is what matters. The app imports the store, and the store
 * never imports the app.
 */

import { showNativeMenu } from './ContextMenu';
import { cancelPointerDrag } from './split/pointer-drag';
import { focusFleetPrimary } from './focus-trap';
import { useEditor } from '../editor/store';
import { installShellOps } from '../state/shell-ops';

/** Install the four real operations. Safe to call more than once. */
export function installAppShellOps(): void {
  installShellOps({
    showNativeMenu,
    cancelPointerDrag,
    focusFleetPrimary,
    ensureEditorSubscribed: () => {
      useEditor.getState().init();
    }
  });
}

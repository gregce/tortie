/**
 * Fill mode's one toggle (Phase 18, moved here in Phase 165).
 *
 * This function used to live in `./EditorPanel.tsx`, and two eager modules
 * reached it there, being `src/renderer/app/menu-actions.ts` for the View
 * menu item and `src/renderer/app/fill-chord.ts` for the chord. Phase 165
 * made the panel lazy, and a leaf that imports the panel's own module for one
 * function drags the whole panel, the diff surface, the Monaco host and the
 * shiki family back into the entry chunk. So the function lives in a file of
 * its own that reaches only the two stores and the geometry, and the panel
 * imports it from here for its own button.
 *
 * Nothing about what it does moved. With no file open it is a no-op: there is
 * nothing to fill the window with, and a layout change with no visible
 * subject reads as a bug. Same in overlay mode, where the editor already
 * covers the terminal area. The button, the chord and the menu item all call
 * this one function, so the three cannot drift.
 */

import { editorIsOverlay } from '../state/chrome-geometry';
import { liveChromeGeometry, useApp } from '../state/store';
import { useEditor } from './store';

export function toggleEditorFill(): void {
  const app = useApp.getState();
  if (app.editorFill !== null) {
    app.exitEditorFill();
    return;
  }
  const ed = useEditor.getState();
  if (!ed.panelOpen || ed.tabs.length === 0) return;
  const { windowWidth, workArea } = liveChromeGeometry();
  if (editorIsOverlay(windowWidth, workArea)) return;
  app.enterEditorFill();
}

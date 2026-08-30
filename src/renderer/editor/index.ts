/**
 * Editor stream public surface (Phase 5).
 *
 * `EditorPanelLazy` is the only thing the app shell mounts (a sibling of the
 * terminal region inside `.shell-body`); everything else — Monaco loading,
 * tabs, diff-vs-HEAD, saving — lives behind it. Opening files happens via
 * the canonical bus in src/renderer/state/open-file.ts.
 *
 * PHASE 165. The panel is exported through its lazy door, `./lazy.tsx`, and
 * NOT from `./EditorPanel`. A static re-export of that module here would keep
 * the panel, the diff surface and the shiki family in the entry chunk of every
 * launch whether or not anything used the name, because a module in the
 * static graph is kept for its side effects. `toggleEditorFill` moved to
 * `./fill.ts` for the same reason: the menu and the chord reach it on every
 * launch, and they must be able to do so without loading the panel.
 */

export { EditorPanelLazy, preloadEditorPanel } from './lazy';
export { toggleEditorFill } from './fill';
export { useEditor } from './store';
export type { EditorMode, EditorTab } from './store';

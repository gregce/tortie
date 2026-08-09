/**
 * Editor stream public surface (Phase 5).
 *
 * `EditorPanel` is the only thing the app shell mounts (a sibling of the
 * terminal region inside `.shell-body`); everything else — Monaco loading,
 * tabs, diff-vs-HEAD, saving — lives behind it. Opening files happens via
 * the canonical bus in src/renderer/state/open-file.ts.
 */

export { EditorPanel } from './EditorPanel';
export { useEditor } from './store';
export type { EditorMode, EditorTab } from './store';

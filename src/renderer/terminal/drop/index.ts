/**
 * Drop a file onto a session (Phase 12 item 8) — public surface.
 *
 * Design in one line: a dropped or pasted file becomes an absolute path, and
 * that path is bracket-pasted into the pane through xterm, where the agent's
 * own paste parser turns it into a real attachment ([Image #N] in Claude
 * Code) with no clipboard write and no temp file. Per-agent behavior is DATA
 * in the main-process registry; anything unverified inserts path text.
 *
 * INTEGRATOR WIRING — ONE edit remains, in src/renderer/app/App.tsx:
 *
 *   import { FileDropOverlay, useFileDropRouter } from '../terminal/drop';
 *   useFileDropRouter();          // beside useWindowTitle()
 *   <FileDropOverlay />           // beside <Toasts />
 *
 * and DELETE `useFolderDrop` together with its `const dropping = …` call and
 * the `{dropping ? <div className="drop-overlay" /> : null}` line. That hook
 * installs competing window listeners AND is broken: it reads `File.path`,
 * removed in Electron 32, so today every folder drop silently falls through
 * to the picker. The router replaces it and fixes it (it renders the same
 * `.drop-overlay` frame itself). Leaving both installed double-handles every
 * drop.
 *
 * Already wired by other streams / this one:
 *  - TerminalPane publishes its xterm through `registerTerminal` (the capture
 *    + context-menu stream depends on the same registry).
 *  - main: src/main/drop registered in src/main/index.ts, with the store's
 *    prune-at-ready and daily timer.
 *  - Nothing is needed in TerminalRegion: the overlay portals to document.body
 *    and positions itself from the leaf rect the router measured.
 *
 * Item 1's context-menu **Paste** needs no coordination: it goes through
 * main's `webContents.paste()`, which dispatches a real DOM paste event, so
 * an image on the clipboard takes this module's paste branch automatically.
 */

export { FileDropOverlay } from './FileDropOverlay';
export { useFileDropRouter } from './router';
export { getTerminal, registerTerminal } from './registry';
export {
  canInsert,
  forwardClipboardPaste,
  insertReferences,
  MAX_REFERENCES
} from './insert';
export { attachPaths, resolveAll } from './pipeline';
export type { AttachOptions } from './pipeline';
export { backslashEscape, posixQuote, referenceText } from './reference';
export { imageDropFor, primeImageDropTable } from './strategy';
export { useDropUi } from './state';
export type { AttachPromise, AttachTarget } from './state';
// The 12.9 / 12.10 contract. The file tree calls `beginTreeDrag` from its own
// `dragstart` and touches nothing else here; ./tree-drag.ts states the rule
// and both sides' obligations in full.
export {
  beginTreeDrag,
  endTreeDrag,
  isTreeDragEvent,
  looksLikeImagePath,
  treeDrag,
  treeDragHasImage,
  TREE_DRAG_MIME
} from './tree-drag';
export type { TreeDragSession } from './tree-drag';

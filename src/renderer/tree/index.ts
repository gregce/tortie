/**
 * File tree module — public surface.
 *
 * INTEGRATOR: mount `<FilesSection />` in place of the
 * `<div data-slot="tree" />` slot in src/renderer/app/Sidebar.tsx.
 * The editor stream subscribes with `onOpenFileRequest`.
 */

export { FilesSection } from './FilesSection';
export { FileTree } from './FileTree';
export {
  OPEN_FILE_EVENT,
  onOpenFileRequest,
  requestOpenFile
} from './open-file';
export type { OpenFileRequest } from './open-file';
export { openModeFor } from './decorations';
export { useTreeGitStatus } from './git-status';
export { useFileTree } from './store';
/**
 * The mounted tree's imperative surface. The Explorer's band header uses it
 * for the name-filter toggle (Phase 12.9 item 4) — FilesSection's own header
 * is hidden inside the sidebar, so the button has to live up there.
 */
export { useTreeHandle } from './tree-handle';
export type { TreeHandle } from './tree-handle';

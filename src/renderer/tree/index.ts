/**
 * File tree module — public surface.
 *
 * INTEGRATOR: mount `<FilesSection />` in place of the
 * `<div data-slot="tree" />` slot in src/renderer/app/Sidebar.tsx.
 * The editor stream subscribes with `onOpenFileRequest`.
 */

export { FilesSection } from './FilesSection';
export { FileTree } from './FileTree';
export type { TreeNodeData } from './FileTree';
export {
  OPEN_FILE_EVENT,
  onOpenFileRequest,
  requestOpenFile
} from './open-file';
export type { OpenFileRequest } from './open-file';
export {
  buildStatusIndex,
  decorationFor,
  openModeFor,
  EMPTY_STATUS_INDEX
} from './decorations';
export type { StatusIndex, TreeDecoration } from './decorations';
export { useTreeGitStatus } from './git-status';
export { useFileTree } from './store';

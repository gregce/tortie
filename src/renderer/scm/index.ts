/**
 * SCM stream public surface.
 *
 * INTEGRATOR wiring (src/renderer/app/Sidebar.tsx):
 *   - replace the `.branch-header` stub div with `<BranchHeader />`
 *   - replace `<div data-slot="scm" />` with `<ScmSection />`
 *
 * Editor stream: subscribe to open requests with `onOpenFile` (emitted on
 * SCM row click / Enter); the tree stream may reuse `requestOpenFile` for
 * the same gesture.
 */

export { BranchHeader } from './BranchHeader';
// Phase 90.3. What has changed in a folder on another machine, read only. The
// activity rail's badge reads it, which is what makes that number the machine's
// own count instead of this Mac's.
export {
  remoteChangesAvailable,
  remoteChangesOf,
  useRemoteChanges
} from './remote-changes';
export type { RemoteChangesEntry } from './remote-changes';
export { ScmSection } from './ScmSection';
export { OPEN_FILE_EVENT, onOpenFile, requestOpenFile } from './open-file';
export type { OpenFileRequest, OpenFileSelection } from './open-file';

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
export { ScmSection } from './ScmSection';
export { OPEN_FILE_EVENT, onOpenFile, requestOpenFile } from './open-file';
export type { OpenFileRequest, OpenFileSelection } from './open-file';

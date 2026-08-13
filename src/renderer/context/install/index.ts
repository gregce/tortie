/**
 * The install flow — public surface of the module.
 *
 * `InstallDialog` is the only component. Everything else is a pure rule the
 * view, the dialog and the tests share: the gate that decides whether the
 * control does anything, and the copy, which is final and comes from research
 * 29 rather than from a component.
 */

export { InstallDialog } from './InstallDialog';
export type { InstallDialogProps, InstallDialogSpec } from './InstallDialog';
export { InstallFailure } from './InstallFailure';
export type { CommandFailure } from './InstallFailure';

export { evaluateInstall, pinBlocker } from './install-gate';
export type {
  Blocker,
  BlockerCode,
  InstallGate,
  InstallGateInput
} from './install-gate';

export {
  addMcpCopy,
  changedAfterApprovalCopy,
  commandFailureCopy,
  enablePluginCopy,
  installSkillCopy,
  projectArrivalSentence,
  removeSkillCopy,
  unpinnedCommandCopy
} from './install-copy';
export type { ConfirmCopy, PluginRunRow } from './install-copy';

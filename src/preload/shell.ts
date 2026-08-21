/**
 * The shell-command half of the bridge (Phase 51).
 *
 * Four calls, all invokes with no arguments, no event channel. The Settings
 * row reads status and issues the two explicit clicks; the app shell pulls
 * the pending open, and the pull is take-and-clear main-side so a reload
 * can never deliver the same folder twice. Since Phase 61 the pull returns
 * the folder-and-file pair (ShellPendingOpen), delivered whole. All four
 * are optional feature-detected extras: an older preload means the Settings
 * row does not render and launches still work, since the slot and the argv
 * acceptance live in main.
 */

import type { GmuxShellExtras } from '../shared/ipc';
import { invoke } from './bridge';

export const shell: GmuxShellExtras = {
  shellCommandStatus: () => invoke('shell:commandStatus'),
  installShellCommand: () => invoke('shell:installCommand'),
  removeShellCommand: () => invoke('shell:removeCommand'),
  takePendingOpen: () => invoke('shell:takePendingOpen')
};

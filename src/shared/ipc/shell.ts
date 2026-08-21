/**
 * The shell-command contract (Phase 51): the `tortie` shim that Settings
 * installs, and the pending-open pull that delivers a folder passed on a
 * launch's argv to the renderer.
 *
 * THE CAP, stated where the channels are declared. `tortie .` opens one
 * folder as a project tab in the running window and does nothing else. No
 * channel here may ever grow an argument that selects an agent, starts a
 * session, or runs a command:
 *
 *  - `shell:installCommand` and `shell:removeCommand` take NO arguments, so
 *    no process can steer the write location through IPC. Main alone
 *    computes the target path (src/main/shell/shim.ts).
 *  - The `shell-open-pending` menu action carries NO payload. The path
 *    travels only through `shell:takePendingOpen`, so there is exactly one
 *    way the renderer receives it, and the take-and-clear read means a
 *    renderer reload can never open the folder twice.
 *  - A file may ride along with the folder (Phase 61, a Finder open), and it
 *    may only ever open a tab.
 *
 * Research 48 section 9.3 records why the cap is the whole design: any
 * process on the machine can invoke the shim, so a shim that could start an
 * agent would be a remote control for a process the user never confirmed.
 * That is the exact shape refusal 8 exists to prevent.
 */

/** What the Settings row renders. Computed in main, from the target only. */
export type ShellCommandState =
  | 'installed'
  | 'not-installed'
  | 'unavailable'
  | 'foreign';

export interface ShellCommandStatus {
  state: ShellCommandState;
  /**
   * The absolute path the shim lives at (or would be written to). Null only
   * when no install directory qualifies, which is the 'unavailable' state.
   */
  target: string | null;
  /** Optional detail for the row's error line. */
  reason?: string;
}

/**
 * One pending shell open, delivered whole (Phase 61). One channel returning
 * both halves is what makes delivery atomic. Two separate pulls could pair
 * one arrival's folder with another arrival's file.
 */
export interface ShellPendingOpen {
  /** Absolute folder to open as the project tab. */
  folder: string;
  /** Absolute file inside that folder to open once the project is up, or null. */
  file: string | null;
}

/** New invoke channels appended by Phase 51. All four take no arguments. */
export interface ShellCommandInvokeChannelMap {
  /** The shim's current state; Settings reads it on mount and after acts. */
  'shell:commandStatus': { req: []; res: ShellCommandStatus };
  /** Write the shim to the computed target, 0755. One explicit click. */
  'shell:installCommand': { req: []; res: ShellCommandStatus };
  /** Delete the target, only when it carries the ownership marker. */
  'shell:removeCommand': { req: []; res: ShellCommandStatus };
  /**
   * Take-and-clear the pending open pair. Null when nothing is pending.
   * Before Phase 61 the response was the bare folder string.
   */
  'shell:takePendingOpen': { req: []; res: ShellPendingOpen | null };
}

/**
 * Menu action: a shell open is pending; the renderer pulls it through
 * `shell:takePendingOpen` and routes it into the same `addProjectPath` every
 * other way of opening a project already uses. Payload-free on purpose.
 */
export type ShellOpenMenuActionId = 'shell-open-pending';

/**
 * Top-level extras on window.gmux. An older preload without them renders no
 * Settings row, and launches still work, because the pending slot and the
 * argv parse live in main.
 *
 * Phase 122 made every member required. There is one preload file and it
 * makes one `exposeInMainWorld` call, so the whole bridge can be absent and,
 * when it is present, these members are present with it. The renderer keeps
 * its own `typeof x === 'function'` checks, which now ask about a window
 * that has no preload at all.
 */
export interface GmuxShellExtras {
  shellCommandStatus(): Promise<ShellCommandStatus>;
  installShellCommand(): Promise<ShellCommandStatus>;
  removeShellCommand(): Promise<ShellCommandStatus>;
  takePendingOpen(): Promise<ShellPendingOpen | null>;
}

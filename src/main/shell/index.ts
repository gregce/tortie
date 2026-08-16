/**
 * The shell-command domain (Phase 51): `tortie .` from the shell.
 *
 * argv.ts    — the one pure argv acceptance function (the cap, mechanically)
 * pending.ts — the one pending-open slot and the renderer nudge
 * shim.ts    — compose, install, report and remove the `tortie` shim
 * ipc.ts     — the `shell:*` registrar
 */

export { pickShellOpenPath } from './argv';
export type { ShellOpenPick } from './argv';
export {
  nudgeRenderer,
  setPendingShellOpen,
  takePendingShellOpen
} from './pending';
export { registerShellIpc } from './ipc';

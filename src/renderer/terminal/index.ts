/**
 * gmux terminal stack — public surface for the app shell.
 *
 * INTEGRATOR wiring (src/renderer/app/, owned by another stream):
 *
 *   <section className="terminals" data-slot="terminal-stack">
 *     <TerminalHost
 *       sessions={sessions}                      // from the zustand store
 *       visibleSessionIds={active ? [active] : []}
 *       focusedSessionId={active}
 *     />
 *   </section>
 */

export { TerminalHost } from './TerminalHost';
export type { TerminalHostProps } from './TerminalHost';
export { TerminalPane } from './TerminalPane';
export type { TerminalPaneProps } from './TerminalPane';
export { terminalTheme, resolveTerminalTheme } from './theme';

// Phase 12 items 1 + 2 — the session context menu and its capture actions.
// Exported so other surfaces (a session tab, a command) can serve the same
// menu instead of assembling a second one.
export {
  canSplit,
  showTerminalMenu,
  terminalMenuItems
} from './terminal-menu';
export type { TerminalMenuOptions } from './terminal-menu';
export {
  captureHistory,
  captureSelection,
  captureVisible,
  CAPTURE_PRESETS
} from './capture';

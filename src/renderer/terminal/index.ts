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

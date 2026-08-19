/**
 * Landing the user IN a session — the one implementation.
 *
 * Two surfaces ask for it: the ⌘J attention overlay's rows, and (Phase 12.85)
 * the menu-bar sentinel's rows, which arrive as `focus-session:<id>` menu
 * actions. Both mean the same act: switch to the session's project tab,
 * select the session, hand it the keyboard.
 */

import {
  sameTarget,
  targetOfProject,
  targetOfSession
} from '@shared/workspace-target';
import { useApp } from '../state/store';

/** Hand the keyboard to the visible terminal. */
export function focusTerminal(): void {
  document
    .querySelector<HTMLTextAreaElement>('.gmux-terminal-mount textarea')
    ?.focus();
}

/** Reveal a session wherever it lives; a no-op for an id we do not have. */
export function jumpToSession(sessionId: string): void {
  const s = useApp.getState();
  const session = s.sessions.find((x) => x.id === sessionId);
  if (!session) return;
  // PHASE 90.3. The pair, so a session on another machine lands in that
  // machine's tab rather than in a tab on this Mac that happens to have the
  // same folder path.
  const target = targetOfSession(session);
  const project = s.projects.find((p) => sameTarget(targetOfProject(p), target));
  if (project) s.setActiveProject(project.id);
  s.setActiveSession(session.id);
  // After the tab switch has rendered the session's terminal.
  requestAnimationFrame(focusTerminal);
}

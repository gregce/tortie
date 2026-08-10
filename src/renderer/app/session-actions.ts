/**
 * Shared session-surface behaviors (round 1). Sessions now render on three
 * surfaces — the tab strip (top orientation), the right-docked list and the
 * identity strip (right orientation) — and all of them offer the SAME
 * context menu, rename gesture, and status vocabulary (DESIGN-SPEC S4
 * "Shared behaviors"). This module is the single source for those bits so
 * the surfaces can never drift apart.
 */

import type { Session } from '@shared/types';
import type { MenuItemSpec } from '../state/store';
import { useApp } from '../state/store';
import { statusVisual } from './status';
import type { StatusVisual } from './status';
import { displayPath, formatAge } from './format';

/**
 * True when the session runs outside the project checkout (a git worktree
 * or any other directory) — surfaces mark it with a small ⎇ (S4 tab spec).
 */
export function isOutsideProject(session: Session): boolean {
  return (
    session.cwd !== session.projectPath &&
    !session.cwd.startsWith(`${session.projectPath}/`)
  );
}

/** Tab / row tooltip: "claude-auth — claude · needs input · 4m" (S4). */
export function sessionTooltip(
  session: Session,
  visual: StatusVisual,
  lastActivity: number | undefined,
  now: number
): string {
  const age = formatAge(lastActivity ?? session.createdAt, now);
  const parts = [session.agent, visual.label, age];
  if (isOutsideProject(session)) parts.push(displayPath(session.cwd));
  return `${session.name} — ${parts.join(' · ')}`;
}

/**
 * The one session context menu (S4): Rename, Restore/Restart when ended,
 * Copy directory path, End session… / Remove. `renameTarget` is the
 * renamingSessionId value the calling surface listens for (rows use the
 * plain id; the identity strip prefixes 'strip:' so only one input renders).
 */
export function sessionMenuItems(
  session: Session,
  renameTarget: string
): (MenuItemSpec | 'sep')[] {
  const s = useApp.getState();
  const status = s.effectiveStatus(session);
  const ended = status === 'exited' || status === 'restorable';

  return [
    {
      label: 'Rename',
      hint: 'F2',
      run: () => useApp.getState().setRenaming(renameTarget)
    },
    ...(status === 'restorable' && s.canRestore()
      ? [
          {
            label: 'Restore',
            run: () => void useApp.getState().restoreSession(session.id)
          }
        ]
      : []),
    ...(ended
      ? [
          {
            label: 'Restart',
            run: () => void useApp.getState().restartSession(session.id)
          }
        ]
      : []),
    {
      label: 'Copy directory path',
      run: () => {
        void navigator.clipboard.writeText(session.cwd).then(
          () => useApp.getState().toast('info', 'Directory path copied'),
          () => useApp.getState().toast('error', 'Could not copy the path')
        );
      }
    },
    'sep',
    ...(ended
      ? [
          {
            label: 'Remove',
            destructive: true,
            disabled: !s.canDiscard(),
            run: () => void useApp.getState().removeSession(session.id)
          }
        ]
      : [
          {
            label: 'End session…',
            destructive: true,
            run: () => useApp.getState().endSession(session.id)
          }
        ])
  ];
}

/**
 * The × affordance: ending is ALWAYS confirm-gated; for already-ended
 * sessions the × offers the (also confirmed) Remove instead.
 */
export function closeSession(session: Session): void {
  const s = useApp.getState();
  const status = s.effectiveStatus(session);
  if (status === 'exited' || status === 'restorable') {
    void s.removeSession(session.id);
  } else {
    s.endSession(session.id);
  }
}

/** Re-export for surfaces that already import from here. */
export { statusVisual };

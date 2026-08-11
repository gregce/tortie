/**
 * Shared session-surface behaviors (round 1). Sessions now render on three
 * surfaces — the tab strip (top orientation), the right-docked list and the
 * identity strip (right orientation) — and all of them offer the SAME
 * context menu, rename gesture, and status vocabulary (DESIGN-SPEC S4
 * "Shared behaviors"). This module is the single source for those bits so
 * the surfaces can never drift apart.
 */

import React, { useEffect, useRef, useState } from 'react';
import type { Session } from '@shared/types';
import type { MenuItemSpec } from '../state/store';
import { useApp } from '../state/store';
import { statusVisual } from './status';
import type { StatusVisual } from './status';
import { displayPath, formatAge } from './format';
import { resumeMarkLabel, resumeNote, resumeReadiness } from './resume';
import { Codicon } from '../icons';

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

/**
 * Tab / row tooltip: "claude-auth — claude · needs input · 4m" (S4), with
 * the Phase-13.5 resume sentence on a second line ("Its conversation comes
 * back after a restart."). The dense surfaces can only carry a 12px mark, so
 * the tooltip is where the mark's meaning — and the agent-specific reason —
 * actually reaches the user.
 */
export function sessionTooltip(
  session: Session,
  visual: StatusVisual,
  lastActivity: number | undefined,
  now: number
): string {
  const age = formatAge(lastActivity ?? session.createdAt, now);
  const parts = [session.agent, visual.label, age];
  if (isOutsideProject(session)) parts.push(displayPath(session.cwd));
  const head = `${session.name} — ${parts.join(' · ')}`;
  const note = resumeNote(session);
  return note === null ? head : `${head}\n${note}`;
}

/**
 * The accessible name for a session on any surface: "auth, working" plus the
 * resume mark's meaning when it is showing. An `aria-label` on the row
 * REPLACES its descendants' names, so the mark cannot carry its own — the
 * label has to be assembled here or the indicator is invisible to a screen
 * reader.
 */
export function sessionAriaLabel(
  session: Session,
  visual: StatusVisual
): string {
  const mark = resumeMarkLabel(resumeReadiness(session));
  return `${session.name}, ${visual.label}${mark === null ? '' : `, ${mark}`}`;
}

/**
 * The resume mark (Phase 13.5): a 12px folder beside the status dot on a
 * session that would come back as a directory rather than a conversation.
 *
 * Deliberately marks only the EXCEPTION. An armed session is the product's
 * promise being kept and needs no decoration; a plain shell has no
 * conversation to lose and must not be made to look deficient. Muted, never
 * colored — "directory only" is a fact, not an error (ZEN-OF-TORTIE), and
 * the count both ways lives in the restore bar. Its accessible name rides on
 * the surface's own aria-label (above); the glyph itself is decorative.
 */
export function ResumeMark({
  session
}: {
  session: Session;
}): React.JSX.Element | null {
  if (resumeMarkLabel(resumeReadiness(session)) === null) return null;
  return (
    <span className="resume-mark">
      <Codicon name="folder" size={12} />
    </span>
  );
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

// ---------------------------------------------------------------------------
// Shared rename gesture (extracted by the Phase-10 integrator dup-scan —
// guardrail 4 — from the four surfaces: dock row, tab, identity strip,
// split header). One hook + one input so the gesture can never drift.
// ---------------------------------------------------------------------------

export interface RenameDraft {
  /** True while THIS surface owns the rename (store key matches). */
  renaming: boolean;
  draft: string;
  setDraft: (v: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  /** Commit the draft (no-op rename is skipped) and leave rename mode. */
  commit: () => void;
  /** Leave rename mode without committing. */
  cancel: () => void;
}

/**
 * Draft state for renaming `session` on one surface. `key` is the store's
 * renamingSessionId marker — session.id by default; surfaces that can show
 * a second editor for the same session (the identity strip) pass a
 * distinct marker (`strip:<id>`) so inputs never double up.
 */
export function useRenameDraft(
  session: Session,
  key: string = session.id
): RenameDraft {
  const renamingSessionId = useApp((s) => s.renamingSessionId);
  const setRenaming = useApp((s) => s.setRenaming);
  const renameSession = useApp((s) => s.renameSession);

  const renaming = renamingSessionId === key;
  const [draft, setDraft] = useState(session.name);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (renaming) {
      setDraft(session.name);
      requestAnimationFrame(() => inputRef.current?.select());
    }
  }, [renaming, session.name]);

  const commit = (): void => {
    setRenaming(null);
    if (draft.trim().length > 0 && draft.trim() !== session.name) {
      void renameSession(session.id, draft);
    }
  };

  return {
    renaming,
    draft,
    setDraft,
    inputRef,
    commit,
    cancel: () => setRenaming(null)
  };
}

/** The rename editor itself — Enter commits, Esc cancels, blur commits. */
export function RenameInput({
  rename,
  className
}: {
  rename: RenameDraft;
  className: string;
}): React.JSX.Element {
  return (
    <input
      ref={rename.inputRef}
      className={className}
      value={rename.draft}
      autoFocus
      spellCheck={false}
      onChange={(e) => rename.setDraft(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter') rename.commit();
        if (e.key === 'Escape') rename.cancel();
      }}
      onBlur={rename.commit}
    />
  );
}

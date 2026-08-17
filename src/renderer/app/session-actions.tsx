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
import {
  hasRestoreMaterial,
  resumeMarkLabel,
  resumeNote,
  resumeReadiness
} from './resume';
import { Codicon } from '../icons';
import { openSessionContext } from '../context/open-session';
import { badgeTitle, NO_SNAPSHOT } from './machine-copy';

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
  // Phase 70: no resume sentence for a session on another machine, for the
  // same reason the mark is dropped. Every one of those sentences describes
  // what a restart brings back, and Tortie refuses to restart one.
  const note = session.machine === undefined ? resumeNote(session) : null;
  return note === null ? head : `${head}\n${note}`;
}

/**
 * The resume mark's words for one session, or null when there are none.
 *
 * PHASE 70 put the one branch here. The mark answers "what comes back if this
 * is restarted", and Tortie refuses to restart a session on another machine at
 * all, so the answer for one of those is not "directory only" but nothing. The
 * mark is written from `resumeArgv` and `resumeCapture`, and a remote row
 * carries neither, so the untouched reading would have marked every remote
 * session as coming back without its conversation. That is a promise about a
 * verb that is not offered.
 */
export function resumeMark(session: Session): string | null {
  if (session.machine !== undefined) return null;
  return resumeMarkLabel(resumeReadiness(session));
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
  const mark = resumeMark(session);
  // Phase 70. The machine badge is a descendant of a row that carries its own
  // `aria-label`, and an `aria-label` REPLACES its descendants' names, so the
  // badge's sentence has to be assembled here or a screen reader is told
  // nothing about where the session runs. A session on this Mac adds nothing,
  // which is every session before this release.
  const machine =
    session.machine === undefined ? '' : `, ${badgeTitle(session.machine.label)}`;
  return `${session.name}, ${visual.label}${mark === null ? '' : `, ${mark}`}${machine}`;
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
  if (resumeMark(session) === null) return null;
  return (
    <span className="resume-mark">
      <Codicon name="folder" size={12} />
    </span>
  );
}

/**
 * The × that ends (or, for an ended session, removes) a session.
 *
 * All three surfaces render exactly this button and used to render three
 * copies of it — 20 identical lines in the tab strip, the split header and
 * the dock row, differing ONLY in the class name (research 25 §3, Tier 2).
 * What was duplicated is not markup, it is two pieces of user-facing
 * vocabulary: the verb flips between End and Remove on `ended`, and the
 * accessible name and the tooltip have to flip together. Three copies is
 * three chances for a screen reader to be told "End" while the pointer is
 * told "Remove".
 *
 * The class stays a prop because the three surfaces genuinely size and place
 * the button differently; the behaviour does not vary and so is not a prop.
 */
export function EndSessionButton({
  session,
  ended,
  className
}: {
  session: Session;
  ended: boolean;
  className: string;
}): React.JSX.Element {
  return (
    <button
      type="button"
      className={className}
      tabIndex={-1}
      aria-label={ended ? `Remove ${session.name}` : `End ${session.name}`}
      title={ended ? 'Remove session' : 'End session…'}
      onClick={(e) => {
        e.stopPropagation();
        closeSession(session);
      }}
    >
      <Codicon name="close" size={14} />
    </button>
  );
}

/**
 * The "saved — ready to restore" glyph, rendered by the same three surfaces
 * under three class names and one shared tooltip.
 */
export function SavedMark({ className }: { className: string }): React.JSX.Element {
  return (
    <span className={className} title="Saved — ready to restore">
      <Codicon name="history" size={12} />
    </span>
  );
}

/**
 * Phase 22 §8.3 — the readout. This is the launch snapshot's only entry
 * point, and it is why the snapshot is written at all: no agent records
 * what configuration it loaded, and Tortie owns the launch, so it is the
 * one thing on the machine that can answer. It is offered for a shell
 * too, because "nothing was loaded" is a real answer to the question.
 */
function showLoadedItem(session: Session): MenuItemSpec {
  // Phase 70. The launch snapshot is written on this Mac when the session is
  // created, and a session created on another machine has none. The verb is
  // offered disabled with the reason under it rather than removed: a verb that
  // vanishes teaches nothing, and the reason is a fact about where the record
  // is kept rather than a fault.
  if (session.machine !== undefined) {
    return {
      label: 'Show what it loaded…',
      sublabel: NO_SNAPSHOT,
      disabled: true,
      run: () => {}
    };
  }
  return {
    label: 'Show what it loaded…',
    run: () => openSessionContext(session)
  };
}

function copyDirectoryPathItem(session: Session): MenuItemSpec {
  return {
    label: 'Copy directory path',
    run: () => {
      void navigator.clipboard.writeText(session.cwd).then(
        () => useApp.getState().toast('info', 'Directory path copied'),
        () => useApp.getState().toast('error', 'Could not copy the path')
      );
    }
  };
}

/**
 * The one session context menu (S4): Rename, Restore/Restart when ended,
 * Copy directory path, End session… / Remove. `renameTarget` is the
 * renamingSessionId value the calling surface listens for (rows use the
 * plain id; the identity strip prefixes 'strip:' so only one input renders).
 * An `unknown` row (Phase 67) gets only the two verbs that read Tortie's
 * own records; see the branch below.
 */
export function sessionMenuItems(
  session: Session,
  renameTarget: string
): (MenuItemSpec | 'sep')[] {
  const s = useApp.getState();
  const status = s.effectiveStatus(session);
  // Phase 67. An `unknown` row is one Tortie cannot currently see: the
  // session server did not answer and nothing proved the session dead. Every
  // verb that acts on the tmux side (Rename, Restore, Restart, End
  // session…, Remove) is omitted, because acting on a session that may be
  // alive is how a second agent lands on one conversation. What remains are
  // the two verbs that read only Tortie's own records.
  if (status === 'unknown') {
    return [showLoadedItem(session), copyDirectoryPathItem(session)];
  }
  const ended = status === 'exited' || status === 'restorable';
  // Phase 70. A session on another machine is never offered Restore and never
  // offered Restart, at any status. Nothing about it was written on this Mac,
  // so there is no saved output to replay and no command to arm, and main
  // refuses both verbs for a remote id anyway. Offering a verb that main will
  // refuse is how a person learns to distrust the menu.
  const remote = session.machine !== undefined;
  // Phase 26.3: Restore extends from restorable rows to exited rows that
  // still have material to bring back (saved scrollback or an armed resume
  // command). Main accepts a restore for any exited row; this gate is what
  // keeps the offered verb truthful.
  const offersRestore =
    !remote &&
    s.canRestore() &&
    (status === 'restorable' ||
      (status === 'exited' && hasRestoreMaterial(session)));

  return [
    {
      label: 'Rename',
      hint: 'F2',
      run: () => useApp.getState().setRenaming(renameTarget)
    },
    ...(offersRestore
      ? [
          {
            label: 'Restore',
            run: () => void useApp.getState().restoreSession(session.id)
          }
        ]
      : []),
    ...(ended && !remote
      ? [
          {
            label: 'Restart',
            run: () => void useApp.getState().restartSession(session.id)
          }
        ]
      : []),
    showLoadedItem(session),
    copyDirectoryPathItem(session),
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
  // Phase 67. Ending acts on the tmux side and removing acts on the
  // manifest row, and neither is safe while Tortie cannot see the server:
  // the session may be alive. The × does nothing for an `unknown` row.
  if (status === 'unknown') return;
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

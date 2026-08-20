/**
 * Shared session-surface behaviors (round 1). Sessions now render on three
 * surfaces — the tab strip (top orientation), the right-docked list and the
 * identity strip (right orientation) — and all of them offer the SAME
 * context menu, rename gesture, and status vocabulary (DESIGN-SPEC S4
 * "Shared behaviors"). This module is the single source for those bits so
 * the surfaces can never drift apart.
 */

import React, { useEffect, useRef, useState } from 'react';
import type { Session, SessionMachine } from '@shared/types';
// Phase 73. The read only review reads one folder on one machine through the
// machines bridge. It is feature detected the way Settings detects it, so a
// build without the bridge simply does not offer the verb.
import type {
  GmuxMachinesExtras,
  MachineReviewFile,
  MachineReviewList
} from '@shared/ipc';
import type { MenuItemSpec } from '../state/store';
import { errorText, useApp } from '../state/store';
import { requestOpenFile } from '../state/open-file';
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
import {
  badgeTitle,
  remoteStatusNote,
  READ_LAST_LINES_HERE,
  READ_LAST_LINES_HERE_TITLE,
  NO_SNAPSHOT,
  REVIEW_ITEM_SUBLABEL,
  REVIEW_READING,
  SAVED_OUTPUT_ITEM,
  SAVED_OUTPUT_NONE,
  reviewItemLabel,
  reviewListTitle,
  reviewNotAnsweringSublabel,
  reviewUntrackedTitle
} from './machine-copy';

/**
 * True when the session runs outside the project checkout (a git worktree
 * or any other directory) — surfaces mark it with a small ⎇ (S4 tab spec).
 *
 * PHASE 90.3. NEVER for a session on another machine, and this is a refusal
 * rather than a simplification. The mark means one thing on this Mac, being a
 * git worktree or a folder outside the checkout. On a machine, the same
 * comparison was true for every session an earlier build created, because the
 * row carried this Mac's project folder and the pane's folder was over there.
 * A mark that means "worktree" for one row and "the two paths are on different
 * computers" for another teaches a person nothing, so a row on a machine gets
 * no mark at all. Its badge already says which machine it is on.
 */
export function isOutsideProject(session: Session): boolean {
  if (session.machine !== undefined) return false;
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
 *
 * PHASE 85. A session on another machine has no resume sentence, and that
 * second line now carries `remoteStatusNote` instead, which says how often
 * Tortie asks that machine and says what its dot cannot tell you. A machine
 * that is not answering carries no second line at all.
 */
export function sessionTooltip(
  session: Session,
  visual: StatusVisual,
  lastActivity: number | undefined,
  now: number
): string {
  const age = formatAge(lastActivity ?? session.createdAt, now);
  const parts = [session.agent, visual.label, age];
  if (isOutsideProject(session)) {
    parts.push(displayPath(session.cwd, session.machine?.id));
  }
  const head = `${session.name} — ${parts.join(' · ')}`;
  // Phase 70: no resume sentence for a session on another machine, for the
  // same reason the mark is dropped. Every one of those sentences describes
  // what a restart brings back, and Tortie refuses to restart one.
  //
  // PHASE 85 gives that line to a remote row instead of leaving it empty. The
  // second line now says how often Tortie asks that machine what its sessions
  // are doing, and says the one thing the dot cannot tell you about a session
  // over there. A machine that is not answering gets no note at all, because
  // the badge beside the row already says it did not answer and a promise to
  // ask every 5 seconds would be false beside it.
  const note =
    session.machine === undefined
      ? resumeNote(session)
      : session.machine.answering
        ? remoteStatusNote(session.machine.label)
        : null;
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
 * Whether a surface offers to read back the last lines of this session
 * (Phase 100, replacing the Phase 95 note that said it could not be done).
 *
 * TRUE FOR EXACTLY ONE CASE, being a session that runs on another machine.
 * Tortie reads saved output from the private session server on this Mac, and a
 * session over there has no record here, so the lane at the right edge stays
 * blank and the wheel moves nothing. The panel this opens is what a person
 * gets instead, being one read at one instant.
 *
 * FALSE FOR A SESSION ON THIS MAC, running or not, and that is deliberate. A
 * session on this Mac has a real scrollbar and a real wheel, and it has the two
 * "Capture Last N Lines" items as well, so a fourth way to read the same
 * history would be clutter on top of an answer the person already has.
 *
 * Exported so the tests can state the rule over a set of sessions rather than
 * inferring it from what a render happened to produce.
 */
export function showsReadLastLines(session: Session): boolean {
  return session.machine !== undefined;
}

/**
 * The button itself, drawn by BOTH bands above the terminal (Phase 100).
 *
 * WHY IT LIVES HERE. There is no single band above a session. In the "right"
 * orientation the band is the identity strip in ./TerminalRegion.tsx, and in
 * the "top" orientation, which is the default a person gets, the band is the
 * session tab strip in ./SessionStrip.tsx. A control written into only one of
 * them is invisible to most people, which is exactly what the first build of
 * Phase 95 did with the note this replaces. One component, imported by both, is
 * what stops that.
 *
 * WHY IT IS A BUTTON NOW. Phase 95 drew a `<span>` that said scrolling back was
 * not available. It is available from this phase, so the element is a real
 * `<button type="button">` that opens the panel, and its class is
 * `strip-readback` rather than `strip-note` because a class called "note" would
 * lie about what the element does.
 *
 * The two strips place it differently and that is why `className` is a prop.
 * The identity strip draws it beside the resume mark, in the slot that is
 * empty for exactly these sessions. The tab strip draws it in its own trailing
 * cell, beside the overflow chevron, because the tabs themselves are too
 * narrow for words and only the session on screen is being described.
 */
export function ReadLastLinesButton({
  session,
  className
}: {
  session: Session;
  className: string;
}): React.JSX.Element | null {
  if (!showsReadLastLines(session)) return null;
  return (
    <button
      type="button"
      className={className}
      title={READ_LAST_LINES_HERE_TITLE}
      onClick={() => useApp.getState().openRemoteLines(session.id)}
    >
      <Codicon name="history" size={12} />
      {READ_LAST_LINES_HERE}
    </button>
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

/**
 * PHASE 72 — the saved output panel's one entry point.
 *
 * Offered for EVERY row, on this Mac and on another machine, because the
 * question it answers is the same one in both cases: what did this session
 * print, and when was that copy taken. It reads a file on this Mac and sends
 * nothing anywhere, which is why it is safe even on an `unknown` row, where
 * every verb that acts on a session is withheld.
 *
 * Offered DISABLED with the reason when there is no copy, for the same reason
 * `Show what it loaded…` is: a verb that vanishes teaches nothing, and "there
 * is no saved output" is a real answer to the question.
 */
function savedOutputItem(session: Session): MenuItemSpec {
  if (session.savedOutputAt === undefined) {
    return {
      label: SAVED_OUTPUT_ITEM,
      sublabel: SAVED_OUTPUT_NONE,
      disabled: true,
      run: () => {}
    };
  }
  return {
    label: SAVED_OUTPUT_ITEM,
    run: () => useApp.getState().openSavedOutput(session.id)
  };
}

/**
 * PHASE 73, M6, item 4 — the read only review of a session's folder on the
 * machine it runs on.
 *
 * WHAT IT DOES. It asks that machine which tracked files in that folder differ
 * from the last commit, then opens the two sides of the one a person picks in
 * the diff tab the editor has drawn since Phase 12. No new surface is drawn for
 * either half: the list is a native menu, which is the only kind of menu this
 * product has, and the diff is the tab. `src/renderer/editor/PierreDiff.tsx` is
 * not edited by this phase at all.
 *
 * WHAT IT NEVER DOES. It writes nothing on either computer. The git subcommand
 * lives inside Tortie's own script text on the far side and is never a value
 * this file can supply, so nothing here can turn a review into a commit. It is
 * refused in main while Tortie is not connected to the machine.
 *
 * WHY THE LIST IS A SECOND MENU RATHER THAN A SUBMENU, stated because the spec
 * asked for a submenu. A submenu's items have to exist at the moment the first
 * menu is composed, and `sessionMenuItems` composes synchronously. The list is
 * one question asked of another computer, so the honest choices were a stale
 * cached list drawn as if it were current, or a second menu after the answer
 * arrives. The second menu is drawn at the row the person opened the first one
 * on, so it lands where their eyes already are.
 */
type MachinesApi = NonNullable<GmuxMachinesExtras['machines']>;

/**
 * The machines bridge, feature detected, read through globalThis rather than a
 * bare `window` so the node environment tests can import this module.
 */
function machinesBridge(): MachinesApi | null {
  const api = (globalThis as { window?: { gmux?: unknown } }).window?.gmux as
    | GmuxMachinesExtras
    | undefined;
  return api?.machines ?? null;
}

/**
 * Where the second menu opens: the row the person right-clicked.
 *
 * Every session surface stamps `data-session-id` on its row, and that attribute
 * is already how the app answers "which session has focus". Reading it here
 * means the file list appears at the row rather than at a corner, and it means
 * this module holds no pointer listener of its own.
 */
function menuPointFor(sessionId: string): { x: number; y: number } {
  const doc = (globalThis as { document?: Document }).document;
  const row = doc?.querySelector<HTMLElement>(
    `[data-session-id="${CSS.escape(sessionId)}"]`
  );
  if (row === null || row === undefined) return { x: 24, y: 96 };
  const rect = row.getBoundingClientRect();
  return { x: Math.round(rect.left + 8), y: Math.round(rect.bottom + 2) };
}

/** One changed file becomes one read only tab. */
function openReviewTab(
  list: MachineReviewList,
  file: MachineReviewFile
): void {
  const path = `${list.repoPath}/${file.path}`;
  requestOpenFile({
    repoPath: list.repoPath,
    relPath: file.path,
    path,
    ...(file.origPath !== null ? { origPath: file.origPath } : {}),
    mode: 'diff',
    source: 'machine',
    // Opened for keeps. A person reviewing three files wants three tabs, and
    // a preview tab would replace each one with the next.
    preview: false,
    remote: {
      machineId: list.machineId,
      machineLabel: list.machineLabel,
      repoPath: list.repoPath,
      ...(file.origPath !== null ? { origPath: file.origPath } : {})
    }
  });
}

/**
 * Ask the machine what changed, then offer the answer.
 *
 * A list with nothing in it, and a list main could not read, both end as one
 * sentence composed IN MAIN. This file never writes a sentence about what a
 * machine did or did not do, for the reason `./machine-copy.ts` states: the
 * vocabulary audit reads one file.
 */
async function openRemoteReview(
  session: Session,
  machine: SessionMachine
): Promise<void> {
  const app = useApp.getState();
  const bridge = machinesBridge();
  if (bridge === null || typeof bridge.reviewFiles !== 'function') return;
  app.toast('info', REVIEW_READING);
  let list: MachineReviewList;
  try {
    list = await bridge.reviewFiles({
      machineId: machine.id,
      cwd: session.cwd
    });
  } catch (err) {
    app.toast('error', errorText(err));
    return;
  }
  // PHASE 97. Both groups, because this menu and the Source Control panel read
  // ONE answer and must never disagree about one folder. Until this phase the
  // guard read `list.files.length === 0`, so a folder whose only change was a
  // new file got no menu at all while the panel three inches away listed the
  // file.
  if (list.files.length === 0 && list.untracked.length === 0) {
    if (list.note !== null) app.toast('info', list.note);
    return;
  }
  const items: (MenuItemSpec | 'sep')[] = [];
  if (list.files.length > 0) {
    items.push(
      { label: reviewListTitle(machine.label), disabled: true, run: () => {} },
      'sep',
      ...list.files.map((file) => ({
        label: file.path,
        run: () => openReviewTab(list, file)
      }))
    );
  }
  // A file git has never seen opens through the same gesture. It arrives with
  // `origPath` null, which `openReviewTab` already handles, and the machine
  // answers with an empty left side, so the tab is all green.
  if (list.untracked.length > 0) {
    if (items.length > 0) items.push('sep');
    items.push(
      {
        label: reviewUntrackedTitle(machine.label),
        disabled: true,
        run: () => {}
      },
      'sep',
      ...list.untracked.map((file) => ({
        label: file.path,
        run: () => openReviewTab(list, file)
      }))
    );
  }
  // Main says when it listed only the first files, and the sentence is drawn
  // under them rather than instead of them.
  if (list.note !== null) {
    items.push('sep', { label: list.note, disabled: true, run: () => {} });
  }
  const at = menuPointFor(session.id);
  useApp.getState().setMenu({ x: at.x, y: at.y, items });
}

/**
 * The menu item itself.
 *
 * Offered for every session on a machine, and offered DISABLED with the reason
 * while that machine is not answering. That is the rule `Show what it loaded…`
 * and `Show saved output…` already follow: a verb that vanishes teaches
 * nothing, and "that machine did not answer" is a real answer to the question.
 */
function reviewChangesItem(
  session: Session,
  machine: SessionMachine
): MenuItemSpec {
  const label = reviewItemLabel(machine.label);
  if (!machine.answering) {
    return {
      label,
      sublabel: reviewNotAnsweringSublabel(machine.label),
      disabled: true,
      run: () => {}
    };
  }
  return {
    label,
    sublabel: REVIEW_ITEM_SUBLABEL,
    run: () => void openRemoteReview(session, machine)
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
    return [
      showLoadedItem(session),
      savedOutputItem(session),
      copyDirectoryPathItem(session)
    ];
  }
  const ended = status === 'exited' || status === 'restorable';
  // PHASE 72. Restore is offered for a session on another machine for the
  // first time, and it is offered from ONE fact: `machine.canRestore`, which
  // main sets only when every condition holds. The conditions are in
  // src/main/machines/restore-gate.ts and the renderer does not re-derive any
  // of them, because a second reading is a second answer. Restart stays absent
  // for every remote row: a restart ends a session and starts a new one, and
  // the ending half is a verb aimed at another machine that this rung did not
  // build.
  const machine = session.machine;
  const remote = machine !== undefined;
  // Phase 26.3: Restore extends from restorable rows to exited rows that
  // still have material to bring back (saved scrollback or an armed resume
  // command). Main accepts a restore for any exited row; this gate is what
  // keeps the offered verb truthful.
  const offersRestore =
    s.canRestore() &&
    (machine !== undefined
      ? machine.canRestore
      : status === 'restorable' ||
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
            // PHASE 81. Off until the login shell has said where the person's
            // tools are installed. A native menu carries no tooltip, so this
            // item says nothing extra, and a greyed item for about one second
            // is better than an item that does nothing. Main awaits the same
            // promise, so a restore that got through would still be correct.
            // The renderer's own field is `disabled`; ContextMenu turns it
            // into the bridge's `enabled: false` at the one place that talks
            // to the native menu.
            disabled: !useApp.getState().shellPathReady,
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
    savedOutputItem(session),
    // PHASE 73. Only for a session on another machine, because a session on
    // this Mac already has the git surfaces of the project it belongs to.
    ...(machine !== undefined ? [reviewChangesItem(session, machine)] : []),
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

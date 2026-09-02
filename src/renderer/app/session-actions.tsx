/**
 * Shared session-surface behaviors (round 1). Sessions now render on three
 * surfaces — the tab strip (top orientation), the right-docked list and the
 * identity strip (right orientation) — and all of them offer the SAME
 * context menu, rename gesture, and status vocabulary (DESIGN-SPEC S4
 * "Shared behaviors"). This module is the single source for those bits so
 * the surfaces can never drift apart.
 */

import React, { useEffect, useRef, useState } from 'react';
import type { Session, SessionMachine, SessionStatus } from '@shared/types';
// Phase 73. The read only review reads one folder on one machine through the
// machines bridge. It is feature detected the way Settings detects it, so a
// build without the bridge simply does not offer the verb.
import type {
  InstalledGmuxApi,
  MachineReviewFile,
  MachineReviewList
} from '@shared/ipc';
import type { MenuItemSpec } from '../state/store';
import { effectiveStatusOf, errorText, useApp } from '../state/store';
import { requestOpenFile } from '../state/open-file';
import { statusVisual } from './status';
import type { StatusVisual } from './status';
import { displayPath, formatAge } from '../format';
import {
  BARE_RESTART_LABEL,
  BARE_RESTART_SUBLABEL,
  BARE_RESTORE_LABEL,
  BARE_RESTORE_SUBLABEL,
  RESUME_IN_PLACE_LABEL,
  RESUME_IN_PLACE_SUBLABEL,
  RESUME_VERB,
  RESUME_VERB_TITLE,
  hasRestoreMaterial,
  offersBareRecovery,
  resumeMarkLabel,
  resumeNote,
  resumeReadiness,
  showsResumeVerb
} from '../state/resume';
import type { SessionHandback } from '../state/resume';
import { Codicon, menuGlyph } from '../icons';
import { openSessionContext } from '../context/open-session';
import { openOverviewForSession } from '../overview/open-overview';
import { READ_LAST_LINES_HERE, READ_LAST_LINES_HERE_TITLE } from '../machines/read-lines';
import {
  REVIEW_ITEM_SUBLABEL,
  REVIEW_READING,
  reviewItemLabel,
  reviewListTitle,
  reviewNotAnsweringSublabel,
  reviewUntrackedTitle
} from '../machines/review';
import { badgeTitle, remoteStatusNote } from '../machines/session-badge';
import { NO_SNAPSHOT, SAVED_OUTPUT_ITEM, SAVED_OUTPUT_NONE } from '../machines/session-restore';
import { gmuxBridge } from '../bridge';
// PHASE 152. The two identifiers a session carries, the path of the record the
// agent keeps its conversation in, and the words for each. They live in their
// own module because the one thing this phase has to get right is that the two
// identifiers are never presented as interchangeable, and that rule reads
// better in one place than spread across this file.
import {
  conversationTooltipLine,
  copyMenuItem,
  sessionIdentityItems
} from './session-identity';

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
 *
 * PHASE 152 puts the agent's conversation id between the two, when there is
 * one. Three short lines is still a tooltip; the id is the fact a person is
 * hovering to read, and the sentence stays where it was and says what it said.
 */
export function sessionTooltip(
  session: Session,
  visual: StatusVisual,
  lastActivity: number | undefined,
  now: number,
  handback?: SessionHandback | undefined
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
  //
  // PHASE 141 hands the same slot the handback sentence when this row has one.
  // The three sentences it can carry are in resume.ts, and the one that used to
  // be here for an armed row was true and pointed a person at a restart while
  // their conversation was one press away in the session in front of them. A
  // row on another machine never has a record, because Tortie never witnessed a
  // process over there, so that branch is untouched.
  const note =
    session.machine === undefined
      ? resumeNote(session, handback)
      : session.machine.answering
        ? remoteStatusNote(session.machine.label)
        : null;
  // PHASE 152. The agent's conversation id, on its own line directly under the
  // glance line, so a person can read which conversation this is without
  // opening a menu. It sits ABOVE the sentence because the sentence is the
  // quiet paragraph that explains the mark, and this is a fact about which
  // session you are looking at.
  //
  // ONE FUNCTION DECIDES WHETHER IT IS DRAWN, being `conversationIdOf` in
  // `session-identity.ts`, which the tooltip line and the menu row both call.
  // The fix round found them carrying a copy of the same test each and joined
  // them. Phase 141 paid for the lesson: a fragment composed a second time
  // somewhere else is a second answer, and a surface that announces a value the
  // row does not draw is worse than one that announces nothing.
  //
  // WHY THE ROW'S `aria-label` DOES NOT GAIN IT, said plainly rather than left
  // as an omission. An `aria-label` REPLACES its descendants' names, so every
  // row's accessible name would end in a spoken 36 character uuid, on every row
  // of the list, every time the selection moved. The identifiers reach a screen
  // reader through the native menu instead, where each is one row a person
  // chose to open and where the label says whose identifier it is.
  const conversation = conversationTooltipLine(session);
  const lines = [head, conversation, note].filter(
    (one): one is string => one !== null
  );
  return lines.join('\n');
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
  visual: StatusVisual,
  handback?: SessionHandback | undefined
): string {
  const mark = resumeMark(session);
  // Phase 70. The machine badge is a descendant of a row that carries its own
  // `aria-label`, and an `aria-label` REPLACES its descendants' names, so the
  // badge's sentence has to be assembled here or a screen reader is told
  // nothing about where the session runs. A session on this Mac adds nothing,
  // which is every session before this release.
  const machine =
    session.machine === undefined ? '' : `, ${badgeTitle(session.machine.label)}`;
  // PHASE 141, and it is here for the same reason the machine badge is. The
  // word carrying the verb is a descendant of a row that owns an `aria-label`,
  // so its own name is never read, and a person using a screen reader would be
  // told nothing about the one verb on the row. The fragment asks the SAME
  // predicate that draws the word, so it is added only while the verb is
  // actually drawn: a record alone is not enough, because markLeft publishes
  // 'left' for agents that hand Tortie no conversation id, and those rows
  // have nothing to resume. Every row without the drawn verb reads exactly as
  // it did before this phase.
  const resume = showsResumeVerb(session, handback, effectiveStatusOf(session))
    ? `, ${RESUME_VERB.toLowerCase()} available`
    : '';
  return `${session.name}, ${visual.label}${mark === null ? '' : `, ${mark}`}${machine}${resume}`;
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
      <Codicon name="folder" size="sm" />
    </span>
  );
}

// ---------------------------------------------------------------------------
// PHASE 141 — the word on the row of a session whose agent left.
//
// ONE COMPONENT, DRAWN BY BOTH ROW SURFACES, and that is the whole reason it
// lives in this file. Sessions on the right and sessions on top are two
// surfaces a person switches between, and a verb written into one of them is
// invisible to half the product. `ResumeMark`, `SavedMark`, `EndSessionButton`
// and `ReadLastLinesButton` above all follow the same rule for the same reason.
//
// IT IS NOT A STATUS, A BADGE OR A COUNT. It is a word that is either on one
// row or on no row at all. The status dot beside it is untouched and stays
// hollow, because nothing is running and that is true.
// ---------------------------------------------------------------------------

/** This session's handback record, or undefined when it has none. */
export function useSessionHandback(
  session: Session
): SessionHandback | undefined {
  return useApp((s) => s.handbacks[session.id]);
}

/**
 * The word itself.
 *
 * A real `<button type="button">` rather than a span, because it does
 * something. `tabIndex={-1}` matches `EndSessionButton` beside it: the row owns
 * the keyboard and a second tab stop per row would put a person through two
 * stops for every session in the list. The keyboard road to this verb is the
 * Session menu in the menu bar, which is also the only road that works in
 * session focus mode.
 *
 * The click stops propagating, because the row underneath it selects a session
 * and choosing a verb is not choosing a row.
 *
 * IT TAKES THE TWO FACTS AS PROPS rather than reading them from the store, and
 * that is the shape `EndSessionButton` beside it already has. Both row surfaces
 * hold the status and the record already, for the card sentence and the row's
 * accessible name, so reading them a second time in here would be a second
 * reading of one truth. It also keeps the component drivable from a test with
 * no store behind it.
 */
export function ResumeVerb({
  session,
  handback,
  status
}: {
  session: Session;
  handback: SessionHandback | undefined;
  status: SessionStatus;
}): React.JSX.Element | null {
  if (!showsResumeVerb(session, handback, status)) return null;
  return (
    <button
      type="button"
      className="resume-verb"
      tabIndex={-1}
      title={RESUME_VERB_TITLE}
      aria-label={`${RESUME_VERB} ${session.name}`}
      onClick={(e) => {
        e.stopPropagation();
        void useApp.getState().resumeInPlace(session.id);
      }}
    >
      {RESUME_VERB}
    </button>
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
      <Codicon name="history" size="sm" />
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
      <Codicon name="close" size="md" />
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
      <Codicon name="history" size="sm" />
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
      // The Context view's own mark, the one the activity rail draws for it.
      // This row opens that view, so it wears what that view wears.
      ...menuGlyph('layers'),
      sublabel: NO_SNAPSHOT,
      disabled: true,
      run: () => {}
    };
  }
  return {
    label: 'Show what it loaded…',
    ...menuGlyph('layers'),
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
      ...menuGlyph('output'),
      sublabel: SAVED_OUTPUT_NONE,
      disabled: true,
      run: () => {}
    };
  }
  return {
    label: SAVED_OUTPUT_ITEM,
    ...menuGlyph('output'),
    run: () => useApp.getState().openSavedOutput(session.id)
  };
}

/**
 * PHASE 137.2. The Catch Me Up page, for exactly this row's session.
 *
 * The row sits with "Show what it loaded…" and "Show saved output" because it
 * is the same kind of verb, a read about this session. It reads Tortie's own
 * overview store and the agent's log, it touches nothing on the tmux side,
 * and it lands on the same one session view the chord reaches. It carries no
 * chord hint on purpose, because the chord's level depends on where the
 * keyboard sits while this row always names one session. A remote or shell
 * session still opens the page and gets its honest line there, so the row is
 * never hidden and never disabled.
 */
function catchMeUpItem(session: Session): MenuItemSpec {
  return {
    label: 'Catch me up…',
    // Settings draws `comment` on the Catch Me Up section's rail, for the
    // reason Phase 138 wrote there. This row opens that feature.
    ...menuGlyph('comment'),
    run: () => {
      void openOverviewForSession(session.id, session.projectPath);
    }
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
type MachinesApi = InstalledGmuxApi['machines'];

/** The machines surface, or null on a build with no bridge at all. */
function machinesBridge(): MachinesApi | null {
  return gmuxBridge()?.machines ?? null;
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
 * machine did or did not do, for the reason `../machines/presentation.ts` states, being
 * that the vocabulary audit reads one directory.
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
        ...menuGlyph('git-compare'),
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
        ...menuGlyph('git-compare'),
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
      ...menuGlyph('git-compare'),
      sublabel: reviewNotAnsweringSublabel(machine.label),
      disabled: true,
      run: () => {}
    };
  }
  return {
    label,
    ...menuGlyph('git-compare'),
    sublabel: REVIEW_ITEM_SUBLABEL,
    run: () => void openRemoteReview(session, machine)
  };
}

/**
 * PHASE 152 routed this through the one copy helper its three new neighbours
 * use, so the app has one place that writes to the clipboard from a menu, and
 * its charter forbade giving the row a grey second line. Its stated reason was
 * that the three rows above it show their value because a person cannot
 * otherwise read an identifier, while a folder is already legible from the tab.
 *
 * PHASE 153 CARRIED THAT QUESTION AND ANSWERED IT THE OTHER WAY, because the
 * second half of that reason is not true of every row. `isOutsideProject`
 * above exists precisely because `session.cwd` can be a folder that is not the
 * project's, and the surfaces that notice mark it with a glyph that says a
 * session is somewhere else WITHOUT ever saying where. For those rows the tab
 * answers nothing, and this is the only place in the app that can.
 *
 * So the row gets the same shape as its three neighbours: the label, the value
 * under it, the copy glyph in front of it. The value is drawn in the `~` form
 * and copied absolute, which is exactly the rule `recordPathItem` already
 * states, because `~` is the readable form and an absolute path is the one a
 * terminal and an editor can both open. The clipboard bytes are unchanged.
 */
function copyDirectoryPathItem(session: Session): MenuItemSpec {
  return copyMenuItem({
    label: 'Copy directory path',
    value: session.cwd,
    shows: displayPath(session.cwd, session.machine?.id),
    copied: 'Directory path copied',
    failed: 'Could not copy the path'
  });
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
    // Phase 137.2. The Catch Me Up row joins this branch because it is the
    // same kind of verb the branch exists to keep, a read of Tortie's own
    // records that touches no tmux side.
    return [
      showLoadedItem(session),
      savedOutputItem(session),
      catchMeUpItem(session),
      // PHASE 152. The identifier rows belong in this branch for the reason the
      // branch exists: they read Tortie's own records and the clipboard, and
      // they touch nothing on the tmux side. A row Tortie cannot currently see
      // is exactly the row a person needs to identify by hand.
      ...sessionIdentityItems(session),
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
  // PHASE 119. The insurance verb, both halves. This is the surface the UI rule
  // names, it is native, and its sublabel slot is the only room a menu has for
  // the sentence that explains the row. The predicate is the one in resume.ts,
  // read here and on the ended card so the two cannot drift: this Mac, a
  // capture that is on, and a session that has ended.
  const offersBare = offersBareRecovery(session);
  // PHASE 141. The row that puts the resume command on the person's prompt. It
  // reads the same predicate the word on the row reads, so the menu and the row
  // can never disagree about whether the verb exists. The `unknown` branch
  // above deliberately does NOT get it: that branch keeps only the verbs that
  // read Tortie's own records, and this one types into a live session.
  const offersResumeInPlace = showsResumeVerb(
    session,
    s.handbacks[session.id],
    status
  );

  return [
    {
      label: 'Rename',
      // A CHOSEN mark, the same one the tree's Rename… and the split group's
      // Rename wear. It changes a name in place, which is what this pencil is.
      ...menuGlyph('edit'),
      hint: 'F2',
      run: () => useApp.getState().setRenaming(renameTarget)
    },
    ...(offersRestore
      ? [
          {
            label: 'Restore',
            // The glyph the `SavedMark` above draws under the tooltip
            // "Saved — ready to restore", which is the state this row acts on.
            ...menuGlyph('history'),
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
            // A CHOSEN mark, and the bare row below wears it for the same
            // reason. It is the one mark in the set for starting a stopped
            // thing again under the SAME identity, which is this row exactly:
            // the same session, the same name, a new process. `refresh` and
            // `sync` both say re-read something already running. The word
            // debug is the codicon's own naming rather than the act, and
            // Tortie draws no debugger, so nothing contradicts it.
            ...menuGlyph('debug-restart'),
            run: () => void useApp.getState().restartSession(session.id)
          }
        ]
      : []),
    // PHASE 119. The two bare rows sit after the two ordinary ones, because
    // each is a variant of the verb above it and never a replacement for it.
    // The restore half also needs the Restore gate, since a row with nothing to
    // bring back has nothing to bring back without SpecStory either. Both
    // disappear by themselves once the choice is made, because main clears the
    // row's capture and the projection stops carrying it.
    ...(offersBare && offersRestore
      ? [
          {
            label: BARE_RESTORE_LABEL,
            ...menuGlyph('history'),
            sublabel: BARE_RESTORE_SUBLABEL,
            // The same gate the Restore row above carries, for the same
            // reason: an armed command cannot find the agent until the login
            // shell has said where the person's tools are installed.
            disabled: !useApp.getState().shellPathReady,
            run: () =>
              void useApp
                .getState()
                .restoreSession(session.id, { withoutCapture: true })
          }
        ]
      : []),
    ...(offersBare
      ? [
          {
            label: BARE_RESTART_LABEL,
            ...menuGlyph('debug-restart'),
            sublabel: BARE_RESTART_SUBLABEL,
            run: () =>
              void useApp
                .getState()
                .restartSession(session.id, { withoutCapture: true })
          }
        ]
      : []),
    // PHASE 141. It sits directly above the read only rows, because it is the
    // one verb on this menu that acts on the session in front of the person,
    // and well above the separator and End session. Its second line says where
    // the command goes and who presses Enter, which are the two things a person
    // needs before choosing it. A native menu carries no tooltip, so that grey
    // line is the only room the menu has to say either.
    ...(offersResumeInPlace
      ? [
          {
            label: RESUME_IN_PLACE_LABEL,
            // It types into the session in front of the person, and the
            // terminal is the surface it acts on.
            ...menuGlyph('terminal'),
            sublabel: RESUME_IN_PLACE_SUBLABEL,
            run: () => void useApp.getState().resumeInPlace(session.id)
          }
        ]
      : []),
    showLoadedItem(session),
    savedOutputItem(session),
    catchMeUpItem(session),
    // PHASE 73. Only for a session on another machine, because a session on
    // this Mac already has the git surfaces of the project it belongs to.
    ...(machine !== undefined ? [reviewChangesItem(session, machine)] : []),
    // PHASE 152. The copy verbs are one block, and the agent's conversation id
    // leads it because that is the identifier a person reads, copies and hands
    // back to the agent. `Copy directory path` keeps its place at the foot of
    // the block and is unchanged.
    ...sessionIdentityItems(session),
    copyDirectoryPathItem(session),
    'sep',
    ...(ended
      ? [
          {
            label: 'Remove',
            // The × on the row performs exactly this verb and draws exactly
            // this glyph, so the two cannot read as different things.
            ...menuGlyph('close'),
            destructive: true,
            disabled: !s.canDiscard(),
            run: () => void useApp.getState().removeSession(session.id)
          }
        ]
      : [
          {
            label: 'End session…',
            // The × on the row performs exactly this verb for a live session.
            ...menuGlyph('close'),
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

/**
 * PHASE 141. Re-exported for the same reason `statusVisual` is: the surfaces
 * and the tests already import their session vocabulary from this file. The
 * rule itself lives in ../state/resume.ts, because the sessions slice reads it
 * too and a state module cannot import an app one.
 */
export { showsResumeVerb };

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

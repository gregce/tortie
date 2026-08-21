/**
 * S4 — Terminal region: in "right" orientation the 36px IDENTITY STRIP on
 * top, the restore-all bar when saved sessions await, then the active
 * SURFACE — one session full-bleed, or a drag-built split group of up to 6
 * (S4A). Exactly one surface is visible per project tab; switching swaps the
 * region with no animation (terminal region never animates, §5).
 *
 * In "top" orientation the band above the terminal is the SESSION TAB STRIP,
 * and since Phase 18 (item 3) that strip is no longer rendered here: it lives
 * one level up, in `.work-area`, so it spans the terminal AND the editor
 * instead of being the editor's flex sibling (./SessionStrip.tsx explains
 * why). The 36px is spent at the same y either way, so the terminal's box —
 * and therefore every live session's pane geometry — is unchanged.
 *
 * The band shares one hairline with the sidebar/editor/right-list headers
 * (S1). The single sanctioned interruption is the gap under the ACTIVE
 * session tab, where --bg-canvas runs through into the terminal.
 */

import React, { useEffect, useRef } from 'react';
import type { MachineStateView } from '@shared/ipc';
import type { Session, SessionMachine } from '@shared/types';
import { TerminalHost } from '../terminal';
import {
  badgeMachineOf,
  effectiveStatusOf,
  silentMachines,
  useApp
} from '../state/store';
import { useLayout } from '../state/layout';
import {
  diedRightAfterStart,
  endedBadly,
  endedTitle,
  exitDetailNote,
  fastDeathSentence,
  fastDeathTitle,
  machineUnreachable,
  statusVisual,
  unreachableMachines
} from './status';
import './unreachable.css';
import { MachineBadge } from './MachineBadge';
import {
  RESTORE_KEPT_HERE,
  badgeQuietTitle,
  badgeSilentTitle,
  machineSilentText,
  restoreNotOfferedBody,
  restoreRemoteBody
} from './machine-copy';
import {
  ReadLastLinesButton,
  RenameInput,
  resumeMark,
  sessionMenuItems,
  useRenameDraft
} from './session-actions';
import {
  BARE_RECOVERY_NOTE,
  BARE_RESTORE_LABEL,
  hasRestoreMaterial,
  offersBareRecovery,
  restoreActionCopy,
  restoreExitedCopy,
  restoreSummary,
  resumeNote,
  SHELL_PATH_PENDING_TITLE
} from './resume';
import { AgentIcon, Codicon } from '../icons';
// §6.2 lives with the other full-window empty states (./EmptyStates).
import { NoSessions } from './EmptyStates';
import { SplitDropOverlay, SplitSurfaceView } from './split/SplitSurface';
import { useProjectSurfaces } from './surfaces';
import { useTermFocused } from './term-focus';

// ---------------------------------------------------------------------------
// Orientation "right": identity strip in the band (list lives in SessionDock)
// ---------------------------------------------------------------------------

export function IdentityStrip({
  session,
  grouped,
  termFocused
}: {
  session: Session;
  /** The session is the focused leaf of a split group (S4A). */
  grouped: boolean;
  termFocused: boolean;
}): React.JSX.Element {
  const setRenaming = useApp((s) => s.setRenaming);
  const setMenu = useApp((s) => s.setMenu);

  const status = effectiveStatusOf(session);
  const visual = statusVisual(status, session);
  // Phase 70: null for a session on another machine, because the mark answers
  // a question about a restart that Tortie will not perform there.
  const mark = resumeMark(session);
  // Marker suffix so the dock row's rename input (plain id) never doubles up.
  const rename = useRenameDraft(session, `strip:${session.id}`);
  const renaming = rename.renaming;

  return (
    <div
      className={`term-header identity-strip${termFocused ? ' term-focused' : ''}`}
      data-session-id={session.id}
    >
      {grouped ? (
        <Codicon name="split-horizontal" size={16} className="identity-agent" />
      ) : (
        <AgentIcon agent={session.agent} size={16} className="identity-agent" />
      )}
      {renaming ? (
        <RenameInput rename={rename} className="strip-rename-input" />
      ) : (
        <span
          className="identity-name"
          onDoubleClick={() => setRenaming(`strip:${session.id}`)}
          title={session.name}
        >
          {session.name}
        </span>
      )}
      {/* Phase 70: the identity strip has the room to say where this session
          runs. Phase 95 corrects a sentence that used to sit here, which said
          this was the one band always on screen above a session. It is not.
          It is the band for the "right" orientation only, and the "top"
          orientation, which is the default, draws ./SessionStrip.tsx instead.
          Anything that has to be seen by everyone goes in both. */}
      <MachineBadge machine={session.machine} className="identity-machine" />
      <span
        className={`strip-status${status === 'needs_input' ? ' attention' : ''}`}
      >
        {visual.label}
      </span>
      {/* The strip has room the 24px rows do not, so here the resume state is
          words rather than a glyph — DESIGN.md §1.3's own split. */}
      {mark !== null ? (
        <span className="strip-resume" title={resumeNote(session) ?? undefined}>
          <Codicon name="folder" size={12} />
          {mark}
        </span>
      ) : null}
      {/* Phase 100: the same slot, the same muted shape. `resumeMark` is null
          for every session on another machine, so these two never both draw.
          ./SessionStrip.tsx draws the identical button in the "top"
          orientation, because this band is not on screen there. It replaces
          Phase 95's note, which said scrolling back was not available. */}
      <ReadLastLinesButton session={session} className="strip-readback" />
      <span className="strip-spacer" />
      <button
        type="button"
        className="icon-btn"
        aria-label={`Session actions for ${session.name}`}
        onClick={(e) => {
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
          setMenu({
            x: r.right - 180,
            y: r.bottom + 4,
            items: sessionMenuItems(session, `strip:${session.id}`)
          });
        }}
      >
        <Codicon name="ellipsis" size={16} />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Restore-all bar (moved from the removed sidebar Sessions section — S4)
// ---------------------------------------------------------------------------

function RestoreAllBar({
  sessions
}: {
  sessions: Session[];
}): React.JSX.Element | null {
  const canRestore = useApp((s) => s.canRestore);
  const restoreAllSessions = useApp((s) => s.restoreAllSessions);
  const restoringIds = useApp((s) => s.restoringIds);
  // PHASE 81. The session list arrives before the login shell answers now, so
  // this strip can be on screen about a second before Tortie can honour it.
  // The button says so rather than failing quietly.
  const shellPathReady = useApp((s) => s.shellPathReady);

  // PHASE 71. Two changes, and both are about offering an action Tortie will
  // actually perform.
  //
  // The status is read through `effectiveStatusOf`, the one expression every
  // surface reads status through, so this bar can never decide from a different
  // reading than the rows behind it.
  //
  // A row that carries a machine is excluded whatever its status. Restore is
  // refused for every session on another machine, in main and in the menu
  // alike, so a bar offering to restore all of them would offer an action that
  // is refused the moment it is pressed.
  const restorable = sessions.filter(
    (x) => effectiveStatusOf(x) === 'restorable' && x.machine === undefined
  );
  if (restorable.length < 2 || !canRestore()) return null;
  const busy = restorable.some((x) => restoringIds[x.id] === true);

  return (
    <div className="restore-strip" role="status">
      {/* Phase 13.5: the count alone ("6 saved sessions") let the user press
          Restore all and only then discover which conversations were never
          coming back. The split is stated before the button, not after. */}
      <span className="restore-strip-text">{restoreSummary(restorable)}</span>
      <button
        type="button"
        className="btn-restore"
        disabled={busy || !shellPathReady}
        {...(shellPathReady ? {} : { title: SHELL_PATH_PENDING_TITLE })}
        onClick={() => void restoreAllSessions()}
      >
        <Codicon name="history" size={12} />
        &nbsp;{busy ? 'Restoring…' : 'Restore all'}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Machine-unreachable condition bar (Phase 67)
// ---------------------------------------------------------------------------

/**
 * The one line the whole condition gets. The copy is research 51 section
 * 4.6's binding sentence, and it is the entire signal: no button, no icon,
 * no notification anywhere else. Restore is deliberately not offered here,
 * because nothing proved the sessions are gone, and a restore of a live
 * session starts a second agent on the same conversation.
 */
export const UNREACHABLE_BAR_TEXT =
  'Machine unreachable. Your sessions are untouched. Tortie just cannot ' +
  'see them.';

/**
 * Phase 70 adds one thing to this bar and rewords nothing.
 *
 * The sentence above is research 51 section 4.6's binding copy and it stays
 * exactly as it is. What it never said is WHICH machine, because until this
 * release there was only this Mac. A badge for each quiet machine goes beside
 * it, so the sentence is unchanged and the person can still tell what went
 * quiet. A bar for this Mac alone draws no badge and reads as it always did.
 */
export function UnreachableBar({
  machines = [],
  silent = []
}: {
  machines?: readonly SessionMachine[];
  /**
   * Confirmed machines that are not answering and that Tortie holds no rows
   * for (Phase 71). They get their badge here so the sentence above never has
   * to share a line with a second one.
   */
  silent?: readonly MachineStateView[];
} = {}): React.JSX.Element {
  const drawn = new Set(machines.map((one) => one.id));
  return (
    <div className="unreachable-strip" role="status">
      <span className="unreachable-strip-text">{UNREACHABLE_BAR_TEXT}</span>
      {machines.map((machine) => (
        <MachineBadge
          key={machine.id}
          machine={machine}
          className="unreachable-strip-machine"
        />
      ))}
      <SilentBadges states={silent.filter((one) => !drawn.has(one.id))} />
    </div>
  );
}

/**
 * One badge per machine that is not answering, from main's own statement
 * rather than from rows (Phase 71).
 *
 * A machine that has never answered in this run says something different from
 * one that answered and then stopped, so the sentence is chosen here and handed
 * to the badge rather than derived inside it.
 */
function SilentBadges({
  states
}: {
  states: readonly MachineStateView[];
}): React.JSX.Element | null {
  if (states.length === 0) return null;
  return (
    <>
      {states.map((state) => (
        <MachineBadge
          key={state.id}
          machine={badgeMachineOf(state)}
          className="unreachable-strip-machine"
          title={
            state.everAnswered
              ? badgeQuietTitle(state.label)
              : badgeSilentTitle(state.label)
          }
        />
      ))}
    </>
  );
}

/**
 * The bar for a machine Tortie holds NO rows for (Phase 71).
 *
 * This is the startup hole. A remote session has no record on this Mac, so a
 * confirmed machine that is down when Tortie starts contributes no row, no
 * badge and nothing dimmed anywhere, and the person who left an agent running
 * there was told nothing at all. The sentence names the machine and says what
 * Tortie did, which is nothing.
 *
 * The Phase 67 sentence above is not reused here, because it is about sessions
 * that are on the screen with their status dimmed and there are none.
 */
export function MachineSilentBar({
  silent
}: {
  silent: readonly MachineStateView[];
}): React.JSX.Element | null {
  if (silent.length === 0) return null;
  return (
    <div className="unreachable-strip" role="status">
      <span className="unreachable-strip-text">
        {machineSilentText(silent.map((one) => one.label))}
      </span>
      <SilentBadges states={silent} />
    </div>
  );
}

/**
 * The region's one bar slot. While the machine condition is on, the
 * restore-all bar does not render, so the two bars never argue: one says
 * "nothing is proven gone" and the other would offer to act on death.
 *
 * The order is deliberate and it is stated in research 51 section 4.6's terms.
 * A visible row reading `unknown` wins, because that sentence is the binding
 * copy and it is about rows a person can see. The silent machine bar is second,
 * because it exists precisely for the case where there is nothing to see. The
 * restore-all bar is last, because it offers to act on sessions that are over
 * and neither of the other two has proved that anything is.
 */
/**
 * The machine statement on its own, for the window states that draw no region
 * bars at all (Phase 71 fix round).
 *
 * MEASURED, and it is why this exists. The bar above renders inside the terminal
 * region, and the terminal region returns early when no project is open. So a
 * confirmed machine that was down at startup was named correctly with a project
 * open and said nothing whatsoever with none open: the window showed the empty
 * board and no statement about the machine anywhere. The statement is about a
 * MACHINE, and whether a person has a project open is not a fact about their
 * machine, so it does not decide whether they are told.
 *
 * Two mounts, and between them they cover every state that skips the region
 * bars: the first-run board in ./App.tsx, and the region's own no-project branch
 * below. A state that draws `RegionBars` never draws this one, so the sentence
 * cannot appear twice.
 */
export function MachineStatement(): React.JSX.Element | null {
  const machineStates = useApp((s) => s.machineStates);
  return <MachineSilentBar silent={silentMachines(machineStates)} />;
}

export function RegionBars({
  sessions,
  silent: given
}: {
  sessions: Session[];
  /**
   * The quiet machines, when the caller already has them.
   *
   * The app never passes this: it reads the store below. It exists because
   * zustand answers a SERVER render from the store's initial state rather than
   * its current one, so a test that renders this component to static markup
   * cannot see a `setState`. The prop is how those tests state the case they
   * are testing, and the store path is exercised in the running app and by the
   * screenshot reads.
   */
  silent?: readonly MachineStateView[];
}): React.JSX.Element | null {
  const machineStates = useApp((s) => s.machineStates);
  const silent = given ?? silentMachines(machineStates);
  if (machineUnreachable(sessions)) {
    return (
      <UnreachableBar
        machines={unreachableMachines(sessions)}
        silent={silent}
      />
    );
  }
  if (silent.length > 0) return <MachineSilentBar silent={silent} />;
  return <RestoreAllBar sessions={sessions} />;
}

// ---------------------------------------------------------------------------
// The ended state's one paragraph
// ---------------------------------------------------------------------------

/** What the ended block knows about the session it is drawing. */
export interface EndedBody {
  session: Session;
  /** Phase 48: this window watched it start and it was gone within 5 seconds. */
  fastDeath: boolean;
  /** The status is `exited` rather than `restorable`. */
  exited: boolean;
  /** Restore is being offered beside or instead of Restart. */
  offersRestore: boolean;
  /** The build can restore at all. */
  canRestore: boolean;
}

/**
 * The one sentence under the ended block's title.
 *
 * It was five nested ternaries inside the JSX and it is a function now, for
 * one reason: Phase 70 added a sixth branch whose whole point is that a person
 * reads it instead of pressing a button, and a branch that decides what a
 * refusal says has to be testable without mounting the whole region. Nothing
 * about the five original branches moved.
 *
 * PHASE 72 split that sixth branch in two and dropped the `remote` field it
 * used to take. The field was `session.machine !== undefined` written twice, so
 * a caller could pass a boolean that disagreed with the session it passed
 * beside it. Now there is one source for the answer and it is the row itself.
 */
export function endedBodyText(body: EndedBody): string {
  const { session, fastDeath, exited, offersRestore, canRestore } = body;
  const machine = session.machine;
  // PHASE 72. A session on another machine says one of two things, and which
  // one is decided by main and nothing else. Offered: what Restore will do,
  // including the two things it will not do. Refused: the sentence main sent
  // naming the condition that failed. Either way it outranks every branch
  // below, because none of those describes a session that lives somewhere else.
  if (machine !== undefined) {
    return machine.canRestore
      ? restoreRemoteBody(machine.label)
      : (machine.restoreReason ?? restoreNotOfferedBody(machine.label));
  }
  // Phase 48 — the bound, never a duration. See FAST_DEATH_MS in ./status for
  // why a decimal would be invented.
  if (fastDeath) return fastDeathSentence(session);
  if (exited) {
    // Phase 26.3 — the verb copy says what comes back and names what does not
    // (the killed process stays gone).
    return offersRestore
      ? restoreExitedCopy(session)
      : 'Restarting opens a fresh session with the same name and directory.';
  }
  // Phase 13.5 — the same honesty the row mark carries, said in full at the
  // moment the user is about to act.
  return canRestore
    ? restoreActionCopy(session)
    : 'This session is saved but not running — restart it to pick up in the same directory.';
}

// ---------------------------------------------------------------------------
// Terminal region
// ---------------------------------------------------------------------------

export function TerminalRegion(): React.JSX.Element {
  const sessions = useApp((s) => s.sessions);
  const orientation = useApp((s) => s.sessionOrientation);
  const restartSession = useApp((s) => s.restartSession);
  const removeSession = useApp((s) => s.removeSession);
  const canDiscard = useApp((s) => s.canDiscard);
  const canRestore = useApp((s) => s.canRestore);
  const restoreSession = useApp((s) => s.restoreSession);
  const restoringIds = useApp((s) => s.restoringIds);
  // Phase 81, the same honesty on the session card's own Restore button.
  const cardShellReady = useApp((s) => s.shellPathReady);
  const setVisibleSessions = useApp((s) => s.setVisibleSessions);
  // Phase 48. When this window saw each session stop, for the ones it also
  // saw running. The projection carries no death time, so the "stopped right
  // after it started" answer is observed rather than read.
  const endedSeenAt = useApp((s) => s.endedSeenAt);
  const toast = useApp((s) => s.toast);
  const reconcile = useLayout((s) => s.reconcile);

  // One derivation for the strip, this region and the dock (./surfaces.ts).
  const {
    project,
    projectSessions,
    sessionsById,
    activeSurface,
    activeLeafId,
    selectedId
  } = useProjectSurfaces();
  const termFocused = useTermFocused();

  const surfaceRootRef = useRef<HTMLDivElement | null>(null);

  const active = selectedId === null ? null : (sessionsById.get(selectedId) ?? null);

  // Prune persisted layout when sessions come and go (dead leaves collapse,
  // one-leaf groups dissolve back to plain tabs). This region is the ONLY
  // caller — the derivation hook is read by three components and must not
  // give three of them a chance to write.
  const projectPath = project?.path ?? null;
  const sessionIdsKey = projectSessions.map((x) => x.id).join(',');
  useEffect(() => {
    if (projectPath !== null) {
      reconcile(projectPath, sessionIdsKey === '' ? [] : sessionIdsKey.split(','));
    }
  }, [projectPath, sessionIdsKey, reconcile]);

  // Report the mounted panes (active surface's leaves) so the status
  // detector watches every visible terminal, not just the focused one.
  const visibleKey = (activeSurface?.leafIds ?? []).join(',');
  useEffect(() => {
    setVisibleSessions(visibleKey === '' ? [] : visibleKey.split(','));
  }, [visibleKey, setVisibleSessions]);

  if (!project) {
    // First-run state is rendered by App (full window, §6.1). The machine
    // statement still renders, because a machine that did not answer is a fact
    // about the person's machines rather than about the project they have open.
    return (
      <main className="center" data-slot="terminal-stack">
        <MachineStatement />
      </main>
    );
  }

  const status = active ? effectiveStatusOf(active) : null;
  const exited = active !== null && status === 'exited';
  const restorable = active !== null && status === 'restorable';
  // §6.6 exit-code truth: a recorded non-zero exit — or a recorded SIGNAL,
  // which carries no exit code at all (Phase 12.7 F2) — renders the failed
  // state, and endedTitle() names the cause instead of printing a number.
  const failed = exited && endedBadly(active);
  // PHASE 48. The exit-127 branch that used to live here is gone. It said the
  // agent could not be found when the agent HAD been found and its
  // interpreter had not, and it then printed the npm command that produced
  // the problem. It also suppressed Restore, so its only action was Restart,
  // and Restart re-ran the identical create path and died identically. The
  // preflight in main now catches that case before the launch, and what is
  // drawn here is the case no static check can predict: the agent started and
  // then stopped, and the pane said why on its way out.
  const fastDeath =
    exited &&
    diedRightAfterStart({
      createdAt: active.createdAt,
      endedAt: endedSeenAt[active.id]
    });
  // The pane's own last words, drawn verbatim and never parsed. Absent on
  // every row written before this build and on every death with an empty
  // pane, and the block then reads exactly as it did before.
  const lastWords = exited && failed ? active.exitDetail : undefined;
  // PHASE 72. A session on another machine is now offered Restore, and the
  // answer comes from ONE fact main sent, being `machine.canRestore`. The
  // renderer re-derives none of the five conditions behind it, because a
  // second reading is a second answer. Restart stays absent for every remote
  // row: a restart ends a session and starts a new one, and the ending half is
  // a verb aimed at another machine that this rung did not build.
  const machine = active?.machine;
  const remote = machine !== undefined;
  // Phase 26.3: an exited session offers Restore beside Restart when it
  // still has material to bring back (resume.ts hasRestoreMaterial).
  const offersRestore =
    active !== null &&
    canRestore() &&
    (machine !== undefined
      ? machine.canRestore
      : restorable || (exited && hasRestoreMaterial(active)));
  // PHASE 119. The insurance verb. It rides on top of the Restore gate above,
  // because a card that cannot offer Restore has nothing to offer a variant of,
  // and it adds the three facts in resume.ts offersBareRecovery: this Mac, a
  // capture that is on, and a session that has ended. Only the restore half is
  // offered here. The restart half lives in the session's context menu, because
  // a fifth button would crowd a card that already draws up to four.
  const offersBare =
    active !== null && offersRestore && offersBareRecovery(active);

  const grouped = activeSurface !== null && activeSurface.isGroup;

  // In "right" orientation this region still owns its band slice, and it
  // renders in EVERY state (zero sessions included) so the S1 hairline never
  // breaks: the active session's identity strip, or an empty band. In "top"
  // orientation the band is the hoisted session strip, one level up
  // (./SessionStrip.tsx) — rendering anything here would draw a second one.
  const band =
    orientation !== 'right' ? null : active ? (
      <IdentityStrip
        session={active}
        grouped={grouped}
        termFocused={termFocused}
      />
    ) : (
      <div className="term-header identity-strip" />
    );

  return (
    <main className="center" data-slot="terminal-stack">
      {band}
      <RegionBars sessions={projectSessions} />
      {projectSessions.length === 0 ? (
        <NoSessions />
      ) : grouped && activeSurface ? (
        // S4A: split group — every leaf its own session, panes side by side.
        <div
          ref={surfaceRootRef}
          className="term-body surface-root"
          data-surface-leaves
          data-surface-id={activeSurface.id}
          data-leaf-count={activeSurface.leafIds.length}
        >
          <SplitSurfaceView
            surface={activeSurface}
            projectPath={project.path}
            sessions={projectSessions}
            focusedLeafId={activeLeafId}
          />
          <SplitDropOverlay rootRef={surfaceRootRef} />
        </div>
      ) : active && (exited || restorable) ? (
        // §6.6 / §6.8 — the tmux-side session is gone, so there is no
        // scrollback to keep under a banner; a quiet state carries the
        // same copy and actions instead. Restorable sessions (Phase 6)
        // offer the real §2.4 Step 3 restore: saved scrollback replayed,
        // resume command armed — you press Enter. Since Phase 26.3 an
        // exited session with material offers the same restore too.
        <div className={`empty${failed ? ' empty-failed' : ''}`}>
          {/* onb-inner: one rhythm across every full-window state (§6.2/§6.6
              share the type scale and action spacing — app/empty-states.css). */}
          <div className="empty-inner onb-inner">
            <h2 className="empty-title">
              {fastDeath
                ? // Phase 115. The whole session rides along, so a captured
                  // signal death can name SpecStory instead of the agent.
                  fastDeathTitle(active.agent, active)
                : exited
                  ? endedTitle(active)
                  : 'Ready to restore'}
            </h2>
            <p className="empty-body">
              {endedBodyText({
                session: active,
                fastDeath,
                exited,
                offersRestore,
                canRestore: canRestore()
              })}
            </p>
            {/* PHASE 119. Said only when the bare verb is on screen beside it,
                because it is the sentence that explains that button. It names
                no failure and it asks for nothing: the session saves its
                history today, and this is the way to bring it back without
                that. */}
            {offersBare ? (
              <p className="empty-body">{BARE_RECOVERY_NOTE}</p>
            ) : null}
            {/* Phase 72. A remote restore does not put the saved output back
                into the recreated session on the other machine, so the person
                is told where that output is instead of finding a blank pane.
                Drawn only when there is a copy to open. */}
            {remote && active.savedOutputAt !== undefined ? (
              <p className="empty-body">{RESTORE_KEPT_HERE}</p>
            ) : null}
            {lastWords !== undefined ? (
              <>
                <p className="exit-detail-lead">
                  The last thing it printed was:
                </p>
                {/* Verbatim, monospace, selectable, and never parsed. No
                    branch anywhere reads these bytes to decide anything. */}
                <pre className="exit-detail">{lastWords}</pre>
                <p className="exit-detail-note">{exitDetailNote(active)}</p>
              </>
            ) : null}
            <div className="empty-actions">
              {offersRestore ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={restoringIds[active.id] === true || !cardShellReady}
                  {...(cardShellReady
                    ? {}
                    : { title: SHELL_PATH_PENDING_TITLE })}
                  onClick={() => void restoreSession(active.id)}
                >
                  {restoringIds[active.id] === true ? 'Restoring…' : 'Restore'}
                </button>
              ) : null}
              {/* PHASE 119. Secondary, and it sits between Restore and Restart
                  because it is a variant of Restore rather than a fifth verb.
                  It carries the same two gates the button above it does: the
                  restore in flight, and the login shell that has not yet said
                  where the person's tools are installed. A recovery button that
                  worked before the PATH is known would restore into a pane that
                  cannot find the agent. */}
              {offersBare ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={restoringIds[active.id] === true || !cardShellReady}
                  {...(cardShellReady
                    ? {}
                    : { title: SHELL_PATH_PENDING_TITLE })}
                  onClick={() =>
                    void restoreSession(active.id, { withoutCapture: true })
                  }
                >
                  {BARE_RESTORE_LABEL}
                </button>
              ) : null}
              {/* Phase 26.3 layout rule: Restore is primary when offered and
                  Restart drops to secondary beside it. Without Restore,
                  Restart stays primary as before. The restorable state keeps
                  its Restore-and-Remove pair unchanged. */}
              {!remote && (!offersRestore || exited) ? (
                <button
                  type="button"
                  className={`btn ${offersRestore ? 'btn-secondary' : 'btn-primary'}`}
                  onClick={() => void restartSession(active.id)}
                >
                  Restart
                </button>
              ) : null}
              {canDiscard() ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => void removeSession(active.id)}
                >
                  Remove
                </button>
              ) : null}
              {/* Phase 48. The message is the thing a person pastes into a
                  search or a bug report, so it gets a button rather than a
                  drag select over a block that may have scrolled. */}
              {lastWords !== undefined ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    void navigator.clipboard.writeText(lastWords).then(
                      () => toast('info', 'Message copied'),
                      () => toast('error', 'Could not copy the message')
                    );
                  }}
                >
                  Copy message
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <div
          ref={surfaceRootRef}
          className="term-body surface-root"
          data-surface-leaves
          data-surface-id={activeSurface?.id ?? ''}
          data-leaf-count={1}
        >
          <div
            className="surface-single"
            data-split-leaf={active?.id ?? ''}
          >
            <TerminalHost
              sessions={sessions}
              visibleSessionIds={active ? [active.id] : []}
              focusedSessionId={active?.id ?? null}
            />
          </div>
          <SplitDropOverlay rootRef={surfaceRootRef} />
        </div>
      )}
      {/* Editor stream mounts here (S5); hidden while empty. */}
      <div className="editor-slot" data-slot="editor" />
    </main>
  );
}

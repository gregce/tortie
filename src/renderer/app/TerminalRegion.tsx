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
import type { Session } from '@shared/types';
import { TerminalHost } from '../terminal';
import { effectiveStatusOf, useApp } from '../state/store';
import { useLayout } from '../state/layout';
import {
  diedRightAfterStart,
  endedBadly,
  endedTitle,
  exitDetailNote,
  fastDeathSentence,
  fastDeathTitle,
  machineUnreachable,
  statusVisual
} from './status';
import './unreachable.css';
import {
  RenameInput,
  sessionMenuItems,
  useRenameDraft
} from './session-actions';
import {
  hasRestoreMaterial,
  restoreActionCopy,
  restoreExitedCopy,
  restoreSummary,
  resumeMarkLabel,
  resumeNote,
  resumeReadiness
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

function IdentityStrip({
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
  const resumeMark = resumeMarkLabel(resumeReadiness(session));
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
      <span
        className={`strip-status${status === 'needs_input' ? ' attention' : ''}`}
      >
        {visual.label}
      </span>
      {/* The strip has room the 24px rows do not, so here the resume state is
          words rather than a glyph — DESIGN.md §1.3's own split. */}
      {resumeMark !== null ? (
        <span className="strip-resume" title={resumeNote(session) ?? undefined}>
          <Codicon name="folder" size={12} />
          {resumeMark}
        </span>
      ) : null}
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

  const restorable = sessions.filter((x) => x.status === 'restorable');
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
        disabled={busy}
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

export function UnreachableBar(): React.JSX.Element {
  return (
    <div className="unreachable-strip" role="status">
      <span className="unreachable-strip-text">{UNREACHABLE_BAR_TEXT}</span>
    </div>
  );
}

/**
 * The region's one bar slot. While the machine condition is on, the
 * restore-all bar does not render, so the two bars never argue: one says
 * "nothing is proven gone" and the other would offer to act on death.
 */
export function RegionBars({
  sessions
}: {
  sessions: Session[];
}): React.JSX.Element | null {
  if (machineUnreachable(sessions)) return <UnreachableBar />;
  return <RestoreAllBar sessions={sessions} />;
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
    // First-run state is rendered by App (full window, §6.1).
    return <main className="center" data-slot="terminal-stack" />;
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
  // Phase 26.3: an exited session offers Restore beside Restart when it
  // still has material to bring back (resume.ts hasRestoreMaterial).
  const offersRestore =
    active !== null &&
    canRestore() &&
    (restorable || (exited && hasRestoreMaterial(active)));

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
                ? fastDeathTitle(active.agent)
                : exited
                  ? endedTitle(active)
                  : 'Ready to restore'}
            </h2>
            <p className="empty-body">
              {fastDeath
                ? // Phase 48 — the bound, never a duration. See FAST_DEATH_MS
                  // in ./status for why a decimal would be invented.
                  fastDeathSentence(active)
                : exited
                  ? offersRestore
                    ? // Phase 26.3 — the verb copy says what comes back and
                      // names what does not (the killed process stays gone).
                      restoreExitedCopy(active)
                    : 'Restarting opens a fresh session with the same name and directory.'
                  : canRestore()
                    ? // Phase 13.5 — the same honesty the row mark carries,
                      // said in full at the moment the user is about to act.
                      restoreActionCopy(active)
                    : 'This session is saved but not running — restart it to pick up in the same directory.'}
            </p>
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
                  disabled={restoringIds[active.id] === true}
                  onClick={() => void restoreSession(active.id)}
                >
                  {restoringIds[active.id] === true ? 'Restoring…' : 'Restore'}
                </button>
              ) : null}
              {/* Phase 26.3 layout rule: Restore is primary when offered and
                  Restart drops to secondary beside it. Without Restore,
                  Restart stays primary as before. The restorable state keeps
                  its Restore-and-Remove pair unchanged. */}
              {!offersRestore || exited ? (
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

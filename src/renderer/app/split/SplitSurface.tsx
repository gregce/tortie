/**
 * S4A — Split surface renderer: a binary split tree of sessions, each leaf
 * its own durable tmux-backed session with its own TerminalPane. Headers
 * (24px) appear because the surface holds ≥2 leaves; the whole header is
 * the drag handle, and since Phase 86 it has two destinations: the strip or
 * dock pops the leaf out, and another leaf of the same split moves it to that
 * leaf's armed half. Dividers drag to re-ratio (min 200×120, double-click
 * resets 50/50); exited / ready-to-restore states are pane-scoped.
 *
 * Copy rule (DESIGN.md §7): the user-facing noun is "split" — "pane" never
 * appears in a rendered string.
 */

import React, { useState } from 'react';
import type { Session } from '@shared/types';
import { TerminalPane } from '../../terminal';
import { effectiveStatusOf, useApp } from '../../state/store';
import { useLayout } from '../../state/layout';
import type { Surface } from '../../state/layout';
import {
  MIN_PANE_HEIGHT,
  MIN_PANE_WIDTH
} from '../../state/split-tree';
import type { SplitBranch, SplitNode } from '../../state/split-tree';
import { endedTitle, statusVisual } from '../status';
import {
  RenameInput,
  ResumeMark,
  EndSessionButton,
  SavedMark,
  isOutsideProject,
  sessionAriaLabel,
  sessionMenuItems,
  useRenameDraft
} from '../session-actions';
import {
  hasRestoreMaterial,
  restoreExitedCopy,
  resumeMarkLabel,
  resumeNote,
  resumeReadiness,
  SHELL_PATH_PENDING_TITLE
} from '../../state/resume';
import { AgentIcon, Codicon, menuGlyph } from '../../icons';
import { armPointerDrag, isSecondaryPress } from './pointer-drag';
import { pressSelectsLeafNow } from './leaf-press';
import { startHeaderDrag } from './surface-dnd';

// ---------------------------------------------------------------------------
// Split header (24px) — identity + status + drag handle for one leaf
// ---------------------------------------------------------------------------

function SplitHeader({
  session,
  projectPath,
  focused
}: {
  session: Session;
  projectPath: string;
  focused: boolean;
}): React.JSX.Element {
  const setRenaming = useApp((s) => s.setRenaming);
  const setMenu = useApp((s) => s.setMenu);
  const orientation = useApp((s) => s.sessionOrientation);
  const popOut = useLayout((s) => s.popOut);
  const selectLeaf = useLayout((s) => s.selectLeaf);

  const status = effectiveStatusOf(session);
  const visual = statusVisual(status, session);
  const ended = status === 'exited' || status === 'restorable';
  const rename = useRenameDraft(session);
  const renaming = rename.renaming;

  return (
    <div
      className={`split-header${focused ? ' focused' : ''}`}
      data-session-id={session.id}
      onPointerDown={(e) => {
        // The whole header is the drag handle: drop on the strip or dock to
        // pop the leaf out, drop on another leaf of this split to move it
        // there (Phase 86). Buttons, the rename input, and secondary presses
        // opt out.
        if (
          isSecondaryPress(e) ||
          (e.target as HTMLElement).closest('button, input') !== null ||
          renaming
        ) {
          return;
        }
        startHeaderDrag(
          e.nativeEvent,
          e.currentTarget,
          session.id,
          projectPath,
          orientation === 'top' ? 'strip' : 'dock'
        );
      }}
      onClick={() => {
        // Phase 86. The header selects on the click, not on the press. The
        // press may be the start of a drag that takes this leaf out of the
        // split, and selecting on the press moved the eye onto the leaf
        // before `popOut` ever read the pop-out preference. `armPointerDrag`
        // swallows the click that follows a real drag, so a drop never also
        // selects. This is the same shape a strip tab and a dock row use.
        if (!focused) selectLeaf(projectPath, session.id);
      }}
      onDoubleClick={() => setRenaming(session.id)}
      onContextMenu={(e) => {
        e.preventDefault();
        setMenu({
          x: e.clientX,
          y: e.clientY,
          items: [
            ...sessionMenuItems(session, session.id),
            'sep',
            {
              label: 'Move to its own tab',
              // A CHOSEN mark, and the reason is the one written on `Break up
              // into tabs` in split-menu.ts: the mark names the destination.
              ...menuGlyph('multiple-windows'),
              run: () => popOut(projectPath, session.id, null)
            }
          ]
        });
      }}
    >
      <AgentIcon agent={session.agent} size={14} className="split-agent" />
      {renaming ? (
        <RenameInput rename={rename} className="split-rename-input" />
      ) : (
        <span className="split-name">{session.name}</span>
      )}
      {isOutsideProject(session) ? (
        <span className="split-wt" title={session.cwd}>
          <Codicon name="git-branch" size="sm" />
        </span>
      ) : null}
      <ResumeMark session={session} />
      <span
        className={`dot dot-${visual.dot}`}
        title={visual.label}
        aria-label={sessionAriaLabel(session, visual)}
      />
      {status === 'restorable' ? <SavedMark className="split-saved" /> : null}
      <span className="split-header-spacer" />
      <EndSessionButton session={session} ended={ended} className="split-close" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pane-scoped ended / ready-to-restore states (S4A "Per-split states")
// ---------------------------------------------------------------------------

/**
 * Whether a split leaf draws Restart (Phase 84, item 1).
 *
 * Exported because it is the one decision this file makes that a test can read
 * without a browser, and because the answer has to agree with the two surfaces
 * that already refuse a remote restart, being `../TerminalRegion.tsx` and
 * `../session-actions.tsx`.
 *
 * A session on another machine never draws it. A restart ends a session and
 * starts a new one, and the starting half would have started it on this Mac
 * while the agent kept running over there. Main refuses such a restart outright
 * as well, so this is the second line of the same defence rather than the only
 * one.
 *
 * The rest of the rule is unchanged from Phase 26.3: Restart is drawn beside
 * Restore on an ended leaf, and on its own when Restore is not offered.
 */
export function splitLeafOffersRestart(
  session: Session,
  offersRestore: boolean
): boolean {
  if (session.machine !== undefined) return false;
  return !offersRestore || session.status === 'exited';
}

function SplitPaneState({ session }: { session: Session }): React.JSX.Element {
  const restartSession = useApp((s) => s.restartSession);
  const removeSession = useApp((s) => s.removeSession);
  const canDiscard = useApp((s) => s.canDiscard);
  const canRestore = useApp((s) => s.canRestore);
  const restoreSession = useApp((s) => s.restoreSession);
  const restoringIds = useApp((s) => s.restoringIds);
  // Phase 81. A split leaf reaches the same restore path, so it takes the
  // same gate and the same sentence.
  const shellPathReady = useApp((s) => s.shellPathReady);

  const restorable = session.status === 'restorable';
  // Phase 26.3: an exited leaf offers Restore under the same material rule
  // as the full-window surface (resume.ts hasRestoreMaterial).
  const offersRestore =
    canRestore() &&
    (restorable ||
      (session.status === 'exited' && hasRestoreMaterial(session)));
  // PHASE 89. No resume mark for a session on another machine, which is the
  // rule `resumeMark` in ../session-actions.tsx has followed since Phase 70 and
  // which this surface was not following. The projection for a remote session
  // carries neither `resumeCapture` nor `resumeArgv`, so the reading here was
  // always "directory only" whatever the row held. That was true of every
  // remote row until Phase 89 and it is false now for a row the arming gate and
  // the composer both prove, because such a row comes back with the command
  // that continues its conversation typed into it.
  const resumeShort =
    session.machine !== undefined
      ? null
      : resumeMarkLabel(resumeReadiness(session));

  return (
    <div className="split-state">
      {/* Same honest headline as the full-window state (Phase 12.7 F2): a
          session killed from outside says so, instead of showing the exit
          code its agent happened to translate the signal into. */}
      <div className="split-state-head">
        <div className="split-state-title">
          {restorable ? 'Ready to restore' : endedTitle(session)}
        </div>
        {/* Phase 13.5: a split is too narrow for the full-window body copy,
            so the action says the short truth and the tooltip carries the
            reason. Nobody should press Restore expecting a conversation. */}
        {offersRestore && resumeShort !== null ? (
          <div
            className="split-state-note"
            title={resumeNote(session) ?? undefined}
          >
            {resumeShort}
          </div>
        ) : null}
      </div>
      <div className="split-state-actions">
        {offersRestore ? (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={restoringIds[session.id] === true || !shellPathReady}
            // Phase 26.3: the split has no room for body copy, so the verb
            // sentence rides the tooltip. It says what comes back and that
            // the killed process does not. Phase 81 borrows the same tooltip
            // for the one second the login shell is still answering, because
            // a disabled button with no reason is worse than a slow one.
            title={
              !shellPathReady
                ? SHELL_PATH_PENDING_TITLE
                : session.status === 'exited'
                  ? restoreExitedCopy(session)
                  : undefined
            }
            onClick={() => void restoreSession(session.id)}
          >
            {restoringIds[session.id] === true ? 'Restoring…' : 'Restore'}
          </button>
        ) : null}
        {/* Restart drops to secondary beside Restore on an exited leaf and
            stays primary when Restore is absent. The restorable leaf keeps
            its Restore-and-Remove pair unchanged. */}
        {/* PHASE 84, item 1. No new copy for a leaf on another machine: the
            button is simply not there, which is what the other two surfaces
            do. The rule is one exported function above. */}
        {splitLeafOffersRestart(session, offersRestore) ? (
          <button
            type="button"
            className={`btn ${offersRestore ? 'btn-secondary' : 'btn-primary'} btn-sm`}
            onClick={() => void restartSession(session.id)}
          >
            Restart
          </button>
        ) : null}
        {canDiscard() ? (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => void removeSession(session.id)}
          >
            Remove
          </button>
        ) : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recursive tree rendering
// ---------------------------------------------------------------------------

function SplitDivider({
  branch,
  path,
  surfaceId,
  projectPath
}: {
  branch: SplitBranch;
  path: string;
  surfaceId: string;
  projectPath: string;
}): React.JSX.Element {
  const setSurfaceRatio = useLayout((s) => s.setSurfaceRatio);
  const [dragging, setDragging] = useState(false);
  const vertical = branch.dir === 'row'; // divider line runs vertically

  return (
    <div
      className={`split-divider ${vertical ? 'v' : 'h'}${dragging ? ' dragging' : ''}`}
      role="separator"
      aria-orientation={vertical ? 'vertical' : 'horizontal'}
      onDoubleClick={() =>
        setSurfaceRatio(projectPath, surfaceId, path, 0.5)
      }
      onPointerDown={(e) => {
        // Phase 12.2 audit: the divider arms at 1px of travel, so a
        // secondary press here resized the layout on the next mouse move.
        if (isSecondaryPress(e)) return;
        const box =
          e.currentTarget.parentElement?.getBoundingClientRect() ?? null;
        if (!box) return;
        const original = branch.ratio;
        armPointerDrag(
          e.nativeEvent,
          {
            onStart: () => setDragging(true),
            onMove(ev) {
              const raw = vertical
                ? (ev.clientX - box.left) / box.width
                : (ev.clientY - box.top) / box.height;
              // Clamp so neither side goes under the min pane size (S4A).
              const min = vertical
                ? MIN_PANE_WIDTH / box.width
                : MIN_PANE_HEIGHT / box.height;
              const lo = Math.min(0.5, min);
              const ratio = Math.min(1 - lo, Math.max(lo, raw));
              setSurfaceRatio(projectPath, surfaceId, path, ratio);
            },
            onDrop() {
              /* ratio already applied move-by-move */
            },
            onEnd(canceled) {
              setDragging(false);
              if (canceled) {
                setSurfaceRatio(projectPath, surfaceId, path, original);
              }
            }
          },
          1
        );
      }}
    />
  );
}

function SplitNodeView({
  node,
  path,
  surface,
  projectPath,
  sessionsById,
  focusedLeafId
}: {
  node: SplitNode;
  path: string;
  surface: Surface;
  projectPath: string;
  sessionsById: Map<string, Session>;
  focusedLeafId: string;
}): React.JSX.Element | null {
  const selectLeaf = useLayout((s) => s.selectLeaf);

  if (node.type === 'leaf') {
    const session = sessionsById.get(node.sessionId);
    if (!session) return null;
    const focused = node.sessionId === focusedLeafId;
    const ended =
      session.status === 'exited' || session.status === 'restorable';
    return (
      <section
        className={`split-pane${focused ? ' focused' : ''}`}
        data-split-leaf={session.id}
        aria-label={session.name}
        onPointerDownCapture={(e) => {
          // A press in the body selects at once, because that is a click into
          // a terminal. A press on the header does not: see `leaf-press.ts`
          // for why, and `SplitHeader`'s onClick for where it happens
          // instead.
          if (focused || !pressSelectsLeafNow(e.target)) return;
          selectLeaf(projectPath, session.id);
        }}
      >
        <SplitHeader
          session={session}
          projectPath={projectPath}
          focused={focused}
        />
        <div className="split-pane-body">
          {ended ? (
            <SplitPaneState session={session} />
          ) : (
            <TerminalPane
              sessionId={session.id}
              status={session.status}
              focused={focused}
            />
          )}
        </div>
      </section>
    );
  }

  return (
    <div className={`split-node ${node.dir === 'row' ? 'row' : 'column'}`}>
      <div className="split-cell" style={{ flexGrow: node.ratio }}>
        <SplitNodeView
          node={node.a}
          path={`${path}a`}
          surface={surface}
          projectPath={projectPath}
          sessionsById={sessionsById}
          focusedLeafId={focusedLeafId}
        />
      </div>
      <SplitDivider
        branch={node}
        path={path}
        surfaceId={surface.id}
        projectPath={projectPath}
      />
      <div className="split-cell" style={{ flexGrow: 1 - node.ratio }}>
        <SplitNodeView
          node={node.b}
          path={`${path}b`}
          surface={surface}
          projectPath={projectPath}
          sessionsById={sessionsById}
          focusedLeafId={focusedLeafId}
        />
      </div>
    </div>
  );
}

export function SplitSurfaceView({
  surface,
  projectPath,
  sessions,
  focusedLeafId
}: {
  surface: Surface;
  projectPath: string;
  sessions: Session[];
  focusedLeafId: string;
}): React.JSX.Element {
  const sessionsById = new Map(sessions.map((s) => [s.id, s]));
  return (
    <div className="split-root">
      <SplitNodeView
        node={surface.root}
        path=""
        surface={surface}
        projectPath={projectPath}
        sessionsById={sessionsById}
        focusedLeafId={focusedLeafId}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Drop-zone overlay (S4A): the armed half of the target leaf, rendered by
// the terminal region over whatever surface is visible. Appears/disappears
// instantly — never fades over a live terminal (DESIGN.md §5).
// ---------------------------------------------------------------------------

export function SplitDropOverlay({
  rootRef
}: {
  rootRef: React.RefObject<HTMLElement | null>;
}): React.JSX.Element | null {
  const zone = useLayout((s) => s.splitDrop);
  if (zone === null) return null;
  const root = rootRef.current;
  if (!root) return null;
  const leafEl = root.querySelector<HTMLElement>(
    `[data-split-leaf="${CSS.escape(zone.leafId)}"]`
  );
  if (!leafEl) return null;
  const rootRect = root.getBoundingClientRect();
  const r = leafEl.getBoundingClientRect();
  let left = r.left - rootRect.left;
  let top = r.top - rootRect.top;
  let width = r.width;
  let height = r.height;
  if (zone.edge === 'left') width /= 2;
  else if (zone.edge === 'right') {
    left += width / 2;
    width /= 2;
  } else if (zone.edge === 'top') height /= 2;
  else {
    top += height / 2;
    height /= 2;
  }
  return (
    <div
      className="split-drop-zone"
      style={{ left, top, width, height }}
      aria-hidden="true"
    />
  );
}

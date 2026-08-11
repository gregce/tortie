/**
 * S4A — Split surface renderer: a binary split tree of sessions, each leaf
 * its own durable tmux-backed session with its own TerminalPane. Headers
 * (24px) appear because the surface holds ≥2 leaves; the whole header is
 * the pop-out drag handle. Dividers drag to re-ratio (min 200×120, double-
 * click resets 50/50); exited / ready-to-restore states are pane-scoped.
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
  closeSession,
  isOutsideProject,
  sessionAriaLabel,
  sessionMenuItems,
  useRenameDraft
} from '../session-actions';
import { resumeMarkLabel, resumeNote, resumeReadiness } from '../resume';
import { AgentIcon, Codicon } from '../../icons';
import { armPointerDrag, isSecondaryPress } from './pointer-drag';
import { startHeaderDrag } from './surface-dnd';

// ---------------------------------------------------------------------------
// Split header (24px) — identity + status + drag handle for one leaf
// ---------------------------------------------------------------------------

function SplitHeader({
  session,
  projectId,
  focused
}: {
  session: Session;
  projectId: string;
  focused: boolean;
}): React.JSX.Element {
  const setRenaming = useApp((s) => s.setRenaming);
  const setMenu = useApp((s) => s.setMenu);
  const orientation = useApp((s) => s.sessionOrientation);
  const popOut = useLayout((s) => s.popOut);

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
        // The whole header is the drag handle (grab → pop out). Buttons,
        // the rename input, and secondary presses opt out.
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
          projectId,
          orientation === 'top' ? 'strip' : 'dock'
        );
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
              run: () => popOut(projectId, session.id, null)
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
          <Codicon name="git-branch" size={12} />
        </span>
      ) : null}
      <ResumeMark session={session} />
      <span
        className={`dot dot-${visual.dot}`}
        title={visual.label}
        aria-label={sessionAriaLabel(session, visual)}
      />
      {status === 'restorable' ? (
        <span className="split-saved" title="Saved — ready to restore">
          <Codicon name="history" size={12} />
        </span>
      ) : null}
      <span className="split-header-spacer" />
      <button
        type="button"
        className="split-close"
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
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pane-scoped ended / ready-to-restore states (S4A "Per-split states")
// ---------------------------------------------------------------------------

function SplitPaneState({ session }: { session: Session }): React.JSX.Element {
  const restartSession = useApp((s) => s.restartSession);
  const removeSession = useApp((s) => s.removeSession);
  const canDiscard = useApp((s) => s.canDiscard);
  const canRestore = useApp((s) => s.canRestore);
  const restoreSession = useApp((s) => s.restoreSession);
  const restoringIds = useApp((s) => s.restoringIds);

  const restorable = session.status === 'restorable';
  const resumeShort = resumeMarkLabel(resumeReadiness(session));

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
        {restorable && resumeShort !== null ? (
          <div
            className="split-state-note"
            title={resumeNote(session) ?? undefined}
          >
            {resumeShort}
          </div>
        ) : null}
      </div>
      <div className="split-state-actions">
        {restorable && canRestore() ? (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={restoringIds[session.id] === true}
            onClick={() => void restoreSession(session.id)}
          >
            {restoringIds[session.id] === true ? 'Restoring…' : 'Restore'}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => void restartSession(session.id)}
          >
            Restart
          </button>
        )}
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
  projectId
}: {
  branch: SplitBranch;
  path: string;
  surfaceId: string;
  projectId: string;
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
        setSurfaceRatio(projectId, surfaceId, path, 0.5)
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
              setSurfaceRatio(projectId, surfaceId, path, ratio);
            },
            onDrop() {
              /* ratio already applied move-by-move */
            },
            onEnd(canceled) {
              setDragging(false);
              if (canceled) {
                setSurfaceRatio(projectId, surfaceId, path, original);
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
  projectId,
  sessionsById,
  focusedLeafId
}: {
  node: SplitNode;
  path: string;
  surface: Surface;
  projectId: string;
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
        onPointerDownCapture={() => {
          if (!focused) selectLeaf(projectId, session.id);
        }}
      >
        <SplitHeader
          session={session}
          projectId={projectId}
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
          projectId={projectId}
          sessionsById={sessionsById}
          focusedLeafId={focusedLeafId}
        />
      </div>
      <SplitDivider
        branch={node}
        path={path}
        surfaceId={surface.id}
        projectId={projectId}
      />
      <div className="split-cell" style={{ flexGrow: 1 - node.ratio }}>
        <SplitNodeView
          node={node.b}
          path={`${path}b`}
          surface={surface}
          projectId={projectId}
          sessionsById={sessionsById}
          focusedLeafId={focusedLeafId}
        />
      </div>
    </div>
  );
}

export function SplitSurfaceView({
  surface,
  projectId,
  sessions,
  focusedLeafId
}: {
  surface: Surface;
  projectId: string;
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
        projectId={projectId}
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

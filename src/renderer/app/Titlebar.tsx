/**
 * S2 — Titlebar & project tabs. 38px drag region; tabs/buttons no-drag.
 * Tab anatomy: roll-up dot · name · amber needs-input badge. Branch/dirty
 * data stays in the sidebar header — tabs stay scannable.
 *
 * Round 2: tabs reorder by POINTER drag (the shared drag engine, not HTML5
 * dnd): press + 4px travel lifts a ghost that follows the pointer on x only
 * (y clamped to the bar); neighbors never reflow mid-drag — a 2px accent
 * insertion indicator marks the landing gap; Esc cancels with zero motion.
 * Order persists app-wide; ⌘1…⌘9 and ⌃Tab follow the visual order.
 *
 * Phase 12.12 item 4: hold ⌘ and each tab reveals the digit that reaches it
 * (⌘1-⌘8 by position, ⌘9 the last tab — src/renderer/app/project-shortcuts.ts).
 * The glyph is overlaid in the slot the close × already reserves, so nothing
 * moves; the gesture itself, including every way it has to be cancelled, is
 * src/renderer/app/modifier-held.ts.
 */

import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import type { Project, SessionStatus } from '@shared/types';
import { keyDisplay } from '@shared/keymap';
import { MACHINE_DEFAULT_COLOR } from '@shared/machines';
import {
  isLocalTarget,
  localPathOf,
  sameTarget,
  targetOfProject,
  targetOfSession
} from '@shared/workspace-target';
import {
  badgeMachineOf,
  effectiveStatusOf,
  sortProjects,
  useApp
} from '../state/store';
import { MachineBadge } from './MachineBadge';
import { remoteTabTooltip } from './machine-copy';
import { useGit } from '../state/git';
import { rollupDot } from './status';
import type { DotKind } from './status';
import { truncateMiddle } from './format';
import { Codicon } from '../icons';
import {
  armPointerDrag,
  createGhost,
  insertionIndex,
  isSecondaryPress
} from './split/pointer-drag';
import { showProjectMenu } from './project-menu';
import { useCommandHeld } from './modifier-held';
import { tabDigit, tabShortcutLabel } from './project-shortcuts';

interface TabData {
  project: Project;
  dot: DotKind | 'none';
  attentionCount: number;
  /**
   * PHASE 90.3. The machine this tab's files are on, or null for this Mac.
   *
   * A tab on this Mac draws nothing, for the reason every other surface draws
   * nothing: the computer in front of the person is not a special case that
   * needs announcing. A tab for a folder on another machine says which one, in
   * that machine's own label and colour, because two tabs can otherwise carry
   * the same folder name and mean different computers.
   */
  machine: ReturnType<typeof badgeMachineOf> | null;
  /** The tooltip, composed once where the machine's label is in hand. */
  title: string;
}

function ProjectTab({
  data,
  selected,
  hintDigit,
  hinting,
  onDragIndicate,
  onDragState
}: {
  data: TabData;
  selected: boolean;
  /** This tab's ⌘ digit, or null when it has none (project-shortcuts.ts). */
  hintDigit: number | null;
  /** ⌘ is being held right now — reveal the digit. */
  hinting: boolean;
  /** Report the live insertion index (null = drag ended/canceled). */
  onDragIndicate: (index: number | null) => void;
  /** A tab drag started/ended (suppresses the ⌘ hint). */
  onDragState: (dragging: boolean) => void;
}): React.JSX.Element {
  const { project, dot, attentionCount, machine, title } = data;
  const setActiveProject = useApp((s) => s.setActiveProject);
  const closeProject = useApp((s) => s.closeProject);
  const moveProjectToIndex = useApp((s) => s.moveProjectToIndex);
  const setMenu = useApp((s) => s.setMenu);

  // Nested-interactive fix (Phase 8): the close × is a REAL sibling button
  // positioned over the tab's right edge — a button inside a button is
  // invalid and unreachable by keyboard. Drag lives on the wrapper so both
  // children stay plain interactives.
  return (
    <div
      className={`ptab-wrap${selected ? ' selected' : ''}${
        hinting && hintDigit !== null ? ' hinting' : ''
      }`}
      data-project-id={project.id}
      onPointerDown={(e) => {
        // Phase 12.2 audit: project tabs had the defect too — a secondary
        // click armed a tab drag that the "Close project" menu then left
        // tracking the pointer.
        if (isSecondaryPress(e)) return;
        if ((e.target as HTMLElement).closest('.ptab-close') !== null) return;
        const wrap = e.currentTarget;
        const nav = wrap.closest<HTMLElement>('.titlebar-tabs');
        let ghost: ReturnType<typeof createGhost> | null = null;
        let lastIndex: number | null = null;
        armPointerDrag(e.nativeEvent, {
          onStart() {
            ghost = createGhost(wrap, { lockAxis: 'x' });
            onDragState(true);
          },
          onMove(ev) {
            ghost?.move(ev.clientX, ev.clientY);
            if (!nav) return;
            const items = Array.from(
              nav.querySelectorAll<HTMLElement>('[data-project-id]')
            ).map((el) => ({ rect: el.getBoundingClientRect() }));
            lastIndex = insertionIndex(
              items,
              { x: ev.clientX, y: ev.clientY },
              'x'
            );
            onDragIndicate(lastIndex);
          },
          onDrop() {
            if (lastIndex !== null) {
              moveProjectToIndex(project.id, lastIndex);
            }
          },
          onEnd() {
            ghost?.destroy();
            ghost = null;
            onDragIndicate(null);
            onDragState(false);
          }
        });
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        setMenu({
          x: e.clientX,
          y: e.clientY,
          items: [
            {
              label: 'Close project',
              run: () => closeProject(project.id)
            }
          ]
        });
      }}
    >
      <button
        type="button"
        className={`ptab${selected ? ' selected' : ''}`}
        // The tooltip is the fallback path to the same fact for anyone who
        // never holds ⌘ (Phase 12.12 item 4).
        title={
          hintDigit !== null
            ? `${title}\n${tabShortcutLabel(hintDigit)}`
            : title
        }
        onClick={() => setActiveProject(project.id)}
        aria-label={`${project.name}${
          attentionCount > 0
            ? `, ${attentionCount} ${attentionCount === 1 ? 'session needs' : 'sessions need'} input`
            : ''
        }`}
        aria-current={selected ? 'true' : undefined}
      >
        {/* Tab anatomy stays dot · name · badge (DESIGN.md §2.3): branch and
            dirty count live in the sidebar header, never on the tab. */}
        <span className={`dot dot-${dot === 'none' ? 'none' : dot}`} />
        <span className="ptab-name">{truncateMiddle(project.name, 24)}</span>
        {machine !== null ? (
          <MachineBadge machine={machine} className="ptab-machine" />
        ) : null}
        {attentionCount > 0 ? (
          <span className="badge-attention num">{attentionCount}</span>
        ) : null}
      </button>
      <button
        type="button"
        className="ptab-close"
        aria-label={`Close ${project.name}`}
        title="Close project"
        onClick={() => closeProject(project.id)}
      >
        <Codicon name="close" size={12} />
      </button>
      {/* Overlaid in the slot the close × already reserves, so revealing it
          cannot reflow the strip. Decorative: the same fact reaches assistive
          tech through the tooltip, the ⌘/ overlay and the Settings map. */}
      {hintDigit !== null ? (
        <span className="ptab-hint num" aria-hidden="true">
          {hintDigit}
        </span>
      ) : null}
    </div>
  );
}

/** 2px accent insertion indicator in the tab gap (S2 drag spec). */
function TabIndicator({
  index,
  navRef
}: {
  index: number;
  navRef: React.RefObject<HTMLElement | null>;
}): React.JSX.Element | null {
  const [left, setLeft] = useState<number | null>(null);

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) {
      setLeft(null);
      return;
    }
    const items = Array.from(
      nav.querySelectorAll<HTMLElement>('[data-project-id]')
    );
    if (items.length === 0) {
      setLeft(null);
      return;
    }
    const at = items[index];
    const last = items[items.length - 1];
    setLeft(
      at !== undefined
        ? at.offsetLeft - 3
        : (last?.offsetLeft ?? 0) + (last?.offsetWidth ?? 0) + 1
    );
  }, [index, navRef]);

  if (left === null) return null;
  return <div className="drop-indicator-v tab-indicator" style={{ left }} />;
}

// The Settings gear moved to the activity bar's bottom slot (round 1, S3) —
// see src/renderer/app/ActivityBar.tsx.

export function Titlebar(): React.JSX.Element {
  const projects = useApp((s) => s.projects);
  const tabOrder = useApp((s) => s.tabOrder);
  const gitInit = useGit((s) => s.init);
  const ensureStatus = useGit((s) => s.ensureStatus);

  // Warm the git store for every open project (status is ready the moment a
  // tab is switched to); git:changed (subscribed via init) keeps it live.
  //
  // PHASE 90.3 FIX ROUND. ONLY A FOLDER ON THIS MAC. A project tab can now be a
  // folder on another machine, and `git:status` reads this Mac's own disk. The
  // loop used to pass `p.path`, which is a bare path used as an identity, and
  // that is the thing this phase exists to remove. Two outcomes were measured
  // on 2026-08-19: when the path does not exist here, every boot logged one
  // `git:status` failure reading "That project folder does not exist"; when a
  // folder of the same name does exist here, the call succeeded and filed THIS
  // Mac's git status under the other machine's project key. No surface drew the
  // second one, because ActivityBar and Sidebar both read through
  // `localPathOf`, but a wrong number sitting in the store waiting for a reader
  // is not a state to leave behind.
  useEffect(() => {
    gitInit();
    for (const p of projects) {
      const local = localPathOf(targetOfProject(p));
      if (local !== null) ensureStatus(local);
    }
  }, [projects, gitInit, ensureStatus]);
  const sessions = useApp((s) => s.sessions);
  const machineStates = useApp((s) => s.machineStates);
  const activeProjectId = useApp((s) => s.activeProjectId);
  const setAttentionOpen = useApp((s) => s.setAttentionOpen);
  const attentionOpen = useApp((s) => s.attentionOpen);

  const navRef = useRef<HTMLElement | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  // Phase 12.12 item 4: hold ⌘ and every tab says which digit reaches it.
  // Suppressed mid-drag — a number appearing under a tab the pointer is
  // carrying is noise, and the ghost is what the eye should be following.
  // (Project tabs have no rename affordance today; if they gain one, it ORs
  // into this same flag rather than growing a second reveal condition.)
  const [draggingTab, setDraggingTab] = useState(false);
  const hinting = useCommandHeld({ suppressed: draggingTab });

  const tabs = useMemo<TabData[]>(() => {
    const ordered = sortProjects(projects, tabOrder);
    return ordered.map((project) => {
      // PHASE 90.3. The PAIR decides which sessions this tab rolls up. A bare
      // path comparison added another machine's sessions into a local tab's dot
      // and badge whenever the two folders had the same path.
      const target = targetOfProject(project);
      const statuses: SessionStatus[] = [];
      let attentionCount = 0;
      for (const sess of sessions) {
        if (!sameTarget(targetOfSession(sess), target)) continue;
        const status = effectiveStatusOf(sess);
        statuses.push(status);
        if (status === 'needs_input') attentionCount++;
      }
      const state = isLocalTarget(target)
        ? undefined
        : machineStates.find((one) => one.id === project.machineId);
      // A machine a person removed while its tab was still open has no state
      // row. The tab keeps its badge, drawn from the id, so a person can read
      // which tab to close rather than seeing the tab lose its only mark.
      const machine =
        isLocalTarget(target)
          ? null
          : state !== undefined
            ? badgeMachineOf(state)
            : {
                id: project.machineId ?? '',
                label: project.machineId ?? '',
                color: MACHINE_DEFAULT_COLOR,
                answering: false,
                canRestore: false,
                restoreReason: null
              };
      // Every sentence about a machine comes from ./machine-copy.ts, which is
      // the one file the vocabulary audit reads.
      const title =
        machine === null
          ? project.path
          : remoteTabTooltip(project.name, project.path, machine.label);
      return {
        project,
        dot: rollupDot(statuses),
        attentionCount,
        machine,
        title
      };
    });
  }, [projects, tabOrder, sessions, machineStates]);

  const attentionTotal = useMemo(
    () =>
      sessions.filter((x) => effectiveStatusOf(x) === 'needs_input')
        .length,
    [sessions]
  );

  return (
    <header className="titlebar" data-slot="project-tabs">
      <nav className="titlebar-tabs" aria-label="Projects" ref={navRef}>
        {tabs.map((t, i) => (
          <ProjectTab
            key={t.project.id}
            data={t}
            selected={t.project.id === activeProjectId}
            hintDigit={tabDigit(i, tabs.length)}
            hinting={hinting}
            onDragIndicate={setDropIndex}
            onDragState={setDraggingTab}
          />
        ))}
        {dropIndex !== null ? (
          <TabIndicator index={dropIndex} navRef={navRef} />
        ) : null}
        {/* Two verbs now live behind the +: open one that exists (⌘O) and
            make one that does not (Phase 12.9 item 1). A native menu rather
            than a second button — the tab strip is the one row that must
            stay scannable, and DESIGN.md §3 has no DOM menus. */}
        <button
          type="button"
          className="ptab-add"
          title="New project, or open one"
          aria-label="New project, or open one"
          aria-haspopup="menu"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            showProjectMenu(r.left, r.bottom);
          }}
        >
          <Codicon name="add" size={16} />
        </button>
      </nav>
      <div className="titlebar-spacer" />
      <button
        type="button"
        className={`bell${attentionTotal > 0 ? ' has-attention' : ''}`}
        title={`Needs your input (${keyDisplay('session.attention')})`}
        aria-label={
          attentionTotal > 0
            ? `${attentionTotal} ${attentionTotal === 1 ? 'session needs' : 'sessions need'} input`
            : 'Nothing needs you'
        }
        onClick={() => setAttentionOpen(!attentionOpen)}
      >
        <Codicon name="bell" size={16} />
        {attentionTotal > 0 ? (
          <span className="badge-attention num">{attentionTotal}</span>
        ) : null}
      </button>
    </header>
  );
}

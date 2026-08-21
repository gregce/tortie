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
 *
 * PHASE 129. The band draws three shapes now, and the store decides which.
 *
 *   projects on top, expanded    the row of tabs, as it has always been
 *   projects on top, collapsed   one chip naming the active project, opening
 *                                a native menu that lists every open project
 *   projects on the left         no tabs at all here; ./ProjectRail.tsx draws
 *                                them down the window's left side
 *
 * What each tab holds is derived in ./project-tabs-data.ts, which the rail
 * reads too, so the two surfaces cannot come to disagree about which sessions
 * roll up into a project's dot.
 *
 * SAY WHAT IS NOT TRUE. Collapsing on top does not make the window taller.
 * The band stays 38px because the traffic lights live in it. What comes back
 * is the row of tabs.
 */

import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { keyDisplay } from '@shared/keymap';
import { localPathOf, targetOfProject } from '@shared/workspace-target';
import { effectiveStatusOf, useApp } from '../state/store';
import type { MenuItemSpec } from '../state/store';
import { MachineBadge } from './MachineBadge';
import { useGit } from '../state/git';
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
// Phase 129. One derivation of the project list, shared with ./ProjectRail.
import { useProjectTabs } from './project-tabs-data';
import type { TabData } from './project-tabs-data';
import {
  collapseIcon,
  collapseLabel,
  SWITCH_PROJECT
} from './projects-position';
import { ProjectsPositionButton } from './ProjectsPositionButton';
import './project-rail.css';

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

/**
 * PHASE 129. The chip that stands in for the whole row when the tabs are
 * collapsed on top.
 *
 * It carries the active project's dot, its name and its attention count, and
 * clicking it opens a NATIVE menu listing every open project with its own ⌘
 * digit, so collapsing the row never costs a person the ability to switch.
 * ⌘1 to ⌘9 and ⌃Tab are untouched by the collapse.
 */
function CollapsedProjectChip({
  tabs,
  activeProjectId
}: {
  tabs: TabData[];
  activeProjectId: string | null;
}): React.JSX.Element | null {
  const setActiveProject = useApp((s) => s.setActiveProject);
  const setMenu = useApp((s) => s.setMenu);
  const active = tabs.find((t) => t.project.id === activeProjectId) ?? tabs[0];
  if (active === undefined) return null;

  return (
    <button
      type="button"
      className="ptab-chip"
      aria-label={SWITCH_PROJECT}
      title={SWITCH_PROJECT}
      aria-haspopup="menu"
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const items: MenuItemSpec[] = tabs.map((t, i) => {
          const digit = tabDigit(i, tabs.length);
          return {
            label: t.project.name,
            ...(digit !== null ? { hint: tabShortcutLabel(digit) } : {}),
            run: () => setActiveProject(t.project.id)
          };
        });
        setMenu({ x: r.left, y: r.bottom, items });
      }}
    >
      <span
        className={`dot dot-${active.dot === 'none' ? 'none' : active.dot}`}
      />
      <span className="prail-name">
        {truncateMiddle(active.project.name, 24)}
      </span>
      {active.machine !== null ? (
        <MachineBadge machine={active.machine} className="ptab-machine" />
      ) : null}
      {active.attentionCount > 0 ? (
        <span className="badge-attention num">{active.attentionCount}</span>
      ) : null}
      {/* Its own caret, so the chip says it opens a menu without leaning on
          the control beside it to say it. */}
      <Codicon name="chevron-down" size={12} className="ptab-chip-caret" />
    </button>
  );
}

export function Titlebar(): React.JSX.Element {
  const projects = useApp((s) => s.projects);
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
  const activeProjectId = useApp((s) => s.activeProjectId);
  const setAttentionOpen = useApp((s) => s.setAttentionOpen);
  const attentionOpen = useApp((s) => s.attentionOpen);
  // Phase 129. Where the tabs are, and whether their names are on screen.
  const projectsPosition = useApp((s) => s.projectsPosition);
  const projectsCollapsed = useApp((s) => s.projectsCollapsed);
  const setProjectsCollapsed = useApp((s) => s.setProjectsCollapsed);

  const navRef = useRef<HTMLElement | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  // Phase 12.12 item 4: hold ⌘ and every tab says which digit reaches it.
  // Suppressed mid-drag — a number appearing under a tab the pointer is
  // carrying is noise, and the ghost is what the eye should be following.
  // (Project tabs have no rename affordance today; if they gain one, it ORs
  // into this same flag rather than growing a second reveal condition.)
  const [draggingTab, setDraggingTab] = useState(false);
  const hinting = useCommandHeld({ suppressed: draggingTab });

  const tabs = useProjectTabs();

  const attentionTotal = useMemo(
    () =>
      sessions.filter((x) => effectiveStatusOf(x) === 'needs_input')
        .length,
    [sessions]
  );

  // Phase 129. The band's own collapse control. It is drawn only while the
  // tabs are on top, because on the left the rail's band carries its own.
  const collapseControl = (
    <button
      type="button"
      className="icon-btn prail-collapse"
      aria-label={collapseLabel('top', projectsCollapsed)}
      title={collapseLabel('top', projectsCollapsed)}
      onClick={() => setProjectsCollapsed(!projectsCollapsed)}
    >
      <Codicon name={collapseIcon('top', projectsCollapsed)} size={14} />
    </button>
  );

  return (
    <header className="titlebar" data-slot="project-tabs">
      {/* PHASE 129. With the tabs on the left the band draws none of them: the
          rail does, and drawing both would be two answers to one question.
          The band itself stays, at its 38px, because the traffic lights live
          in its first 76px. */}
      {projectsPosition === 'left' ? null : projectsCollapsed ? (
        <nav className="titlebar-tabs" aria-label="Projects">
          <CollapsedProjectChip tabs={tabs} activeProjectId={activeProjectId} />
          {collapseControl}
          <ProjectsPositionButton />
        </nav>
      ) : (
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
          {collapseControl}
          <ProjectsPositionButton />
        </nav>
      )}
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

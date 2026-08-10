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
 */

import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import type { Project, SessionStatus } from '@shared/types';
import { effectiveStatusOf, sortProjects, useApp } from '../state/store';
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

interface TabData {
  project: Project;
  dot: DotKind | 'none';
  attentionCount: number;
}

function ProjectTab({
  data,
  selected,
  onDragIndicate
}: {
  data: TabData;
  selected: boolean;
  /** Report the live insertion index (null = drag ended/canceled). */
  onDragIndicate: (index: number | null) => void;
}): React.JSX.Element {
  const { project, dot, attentionCount } = data;
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
      className="ptab-wrap"
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
        title={project.path}
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
  useEffect(() => {
    gitInit();
    for (const p of projects) ensureStatus(p.path);
  }, [projects, gitInit, ensureStatus]);
  const sessions = useApp((s) => s.sessions);
  const overrides = useApp((s) => s.statusOverrides);
  const activeProjectId = useApp((s) => s.activeProjectId);
  const openProject = useApp((s) => s.openProject);
  const setAttentionOpen = useApp((s) => s.setAttentionOpen);
  const attentionOpen = useApp((s) => s.attentionOpen);

  const navRef = useRef<HTMLElement | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const tabs = useMemo<TabData[]>(() => {
    const ordered = sortProjects(projects, tabOrder);
    return ordered.map((project) => {
      const statuses: SessionStatus[] = [];
      let attentionCount = 0;
      for (const sess of sessions) {
        if (sess.projectPath !== project.path) continue;
        const status = effectiveStatusOf(sess, overrides);
        statuses.push(status);
        if (status === 'needs_input') attentionCount++;
      }
      return { project, dot: rollupDot(statuses), attentionCount };
    });
  }, [projects, tabOrder, sessions, overrides]);

  const attentionTotal = useMemo(
    () =>
      sessions.filter((x) => effectiveStatusOf(x, overrides) === 'needs_input')
        .length,
    [sessions, overrides]
  );

  return (
    <header className="titlebar" data-slot="project-tabs">
      <nav className="titlebar-tabs" aria-label="Projects" ref={navRef}>
        {tabs.map((t) => (
          <ProjectTab
            key={t.project.id}
            data={t}
            selected={t.project.id === activeProjectId}
            onDragIndicate={setDropIndex}
          />
        ))}
        {dropIndex !== null ? (
          <TabIndicator index={dropIndex} navRef={navRef} />
        ) : null}
        <button
          type="button"
          className="ptab-add"
          title="Open project… (⌘O)"
          aria-label="Open project"
          onClick={() => void openProject()}
        >
          <Codicon name="add" size={16} />
        </button>
      </nav>
      <div className="titlebar-spacer" />
      <button
        type="button"
        className={`bell${attentionTotal > 0 ? ' has-attention' : ''}`}
        title="Needs your input (⌘J)"
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

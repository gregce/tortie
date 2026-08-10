/**
 * S2 — Titlebar & project tabs. 38px drag region; tabs/buttons no-drag.
 * Tab anatomy: roll-up dot · name · amber needs-input badge. Branch/dirty
 * data stays in the sidebar header — tabs stay scannable.
 */

import React, { useEffect, useMemo, useState } from 'react';
import type { Project, SessionStatus } from '@shared/types';
import { effectiveStatusOf, sortProjects, useApp } from '../state/store';
import { useGit } from '../state/git';
import { rollupDot } from './status';
import type { DotKind } from './status';
import { truncateMiddle } from './format';
import { Codicon } from '../icons';

interface TabData {
  project: Project;
  dot: DotKind | 'none';
  attentionCount: number;
}

function ProjectTab({
  data,
  selected
}: {
  data: TabData;
  selected: boolean;
}): React.JSX.Element {
  const { project, dot, attentionCount } = data;
  const setActiveProject = useApp((s) => s.setActiveProject);
  const closeProject = useApp((s) => s.closeProject);
  const reorderTabs = useApp((s) => s.reorderTabs);
  const setMenu = useApp((s) => s.setMenu);
  const [dropTarget, setDropTarget] = useState(false);

  // Nested-interactive fix (Phase 8): the close × is a REAL sibling button
  // positioned over the tab's right edge — a button inside a button is
  // invalid and unreachable by keyboard. Drag/drop lives on the wrapper so
  // both children stay plain interactives.
  return (
    <div
      className={`ptab-wrap${dropTarget ? ' drop-target' : ''}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/x-gmux-tab', project.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('application/x-gmux-tab')) {
          e.preventDefault();
          setDropTarget(true);
        }
      }}
      onDragLeave={() => setDropTarget(false)}
      onDrop={(e) => {
        setDropTarget(false);
        const fromId = e.dataTransfer.getData('application/x-gmux-tab');
        if (fromId) reorderTabs(fromId, project.id);
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
      <nav className="titlebar-tabs" aria-label="Projects">
        {tabs.map((t) => (
          <ProjectTab
            key={t.project.id}
            data={t}
            selected={t.project.id === activeProjectId}
          />
        ))}
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

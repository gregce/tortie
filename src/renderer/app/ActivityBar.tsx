/**
 * S3 — Activity bar (round 1): a 48px VS Code-style icon rail at the far
 * left, full height below the titlebar. Three views — Explorer, Search
 * (Phase 14) and Source Control — the sidebar hosts one at a time; the
 * Settings gear is pinned at the bottom. Click the active view's icon to
 * collapse the sidebar (= ⌘B), VS Code behavior. The rail itself never hides.
 *
 * Chords are never spelled here: every label reads its own chord out of
 * KEYMAP via keyDisplay(), which is what stops the rail's tooltips drifting
 * from the menu and the ⌘/ overlay.
 *
 * PHASE 135 GAVE IT A SECOND SHAPE, and only a second shape. One component is
 * drawn in two places, which is the shape ProjectsPositionButton.tsx already
 * uses. `variant="column"` is the 48px rail described above and is what
 * App.tsx mounts. `variant="row"` is a 36px band across the top of the
 * sidebar, and Sidebar.tsx mounts it while the projects are on the left and
 * the sidebar is showing. `activityBarIsRow()` in state/chrome-geometry.ts is
 * the one predicate both call sites read, so exactly one of the two is ever
 * drawn.
 *
 * Nothing below changes with the variant except the class on the <nav>. The
 * same four view items are drawn, the same gear is drawn, and `data-slot` and
 * the accessible name are the same in both. `.ab-spacer` is `flex: 1`, so it
 * pushes the update ring and the gear to the right end of a row exactly as it
 * pushes them to the bottom of a column. No JSX moves for the gear.
 *
 * The `data-slot` value is load-bearing beyond this file: focus-mode.css hides
 * `[data-slot='activity-bar']` in four places with descendant selectors, so
 * both variants keep being hidden in focus mode without that file changing.
 */

import React, { useMemo } from 'react';
import { keyDisplay } from '@shared/keymap';
import type { GitStatusResult } from '@shared/types';
import {
  localPathOf,
  sameTarget,
  targetKey,
  targetOfProject,
  type WorkspaceTarget
} from '@shared/workspace-target';
import { dirtyCount, useGit } from '../state/git';
import { loginItemExtras, useApp } from '../state/store';
import type { SidebarViewId } from '../state/store';
import { useSearch } from '../search';
import {
  remoteChangesCount,
  useRemoteChanges,
  type RemoteChangesEntry
} from '../scm/remote-changes';
import { Codicon } from '../icons';
import { UpdateRing } from './UpdateRing';
import { gmuxBridge } from '../bridge';
import './activity-bar.css';

/**
 * The accessible name of one rail item.
 *
 * PURE, AND EXPORTED FOR ONE REASON. Rendering this rail in a unit test reads
 * the stores' INITIAL state, because zustand 5 answers a server render from
 * `getInitialState`. So the number a person hears is pinned by calling this
 * with the number rather than by reading markup, and
 * `src/renderer/scm/__tests__/p97-rail-badge.test.ts` is where that happens.
 */
export function railItemLabel(
  label: string,
  shortcut: string,
  badge: number | undefined,
  noun: string
): string {
  const count =
    badge !== undefined && badge > 0
      ? `, ${badge} ${noun} ${badge === 1 ? 'file' : 'files'}`
      : '';
  return `${label} (${shortcut})${count}`;
}

/**
 * The number on the Source Control badge for one folder, wherever it is.
 *
 * PHASE 97 FIX ROUND PUT BOTH BRANCHES IN ONE PLACE. The remote branch counted
 * `files.length` for one round while the panel's own header counted both
 * groups, so a folder with two changed files and three new ones drew a badge of
 * 2 over a list of 5 rows, in one window at one moment. The local branch never
 * had that split, because git's status puts an untracked entry in the same
 * array `dirtyCount` measures. Both branches now go through a named function a
 * test can call, and both count a file git is not yet tracking.
 */
export function scmBadgeCount(
  target: WorkspaceTarget | null,
  localStatus: GitStatusResult | null | undefined,
  remoteEntry: RemoteChangesEntry | undefined
): number {
  if (localPathOf(target) !== null) {
    return localStatus?.isRepo === true ? dirtyCount(localStatus) : 0;
  }
  return remoteEntry === undefined ? 0 : remoteChangesCount(remoteEntry);
}

function ViewItem({
  view,
  icon,
  label,
  shortcut,
  badge,
  badgeNoun = 'changed'
}: {
  view: SidebarViewId;
  icon: string;
  label: string;
  shortcut: string;
  badge?: number;
  /** Word before "file(s)" in the accessible label ("3 changed files"). */
  badgeNoun?: string;
}): React.JSX.Element {
  const sidebarVisible = useApp((s) => s.sidebarVisible);
  const activeProjectId = useApp((s) => s.activeProjectId);
  const viewByProject = useApp((s) => s.sidebarViewByProject);
  const toggleSidebar = useApp((s) => s.toggleSidebar);
  const showSidebarView = useApp((s) => s.showSidebarView);

  const currentView: SidebarViewId =
    (activeProjectId !== null ? viewByProject[activeProjectId] : undefined) ??
    'scm';
  const active = sidebarVisible && currentView === view;

  return (
    <button
      type="button"
      className={`ab-item${active ? ' active' : ''}`}
      title={`${label} (${shortcut})`}
      aria-label={railItemLabel(label, shortcut, badge, badgeNoun)}
      aria-pressed={active}
      onClick={() => {
        // Active view → collapse toggle (⌘B); otherwise switch/show.
        if (active) toggleSidebar();
        else showSidebarView(view);
      }}
    >
      <Codicon name={icon} size={24} />
      {badge !== undefined && badge > 0 ? (
        <span className="ab-badge num">{badge > 99 ? '99+' : badge}</span>
      ) : null}
    </button>
  );
}

/**
 * Settings gear (S3 pins it at the rail's bottom). Phase 10 (S13): the gear
 * opens the dedicated Settings WINDOW (feature-detected openSettings bridge
 * method — the login-item toggle moved into Settings → General). Fallback
 * for older preloads: the original one-item login menu, so the gear never
 * goes dead.
 */
const settingsTitle = `Settings (${keyDisplay('app.settings')})`;

function SettingsItem(): React.JSX.Element | null {
  const setMenu = useApp((s) => s.setMenu);
  const toast = useApp((s) => s.toast);
  const settingsExtras = gmuxBridge();
  if (typeof settingsExtras?.openSettings === 'function') {
    const openSettings = settingsExtras.openSettings.bind(settingsExtras);
    return (
      <button
        type="button"
        className="ab-item activitybar-settings"
        title={settingsTitle}
        aria-label={settingsTitle}
        onClick={() => void openSettings()}
      >
        <Codicon name="settings-gear" size={24} />
      </button>
    );
  }
  const extras = loginItemExtras();
  if (
    typeof extras?.getLoginItem !== 'function' ||
    typeof extras.setLoginItem !== 'function'
  ) {
    return null;
  }
  const getLoginItem = extras.getLoginItem.bind(extras);
  const setLoginItem = extras.setLoginItem.bind(extras);

  const openMenu = async (x: number, y: number): Promise<void> => {
    let on = false;
    try {
      on = (await getLoginItem()).openAtLogin;
    } catch {
      /* menu still opens; toggle reports its own errors */
    }
    setMenu({
      x,
      y,
      items: [
        {
          label: `${on ? '✓ ' : ''}Launch Tortie at login`,
          run: () => {
            void (async () => {
              try {
                const next = await setLoginItem(!on);
                // Render the OS READBACK, not the request.
                if (next.openAtLogin === !on) {
                  toast(
                    'success',
                    next.openAtLogin
                      ? 'Tortie will launch at login and offer to restore your sessions.'
                      : 'Tortie will no longer launch at login.'
                  );
                } else {
                  toast(
                    'error',
                    'macOS declined the change — check System Settings › General › Login Items.',
                    { sticky: true }
                  );
                }
              } catch (err) {
                toast('error', (err as Error).message, { sticky: true });
              }
            })();
          }
        }
      ]
    });
  };

  return (
    <button
      type="button"
      className="ab-item activitybar-settings"
      title={settingsTitle}
      aria-label={settingsTitle}
      onClick={(e) => {
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
        void openMenu(r.right + 4, r.top);
      }}
    >
      <Codicon name="settings-gear" size={24} />
    </button>
  );
}

export function ActivityBar({
  variant = 'column'
}: {
  /**
   * `'column'` is the 48px rail at the window's left. `'row'` is the 36px
   * band at the head of the sidebar. Read `activityBarIsRow()` from
   * state/chrome-geometry.ts to decide which one to ask for. The default is
   * `'column'`, which is what every call site meant before Phase 135.
   */
  variant?: 'column' | 'row';
} = {}): React.JSX.Element {
  const projects = useApp((s) => s.projects);
  const activeProjectId = useApp((s) => s.activeProjectId);

  const project = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? null,
    [projects, activeProjectId]
  );

  // Files with at least one hit in the live result set (Phase 14).
  //
  // Compared by IDENTITY since Phase 90.1. The old comparison was against a
  // path alone, so the badge would have kept the first machine's count while
  // the rail sat beside a project of the same path on a second machine.
  const projectTarget = useMemo(() => targetOfProject(project), [project]);
  const resultFiles = useSearch((s) =>
    s.target !== null && sameTarget(s.target, projectTarget) ? s.totalFiles : 0
  );

  // Dirty-file count badge on the Source Control item — accent, never amber
  // (amber is attention-only, S3).
  //
  // PHASE 90.3 SPLIT THIS IN TWO, and closing it is the one visibly wrong
  // number Phase 90.1 left on screen. The old read took `project.path` and
  // asked THIS Mac's git store for it, so a tab whose folder is on another
  // machine wore a count measured on this Mac. Now the local branch is keyed on
  // `localPathOf`, which is null for such a tab, and the remote branch reads
  // the count that machine itself reported.
  //
  // PHASE 97 FIX ROUND MOVED THE ARITHMETIC OUT. Each store hands over its own
  // row and `scmBadgeCount` above decides the number, so the rail and the
  // Changes header cannot state two different numbers for one folder. They did
  // for one round, and it was on screen.
  const localRepoPath = localPathOf(projectTarget);
  const localStatus = useGit((s) =>
    localRepoPath === null ? null : (s.repos[localRepoPath]?.status ?? null)
  );
  const remoteKey = projectTarget === null ? null : targetKey(projectTarget);
  const remoteEntry = useRemoteChanges((s) =>
    remoteKey === null ? undefined : s.byTarget[remoteKey]
  );
  const dirty = scmBadgeCount(projectTarget, localStatus, remoteEntry);

  return (
    <nav
      className={`activitybar${variant === 'row' ? ' activitybar-row' : ''}`}
      aria-label="Views"
      data-slot="activity-bar"
    >
      <ViewItem
        view="explorer"
        icon="files"
        label="Explorer"
        shortcut={keyDisplay('view.explorer')}
      />
      {/* Phase 14. The badge is the FILE count of a live result set, in accent
          — never amber, which this app reserves entirely for "an agent needs
          you" and would otherwise be competing with. */}
      <ViewItem
        view="search"
        icon="search"
        label="Search"
        shortcut={keyDisplay('view.search')}
        badge={resultFiles}
        badgeNoun="matching"
      />
      {/* THE NOUN STAYS `changed`, and Phase 97 decided that on purpose. The
          badge now counts files git is not yet tracking, on both the local and
          the remote rail, so a screen reader is told "5 changed files" for a
          list whose last three rows are new files. Every other word in this
          panel already works that way: the section header reads `Changes`, the
          list's own accessible name reads `Changed files`, and both have
          covered untracked rows since long before this phase. A different word
          here would put a third wording in one panel and would still disagree
          with the two beside it. */}
      <ViewItem
        view="scm"
        icon="source-control"
        label="Source control"
        shortcut={keyDisplay('view.scm')}
        badge={dirty}
      />
      {/* Phase 22 — Context, fourth, after source-control and before the
          spacer.

          `layers` because the subject of the view IS stacked scopes resolving
          to one winner. `plug` was the runner-up and names only one of the
          five categories; `extensions` was refused outright, because
          "extensions" is on the scope guardrail's refused list and the icon
          would promise a marketplace.

          NO BADGE, EVER. Source Control badges a dirty count and Search badges
          a live match count, and both are actionable and transient. A context
          count is inventory — "43" would sit there forever, which is exactly
          the number that rises on its own that the Zen refuses. The one number
          that could earn a badge is drift, and research 29 §8.4 refuses that
          too: the drift information exists only where it is asked for. */}
      <ViewItem
        view="context"
        icon="layers"
        label="Context"
        shortcut={keyDisplay('view.context')}
      />
      <div className="ab-spacer" />
      {/* Phase 58. The update ring sits directly above the gear and carries
          the manual update journey. It is hidden almost all of the time, and
          main decides its visibility. The spacer absorbs the difference, so
          the gear never moves. */}
      <UpdateRing />
      <SettingsItem />
    </nav>
  );
}

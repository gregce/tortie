/**
 * BRANCHES section (DESIGN-SPEC S3A round 2, BACKLOG Phase 10 #7) — the full
 * branch UI; extends, never replaces, the header's branch menu:
 *
 *   - Local group: current ✓ (accent, weight 500, inert), ahead/behind
 *     chips, click/↩ → checkout with a per-row spinner; failures → §6.11
 *     sticky toast, nothing changes.
 *   - Remotes grouped by remote: click/↩ → tracking checkout (existing
 *     local with the same short name wins — the git service decides). The
 *     group row IS the remotes list (Phase 12 item 3): name · "tracking"
 *     chip on the one the current branch follows · URL, host/owner/repo form
 *     with the full URL in the tooltip · right-click copies it. Every
 *     CONFIGURED remote gets a row, including one with no fetched refs yet.
 *   - Header accessories: Fetch (`git fetch --all --prune`, spinner while
 *     running, last-fetched relative time beside it) + network-free refresh.
 *   - Filter-as-you-type across both groups.
 *   - Native context menus: local — Checkout · Copy branch name · Delete
 *     branch… (force offered only when git reports the branch unmerged);
 *     remote — Checkout as local branch · Copy branch name.
 *
 * Collapsed by default; the branch menu's "Manage branches" expands +
 * focuses it (manage-branches bus). Older preloads without the Phase-10
 * bridge methods degrade to the local-only list (no fetch, no remotes).
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import type { GitBranchInfo, GitRemoteBranchInfo } from '@shared/types';
import { useApp } from '../state/store';
import type { MenuItemSpec } from '../state/store';
import { useNow } from '../format';
import { Codicon } from '../icons';
import {
  depthRepoState,
  hasBranchManagement,
  hasGitDepth,
  useGitDepth
} from './depth';
import {
  formatRelative,
  formatRelativeLong,
  shortenRemoteUrl
} from './format';
import { onManageBranches } from './manage-branches';
import { usePersistedBool } from './sections';

type BranchRow =
  | { kind: 'local'; name: string; local: GitBranchInfo }
  | { kind: 'remote'; name: string; remote: GitRemoteBranchInfo };

const rowId = (row: BranchRow): string =>
  row.kind === 'local' ? `l:${row.name}` : `r:${row.name}`;

export function BranchesView({
  repoPath
}: {
  repoPath: string;
}): React.JSX.Element {
  const toast = useApp((s) => s.toast);
  const setMenu = useApp((s) => s.setMenu);
  const setConfirm = useApp((s) => s.setConfirm);

  const depth = useGitDepth();
  const repo = depthRepoState(
    useGitDepth((s) => s.repos),
    repoPath
  );
  const now = useNow();
  const manageable = useMemo(() => hasBranchManagement(), []);
  const depthAvailable = useMemo(() => hasGitDepth(), []);

  // BRANCHES ships collapsed by default (DESIGN-SPEC S3A round 2).
  const [collapsed, setCollapsed] = usePersistedBool(
    `gmux.scm.branchesCollapsed.${repoPath}`,
    true
  );
  const [filter, setFilter] = useState('');
  const [cursor, setCursor] = useState<string | null>(null);

  const sectionRef = useRef<HTMLElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!collapsed) depth.ensure(repoPath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapsed, repoPath]);

  // Branch menu → "Manage branches": expand + focus this section.
  useEffect(
    () =>
      onManageBranches(() => {
        setCollapsed(false);
        requestAnimationFrame(() => {
          sectionRef.current?.scrollIntoView({ block: 'nearest' });
          listRef.current?.focus();
        });
      }),
    [setCollapsed]
  );

  const locals = repo.branches ?? [];
  const remotes = repo.remoteBranches ?? [];
  /** Configured remotes (name + URL + tracking marker) — `git remote -v`. */
  const remoteList = repo.remotes ?? [];
  const busy = repo.busyRef;

  const needle = filter.trim().toLowerCase();
  const filteredLocals = useMemo(
    () =>
      needle === ''
        ? locals
        : locals.filter((b) => b.name.toLowerCase().includes(needle)),
    [locals, needle]
  );
  const filteredRemotes = useMemo(
    () =>
      needle === ''
        ? remotes
        : remotes.filter((b) => b.name.toLowerCase().includes(needle)),
    [remotes, needle]
  );

  /**
   * Remotes grouped by remote name, in git's own order (origin first), branch
   * order kept. Every configured remote gets a group even with zero fetched
   * refs — a remote you have never fetched is still a remote you have — but
   * an active filter hides the empty ones (they match nothing).
   */
  const remoteGroups = useMemo(() => {
    const map = new Map<string, GitRemoteBranchInfo[]>();
    if (needle === '') {
      for (const r of remoteList) map.set(r.name, []);
    }
    for (const b of filteredRemotes) {
      const list = map.get(b.remote);
      if (list === undefined) map.set(b.remote, [b]);
      else list.push(b);
    }
    const order = new Map(remoteList.map((r, i) => [r.name, i]));
    return [...map.entries()].sort(([a], [b]) => {
      const ia = order.get(a) ?? Number.MAX_SAFE_INTEGER;
      const ib = order.get(b) ?? Number.MAX_SAFE_INTEGER;
      return ia !== ib ? ia - ib : a.localeCompare(b);
    });
  }, [filteredRemotes, remoteList, needle]);

  /** Flattened keyboard-navigation order: locals, then remotes per group. */
  const rows = useMemo<BranchRow[]>(() => {
    const list: BranchRow[] = filteredLocals.map((b) => ({
      kind: 'local' as const,
      name: b.name,
      local: b
    }));
    for (const [, group] of remoteGroups) {
      for (const b of group) {
        list.push({ kind: 'remote', name: b.name, remote: b });
      }
    }
    return list;
  }, [filteredLocals, remoteGroups]);

  // -- actions ----------------------------------------------------------------

  const copyName = useCallback(
    (name: string): void => {
      void navigator.clipboard.writeText(name).then(
        () => toast('info', 'Branch name copied'),
        () => toast('error', 'Could not copy the branch name')
      );
    },
    [toast]
  );

  const copyUrl = useCallback(
    (name: string, url: string): void => {
      void navigator.clipboard.writeText(url).then(
        () => toast('info', `${name} URL copied`),
        () => toast('error', 'Could not copy the remote URL')
      );
    },
    [toast]
  );

  const activate = useCallback(
    (row: BranchRow): void => {
      if (busy !== null) return; // one checkout at a time
      if (row.kind === 'local') {
        if (row.local.current) return; // current row is inert
        void depth.checkoutBranch(repoPath, row.name);
      } else {
        void depth.checkoutTracking(repoPath, row.name);
      }
    },
    [busy, depth, repoPath]
  );

  const confirmDelete = useCallback(
    (branch: GitBranchInfo): void => {
      setConfirm({
        title: `Delete branch '${branch.name}'?`,
        body: 'This cannot be undone.',
        confirmLabel: 'Delete branch',
        destructive: true,
        onConfirm: () => {
          void depth.deleteBranch(repoPath, branch.name, false).then((res) => {
            if (res?.status !== 'unmerged') return;
            // Force is offered ONLY when git reported the branch unmerged.
            setConfirm({
              title: `'${branch.name}' isn't fully merged`,
              body: 'It has commits that no other branch contains. Force deleting discards them permanently.',
              confirmLabel: 'Force delete',
              destructive: true,
              onConfirm: () =>
                void depth.deleteBranch(repoPath, branch.name, true)
            });
          });
        }
      });
    },
    [depth, repoPath, setConfirm]
  );

  const onRowContextMenu = useCallback(
    (e: React.MouseEvent, row: BranchRow): void => {
      e.preventDefault();
      e.stopPropagation();
      const items: (MenuItemSpec | 'sep')[] = [];
      if (row.kind === 'local') {
        if (!row.local.current) {
          items.push({
            label: 'Checkout',
            disabled: busy !== null,
            run: () => activate(row)
          });
        }
        items.push({
          label: 'Copy branch name',
          run: () => copyName(row.name)
        });
        if (!row.local.current && manageable) {
          items.push('sep', {
            label: 'Delete branch…',
            destructive: true,
            disabled: busy !== null,
            run: () => confirmDelete(row.local)
          });
        }
      } else {
        items.push(
          {
            label: 'Checkout as local branch',
            disabled: busy !== null,
            run: () => activate(row)
          },
          { label: 'Copy branch name', run: () => copyName(row.name) }
        );
      }
      setMenu({ x: e.clientX, y: e.clientY, items });
    },
    [activate, busy, confirmDelete, copyName, manageable, setMenu]
  );

  // -- keyboard ----------------------------------------------------------------

  const onListKeyDown = (e: React.KeyboardEvent): void => {
    if (rows.length === 0) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const idx = rows.findIndex((r) => rowId(r) === cursor);
      const nextIdx =
        idx === -1
          ? e.key === 'ArrowDown'
            ? 0
            : rows.length - 1
          : Math.min(
              Math.max(idx + (e.key === 'ArrowDown' ? 1 : -1), 0),
              rows.length - 1
            );
      const next = rows[nextIdx];
      if (next !== undefined) {
        const id = rowId(next);
        setCursor(id);
        listRef.current
          ?.querySelector(`[data-branch="${CSS.escape(id)}"]`)
          ?.scrollIntoView({ block: 'nearest' });
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const row = rows.find((r) => rowId(r) === cursor) ?? rows[0];
      if (row !== undefined) activate(row);
    }
  };

  // -- render ------------------------------------------------------------------

  const renderLocalRow = (b: GitBranchInfo): React.JSX.Element => {
    const id = rowId({ kind: 'local', name: b.name, local: b });
    const isBusy = busy === b.name;
    return (
      <div
        key={id}
        role="option"
        aria-selected={cursor === id}
        aria-label={`${b.name}${b.current ? ', current branch' : ''}`}
        data-branch={id}
        className={[
          'scm-brow',
          b.current ? 'current' : '',
          cursor === id ? 'selected' : ''
        ]
          .filter(Boolean)
          .join(' ')}
        title={b.current ? `${b.name} — current branch` : `Switch to ${b.name}`}
        onClick={() => {
          setCursor(id);
          activate({ kind: 'local', name: b.name, local: b });
        }}
        onContextMenu={(e) =>
          onRowContextMenu(e, { kind: 'local', name: b.name, local: b })
        }
      >
        <span className="scm-bicon" aria-hidden="true">
          {isBusy ? (
            <span className="scm-branch-spinner" />
          ) : (
            <Codicon name={b.current ? 'check' : 'git-branch'} size={12} />
          )}
        </span>
        <span className="scm-bname">{b.name}</span>
        <span className="scm-row-space" />
        {b.ahead > 0 || b.behind > 0 ? (
          <span
            className="scm-barrows num"
            title={[
              b.ahead > 0 ? `${b.ahead} ahead` : null,
              b.behind > 0 ? `${b.behind} behind` : null
            ]
              .filter(Boolean)
              .join(' · ')
              .concat(b.upstream !== undefined ? ` of ${b.upstream}` : '')}
          >
            {b.ahead > 0 ? `↑${b.ahead}` : ''}
            {b.ahead > 0 && b.behind > 0 ? ' ' : ''}
            {b.behind > 0 ? `↓${b.behind}` : ''}
          </span>
        ) : null}
      </div>
    );
  };

  const renderRemoteRow = (b: GitRemoteBranchInfo): React.JSX.Element => {
    const id = rowId({ kind: 'remote', name: b.name, remote: b });
    const isBusy = busy === b.name;
    return (
      <div
        key={id}
        role="option"
        aria-selected={cursor === id}
        aria-label={`${b.name}, remote branch`}
        data-branch={id}
        className={`scm-brow remote${cursor === id ? ' selected' : ''}`}
        title={`Check out ${b.shortName} tracking ${b.name}`}
        onClick={() => {
          setCursor(id);
          activate({ kind: 'remote', name: b.name, remote: b });
        }}
        onContextMenu={(e) =>
          onRowContextMenu(e, { kind: 'remote', name: b.name, remote: b })
        }
      >
        <span className="scm-bicon" aria-hidden="true">
          {isBusy ? (
            <span className="scm-branch-spinner" />
          ) : (
            <Codicon name="cloud" size={12} />
          )}
        </span>
        <span className="scm-bname remote">{b.name}</span>
      </div>
    );
  };

  // A configured remote counts even before its first fetch — that is exactly
  // when the Fetch accessory is most useful.
  const hasRemotes = remotes.length > 0 || remoteList.length > 0;
  const loaded = repo.branches !== null;

  return (
    <section
      ref={sectionRef}
      className={`section-scm-branches${collapsed ? ' collapsed' : ''}`}
      data-section-root="branches"
    >
      <div
        className={`section-header${collapsed ? ' collapsed' : ''}`}
        data-section="branches"
      >
        <button
          type="button"
          className="section-toggle"
          aria-expanded={!collapsed}
          onClick={() => setCollapsed(!collapsed)}
        >
          <span className="section-chevron">
            <Codicon name="chevron-down" size={12} />
          </span>
          Branches
        </button>
        <span className="section-spacer" />
        <span className="section-gripper" aria-hidden="true">
          <Codicon name="gripper" size={14} />
        </span>
        {manageable && hasRemotes && repo.lastFetchedAt !== null ? (
          <span
            className="scm-fetched num"
            title={`Last fetched ${formatRelativeLong(repo.lastFetchedAt, now)}`}
          >
            {formatRelative(repo.lastFetchedAt, now)}
          </span>
        ) : null}
        {manageable && hasRemotes ? (
          <button
            type="button"
            className={`icon-btn scm-action scm-branch-accessory${repo.fetching ? ' busy' : ''}`}
            aria-label="Fetch all remotes"
            title="Fetch all remotes"
            disabled={repo.fetching}
            onClick={() => void depth.fetchAll(repoPath)}
          >
            {repo.fetching ? (
              <span className="scm-branch-spinner" aria-hidden="true" />
            ) : (
              <Codicon name="cloud-download" size={14} />
            )}
          </button>
        ) : null}
        <button
          type="button"
          className="icon-btn scm-action scm-branch-accessory"
          aria-label="Refresh branches"
          title="Refresh branches"
          onClick={() => void depth.refresh(repoPath)}
        >
          <Codicon name="refresh" size={14} />
        </button>
      </div>
      {!collapsed ? (
        <div className="section-body scm-branches-body">
          {loaded && (locals.length + remotes.length > 3 || filter !== '') ? (
            <div className="scm-branch-filter">
              <Codicon name="filter" size={12} className="scm-branch-filter-icon" />
              <input
                type="text"
                className="scm-branch-filter-input"
                placeholder="Filter branches"
                aria-label="Filter branches"
                value={filter}
                spellCheck={false}
                onChange={(e) => setFilter(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape' && filter !== '') {
                    e.stopPropagation();
                    setFilter('');
                  }
                }}
              />
            </div>
          ) : null}
          {!depthAvailable ? (
            <div className="section-stub">
              Branch management needs a newer Tortie build.
            </div>
          ) : !loaded ? (
            <div className="scm-skeleton" aria-label="Loading branches">
              <div className="scm-skeleton-row" style={{ width: '52%' }} />
              <div className="scm-skeleton-row" style={{ width: '68%' }} />
            </div>
          ) : rows.length === 0 ? (
            <div className="section-stub">
              {needle !== ''
                ? 'No branches match.'
                : 'No branches yet — your first commit creates one.'}
            </div>
          ) : (
            <div
              ref={listRef}
              className="scm-branch-list"
              role="listbox"
              aria-label="Branches"
              tabIndex={0}
              onKeyDown={onListKeyDown}
            >
              {filteredLocals.length > 0 ? (
                <div className="scm-group-row">
                  <span className="scm-group-label">Local</span>
                  <span className="scm-group-count num">
                    {filteredLocals.length}
                  </span>
                </div>
              ) : null}
              {filteredLocals.map(renderLocalRow)}
              {remoteGroups.map(([remote, group]) => {
                const info = remoteList.find((r) => r.name === remote);
                return (
                  <React.Fragment key={remote}>
                    <div
                      className="scm-group-row scm-remote-group"
                      onContextMenu={
                        info === undefined
                          ? undefined
                          : (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const items: MenuItemSpec[] = [
                                {
                                  label: 'Copy Remote URL',
                                  run: () => copyUrl(info.name, info.fetchUrl)
                                }
                              ];
                              if (info.pushUrl !== info.fetchUrl) {
                                items.push({
                                  label: 'Copy Push URL',
                                  run: () => copyUrl(info.name, info.pushUrl)
                                });
                              }
                              setMenu({ x: e.clientX, y: e.clientY, items });
                            }
                      }
                    >
                      <span className="scm-group-label">{remote}</span>
                      {info?.tracked === true ? (
                        <span
                          className="chip chip-sm scm-chip-tracking"
                          title="The current branch tracks this remote"
                        >
                          tracking
                        </span>
                      ) : null}
                      {info !== undefined ? (
                        <span className="scm-remote-url" title={info.fetchUrl}>
                          {shortenRemoteUrl(info.fetchUrl)}
                        </span>
                      ) : null}
                      <span className="scm-row-space" />
                      <span className="scm-group-count num">{group.length}</span>
                    </div>
                    {group.length === 0 ? (
                      <div className="scm-brow-empty">
                        Nothing fetched from {remote} yet
                      </div>
                    ) : (
                      group.map(renderRemoteRow)
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

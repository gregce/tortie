/**
 * S3 — Changes + History sections of the sidebar (the git SCM UI).
 *
 * Anatomy (DESIGN-SPEC S3): sticky section header · commit box (⌘↩ commits
 * staged; "Stage all & commit" when nothing staged) · resource groups
 * Merge / Staged / Changes / Untracked with letter badges and hover actions
 * (stage ＋ / unstage － / discard ↩ with confirm) · row click emits the
 * open-diff event for the editor (src/renderer/scm/open-file.ts). History
 * is a second section, round 1: the VS Code-bar commit list lives in
 * ./HistorySection.tsx (refs badges, context menu, rich hover card).
 *
 * INTEGRATOR: in src/renderer/app/Sidebar.tsx replace
 * `<div data-slot="scm" />` with `<ScmSection />`.
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import type { GitFileState, GitFileStatus } from '@shared/types';
import type { GmuxGitExtras } from '@shared/ipc';
import { useApp } from '../state/store';
import type { ConfirmSpec, MenuItemSpec } from '../state/store';
import {
  gitErrorLine,
  groupFiles,
  repoState,
  useGit
} from '../state/git';
import type { PendingOp, ScmGroups } from '../state/git';
import { Codicon } from '../icons';
import { showOneTimeTip } from '../app/one-time-tip';
import { splitPath } from './format';
import { requestOpenFile } from './open-file';
import { HistorySection } from './HistorySection';
import { BranchesView } from './BranchesView';
import { usePersistedBool, useSectionDrag, useSectionOrder } from './sections';
import './scm.css';

/** SCM view sections, default order (DESIGN-SPEC S3A round 2). */
const SCM_SECTION_IDS = ['changes', 'history', 'branches'] as const;
type ScmSectionId = (typeof SCM_SECTION_IDS)[number];

const SCM_SECTION_LABELS: Record<ScmSectionId, string> = {
  changes: 'Changes',
  history: 'History',
  branches: 'Branches'
};

// ---------------------------------------------------------------------------
// Small local helpers
// ---------------------------------------------------------------------------

type GroupId = 'merge' | 'staged' | 'changes' | 'untracked';

interface ScmRowModel {
  group: GroupId;
  file: GitFileStatus;
  /** Unique within the flattened list (a file can be staged AND changed). */
  key: string;
}

const GROUP_LABEL: Record<GroupId, string> = {
  merge: 'Merge',
  staged: 'Staged',
  changes: 'Changes',
  untracked: 'Untracked'
};

/** Letter + token color class for a row's badge (DESIGN-SPEC S3). */
function badgeFor(
  group: GroupId,
  file: GitFileStatus
): { letter: string; cls: string; word: string } {
  if (group === 'merge') {
    return { letter: '!', cls: 'scm-badge-conflict', word: 'conflict' };
  }
  if (group === 'untracked') {
    return { letter: 'U', cls: 'scm-badge-added', word: 'untracked' };
  }
  const state: GitFileState =
    group === 'staged' ? file.indexState : file.worktreeState;
  switch (state) {
    case 'A':
      return { letter: 'A', cls: 'scm-badge-added', word: 'added' };
    case 'D':
      return { letter: 'D', cls: 'scm-badge-deleted', word: 'deleted' };
    case 'R':
      return { letter: 'R', cls: 'scm-badge-renamed', word: 'renamed' };
    case 'C':
      return { letter: 'C', cls: 'scm-badge-renamed', word: 'copied' };
    case 'M':
    case 'U':
    case '?':
    case '!':
    case '.':
    default:
      return { letter: 'M', cls: 'scm-badge-modified', word: 'modified' };
  }
}

/**
 * Discard-with-confirm, shared by the row's hover action and the listbox's
 * Backspace binding (Phase 8 keyboard reachability).
 */
function confirmDiscardFile(
  setConfirm: (spec: ConfirmSpec | null) => void,
  discard: (repoPath: string, paths: string[]) => Promise<void>,
  repoPath: string,
  group: GroupId,
  file: GitFileStatus
): void {
  const { base } = splitPath(file.path);
  if (group === 'untracked') {
    setConfirm({
      title: `Delete '${base}'?`,
      body: 'This file is not tracked by git — deleting it cannot be undone.',
      confirmLabel: 'Delete file',
      destructive: true,
      onConfirm: () => void discard(repoPath, [file.path])
    });
  } else {
    setConfirm({
      title: `Discard changes to '${base}'?`,
      body: 'This cannot be undone.',
      confirmLabel: 'Discard changes',
      destructive: true,
      onConfirm: () => void discard(repoPath, [file.path])
    });
  }
}

// ---------------------------------------------------------------------------
// SCM file row
// ---------------------------------------------------------------------------

function ScmFileRow({
  row,
  repoPath,
  active,
  pendingOp,
  onActivate
}: {
  row: ScmRowModel;
  repoPath: string;
  active: boolean;
  pendingOp: PendingOp | undefined;
  /** `keep` opens a pinned tab instead of recycling the preview slot. */
  onActivate: (row: ScmRowModel, keep?: boolean) => void;
}): React.JSX.Element {
  const stage = useGit((s) => s.stage);
  const unstage = useGit((s) => s.unstage);
  const discard = useGit((s) => s.discard);
  const setConfirm = useApp((s) => s.setConfirm);
  const setMenu = useApp((s) => s.setMenu);

  const { group, file } = row;
  const badge = badgeFor(group, file);
  const { dir, base } = splitPath(file.path);
  const busy = pendingOp !== undefined;

  const confirmDiscard = (): void => {
    confirmDiscardFile(setConfirm, discard, repoPath, group, file);
  };

  // Context menu (DESIGN.md §3: SCM rows have one; native via ui:popupMenu).
  // Same verbs as the hover actions, plus Open.
  const onContextMenu = (e: React.MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    const items: (MenuItemSpec | 'sep')[] = [
      {
        label:
          group === 'untracked' || group === 'merge' ? 'Open file' : 'Open diff',
        run: () => onActivate(row)
      },
      // Files open the same way everywhere in gmux (Phase 12.4): one preview
      // slot by default, a kept tab on demand. A verb the explorer has and
      // this list does not would make the tab model look like a tree quirk.
      {
        label: 'Open in New Tab',
        run: () => {
          onActivate(row, true);
          showOneTimeTip('open-in-new-tab');
        }
      },
      'sep'
    ];
    if (group === 'staged') {
      items.push({
        label: 'Unstage',
        disabled: busy,
        run: () => void unstage(repoPath, [file.path])
      });
    } else if (group === 'merge') {
      items.push({
        label: 'Mark resolved (stage)',
        disabled: busy,
        run: () => void stage(repoPath, [file.path])
      });
    } else {
      items.push({
        label: 'Stage',
        disabled: busy,
        run: () => void stage(repoPath, [file.path])
      });
      items.push('sep');
      items.push({
        label: group === 'untracked' ? 'Delete file…' : 'Discard changes…',
        destructive: true,
        disabled: busy,
        run: confirmDiscard
      });
    }
    setMenu({ x: e.clientX, y: e.clientY, items });
  };

  const renamedFrom =
    file.origPath !== undefined ? `renamed from ${file.origPath}` : null;

  return (
    <div
      role="option"
      aria-selected={active}
      aria-label={`${base}, ${badge.word}${dir !== '' ? `, in ${dir}` : ''}`}
      className={[
        'scm-row',
        active ? 'selected' : '',
        busy ? 'busy' : ''
      ]
        .filter(Boolean)
        .join(' ')}
      title={
        renamedFrom !== null ? `${file.path} — ${renamedFrom}` : file.path
      }
      onClick={() => onActivate(row)}
      onContextMenu={onContextMenu}
    >
      <span className={`scm-badge ${badge.cls}`} aria-hidden="true">
        {badge.letter}
      </span>
      <span
        className={`scm-row-name${badge.letter === 'D' ? ' deleted' : ''}`}
      >
        {base}
      </span>
      {dir !== '' ? <span className="scm-row-dir">{dir}</span> : null}
      <span className="scm-row-space" />
      <span className="scm-row-actions">
        {group === 'staged' ? (
          <button
            type="button"
            className="icon-btn scm-action"
            aria-label={`Unstage ${base}`}
            title="Unstage"
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              void unstage(repoPath, [file.path]);
            }}
          >
            <Codicon name="remove" size={14} />
          </button>
        ) : (
          <>
            {group !== 'merge' ? (
              <button
                type="button"
                className="icon-btn scm-action"
                aria-label={
                  group === 'untracked' ? `Delete ${base}` : `Discard changes to ${base}`
                }
                title={group === 'untracked' ? 'Delete…' : 'Discard changes…'}
                disabled={busy}
                onClick={(e) => {
                  e.stopPropagation();
                  confirmDiscard();
                }}
              >
                <Codicon name="discard" size={14} />
              </button>
            ) : null}
            <button
              type="button"
              className="icon-btn scm-action"
              aria-label={
                group === 'merge' ? `Mark ${base} resolved` : `Stage ${base}`
              }
              title={group === 'merge' ? 'Mark resolved (stage)' : 'Stage'}
              disabled={busy}
              onClick={(e) => {
                e.stopPropagation();
                void stage(repoPath, [file.path]);
              }}
            >
              <Codicon name="add" size={14} />
            </button>
          </>
        )}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Commit box
// ---------------------------------------------------------------------------

interface CommitController {
  message: string;
  setMessage: (v: string) => void;
  label: string;
  disabledReason: string | null;
  committing: boolean;
  stageAllFirst: boolean;
  doCommit: () => void;
}

/** Commit-box state + rules, shared by the box and the section-wide ⌘↩. */
function useCommitController(
  repoPath: string,
  groups: ScmGroups
): CommitController {
  const commit = useGit((s) => s.commit);
  const committing = useGit((s) => s.committing[repoPath] ?? false);
  const message = useGit((s) => s.messages[repoPath] ?? '');
  const setStoreMessage = useGit((s) => s.setMessage);

  const hasStaged = groups.staged.length > 0;
  const hasUnstaged = groups.changes.length > 0 || groups.untracked.length > 0;
  const hasConflicts = groups.merge.length > 0;
  const stageAllFirst = !hasStaged && hasUnstaged;

  let disabledReason: string | null = null;
  if (committing) disabledReason = 'Committing…';
  else if (hasConflicts) disabledReason = 'Resolve conflicts before committing';
  else if (!hasStaged && !hasUnstaged) disabledReason = 'No changes to commit';
  else if (message.trim().length === 0) disabledReason = 'Enter a commit message';

  const label = committing
    ? 'Committing…'
    : stageAllFirst
      ? 'Stage all & commit'
      : 'Commit';

  const doCommit = useCallback((): void => {
    const s = useGit.getState();
    if (s.committing[repoPath] === true) return;
    if ((s.messages[repoPath] ?? '').trim().length === 0) return;
    void commit(repoPath, stageAllFirst);
  }, [commit, repoPath, stageAllFirst]);

  return {
    message,
    setMessage: (v: string) => setStoreMessage(repoPath, v),
    label,
    disabledReason,
    committing,
    stageAllFirst,
    doCommit
  };
}

function CommitBox({ ctrl }: { ctrl: CommitController }): React.JSX.Element {
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-grow 1–5 lines (S3 spec).
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    const line = 18; // --lh-sm; content-box grows in whole lines
    const max = line * 5 + 12; // + vertical padding
    ta.style.height = `${Math.min(ta.scrollHeight, max)}px`;
  }, [ctrl.message]);

  return (
    <div className="scm-commit">
      <textarea
        ref={taRef}
        className="scm-commit-input"
        placeholder="Commit message (⌘↩ to commit)"
        aria-label="Commit message"
        value={ctrl.message}
        rows={1}
        spellCheck={false}
        disabled={ctrl.committing}
        onChange={(e) => ctrl.setMessage(e.target.value)}
      />
      <button
        type="button"
        className="btn btn-primary scm-commit-btn"
        disabled={ctrl.disabledReason !== null}
        title={
          ctrl.disabledReason ??
          (ctrl.stageAllFirst
            ? 'Stage everything, then commit (⌘↩)'
            : 'Commit staged changes (⌘↩)')
        }
        onClick={ctrl.doCommit}
      >
        {ctrl.committing ? (
          <span className="scm-spinner" aria-hidden="true" />
        ) : null}
        {ctrl.label}
      </button>
      {ctrl.disabledReason === 'Resolve conflicts before committing' ? (
        <div className="scm-commit-caption">
          Resolve conflicts before committing
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Changes section (the SCM heart) — History lives in ./HistorySection.tsx
// ---------------------------------------------------------------------------

function InitRepoStub({ repoPath }: { repoPath: string }): React.JSX.Element {
  const refreshStatus = useGit((s) => s.refreshStatus);
  const toast = useApp((s) => s.toast);
  const [busy, setBusy] = useState(false);

  const gitExtras = (window.gmux?.git ?? {}) as GmuxGitExtras;
  const canInit = typeof gitExtras.init === 'function';

  const initRepo = async (): Promise<void> => {
    if (typeof gitExtras.init !== 'function') return;
    setBusy(true);
    try {
      await gitExtras.init(repoPath);
      await refreshStatus(repoPath);
      toast('success', 'Repository initialized');
    } catch (err) {
      toast('error', `Could not initialize — ${gitErrorLine(err)}`, {
        sticky: true
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="scm-nonrepo">
      <p className="scm-nonrepo-body">
        Not a git repository. Sessions and files work; diffs and commits need
        git.
      </p>
      {canInit ? (
        <button
          type="button"
          className="btn btn-secondary scm-init-btn"
          disabled={busy}
          onClick={() => void initRepo()}
        >
          {busy ? 'Initializing…' : 'Initialize repository'}
        </button>
      ) : (
        <p className="scm-nonrepo-hint">
          Run <span className="scm-mono">git init</span> in a session to
          enable them.
        </p>
      )}
    </div>
  );
}

export function ScmSection(): React.JSX.Element | null {
  const projects = useApp((s) => s.projects);
  const activeProjectId = useApp((s) => s.activeProjectId);
  const setConfirm = useApp((s) => s.setConfirm);

  const init = useGit((s) => s.init);
  const ensureStatus = useGit((s) => s.ensureStatus);
  const repos = useGit((s) => s.repos);
  const pending = useGit((s) => s.pending);
  const stage = useGit((s) => s.stage);
  const unstage = useGit((s) => s.unstage);
  const discard = useGit((s) => s.discard);

  const project = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? null,
    [projects, activeProjectId]
  );
  const repoPath = project?.path ?? null;
  const repo = repoState(repos, repoPath);
  const status = repo.status;

  const [collapsed, setCollapsed] = usePersistedBool(
    `gmux.scm.changesCollapsed.${repoPath ?? ''}`,
    false
  );

  useEffect(() => {
    init();
    if (repoPath !== null) ensureStatus(repoPath);
  }, [init, ensureStatus, repoPath]);

  const groups = useMemo(
    () => groupFiles(status?.isRepo === true ? status.files : []),
    [status]
  );

  const rows = useMemo<ScmRowModel[]>(() => {
    const list: ScmRowModel[] = [];
    for (const g of ['merge', 'staged', 'changes', 'untracked'] as GroupId[]) {
      for (const f of groups[g]) list.push({ group: g, file: f, key: `${g}:${f.path}` });
    }
    return list;
  }, [groups]);

  // Hook order: controller must run even when no project is open.
  const commitCtrl = useCommitController(repoPath ?? '', groups);

  // Keyboard cursor over the flattened row list (listbox pattern, like the
  // sessions list). Cursor keys move it; Enter re-emits the open event.
  const [cursorKey, setCursorKey] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Section order + drag-reorder (BACKLOG #6): persisted per view app-wide;
  // only meaningful with ≥2 sections (non-repo renders Changes alone).
  const isRepoNow = status?.isRepo === true;
  const { order, setOrder, moveSection } = useSectionOrder('scm', SCM_SECTION_IDS);
  const sectionsRef = useRef<HTMLDivElement | null>(null);
  const sectionDrag = useSectionDrag(
    sectionsRef,
    isRepoNow ? order : ['changes'],
    setOrder,
    moveSection,
    SCM_SECTION_LABELS
  );

  const activate = useCallback(
    (row: ScmRowModel, keep = false): void => {
      if (repoPath === null) return;
      setCursorKey(row.key);
      requestOpenFile({
        repoPath,
        relPath: row.file.path,
        path: `${repoPath}/${row.file.path}`,
        // A rename's HEAD side is at the OLD path (carried finding (a)).
        ...(row.file.origPath !== undefined
          ? { origPath: row.file.origPath }
          : {}),
        mode:
          row.group === 'untracked' || row.group === 'merge' ? 'file' : 'diff',
        // Plain activation keeps the v1 behavior (the preview slot); `keep`
        // is the "Open in New Tab" verb.
        preview: !keep,
        source:
          row.group === 'staged'
            ? 'index'
            : row.group === 'merge'
              ? 'merge'
              : row.group === 'untracked'
                ? 'untracked'
                : 'worktree'
      });
    },
    [repoPath]
  );

  const onListKeyDown = (e: React.KeyboardEvent): void => {
    if (rows.length === 0 || repoPath === null) return;
    const idx = rows.findIndex((r) => r.key === cursorKey);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const nextIdx =
        e.key === 'ArrowDown'
          ? Math.min(idx + 1, rows.length - 1)
          : Math.max(idx <= 0 ? 0 : idx - 1, 0);
      const next = rows[nextIdx];
      if (next) {
        setCursorKey(next.key);
        listRef.current
          ?.querySelector(`[data-key="${CSS.escape(next.key)}"]`)
          ?.scrollIntoView({ block: 'nearest' });
      }
    } else if (e.key === 'Enter' && !e.metaKey) {
      e.preventDefault();
      const row = rows.find((r) => r.key === cursorKey) ?? rows[0];
      if (row) activate(row);
    } else if (e.key === ' ' || e.key === 's' || e.key === 'S') {
      // Phase 8 keyboard staging: Space / s toggles the cursor row —
      // staged rows unstage, everything else (incl. conflicts) stages.
      e.preventDefault();
      const row = rows.find((r) => r.key === cursorKey) ?? rows[0];
      if (!row) return;
      if (row.group === 'staged') {
        void unstage(repoPath, [row.file.path]);
      } else {
        void stage(repoPath, [row.file.path]);
      }
    } else if (e.key === 'Backspace') {
      // Discard the cursor row, behind the SAME confirm the ↩ action uses.
      e.preventDefault();
      const row = rows.find((r) => r.key === cursorKey) ?? rows[0];
      if (!row || row.group === 'staged' || row.group === 'merge') return;
      confirmDiscardFile(setConfirm, discard, repoPath, row.group, row.file);
    }
  };

  if (!project || repoPath === null) return null;

  const pendingForRepo = pending[repoPath] ?? {};
  const total = status?.isRepo === true ? status.files.length : 0;

  const groupHeaderAction = (g: GroupId): React.ReactNode => {
    if (g === 'staged') {
      return (
        <button
          type="button"
          className="icon-btn scm-action scm-group-action"
          aria-label="Unstage all"
          title="Unstage all"
          onClick={() =>
            void unstage(repoPath, groups.staged.map((f) => f.path))
          }
        >
          <Codicon name="remove" size={14} />
        </button>
      );
    }
    if (g === 'changes' || g === 'untracked') {
      const files = groups[g].map((f) => f.path);
      return (
        <button
          type="button"
          className="icon-btn scm-action scm-group-action"
          aria-label={g === 'changes' ? 'Stage all changes' : 'Stage all untracked files'}
          title="Stage all"
          onClick={() => void stage(repoPath, files)}
        >
          <Codicon name="add" size={14} />
        </button>
      );
    }
    if (g === 'merge') {
      return (
        <button
          type="button"
          className="icon-btn scm-action scm-group-action"
          aria-label="Mark all conflicts resolved"
          title="Mark all resolved (stage)"
          onClick={() => {
            setConfirm({
              title: 'Mark all conflicts resolved?',
              body: 'Every conflicted file will be staged as-is.',
              confirmLabel: 'Mark resolved',
              onConfirm: () =>
                void stage(repoPath, groups.merge.map((f) => f.path))
            });
          }}
        >
          <Codicon name="add" size={14} />
        </button>
      );
    }
    return null;
  };

  const body = (): React.JSX.Element => {
    // Loading with nothing yet → skeleton, not a spinner (operate mode).
    if (repo.loading && status === null) {
      return (
        <div className="scm-skeleton" aria-label="Loading changes">
          <div className="scm-skeleton-row" style={{ width: '64%' }} />
          <div className="scm-skeleton-row" style={{ width: '78%' }} />
          <div className="scm-skeleton-row" style={{ width: '52%' }} />
        </div>
      );
    }
    if (repo.error !== null && status === null) {
      return (
        <div className="scm-nonrepo">
          <p className="scm-nonrepo-body">Git isn’t responding here — {repo.error}</p>
          <button
            type="button"
            className="btn btn-secondary scm-init-btn"
            onClick={() => void useGit.getState().refreshStatus(repoPath)}
          >
            Try again
          </button>
        </div>
      );
    }
    if (status !== null && !status.isRepo) {
      return <InitRepoStub repoPath={repoPath} />;
    }
    return (
      <>
        <CommitBox ctrl={commitCtrl} />
        {total === 0 ? (
          <div className="section-stub">
            No changes — the working tree is clean.
          </div>
        ) : (
          <div
            ref={listRef}
            className="scm-list"
            role="listbox"
            aria-label="Changed files"
            tabIndex={0}
            onKeyDown={onListKeyDown}
          >
            {(['merge', 'staged', 'changes', 'untracked'] as GroupId[]).map(
              (g) =>
                groups[g].length === 0 ? null : (
                  <React.Fragment key={g}>
                    <div className="scm-group-row">
                      <span className="scm-group-label">
                        {GROUP_LABEL[g]}
                      </span>
                      <span className="scm-group-count num">
                        {groups[g].length}
                      </span>
                      <span className="scm-row-space" />
                      {groupHeaderAction(g)}
                    </div>
                    {groups[g].map((f) => {
                      const key = `${g}:${f.path}`;
                      return (
                        <div key={key} data-key={key}>
                          <ScmFileRow
                            row={{ group: g, file: f, key }}
                            repoPath={repoPath}
                            active={key === cursorKey}
                            pendingOp={pendingForRepo[f.path]}
                            onActivate={activate}
                          />
                        </div>
                      );
                    })}
                  </React.Fragment>
                )
            )}
          </div>
        )}
      </>
    );
  };

  const isRepo = status?.isRepo === true;

  const changesSection = (
    <section
      className={`section-scm${collapsed ? ' collapsed' : ''}`}
      data-section-root="changes"
      onKeyDown={(e) => {
        // ⌘↩ anywhere in the Changes section commits (S3 spec).
        if (e.metaKey && e.key === 'Enter' && isRepo) {
          e.preventDefault();
          commitCtrl.doCommit();
        }
      }}
    >
      <div
        className={`section-header${collapsed ? ' collapsed' : ''}`}
        data-section="changes"
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
          Changes
          <span className="section-count num">{total > 0 ? total : ''}</span>
        </button>
        <span className="section-spacer" />
        <span className="section-gripper" aria-hidden="true">
          <Codicon name="gripper" size={14} />
        </span>
      </div>
      {!collapsed ? <div className="section-body scm-body">{body()}</div> : null}
    </section>
  );

  const sections: Record<ScmSectionId, React.ReactNode> = {
    changes: changesSection,
    history: isRepo ? <HistorySection key={repoPath} repoPath={repoPath} /> : null,
    branches: isRepo ? (
      <BranchesView key={`branches-${repoPath}`} repoPath={repoPath} />
    ) : null
  };

  return (
    <div
      ref={sectionsRef}
      className="scm-sections"
      {...sectionDrag.containerProps}
    >
      {order.map((id) => (
        <React.Fragment key={id}>
          {sections[id as ScmSectionId] ?? null}
        </React.Fragment>
      ))}
      {sectionDrag.overlay}
    </div>
  );
}

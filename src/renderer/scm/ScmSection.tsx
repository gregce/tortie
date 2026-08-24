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
 * Phase 12.8: the list is MULTI-SELECT (click / shift-click / ⌘-click / ⌘A /
 * shift+arrows) and every verb applies to the whole selection. The rules live
 * in ./selection.ts as pure functions; this file only wires gestures to them,
 * so the range/anchor/prune behavior is testable without a repo.
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
import { keyDisplay } from '@shared/keymap';
import type { MachineReviewFile } from '@shared/ipc';
import type { WorkspaceTarget } from '@shared/workspace-target';
import {
  localPathOf,
  targetKey,
  targetOfProject
} from '@shared/workspace-target';
import { useApp } from '../state/store';
import {
  machineAnswering,
  machineLabelFor,
  machineWriteRootFor
} from '../state/machines-slice';
import type { ConfirmSpec, MenuItemSpec } from '../state/store';
import {
  gitErrorLine,
  groupFiles,
  repoState,
  useGit
} from '../state/git';
import type { MachineIndexWriteOutcome } from '@shared/ipc';
import type { PendingOp, ScmGroups } from '../state/git';
import { Codicon } from '../icons';
import { showOneTimeTip } from '../app/one-time-tip';
import { remoteReadAt } from '../machines/presentation';
import {
  REMOTE_SCM_SECTIONS_NOTE,
  remoteChangesBand,
  remoteChangesNone,
  remoteChangesNotRepo,
  remoteChangesUnreachable,
  remoteCommitButton,
  remoteCommitCallFailed,
  remoteCommitCheckDidNot,
  remoteCommitCheckNoAnswer,
  remoteCommitCheckRan,
  remoteCommitDisabledReason,
  remoteCommitStanding,
  remoteConflictNoVerb,
  remoteIndexWritePartial,
  remoteIndexWriteUnsure,
  remoteStageOutsideRoot,
  remoteWritesNotConfirmed
} from '../machines/scm';
import type { RemoteCommitFacts } from '../machines/scm';
import { splitPath } from './format';
import { requestOpenFile } from './open-file';
import {
  remoteChangesAvailable,
  remoteChangesCount,
  remoteChangesOf,
  remoteCommitAvailable,
  remoteIndexWriteAvailable,
  useRemoteChanges
} from './remote-changes';
import type {
  RemoteChangesEntry,
  RemoteIndexVerb
} from './remote-changes';
import { groupRemoteFiles, isConflict } from './groups';
import { registerP103StageDrive } from './p103-stage-drive';
import { registerP104CommitDrive } from './p104-commit-drive';
import { registerP97UntrackedDrive } from './p97-untracked-drive';
import { RemoteBranchSection } from './RemoteBranchSection';
import { RemoteHistorySection } from './RemoteHistorySection';
import { RemoteRunsSection } from './RemoteRunsSection';
import { HistorySection } from './HistorySection';
import { BranchesView } from './BranchesView';
import { RunsSection } from './RunsSection';
import { usePersistedBool, useSectionDrag, useSectionOrder } from './sections';
import {
  NO_SELECTION,
  SCM_GROUP_ORDER,
  discardCopy,
  fileCount,
  flattenRows,
  moveCursor,
  pathsOf,
  pruneToRows,
  selectModeFor,
  scmRowKey,
  selectRow,
  selectWholeGroup,
  selectedRows,
  targetRows,
  verbsFor
} from './selection';
import type { ScmGroupId, ScmRow, ScmSelection, ScmVerbs } from './selection';
import './scm.css';
import { gmuxBridge } from '../bridge';

// The Phase 97 harness hook, registered here for the reason
// src/renderer/tree/FilesSection.tsx registers its two: this module is the one
// the Source Control view always loads, so no edit to App.tsx is needed. It
// assigns one function to `window` and changes no behaviour.
registerP97UntrackedDrive();
// The Phase 103 harness hook, registered beside the Phase 97 one and for the
// same reason. It assigns one function to `window` and changes no behaviour.
registerP103StageDrive();
// The Phase 104 harness hook, registered beside the other two and for the same
// reason. It assigns one function to `window` and changes no behaviour.
registerP104CommitDrive();

/**
 * SCM view sections, default order (DESIGN-SPEC S3A round 2).
 *
 * Phase 46 appended `runs`. A user whose stored order predates it keeps that
 * order and gets Runs last, because sanitizeOrder appends every id it does
 * not find. No migration is written.
 */
const SCM_SECTION_IDS = ['changes', 'history', 'branches', 'runs'] as const;
type ScmSectionId = (typeof SCM_SECTION_IDS)[number];

const SCM_SECTION_LABELS: Record<ScmSectionId, string> = {
  changes: 'Changes',
  history: 'History',
  branches: 'Branches',
  runs: 'Runs'
};

// ---------------------------------------------------------------------------
// Small local helpers
// ---------------------------------------------------------------------------

const GROUP_LABEL: Record<ScmGroupId, string> = {
  merge: 'Merge',
  staged: 'Staged',
  changes: 'Changes',
  untracked: 'Untracked'
};

/** Letter + token color class for a row's badge (DESIGN-SPEC S3). */
function badgeFor(
  group: ScmGroupId,
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
 * Discard-with-confirm for a SELECTION, shared by the row's hover action, the
 * context menu and the listbox's Backspace binding (Phase 8 keyboard
 * reachability). The confirm names the count — see discardCopy.
 */
function confirmDiscardRows(
  setConfirm: (spec: ConfirmSpec | null) => void,
  discard: (repoPath: string, paths: string[]) => Promise<void>,
  repoPath: string,
  rows: readonly ScmRow[]
): void {
  if (rows.length === 0) return;
  const copy = discardCopy(rows);
  setConfirm({
    title: copy.title,
    body: copy.body,
    confirmLabel: copy.confirmLabel,
    destructive: true,
    onConfirm: () => void discard(repoPath, pathsOf(rows))
  });
}

/** "Stage" / "Stage 4 files" — a verb label that never lies about its reach. */
function verbLabel(verb: string, n: number): string {
  return n > 1 ? `${verb} ${fileCount(n)}` : verb;
}

/**
 * The destructive verb's label. Untracked files are DELETED, not reverted, so
 * a selection made only of them says so; a mixed one stays "Discard changes"
 * and lets the confirm body spell out the untracked part.
 */
function discardLabel(verbs: ScmVerbs, short: boolean): string {
  const n = verbs.discard.length;
  const allUntracked = n > 0 && verbs.untracked === n;
  if (n > 1) {
    return allUntracked
      ? `Delete ${fileCount(n)}…`
      : `Discard changes in ${fileCount(n)}…`;
  }
  if (allUntracked) return short ? 'Delete…' : 'Delete file…';
  return 'Discard changes…';
}

// ---------------------------------------------------------------------------
// SCM file row
// ---------------------------------------------------------------------------

/**
 * One changed file. Everything it does is scoped by `targets` — the rows this
 * row's verbs will actually hit: the whole selection when this row is part of
 * it, otherwise just itself (acting on an unselected row must never touch the
 * selection elsewhere — Finder's rule, and VS Code's).
 */
function ScmFileRow({
  row,
  repoPath,
  selected,
  cursor,
  targets,
  verbs,
  pendingOp,
  onSelect,
  onActivate
}: {
  row: ScmRow;
  repoPath: string;
  selected: boolean;
  /** The lead row: what arrows move and what aria points at. */
  cursor: boolean;
  targets: readonly ScmRow[];
  verbs: ScmVerbs;
  pendingOp: PendingOp | undefined;
  /** Click with its modifiers — the selection model owns the outcome. */
  onSelect: (row: ScmRow, e: React.MouseEvent) => void;
  /** `keep` opens a pinned tab instead of recycling the preview slot. */
  onActivate: (row: ScmRow, keep?: boolean) => void;
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
  const multi = targets.length > 1;

  const doStage = (): void => void stage(repoPath, pathsOf(verbs.stage));
  const doUnstage = (): void => void unstage(repoPath, pathsOf(verbs.unstage));
  const doDiscard = (): void => {
    confirmDiscardRows(setConfirm, discard, repoPath, verbs.discard);
  };
  const openAll = (keep: boolean): void => {
    // A multi-row open has to KEEP its tabs: the preview slot holds one file,
    // so previewing four would leave three flashes and one survivor.
    for (const target of targets) onActivate(target, keep || multi);
  };

  // Context menu (DESIGN.md §3: SCM rows have one; native via ui:popupMenu).
  // Same verbs as the hover actions, plus Open — all selection-scoped.
  const onContextMenu = (e: React.MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(row, e);
    const filesWord = multi ? ` ${fileCount(targets.length)}` : '';
    const items: (MenuItemSpec | 'sep')[] = [
      {
        label: multi
          ? `Open${filesWord}`
          : group === 'untracked' || group === 'merge'
            ? 'Open file'
            : 'Open diff',
        run: () => openAll(false)
      }
    ];
    // Files open the same way everywhere in gmux (Phase 12.4): one preview
    // slot by default, a kept tab on demand. A verb the explorer has and
    // this list does not would make the tab model look like a tree quirk.
    // A multi-open is already "keep", so the second entry would be a no-op.
    if (!multi) {
      items.push({
        label: 'Open in New Tab',
        run: () => {
          onActivate(row, true);
          showOneTimeTip('open-in-new-tab');
        }
      });
    }
    items.push('sep');
    if (verbs.unstage.length > 0) {
      items.push({
        label: verbLabel('Unstage', verbs.unstage.length),
        disabled: busy,
        run: doUnstage
      });
    }
    const plainStage = verbs.stage.filter((r) => r.group !== 'merge');
    if (verbs.merge.length > 0) {
      items.push({
        label:
          verbs.merge.length > 1
            ? `Mark ${fileCount(verbs.merge.length)} resolved (stage)`
            : 'Mark resolved (stage)',
        disabled: busy,
        run: () => void stage(repoPath, pathsOf(verbs.merge))
      });
    }
    if (plainStage.length > 0) {
      items.push({
        label: verbLabel('Stage', plainStage.length),
        disabled: busy,
        run: () => void stage(repoPath, pathsOf(plainStage))
      });
    }
    if (verbs.discard.length > 0) {
      items.push('sep');
      items.push({
        label: discardLabel(verbs, false),
        destructive: true,
        disabled: busy,
        run: doDiscard
      });
    }
    setMenu({ x: e.clientX, y: e.clientY, items });
  };

  const renamedFrom =
    file.origPath !== undefined ? `renamed from ${file.origPath}` : null;
  /** Hover-action copy: names the reach when a selection is behind it. */
  const scoped = (verb: string, n: number): string =>
    n > 1 ? `${verb} ${fileCount(n)}` : `${verb} ${base}`;

  return (
    <div
      role="option"
      id={`scm-row-${row.key}`}
      data-key={row.key}
      aria-selected={selected}
      aria-label={`${base}, ${badge.word}${dir !== '' ? `, in ${dir}` : ''}`}
      className={[
        'scm-row',
        selected ? 'selected' : '',
        cursor ? 'cursor' : '',
        busy ? 'busy' : ''
      ]
        .filter(Boolean)
        .join(' ')}
      title={
        renamedFrom !== null ? `${file.path} — ${renamedFrom}` : file.path
      }
      onClick={(e) => {
        onSelect(row, e);
        // A ⌘-click is a selection gesture, not a navigation one — opening a
        // diff every time someone builds a set would trash the preview tab.
        if (!e.metaKey && !e.ctrlKey) onActivate(row);
      }}
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
            aria-label={scoped('Unstage', verbs.unstage.length)}
            title={verbLabel('Unstage', verbs.unstage.length)}
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              doUnstage();
            }}
          >
            <Codicon name="remove" size={14} />
          </button>
        ) : (
          <>
            {group !== 'merge' && verbs.discard.length > 0 ? (
              <button
                type="button"
                className="icon-btn scm-action"
                aria-label={scoped(
                  verbs.untracked === verbs.discard.length
                    ? 'Delete'
                    : 'Discard changes to',
                  verbs.discard.length
                )}
                title={discardLabel(verbs, true)}
                disabled={busy}
                onClick={(e) => {
                  e.stopPropagation();
                  doDiscard();
                }}
              >
                <Codicon name="discard" size={14} />
              </button>
            ) : null}
            <button
              type="button"
              className="icon-btn scm-action"
              aria-label={scoped(
                group === 'merge' ? 'Mark resolved' : 'Stage',
                verbs.stage.length
              )}
              title={
                group === 'merge'
                  ? verbs.merge.length > 1
                    ? `Mark ${fileCount(verbs.merge.length)} resolved (stage)`
                    : 'Mark resolved (stage)'
                  : verbLabel('Stage', verbs.stage.length)
              }
              disabled={busy}
              onClick={(e) => {
                e.stopPropagation();
                doStage();
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
        placeholder={`Commit message (${keyDisplay('git.commit')} to commit)`}
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
            ? `Stage everything, then commit (${keyDisplay('git.commit')})`
            : `Commit staged changes (${keyDisplay('git.commit')})`)
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

  const gitExtras = gmuxBridge()?.git;
  const canInit = typeof gitExtras?.init === 'function';

  const initRepo = async (): Promise<void> => {
    if (typeof gitExtras?.init !== 'function') return;
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

/**
 * The letter badge for one changed file on another machine.
 *
 * The same five badges the history file rows already draw, from the same
 * letters, because it is the same question: what did this commit or this
 * working tree do to this file.
 */
function remoteBadge(status: MachineReviewFile['status']): {
  letter: string;
  cls: string;
  word: string;
} {
  switch (status) {
    case 'A':
      return { letter: 'A', cls: 'scm-badge-added', word: 'added' };
    case 'D':
      return { letter: 'D', cls: 'scm-badge-deleted', word: 'deleted' };
    case 'R':
      return { letter: 'R', cls: 'scm-badge-renamed', word: 'renamed' };
    case 'C':
      return { letter: 'C', cls: 'scm-badge-renamed', word: 'copied' };
    case 'U':
      return { letter: '!', cls: 'scm-badge-conflict', word: 'conflicted' };
    default:
      return { letter: 'M', cls: 'scm-badge-modified', word: 'modified' };
  }
}

/**
 * The commit box on a tab whose folder is on ANOTHER machine (Phase 104).
 *
 * WHY IT IS A SECOND BOX AND NOT `CommitBox` WIDENED. `useCommitController`
 * above hangs off `repoPath`, and `repoPath` is `localPathOf(target)`, which is
 * null for every tab whose folder is on another machine. Every one of that
 * controller's four reads is keyed by a path on THIS Mac. Widening it would
 * mean giving each of those reads a second key and a second store, in a
 * component the local panel depends on. Two boxes is what the split between
 * `useGit` and `useRemoteChanges` already looks like everywhere else.
 *
 * WHAT IT DRAWS, TOP TO BOTTOM.
 *
 *  1. The message, held per target in `useRemoteChanges` and NOT persisted.
 *  2. The button, which names the machine rather than saying "here".
 *  3. The reason it is disabled, when it is. The order of those reasons is in
 *     `remoteCommitDisabledReason` and it is not this file's decision.
 *  4. One standing line about hooks and signing, drawn BEFORE a person commits
 *     rather than after. It is the one visible answer to research 57's second
 *     hazard, which is that Tortie cannot answer a passphrase prompt on a
 *     computer nobody is looking at.
 *  5. Whatever main said about the last commit, drawn as main sent it.
 *  6. Whatever THAT MACHINE said, drawn under Tortie's own sentence. A hook
 *     that refuses says why in its own words and no sentence Tortie could
 *     compose would say it better.
 *  7. Check what happened, but only after an answer was lost. It runs one read
 *     of that folder and says whether HEAD moved.
 *
 * THE ⌘↩ CHORD WORKS INSIDE THE BOX AND NOWHERE ELSE ON THIS TAB. The local
 * panel binds it on its file list as well, through `useCommitController`, and
 * that controller does not exist here. Enter inside the box is a line break,
 * which is what makes a multi-line message typable, and no keystroke in this
 * box crosses to that machine.
 *
 * IT COMPOSES NO SENTENCE ABOUT WHAT HAPPENED OVER THERE. Every one of those is
 * composed in src/main/machines/remote-copy.ts and travels in
 * `MachineCommitResult.sentences`, because main decides several of those
 * answers without contacting that machine at all.
 */
function RemoteCommitBox({
  target,
  label,
  entry
}: {
  target: WorkspaceTarget;
  label: string;
  entry: RemoteChangesEntry;
}): React.JSX.Element {
  const key = targetKey(target);
  const message = useRemoteChanges((s) => s.messages[key] ?? '');
  const setMessage = useRemoteChanges((s) => s.setMessage);
  const commit = useRemoteChanges((s) => s.commit);
  const checkCommit = useRemoteChanges((s) => s.checkCommit);
  const machineStates = useApp((s) => s.machineStates);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-grow 1 to 5 lines, which is the local box's own rule and its own
  // numbers.
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    const line = 18; // --lh-sm; content-box grows in whole lines
    const max = line * 5 + 12; // + vertical padding
    ta.style.height = `${Math.min(ta.scrollHeight, max)}px`;
  }, [message]);

  const groups = useMemo(() => groupRemoteFiles(entry.files), [entry.files]);
  // A conflicted row is in the Changes group and carries no verb, so the count
  // above cannot see it. This read is over every tracked row for that reason.
  const conflicted = entry.files.some((file) => isConflict(file));
  const facts: RemoteCommitFacts = {
    committing: entry.committing,
    // PRESENTATIONAL AND NEVER THE SAFEGUARD. Main reads the confirmed folder
    // off the record on disk at call time and refuses there, with a sentence of
    // its own. This decides whether a button is pressable and nothing more.
    writesConfirmed:
      machineWriteRootFor(machineStates, target.machineId) !== null,
    connected: machineAnswering(machineStates, target.machineId),
    conflicted,
    staged: groups.staged.length,
    message
  };
  const disabledReason = remoteCommitDisabledReason(facts, label);
  const running = entry.committing;

  const doCommit = (): void => {
    if (disabledReason !== null) return;
    void commit(target);
  };

  /**
   * Whether the last answer left the question open.
   *
   * These are the two words that mean Tortie asked and does not know what
   * happened, and both of main's sentences for them end by asking for this
   * button. No other outcome offers it, because every other one is an answer.
   */
  const lost =
    entry.commitOutcome === 'timeout' || entry.commitOutcome === 'unsure';

  /** The first 7 characters, which is what the History group beside it shows. */
  const short = (sha: string): string => sha.slice(0, 7);

  /** What the check found, as a sentence, or null when no check has run. */
  const checkSaid = (): string | null => {
    switch (entry.checkOutcome) {
      case null:
        return null;
      case 'noAnswer':
        return remoteCommitCheckNoAnswer(label);
      case 'ran':
        return remoteCommitCheckRan(
          label,
          short(entry.checkHeadSha),
          short(entry.commitGuardSha)
        );
      case 'didNot':
        return remoteCommitCheckDidNot(label, short(entry.commitGuardSha));
    }
  };

  // Main composed a sentence for every answer it decided. A call that rejected
  // before main answered leaves none, and this is the only sentence this file
  // composes about a commit.
  const said: readonly string[] =
    entry.commitSentences.length > 0
      ? entry.commitSentences
      : entry.commitOutcome === null
        ? []
        : [remoteCommitCallFailed(label)];

  const found = checkSaid();

  return (
    <div className="scm-remote-commit" data-scm-remote-commit="1">
      <textarea
        ref={taRef}
        className="scm-commit-input"
        data-scm-remote-commit-input="1"
        placeholder={`Commit message (${keyDisplay('git.commit')} to commit)`}
        aria-label={`Commit message for the folder on ${label}`}
        value={message}
        rows={1}
        spellCheck={false}
        disabled={running}
        onChange={(e) => setMessage(target, e.target.value)}
        onKeyDown={(e) => {
          // ⌘↩ ONLY, which is what `git.commit` binds and what the local
          // panel's own handler tests. Ctrl+Enter is not that binding and is
          // not accepted here, so the two boxes answer the same keystroke.
          if (e.metaKey && e.key === 'Enter') {
            e.preventDefault();
            doCommit();
          }
        }}
      />
      <button
        type="button"
        className="btn btn-primary scm-commit-btn"
        data-scm-remote-commit-btn="1"
        disabled={disabledReason !== null}
        title={disabledReason ?? remoteCommitButton(label)}
        onClick={doCommit}
      >
        {running ? <span className="scm-spinner" aria-hidden="true" /> : null}
        {running ? 'Committing…' : remoteCommitButton(label)}
      </button>
      {disabledReason !== null && !running ? (
        <div className="scm-commit-caption" data-scm-remote-commit-why="1">
          {disabledReason}
        </div>
      ) : null}
      {/* Standing text, drawn whether or not anything has been pressed. It is
          the one visible answer to the signing hazard, so it is never hidden
          behind an outcome. */}
      <p className="scm-remote-commit-standing" data-scm-commit-standing="1">
        {remoteCommitStanding(label)}
      </p>
      {said.map((sentence) => (
        <p
          key={sentence}
          className="scm-remote-note"
          data-scm-commit-note="1"
        >
          {sentence}
        </p>
      ))}
      {entry.commitMachineSaid !== null ? (
        <pre className="scm-remote-commit-said" data-scm-commit-said="1">
          {entry.commitMachineSaid}
        </pre>
      ) : null}
      {lost ? (
        <button
          type="button"
          className="btn btn-secondary scm-remote-commit-check"
          data-scm-commit-check="1"
          disabled={entry.checking}
          title="Read that folder again and say whether the commit ran"
          onClick={() => void checkCommit(target)}
        >
          {entry.checking ? 'Checking…' : 'Check what happened'}
        </button>
      ) : null}
      {found !== null ? (
        <p className="scm-remote-note" data-scm-commit-check-note="1">
          {found}
        </p>
      ) : null}
    </div>
  );
}

/** The three groups a remote Changes section draws, in render order. */
type RemoteGroupId = 'staged' | 'changes' | 'untracked';

/**
 * The badge for one remote row, read from the SIDE its group is about
 * (Phase 103).
 *
 * WHY THE GROUP DECIDES THE SIDE. Git prints two characters per changed file.
 * The first says what the index holds and the second says what the folder on
 * disk holds. A file staged as a change and then deleted on disk is `MD`, so
 * the Staged row is a change and the Changes row is a deletion, and one letter
 * for both rows would be wrong on one of them. This is the same rule
 * `badgeFor` already applies to the local panel.
 *
 * The `status` letter is still the fallback. It is what main folds the pair
 * into, and it is what a row whose side reads `.` shows.
 */
function remoteGroupBadge(
  file: MachineReviewFile,
  group: RemoteGroupId
): { letter: string; cls: string; word: string } {
  if (group === 'untracked') {
    // The group decides this badge outright, which is the short circuit
    // `badgeFor` makes for the local untracked group. Main sends `A` for a
    // file git has never seen, because against the last commit it is an
    // addition, and this row never reads that letter.
    return { letter: 'U', cls: 'scm-badge-added', word: 'untracked' };
  }
  if (isConflict(file)) {
    return { letter: '!', cls: 'scm-badge-conflict', word: 'conflicted' };
  }
  const side: GitFileState =
    group === 'staged' ? file.indexState : file.worktreeState;
  switch (side) {
    case 'A':
      return { letter: 'A', cls: 'scm-badge-added', word: 'added' };
    case 'D':
      return { letter: 'D', cls: 'scm-badge-deleted', word: 'deleted' };
    case 'R':
      return { letter: 'R', cls: 'scm-badge-renamed', word: 'renamed' };
    case 'C':
      return { letter: 'C', cls: 'scm-badge-renamed', word: 'copied' };
    case 'M':
      return { letter: 'M', cls: 'scm-badge-modified', word: 'modified' };
    default:
      return remoteBadge(file.status);
  }
}

/**
 * Source Control for a tab whose folder is on another machine (Phase 90.3).
 *
 * FOUR GROUPS AND EXACTLY THREE VERBS THAT WRITE. The groups are Changes,
 * History, Branch and Runs, in that order, which is the order the local panel
 * already draws. It is the order a person learns once. The three verbs are
 * Stage and Unstage, which arrived in Phase 103, and Commit, which arrived in
 * Phase 104. There IS a commit box now, at the top of this column, and it is
 * `RemoteCommitBox` above. There is still no discard, no checkout, no branch,
 * no cherry pick, no amend, no reset and no push. That is not a subset chosen
 * for time. Discard is refused for good, and
 * `build/conformance-machines.mjs` condition 83 reads every command Tortie can
 * send and fails on one that could overwrite a working tree file over there.
 *
 * THE PARAGRAPH ABOVE WAS REWRITTEN FIVE TIMES and each rewrite was a phase.
 * It said "ONE GROUP" and named History, Branches and Runs as not rendered at
 * all. Phase 105 drew the runs, Phase 106 drew the branch and Phase 107 drew
 * the history, so every clause of the old sentence became false in turn. Its
 * last clause said this product writes on another machine in exactly two
 * places, neither of which is git, and Phase 103 made that false as well. The
 * Phase 103 wording said there is still no commit box, and Phase 104 made that
 * false in its turn.
 *
 * WHAT THE COMMIT DOES NOT DO, and it is worth reading beside the box. It never
 * stages anything first. The local box offers Stage all and commit, and on a
 * machine that would put two writes behind one button, where a lost answer
 * between them leaves a state neither write can explain. A person stages with
 * the two verbs above and then commits. The commit is also guarded by the sha
 * that machine's HEAD held when Tortie read it, so a second send of one request
 * finds HEAD moved and commits nothing.
 *
 * THE CHANGES SECTION HOLDS THREE GROUP ROWS SINCE PHASE 103, being Staged,
 * Changes and Untracked, in that order. They are group rows inside the one
 * collapsible section and not three collapsible sections, which is what
 * Phase 97 already did with two. Three sections would store three more collapse
 * answers and would throw away the one a person already has.
 *
 * A CONFLICTED ROW CARRIES NEITHER VERB. It keeps its badge and it opens, and
 * the sentence saying why is its tooltip. Staging a conflicted file is how a
 * person marks a conflict resolved, and doing that on a computer nobody is
 * watching, under a button labelled Stage, is not something this view offers.
 *
 * THE HEADER COUNT IS LOWER THAN THE NUMBER OF LINES WHEN A FILE IS IN TWO
 * GROUPS, and that is deliberate. `remoteChangesCount` counts the files that
 * changed, and a file edited twice is one changed file drawn on two lines. The
 * local panel's own section count does the same.
 *
 * CLICKING A CHANGED FILE opens the same read only view the session menu's
 * review already opens, through the one open file bus, so the editor needs no
 * new tab kind for it. CLICKING A COMMIT DOES NOTHING, because the files one
 * commit changed are not read for a folder on another machine. The History
 * group says so under itself.
 */
function RemoteScmSection({
  target
}: {
  target: WorkspaceTarget;
}): React.JSX.Element {
  const machineStates = useApp((s) => s.machineStates);
  const label = machineLabelFor(machineStates, target.machineId);
  const entry = useRemoteChanges((s) => remoteChangesOf(s.byTarget, target));
  const ensure = useRemoteChanges((s) => s.ensure);
  const refresh = useRemoteChanges((s) => s.refresh);
  const stage = useRemoteChanges((s) => s.stage);
  const unstage = useRemoteChanges((s) => s.unstage);
  const setMenu = useApp((s) => s.setMenu);
  const [collapsed, setCollapsed] = usePersistedBool(
    `gmux.scm.changesCollapsed.${targetKey(target)}`,
    false
  );

  useEffect(() => {
    if (remoteChangesAvailable()) ensure(target);
  }, [target, ensure]);

  /**
   * PHASE 90.3 FIX ROUND. One more read, the moment that machine starts
   * answering.
   *
   * THE BUG THIS CLOSES, with the numbers. On a cold boot with a remote tab
   * active this view asks before any machine has answered. Measured on
   * 2026-08-19: the read failed, main logged that no program search list is
   * recorded for that machine's current connection, this view drew the sentence
   * saying the machine did not answer, and that sentence was still on screen at
   * 11.5 s with the link long since connected. Switching tabs away and back
   * fixed it, so a person who never did that was shown a false statement for
   * the whole run.
   *
   * IT IS NOT A TIMER. The trigger is the link moving into answering, which
   * happens once per sign in. `retried` holds the target the retry was already
   * spent on and is cleared only when that machine stops answering, so one sign
   * in buys exactly one extra read. A read that fails again leaves the sentence
   * up until a person presses Refresh, which is the honest outcome.
   */
  const answering = machineAnswering(machineStates, target.machineId);
  const retried = useRef<string | null>(null);

  useEffect(() => {
    if (!answering) {
      retried.current = null;
      return;
    }
    if (!remoteChangesAvailable()) return;
    if (!entry.failed || entry.loading || entry.refreshing) return;
    const key = targetKey(target);
    if (retried.current === key) return;
    retried.current = key;
    void refresh(target);
  }, [
    target,
    answering,
    entry.failed,
    entry.loading,
    entry.refreshing,
    refresh
  ]);

  /**
   * PHASE 103. The tracked rows, split by which side of the pair moved.
   *
   * `entry.untracked` is a group of its own and is not passed through here,
   * because main sends it as its own array with its own count.
   */
  const groups = useMemo(() => groupRemoteFiles(entry.files), [entry.files]);
  /** True when this build carries the two verbs at all. */
  const canWrite = remoteIndexWriteAvailable();
  /** True while a stage or an unstage for this folder is in flight. */
  const busy = entry.writing;

  /**
   * One verb, over one set of rows.
   *
   * A conflicted row is dropped here as well as being drawn without a button,
   * so a group button reading `Stage 4 files` never carries a fifth row nobody
   * could press on its own. Only the path is sent. When a row is a rename, main
   * adds the pre-rename path from its own read, because it is main's read that
   * decides which paths are real.
   */
  const runVerb = (
    verb: RemoteIndexVerb,
    rows: readonly MachineReviewFile[]
  ): void => {
    const paths = rows.filter((f) => !isConflict(f)).map((f) => f.path);
    if (paths.length === 0) return;
    void (verb === 'stage' ? stage(target, paths) : unstage(target, paths));
  };

  /**
   * The sentence the last write left, or null when it left none.
   *
   * `done` and `nothingToDo` draw nothing. The rows under this sentence were
   * re-read from that machine after the write, so on a good write the rows are
   * the answer and a sentence saying the same thing would be one too many.
   */
  const writeNote = (): string | null => {
    const outcome: MachineIndexWriteOutcome | null = entry.writeOutcome;
    const verb = entry.writeVerb;
    // PHASE 103 FIX ROUND. Main's own refusal wins over any word, because main
    // decided that sentence about this exact call and nothing was sent. The
    // three it can be are in src/main/machines/remote-copy.ts.
    if (entry.writeRefusal !== null) return entry.writeRefusal;
    if (outcome === null || verb === null) return null;
    switch (outcome) {
      case 'done':
      case 'nothingToDo':
        return null;
      case 'writesOff':
        return remoteWritesNotConfirmed(label);
      case 'outsideRoot':
        return remoteStageOutsideRoot(label);
      case 'notRepo':
        return remoteChangesNotRepo(label);
      case 'partial':
        return remoteIndexWritePartial(label, verb);
      case 'unsure':
        return remoteIndexWriteUnsure(label, verb);
    }
  };

  const open = (file: MachineReviewFile): void => {
    if (entry.repoPath.length === 0) return;
    requestOpenFile({
      repoPath: entry.repoPath,
      relPath: file.path,
      path: `${entry.repoPath}/${file.path}`,
      ...(file.origPath !== null ? { origPath: file.origPath } : {}),
      mode: 'diff',
      source: 'machine',
      // Opened for keeps. A person reading three files wants three tabs, and a
      // preview tab would replace each one with the next.
      preview: false,
      remote: {
        machineId: target.machineId,
        machineLabel: label,
        repoPath: entry.repoPath,
        ...(file.origPath !== null ? { origPath: file.origPath } : {})
      }
    });
  };

  /** The sentence the last write left, worked out once per render. */
  const said = writeNote();

  const body = (): React.JSX.Element => {
    if (!remoteChangesAvailable()) {
      return (
        <div className="section-stub">
          Reading what changed on another machine is not available in this
          build.
        </div>
      );
    }
    if (entry.failed) {
      return (
        <div className="section-stub">{remoteChangesUnreachable(label)}</div>
      );
    }
    if (entry.loading || entry.readAt === 0) {
      // The skeleton covers both the read in flight and the frames before it
      // starts. A sentence here would be a claim about a folder nothing has
      // asked about yet.
      return (
        <div className="scm-skeleton" aria-label="Reading what changed">
          <div className="scm-skeleton-row" style={{ width: '64%' }} />
          <div className="scm-skeleton-row" style={{ width: '78%' }} />
          <div className="scm-skeleton-row" style={{ width: '52%' }} />
        </div>
      );
    }
    if (entry.notRepo) {
      return <div className="section-stub">{remoteChangesNotRepo(label)}</div>;
    }
    if (remoteChangesCount(entry) === 0) {
      return <div className="section-stub">{remoteChangesNone(label)}</div>;
    }
    /** One group row, with the button that applies its verb to the whole group. */
    const groupRow = (
      group: RemoteGroupId,
      rows: readonly MachineReviewFile[]
    ): React.JSX.Element => {
      const verb: RemoteIndexVerb = group === 'staged' ? 'unstage' : 'stage';
      const word = verb === 'stage' ? 'Stage' : 'Unstage';
      // A conflicted row is not counted here, so `Stage 4 files` never
      // includes one. A group whose rows are all conflicted draws no button.
      const reach = rows.filter((f) => !isConflict(f));
      return (
        <div className="scm-group-row" data-scm-group={group}>
          <span className="scm-group-label">{GROUP_LABEL[group]}</span>
          <span className="scm-group-count num">{rows.length}</span>
          <span className="scm-row-space" />
          {canWrite && reach.length > 0 ? (
            <button
              type="button"
              className="icon-btn scm-action scm-group-action"
              data-scm-group-verb={verb}
              aria-label={verbLabel(word, reach.length)}
              title={verbLabel(word, reach.length)}
              disabled={busy}
              onClick={() => runVerb(verb, reach)}
            >
              <Codicon name={verb === 'stage' ? 'add' : 'remove'} size={14} />
            </button>
          ) : null}
        </div>
      );
    };

    /** One file row, in the group that decides its badge and its verb. */
    const fileRow = (
      file: MachineReviewFile,
      group: RemoteGroupId
    ): React.JSX.Element => {
      const badge = remoteGroupBadge(file, group);
      const { dir, base } = splitPath(file.path);
      const conflicted = group !== 'untracked' && isConflict(file);
      const verb: RemoteIndexVerb | null = conflicted
        ? null
        : group === 'staged'
          ? 'unstage'
          : 'stage';
      const word = verb === 'stage' ? 'Stage' : 'Unstage';
      const title = conflicted
        ? remoteConflictNoVerb(label)
        : file.origPath !== null
          ? `${file.path}, renamed from ${file.origPath}`
          : file.path;
      // The native menu, through the same bridge every other menu in this
      // product uses. Never a menu drawn in the document.
      //
      // OPEN IN NEW TAB IS NOT ON IT, and this is the one place this view
      // departs from the local menu above. `open` below passes `preview:
      // false`, so every remote open is already a kept tab and the item would
      // repeat the one above it.
      const onContextMenu = (e: React.MouseEvent): void => {
        e.preventDefault();
        e.stopPropagation();
        const items: (MenuItemSpec | 'sep')[] = [
          {
            label:
              group === 'untracked' || conflicted ? 'Open file' : 'Open diff',
            run: () => open(file)
          }
        ];
        if (verb !== null && canWrite) {
          items.push('sep');
          items.push({
            label: word,
            disabled: busy,
            run: () => runVerb(verb, [file])
          });
        }
        setMenu({ x: e.clientX, y: e.clientY, items });
      };
      return (
        <div
          key={`${group[0] ?? ''}:${file.path}`}
          role="listitem"
          className="scm-hfile"
          data-scm-group={group}
          aria-label={`${base}, ${badge.word}${dir !== '' ? `, in ${dir}` : ''}`}
          title={title}
          onClick={() => open(file)}
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
          {verb !== null && canWrite ? (
            <span className="scm-row-actions">
              <button
                type="button"
                className="icon-btn scm-action"
                data-scm-row-verb={verb}
                aria-label={`${word} ${base}`}
                title={word}
                disabled={busy}
                onClick={(e) => {
                  e.stopPropagation();
                  runVerb(verb, [file]);
                }}
              >
                <Codicon
                  name={verb === 'stage' ? 'add' : 'remove'}
                  size={14}
                />
              </button>
            </span>
          ) : null}
        </div>
      );
    };

    return (
      <div className="scm-list" role="list" aria-label="Changed files">
        {/* PHASE 103. THREE group rows in ONE section, being Staged, Changes
            and Untracked, which is the local panel's own order minus Merge.
            Phase 97 drew two of them and neither carried a button, because
            this surface had no verb that writes. Both of those facts changed
            in Phase 103. The section is still one collapsible section, so no
            second collapse answer is stored and a person's existing one keeps
            working.

            A FILE CAN BE ON TWO OF THESE LINES AT ONCE, being one edit staged
            and a second edit not. That is what the local panel draws for the
            same file, and it is why each row's key carries its group. */}
        {groups.staged.length > 0 ? groupRow('staged', groups.staged) : null}
        {groups.staged.map((file) => fileRow(file, 'staged'))}
        {groups.changes.length > 0 ? groupRow('changes', groups.changes) : null}
        {groups.changes.map((file) => fileRow(file, 'changes'))}
        {entry.untracked.length > 0
          ? groupRow('untracked', entry.untracked)
          : null}
        {entry.untracked.map((file) => fileRow(file, 'untracked'))}
      </div>
    );
  };

  return (
    /* PHASE 107 FIX ROUND. `remote` is what makes this column scroll, and the
       local one still does not. The rule and the measurements are at
       `.scm-sections.remote` in ./scm.css. In short, this column draws sentences
       between its groups, those sentences belong to no scrolling body, and at
       1440 by 885 they are 480 px of a 748 px column. Before this class the
       column met the shortfall by shrinking its groups, and the Runs group and
       the closing sentence ended up under a box with `overflow: hidden` where no
       gesture could reach them. */
    <div className="scm-sections remote">
      {/* The band. It is drawn above the group rather than inside it, so it
          stays on screen when the group is collapsed. */}
      <p className="scm-remote-band">{remoteChangesBand(label)}</p>
      {/* PHASE 104. The commit box, drawn ABOVE the Changes group and outside
          it, which is where the band is and for the same reason: it stays on
          screen when the group is collapsed. The local panel puts its own box
          INSIDE the section body, because that body is the local column's only
          scrolling child. This column scrolls as a whole, so a box inside the
          body would scroll away from the rows it is about.

          IT IS DRAWN ONLY WHEN THERE IS SOMETHING TO COMMIT INTO. A build with
          no commit member, a folder that is not a repository, a read that has
          not happened yet and a read that failed each draw no box, because a
          box in any of those states would offer a press that cannot land. */}
      {remoteCommitAvailable() &&
      remoteChangesAvailable() &&
      !entry.failed &&
      !entry.notRepo &&
      entry.readAt > 0 ? (
        <RemoteCommitBox target={target} label={label} entry={entry} />
      ) : null}
      <section
        className={`section-scm${collapsed ? ' collapsed' : ''}`}
        data-section-root="changes"
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
            {/* PHASE 97. Both groups, because the header counts what is in
                the section and the section now holds two groups. The fix round
                moved the sum into `remoteChangesCount`, so this header and the
                activity rail's badge cannot state two different numbers for
                one folder. They did for one round, and it was on screen. */}
            <span className="section-count num">
              {remoteChangesCount(entry) > 0 ? remoteChangesCount(entry) : ''}
            </span>
          </button>
          <span className="section-spacer" />
          {/* PHASE 90.3 FIX ROUND. The one affordance that re-reads that
              machine, and until now this view had none at all. The store's own
              header said a read happens when the tab is opened and when a
              person presses Refresh, and there was no Refresh to press: the
              only way back from a failed read was to switch tabs away and
              back. It is disabled on a build with no machines bridge, for the
              same reason the Explorer's is. */}
          <button
            type="button"
            className="icon-btn scm-action"
            aria-label="Refresh changes"
            title="Refresh changes"
            disabled={!remoteChangesAvailable() || entry.loading || entry.refreshing}
            onClick={() => void refresh(target)}
          >
            <Codicon name="refresh" size={14} />
          </button>
        </div>
        {!collapsed ? (
          <div className="section-body scm-body">{body()}</div>
        ) : null}
      </section>
      {/* PHASE 103. What the last stage or unstage left, drawn UNDER the rows
          rather than instead of them. The rows below a failed write were read
          from that machine after the failure, so they are what really changed
          there and the sentence points at them. A write that landed draws
          nothing here, because the rows are the answer. */}
      {said !== null ? (
        <p className="scm-remote-note" data-scm-write-note="1">
          {said}
        </p>
      ) : null}
      {/* Main's own sentence under a capped list, drawn under the rows rather
          than instead of them. */}
      {entry.note !== null ? (
        <p className="scm-remote-note">{entry.note}</p>
      ) : null}
      {entry.readAt > 0 ? (
        <p className="scm-remote-note">{remoteReadAt(entry.readAt)}</p>
      ) : null}
      {/* PHASE 107. The second group this view draws for a folder on another
          machine, and its place is the place the local panel already gives
          History, being under Changes and above Branch. One order rather than
          two. It ships collapsed and reads nothing until somebody expands it,
          which matters most here because this is the largest read the product
          makes over a link. It owns its own band, its own Refresh button, its
          own paging control and its own store, and it has no verb that
          writes. */}
      <RemoteHistorySection target={target} label={label} />
      {/* PHASE 106. The third group this view draws for a folder on another
          machine, and it is ABOVE Runs on purpose. The runs below are the runs
          for the branch this group names, so a person reads which branch it is
          first. It ships collapsed and reads nothing until somebody expands it,
          so a tab that is only being looked at asks that machine nothing. It
          owns its own band, its own Refresh button and its own store, and it
          has no verb that writes. */}
      <RemoteBranchSection target={target} label={label} />
      {/* PHASE 105. The fourth group this view draws for a folder on another
          machine. It ships collapsed and reads nothing until somebody expands
          it, so a tab that is only being looked at asks that machine nothing
          and starts no gh process on this Mac. It owns its own band, its own
          Refresh button and its own store. PHASE 106 MOVED IT DOWN ONE PLACE
          and changed nothing else about it. */}
      <RemoteRunsSection target={target} label={label} />
      {/* Said once, under the four groups. PHASE 107 turned this from a
          refusal into a note. It named three sections that were not drawn, and
          all three are drawn now. What it still refuses is one read rather than
          a section, being the files one commit changed. */}
      <p className="scm-remote-note">{REMOTE_SCM_SECTIONS_NOTE}</p>
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
  // PHASE 90.3. The conversion site. `repoPath` is the path THIS MAC may act
  // on, so it is null for a tab whose folder is on another machine, and every
  // verb in this component hangs off it. A machine tab is answered by
  // `RemoteScmSection` below instead, which has no verb that writes.
  const target = useMemo(() => targetOfProject(project), [project]);
  const repoPath = localPathOf(target);
  const repo = repoState(repos, repoPath);
  const status = repo.status;

  // Keyed by the PAIR since Phase 90.3, so a local tab and a machine tab at
  // one path remember their own collapse. The `gmux.scm.changesCollapsed.`
  // prefix is unchanged and a local target's key is its bare path, so every
  // stored answer a person already has keeps working byte for byte.
  const [collapsed, setCollapsed] = usePersistedBool(
    `gmux.scm.changesCollapsed.${target === null ? '' : targetKey(target)}`,
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

  const rows = useMemo<ScmRow[]>(() => flattenRows(groups), [groups]);

  // Hook order: controller must run even when no project is open.
  const commitCtrl = useCommitController(repoPath ?? '', groups);

  // Multi-select over the flattened row list (listbox pattern, like the
  // sessions list). ./selection.ts owns every rule; this is only the state.
  const [selection, setSelection] = useState<ScmSelection>(NO_SELECTION);
  const listRef = useRef<HTMLDivElement | null>(null);

  // A `git:changed` refresh rebuilds `rows`: keep what still exists, drop
  // what does not. Staging four files must not leave four ghosts selected.
  useEffect(() => {
    setSelection((s) => pruneToRows(s, rows));
  }, [rows]);

  const selectedSet = useMemo(
    () => new Set(selection.keys),
    [selection.keys]
  );
  const selected = useMemo(
    () => selectedRows(selection, rows),
    [selection, rows]
  );
  const selectionVerbs = useMemo(() => verbsFor(selected), [selected]);

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
    (row: ScmRow, keep = false): void => {
      if (repoPath === null) return;
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

  /** Click / right-click on a row → the selection model decides the outcome. */
  const onSelect = useCallback(
    (row: ScmRow, e: React.MouseEvent): void => {
      setSelection((s) =>
        // A right-click inside an existing selection keeps it (so the menu can
        // act on all of it); anywhere else it collapses to the clicked row.
        e.type === 'contextmenu' && s.keys.includes(row.key)
          ? s
          : selectRow(s, rows, row.key, selectModeFor(e))
      );
    },
    [rows]
  );

  const scrollCursorIntoView = (key: string | null): void => {
    if (key === null) return;
    listRef.current
      ?.querySelector(`[data-key="${CSS.escape(key)}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  };

  const onListKeyDown = (e: React.KeyboardEvent): void => {
    if (rows.length === 0 || repoPath === null) return;
    // What a keystroke acts on: the selection when the cursor sits inside it,
    // otherwise the cursor row alone — the same rule the mouse follows.
    const cursorRow = rows.find((r) => r.key === selection.cursor) ?? rows[0];
    const acting =
      cursorRow === undefined ? [] : targetRows(selection, rows, cursorRow);

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = moveCursor(
        selection,
        rows,
        e.key === 'ArrowDown' ? 1 : -1,
        e.shiftKey
      );
      setSelection(next);
      scrollCursorIntoView(next.cursor);
    } else if (e.key === 'a' && (e.metaKey || e.ctrlKey)) {
      // ⌘A takes the cursor's GROUP, not the list: Staged and Changes take
      // opposite verbs, and one selection spanning both offers neither well.
      e.preventDefault();
      setSelection((s) => selectWholeGroup(s, rows));
    } else if (e.key === 'Enter' && !e.metaKey) {
      e.preventDefault();
      if (cursorRow !== undefined) activate(cursorRow);
    } else if (e.key === ' ' || e.key === 's' || e.key === 'S') {
      // Phase 8 keyboard staging, now selection-wide: staged rows unstage,
      // everything else (incl. conflicts) stages. SEQUENTIAL — a selection
      // holding both halves of an `XY = MM` file would otherwise fire two
      // contradictory git calls at once and land on whichever won the race.
      e.preventDefault();
      const verbs = verbsFor(acting);
      void (async () => {
        if (verbs.unstage.length > 0) {
          await unstage(repoPath, pathsOf(verbs.unstage));
        }
        if (verbs.stage.length > 0) await stage(repoPath, pathsOf(verbs.stage));
      })();
    } else if (e.key === 'Backspace') {
      // Discard the selection, behind the SAME confirm the ↩ action uses.
      e.preventDefault();
      const verbs = verbsFor(acting);
      confirmDiscardRows(setConfirm, discard, repoPath, verbs.discard);
    }
  };

  if (project !== null && target !== null && repoPath === null) {
    return <RemoteScmSection target={target} />;
  }
  if (!project || repoPath === null) return null;

  const pendingForRepo = pending[repoPath] ?? {};
  const total = status?.isRepo === true ? status.files.length : 0;

  const groupHeaderAction = (g: ScmGroupId): React.ReactNode => {
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
            aria-multiselectable="true"
            {...(selection.cursor !== null
              ? { 'aria-activedescendant': `scm-row-${selection.cursor}` }
              : {})}
            tabIndex={0}
            onKeyDown={onListKeyDown}
          >
            {SCM_GROUP_ORDER.map((g) =>
              groups[g].length === 0 ? null : (
                <React.Fragment key={g}>
                  <div className="scm-group-row">
                    <span className="scm-group-label">{GROUP_LABEL[g]}</span>
                    <span className="scm-group-count num">
                      {groups[g].length}
                    </span>
                    <span className="scm-row-space" />
                    {groupHeaderAction(g)}
                  </div>
                  {groups[g].map((f) => {
                    const row: ScmRow = {
                      group: g,
                      file: f,
                      key: scmRowKey(g, f.path)
                    };
                    const inSelection = selectedSet.has(row.key);
                    // A row outside the selection acts on itself alone.
                    const multi = inSelection && selected.length > 1;
                    const solo = [row];
                    return (
                      <ScmFileRow
                        key={row.key}
                        row={row}
                        repoPath={repoPath}
                        selected={inSelection}
                        cursor={selection.cursor === row.key}
                        targets={multi ? selected : solo}
                        verbs={multi ? selectionVerbs : verbsFor(solo)}
                        pendingOp={pendingForRepo[f.path]}
                        onSelect={onSelect}
                        onActivate={activate}
                      />
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
    ) : null,
    // Renders null unless the origin is on github.com, so a repository with
    // no GitHub remote has three sections and no empty fourth one.
    runs: isRepo ? (
      <RunsSection key={`runs-${repoPath}`} repoPath={repoPath} />
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

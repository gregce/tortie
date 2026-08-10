/**
 * THE renderer-internal open-file/open-diff event bus — Phase 4 integration.
 *
 * The SCM stream and the tree stream each shipped their own copy of this
 * contract on the same window CustomEvent name with DIFFERENT payload
 * shapes. This module is the single canonical bus; both stream modules
 * (src/renderer/scm/open-file.ts, src/renderer/tree/open-file.ts) now
 * re-export it, so every emitter and every subscriber sees one shape.
 *
 * PHASE 5 (editor): subscribe with `onOpenFile(cb)` in the editor host's
 * mount effect. Nothing breaks while no editor is mounted — open requests
 * are simply dropped (row clicks have no other side effects).
 *
 * PHASE 12 grew the request twice, both optional so every existing emitter
 * still compiles: `preview` (item 5, tab semantics) and `commit` (item 4,
 * the commit identity a historical diff needs). A request WITHOUT `commit`
 * means exactly what it always meant — the working tree.
 */

import type { GitCommitFileState } from '@shared/types';

export const OPEN_FILE_EVENT = 'gmux:open-file';

/**
 * Commit identity for a request that came from HISTORY (Phase 12 item 4).
 *
 * Without this the SHA died at the bus boundary and every historical file
 * rendered HEAD-vs-worktree. Its presence means: this tab is IMMUTABLE
 * history — diff `<sha>^ → <sha>` via `git:commitFileDiff`, never the
 * worktree; never save it; never let a `git:changed` refresh rewrite it.
 */
export interface OpenFileCommitRef {
  /** Full commit SHA (the diff's RIGHT side). */
  sha: string;
  /** Abbreviated SHA for tab titles and the diff header. */
  shortSha: string;
  /** name-status letter for this file in that commit (A/M/D/R/…). */
  status: GitCommitFileState;
  /** Pre-rename path (R/C only) — the LEFT side's path. */
  origPath?: string;
  /** Commit subject, for the tab tooltip ("auth.ts — a1b2c3d"). */
  subject?: string;
}

export interface OpenFileRequest {
  /** Absolute project/repo root (GitStatusResult.repoPath). */
  repoPath: string;
  /** Path relative to repoPath (GitFileStatus.path). */
  relPath: string;
  /** Absolute path of the file (`repoPath + '/' + relPath`). */
  path: string;
  /**
   * Pre-rename path for a RENAMED worktree/index entry (GitFileStatus
   * .origPath), repo-root relative. The diff's LEFT side lives there — ask
   * HEAD for `relPath` after a rename and it has no blob, so the file renders
   * as one big addition (Phase 11 carried finding (a)).
   *
   * History opens carry the same information in `commit.origPath` instead,
   * because for those the pairing comes from the commit's name-status.
   */
  origPath?: string;
  /**
   * 'diff' → open Monaco diff-vs-HEAD (P4 default gesture for files with
   *          tracked changes)
   * 'file' → open the file plain (untracked / ignored / clean / conflicts /
   *          non-git folders)
   */
  mode: 'diff' | 'file';
  /**
   * Where the gesture came from — lets the editor refine the diff base
   * later (e.g. staged rows diff index-vs-HEAD). Safe to ignore in v1.
   */
  source: 'worktree' | 'index' | 'untracked' | 'merge' | 'history' | 'tree';
  /**
   * VS Code preview-tab semantics (Phase 12 item 5). Omitted/`true` = a
   * PREVIEW open: italic tab, reused by the next preview open until the
   * file is edited. `false` = open it for keeps (a row's double-click or
   * ↩ activation), so tabs accumulate.
   *
   * Emitters that never learned about this field keep their v1 behavior —
   * every open is a preview open. The editor additionally promotes a tab
   * when the SAME file is re-opened inside the double-click window, so a
   * double-click pins even from an emitter that only fires plain clicks.
   */
  preview?: boolean;
  /**
   * Present ONLY for HISTORY opens (Phase 12 item 4). The editor must then
   * load the pair from `git:commitFileDiff` — LEFT `<sha>^:<origPath ?? path>`
   * (absent for adds and root commits), RIGHT `<sha>:<path>` (absent for
   * deletes) — and treat the tab as read-only history: identity keyed
   * `${sha}:${relPath}` so the same path from two commits is two tabs and
   * neither collides with the worktree tab for that path.
   *
   * `path`/`relPath` still carry the file's path as of that commit, so
   * filename, icon and language detection need no special case.
   */
  commit?: OpenFileCommitRef;
}

/** Emit an open request (fire-and-forget). */
export function requestOpenFile(req: OpenFileRequest): void {
  window.dispatchEvent(
    new CustomEvent<OpenFileRequest>(OPEN_FILE_EVENT, { detail: req })
  );
}

/** Subscribe (editor stream). Returns the unsubscribe function. */
export function onOpenFile(cb: (req: OpenFileRequest) => void): () => void {
  const listener = (e: Event): void => {
    cb((e as CustomEvent<OpenFileRequest>).detail);
  };
  window.addEventListener(OPEN_FILE_EVENT, listener);
  return () => window.removeEventListener(OPEN_FILE_EVENT, listener);
}

/** Alias kept for the tree stream's public surface. */
export const onOpenFileRequest = onOpenFile;

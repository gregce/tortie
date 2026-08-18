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
 *
 * PHASE 14 grew it once more, the same way: `selection` (research 19 §2.6).
 * Until now a request could say WHICH file to open but not WHERE in it, so a
 * search hit, a symbol pick or a `foo.ts:412` could open the file and then
 * strand the user at line 1. `source` gained the three gestures that carry
 * one. Both changes are additive: every existing emitter still compiles, and
 * a request without `selection` behaves exactly as it did before.
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

/**
 * The machine identity a REMOTE REVIEW open carries (Phase 73, M6, item 4).
 *
 * Its presence means: this tab shows a file that lives on another computer.
 * Both sides come from main, exactly as a commit tab's do, and no working tree
 * on this Mac is ever read for it. Non-null implies read-only in every surface,
 * for the same reason `commit` does, plus one more: a save could not reach the
 * file even if it were attempted, because the file is not here.
 *
 * It is a separate field rather than a flavour of `commit` because the two
 * answer different questions. A commit tab shows one file as it was at one
 * commit in THIS repository. A review tab shows the working copy and the HEAD
 * copy of one file in a repository on a machine, which is the pair a person
 * reads when they want to know what an agent has done over there.
 */
export interface OpenFileRemoteRef {
  /** The machine the file lives on. */
  machineId: string;
  /** That machine's own label, for the tab tooltip. Never composed here. */
  machineLabel: string;
  /** The repository root ON THAT MACHINE. Never a path on this Mac. */
  repoPath: string;
  /** The pre-rename path, or null. A rename is read at both paths. */
  origPath?: string;
}

/**
 * WHERE in the file to land (Phase 14). A request carrying one is a
 * NAVIGATION, not merely an open: the editor reveals the range, SELECTS it,
 * and flashes it once. Scrolling near the line is not enough — a 240-hit
 * search means the user is scanning, and "which of these six `foo` on screen
 * did I click" has to be answerable without reading.
 *
 * COORDINATES, stated once so no emitter has to guess:
 *  - `line` / `endLine` are **1-based** — ripgrep's `line_number`, Monaco's
 *    `lineNumber` and every "file.ts:412" the user types already agree.
 *  - `column` / `endColumn` are **0-based UTF-16 offsets** into that line —
 *    what `String.prototype.indexOf`, a JS regex `match.index` and a decoded
 *    ripgrep submatch all hand you. The editor adds the +1 Monaco's Range
 *    wants in exactly ONE place, so no emitter should pre-adjust.
 *  - `endColumn` is EXCLUSIVE: a 3-char match at offset 10 is
 *    `column: 10, endColumn: 13`.
 *
 * Emitting `{ line }` alone is legal and means "line 412, whole-line-ish" —
 * the caret lands at column 0 with an empty selection.
 */
export interface OpenFileSelection {
  /** 1-based line to reveal. */
  line: number;
  /** 0-based UTF-16 start column. Omitted = start of line. */
  column?: number;
  /** 1-based last line of a multi-line range. Omitted = `line`. */
  endLine?: number;
  /** 0-based UTF-16 end column, EXCLUSIVE. Omitted = `column`. */
  endColumn?: number;
  /** Flash the range once on arrival. Omitted = true. */
  highlight?: boolean;
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
   *
   * Phase 14 added the three search gestures. `'search'` is the one the
   * editor acts on: a PREVIEW open from the results list must not steal
   * keyboard focus, because ↑↓ have to keep walking the list while the
   * editor previews each hit behind it.
   */
  source:
    | 'worktree'
    | 'index'
    | 'untracked'
    | 'merge'
    | 'history'
    | 'tree'
    | 'search'
    | 'symbol'
    | 'quickopen'
    /**
     * Phase 73. A review of a file on another machine, from the session menu.
     * Only `'search'` changes what the editor does with a request, so this
     * value is a record of where the gesture came from and nothing more.
     */
    | 'machine';
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
  /**
   * Land HERE (Phase 14). Present ⇒ the editor treats this as a navigation
   * and three things follow, all of them implemented in
   * src/renderer/editor/store.ts + MonacoHost.tsx so no emitter has to:
   *
   *  1. **It opens as `mode: 'file'`, whatever `mode` says.** Diff
   *     (@pierre/diffs), rendered markdown and the image viewer are all
   *     line-less surfaces — there is nowhere to put line 412 on any of them.
   *     `canDiff` is left alone, so the mode chip still offers the diff.
   *     (The one exception is a raster image: it has no text under it at all,
   *     so it keeps the image viewer and ignores the selection.)
   *  2. **Re-opening an ALREADY-OPEN tab still lands.** The second hit in a
   *     file the first hit opened moves the caret; it does not just re-raise
   *     a tab that is already on screen.
   *  3. **The range is revealed AND selected AND flashed**, not scrolled near.
   */
  selection?: OpenFileSelection;
  /**
   * Present ONLY for a CONTEXT DETAIL open (Phase 22, research 29 §7.1). The
   * row that was clicked in the Context view, carried whole.
   *
   * The tab is an ordinary file tab and this field is the only difference: the
   * editor keys it `context:<entry id>` so it never collides with the same file
   * opened from the tree, and it draws the detail header card above whatever
   * body that file would normally get. That is why this is a field on an open
   * request rather than a new tab kind. The body under the card is the file's
   * own content, which for a skill is a `SKILL.md` the markdown preview already
   * renders, so a second renderer would be a second answer to a question the
   * editor has answered since Phase 5.
   *
   * Typed as `unknown` here on purpose. This module is the renderer's open bus
   * and it is imported by the tree, SCM, search, symbols and quick open, none of
   * which know what a context entry is. The editor narrows it once, where it
   * draws the card.
   */
  contextEntry?: unknown;
  /**
   * Present ONLY for a REMOTE REVIEW open (Phase 73, M6, item 4). The editor
   * must then fill both sides from `machines:reviewFile` and treat the tab as
   * read-only: no save, no watcher refresh, and no read of any working tree on
   * this Mac. Identity is keyed by the machine as well as the path, so the same
   * path on two machines is two tabs and neither collides with a file of that
   * path here.
   *
   * `path` and `relPath` carry the file's path INSIDE the repository on that
   * machine, so the tab's name, its icon and its language detection need no
   * special case.
   */
  remote?: OpenFileRemoteRef;
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

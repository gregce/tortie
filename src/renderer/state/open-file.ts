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
 */

export const OPEN_FILE_EVENT = 'gmux:open-file';

export interface OpenFileRequest {
  /** Absolute project/repo root (GitStatusResult.repoPath). */
  repoPath: string;
  /** Path relative to repoPath (GitFileStatus.path). */
  relPath: string;
  /** Absolute path of the file (`repoPath + '/' + relPath`). */
  path: string;
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

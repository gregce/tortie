/**
 * Tab IO — everything that moves bytes between a tab and the outside world:
 * loading its side(s), saving it, and re-reading it when the git watcher says
 * the repo changed.
 *
 * Separated from src/renderer/editor/store.ts during Phase 12 integration.
 * The store is a state machine over a list of tabs (open, activate, close,
 * cycle, pin); this is the IO that state machine schedules. They had grown
 * into one 770-line file with five section banners, which is the split
 * signal in CLAUDE.md's growth guardrails.
 *
 * The three kinds of tab (DESIGN-SPEC S5C, the third added by Phase 73) differ
 * ONLY here:
 *   worktree — loadContents + loadHead, refreshed by `refreshRepo`
 *   history  — loadCommitDiff fills both sides once and nothing else runs
 *   review   — loadRemoteDiff fills both sides once, from another computer
 * Which is why `save` and `refreshRepo` both refuse a history tab and a review
 * tab: it is cheaper to state that twice, right where the write would happen,
 * than to rely on every caller remembering.
 */

import type {
  GmuxFsExtras,
  GmuxGitSyncExtras,
  GmuxImageExtras,
  // Phase 73. The read only review of a folder on another machine.
  GmuxMachinesExtras
} from '@shared/ipc';
import { errorText, useApp } from '../state/store';
import type {
  OpenFileCommitRef,
  OpenFileRemoteRef
} from '../state/open-file';
import { getWorkingModel, resetWorkingModel } from './monaco-loader';
import { dirOf } from './paths';
import { fileInRepo } from './tab-identity';
import type { EditorTab } from './tab-types';

/**
 * One plain sentence for a person, never a JSON body and never a stack
 * (Phase 26 item 1).
 *
 * `errorText` unwraps main's structured GmuxError payload, and that message
 * is already a sentence. But a rejection can arrive UNCLASSIFIED — Electron
 * wraps a thrown handler error as "Error occurred in handler for
 * 'git:showHead': …{json}…" — and when the unwrap fails, the raw wrapper used
 * to reach the operator's screen whole. Every error this module shows goes
 * through here: keep a clean first line, and fall back to the caller's own
 * sentence for anything that still looks like machinery.
 */
export function errorSentence(err: unknown, fallback: string): string {
  const first = errorText(err).split('\n', 1)[0]?.trim() ?? '';
  const machinery =
    first.length === 0 ||
    first.length > 160 ||
    first.includes('{') ||
    first.includes('Error invoking remote method') ||
    first.includes('Error occurred in handler');
  if (machinery) return fallback;
  return /[.!?]$/.test(first) ? first : `${first}.`;
}

/**
 * A file whose two sides hold bytes no text diff can show.
 *
 * PHASE 73 FIX ROUND. It was written out twice, once for a commit tab and once
 * for a review tab on another machine, and the two copies carried an em dash
 * against the writing rules. One function, one sentence, no dash.
 */
export function binaryFileNote(name: string): string {
  return `${name} is a binary file. There is no text diff to show.`;
}

/** What the store lends the IO layer: read a tab, write a tab. */
export interface TabIoDeps {
  patch(id: string, patch: Partial<EditorTab>): void;
  byId(id: string): EditorTab | undefined;
  /** Open WORKTREE tabs in this repo — history tabs are never refreshed. */
  worktreeTabsIn(repoPath: string): EditorTab[];
}

export interface TabIo {
  loadContents(id: string, path: string): Promise<void>;
  loadHead(id: string): Promise<void>;
  loadCommitDiff(id: string, commit: OpenFileCommitRef): Promise<void>;
  /**
   * Both sides of one file on another machine (Phase 73). No working tree on
   * this Mac is read, and nothing is written on either computer.
   */
  loadRemoteDiff(id: string, remote: OpenFileRemoteRef): Promise<void>;
  /** The working copy of an image (Phase 12.10) — never the text reader. */
  loadImage(id: string, path: string): Promise<void>;
  /** The same image at HEAD — the BEFORE side of the comparison. */
  loadImageHead(id: string): Promise<void>;
  /** Write one tab to disk. Resolves false when nothing was written. */
  save(id: string): Promise<boolean>;
  refreshRepo(repoPath: string): Promise<void>;
}

export function createTabIo(deps: TabIoDeps): TabIo {
  const gmux = window.gmux as typeof window.gmux | undefined;
  const fsExtras = gmux ? (gmux.fs as typeof gmux.fs & GmuxFsExtras) : null;
  const imageFs = gmux
    ? (gmux.fs as typeof gmux.fs & GmuxImageExtras)
    : null;

  const loadContents = async (id: string, path: string): Promise<void> => {
    if (!gmux) return;
    try {
      const result = await gmux.fs.readFile(path);
      deps.patch(id, {
        savedContents: result.contents,
        truncated: result.truncated,
        loading: false,
        error: null,
        deleted: false
      });
    } catch (err) {
      deps.patch(id, {
        loading: false,
        error: errorSentence(err, 'The file could not be read.')
      });
    }
  };

  const loadHead = async (id: string): Promise<void> => {
    const tab = deps.byId(id);
    if (!gmux || tab === undefined) return;
    // Phase 26 item 1: a file outside the repository has no HEAD version and
    // git is never asked about it. The rule is decided where the tab is
    // created (store.openFromRequest / setMode), so reaching this line is
    // already a caller's mistake — fall back to the plain view without a git
    // call and without a toast, because nothing is wrong with the file.
    if (!fileInRepo(tab.repoPath, tab.path)) {
      deps.patch(id, { mode: tab.markdown ? 'preview' : 'file', canDiff: false });
      return;
    }
    try {
      const head = await gmux.git.showHead({
        repoPath: tab.repoPath,
        // A rename's LEFT side lives at the OLD path. Asking HEAD for the new
        // path returns nothing, and the diff then reads as a whole-file
        // addition — the Phase 11 carried finding (a).
        path: tab.origRelPath ?? tab.relPath
      });
      deps.patch(id, { headContents: head });
    } catch (err) {
      // Diff base unavailable (repo vanished, git failed): fall back to a
      // plain editor rather than a broken diff, and say so in sentences a
      // person can read (Phase 26 item 1).
      deps.patch(id, { mode: tab.markdown ? 'preview' : 'file', canDiff: false });
      useApp
        .getState()
        .toast(
          'error',
          `Could not load the last committed version of this file. ${errorSentence(
            err,
            'Showing it on its own.'
          )}`
        );
    }
  };

  /**
   * A HISTORY tab's two sides (Phase 12 item 4) — `<sha>^ → <sha>`, from the
   * one main-process reader that already knows how to resolve a first parent,
   * a root commit and a rename. Both sides are text here; the working-tree
   * loaders are never used for this tab.
   *
   * An absent side (add / delete / root commit) is an EMPTY string, not an
   * error: that is what makes the diff render all-green or all-red the way
   * VS Code does. Binary is the one case with nothing to show.
   */
  const loadCommitDiff = async (
    id: string,
    commit: OpenFileCommitRef
  ): Promise<void> => {
    const git = gmux
      ? (gmux.git as typeof gmux.git & GmuxGitSyncExtras)
      : null;
    const tab = deps.byId(id);
    if (git === null || tab === undefined) return;
    if (typeof git.commitFileDiff !== 'function') {
      deps.patch(id, {
        loading: false,
        error: 'This build cannot open historical commits.'
      });
      return;
    }
    try {
      const pair = await git.commitFileDiff({
        repoPath: tab.repoPath,
        sha: commit.sha,
        path: tab.relPath,
        ...(tab.origRelPath !== null ? { origPath: tab.origRelPath } : {}),
        status: commit.status
      });
      if (pair.binary) {
        deps.patch(id, {
          loading: false,
          error: binaryFileNote(tab.name)
        });
        return;
      }
      deps.patch(id, {
        headContents: pair.oldContents ?? '',
        savedContents: pair.newContents ?? '',
        loading: false,
        error: null
      });
    } catch (err) {
      deps.patch(id, {
        loading: false,
        error: errorSentence(err, 'The commit could not be read.')
      });
    }
  };

  /**
   * A REVIEW tab's two sides (Phase 73, M6, item 4) — the HEAD copy and the
   * working copy of one file, both read ON THE MACHINE the session runs on.
   *
   * It is `loadCommitDiff` with one call swapped, and that is the whole point
   * of the item: the read-only diff surface, the two content fields, the binary
   * answer and the error sentences are the ones the editor has had since
   * Phase 12. `src/renderer/editor/PierreDiff.tsx` is not edited by this phase.
   *
   * The two ways this differs from every other loader in this file are worth
   * stating, because both are safety properties rather than details.
   *
   *  1. NO PATH ON THIS MAC IS READ. `tab.path` is a path on another computer.
   *     Handing it to `fs:readFile` would open whatever this Mac happens to
   *     hold at that name, which in the phase's own probes is a real file.
   *  2. The call can REFUSE, and the refusal is a sentence rather than an empty
   *     tab. Main refuses when Tortie is not connected to that machine, and
   *     refuses again when the connection changed while the read was in
   *     flight. Both arrive here as an error with main's own sentence on it.
   */
  const loadRemoteDiff = async (
    id: string,
    remote: OpenFileRemoteRef
  ): Promise<void> => {
    const machines = gmux
      ? (gmux as typeof gmux & GmuxMachinesExtras).machines
      : undefined;
    const tab = deps.byId(id);
    if (tab === undefined) return;
    if (machines === undefined || typeof machines.reviewFile !== 'function') {
      deps.patch(id, {
        loading: false,
        error: 'This build cannot show files from another machine.'
      });
      return;
    }
    try {
      const pair = await machines.reviewFile({
        machineId: remote.machineId,
        repoPath: remote.repoPath,
        path: tab.relPath,
        origPath: tab.origRelPath
      });
      if (pair.binary) {
        deps.patch(id, {
          loading: false,
          error: binaryFileNote(tab.name)
        });
        return;
      }
      deps.patch(id, {
        headContents: pair.oldContents,
        savedContents: pair.newContents,
        loading: false,
        error: null
      });
      // The cap is a fact about what is on screen, so it is said once here
      // rather than drawn as a permanent banner. `truncated` also puts the tab
      // into its existing read-only state, which a review already is.
      if (pair.truncated) {
        deps.patch(id, { truncated: true });
        if (pair.note !== null) useApp.getState().toast('info', pair.note);
      }
    } catch (err) {
      deps.patch(id, {
        loading: false,
        error: errorSentence(
          err,
          'That file could not be read on the machine.'
        )
      });
    }
  };

  // -- images (Phase 12.10) --------------------------------------------------
  // A separate reader, not a variant of loadContents: fs:readFile is UTF-8
  // and refuses binary, so routing an image through it is what produced
  // "gmux edits text files only" on every .png in the tree.

  const loadImage = async (id: string, path: string): Promise<void> => {
    if (typeof imageFs?.readImage !== 'function') {
      deps.patch(id, {
        loading: false,
        error: 'This build cannot preview images.'
      });
      return;
    }
    try {
      const data = await imageFs.readImage({ path });
      deps.patch(id, {
        imageData: data,
        loading: false,
        error: null,
        deleted: data.status === 'missing'
      });
    } catch (err) {
      deps.patch(id, {
        loading: false,
        error: errorSentence(err, 'The image could not be read.')
      });
    }
  };

  const loadImageHead = async (id: string): Promise<void> => {
    const tab = deps.byId(id);
    if (tab === undefined || typeof imageFs?.readImage !== 'function') return;
    // Phase 26 item 1: same rule as loadHead — no HEAD version exists for a
    // file outside the repository, so git is never asked.
    if (!fileInRepo(tab.repoPath, tab.path)) {
      deps.patch(id, { mode: 'image', canDiff: false });
      return;
    }
    try {
      const head = await imageFs.readImage({
        path: tab.path,
        rev: 'HEAD',
        repoPath: tab.repoPath,
        // A rename's LEFT side lives at the OLD path — the same rule the
        // text diff follows (Phase 11 carried finding (a)).
        relPath: tab.origRelPath ?? tab.relPath
      });
      deps.patch(id, { imageHead: head });
    } catch (err) {
      // No comparison is available: fall back to the plain viewer rather
      // than an empty half-diff, and say why once.
      deps.patch(id, { mode: 'image', canDiff: false });
      useApp
        .getState()
        .toast(
          'error',
          `Could not load the last committed version of this image. ${errorSentence(
            err,
            'Showing it on its own.'
          )}`
        );
    }
  };

  // -- saving ----------------------------------------------------------------

  /** Write one tab to disk. Resolves false when nothing was written. */
  const save = async (id: string): Promise<boolean> => {
    const tab = deps.byId(id);
    if (!gmux || tab === undefined) return false;
    // History is immutable: ⌘S on a commit tab is a no-op, never a write of
    // an old revision over the live file. Phase 73: a review tab is refused
    // here too, and for a stronger reason. Its path names a file on another
    // computer, so a write would land on whatever this Mac holds at that path.
    if (tab.commit !== null || tab.remote !== undefined) return false;
    if (tab.deleted || tab.truncated || tab.error !== null) return false;
    const model = getWorkingModel(id);
    if (model === null) return false;
    const value = model.getValue();
    try {
      await gmux.fs.writeFile(tab.path, value);
      deps.patch(id, { savedContents: value, dirty: false });
      return true;
    } catch (err) {
      useApp
        .getState()
        .toast(
          'error',
          `Could not save this file. ${errorSentence(err, 'The write failed.')}`,
          { sticky: true }
        );
      return false;
    }
  };


  const refreshRepo = async (repoPath: string): Promise<void> => {
    if (!gmux) return;
    // History tabs are excluded by construction: `<sha>^ → <sha>` cannot
    // change, and re-running the worktree refresh over one would replace a
    // commit's contents with the live file's.
    const tabs = deps.worktreeTabsIn(repoPath);
    for (const tab of tabs) {
      // An image tab re-reads through the image channel and bumps its
      // revision, which is what re-fetches the asset URL: an agent that
      // regenerates a chart must change the picture on screen, and the URL
      // alone is stable enough for Chromium to serve the old bitmap forever.
      if (tab.image && !tab.svg) {
        await loadImage(tab.id, tab.path);
        const current = deps.byId(tab.id);
        if (current === undefined) continue;
        deps.patch(tab.id, { imageRevision: current.imageRevision + 1 });
        if (current.canDiff) await loadImageHead(tab.id);
        continue;
      }
      // Existence check (feature-detected; skipped without fs:readDir).
      if (typeof fsExtras?.readDir === 'function') {
        try {
          const dir = await fsExtras.readDir(dirOf(tab.path));
          const exists = dir.entries.some((e) => e.name === tab.name);
          if (!exists) {
            deps.patch(tab.id, { deleted: true });
            continue;
          }
          if (tab.deleted) deps.patch(tab.id, { deleted: false });
        } catch {
          /* parent unreadable — leave the tab as-is */
        }
      }
      // Reload clean buffers so the editor tracks the agent's edits.
      if (!tab.dirty) {
        try {
          const result = await gmux.fs.readFile(tab.path);
          if (result.contents !== tab.savedContents) {
            deps.patch(tab.id, {
              savedContents: result.contents,
              truncated: result.truncated
            });
            resetWorkingModel(tab.id, result.contents);
          }
        } catch {
          /* transient read failure — keep the buffer */
        }
      }
      // Keep the diff base honest (HEAD moves on commit) and let a
      // freshly-modified file grow its Diff|File toggle.
      // Phase 26 item 1: never for a file outside this repository. It has no
      // HEAD version, and asking git for one with an absolute path is exactly
      // the refusal that reached the operator raw — this loop used to issue
      // that doomed call on every watcher tick for an open context detail
      // tab. Its buffer still refreshes above; it has no diff base to keep
      // honest.
      if (!fileInRepo(tab.repoPath, tab.path)) continue;
      try {
        const head = await gmux.git.showHead({
          repoPath: tab.repoPath,
          path: tab.origRelPath ?? tab.relPath
        });
        const current = deps.byId(tab.id);
        if (current === undefined) continue;
        const patch: Partial<EditorTab> = { headContents: head };
        if (!current.canDiff && head !== current.savedContents) {
          patch.canDiff = true;
        }
        deps.patch(tab.id, patch);
      } catch {
        /* non-repo or git failure — plain mode keeps working */
      }
    }
  };

  return {
    loadContents,
    loadHead,
    loadCommitDiff,
    loadRemoteDiff,
    loadImage,
    loadImageHead,
    save,
    refreshRepo
  };
}

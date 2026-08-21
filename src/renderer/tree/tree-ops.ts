/**
 * The explorer's file VERBS — create, rename, duplicate, move, trash — and the
 * one rule that makes them safe to run against a tree an agent is writing to
 * at the same time.
 *
 * ── MAIN IS THE TRUTH; THE MODEL IS A PROJECTION ──────────────────────────
 * @pierre/trees mutates its own store OPTIMISTICALLY: `completeDrag()` moves
 * the paths before `onDropComplete` fires, and a committed rename moves them
 * before we have asked main for anything. That is good UX and a correctness
 * trap, because the disk can still say no (EEXIST, EPERM, a folder an agent
 * deleted a second ago). So every verb here:
 *
 *   1. records the moves it is about to make, in canonical Pierre spelling;
 *   2. calls the fs:* channel and waits for main's answer;
 *   3. on success brings OUR baseline (`fed`, the path set the listing diff is
 *      computed against) in step, re-lists the affected directories, and
 *      carries any open editor tab across;
 *   4. on failure puts the model back exactly where it was, and says why.
 *
 * Nothing is repaired by rebuilding the tree: a full `resetPaths` while an
 * agent is writing would collapse the user's expansion state under them. The
 * batch/inverse-batch path is surgical; the divergence recovery already in
 * FileTree.tsx stays the last resort it always was.
 *
 * ── DELETE MEANS TRASH ────────────────────────────────────────────────────
 * There is no unlink anywhere in this stream. `fs:trash` is `shell.trashItem`,
 * and the confirmation names what is going — one item by name, several by
 * count — because a reversible action still deserves a sentence.
 */

import type {
  FileTreeBatchOperation,
  FileTreeDirectoryHandle,
  FileTreeRenameEvent
} from '@pierre/trees';
import type { UseFileTreeResult } from '@pierre/trees/react';
import { isProtectedFsPath } from '@shared/fs-ops';
// PHASE 101 AND PHASE 102. What a create, a new folder and a rename on another
// machine answer. The words are main's and the sentence for each one is
// composed in ../app/machine-copy.ts.
import type {
  MachineFilePutResult,
  MachineMakeDirResult,
  MachineRenameResult
} from '@shared/ipc';
import { errorPayload, errorText, useApp } from '../state/store';
import { followMoves } from './editor-follow';
import * as fsOps from './fs-ops-bridge';
import { requestOpenFile } from './open-file';
import {
  remoteEntryExists,
  remoteEntryGone,
  remoteEntryLostAnswer,
  remoteEntryOutsideRoot,
  remoteEntryWritesOff,
  remoteParentGone,
  remoteRenameAlreadyDone,
  remoteSaveRefusal,
  remoteWriteDenied
} from '../app/machine-copy';
import { machineLabelFor } from '../state/machines-slice';
import type { TreeRenameView } from './rename-view';
import { useFileTree } from './store';
import { describeConflicts, describeEntries } from './tree-menu';
import {
  absOf,
  baseNameOf,
  invertMoves,
  isDirPath,
  parentOf,
  planMoves,
  remapPathSet,
  toCanonical,
  toRel,
  touchedDirs,
  uniqueName
} from './tree-paths';
import type { PathMove } from './tree-paths';

type PierreModel = UseFileTreeResult['model'];

/** What FileTree.tsx lends the verbs: the model and its feed baseline. */
export interface TreeOpsContext {
  rootPath: string;
  model: PierreModel;
  /** The path set last fed to the model (FileTree's `fedRef`). */
  readFed(): Set<string>;
  writeFed(next: Set<string>): void;
  /**
   * Freeze these paths against the listing diff until the returned function
   * is called.
   *
   * THIS IS THE RULE THAT LETS AN OPERATION SHARE A REPO WITH A WORKING
   * AGENT. Between "the model has changed" and "main has answered", the
   * model and the disk legitimately disagree — and the @parcel/watcher fires
   * every ~450 ms while anything writes, so a listing WILL arrive inside that
   * window. Left to referee, the diff resolves the disagreement in the disk's
   * favour and rips the row out mid-gesture: measured live, an unrelated
   * watcher tick removed a New Folder's inline-rename row while it was being
   * typed into, and the folder was never created. Holding the paths says
   * "these two are allowed to differ for a moment"; releasing re-runs the
   * diff, so the tree converges on the truth either way.
   */
  hold(paths: readonly string[]): () => void;
  /**
   * The live rename-editor adapter (Phase 37), or null when the library's
   * editor state cannot be reached. A create NEVER opens without it: the
   * empty box, the silent no-op detection and the refusal-with-a-reason all
   * read and write the editor through this, and a placeholder row we cannot
   * control is exactly the fake row the phase removes.
   */
  renameView(): TreeRenameView | null;
  /** Make this row the only selected one (controller-level selection). */
  selectOnly(canonical: string): void;
  /**
   * PHASE 101. How a create lands when the tree is on another machine, or
   * undefined for a folder on this Mac.
   *
   * THE GESTURE IS UNCHANGED. The placeholder row, the inline editor, the
   * refusal on a bad name and the commit are the same code on both computers.
   * Only the one disk write at the end moves, and only for a file: New Folder
   * is absent from the menu on such a row and the header button beside it stays
   * off, so `kind === 'dir'` never reaches the remote branch.
   *
   * `putFile` is given the ABSOLUTE path on that machine, which is what
   * `absOf(rootPath, canonical)` already composes for every other surface that
   * names a file over there. It carries no folder: the folder Tortie may write
   * under is read in main, off the row a person confirmed.
   */
  remoteCreate?: {
    machineId: string;
    putFile(absPath: string): Promise<MachineFilePutResult>;
    /** Re-read the tree from that machine. Resolves when the read is done. */
    refresh(): Promise<void>;
  };
  /**
   * PHASE 102. How a new folder and a rename land when the tree is on another
   * machine, or undefined for a folder on this Mac.
   *
   * THE GESTURE IS UNCHANGED, exactly as it is for `remoteCreate` above. The
   * placeholder row, the inline editor, the refusal on a bad name and the
   * commit are the same code on both computers. Only the one write at the end
   * moves.
   *
   * Both calls are given ABSOLUTE paths on that machine. Neither carries a
   * folder: the folder Tortie may change entries under is read in main, off the
   * row a person confirmed, and either path outside it refuses the whole call.
   */
  remoteEntry?: {
    machineId: string;
    makeDir(absPath: string): Promise<MachineMakeDirResult>;
    renameEntry(
      fromAbs: string,
      toAbs: string,
      kind: 'file' | 'dir'
    ): Promise<MachineRenameResult>;
    /** Re-read the tree from that machine. Resolves when the read is done. */
    refresh(): Promise<void>;
  };
}

export interface TreeOps {
  /** VS Code's "New File…": a placeholder row, renamed into existence. */
  newEntry(destDirCanonical: string, kind: 'file' | 'dir'): void;
  /** F2 / context menu. */
  startRename(canonical: string): void;
  /** Pierre's renaming.onRename — a real rename OR a pending create. */
  onRenameCommitted(event: FileTreeRenameEvent): void;
  /** Pierre's renaming.onError — name validation the model did itself. */
  onRenameRejected(message: string): void;
  duplicate(canonical: string): void;
  trash(canonicals: readonly string[]): void;
  /**
   * Called on every model emit. Esc out of a New File / New Folder and the
   * library removes the placeholder row with no callback of any kind, so
   * this is where that gesture's hold is noticed and freed.
   */
  settle(): void;
  /**
   * A completed drop. `modelAlreadyMoved` separates Pierre's optimistic path
   * (onDropComplete) from the ones where the model refused the move or never
   * had a target (onDropError, and our own root drop).
   */
  drop(
    draggedCanonical: readonly string[],
    destDirCanonical: string,
    modelAlreadyMoved: boolean
  ): void;
  /**
   * The placeholder's canonical path while a New File / New Folder editor is
   * open, else null (Phase 37). While non-null the row is not draggable, not
   * a drop target, and not openable — it is not a file yet.
   */
  pendingPath(): string | null;
}

export function createTreeOps(ctx: TreeOpsContext): TreeOps {
  const app = (): ReturnType<typeof useApp.getState> => useApp.getState();
  const files = (): ReturnType<typeof useFileTree.getState> =>
    useFileTree.getState();

  const toastError = (err: unknown, fallback: string): void => {
    const payload = errorPayload(err);
    const text = payload?.message ?? errorText(err);
    app().toast('error', text.length > 0 ? text : fallback);
  };

  /** Bring the feed baseline in step with moves the model already applied. */
  const rebaseFed = (moves: readonly PathMove[]): void => {
    ctx.writeFed(remapPathSet(ctx.readFed(), moves));
  };

  /** Undo an optimistic model mutation; a throw falls back to the baseline. */
  const revertModel = (moves: readonly PathMove[]): void => {
    try {
      ctx.model.batch(
        invertMoves(moves).map((m) => ({
          type: 'move' as const,
          from: m.from,
          to: m.to
        }))
      );
    } catch {
      // Model and baseline disagree, and the baseline is the one main agrees
      // with, so it wins. Expansion is carried across by hand.
      const fed = [...ctx.readFed()];
      const expanded = fed.filter((path) => {
        if (!isDirPath(path)) return false;
        const item = ctx.model.getItem(path);
        // The union has no discriminant TS can narrow on, so the cast is the
        // same one FileTree.tsx's `asDirectory` makes, guarded identically.
        return (
          item !== null &&
          item.isDirectory() &&
          (item as FileTreeDirectoryHandle).isExpanded()
        );
      });
      ctx.model.resetPaths(fed, { initialExpandedPaths: expanded });
    }
  };

  /**
   * Re-list what changed; forget cache under paths that no longer exist.
   *
   * Resolves when the listings have LANDED, which is what the hold has to
   * wait for: release it a moment early and the diff runs against a listing
   * that still describes the world before the operation, then dutifully
   * "corrects" the model back to it — the row vanishes and reappears.
   */
  const resync = async (
    moves: readonly PathMove[],
    goneDirs: readonly string[]
  ): Promise<void> => {
    const store = files();
    if (goneDirs.length > 0) store.forgetUnder(goneDirs);
    await store.relist(touchedDirs(ctx.rootPath, moves));
  };

  const addToFed = (canonical: string): void => {
    const next = new Set(ctx.readFed());
    next.add(canonical);
    ctx.writeFed(next);
  };

  const dropFromFed = (canonicals: readonly string[]): void => {
    const next = new Set(ctx.readFed());
    for (const canonical of canonicals) {
      next.delete(canonical);
      if (!isDirPath(canonical)) continue;
      for (const path of [...next]) {
        if (path.startsWith(canonical)) next.delete(path);
      }
    }
    ctx.writeFed(next);
  };

  /** Names already used inside a directory, per the rows the model holds. */
  const siblingNames = (destDirCanonical: string): Set<string> => {
    const names = new Set<string>();
    for (const path of ctx.readFed()) {
      if (parentOf(path) === destDirCanonical) names.add(baseNameOf(path));
    }
    return names;
  };

  // ---- pending create -----------------------------------------------------
  // VS Code's gesture: the row appears first and is BORN in rename mode, so
  // the name is typed where the file will live rather than in a modal. The
  // placeholder exists only in the model — `removeIfCanceled` takes the row
  // back out on Esc or an empty name, and the disk was never touched.
  let pending: { placeholder: string; kind: 'file' | 'dir' } | null = null;
  /** Frees the placeholder's hold when the gesture ends, however it ends. */
  let pendingRelease: (() => void) | null = null;

  /**
   * PHASE 102. The label of the machine a verb is landing on, read at the
   * moment the answer arrives rather than captured when the gesture started.
   *
   * A person can rename a machine while a call is in flight, and the sentence
   * should name what the machine is called now.
   */
  const machineLabel = (machineId: string): string =>
    machineLabelFor(useApp.getState().machineStates, machineId);

  /**
   * PHASE 101. The same gesture, landing on another machine.
   *
   * ONE EMPTY FILE, and never a folder. `expect: 'new'` is what makes the far
   * side refuse a name that is already there rather than replacing it, so two
   * people asking for the same name cannot lose one of their files.
   *
   * ON ANY ANSWER BUT `wrote` the row comes back out of the model, which is the
   * same shape the local catch below has, and the sentence for the answer is
   * toasted. Nothing was written on that machine in any of those cases.
   */
  const finishRemoteCreate = (
    remote: NonNullable<TreeOpsContext['remoteCreate']>,
    placeholder: string,
    canonical: string,
    release: () => void
  ): void => {
    const abs = absOf(ctx.rootPath, canonical);
    const label = machineLabel(remote.machineId);
    const undo = (): void => {
      try {
        ctx.model.remove(canonical, { recursive: false });
      } catch {
        /* already gone */
      }
      dropFromFed([canonical, placeholder]);
      release();
    };
    void remote
      .putFile(abs)
      .then((result) => {
        if (result.outcome !== 'wrote') {
          undo();
          app().toast(
            'error',
            remoteSaveRefusal(
              result.outcome,
              label,
              result.writeRoot,
              result.bytes ?? 0
            ),
            { sticky: true }
          );
          return;
        }
        addToFed(canonical);
        ctx.selectOnly(canonical);
        ctx.model.focusPath(canonical);
        void remote.refresh().finally(release);
        // The same half gesture rule as a create on this Mac: a New File that
        // leaves you looking at the tree is half of one. The tab carries the
        // machine, so the editor reads it from over there and knows it may
        // save it back.
        requestOpenFile({
          repoPath: ctx.rootPath,
          relPath: toRel(canonical),
          path: abs,
          mode: 'file',
          source: 'tree',
          preview: false,
          remote: {
            machineId: remote.machineId,
            machineLabel: label,
            repoPath: ctx.rootPath
          }
        });
      })
      .catch((err: unknown) => {
        undo();
        toastError(err, 'Could not create that.');
      });
  };

  /**
   * PHASE 102. The sentence for one refused New Folder.
   *
   * `made` cannot reach here: the caller has already tested for it, which is
   * what narrows the parameter to the five refusals. `outsideRoot` with no
   * folder can only mean saving is off for that machine, so it falls back to
   * the sentence that says exactly that rather than drawing a folder nobody
   * confirmed. That is `remoteSaveRefusal`'s own rule and this copies it.
   */
  const makeDirRefusal = (
    outcome: Exclude<MachineMakeDirResult['outcome'], 'made'>,
    writeRoot: string | null,
    canonical: string,
    label: string
  ): string => {
    switch (outcome) {
      case 'exists':
        return remoteEntryExists(baseNameOf(canonical), label);
      case 'noparent':
        return remoteParentGone(label);
      case 'denied':
        return remoteWriteDenied(
          absOf(ctx.rootPath, parentOf(canonical)),
          label
        );
      case 'writesOff':
        return remoteEntryWritesOff(label);
      case 'outsideRoot':
        return writeRoot === null
          ? remoteEntryWritesOff(label)
          : remoteEntryOutsideRoot(writeRoot, label);
    }
  };

  /**
   * PHASE 102. The sentence for one refused Rename.
   *
   * `moved` and `done` cannot reach here, because both are end states the
   * person asked for and the caller has already tested for them. `exists` names
   * the destination and `gone` names the source, which is the entry each word
   * is about.
   */
  const renameRefusal = (
    outcome: Exclude<MachineRenameResult['outcome'], 'moved' | 'done'>,
    writeRoot: string | null,
    sourceCanonical: string,
    destCanonical: string,
    label: string
  ): string => {
    switch (outcome) {
      case 'exists':
        return remoteEntryExists(baseNameOf(destCanonical), label);
      case 'gone':
        return remoteEntryGone(baseNameOf(sourceCanonical), label);
      case 'writesOff':
        return remoteEntryWritesOff(label);
      case 'outsideRoot':
        return writeRoot === null
          ? remoteEntryWritesOff(label)
          : remoteEntryOutsideRoot(writeRoot, label);
    }
  };

  /**
   * PHASE 102. New Folder, landing on another machine.
   *
   * It is `finishRemoteCreate`'s shape and it differs in two ways. It opens no
   * tab, because a folder is not a document. And it re-reads the folder it
   * landed in rather than composing a row, for the reason the create above
   * gives: nothing polls a machine, there is no watcher over there, and a row
   * the machine never confirmed is a row a person cannot tell from a real one.
   *
   * ON EVERY ANSWER BUT `made` the row comes back out of the model and the
   * sentence for that word is toasted. On a THROWN call the row also comes back
   * out, and the sentence says the machine did not answer rather than saying
   * nothing was changed, because a killed connection was measured in Phase 101
   * completing the far side write.
   */
  const finishRemoteMakeDir = (
    remote: NonNullable<TreeOpsContext['remoteEntry']>,
    placeholder: string,
    canonical: string,
    release: () => void
  ): void => {
    const abs = absOf(ctx.rootPath, canonical);
    const label = machineLabel(remote.machineId);
    const undo = (): void => {
      try {
        ctx.model.remove(canonical, { recursive: true });
      } catch {
        /* already gone */
      }
      dropFromFed([canonical, placeholder]);
      release();
    };
    void remote
      .makeDir(abs)
      .then((result) => {
        if (result.outcome !== 'made') {
          undo();
          app().toast(
            'error',
            makeDirRefusal(result.outcome, result.writeRoot, canonical, label),
            { sticky: true }
          );
          return;
        }
        addToFed(canonical);
        ctx.selectOnly(canonical);
        ctx.model.focusPath(canonical);
        void remote.refresh().finally(release);
      })
      .catch(() => {
        undo();
        app().toast('error', remoteEntryLostAnswer(label), { sticky: true });
      });
  };

  /**
   * PHASE 102. Rename, landing on another machine.
   *
   * TWO ANSWERS ARE SUCCESSES BY END STATE. `moved` is this call's own move.
   * `done` means the machine already holds what the person asked for, so the
   * model follows and the open tabs follow, and the person is told at `info`
   * that it was not this call that did it. What `done` cannot tell apart is a
   * repeat of Tortie's own move and a machine where somebody else already held
   * a file at the destination while the source never existed. Both leave the
   * person looking at the end state they asked for and this product does not
   * pretend to know which happened.
   *
   * WHERE THE KIND COMES FROM, stated as it is rather than as it reads well.
   * It is the kind on the tree row the person renamed, which is what the last
   * read of that folder said. It is sent to main and main echoes it back
   * unchanged. NOBODY MEASURES IT ON THE MACHINE, so the answer's kind is the
   * kind this renderer asked with and no more.
   *
   * That still matters. `pathAfterMove` in ./tab-follow.ts does prefix
   * arithmetic for descendants only when the kind reads `'dir'`, so a folder
   * rename carried as `'file'` would leave every open tab beneath it pointing
   * at a path that is no longer on that machine. What is NOT true is that
   * anything checks this claim against the machine. A row that went stale
   * between the read and the rename carries a stale kind.
   */
  const finishRemoteRename = (
    remote: NonNullable<TreeOpsContext['remoteEntry']>,
    sourceCanonical: string,
    destCanonical: string,
    kind: 'file' | 'dir',
    release: () => void
  ): void => {
    const move: PathMove = { from: sourceCanonical, to: destCanonical };
    const fromAbs = absOf(ctx.rootPath, sourceCanonical);
    const toAbs = absOf(ctx.rootPath, destCanonical);
    const label = machineLabel(remote.machineId);
    void remote
      .renameEntry(fromAbs, toAbs, kind)
      .then((result) => {
        if (result.outcome !== 'moved' && result.outcome !== 'done') {
          revertModel([move]);
          release();
          app().toast(
            'error',
            renameRefusal(
              result.outcome,
              result.writeRoot,
              sourceCanonical,
              destCanonical,
              label
            ),
            { sticky: true }
          );
          return;
        }
        rebaseFed([move]);
        followMoves([
          {
            from: fromAbs,
            to: toAbs,
            kind: result.kind,
            machine: { machineId: remote.machineId, repoPath: ctx.rootPath }
          }
        ]);
        if (result.outcome === 'done') {
          app().toast('info', remoteRenameAlreadyDone(label));
        }
        // A folder that moved takes its cached children's keys with it, and
        // those keys name a path that is not on that machine any more.
        if (result.kind === 'dir') files().forgetUnder([fromAbs]);
        void remote.refresh().finally(release);
      })
      .catch(() => {
        revertModel([move]);
        release();
        app().toast('error', remoteEntryLostAnswer(label), { sticky: true });
      });
  };

  const finishCreate = (
    placeholder: string,
    kind: 'file' | 'dir',
    destinationRel: string
  ): void => {
    const canonical = toCanonical(destinationRel, kind === 'dir');
    const release = ctx.hold([placeholder, canonical]);
    // PHASE 101. The one disk write at the end of the gesture, and the only
    // line of this function that knows which computer it lands on. A folder
    // never reaches here on a remote tree, because New Folder is absent from
    // that menu and the header button beside it is off.
    const remote = ctx.remoteCreate;
    if (remote !== undefined && kind === 'file') {
      finishRemoteCreate(remote, placeholder, canonical, release);
      return;
    }
    // PHASE 102. The folder half of the same branch. New Folder is on the menu
    // of a remote row now, and the header button beside it is pressable, so a
    // `dir` DOES reach here on a remote tree and it must never fall through to
    // this Mac's own `createFolder`.
    const remoteEntry = ctx.remoteEntry;
    if (remoteEntry !== undefined && kind === 'dir') {
      finishRemoteMakeDir(remoteEntry, placeholder, canonical, release);
      return;
    }
    const create = kind === 'dir' ? fsOps.createFolder : fsOps.createFile;
    void create({ root: ctx.rootPath, path: toRel(destinationRel) })
      .then((entry) => {
        addToFed(canonical);
        // Enter creates AND SELECTS (Phase 37): the committed rename left
        // the selection on the placeholder's old spelling, which is nowhere.
        ctx.selectOnly(canonical);
        ctx.model.focusPath(canonical);
        void files()
          .relist([absOf(ctx.rootPath, parentOf(canonical))])
          .finally(release);
        // "New File" that leaves you looking at the tree is half a gesture.
        // Opened for keeps, not as a preview tab — you asked for this file.
        if (kind === 'file') {
          requestOpenFile({
            repoPath: ctx.rootPath,
            relPath: entry.relPath,
            path: entry.path,
            mode: 'file',
            source: 'tree',
            preview: false
          });
        }
      })
      .catch((err: unknown) => {
        // The row is in the model but not on disk — take it back out.
        try {
          ctx.model.remove(canonical, { recursive: kind === 'dir' });
        } catch {
          /* already gone */
        }
        dropFromFed([canonical, placeholder]);
        release();
        toastError(err, 'Could not create that.');
      });
  };

  // ---- rename -------------------------------------------------------------

  const finishRename = (
    sourceCanonical: string,
    destCanonical: string,
    kind: 'file' | 'dir'
  ): void => {
    const move: PathMove = { from: sourceCanonical, to: destCanonical };
    const fromAbs = absOf(ctx.rootPath, sourceCanonical);
    const toAbs = absOf(ctx.rootPath, destCanonical);
    const release = ctx.hold([sourceCanonical, destCanonical]);

    // PHASE 102. The one write at the end of the gesture, and the only lines of
    // this function that know which computer it lands on. `fsOps.rename` below
    // renames a path on THIS Mac, so a remote tree must never reach it.
    const remote = ctx.remoteEntry;
    if (remote !== undefined) {
      finishRemoteRename(remote, sourceCanonical, destCanonical, kind, release);
      return;
    }

    void fsOps
      .rename({
        root: ctx.rootPath,
        path: toRel(sourceCanonical),
        name: baseNameOf(destCanonical)
      })
      .then(() => {
        rebaseFed([move]);
        followMoves([{ from: fromAbs, to: toAbs, kind }]);
        void resync([move], kind === 'dir' ? [fromAbs] : []).finally(release);
      })
      .catch((err: unknown) => {
        revertModel([move]);
        release();
        toastError(err, 'Could not rename that.');
      });
  };

  // ---- move ---------------------------------------------------------------

  const applyMove = (
    moves: readonly PathMove[],
    destDirCanonical: string,
    modelHoldsTheMove: boolean,
    overwrite: boolean
  ): void => {
    const release = ctx.hold(moves.flatMap((m) => [m.from, m.to]));
    void fsOps
      .move({
        root: ctx.rootPath,
        paths: moves.map((m) => toRel(m.from)),
        destDir: toRel(destDirCanonical),
        ...(overwrite ? { overwrite: true } : {})
      })
      .then((result) => {
        if (result.status === 'would-overwrite') {
          // Nothing moved on disk. Put the optimistic rows back while the
          // question is open, then ask, naming every collision at once.
          if (modelHoldsTheMove) revertModel(moves);
          release();
          app().setConfirm({
            title:
              result.conflicts.length === 1
                ? 'Replace the existing item?'
                : `Replace ${result.conflicts.length} existing items?`,
            body: describeConflicts(result.conflicts),
            confirmLabel: 'Replace',
            destructive: true,
            onConfirm: () => applyMove(moves, destDirCanonical, false, true)
          });
          return;
        }

        const applied: PathMove[] = result.moved.map((pair) => ({
          from: toCanonical(pair.from.relPath, pair.from.kind === 'dir'),
          to: toCanonical(pair.to.relPath, pair.to.kind === 'dir')
        }));

        if (!modelHoldsTheMove) {
          // We own the model update. A replace clears the displaced row
          // first: path-store's own 'replace' strategy refuses non-empty
          // folders, and the displaced entry is in the Trash either way.
          const ops: FileTreeBatchOperation[] = [];
          for (const move of applied) {
            if (ctx.model.getItem(move.to) !== null) {
              ops.push({
                type: 'remove',
                path: move.to,
                recursive: isDirPath(move.to)
              });
            }
            ops.push({ type: 'move', from: move.from, to: move.to });
          }
          try {
            ctx.model.batch(ops);
          } catch {
            /* the re-list below is the backstop */
          }
        }

        rebaseFed(applied);
        followMoves(
          result.moved.map((pair) => ({
            from: pair.from.path,
            to: pair.to.path,
            kind: pair.from.kind
          }))
        );
        void resync(
          applied,
          result.moved
            .filter((pair) => pair.from.kind === 'dir')
            .map((pair) => pair.from.path)
        ).finally(release);
      })
      .catch((err: unknown) => {
        if (modelHoldsTheMove) revertModel(moves);
        release();
        toastError(err, 'Could not move that.');
      });
  };

  /**
   * Open the destination and everything above it, so the placeholder row is
   * somewhere the user can actually see.
   *
   * MEASURED (Phase 14.2, live probe): aim a create at a COLLAPSED folder and
   * the row is added, `startRenaming` is accepted, and nothing appears —
   * a collapsed folder renders no children, so the rename input is never
   * mounted and the gesture dead-ends. It was always reachable through the
   * context menu on a closed folder; the header's New File / New Folder made
   * it the common case, because a toolbar button aims at whatever happens to
   * be selected. Fixed in the shared verb, so both entry points inherit it.
   */
  const revealDestination = (destDirCanonical: string): void => {
    if (destDirCanonical === '') return; // the root is always open
    const segments = destDirCanonical.split('/').filter((s) => s.length > 0);
    let prefix = '';
    for (const segment of segments) {
      prefix += segment + '/';
      const item = ctx.model.getItem(prefix);
      if (item === null || !item.isDirectory()) continue;
      const dir = item as FileTreeDirectoryHandle;
      if (!dir.isExpanded()) dir.expand();
    }
  };

  return {
    newEntry(destDirCanonical, kind) {
      revealDestination(destDirCanonical);
      // Phase 37: no editor without its adapter. The library seeds the box
      // with the placeholder's leaf name, and only the adapter can empty it
      // and watch it — so a missing adapter refuses the gesture outright
      // rather than showing a named row that nothing stands behind.
      const view = ctx.renameView();
      if (view === null) {
        app().toast('error', 'Could not start a new item here.');
        return;
      }
      const base = kind === 'dir' ? 'untitled folder' : 'untitled';
      const name = uniqueName(base, siblingNames(destDirCanonical));
      const placeholder = destDirCanonical + toCanonical(name, kind === 'dir');
      // NOT added to `fed`: the placeholder is a row that exists only in the
      // model, on purpose, and `fed` records what MAIN says exists. Keeping
      // it out is half of why an unrelated watcher tick can no longer delete
      // the row while its name is being typed; the hold below is the other.
      pendingRelease?.();
      pendingRelease = ctx.hold([placeholder]);
      try {
        ctx.model.add(placeholder);
      } catch {
        pendingRelease();
        pendingRelease = null;
        app().toast('error', 'Could not start a new item here.');
        return;
      }
      if (ctx.model.startRenaming(placeholder, { removeIfCanceled: true })) {
        // The editor opens EMPTY, in the same task as the add — before the
        // row's first paint. The model path keeps its unique seed (a model
        // needs a path that collides with nothing); the user never sees it
        // as text.
        view.setValue('');
        pending = { placeholder, kind };
        return;
      }
      ctx.model.remove(placeholder, { recursive: kind === 'dir' });
      pendingRelease();
      pendingRelease = null;
    },

    startRename(canonical) {
      if (isProtectedFsPath(canonical)) return;
      ctx.model.startRenaming(canonical);
    },

    pendingPath() {
      return pending?.placeholder ?? null;
    },

    settle() {
      if (pending === null) return;
      if (ctx.model.getItem(pending.placeholder) === null) {
        // Esc / empty commit: the library removed the row with no callback.
        pending = null;
        pendingRelease?.();
        pendingRelease = null;
        return;
      }
      // Phase 37, the silent no-op hole: commit a name equal to the seed and
      // the library closes the editor, KEEPS the row, and fires nothing.
      // Row present + editor no longer on the placeholder + `pending` set has
      // exactly that one cause — every other exit either removes the row or
      // clears `pending` synchronously in its callback before this runs. The
      // adapter's view state makes the check race-free where a DOM query
      // would race the library's own unmount.
      const view = ctx.renameView();
      if (view === null || view.getPath() === pending.placeholder) return;
      const create = pending;
      const release = pendingRelease;
      pending = null;
      pendingRelease = null;
      release?.();
      // Treat it as a commit of the typed name: the one disk write.
      finishCreate(create.placeholder, create.kind, create.placeholder);
    },

    onRenameCommitted(event) {
      const source = toCanonical(event.sourcePath, event.isFolder);
      const create = pending;
      const createRelease = pendingRelease;
      pending = null;
      pendingRelease = null;
      if (create !== null && create.placeholder === source) {
        createRelease?.();
        finishCreate(source, create.kind, event.destinationPath);
        return;
      }
      createRelease?.();
      finishRename(
        source,
        toCanonical(event.destinationPath, event.isFolder),
        event.isFolder ? 'dir' : 'file'
      );
    },

    onRenameRejected(message) {
      // Pierre validated the name against the rows it can see (empty, a '/',
      // a sibling that already exists) and refused before anything moved.
      // For a PENDING CREATE this is the click-away-with-a-bad-name exit
      // (Phase 37): the library closed the editor and KEPT the row, so take
      // the row back out — nothing was ever on disk behind it.
      const create = pending;
      const release = pendingRelease;
      pending = null;
      pendingRelease = null;
      if (create !== null) {
        try {
          ctx.model.remove(create.placeholder, {
            recursive: create.kind === 'dir'
          });
        } catch {
          /* already gone */
        }
      }
      release?.();
      app().toast('error', message);
    },

    duplicate(canonical) {
      // The copy's name is main's to choose (only it can stat the directory),
      // so the hold cannot name the destination up front — the source is
      // enough to keep the diff off the row the copy lands beside.
      const release = ctx.hold([canonical]);
      void fsOps
        .duplicate({ root: ctx.rootPath, path: toRel(canonical) })
        .then((entry) => {
          const created = toCanonical(entry.relPath, entry.kind === 'dir');
          try {
            ctx.model.add(created);
          } catch {
            /* the re-list below is the backstop */
          }
          addToFed(created);
          const holdCreated = ctx.hold([created]);
          void files()
            .relist([absOf(ctx.rootPath, parentOf(canonical))])
            .finally(() => {
              holdCreated();
              release();
            });
        })
        .catch((err: unknown) => {
          release();
          toastError(err, 'Could not duplicate that.');
        });
    },

    trash(canonicals) {
      const targets = canonicals.filter((c) => !isProtectedFsPath(c));
      if (targets.length === 0) return;

      app().setConfirm({
        title: `Delete ${describeEntries(targets)}?`,
        // Recoverable by construction — say so, so nobody hesitates over a
        // reversible action or mistakes it for an unrecoverable one.
        body: 'It moves to the Trash, so you can put it back from Finder.',
        confirmLabel: 'Move to Trash',
        destructive: true,
        onConfirm: () => {
          const release = ctx.hold(targets);
          void fsOps
            .trash({
              root: ctx.rootPath,
              paths: targets.map(toRel)
            })
            .then((result) => {
              const removed: string[] = [];
              for (const entry of result.trashed) {
                const canonical = toCanonical(
                  entry.relPath,
                  entry.kind === 'dir'
                );
                removed.push(canonical);
                try {
                  ctx.model.remove(canonical, {
                    recursive: entry.kind === 'dir'
                  });
                } catch {
                  /* already gone from the model */
                }
              }
              dropFromFed(removed);
              files().forgetUnder(
                result.trashed
                  .filter((e) => e.kind === 'dir')
                  .map((e) => e.path)
              );
              void files()
                .relist([
                  ...new Set(
                    removed.map((c) => absOf(ctx.rootPath, parentOf(c)))
                  )
                ])
                .finally(release);
              // Per entry, never all-or-nothing: a trash cannot be rolled
              // back, so the UI has to name exactly what did not go.
              for (const failure of result.failed) {
                app().toast('error', failure.message);
              }
            })
            .catch((err: unknown) => {
              release();
              toastError(err, 'Could not delete that.');
            });
        }
      });
    },

    drop(draggedCanonical, destDirCanonical, modelAlreadyMoved) {
      if (isProtectedFsPath(destDirCanonical)) return;
      const draggable = draggedCanonical.filter((p) => !isProtectedFsPath(p));
      const moves = planMoves(draggable, destDirCanonical);
      // Everything was already where it landed: Pierre allows the gesture,
      // the disk would be a no-op, and there is nothing to reconcile.
      if (moves.length === 0) return;
      applyMove(moves, destDirCanonical, modelAlreadyMoved, false);
    }
  };
}

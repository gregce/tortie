/**
 * The tree's MODEL half: what @pierre/trees is built from, what is fed into it
 * afterwards, and where the folders a person had open are remembered.
 *
 * This is a hook behind FileTree.tsx and nothing else renders it. It exists
 * because the model's options are captured ONCE at construction, so everything
 * those options reach through has to be created before the model is, in one
 * place, in a fixed order. Four things come out of that rule:
 *
 *  - `opsRef` and `openMenuRef` are created here even though the verbs and the
 *    menu are written elsewhere. The captured options read both, so both must
 *    already exist. `use-tree-rename.ts` fills the first and
 *    `use-tree-menu.ts` fills the second.
 *  - `canRenameHereRef` and `conflictsRef` are refs written on every render,
 *    never values closed over. A person can confirm a folder in Settings while
 *    this tree is mounted, and the once-captured predicate has to see it.
 *  - the five feeders below are effects, so the listing, git status, the
 *    ignored lane and the dot suppression reach a model that was built from a
 *    snapshot.
 *  - the expansion watch is exported separately as `useTreeExpansionWatch`, so
 *    FileTree can keep it in the exact position it has always run in, which is
 *    after the verbs are built rather than before.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  FileTreeBatchOperation,
  ContextMenuItem,
  ContextMenuOpenContext,
  FileTreeDirectoryHandle,
  FileTreeDropContext,
  FileTreeDropResult,
  FileTreeItemHandle,
  FileTreeRowDecoration,
  FileTreeRowDecorationContext
} from '@pierre/trees';
import { useFileTree as usePierreModel } from '@pierre/trees/react';
import type { UseFileTreeResult } from '@pierre/trees/react';
import { isProtectedFsPath } from '@shared/fs-ops';
import { targetKey, workspaceTarget } from '@shared/workspace-target';
import type { FsDirEntry, GitFileStatus } from '@shared/types';
import { treeGitLane } from './decorations';
import type { TreeDensity } from './density';
import { FILTER_SANCTION_MS } from './filter-guard';
import { expandedDirs } from './header-actions';
import { ignoredDotSuppressionCss, ignoredOnlyAncestors, useTreeIgnored } from './ignored';
import { FOLDER_ICON_CSS, getPierreTreeIcons } from './pierre-icons';
import { canWriteEntries } from './remote-bridge';
import { useFileTree } from './store';
import { useTreeHandle } from './tree-handle';
import type { TreeOps } from './tree-ops';

/** The @pierre/trees model this component drives. */
export type TreeModel = UseFileTreeResult['model'];

/**
 * PHASE 90.3. The machine a project folder is on, or null for this Mac.
 *
 * `label` is that machine's own label and `readOnlyNote` is the one sentence
 * its context menu ends with. Both are composed in
 * src/renderer/machines/explorer.ts and passed in, because the tree writes
 * no sentence of its own.
 *
 * PHASE 101 ADDED `writeRoot`, being the folder on that machine a person
 * confirmed Tortie may change files under, or null when they confirmed none.
 *
 * PHASE 102 GAVE IT TWO MORE VERBS. It decides three now rather than one,
 * being New File, New Folder and Rename, and it still decides nothing about
 * what may be written: main reads the confirmed folder off the row on disk at
 * call time, checks every path the tree names against it, and refuses there.
 * Nothing chosen in the renderer can widen what may be written.
 */
export interface TreeRemote {
  machineId: string;
  label: string;
  writeRoot: string | null;
  readOnlyNote: string;
}

export interface TreeModelOptions {
  rootPath: string;
  remote: TreeRemote | null;
  /** `remote !== null`, computed once by the component and passed to all four hooks. */
  isRemote: boolean;
  /** The confirmed folder on that machine, or null. See TreeRemote. */
  remoteWriteRoot: string | null;
  statusFiles: readonly GitFileStatus[];
  isRepo: boolean;
  density: TreeDensity;
}

// ---------------------------------------------------------------------------
// Persisted expansion state (per project root)
// ---------------------------------------------------------------------------

const LS_OPEN_PREFIX = 'gmux.treeOpen.';


/**
 * The storage key one tab's expansion set is remembered under.
 *
 * PHASE 90.3. It is `targetKey`, so a folder on this Mac keeps the bare path it
 * has always used and every set a person already has keeps working byte for
 * byte, while the same path on another machine gets `<machineId>:<path>`. The
 * `gmux.treeOpen.` prefix does not move, so the contract inventory does not
 * move for it either.
 */
function storageKeyFor(rootPath: string, machineId: string | null): string {
  return targetKey(workspaceTarget(rootPath, machineId));
}

/**
 * Read the persisted expanded-dir list: canonical Pierre paths (root-relative,
 * trailing '/'). Tolerates the pre-Phase-11 arborist format (absolute path →
 * true) so existing expansion state survives the swap.
 */
function loadExpanded(rootPath: string, key: string): string[] {
  try {
    const raw = localStorage.getItem(LS_OPEN_PREFIX + key);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((p): p is string => typeof p === 'string');
    }
    if (parsed !== null && typeof parsed === 'object') {
      return Object.entries(parsed as Record<string, unknown>)
        .filter(([abs, open]) => open === true && abs.startsWith(rootPath + '/'))
        .map(([abs]) => abs.slice(rootPath.length + 1) + '/');
    }
  } catch {
    /* cosmetic only */
  }
  return [];
}

function saveExpanded(key: string, expanded: readonly string[]): void {
  try {
    // Cap so one deep spelunk can't bloat storage.
    localStorage.setItem(
      LS_OPEN_PREFIX + key,
      JSON.stringify(expanded.slice(0, 500))
    );
  } catch {
    /* cosmetic only */
  }
}

/** Narrow an item handle to its directory variant (TS can't via the union). */
export function asDirectory(
  item: FileTreeItemHandle | null
): FileTreeDirectoryHandle | null {
  return item !== null && item.isDirectory()
    ? (item as FileTreeDirectoryHandle)
    : null;
}

/**
 * PHASE 155. The listing to model diff, as one pure function.
 *
 * It was inline in the effect below, and it is out here now because it is the
 * exact mechanism the operator's defect ran through and a mechanism nothing can
 * call on its own is a mechanism nothing can test. Read it as one sentence:
 * `fed` is what the model is BELIEVED to hold, `next` is what the listings say
 * is on disk, and the answer is the operations that carry the first to the
 * second plus the baseline they leave behind.
 *
 * THE LINE THE DEFECT LIVED ON is the add arm's `!fed.has(path)`. Anything that
 * writes a path into `fed` without the model gaining that row makes the row
 * unemittable for the life of the mount, by any route, including Refresh.
 * `reconcile` in `useTreeModel` is the answer to that, and it is why it asks the
 * model what it holds rather than trusting this baseline.
 */
export function planListingDiff(
  fed: ReadonlySet<string>,
  next: ReadonlySet<string>,
  isHeld: (path: string) => boolean
): { ops: FileTreeBatchOperation[]; applied: Set<string> } {
  const ops: FileTreeBatchOperation[] = [];
  const removedDirs: string[] = [];
  for (const path of fed) {
    if (next.has(path) || isHeld(path)) continue;
    // A recursive dir removal already covers its descendants.
    if (removedDirs.some((dir) => path !== dir && path.startsWith(dir))) {
      continue;
    }
    if (path.endsWith('/')) removedDirs.push(path);
    ops.push({ type: 'remove', path, recursive: true });
  }
  for (const path of next) {
    if (!fed.has(path) && !isHeld(path)) ops.push({ type: 'add', path });
  }
  // The baseline advances by the ops we ACTUALLY emitted, not to `next`
  // wholesale: a held path was deliberately left alone, and overwriting the
  // baseline with the disk's answer would forget it exists.
  const applied = new Set(fed);
  for (const op of ops) {
    if (op.type === 'add') {
      applied.add(op.path);
    } else if (op.type === 'remove') {
      applied.delete(op.path);
      if (!op.path.endsWith('/')) continue;
      for (const path of [...applied]) {
        if (path.startsWith(op.path)) applied.delete(path);
      }
    }
  }
  return { ops, applied };
}

/**
 * PHASE 155. The baseline Refresh rebuilds, from the rows that really exist.
 *
 * `holdsRow` is the model being asked a question about itself, one path at a
 * time. A path either side believes in is kept only if the model answers yes,
 * so a path the store knows and the model never got is DROPPED, which is what
 * lets the very next diff add it, and a row the model holds that the baseline
 * had forgotten is put BACK, which is what lets a later diff remove it.
 */
export function baselineFromModel(
  fed: ReadonlySet<string>,
  listed: ReadonlySet<string>,
  holdsRow: (path: string) => boolean
): Set<string> {
  const rebuilt = new Set<string>();
  for (const path of fed) if (holdsRow(path)) rebuilt.add(path);
  for (const path of listed) if (holdsRow(path)) rebuilt.add(path);
  return rebuilt;
}

// ---------------------------------------------------------------------------
// Styling that must live inside the shadow root
// ---------------------------------------------------------------------------

const TREE_UNSAFE_CSS = `
/* Deleted files keep their strikethrough (old .tree-name.strike rule). */
[data-item-git-status="deleted"] [data-item-section="content"] {
  text-decoration: line-through;
}

/* The dirty-descendant dot is a signal, not a hint. @pierre/trees ships it at
   opacity .5, which composites --git-modified down to ~3.2:1 on the sidebar —
   a dull olive next to the 9.1:1 M/U badge letters on the rows it summarizes.
   DESIGN.md §3 asks for the amber itself. */
[data-item-contains-git-change="true"] > [data-item-section="git"] {
  opacity: 1;
}

/* MOVE TARGET (Phase 12.9). The library paints a drop target with the
   selection background alone, which on a row that may also be selected says
   nothing. gmux's accent ring is the same language the split drop zone and
   the focused pane use, and it reads as "this folder will receive it" rather
   than "this row is selected". Custom properties inherit across the shadow
   boundary, so --accent is the app's own token, not a copy of it. */
[data-item-drag-target="true"] {
  box-shadow: inset 0 0 0 1px var(--accent);
  border-radius: var(--r-sm, 3px);
}

/* NAME FILTER, not search (Phase 12.9 item 4). The library's placeholder says
   "Search…", which is the one word this field must not say: ⌘P fuzzy-open and
   ⌘⇧F content search are Phase 14 and live elsewhere. This filters the rows
   already loaded in THIS explorer, so it says so. */
[data-file-tree-search-container] {
  position: relative;
}
[data-file-tree-search-input]::placeholder {
  color: transparent;
}
[data-file-tree-search-container]:has(
    [data-file-tree-search-input]:placeholder-shown
  )::after {
  content: 'Filter files by name';
  position: absolute;
  inset-block: 0;
  inset-inline-start: calc(
    var(--trees-padding-inline, 0px) + var(--trees-item-padding-x, 4px) + 1px
  );
  display: flex;
  align-items: center;
  pointer-events: none;
  color: var(--text-muted);
  font-family: var(--trees-font-family);
  font-size: var(--trees-font-size);
}
${FOLDER_ICON_CSS}`;

export function useTreeModel({
  rootPath,
  remote,
  isRemote,
  remoteWriteRoot,
  statusFiles,
  isRepo,
  density
}: TreeModelOptions) {
  const entriesByDir = useFileTree((s) => s.entriesByDir);
  const rootLoaded = useFileTree((s) => s.rootLoaded);
  const loadDir = useFileTree((s) => s.loadDir);
  /**
   * PHASE 102. May a rename gesture start on this tree at all?
   *
   * THE DEFECT THIS CLOSES was reachable in every build from Phase 90.3 to
   * Phase 101. `renaming.canRename` asked whether the verbs existed and whether
   * the path was protected, and it never asked which computer the row was on.
   * `createTreeOps` is called for every mounted root, a machine's included, so
   * F2 on a row of a folder on another machine opened the inline editor, and
   * committing it reached `fsOps.rename` against a path that is not on this
   * Mac. The menu never offered Rename, so the keyboard was the only way in.
   *
   * A tree on this Mac answers true, exactly as before. A tree on a machine
   * answers true only when that machine carries a confirmed folder and this
   * build can reach the channel, and the commit then lands on
   * `machines:renameEntry` and never on `fs:rename`.
   *
   * It is read through a ref because @pierre/trees captures its options once at
   * construction, and a person can confirm a folder in Settings while this tree
   * is mounted.
   */
  const canRenameHere =
    !isRemote || (remoteWriteRoot !== null && canWriteEntries());
  const canRenameHereRef = useRef(canRenameHere);
  canRenameHereRef.current = canRenameHere;
  const storeKey = useMemo(
    () => storageKeyFor(rootPath, remote?.machineId ?? null),
    [rootPath, remote]
  );

  // Canonical path set + kind lookup derived from the lazy listing cache.
  const treeInput = useMemo(() => {
    const paths = new Set<string>();
    const kinds = new Map<string, FsDirEntry['kind']>();
    for (const [dirAbs, entries] of Object.entries(entriesByDir)) {
      if (dirAbs !== rootPath && !dirAbs.startsWith(rootPath + '/')) continue;
      for (const entry of entries) {
        const rel = entry.path.slice(rootPath.length + 1);
        if (rel.length === 0) continue;
        kinds.set(rel, entry.kind);
        paths.add(entry.kind === 'dir' ? rel + '/' : rel);
      }
    }
    return { paths, kinds };
  }, [entriesByDir, rootPath]);

  // ----- what the repository ignores (Phase 47 item 1) ---------------------
  const ignoredPaths = useTreeIgnored((s) => s.ignored);
  const ignoredEpoch = useTreeIgnored((s) => s.epoch);
  const syncIgnored = useTreeIgnored((s) => s.sync);
  const resetIgnored = useTreeIgnored((s) => s.reset);

  // Pierre git-lane entries + the conflict overlay set +, from Phase 47, the
  // ignored entries and the directories whose dirty-descendant dot they would
  // otherwise turn on by mistake. The rules are in decorations.ts and
  // ignored.ts so they can be tested without a tree.
  const gitState = useMemo(() => {
    const lane = treeGitLane(statusFiles, ignoredPaths);
    return {
      ...lane,
      dotSuppression: ignoredOnlyAncestors(ignoredPaths, lane.changed)
    };
  }, [statusFiles, ignoredPaths]);

  const conflictsRef = useRef(gitState.conflicts);
  conflictsRef.current = gitState.conflicts;

  // Conflict '!' rides the custom decoration lane next to the git lane.
  // Captured once by the model at construction — reads through the ref.
  const renderConflictDecoration = useCallback(
    (ctx: FileTreeRowDecorationContext): FileTreeRowDecoration | null => {
      if (ctx.item.kind !== 'file') return null;
      if (!conflictsRef.current.has(ctx.item.path)) return null;
      return {
        text: '!',
        title: 'Merge conflict',
        parts: [{ text: '!', color: 'var(--git-conflict)' }]
      };
    },
    []
  );

  // ----- everything the once-captured model options reach through ----------
  const hostRef = useRef<HTMLDivElement | null>(null);
  /**
   * Deadline stamped by a close the user asked for (Phase 47 item 2). The
   * filter guard below reopens every other close; this is how the header
   * toggle, the clear button, Escape and a starting rename say "I meant it".
   */
  const sanctionUntilRef = useRef(0);
  const sanctionFilterClose = useCallback((): void => {
    sanctionUntilRef.current = Date.now() + FILTER_SANCTION_MS;
  }, []);
  /** @pierre/trees' shadow root, once the tree has mounted. */
  const treeShadow = useCallback(
    (): ShadowRoot | null =>
      hostRef.current?.querySelector('file-tree-container')?.shadowRoot ??
      null,
    []
  );
  const opsRef = useRef<TreeOps | null>(null);
  const openMenuRef = useRef<
    ((item: ContextMenuItem, ctx: ContextMenuOpenContext) => void) | null
  >(null);

  /**
   * `.git` is never a drag source, and search freezes dragging (library).
   * A PENDING CREATE's row is not draggable either (Phase 37): while the
   * inline name editor is open there is nothing on disk behind the row.
   */
  const canDrag = useCallback(
    (paths: readonly string[]): boolean => {
      // PHASE 90.3, and PHASE 102 REWROTE THE REASON. It read "there is no
      // write script for another machine", and Phase 102 shipped one that
      // moves an entry. The refusal stays, and its reason is the second half
      // alone. `beginTreeDrag` arms the terminal pane's ATTACH contract with
      // ABSOLUTE paths, and an absolute path from another machine names a file
      // on this Mac or nothing at all. Refusing at the SOURCE is what keeps a
      // drag from arming that contract. The drop half refuses again below.
      if (isRemote) return false;
      const ops = opsRef.current;
      if (ops === null || paths.some(isProtectedFsPath)) return false;
      const pending = ops.pendingPath();
      return pending === null || !paths.includes(pending);
    },
    [isRemote]
  );

  /**
   * `.git` is never a destination either — the same one shared predicate.
   * Nor is a pending folder (Phase 37); its real parent still is.
   */
  const canDropInto = useCallback(
    (event: FileTreeDropContext): boolean => {
      if (isRemote) return false;
      const dir = event.target.directoryPath;
      if (dir === null) return true;
      if (isProtectedFsPath(dir)) return false;
      return dir !== opsRef.current?.pendingPath();
    },
    [isRemote]
  );

  /** Pierre moved its own rows first; the disk is asked second. */
  const onDropComplete = useCallback((event: FileTreeDropResult): void => {
    opsRef.current?.drop(
      event.draggedPaths,
      event.target.directoryPath ?? '',
      true
    );
  }, []);

  /**
   * The model REFUSED the move — in practice because the destination already
   * holds that name, which is exactly the case that must prompt rather than
   * clobber. Nothing moved in the model, so the verb owns both sides.
   */
  const onDropError = useCallback(
    (_message: string, event: FileTreeDropContext): void => {
      opsRef.current?.drop(
        event.draggedPaths,
        event.target.directoryPath ?? '',
        false
      );
    },
    []
  );

  // Model construction snapshot: usePierreModel captures options on the first
  // render only; later listings/status flow through the effects below.
  const initialRef = useRef<{ paths: string[]; expanded: string[] } | null>(
    null
  );
  initialRef.current ??= {
    paths: [...treeInput.paths],
    expanded: loadExpanded(rootPath, storeKey)
  };
  const initial = initialRef.current;

  const model = usePierreModel({
    paths: initial.paths,
    initialExpandedPaths: initial.expanded,
    gitStatus: gitState.entries,
    icons: getPierreTreeIcons(),
    // Row height comes from the library's own density presets now (24 / 30 /
    // 36 px) rather than a hard-coded 24, so the keyword also scales the row's
    // horizontal padding the way the library intends. Captured once, like
    // every other option here — FilesSection re-mounts the tree on a change.
    density,
    overscan: 8,
    renderRowDecoration: renderConflictDecoration,
    unsafeCSS: TREE_UNSAFE_CSS,
    // ---- Phase 12.9 -------------------------------------------------------
    dragAndDrop: {
      canDrag,
      canDrop: canDropInto,
      onDropComplete,
      onDropError
    },
    renaming: {
      // The library closes the filter inside `startRenaming`, right after
      // this predicate says yes (model/FileTreeController.js). Stamping the
      // sanction here is what stops the guard from reopening the filter over
      // the inline name editor. A refusal stamps nothing.
      canRename: (item) => {
        const allowed =
          opsRef.current !== null &&
          !isProtectedFsPath(item.path) &&
          canRenameHereRef.current;
        if (allowed) sanctionFilterClose();
        return allowed;
      },
      onRename: (event) => opsRef.current?.onRenameCommitted(event),
      onError: (message) => opsRef.current?.onRenameRejected(message)
    },
    search: true,
    // Show matches with their ancestor folders and nothing else — the only
    // one of the three modes that makes a filtered tree scannable at a
    // glance. See DESIGN-SPEC S3B for the full argument.
    fileTreeSearchMode: 'hide-non-matches',
    composition: {
      contextMenu: {
        enabled: true,
        // No trigger button: the row is 24px and the ⋯ lane would cost the
        // name its width. Right-click and the keyboard menu key both route
        // through `onOpen`, which is where the NATIVE menu is raised.
        triggerMode: 'right-click',
        onOpen: (item, context) => openMenuRef.current?.(item, context)
      }
    }
  }).model;

  // ----- listings → model (diff the fed path set, batch the delta) --------
  const fedRef = useRef<Set<string>>(new Set(initial.paths));
  const restoredRef = useRef<Set<string>>(new Set());

  /**
   * Paths a file operation has frozen against this diff (see `hold` in
   * tree-ops.ts). While an operation is in flight the model and the disk
   * legitimately disagree, and the watcher fires every ~450 ms whenever
   * anything writes — refereeing that disagreement is how a New Folder's
   * inline-rename row got deleted mid-type in the live probe.
   */
  // Counted, not a plain set: two operations can legitimately hold the same
  // path (drop a file, then immediately drop it again), and the first release
  // must not unlock it out from under the second.
  const heldRef = useRef<Map<string, number>>(new Map());
  const [syncTick, setSyncTick] = useState(0);
  const isHeld = useCallback((path: string): boolean => {
    for (const held of heldRef.current.keys()) {
      if (path === held) return true;
      if (held.endsWith('/') && path.startsWith(held)) return true;
    }
    return false;
  }, []);
  const hold = useCallback((paths: readonly string[]): (() => void) => {
    const held = heldRef.current;
    for (const path of paths) held.set(path, (held.get(path) ?? 0) + 1);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      for (const path of paths) {
        const count = (held.get(path) ?? 1) - 1;
        if (count > 0) held.set(path, count);
        else held.delete(path);
      }
      // Re-run the diff now that the two are allowed to agree again.
      setSyncTick((n) => n + 1);
    };
  }, []);

  /**
   * PHASE 155. What the store last said, for `reconcile` below to read. The
   * diff effect gets it from its own closure; a button press has no closure.
   */
  const pathsRef = useRef<ReadonlySet<string>>(treeInput.paths);
  useEffect(() => {
    pathsRef.current = treeInput.paths;
  }, [treeInput]);

  /**
   * PHASE 155. Make the Refresh button incapable of doing nothing.
   *
   * The store half of Refresh already cannot be a no-op (see `listInto` in
   * store.ts). This is the other half, and it is the one that failed him: the
   * diff above only ever emits an add for a path `fed` does not already claim,
   * so a baseline that has drifted starves every future refresh of that path,
   * by any route, for the life of the mount. Refresh is the manual override, so
   * it trusts nothing it has been told and asks the MODEL what it holds.
   *
   * Two things go, in this order:
   *
   * 1. THE BASELINE IS REBUILT FROM THE ROWS THAT REALLY EXIST. A path is kept
   *    only if `model.getItem` answers with something. A path the store knows
   *    about and the model never got is dropped from the baseline, which is
   *    what lets the next pass add it. A row the model holds that the baseline
   *    had forgotten is put back, which is what lets a later pass remove it.
   * 2. EVERY HOLD IS DROPPED. A hold is a promise that some operation will
   *    finish and release it, and a hold that leaks would swallow every future
   *    refresh with nothing logged. The two gestures a person can hold open for
   *    seconds were MEASURED across a press in the real app rather than argued
   *    about here: an inline rename with a name already typed keeps the same
   *    input node and the same characters, and a New Entry placeholder with a
   *    name typed keeps both and still creates the file when Return is pressed
   *    after the press. The one window that cannot be driven from outside is
   *    the sub second one inside an optimistic move, where the model holds the
   *    destination row before main has answered. A press landing exactly there
   *    would put that row into the baseline, the same diff would take it away
   *    again because the disk does not have it yet, and the move's own re-list
   *    would put it back. That is a flicker that heals itself rather than a
   *    lost row, and it is the price of a Refresh that cannot be swallowed.
   */
  const reconcile = useCallback((): void => {
    fedRef.current = baselineFromModel(
      fedRef.current,
      pathsRef.current,
      (path) => model.getItem(path) !== null
    );
    heldRef.current.clear();
    setSyncTick((n) => n + 1);
  }, [model]);

  useEffect(() => {
    const fed = fedRef.current;
    const next = treeInput.paths;
    const { ops, applied } = planListingDiff(fed, next, isHeld);
    if (ops.length > 0) {
      try {
        model.batch(ops);
      } catch {
        // Divergence recovery: rebuild from the canonical listing cache,
        // preserving what is currently expanded.
        const expanded = [...fedRef.current].filter((p) => {
          if (!p.endsWith('/')) return false;
          return asDirectory(model.getItem(p))?.isExpanded() === true;
        });
        model.resetPaths([...applied], { initialExpandedPaths: expanded });
      }
      fedRef.current = applied;
    }
    // Re-open persisted dirs as their paths materialize (deep restores).
    for (const dir of initial.expanded) {
      if (restoredRef.current.has(dir) || !next.has(dir)) continue;
      restoredRef.current.add(dir);
      const item = asDirectory(model.getItem(dir));
      if (item !== null && !item.isExpanded()) item.expand();
    }
  }, [model, treeInput, initial, isHeld, syncTick]);

  // Re-list directories that were open in a previous run (persisted state)
  // so restored folders show their children, not empty shells.
  useEffect(() => {
    if (!rootLoaded) return;
    for (const dir of initial.expanded) {
      if (dir.endsWith('/')) void loadDir(rootPath + '/' + dir.slice(0, -1));
    }
  }, [rootLoaded, initial, rootPath, loadDir]);

  // ----- git status → model ------------------------------------------------
  useEffect(() => {
    model.setGitStatus(gitState.entries);
  }, [model, gitState]);

  // ----- ignored paths → the same lane (Phase 47 item 1) -------------------
  // Every time the listing grows, ask git about the paths it has not answered
  // for yet. The store drops everything under a directory it already knows is
  // ignored, so expanding node_modules costs no call at all. `ignoredEpoch`
  // is in the deps so a .gitignore edit re-asks about everything.
  useEffect(() => {
    // PHASE 90.3. A tab on another machine is dropped here rather than inside
    // the store, because there is nothing to ask and nothing to keep: git
    // check-ignore reads THIS Mac, and dimming another machine's rows from this
    // Mac's answers is exactly the wrong machine defect this round removes.
    if (!isRepo || isRemote) {
      resetIgnored();
      return;
    }
    void syncIgnored(workspaceTarget(rootPath, null), treeInput.paths);
  }, [
    isRepo,
    isRemote,
    rootPath,
    treeInput,
    ignoredEpoch,
    syncIgnored,
    resetIgnored
  ]);

  // The false dirty-descendant dot, removed. See ignoredOnlyAncestors in
  // ignored.ts for why the library puts one there and why it is wrong.
  // The style element is the tree's own, appended beside the one the library
  // writes for `unsafeCSS`; the library never touches an element it did not
  // create, and preact renders into a wrapper div, not into the shadow root.
  const dotSuppression = gitState.dotSuppression;
  useEffect(() => {
    const shadow = treeShadow();
    if (shadow === null) return;
    const css = ignoredDotSuppressionCss(dotSuppression);
    let style = shadow.querySelector('style[data-gmux-ignored-dots]');
    if (css.length === 0) {
      style?.remove();
      return;
    }
    if (!(style instanceof HTMLStyleElement)) {
      style = document.createElement('style');
      style.setAttribute('data-gmux-ignored-dots', '');
      shadow.appendChild(style);
    }
    if (style.textContent !== css) style.textContent = css;
  }, [dotSuppression, treeShadow]);

  /**
   * Every folder the model currently has open. Three callers need exactly
   * this walk — the lazy-listing watch, the persisted expansion set, and the
   * header's Collapse All — and they must never disagree about what "open"
   * means, so they ask the same function.
   */
  const openDirs = useCallback(
    (): string[] =>
      expandedDirs(
        fedRef.current,
        (path) => asDirectory(model.getItem(path))?.isExpanded() === true
      ),
    [model]
  );

  const rootEmpty = rootLoaded && (entriesByDir[rootPath]?.length ?? 0) === 0;

  return {
    model,
    treeInput,
    /** The git lane the model is fed, plus the dots Phase 47 takes back off. */
    gitState,
    /** True when the listing has arrived and the root holds nothing. */
    rootEmpty,
    /** The expansion set this mount started from, for the watch below. */
    initialExpanded: initial.expanded,
    storeKey,
    hostRef,
    treeShadow,
    opsRef,
    openMenuRef,
    fedRef,
    hold,
    /** PHASE 155. What the Refresh button calls so it can never be a no-op. */
    reconcile,
    openDirs,
    sanctionFilterClose,
    sanctionUntilRef
  };
}

/** Everything the component and the other three hooks read off the model. */
export type TreeModelBridge = ReturnType<typeof useTreeModel>;

export interface TreeExpansionWatchOptions
  extends Pick<
    TreeModelBridge,
    'model' | 'opsRef' | 'openDirs' | 'storeKey' | 'initialExpanded'
  > {
  rootPath: string;
}

/**
 * The lazy listing and the persisted expansion set, watched off one model
 * subscription.
 *
 * It is a second exported hook rather than part of useTreeModel above so that
 * FileTree can call it AFTER useTreeRename. That keeps this effect in the exact
 * position it has run in since Phase 12.9, which is after the verbs exist, so
 * the first `settle()` at mount reads the same `opsRef` it always did.
 */
export function useTreeExpansionWatch({
  model,
  rootPath,
  storeKey,
  opsRef,
  openDirs,
  initialExpanded
}: TreeExpansionWatchOptions): void {
  const loadDir = useFileTree((s) => s.loadDir);
  // ----- expansion watch: lazy listing + persistence ----------------------
  const expandedRef = useRef<Set<string>>(new Set(initialExpanded));
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setExpandedCount = useTreeHandle((s) => s.setExpandedCount);
  useEffect(() => {
    let scheduled = false;
    const check = (): void => {
      scheduled = false;
      // Esc out of a New File / New Folder and the library takes the
      // placeholder row back out with no callback at all; this is where that
      // gesture's hold on the diff is noticed and freed.
      opsRef.current?.settle();
      const expanded = openDirs();
      // What the header's Collapse All reads to know whether it has anything
      // to do — same walk, no second source of truth.
      setExpandedCount(expanded.length);
      for (const dir of expanded) {
        if (!expandedRef.current.has(dir)) {
          void loadDir(rootPath + '/' + dir.slice(0, -1));
        }
      }
      expandedRef.current = new Set(expanded);
      if (saveTimer.current !== null) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        saveTimer.current = null;
        saveExpanded(storeKey, expanded);
      }, 250);
    };
    const unsubscribe = model.subscribe(() => {
      if (!scheduled) {
        scheduled = true;
        queueMicrotask(check);
      }
    });
    check();
    return () => {
      unsubscribe();
      if (saveTimer.current !== null) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
        saveExpanded(storeKey, [...expandedRef.current]);
      }
    };
  }, [model, rootPath, storeKey, loadDir, openDirs, setExpandedCount]);
}

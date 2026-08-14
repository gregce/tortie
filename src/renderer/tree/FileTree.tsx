/**
 * The project file tree (@pierre/trees) — S3 "Tree row" spec, Phase 11 swap,
 * Phase 12.9 file management.
 *
 * Rows [h:24] render inside Pierre's shadow DOM: chevron (folders) ·
 * material icon 16px — per-type for files, the generic folder pair for
 * directories (Phase 9 subset via a custom sprite sheet + the folder CSS in
 * pierre-icons.ts) · name · built-in git lane (status letter + color,
 * folder dot propagation — previously hand-rolled). Conflicted files add a
 * '!' row decoration in --git-conflict (Pierre has no conflict status).
 * Click / Enter on a file emits an open-in-editor request (diff mode when
 * the file has tracked changes).
 *
 * The Pierre model is path-first and imperative: lazy fs:readDir listings
 * from tree/store.ts are diffed into it via `batch`, expansion is watched
 * through `subscribe` to drive on-expand listing + per-project persistence,
 * and git status is fed with `setGitStatus` (aggregation is built in).
 * Theming crosses the shadow boundary only through the theme bridge
 * (src/renderer/pierre/theme-bridge.ts) — mount this component fresh per
 * project root (FilesSection keys it by rootPath).
 *
 * ── PHASE 12.9 — what this component now owns ─────────────────────────────
 * · CONTEXT MENU (item 2) via the library's `composition.contextMenu`, opened
 *   through `onOpen` into the NATIVE macOS menu (DESIGN.md §3 forbids a
 *   DOM-drawn one, so the React `renderContextMenu` slot stays empty). The
 *   verbs themselves live in tree-ops.ts; the shape lives in tree-menu.ts.
 * · DRAG TO MOVE (item 3) with `canDrag` locking `.git` and `canDrop` locking
 *   it as a destination, plus a ROOT drop on the empty space below the rows —
 *   Pierre only offers the root through a top-level FILE row, which is not
 *   where anyone aims.
 * · NAME FILTER (item 4): the library's own field, `hide-non-matches`.
 *
 * ── ONE DRAG, TWO MEANINGS ────────────────────────────────────────────────
 * A drag that starts here means MOVE over the tree and ATTACH over a terminal
 * pane. The contract is written once in terminal/drop/tree-drag.ts; this
 * component performs the tree's three obligations and nothing else — it arms
 * `beginTreeDrag` on the host's bubbled dragstart, it never installs a
 * window-level drag listener, and it never preventDefaults a dragover outside
 * its own box. The one line that is easy to miss is `effectAllowed`: Pierre
 * stamps 'move', and Chromium then REFUSES the pane's 'copy' outright (the
 * drop event never fires). Widening it to 'copyMove' is what lets the cursor
 * name which family you are in.
 *
 * Model options are captured ONCE (usePierreModel snapshots them on the first
 * render), so every callback below reads the live state through a ref.
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import type {
  FileTreeBatchOperation,
  ContextMenuItem,
  ContextMenuOpenContext,
  FileTreeDirectoryHandle,
  FileTreeDropContext,
  FileTreeDropResult,
  FileTreeItemHandle,
  FileTreeRowDecoration,
  FileTreeRowDecorationContext,
  GitStatusEntry
} from '@pierre/trees';
import {
  FileTree as PierreTree,
  useFileTree as usePierreModel,
  useFileTreeSearch
} from '@pierre/trees/react';
import { isProtectedFsPath } from '@shared/fs-ops';
import type { FsDirEntry, GitFileStatus } from '@shared/types';
import { useApp } from '../state/store';
import { showOneTimeTip } from '../app/one-time-tip';
import { treeStyles } from '../pierre/theme-bridge';
import { beginTreeDrag } from '../terminal/drop/tree-drag';
import { isConflicted, openModeFor, pierreGitStatus } from './decorations';
import { entryNameVerdict } from './entry-name';
import type { EntryNameVerdict } from './entry-name';
import { canReveal, reveal } from './fs-bridge';
import { canDuplicate, canMutate } from './fs-ops-bridge';
import { expandedDirs, headerDestDir } from './header-actions';
import { requestOpenFile } from './open-file';
import { FOLDER_ICON_CSS, getPierreTreeIcons } from './pierre-icons';
import { resolveTreeEditor } from './rename-view';
import type { TreeEditorBridge } from './rename-view';
import { useFileTree } from './store';
import { useTreeHandle } from './tree-handle';
import {
  buildTreeMenu,
  copiedMessage,
  pathsForClipboard
} from './tree-menu';
import { createTreeOps } from './tree-ops';
import type { TreeOps } from './tree-ops';
import { absOf, baseNameOf, isDirPath, parentOf, toRel } from './tree-paths';

// ---------------------------------------------------------------------------
// Persisted expansion state (per project root)
// ---------------------------------------------------------------------------

const LS_OPEN_PREFIX = 'gmux.treeOpen.';

/**
 * Read the persisted expanded-dir list: canonical Pierre paths (root-relative,
 * trailing '/'). Tolerates the pre-Phase-11 arborist format (absolute path →
 * true) so existing expansion state survives the swap.
 */
function loadExpanded(rootPath: string): string[] {
  try {
    const raw = localStorage.getItem(LS_OPEN_PREFIX + rootPath);
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

function saveExpanded(rootPath: string, expanded: readonly string[]): void {
  try {
    // Cap so one deep spelunk can't bloat storage.
    localStorage.setItem(
      LS_OPEN_PREFIX + rootPath,
      JSON.stringify(expanded.slice(0, 500))
    );
  } catch {
    /* cosmetic only */
  }
}

// ---------------------------------------------------------------------------
// Shadow-DOM row lookup (Pierre rows carry data-item-path / data-item-type)
// ---------------------------------------------------------------------------

/** Narrow an item handle to its directory variant (TS can't via the union). */
function asDirectory(
  item: FileTreeItemHandle | null
): FileTreeDirectoryHandle | null {
  return item !== null && item.isDirectory()
    ? (item as FileTreeDirectoryHandle)
    : null;
}

interface RowHit {
  /** Canonical Pierre path — root-relative, dirs end with '/'. */
  rel: string;
  type: 'file' | 'folder';
}

function rowFromEvent(event: Event): RowHit | null {
  for (const target of event.composedPath()) {
    if (!(target instanceof HTMLElement)) continue;
    const rel = target.dataset['itemPath'];
    if (rel !== undefined) {
      return { rel, type: target.dataset['itemType'] === 'folder' ? 'folder' : 'file' };
    }
  }
  return null;
}

/**
 * True when the keystroke came out of a text field inside the tree — the
 * rename input or the filter field. Pierre passes unhandled keys straight
 * through from both, so without this ⌫ in a rename would delete the file
 * being renamed.
 */
function fromTextField(event: Event): boolean {
  return event
    .composedPath()
    .some(
      (target) =>
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement
    );
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

// ---------------------------------------------------------------------------
// FileTree
// ---------------------------------------------------------------------------

export function FileTree({
  rootPath,
  statusFiles
}: {
  rootPath: string;
  statusFiles: readonly GitFileStatus[];
}): React.JSX.Element {
  const entriesByDir = useFileTree((s) => s.entriesByDir);
  const rootLoaded = useFileTree((s) => s.rootLoaded);
  const loadDir = useFileTree((s) => s.loadDir);
  const setMenu = useApp((s) => s.setMenu);
  const toast = useApp((s) => s.toast);

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

  // Pierre git-lane entries + the conflict overlay set.
  const gitState = useMemo(() => {
    const entries: GitStatusEntry[] = [];
    const conflicts = new Set<string>();
    const byPath = new Map<string, GitFileStatus>();
    for (const file of statusFiles) {
      byPath.set(file.path, file);
      const status = pierreGitStatus(file);
      if (status === null) continue;
      entries.push({ path: file.path, status });
      if (isConflicted(file)) conflicts.add(file.path);
    }
    return { entries, conflicts, byPath };
  }, [statusFiles]);

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
  const opsRef = useRef<TreeOps | null>(null);
  /** Bumped when the verbs exist, so the handle effect can wait for them. */
  const [opsCreated, setOpsCreated] = useState(0);
  const openMenuRef = useRef<
    ((item: ContextMenuItem, ctx: ContextMenuOpenContext) => void) | null
  >(null);

  /**
   * `.git` is never a drag source, and search freezes dragging (library).
   * A PENDING CREATE's row is not draggable either (Phase 37): while the
   * inline name editor is open there is nothing on disk behind the row.
   */
  const canDrag = useCallback((paths: readonly string[]): boolean => {
    const ops = opsRef.current;
    if (ops === null || paths.some(isProtectedFsPath)) return false;
    const pending = ops.pendingPath();
    return pending === null || !paths.includes(pending);
  }, []);

  /**
   * `.git` is never a destination either — the same one shared predicate.
   * Nor is a pending folder (Phase 37); its real parent still is.
   */
  const canDropInto = useCallback((event: FileTreeDropContext): boolean => {
    const dir = event.target.directoryPath;
    if (dir === null) return true;
    if (isProtectedFsPath(dir)) return false;
    return dir !== opsRef.current?.pendingPath();
  }, []);

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
    expanded: loadExpanded(rootPath)
  };
  const initial = initialRef.current;

  const model = usePierreModel({
    paths: initial.paths,
    initialExpandedPaths: initial.expanded,
    gitStatus: gitState.entries,
    icons: getPierreTreeIcons(),
    itemHeight: 24,
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
      canRename: (item) =>
        opsRef.current !== null && !isProtectedFsPath(item.path),
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

  useEffect(() => {
    const fed = fedRef.current;
    const next = treeInput.paths;
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
    if (ops.length > 0) {
      // The baseline advances by the ops we ACTUALLY emitted, not to `next`
      // wholesale: a held path was deliberately left alone, and overwriting
      // the baseline with the disk's answer would forget it exists.
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

  // ----- the rename-editor bridge (Phase 37) -------------------------------
  // Resolved lazily and kept for the mount: the controller the adapter finds
  // lives exactly as long as this model does. A null result is retried (the
  // tree may not have been mounted yet); a resolved bridge never changes.
  const editorBridgeRef = useRef<TreeEditorBridge | null>(null);
  const editorBridge = useCallback((): TreeEditorBridge | null => {
    editorBridgeRef.current ??= resolveTreeEditor(hostRef.current);
    return editorBridgeRef.current;
  }, []);

  const treeShadow = useCallback(
    (): ShadowRoot | null =>
      hostRef.current?.querySelector('file-tree-container')?.shadowRoot ??
      null,
    []
  );

  // ----- the verbs ---------------------------------------------------------
  // Built once per mounted root: they hold the model and the feed baseline,
  // which are exactly the two things a file operation has to keep in step.
  useEffect(() => {
    opsRef.current = createTreeOps({
      rootPath,
      model,
      readFed: () => fedRef.current,
      writeFed: (next) => {
        fedRef.current = next;
      },
      hold,
      renameView: () => editorBridge()?.view ?? null,
      selectOnly: (canonical) => editorBridge()?.selectOnly(canonical)
    });
    setOpsCreated((n) => n + 1);
    return () => {
      opsRef.current = null;
    };
  }, [model, rootPath, hold, editorBridge]);

  // ----- the create editor's live refusal (Phase 37) ------------------------
  // While a New File / New Folder editor is open, every keystroke is judged
  // by entryNameVerdict and a bad name shows its reason under the box; Enter
  // on a bad name is stopped in the CAPTURE phase on this host, so the
  // library's own commit (bubble phase, inside the shadow root) never runs.
  const [nameError, setNameError] = useState<{
    message: string;
    top: number;
    left: number;
    maxWidth: number;
  } | null>(null);
  const nameErrorShownRef = useRef(false);
  nameErrorShownRef.current = nameError !== null;

  /** The verdict on the pending create's current text, or null when idle. */
  const pendingVerdict = useCallback((): EntryNameVerdict | null => {
    const pendingPath = opsRef.current?.pendingPath() ?? null;
    if (pendingPath === null) return null;
    const view = editorBridge()?.view ?? null;
    if (view === null || view.getPath() !== pendingPath) return null;
    const parent = parentOf(pendingPath);
    const taken = new Set<string>();
    for (const path of fedRef.current) {
      if (parentOf(path) === parent) taken.add(baseNameOf(path).toLowerCase());
    }
    return entryNameVerdict(view.getValue(), taken);
  }, [editorBridge]);

  /** Show, move or hide the reason element to match the live verdict. */
  const refreshNameError = useCallback((): void => {
    const verdict = pendingVerdict();
    const input = treeShadow()?.querySelector('[data-item-rename-input]');
    if (verdict === null || verdict.kind !== 'bad') {
      if (input instanceof HTMLElement) input.removeAttribute('aria-invalid');
      setNameError(null);
      return;
    }
    const host = hostRef.current;
    if (!(input instanceof HTMLElement) || host === null) {
      setNameError(null);
      return;
    }
    input.setAttribute('aria-invalid', 'true');
    const inputRect = input.getBoundingClientRect();
    const hostRect = host.getBoundingClientRect();
    setNameError({
      message: verdict.reason,
      top: inputRect.bottom - hostRect.top + 2,
      left: Math.max(0, inputRect.left - hostRect.left),
      maxWidth: Math.max(120, hostRect.right - inputRect.left - 8)
    });
  }, [pendingVerdict, treeShadow]);

  useEffect(() => {
    const host = hostRef.current;
    if (host === null) return;
    // `input` is a composed event, so it crosses the shadow boundary and
    // bubbles to this host — one listener judges every keystroke.
    const onInput = (): void => {
      if (opsRef.current?.pendingPath() != null) refreshNameError();
    };
    const onKeyDownCapture = (event: KeyboardEvent): void => {
      if (event.key !== 'Enter' || event.isComposing) return;
      const verdict = pendingVerdict();
      if (verdict === null || verdict.kind !== 'bad') return;
      // Bad name: the commit never runs, the editor stays open, focus stays
      // in the box, and the reason stays visible. Ok and empty fall through.
      event.preventDefault();
      event.stopPropagation();
      refreshNameError();
    };
    host.addEventListener('input', onInput);
    host.addEventListener('keydown', onKeyDownCapture, true);
    return () => {
      host.removeEventListener('input', onInput);
      host.removeEventListener('keydown', onKeyDownCapture, true);
    };
  }, [pendingVerdict, refreshNameError]);

  // Hide (or re-place) the reason when the editor closes or the rows move —
  // every one of those emits on the model.
  useEffect(() => {
    const unsubscribe = model.subscribe(() => {
      queueMicrotask(() => {
        if (nameErrorShownRef.current) refreshNameError();
      });
    });
    return unsubscribe;
  }, [model, refreshNameError]);

  // Scroll does not compose, so a host listener would never hear the shadow
  // tree scrolling under the box — the capture listener sits on the shadow
  // root itself, and only while the reason is showing.
  const nameErrorShown = nameError !== null;
  useEffect(() => {
    if (!nameErrorShown) return;
    const shadow = treeShadow();
    const reposition = (): void => {
      refreshNameError();
    };
    shadow?.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      shadow?.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [nameErrorShown, treeShadow, refreshNameError]);

  // ----- expansion watch: lazy listing + persistence ----------------------
  const expandedRef = useRef<Set<string>>(new Set(initial.expanded));
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setExpandedCount = useTreeHandle((s) => s.setExpandedCount);
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
        saveExpanded(rootPath, expanded);
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
        saveExpanded(rootPath, [...expandedRef.current]);
      }
    };
  }, [model, rootPath, loadDir, openDirs, setExpandedCount]);

  // ----- the name filter ---------------------------------------------------
  const search = useFileTreeSearch(model);
  const registerHandle = useTreeHandle((s) => s.register);
  const setFilterOpen = useTreeHandle((s) => s.setFilterOpen);

  useEffect(() => {
    const ops = opsRef.current;
    if (ops === null) return;
    registerHandle({
      rootPath,
      toggleFilter: () => {
        if (model.isSearchOpen()) model.closeSearch();
        else model.openSearch();
      },
      filterValue: () => model.getSearchValue(),
      ops,
      paths: () => [...fedRef.current],
      startRename: (canonical) => ops.startRename(canonical),
      newEntryTarget: () => headerDestDir(model.getSelectedPaths()),
      collapseAll: () => {
        // Deepest first, so a parent is never closed out from under a child
        // that is still open — Collapse All has to leave NOTHING expanded, or
        // re-opening one folder spills a whole subtree back.
        const open = openDirs().sort((a, b) => b.length - a.length);
        for (const path of open) asDirectory(model.getItem(path))?.collapse();
        return open.length;
      },
      shadowRoot: () =>
        hostRef.current?.querySelector('file-tree-container')?.shadowRoot ??
        null
    });
    return () => registerHandle(null);
    // opsCreated re-runs this once the verbs exist (the effect above).
  }, [model, rootPath, registerHandle, openDirs, opsCreated]);

  useEffect(() => {
    setFilterOpen(search.isOpen);
  }, [search.isOpen, setFilterOpen]);

  // The library's field carries no accessible name (it labels itself only
  // through aria-controls). Naming it is a two-line effect, not a fork.
  useEffect(() => {
    if (!search.isOpen) return;
    const input = hostRef.current
      ?.querySelector('file-tree-container')
      ?.shadowRoot?.querySelector('[data-file-tree-search-input]');
    if (input instanceof HTMLInputElement) {
      input.setAttribute('aria-label', 'Filter files by name');
    }
  }, [search.isOpen]);

  // Pierre shows the WHOLE tree when a query matches nothing (rather than an
  // empty void), so the only honest signal is a line that says so — and says
  // what the filter can see, since it can only match rows already listed.
  const filterMissed =
    search.isOpen &&
    search.value.trim().length > 0 &&
    search.matchingPaths.length === 0;

  // ----- gestures ----------------------------------------------------------

  /**
   * `keep` is VS Code's preview-tab distinction (Phase 12 item 5): a single
   * click opens a PREVIEW tab that the next single click recycles, while a
   * double-click or ↩ opens the file for keeps and the strip accumulates.
   */
  const openRel = useCallback(
    (canonical: string, keep = false): void => {
      const rel = toRel(canonical);
      const kind = treeInput.kinds.get(rel);
      if (kind === 'other') return; // sockets/FIFOs/devices stay inert
      requestOpenFile({
        repoPath: rootPath,
        relPath: rel,
        path: rootPath + '/' + rel,
        // Canonical bus mode: 'file' is the plain-open gesture.
        mode: openModeFor(gitState.byPath.get(rel)) === 'diff' ? 'diff' : 'file',
        source: 'tree',
        preview: !keep
      });
    },
    [rootPath, treeInput, gitState]
  );

  // Pierre selects/focuses on click internally; opening is ours. A modified
  // click is a SELECTION gesture (⌘ toggles, ⇧ ranges) — opening a file the
  // user was only adding to a selection is the classic multi-select bug.
  const onClick = useCallback(
    (e: React.MouseEvent): void => {
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;
      const row = rowFromEvent(e.nativeEvent);
      if (row === null) return;
      // A pending create's row is not openable (Phase 37) — there is no file
      // yet. The click still blurs the editor, and the blur rules decide.
      if (row.rel === opsRef.current?.pendingPath()) return;
      if (row.type === 'file') openRel(row.rel);
    },
    [openRel]
  );

  const onDoubleClick = useCallback(
    (e: React.MouseEvent): void => {
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;
      const row = rowFromEvent(e.nativeEvent);
      if (row === null) return;
      if (row.rel === opsRef.current?.pendingPath()) return;
      if (row.type === 'file') openRel(row.rel, true);
    },
    [openRel]
  );

  /**
   * ↩ activates and ⌫ deletes. Pierre handles F2 (rename), the arrows, ⌘A and
   * type-to-filter itself and stops those keys inside the shadow root; what
   * reaches here is what it left alone. Keys typed into the rename input or
   * the filter field come through unhandled too, which is why `fromTextField`
   * is a hard gate rather than a nicety.
   */
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent): void => {
      if (fromTextField(e.nativeEvent) || model.isSearchOpen()) return;

      if (e.key === 'Enter') {
        const rel = model.getFocusedPath();
        if (rel === null) return;
        e.preventDefault();
        const dir = asDirectory(model.getItem(rel));
        if (dir !== null) dir.toggle();
        else openRel(rel, true);
        return;
      }

      if (e.key === 'Backspace' || e.key === 'Delete') {
        const selected = model.getSelectedPaths();
        const focused = model.getFocusedPath();
        const targets =
          selected.length > 0 ? selected : focused === null ? [] : [focused];
        if (targets.length === 0) return;
        e.preventDefault();
        opsRef.current?.trash(targets);
      }
    },
    [model, openRel]
  );

  // ----- context menu (native) --------------------------------------------

  const copyPaths = useCallback(
    (canonicals: readonly string[], relative: boolean): void => {
      const text = pathsForClipboard(rootPath, canonicals, relative);
      void navigator.clipboard.writeText(text).then(
        () => toast('info', copiedMessage(canonicals.length, relative)),
        () => toast('error', 'Could not copy the path')
      );
    },
    [rootPath, toast]
  );

  const revealPath = useCallback(
    (canonical: string): void => {
      void reveal(absOf(rootPath, canonical)).catch(() =>
        toast('error', 'Could not reveal the file in Finder')
      );
    },
    [rootPath, toast]
  );

  /**
   * Build and raise the menu. Finder's rule decides the subject: the verbs
   * apply to the whole selection when the clicked row is inside it, and to
   * that row alone when it is not.
   */
  const showMenuAt = useCallback(
    (canonical: string | null, x: number, y: number): void => {
      const ops = opsRef.current;
      const selected = canonical === null ? [] : model.getSelectedPaths();
      const selection =
        canonical === null
          ? []
          : selected.includes(canonical)
            ? [...selected]
            : [canonical];
      const rel = canonical === null ? '' : toRel(canonical);
      const destDir =
        canonical === null
          ? ''
          : isDirPath(canonical)
            ? canonical
            : parentOf(canonical);

      const items = buildTreeMenu(
        {
          canonical,
          selection,
          destDir,
          openable: treeInput.kinds.get(rel) !== 'other'
        },
        {
          mutate: ops !== null && canMutate(),
          duplicate: canDuplicate(),
          reveal: canReveal()
        },
        {
          open: (path, keep) => {
            openRel(path, keep);
            if (keep) showOneTimeTip('open-in-new-tab');
          },
          newEntry: (dir, kind) => ops?.newEntry(dir, kind),
          rename: (path) => ops?.startRename(path),
          duplicate: (path) => ops?.duplicate(path),
          reveal: revealPath,
          copyPaths,
          trash: (paths) => ops?.trash(paths)
        }
      );
      if (items.length === 0) return;
      setMenu({ x, y, items });
    },
    [model, treeInput, openRel, revealPath, copyPaths, setMenu]
  );

  openMenuRef.current = (item, context): void => {
    // The row is already focused by the library. Close its own (empty)
    // surface immediately: gmux's menu is the OS's, and there is nothing
    // to render into the slot.
    const rect = context.anchorRect;
    showMenuAt(item.path, rect.left, rect.bottom);
    context.close();
  };

  /**
   * The blank area below the rows is the ROOT. Pierre's row handler already
   * ran (and preventDefault'd) for a real row, so a hit here means empty
   * space — the only place "New File at the top level" can be asked for
   * without first finding a top-level row to aim at.
   */
  const onContextMenu = useCallback(
    (e: React.MouseEvent): void => {
      if (rowFromEvent(e.nativeEvent) !== null) return;
      e.preventDefault();
      showMenuAt(null, e.clientX, e.clientY);
    },
    [showMenuAt]
  );

  // ----- drag: the tree's half of the 12.9 / 12.10 contract ---------------

  const dragPathsRef = useRef<readonly string[]>([]);
  const rootArmedRef = useRef(false);
  const [rootArmed, setRootArmed] = useState(false);

  const onDragStart = useCallback(
    (e: React.DragEvent): void => {
      // Bubbled: Pierre's row handler has already run, so the drag session
      // (and its refusal) is settled and the multi-select set is resolved.
      // A refusal shows up as a prevented default — `.git`, an out-of-root
      // row, or a drag attempted while the filter is narrowing the tree.
      if (e.defaultPrevented) {
        dragPathsRef.current = [];
        return;
      }
      const paths = model.getSelectedPaths();
      const primary = rowFromEvent(e.nativeEvent)?.rel;
      const dragged =
        primary !== undefined && !paths.includes(primary) ? [primary] : [...paths];
      // Phase 37: a pending create's row is not draggable. The library
      // already renders the renaming row without the drag affordance and
      // `canDrag` refuses it in the model; this closes the third door — the
      // ATTACH contract below must never arm with a row that is not a file.
      const pendingCreate = opsRef.current?.pendingPath() ?? null;
      if (pendingCreate !== null && dragged.includes(pendingCreate)) {
        e.preventDefault();
        dragPathsRef.current = [];
        return;
      }
      dragPathsRef.current = dragged;

      // NOTE — `effectAllowed`: Pierre stamps 'move', which makes Chromium
      // nullify the terminal pane's 'copy' so the drop event NEVER FIRES.
      // Widening it to 'copyMove' is what keeps ATTACH reachable, and it is
      // deliberately NOT done here: `beginTreeDrag` owns it, so the two halves
      // of this contract cannot disagree and neither can lose it in a
      // refactor. Nothing else about the transfer is ours to touch.
      beginTreeDrag(
        e.nativeEvent,
        dragged.map((canonical) => absOf(rootPath, canonical)),
        rootPath
      );
    },
    [model, rootPath]
  );

  const armRoot = useCallback((armed: boolean): void => {
    if (rootArmedRef.current === armed) return;
    rootArmedRef.current = armed;
    setRootArmed(armed);
  }, []);

  const onDragOver = useCallback(
    (e: React.DragEvent): void => {
      if (dragPathsRef.current.length === 0) return;
      // Over a row, Pierre owns the target. Only the empty space is ours.
      if (rowFromEvent(e.nativeEvent) !== null) {
        armRoot(false);
        return;
      }
      e.preventDefault();
      if (e.dataTransfer !== null) e.dataTransfer.dropEffect = 'move';
      armRoot(true);
    },
    [armRoot]
  );

  const onDragLeave = useCallback(
    (e: React.DragEvent): void => {
      const next = e.relatedTarget;
      if (next instanceof Node && hostRef.current?.contains(next) === true) {
        return;
      }
      armRoot(false);
    },
    [armRoot]
  );

  const onDrop = useCallback(
    (e: React.DragEvent): void => {
      const armedForRoot = rootArmedRef.current;
      const dragged = dragPathsRef.current;
      armRoot(false);
      dragPathsRef.current = [];
      if (!armedForRoot || dragged.length === 0) return;
      // Pierre's own drop handler already ran with a null target, so nothing
      // moved in the model: this verb owns both sides of the move.
      e.preventDefault();
      opsRef.current?.drop(dragged, '', false);
    },
    [armRoot]
  );

  const onDragEnd = useCallback((): void => {
    dragPathsRef.current = [];
    armRoot(false);
  }, [armRoot]);

  // Host styles: the theme bridge's --trees-theme-* vars plus gmux type
  // tokens (fonts/sizes inherit as custom properties across the shadow
  // boundary — rules do not, values do).
  const hostStyle = useMemo(
    () =>
      ({
        ...treeStyles,
        '--trees-font-family': 'var(--font-ui)',
        '--trees-font-size': 'var(--text-sm)',
        '--trees-padding-inline': 'var(--space-2)'
      }) as React.CSSProperties,
    []
  );

  const rootEmpty = rootLoaded && (entriesByDir[rootPath]?.length ?? 0) === 0;

  return (
    <div
      className={`files-tree${rootArmed ? ' root-drop' : ''}`}
      ref={hostRef}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      {rootEmpty && !search.isOpen ? (
        <div className="section-stub">This folder is empty.</div>
      ) : (
        <PierreTree
          model={model}
          style={hostStyle}
          onClick={onClick}
          onDoubleClick={onDoubleClick}
          onKeyDown={onKeyDown}
          onContextMenu={onContextMenu}
          aria-label="Project files"
        />
      )}
      {filterMissed ? (
        <p className="files-filter-note">
          No matches in the folders you have opened.
        </p>
      ) : null}
      {nameError !== null ? (
        <div
          className="tree-name-error"
          role="alert"
          style={{
            top: nameError.top,
            left: nameError.left,
            maxWidth: nameError.maxWidth
          }}
        >
          {nameError.message}
        </div>
      ) : null}
    </div>
  );
}

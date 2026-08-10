/**
 * The project file tree (@pierre/trees) — S3 "Tree row" spec, Phase 11 swap.
 *
 * Rows [h:24] render inside Pierre's shadow DOM: chevron (folders) ·
 * material icon 16px — per-type for files, the generic folder pair for
 * directories (Phase 9 subset via a custom sprite sheet + the folder CSS in
 * pierre-icons.ts) · name · built-in git lane (status letter + color,
 * folder dot propagation — previously hand-rolled). Conflicted files add a
 * '!' row decoration in --git-conflict (Pierre has no conflict status).
 * Click / Enter on a file emits an open-in-editor request (diff mode when
 * the file has tracked changes). No inline file ops in v1 — context menu
 * (native, ui:popupMenu): Open, Open in New Tab, Reveal in Finder, Copy path,
 * Copy relative path.
 *
 * The Pierre model is path-first and imperative: lazy fs:readDir listings
 * from tree/store.ts are diffed into it via `batch`, expansion is watched
 * through `subscribe` to drive on-expand listing + per-project persistence,
 * and git status is fed with `setGitStatus` (aggregation is built in).
 * Theming crosses the shadow boundary only through the theme bridge
 * (src/renderer/pierre/theme-bridge.ts) — mount this component fresh per
 * project root (FilesSection keys it by rootPath).
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import type {
  FileTreeBatchOperation,
  FileTreeDirectoryHandle,
  FileTreeItemHandle,
  FileTreeRowDecoration,
  FileTreeRowDecorationContext,
  GitStatusEntry
} from '@pierre/trees';
import {
  FileTree as PierreTree,
  useFileTree as usePierreModel
} from '@pierre/trees/react';
import type { FsDirEntry, GitFileStatus } from '@shared/types';
import { useApp } from '../state/store';
import type { MenuItemSpec } from '../state/store';
import { showOneTimeTip } from '../app/one-time-tip';
import { treeStyles } from '../pierre/theme-bridge';
import { isConflicted, openModeFor, pierreGitStatus } from './decorations';
import { canReveal, reveal } from './fs-bridge';
import { requestOpenFile } from './open-file';
import { FOLDER_ICON_CSS, getPierreTreeIcons } from './pierre-icons';
import { useFileTree } from './store';

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

  // Model construction snapshot: usePierreModel captures options on first
  // render only; later listings/status flow through the effects below.
  const initialRef = useRef<{ paths: string[]; expanded: string[] } | null>(
    null
  );
  initialRef.current ??= {
    paths: [...treeInput.paths],
    expanded: loadExpanded(rootPath)
  };
  const initial = initialRef.current;

  const { model } = usePierreModel({
    paths: initial.paths,
    initialExpandedPaths: initial.expanded,
    gitStatus: gitState.entries,
    icons: getPierreTreeIcons(),
    itemHeight: 24,
    overscan: 8,
    renderRowDecoration: renderConflictDecoration,
    unsafeCSS: TREE_UNSAFE_CSS
  });

  // ----- listings → model (diff the fed path set, batch the delta) --------
  const fedRef = useRef<Set<string>>(new Set(initial.paths));
  const restoredRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const fed = fedRef.current;
    const next = treeInput.paths;
    const ops: FileTreeBatchOperation[] = [];
    const removedDirs: string[] = [];
    for (const path of fed) {
      if (next.has(path)) continue;
      // A recursive dir removal already covers its descendants.
      if (removedDirs.some((dir) => path !== dir && path.startsWith(dir))) {
        continue;
      }
      if (path.endsWith('/')) removedDirs.push(path);
      ops.push({ type: 'remove', path, recursive: true });
    }
    for (const path of next) {
      if (!fed.has(path)) ops.push({ type: 'add', path });
    }
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
        model.resetPaths([...next], { initialExpandedPaths: expanded });
      }
      fedRef.current = new Set(next);
    }
    // Re-open persisted dirs as their paths materialize (deep restores).
    for (const dir of initial.expanded) {
      if (restoredRef.current.has(dir) || !next.has(dir)) continue;
      restoredRef.current.add(dir);
      const item = asDirectory(model.getItem(dir));
      if (item !== null && !item.isExpanded()) item.expand();
    }
  }, [model, treeInput, initial]);

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

  // ----- expansion watch: lazy listing + persistence ----------------------
  const expandedRef = useRef<Set<string>>(new Set(initial.expanded));
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    let scheduled = false;
    const check = (): void => {
      scheduled = false;
      const expanded: string[] = [];
      for (const path of fedRef.current) {
        if (!path.endsWith('/')) continue;
        if (asDirectory(model.getItem(path))?.isExpanded() === true) {
          expanded.push(path);
        }
      }
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
  }, [model, rootPath, loadDir]);

  // ----- gestures ----------------------------------------------------------

  /**
   * `keep` is VS Code's preview-tab distinction (Phase 12 item 5): a single
   * click opens a PREVIEW tab that the next single click recycles, while a
   * double-click or ↩ opens the file for keeps and the strip accumulates.
   */
  const openRel = useCallback(
    (rel: string, keep = false): void => {
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

  // Pierre selects/focuses on click internally; opening is ours. Directory
  // clicks toggle inside the shadow DOM — the expansion watcher lists them.
  const onClick = useCallback(
    (e: React.MouseEvent): void => {
      const row = rowFromEvent(e.nativeEvent);
      if (row !== null && row.type === 'file') openRel(row.rel);
    },
    [openRel]
  );

  const onDoubleClick = useCallback(
    (e: React.MouseEvent): void => {
      const row = rowFromEvent(e.nativeEvent);
      if (row !== null && row.type === 'file') openRel(row.rel, true);
    },
    [openRel]
  );

  // ↩ activates (Pierre leaves Enter unhandled outside search/rename, both
  // of which are disabled here — the key bubbles out of the shadow root).
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent): void => {
      if (e.key !== 'Enter') return;
      const rel = model.getFocusedPath();
      if (rel === null) return;
      e.preventDefault();
      const dir = asDirectory(model.getItem(rel));
      if (dir !== null) {
        dir.toggle();
      } else {
        openRel(rel, true);
      }
    },
    [model, openRel]
  );

  const onContextMenu = useCallback(
    (e: React.MouseEvent): void => {
      const row = rowFromEvent(e.nativeEvent);
      if (row === null) return;
      e.preventDefault();
      e.stopPropagation();
      model.focusPath(row.rel);
      const rel = row.rel.endsWith('/') ? row.rel.slice(0, -1) : row.rel;
      const abs = rootPath + '/' + rel;
      const copy = (text: string, done: string): void => {
        void navigator.clipboard.writeText(text).then(
          () => toast('info', done),
          () => toast('error', 'Could not copy the path')
        );
      };
      // The preview/pinned tab model is invisible until something says it out
      // loud (Phase 12.4): single click recycles one italic tab, and a user
      // who never guesses the double-click reads that as "opening files is
      // broken". Naming both openings here is the teaching surface — and the
      // first use of the pinned one hands over the gesture that replaces it.
      const kind = treeInput.kinds.get(rel);
      const openItems: (MenuItemSpec | 'sep')[] =
        row.type === 'file' && kind !== 'other'
          ? [
              { label: 'Open', run: () => openRel(rel) },
              {
                label: 'Open in New Tab',
                run: () => {
                  openRel(rel, true);
                  showOneTimeTip('open-in-new-tab');
                }
              },
              'sep'
            ]
          : [];
      setMenu({
        x: e.clientX,
        y: e.clientY,
        items: [
          ...openItems,
          ...(canReveal()
            ? [
                {
                  label: 'Reveal in Finder',
                  run: () => {
                    void reveal(abs).catch(() =>
                      toast('error', 'Could not reveal the file in Finder')
                    );
                  }
                }
              ]
            : []),
          { label: 'Copy path', run: () => copy(abs, 'Path copied') },
          {
            label: 'Copy relative path',
            run: () => copy(rel, 'Relative path copied')
          }
        ]
      });
    },
    [model, openRel, rootPath, setMenu, toast, treeInput]
  );

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
    <div className="files-tree">
      {rootEmpty ? (
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
    </div>
  );
}

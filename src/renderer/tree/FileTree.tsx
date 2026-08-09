/**
 * The virtualized project file tree (react-arborist) — S3 "Tree row" spec.
 *
 * Rows [h:24], indent 12px/level: chevron (folders) · name 12px · right:
 * git status letter. Decorated files tint the name to the git color (the
 * letter badge is the redundant channel); folders with dirty descendants
 * carry a 4px `--git-modified` dot. Click / Enter on a file emits an
 * open-in-editor request (diff mode when the file has tracked changes).
 * No inline file ops in v1 — context menu: Reveal in Finder, Copy path.
 */

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { Tree } from 'react-arborist';
import type { NodeApi, NodeRendererProps, TreeApi } from 'react-arborist';
import type { FsDirEntry } from '@shared/types';
import { useApp } from '../state/store';
import { ChevronRightIcon } from '../app/icons';
import { decorationFor, isIgnored, openModeFor } from './decorations';
import type { StatusIndex } from './decorations';
import { canReveal, reveal } from './fs-bridge';
import { requestOpenFile } from './open-file';
import { useFileTree } from './store';

// ---------------------------------------------------------------------------
// Node data
// ---------------------------------------------------------------------------

export interface TreeNodeData {
  /** Absolute path — doubles as the react-arborist node id. */
  id: string;
  name: string;
  kind: FsDirEntry['kind'];
  /** Path relative to the project root. */
  relPath: string;
  /** null = leaf; [] = directory not yet listed (or empty); else children. */
  children: TreeNodeData[] | null;
}

function toRelPath(rootPath: string, absPath: string): string {
  return absPath.length > rootPath.length + 1
    ? absPath.slice(rootPath.length + 1)
    : '';
}

function buildLevel(
  dirPath: string,
  rootPath: string,
  entriesByDir: Record<string, FsDirEntry[]>
): TreeNodeData[] {
  const entries = entriesByDir[dirPath];
  if (entries === undefined) return [];
  return entries.map((e) => ({
    id: e.path,
    name: e.name,
    kind: e.kind,
    relPath: toRelPath(rootPath, e.path),
    children:
      e.kind === 'dir' ? buildLevel(e.path, rootPath, entriesByDir) : null
  }));
}

// ---------------------------------------------------------------------------
// Persisted open state (per project root)
// ---------------------------------------------------------------------------

type OpenMap = Record<string, boolean>;

const LS_OPEN_PREFIX = 'gmux.treeOpen.';

function loadOpenMap(rootPath: string): OpenMap {
  try {
    const raw = localStorage.getItem(LS_OPEN_PREFIX + rootPath);
    return raw === null ? {} : (JSON.parse(raw) as OpenMap);
  } catch {
    return {};
  }
}

function saveOpenMap(rootPath: string, open: OpenMap): void {
  try {
    // Persist only open dirs; cap so one deep spelunk can't bloat storage.
    const openOnly: OpenMap = {};
    let n = 0;
    for (const [id, isOpen] of Object.entries(open)) {
      if (isOpen && n < 500) {
        openOnly[id] = true;
        n++;
      }
    }
    localStorage.setItem(LS_OPEN_PREFIX + rootPath, JSON.stringify(openOnly));
  } catch {
    /* cosmetic only */
  }
}

// ---------------------------------------------------------------------------
// Row renderer
// ---------------------------------------------------------------------------

interface RowContext {
  statusIndex: StatusIndex;
  onOpenFile: (node: TreeNodeData) => void;
  onContextMenu: (node: TreeNodeData, x: number, y: number) => void;
}

const RowCtx = React.createContext<RowContext | null>(null);

function TreeRow({
  node,
  style
}: NodeRendererProps<TreeNodeData>): React.JSX.Element {
  const ctx = React.useContext(RowCtx);
  const data = node.data;
  const isDir = data.kind === 'dir';
  const status = ctx?.statusIndex.byPath.get(data.relPath);
  const deco = isDir ? null : decorationFor(status);
  const ignored = status !== undefined && isIgnored(status);
  const dirtyDir =
    isDir && (ctx?.statusIndex.dirtyDirs.has(data.relPath) ?? false);
  const openable = data.kind === 'file' || data.kind === 'symlink';

  const onClick = (e: React.MouseEvent): void => {
    if (isDir) {
      node.toggle();
      node.focus();
      return;
    }
    node.handleClick(e);
    if (openable) ctx?.onOpenFile(data);
  };

  const nameStyle: React.CSSProperties | undefined =
    deco !== null ? { color: `var(${deco.colorVar})` } : undefined;

  return (
    <div
      style={style}
      className={[
        'tree-row',
        node.isSelected ? 'selected' : '',
        node.isFocused ? 'focused' : '',
        data.kind === 'other' ? 'inert' : ''
      ]
        .filter(Boolean)
        .join(' ')}
      title={data.relPath}
      onClick={onClick}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        node.focus();
        ctx?.onContextMenu(data, e.clientX, e.clientY);
      }}
    >
      {isDir ? (
        <span className={`tree-chevron${node.isOpen ? ' open' : ''}`}>
          <ChevronRightIcon size={12} />
        </span>
      ) : (
        <span className="tree-chevron-spacer" />
      )}
      <span
        className={[
          'tree-name',
          ignored ? 'dim' : '',
          deco?.strike === true ? 'strike' : ''
        ]
          .filter(Boolean)
          .join(' ')}
        {...(nameStyle !== undefined ? { style: nameStyle } : {})}
      >
        {data.name}
      </span>
      {dirtyDir ? <span className="tree-dirty-dot" aria-hidden="true" /> : null}
      <span className="tree-row-space" />
      {deco !== null ? (
        <span
          className="tree-badge"
          style={{ color: `var(${deco.colorVar})` }}
          aria-label={`git status ${deco.letter}`}
        >
          {deco.letter}
        </span>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Container size (react-arborist needs pixel height)
// ---------------------------------------------------------------------------

function useElementSize<T extends HTMLElement>(): {
  ref: React.RefObject<T | null>;
  width: number;
  height: number;
} {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = (): void => {
      const rect = el.getBoundingClientRect();
      setSize((prev) =>
        prev.width === Math.floor(rect.width) &&
        prev.height === Math.floor(rect.height)
          ? prev
          : { width: Math.floor(rect.width), height: Math.floor(rect.height) }
      );
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, ...size };
}

// ---------------------------------------------------------------------------
// FileTree
// ---------------------------------------------------------------------------

export function FileTree({
  rootPath,
  statusIndex
}: {
  rootPath: string;
  statusIndex: StatusIndex;
}): React.JSX.Element {
  const entriesByDir = useFileTree((s) => s.entriesByDir);
  const rootLoaded = useFileTree((s) => s.rootLoaded);
  const loadDir = useFileTree((s) => s.loadDir);
  const setMenu = useApp((s) => s.setMenu);
  const toast = useApp((s) => s.toast);

  // ForwardedRef<TreeApi | undefined> — the union must include undefined
  // AND null for React's MutableRefObject variance.
  const treeRef = useRef<TreeApi<TreeNodeData> | undefined | null>(null);
  const { ref: boxRef, width, height } = useElementSize<HTMLDivElement>();

  const data = useMemo(
    () => buildLevel(rootPath, rootPath, entriesByDir),
    [rootPath, entriesByDir]
  );

  const initialOpen = useMemo(() => loadOpenMap(rootPath), [rootPath]);

  // Re-list directories that were open in a previous run (persisted state)
  // so restored folders show their children, not empty shells.
  useEffect(() => {
    if (!rootLoaded) return;
    for (const id of Object.keys(initialOpen)) {
      if (initialOpen[id] === true && id.startsWith(rootPath + '/')) {
        void loadDir(id);
      }
    }
  }, [rootLoaded, initialOpen, rootPath, loadDir]);

  const openFile = useCallback(
    (node: TreeNodeData): void => {
      requestOpenFile({
        path: node.id,
        relPath: node.relPath,
        repoPath: rootPath,
        // Canonical bus mode: 'file' is the plain-open gesture.
        mode:
          openModeFor(statusIndex.byPath.get(node.relPath)) === 'diff'
            ? 'diff'
            : 'file',
        source: 'tree'
      });
    },
    [rootPath, statusIndex]
  );

  const openContextMenu = useCallback(
    (node: TreeNodeData, x: number, y: number): void => {
      const copy = (text: string, done: string): void => {
        void navigator.clipboard.writeText(text).then(
          () => toast('info', done),
          () => toast('error', 'Could not copy the path')
        );
      };
      setMenu({
        x,
        y,
        items: [
          ...(canReveal()
            ? [
                {
                  label: 'Reveal in Finder',
                  run: () => {
                    void reveal(node.id).catch(() =>
                      toast('error', 'Could not reveal the file in Finder')
                    );
                  }
                }
              ]
            : []),
          {
            label: 'Copy path',
            run: () => copy(node.id, 'Path copied')
          },
          {
            label: 'Copy relative path',
            run: () => copy(node.relPath, 'Relative path copied')
          }
        ]
      });
    },
    [setMenu, toast]
  );

  const rowCtx = useMemo<RowContext>(
    () => ({
      statusIndex,
      onOpenFile: openFile,
      onContextMenu: openContextMenu
    }),
    [statusIndex, openFile, openContextMenu]
  );

  const onToggle = useCallback(
    (id: string): void => {
      const tree = treeRef.current;
      if (tree && tree.isOpen(id)) void loadDir(id);
      if (tree) saveOpenMap(rootPath, tree.openState);
    },
    [rootPath, loadDir]
  );

  const onActivate = useCallback(
    (node: NodeApi<TreeNodeData>): void => {
      if (
        node.isLeaf &&
        (node.data.kind === 'file' || node.data.kind === 'symlink')
      ) {
        openFile(node.data);
      }
    },
    [openFile]
  );

  // ↩ activates per DESIGN.md §4 (arborist reserves Enter for renames,
  // which the tree doesn't do — v1 has no inline file ops).
  const onKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key !== 'Enter') return;
    const node = treeRef.current?.focusedNode;
    if (!node) return;
    e.preventDefault();
    if (node.isInternal) {
      node.toggle();
    } else {
      onActivate(node);
    }
  };

  const rootEmpty = rootLoaded && (entriesByDir[rootPath]?.length ?? 0) === 0;

  return (
    <div className="files-tree" onKeyDown={onKeyDown}>
      <div className="files-tree-size" ref={boxRef}>
      {rootEmpty ? (
        <div className="section-stub">This folder is empty.</div>
      ) : height > 0 ? (
        <RowCtx.Provider value={rowCtx}>
          <Tree<TreeNodeData>
            key={rootPath}
            ref={treeRef}
            data={data}
            width={width}
            height={height}
            rowHeight={24}
            indent={12}
            overscanCount={8}
            openByDefault={false}
            initialOpenState={initialOpen}
            disableMultiSelection
            disableDrag
            disableDrop
            disableEdit
            onToggle={onToggle}
            onActivate={onActivate}
            className="tree-viewport"
            rowClassName="tree-row-outer"
            aria-label="Project files"
          >
            {TreeRow}
          </Tree>
        </RowCtx.Provider>
      ) : null}
      </div>
    </div>
  );
}

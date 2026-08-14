/**
 * The adapter for @pierre/trees' live rename-editor state (Phase 37).
 *
 * The library drives its inline rename input from a small view object —
 * getValue / setValue / isActive / getPath / cancel / commit — exposed
 * through a symbol-keyed method on its FileTreeController. Three facts
 * decide the shape of this module:
 *
 *  1. The symbol (`FILE_TREE_RENAME_VIEW`) is not exported from the package
 *     root, and the exports map blocks deep imports.
 *  2. The model our react hook hands out is NOT the controller. It is the
 *     render-layer wrapper, and the controller sits in a JS private field
 *     (`#controller`) with no public accessor — so the symbol cannot be
 *     reached through the model at all.
 *  3. Preact's `render(vnode, container)` stores the root vnode as an own
 *     property of the container it rendered into, and the container is the
 *     wrapper div the library creates inside its own shadow root
 *     (`[data-file-tree-virtualized-wrapper]`). The root vnode's props carry
 *     `controller` — the exact instance driving this tree.
 *
 * So the resolution is a bounded breadth-first walk over own DATA properties
 * starting from that wrapper div, stopping at the first object whose
 * prototype chain carries a symbol described "FILE_TREE_RENAME_VIEW". That
 * check is an identity test, not a name guess: only the controller's
 * prototype defines that symbol, so a match IS the controller, and it is
 * ours because it was found under our own host element.
 *
 * Everything degrades to null: on a future upgrade that moves any of this,
 * New File / New Folder refuse the gesture with a visible toast. A refused
 * gesture is acceptable. A fake row is not.
 */

/** The library's live rename-editor state, typed narrowly. */
export interface TreeRenameView {
  /** Close the editor without committing (the row is removed if pending). */
  cancel(): void;
  /** Commit whatever the box holds, as blur does. */
  commit(): void;
  /** Canonical path being renamed, or null when the editor is closed. */
  getPath(): string | null;
  /** The live text in the box. */
  getValue(): string;
  /** True while the editor is open on any row. */
  isActive(): boolean;
  /** Replace the text in the box (the controlled input re-renders). */
  setValue(value: string): void;
}

/** What the explorer needs from the controller beyond the rename view. */
export interface TreeEditorBridge {
  view: TreeRenameView;
  /** Make this row the only selected one (controller-level selection). */
  selectOnly(path: string): void;
}

const RENAME_VIEW_DESCRIPTION = 'FILE_TREE_RENAME_VIEW';

/** Walk caps: the vnode graph under one tree is small; these are ceilings. */
const MAX_VISITED = 4000;

function renameSymbolOf(candidate: object): symbol | null {
  let proto: object | null = candidate;
  while (proto !== null) {
    for (const sym of Object.getOwnPropertySymbols(proto)) {
      if (sym.description === RENAME_VIEW_DESCRIPTION) return sym;
    }
    proto = Object.getPrototypeOf(proto) as object | null;
  }
  return null;
}

const VIEW_METHODS = [
  'cancel',
  'commit',
  'getPath',
  'getValue',
  'isActive',
  'setValue'
] as const;

function asRenameView(value: unknown): TreeRenameView | null {
  if (value === null || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  for (const method of VIEW_METHODS) {
    if (typeof record[method] !== 'function') return null;
  }
  return value as TreeRenameView;
}

/** Own DATA property values only — never invoke a getter mid-walk. */
function ownValues(source: object): unknown[] {
  const values: unknown[] = [];
  const keys: (string | symbol)[] = [
    ...Object.getOwnPropertyNames(source),
    ...Object.getOwnPropertySymbols(source)
  ];
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(source, key);
    if (descriptor !== undefined && 'value' in descriptor) {
      values.push(descriptor.value);
    }
  }
  return values;
}

function findController(wrapper: HTMLElement): object | null {
  const queue: object[] = [];
  const seen = new Set<object>();
  const enqueue = (value: unknown): void => {
    if (value === null || typeof value !== 'object') return;
    // Never wander into the DOM: a vnode's rendered element links back to
    // the whole document. The wrapper itself is seeded by hand below.
    if (value instanceof Node) return;
    if (seen.has(value)) return;
    seen.add(value);
    queue.push(value);
  };

  for (const value of ownValues(wrapper)) enqueue(value);

  let visited = 0;
  while (queue.length > 0 && visited < MAX_VISITED) {
    const current = queue.shift();
    if (current === undefined) break;
    visited += 1;
    if (renameSymbolOf(current) !== null) return current;
    for (const value of ownValues(current)) enqueue(value);
  }
  return null;
}

/** One resolution per mounted tree; the controller lives as long as it. */
const bridgeByWrapper = new WeakMap<HTMLElement, TreeEditorBridge>();

/**
 * Resolve the rename-editor bridge for the tree mounted under `host`
 * (the `.files-tree` element that contains `file-tree-container`).
 * Returns null whenever any link in the chain is missing — the caller
 * refuses the create gesture rather than showing a row it cannot control.
 */
export function resolveTreeEditor(
  host: HTMLElement | null
): TreeEditorBridge | null {
  const wrapper = host
    ?.querySelector('file-tree-container')
    ?.shadowRoot?.querySelector('[data-file-tree-virtualized-wrapper]');
  if (!(wrapper instanceof HTMLElement)) return null;

  const cached = bridgeByWrapper.get(wrapper);
  if (cached !== undefined) return cached;

  const controller = findController(wrapper);
  if (controller === null) return null;
  const sym = renameSymbolOf(controller);
  if (sym === null) return null;

  const method = (controller as Record<symbol, unknown>)[sym];
  if (typeof method !== 'function') return null;
  let view: TreeRenameView | null = null;
  try {
    view = asRenameView((method as (this: object) => unknown).call(controller));
  } catch {
    return null;
  }
  if (view === null) return null;

  const bridge: TreeEditorBridge = {
    view,
    selectOnly: (path: string): void => {
      const select = (controller as Record<string, unknown>)['selectOnlyPath'];
      if (typeof select === 'function') {
        try {
          (select as (this: object, path: string) => void).call(
            controller,
            path
          );
        } catch {
          /* selection is a nicety; creation already landed */
        }
      }
    }
  };
  bridgeByWrapper.set(wrapper, bridge);
  return bridge;
}

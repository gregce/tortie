/**
 * A drag that STARTS in the file tree — the shared half of the Phase
 * 12.9 / 12.10 interaction contract.
 *
 * ─── THE RULE, stated once ────────────────────────────────────────────────
 * One gesture, two drop-target families, decided by hit-test on every
 * dragover, never both armed:
 *
 *   over a tree row / folder / the tree root  →  MOVE      (12.9, Pierre's
 *                                                 own affordance and its own
 *                                                 fs:move; gmux promises
 *                                                 nothing and arms nothing)
 *   over a terminal pane `[data-split-leaf]`  →  ATTACH    (12.10, the accent
 *                                                 overlay and this module's
 *                                                 pipeline)
 *   anywhere else                             →  nothing   (in particular NOT
 *                                                 the "add a project" frame —
 *                                                 a file already inside an
 *                                                 open project is never a new
 *                                                 project)
 *
 * The exclusion is structural rather than negotiated: each side only listens
 * where it lives. Pierre's drag handlers sit on the tree's own root inside its
 * shadow DOM, so a pointer over a pane never reaches them (and its dragleave
 * clears the move target on the way out); this module's router is the single
 * window-level listener and refuses to arm unless `leafUnder()` finds a leaf.
 * Two further guards make it visible and unambiguous:
 *   - the router sets `dropEffect = 'copy'` over a pane while Pierre sets
 *     'move' over the tree, so the CURSOR itself names which family you are
 *     in, natively, with no gmux chrome;
 *   - the router calls `preventDefault()` ONLY over a leaf. Everywhere else an
 *     un-prevented dragover means "not a drop target", which is exactly true,
 *     and no stray `drop` event can fire outside the two families.
 *
 * ─── WHAT THE TREE MUST DO (its three obligations) ────────────────────────
 * 1. Add ONE prop to <PierreTree>, exactly like the onClick/onContextMenu it
 *    already carries. Drag events are composed, so Pierre's row handler runs
 *    first inside the shadow root and the same native event still reaches the
 *    host; `e.target` is the host, so read the row from `composedPath()` as
 *    `rowFromEvent` already does. Pass the NATIVE event:
 *
 *      onDragStart={(e) => {
 *        const row = rowFromEvent(e.nativeEvent);
 *        if (row === null) return;
 *        // Pierre's own rule (resolveDraggedPathsForStart, not exported):
 *        // a drag on a SELECTED row carries the whole selection, a drag on
 *        // an unselected row carries just that row.
 *        const selected = model.getSelectedPaths();
 *        const rels = selected.includes(row.rel) ? selected : [row.rel];
 *        beginTreeDrag(
 *          e.nativeEvent,
 *          rels.map((rel) => rootPath + '/' + rel.replace(/\/$/, '')),
 *          rootPath
 *        );
 *      }}
 *
 * 2. Nothing else. Do not stamp `text/uri-list` or `Files` on the transfer
 *    (that is the OS-file drag's signature and would route the drop into the
 *    add-a-project branch), do not add a window-level drag listener, and do
 *    not preventDefault a dragover outside the tree. The router owns window.
 * 3. Keep `canDrag` refusing `.git/` and out-of-root. `beginTreeDrag` honours
 *    that for free: Pierre calls `event.preventDefault()` on a refused drag,
 *    and an already-defaultPrevented dragstart arms no session here.
 *
 * Not an obligation, because it is done for you: `beginTreeDrag` widens
 * Pierre's `effectAllowed = 'move'` to 'copyMove'. Leaving it at 'move' makes
 * the browser cancel the pane drop before it is dispatched (see below); the
 * fix belongs here rather than in the tree, so neither side can lose it.
 *
 * The payload rides a module singleton, not the DataTransfer, for two
 * reasons: `getData` is unreadable during dragover (protected mode), so an
 * overlay that must promise "attach 3 files" could not see them; and Pierre
 * puts a single ROOT-RELATIVE path in `text/plain`, which is neither absolute
 * nor the whole selection. The custom MIME below carries no data — it is
 * purely the per-event identity stamp, and `types` IS readable throughout.
 */

import { extensionOf, IMAGE_EXTENSIONS } from '@shared/image-types';

/** Identity stamp on the DataTransfer. Carries no payload — see above. */
export const TREE_DRAG_MIME = 'application/x-gmux-tree-drag';

export interface TreeDragSession {
  /** Absolute paths of every dragged row, in the tree's own order. */
  paths: readonly string[];
  /** The project root the drag started in. */
  rootPath: string;
}

let session: TreeDragSession | null = null;

/**
 * Arm the tree-drag session. Call from the tree host's `dragstart`.
 * Returns false when nothing was armed (a refused drag, or no paths).
 */
export function beginTreeDrag(
  event: DragEvent,
  paths: readonly string[],
  rootPath: string
): boolean {
  // Pierre cancels a drag its `canDrag` refused by preventing the default on
  // this very event, so `.git/` and out-of-root never arm an attach either.
  if (event.defaultPrevented) return false;
  const absolute = paths.filter((p) => p.startsWith('/'));
  if (absolute.length === 0) return false;
  session = { paths: absolute, rootPath };
  const dt = event.dataTransfer;
  // Stamped so the router can identify the drag from the EVENT alone; a
  // stale singleton can then never make an ordinary file drag look internal.
  dt?.setData(TREE_DRAG_MIME, '');
  // LOAD-BEARING, and the one thing in this contract that fails silently.
  // Pierre's own dragstart sets `effectAllowed = 'move'`, and the HTML
  // drag model resets the current drag operation to NONE whenever the
  // dropEffect a dragover asks for is not among the allowed ones — and a
  // drag whose operation is none fires no `drop` event at all. The attach
  // side asks for 'copy' (the file does not move), so with Pierre's value
  // left alone a drop on a pane would do nothing whatsoever, with no error
  // and a perfectly correct-looking overlay lit until the moment of truth.
  // 'copyMove' keeps the tree's own move legal and makes the pane's copy
  // legal too. `effectAllowed` is writable only during dragstart, which is
  // exactly where this runs.
  if (dt !== null && dt !== undefined) dt.effectAllowed = 'copyMove';
  return true;
}

/** Disarm. The router calls this on `dragend` and after a handled drop. */
export function endTreeDrag(): void {
  session = null;
}

/** The live tree-drag session, or null. */
export function treeDrag(): TreeDragSession | null {
  return session;
}

/** True when THIS drag event came out of the file tree. */
export function isTreeDragEvent(event: DragEvent): boolean {
  const types = event.dataTransfer?.types;
  return types !== undefined && Array.from(types).includes(TREE_DRAG_MIME);
}

/**
 * Extensions the overlay treats as images.
 *
 * ATTACHING an image and DISPLAYING one are different questions, and this
 * round shipped both, so the relationship between the two answers is derived
 * rather than typed out twice (CLAUDE.md's dup-scan guardrail — two literal
 * lists would be free to drift apart by accident instead of on purpose):
 *
 *  - `IMAGE_EXTENSIONS` (@shared/image-types) is what gmux can DECODE and put
 *    on screen. TIFF is deliberately absent — Chromium has no TIFF decoder,
 *    so the viewer would show a broken-image icon.
 *  - this set is what the ATTACH pipeline calls an image, and it is a strict
 *    SUPERSET, because the agent receives a path and opens the file itself:
 *    gmux's own decoder has no say. The delta is precisely the formats main's
 *    magic-byte sniff (src/main/drop/store.ts `sniffImage`) recognizes but the
 *    viewer cannot draw, written in every spelling the sniff's answer can
 *    arrive under.
 *
 * Being a superset is the load-bearing property: anything gmux can display is
 * certainly something the overlay should call an image, so a format added to
 * the viewer's list is picked up here for free and can never be forgotten.
 *
 * This list only has to answer during `dragover`, where there is no file to
 * read and the only thing at stake is which word the overlay says; the
 * outcome's authority is still the sniff. A Finder drag reaches the same
 * answer by the same route: Chromium derives `DataTransferItem.type` from the
 * extension too.
 */
const ATTACHABLE_IMAGE_EXTENSIONS: ReadonlySet<string> = new Set([
  ...IMAGE_EXTENSIONS,
  '.heic',
  '.heif',
  '.tif',
  '.tiff'
]);

/** Whether a path's extension names an image type. */
export function looksLikeImagePath(path: string): boolean {
  return ATTACHABLE_IMAGE_EXTENSIONS.has(extensionOf(path));
}

/** Any image in the set — matches the OS-drag rule (`dragLooksLikeImage`). */
export function treeDragHasImage(paths: readonly string[]): boolean {
  return paths.some(looksLikeImagePath);
}

/**
 * Harness probe for the tree → pane attach (Phase 12.10 item 2).
 *
 * Driven by the GMUX_SHOT hook (`treeDrop` on ShotDriveSpec), which owns the
 * project and the real session; everything drag-shaped lives here so the
 * shared harness file carries four lines of this feature and no more.
 *
 * It fires REAL DragEvents through the real window listeners at real element
 * coordinates — the router's hit-test, the overlay state, focus, the
 * pipeline, main's classify, xterm's bracketed paste and the 12.3
 * cancel-copy-mode-then-write are all on the path. Nothing is mocked but the
 * gesture, because the gesture is the only thing an automated run cannot
 * perform. The three assertions it exists to make:
 *
 *   1. over the TREE, gmux arms nothing (the 12.9 territory stays Pierre's);
 *   2. over a PANE, the attach overlay arms with the promise the agent can
 *      keep, and the two are never armed at once;
 *   3. a drop on a SCROLLED pane returns it to live output and the reference
 *      lands in the prompt — through the shared helper, not a second path.
 */

import type { Terminal } from '@xterm/xterm';
import { getTerminal } from './registry';
import { useDropUi } from './state';
import { beginTreeDrag, endTreeDrag, TREE_DRAG_MIME } from './tree-drag';

export interface TreeDropProbeSpec {
  /** Repo-relative paths the tree drag carries (resolved against the root). */
  rels: string[];
  /** Scroll the pane back this many lines first — the 12.3 copy-mode gate. */
  scrollBackLines?: number;
  /**
   * Stop with the pane's overlay ARMED instead of dropping, so a capture can
   * photograph the affordance. The overlay is the only part of this feature
   * that exists solely to be looked at, and it is on screen for the length of
   * a gesture no automated run can hold.
   */
  holdArmed?: boolean;
}

/**
 * Every affordance either half of the contract can light, read at one instant.
 *
 * The point of reading all four together is that "mutually exclusive" is a
 * claim about the WHOLE screen, and neither builder could make it alone: each
 * probe could only see its own overlay go dark, which is consistent both with
 * the rule working and with nothing being armed anywhere. Exactly one of these
 * must be true at any pointer position, and at two of the four positions the
 * right answer is none.
 */
export interface AffordanceSnapshot {
  /** 12.10: session id under the accent attach overlay, or null. */
  paneOverlay: string | null;
  /** 12.10: the whole-window "add a project" frame. Never for a tree drag. */
  windowFrame: boolean;
  /** What the pane overlay is promising, so the copy can be read too. */
  paneLabel: string | null;
  /** 12.9: Pierre's own accent ring, by the row path it is sitting on. */
  pierreRow: string | null;
  /** 12.9: gmux's root ring on the empty space below the rows. */
  rootRing: boolean;
}

export interface TreeDropProbeResult {
  /** Overlay state while the pointer was over the file tree. Must be idle. */
  overTree: { leaf: string | null; window: boolean };
  /** Overlay state while the pointer was over the pane. */
  overPane: { leaf: string | null; window: boolean; label: string | null };
  /**
   * THE CONFLICT MATRIX — pointer position → what is armed. One armed tree
   * drag walked across the four territories the contract names, reading both
   * families at each stop. See `AffordanceSnapshot`.
   */
  conflict: Record<
    'pierreRow' | 'emptyTreeSpace' | 'pane' | 'elsewhere',
    AffordanceSnapshot
  >;
  /**
   * Does `setData(TREE_DRAG_MIME, '')` actually put the type in `types`?
   * The single point of failure for the entire tree → pane path: the router
   * identifies a tree drag from the EVENT, and an empty-valued entry that
   * Chromium declined to register would make every pane drop silently inert
   * while every unit test — which reads the module singleton, not the
   * transfer — still passed.
   */
  stampReadable: boolean;
  /** tmux scroll position before and after the drop (after must be 0). */
  scroll: { before: number; after: number } | null;
  /** The pane's text after the drop — where the reference has to show up. */
  paneText: string;
}

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

function centerOf(el: Element): { x: number; y: number } {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/**
 * The element a real pointer would be over, PIERCING the tree's shadow root.
 *
 * `document.elementFromPoint` stops at the shadow host, and dispatching there
 * would hand Pierre's own dragover an `event.target` it cannot resolve a row
 * from (`resolveDropTargetFromElement` walks UP from the target looking for
 * `[data-type="item"]`, and from the host there is nothing above but the
 * sidebar). Pierre hit-tests the same way for the same reason — see
 * `getPointElement(rootNode instanceof ShadowRoot ? rootNode : document, …)`
 * in render/FileTreeView.js — so this is the browser's real dispatch target,
 * not a shortcut around it.
 */
function elementAt(point: { x: number; y: number }): Element {
  const outer = document.elementFromPoint(point.x, point.y) ?? document.body;
  const shadow = outer.shadowRoot;
  if (shadow === null || shadow === undefined) return outer;
  return shadow.elementFromPoint(point.x, point.y) ?? outer;
}

/** Dispatch a real drag event at a point, on whatever element is there. */
function fireDragAt(
  type: 'dragstart' | 'dragover' | 'dragleave' | 'drop' | 'dragend',
  point: { x: number; y: number },
  dataTransfer: DataTransfer
): void {
  elementAt(point).dispatchEvent(
    new DragEvent(type, {
      bubbles: true,
      cancelable: true,
      composed: true,
      clientX: point.x,
      clientY: point.y,
      dataTransfer
    })
  );
}

function snapshot(): { leaf: string | null; window: boolean; label: string | null } {
  const ui = useDropUi.getState();
  return {
    leaf: ui.leaf?.sessionId ?? null,
    window: ui.window,
    label: ui.leaf?.label ?? null
  };
}

/** Pierre's shadow root — its accent ring is rendered inside it. */
function treeShadow(host: Element): ShadowRoot | null {
  return host.querySelector('file-tree-container')?.shadowRoot ?? null;
}

/**
 * Read BOTH families at once. Pierre marks its drop target with
 * `data-item-drag-target` on the row (`render/rowAttributes.js`) and
 * `data-item-flattened-subitem-drag-target` on a flattened segment; gmux's
 * root ring is the `root-drop` class on `.files-tree`.
 */
function affordances(host: Element): AffordanceSnapshot {
  const ui = useDropUi.getState();
  const shadow = treeShadow(host);
  const row =
    shadow?.querySelector('[data-item-drag-target]') ??
    shadow?.querySelector('[data-item-flattened-subitem-drag-target]') ??
    null;
  return {
    paneOverlay: ui.leaf?.sessionId ?? null,
    windowFrame: ui.window,
    paneLabel: ui.leaf?.label ?? null,
    pierreRow:
      row === null
        ? null
        : (row.getAttribute('data-item-path') ??
          row.getAttribute('data-item-flattened-subitem') ??
          'yes'),
    rootRing: host.classList.contains('root-drop')
  };
}

/**
 * The pane's live text down to the cursor row. Reading the LAST n rows of the
 * viewport is wrong for a freshly started session — a shell prompt sits at the
 * top of an otherwise blank 24-row screen, and the tail is all empty lines.
 */
/**
 * Walk ONE armed tree drag across the four territories the contract names and
 * read both affordance families at each stop.
 *
 * The gesture is REAL where it can be: the dragstart is dispatched on an
 * actual Pierre row, so `handleRowDragStart` opens Pierre's own drag session
 * (nothing of Pierre's arms without one) and the same native event bubbles out
 * of the shadow root to gmux's host handler exactly as it does for a mouse.
 * That composition — Pierre first, gmux on the bubble — IS the contract, and
 * a synthesized `beginTreeDrag()` call would have stepped over it.
 *
 * Returns null when the tree has no rows to drag (nothing to prove).
 */
async function walkConflict(
  treeEl: Element,
  leafEl: Element,
  dataTransfer: DataTransfer
): Promise<TreeDropProbeResult['conflict'] | null> {
  const shadow = treeShadow(treeEl);
  const rows = Array.from(shadow?.querySelectorAll('[data-type="item"]') ?? []);
  // DRAG THE LAST ROW AND HOVER A FOLDER THAT IS NOT IT. Dragging row 0 onto
  // row 0 is a self-drop, which Pierre correctly refuses (`isSelfOrDescendant
  // Drop`) — so the ring stays dark and the matrix reads as a broken contract
  // when what it actually caught was the probe aiming at itself.
  const source = rows[rows.length - 1] ?? null;
  const folder =
    rows.find(
      (r) =>
        r !== source &&
        r.getAttribute('data-item-type') === 'folder' &&
        source?.getAttribute('data-item-path')?.startsWith(
          r.getAttribute('data-item-path') ?? '\u0000'
        ) !== true
    ) ?? null;
  if (source === null || folder === null) return null;
  const treeRect = treeEl.getBoundingClientRect();
  const lastRow = rows[rows.length - 1];
  const belowRows = (lastRow?.getBoundingClientRect().bottom ?? treeRect.top) + 12;

  const stops = {
    // A real row: Pierre's territory, and Pierre's ring alone.
    pierreRow: centerOf(folder),
    // The empty space under the last row: the ROOT move, which Pierre does
    // not offer here and gmux therefore owns.
    emptyTreeSpace: {
      x: treeRect.left + treeRect.width / 2,
      y: Math.min(belowRows, treeRect.bottom - 4)
    },
    // The 12.10 territory.
    pane: centerOf(leafEl),
    // The title bar — the "add a project" frame's own ground for a Finder
    // drag, and the position the contract says must stay dark for this one.
    elsewhere: { x: window.innerWidth / 2, y: 6 }
  };

  fireDragAt('dragstart', centerOf(source), dataTransfer);
  await wait(60);
  const out = {} as TreeDropProbeResult['conflict'];
  try {
    for (const [name, point] of Object.entries(stops)) {
      fireDragAt('dragover', point, dataTransfer);
      await wait(80);
      out[name as keyof typeof stops] = affordances(treeEl);
      // Leaving a territory is half of the rule, and only dragleave tells
      // either side it happened — a real pointer emits one per boundary.
      fireDragAt('dragleave', point, dataTransfer);
    }
  } finally {
    // Pierre cancels its session on a WINDOW dragend (its own listener), and
    // the router disarms gmux's on the same event. One dispatch, both halves.
    window.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer }));
    await wait(60);
  }
  return out;
}

function paneText(term: Terminal, maxRows: number): string {
  const buffer = term.buffer.active;
  const end = buffer.baseY + buffer.cursorY + 1;
  const out: string[] = [];
  for (let y = Math.max(0, end - maxRows); y < end; y++) {
    const line = buffer.getLine(y)?.translateToString(true).trimEnd() ?? '';
    if (line.length > 0) out.push(line);
  }
  return out.join('\n');
}

/**
 * Run the probe against a live session. `scrollTo` is the ScrollSurface's own
 * bridge, passed in so this module keeps no scroll dependency of its own.
 */
export async function driveTreeDrop(
  spec: TreeDropProbeSpec,
  ctx: {
    sessionId: string;
    rootPath: string;
    scroll: {
      by(req: { sessionId: string; lines: number }): Promise<{ position: number }>;
      state(req: { sessionId: string }): Promise<{ position: number }>;
    } | null;
  }
): Promise<TreeDropProbeResult> {
  const { sessionId, rootPath } = ctx;
  const leafEl = document.querySelector(
    `[data-split-leaf="${CSS.escape(sessionId)}"]`
  );
  if (leafEl === null) throw new Error('treeDrop: no leaf for the session');
  const treeEl =
    document.querySelector('.files-tree') ??
    document.querySelector('[data-view="explorer"]');
  if (treeEl === null) throw new Error('treeDrop: the file tree is not showing');

  // 1. Scroll the pane back, so the write has to cancel copy-mode to land.
  let scroll: TreeDropProbeResult['scroll'] = null;
  const lines = spec.scrollBackLines ?? 0;
  if (lines > 0 && ctx.scroll !== null) {
    await ctx.scroll.by({ sessionId, lines });
    // LONGER THAN IT LOOKS, and load-bearing. Scrolling through the bridge
    // goes behind the pane's own ScrollSurface, whose `position` is a POLLED
    // cache — and that cache is what `sendInput` reads to decide whether the
    // write must cancel copy-mode first. The poll runs at 1 Hz while the
    // surface still believes the pane is live, so a probe that scrolls and
    // immediately drops measures a stale cache rather than the feature: it
    // reports the bytes swallowed by copy-mode, which no user gesture can
    // reproduce (a wheel scroll updates the cache synchronously with its own
    // response). Wait past one full live-poll interval before dropping.
    await wait(1600);
    const before = await ctx.scroll.state({ sessionId });
    scroll = { before: before.position, after: -1 };
  }

  // 2. THE CONFLICT MATRIX, before anything is dropped: one real drag, four
  //    territories, both families read at each. This runs first because it
  //    ends by cancelling its own drag, and because a drop would change the
  //    tree under the walk.
  const conflictTransfer = new DataTransfer();
  const conflict =
    (await walkConflict(treeEl, leafEl, conflictTransfer)) ??
    ({} as TreeDropProbeResult['conflict']);

  // 3. Arm the drag exactly as the tree's dragstart will.
  // NOTE on `effectAllowed`: beginTreeDrag widens Pierre's 'move' to
  // 'copyMove', without which the browser would cancel a 'copy' drop before
  // dispatching it. A CONSTRUCTED DataTransfer refuses that write (its drag
  // data store is not in a dragstart), so the value is unobservable here and
  // deliberately not reported — the unit test asserts it, and a mouse-driven
  // drag is the only place it can be seen for real.
  const dataTransfer = new DataTransfer();
  const dragstart = new DragEvent('dragstart', { dataTransfer });
  const paths = spec.rels.map((rel) => `${rootPath}/${rel}`);
  if (!beginTreeDrag(dragstart, paths, rootPath)) {
    throw new Error('treeDrop: beginTreeDrag refused the paths');
  }
  // Does the identity stamp SURVIVE? `beginTreeDrag` wrote it into this very
  // transfer a line ago with an empty value, and the router reads it back off
  // every later event to tell a tree drag from a Finder drag. If Chromium
  // declined to register an empty-valued entry, `types` would not list it, the
  // router would fall through to `dragHasFiles` (false for a tree drag), and
  // the pane would never arm — silently, with every unit test still green,
  // because they read the module singleton and not the transfer.
  const stampReadable = Array.from(dataTransfer.types).includes(TREE_DRAG_MIME);

  try {
    // 4. Over the TREE: the 12.9 territory. gmux must arm nothing.
    fireDragAt('dragover', centerOf(treeEl), dataTransfer);
    await wait(50);
    const tree = snapshot();

    // 5. Over the PANE: the 12.10 territory.
    const paneCenter = centerOf(leafEl);
    fireDragAt('dragover', paneCenter, dataTransfer);
    await wait(50);
    const pane = snapshot();

    // 6. Drop — unless the caller wants the armed overlay photographed.
    if (spec.holdArmed === true) {
      return {
        overTree: { leaf: tree.leaf, window: tree.window },
        overPane: pane,
        conflict,
        stampReadable,
        scroll,
        paneText: ''
      };
    }
    fireDragAt('drop', paneCenter, dataTransfer);
    await wait(2500);

    if (scroll !== null && ctx.scroll !== null) {
      scroll.after = (await ctx.scroll.state({ sessionId })).position;
    }
    const term = getTerminal(sessionId);
    return {
      overTree: { leaf: tree.leaf, window: tree.window },
      overPane: pane,
      conflict,
      stampReadable,
      scroll,
      paneText: term === null ? '' : paneText(term, 12)
    };
  } finally {
    endTreeDrag();
    // The armed overlay is left standing on purpose for `holdArmed`; the
    // drag session behind it is still disarmed, so nothing can act on it.
    if (spec.holdArmed !== true) useDropUi.getState().clear();
  }
}

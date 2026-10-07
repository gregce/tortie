/**
 * The tree's half of the drag contract, and only its half.
 *
 * This is a hook behind FileTree.tsx.
 *
 * ── ONE SURFACE, FOUR MEANINGS (Phase 154 added the last two) ─────────────
 * A drag that STARTS on a row means MOVE over the tree and ATTACH over a
 * terminal pane, and that contract is written once in
 * ../terminal/drop/tree-drag.ts. With OPTION held it means neither: it means
 * DRAG OUT, and the gesture becomes the operating system's own native drag.
 * A drag that starts OUTSIDE the app and carries files means IMPORT, which
 * copies what is dropped into the folder under the pointer.
 *
 * Four meanings on one surface is the whole design risk of this phase, and
 * they are kept apart by asking two questions in a fixed order and never a
 * third:
 *
 *   1. `isTreeDragEvent` reads the identity MIME off `dataTransfer.types`,
 *      which IS readable during dragover. It answers "did this drag start in
 *      the tree" from the event alone, so a stale singleton can never make an
 *      ordinary file drag look internal. NOT `dragPathsRef.current.length`,
 *      which is also empty for a drag that started in a different project.
 *   2. `dragHasFiles` answers "is this the operating system handing us files".
 *
 * Internal and external can therefore never both be true, and the branch is
 * taken at the top of all four handlers.
 *
 * ── THE THREE OBLIGATIONS, UNCHANGED ──────────────────────────────────────
 * `beginTreeDrag` is armed on the host's bubbled dragstart, no window level
 * drag listener is ever installed, and no dragover outside this host's own
 * box is ever prevented. Phase 154 keeps all three: the external branch
 * prevents only where `hostRef` holds the pointer, because these are the
 * host's own React handlers and they run nowhere else.
 *
 * ── WHAT THE EXTERNAL BRANCH TAKES AWAY, SAID OUT LOUD ────────────────────
 * Before this phase a folder dropped anywhere in the window opened a NEW
 * PROJECT TAB, through the window level router at
 * ../terminal/drop/router.ts. Over the tree box it now copies in instead.
 * That is a real change to a gesture that worked, and it is taken
 * deliberately: a folder dropped on a file tree means "put it here" in every
 * file manager on the machine. Everywhere else in the window — the tab strip,
 * the session list, the panes, the sidebar outside the tree — still adds a
 * project.
 *
 * Two things follow, and both are load bearing:
 *   - the external branch calls `stopPropagation`, so the window router never
 *     runs for this drag and cannot arm the add-a-project frame. The router's
 *     own rule is that exactly one thing lights per dragover;
 *   - it calls `useDropUi.clear()`, because a drag that crossed a terminal
 *     pane on its way to the sidebar left a pane overlay armed, and the
 *     router is no longer being reached to take it down.
 */

import { useCallback, useRef, useState } from 'react';
import { isProtectedFsPath } from '@shared/fs-ops';
import { beginTreeDrag, isTreeDragEvent } from '../terminal/drop/tree-drag';
import { dragHasFiles, extractDrop, pathForFile } from '../terminal/drop/acquire';
import { useDropUi } from '../terminal/drop/state';
import { remoteTreeNoImport } from '../machines/explorer';
import { useApp } from '../state/store';
import {
  chainFromEvent,
  dragOutModifierHeld,
  dropDirFromEvent,
  rowElementFromEvent,
  rowFromEvent
} from './row-events';
import * as fsOps from './fs-ops-bridge';
import {
  absOf,
  besideLinkDrop,
  importRowFor,
  importTargetFor,
  isUnderLink,
  linkAimOf,
  toRel,
  type TreeLinks
} from './tree-paths';
import type { TreeModelBridge } from './use-tree-model';

export interface TreeDragOptions
  extends Pick<
    TreeModelBridge,
    'model' | 'hostRef' | 'opsRef' | 'linksRef' | 'treeShadow'
  > {
  rootPath: string;
  isRemote: boolean;
  /** How a person names the machine this folder is on, or null for this Mac. */
  remoteLabel: string | null;
}

/**
 * Where a drop the HOST carries will land, and how to draw that: a drop from
 * outside (Phase 154), or (PHASE 343, its fix round) a move dragged over a link
 * row, which lands in the folder holding the link.
 */
export interface TreeImportHover {
  /** Canonical destination directory; '' is the project root. */
  dest: string;
  /**
   * The destination folder's row, in coordinates relative to the tree host,
   * or null when the whole tree box is the affordance.
   */
  box: { top: number; left: number; width: number; height: number } | null;
  /** True when this tree will refuse the drop and say why. */
  refused: boolean;
}

export interface TreeDragResult {
  /** True while the empty space below the rows is the drop target. */
  rootArmed: boolean;
  /**
   * Phase 154: where a drop from outside would land, or null. PHASE 343: also
   * where a move dragged over a link row lands, beside the link.
   */
  importHover: TreeImportHover | null;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

/** A drag from another application, carrying files. */
function isExternalFileDrag(event: DragEvent): boolean {
  return !isTreeDragEvent(event) && dragHasFiles(event);
}

/**
 * PHASE 343's folded-row fix. The folder a drop at this event is aimed at for
 * the link rule, the same for a move and for a drop from Finder: the library's
 * own reading (`dropDirFromEvent`, which knows the segment), with the area off
 * every segment of a row that folds a link read as that link's row
 * (`linkAimOf`).
 */
function linkAimFromEvent(event: Event, links: TreeLinks): string | null {
  return linkAimOf(dropDirFromEvent(event), chainFromEvent(event), links);
}

function sameHover(
  a: TreeImportHover | null,
  b: TreeImportHover | null
): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (a.dest !== b.dest || a.refused !== b.refused) return false;
  if (a.box === null || b.box === null) return a.box === b.box;
  return (
    a.box.top === b.box.top &&
    a.box.left === b.box.left &&
    a.box.width === b.box.width &&
    a.box.height === b.box.height
  );
}

export function useTreeDrag({
  rootPath,
  isRemote,
  remoteLabel,
  model,
  hostRef,
  opsRef,
  linksRef,
  treeShadow
}: TreeDragOptions): TreeDragResult {
  const dragPathsRef = useRef<readonly string[]>([]);
  const rootArmedRef = useRef(false);
  const [rootArmed, setRootArmed] = useState(false);
  const importRef = useRef<TreeImportHover | null>(null);
  const [importHover, setImportHover] = useState<TreeImportHover | null>(null);

  const armRoot = useCallback((armed: boolean): void => {
    if (rootArmedRef.current === armed) return;
    rootArmedRef.current = armed;
    setRootArmed(armed);
  }, []);

  /** dragover fires continuously; only re-render when the answer moved. */
  const armImport = useCallback((next: TreeImportHover | null): void => {
    if (sameHover(importRef.current, next)) return;
    importRef.current = next;
    setImportHover(next);
  }, []);

  /**
   * The mounted row for one canonical path, in host coordinates.
   *
   * Rows live inside Pierre's shadow root, so this is a READ across the
   * boundary and nothing more — the same reach `rowFromEvent` already makes.
   * The attribute is compared rather than put in a selector on purpose: a
   * path can hold a quote and a hand-built selector would either throw or, in
   * the worse case, match the wrong row.
   */
  const boxOfRow = useCallback(
    (canonical: string): TreeImportHover['box'] => {
      const host = hostRef.current;
      if (host === null || canonical.length === 0) return null;
      const shadow = treeShadow();
      const rows = shadow?.querySelectorAll('[data-item-path]');
      if (rows === undefined) return null;
      const boxOf = (row: HTMLElement): TreeImportHover['box'] => {
        const rect = row.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return null;
        const hostRect = host.getBoundingClientRect();
        return {
          top: Math.round(rect.top - hostRect.top),
          left: Math.round(rect.left - hostRect.left),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        };
      };
      for (const row of Array.from(rows)) {
        if (!(row instanceof HTMLElement)) continue;
        if (row.dataset['itemPath'] !== canonical) continue;
        return boxOf(row);
      }
      // PHASE 343 (its fix round). A folder folded into a chain row has no row
      // of its own: `.claude` holding only the link is drawn as `.claude /
      // skills`, and a drop over the link lands in `.claude/`. The row that
      // shows that folder is ringed, never the whole box, which says the root.
      const segments = shadow?.querySelectorAll('[data-item-flattened-subitem]');
      for (const segment of Array.from(segments ?? [])) {
        if (segment.getAttribute('data-item-flattened-subitem') !== canonical) continue;
        const row = segment.closest('[data-type="item"]');
        if (row instanceof HTMLElement) return boxOf(row);
      }
      return null;
    },
    [hostRef, treeShadow]
  );

  /**
   * PHASE 154. Option was held, so this gesture is the native drag OUT.
   *
   * `preventDefault` here is what ends the HTML drag before it begins, and it
   * is the only way to choose: a native drag and an HTML drag cannot both come
   * out of one gesture and neither can be converted into the other once it is
   * running.
   */
  const startNativeDragOut = useCallback(
    (e: React.DragEvent, dragged: readonly string[]): void => {
      e.preventDefault();
      dragPathsRef.current = [];
      // Pierre's row handler already ran. It opened a drag session on its
      // controller and mounted a drag preview element, and a PREVENTED
      // dragstart fires no dragend at all, so both would be left standing and
      // the library would then handle the next drag on top of ours. Its own
      // row level `dragend` handler is the complete teardown for exactly this
      // case, so it is rung through the DOM rather than by reaching into the
      // controller, which the public model does not expose anyway.
      rowElementFromEvent(e.nativeEvent)?.dispatchEvent(
        new DragEvent('dragend', { bubbles: true, composed: true })
      );
      // PHASE 343. Nothing under a link leaves for Finder from here. `canDrag`
      // already refuses the gesture in the model; this is the second door.
      const links = linksRef.current;
      const paths = dragged
        .filter(
          (canonical) =>
            !isProtectedFsPath(canonical) && !isUnderLink(canonical, links)
        )
        .map(toRel);
      if (paths.length === 0) return;
      void fsOps.startDrag({ root: rootPath, paths }).catch(() => {
        useApp.getState().toast('error', 'Could not start that drag.');
      });
    },
    [rootPath, linksRef]
  );

  const onDragStart = useCallback(
    (e: React.DragEvent): void => {
      // Bubbled: Pierre's row handler has already run, so the drag session
      // (and its refusal) is settled and the multi-select set is resolved.
      // A refusal shows up as a prevented default — `.git`, an out-of-root
      // row, or a drag attempted while the filter is narrowing the tree.
      // PHASE 90.3. `canDrag` already refuses in the model, which is what
      // prevents the default here. PHASE 233 narrowed the remote half of this
      // door to the thing it was actually protecting. `beginTreeDrag` arms the
      // terminal pane's ATTACH contract with ABSOLUTE PATHS, and an absolute
      // path from another machine names a file on this Mac or nothing at all,
      // so a remote drag still arms NOTHING; it returns below, after the
      // dragged set is resolved and before the drag out and the attach. What
      // it no longer does is cancel the gesture, because Pierre's own move is
      // what the drop lands on and that move now reaches `entry-rename` on the
      // machine. `canDrag` in ./use-tree-model.ts is where a machine with no
      // confirmed folder is refused, and it refuses this event's default.
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
      // PHASE 343. The same third door for a row under a link: `canDrag`
      // refuses it in the model, and neither the attach below nor the drag out
      // may ever arm with one.
      const links = linksRef.current;
      if (dragged.some((canonical) => isUnderLink(canonical, links))) {
        e.preventDefault();
        dragPathsRef.current = [];
        return;
      }

      // PHASE 233. A REMOTE TREE STOPS HERE, holding the dragged set so the
      // host's own empty space drop still means "move to the root of this
      // folder", and arming neither of the two contracts below. The drag out
      // hands Chromium a promised FILE, which would be a file on this Mac at a
      // path from another machine, and `beginTreeDrag` hands the terminal pane
      // the same absolute paths for an attach. Pierre's own transfer is
      // untouched, which is what carries the move.
      if (isRemote) {
        dragPathsRef.current = dragged;
        return;
      }

      // PHASE 154. The one branch that is decided from what is HELD, because
      // at dragstart nobody knows yet whether the pointer will end up over a
      // pane, over a row, or over Finder. With nothing held, everything below
      // is byte for byte what it was before this phase, and that is the
      // property this phase cares about most. A build whose preload predates
      // the channel falls through to the two old meanings rather than losing
      // the gesture.
      if (dragOutModifierHeld(e.nativeEvent) && fsOps.canDragOut()) {
        startNativeDragOut(e, dragged);
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
    [model, rootPath, isRemote, opsRef, linksRef, startNativeDragOut]
  );

  const onDragOver = useCallback(
    (e: React.DragEvent): void => {
      // ---- PHASE 154, the drop from OUTSIDE ------------------------------
      if (isExternalFileDrag(e.nativeEvent)) {
        // Take the drag off the window router: only one thing may light per
        // dragover, and a pane overlay armed on the way here goes dark.
        e.stopPropagation();
        useDropUi.getState().clear();
        armRoot(false);
        if (isRemote) {
          // The refusal has to be VISIBLE and it has to be a sentence, so the
          // dragover IS prevented — an un-prevented one fires no drop and the
          // sentence would never be said. The affordance is a refusal rather
          // than an acceptance, so nothing about it promises a copy.
          e.preventDefault();
          if (e.dataTransfer !== null) e.dataTransfer.dropEffect = 'copy';
          armImport({ dest: '', box: null, refused: true });
          return;
        }
        const hit = rowFromEvent(e.nativeEvent);
        const links = linksRef.current;
        // THE FOLDED-ROW FIX: a folder row at or under a link is aimed the way
        // a move is, by the segment under the pointer, so a row that folds a
        // link with the one folder it holds lands beside the link.
        const dest = importTargetFor(
          importRowFor(
            hit === null ? null : { rel: hit.rel, isFolder: hit.type === 'folder' },
            linkAimFromEvent(e.nativeEvent, links),
            links
          ),
          opsRef.current?.pendingPath() ?? null,
          links
        );
        if (dest === null) {
          // `.git`, a row that is not on disk yet, or (PHASE 343) a link row or
          // a row under one. NOT prevented: an
          // un-prevented dragover is Chromium's own way of saying "not a drop
          // target", which keeps the no-drop cursor honest and stops a stray
          // drop firing here at all.
          armImport(null);
          return;
        }
        e.preventDefault();
        if (e.dataTransfer !== null) e.dataTransfer.dropEffect = 'copy';
        armImport({ dest, box: boxOfRow(dest), refused: false });
        return;
      }

      // ---- the internal MOVE ----------------------------------------------
      if (dragPathsRef.current.length === 0) {
        armImport(null);
        return;
      }
      // Over a row, Pierre owns the target. Only the empty space is ours, and
      // (PHASE 343, its fix round) a LINK ROW, which Pierre refuses because a
      // drop never goes INTO a link: there the host carries the move to the
      // folder holding the link, which is where Pierre aimed it before this
      // phase, when the link was a leaf. The ring is drawn on that folder, the
      // root's ring when it is the root, so the drop lands where it says. THE
      // FOLDED-ROW FIX: off every segment of a row that folds a link with the
      // one folder it holds, the row is that link's row too.
      const overRow = rowFromEvent(e.nativeEvent);
      if (overRow !== null) {
        // THE NARROW FIX: the row itself is asked too, so a move over a FILE
        // row under a link (whose folder the library reads as the link) is
        // refused, with no ring, like every other row under a link.
        const beside = besideLinkDrop(
          dragPathsRef.current,
          linkAimFromEvent(e.nativeEvent, linksRef.current),
          linksRef.current,
          overRow
        );
        if (beside === null) {
          armImport(null);
          armRoot(false);
          return;
        }
        e.preventDefault();
        if (e.dataTransfer !== null) e.dataTransfer.dropEffect = 'move';
        if (beside === '') {
          armImport(null);
          armRoot(true);
          return;
        }
        armRoot(false);
        armImport({ dest: beside, box: boxOfRow(beside), refused: false });
        return;
      }
      armImport(null);
      e.preventDefault();
      if (e.dataTransfer !== null) e.dataTransfer.dropEffect = 'move';
      armRoot(true);
    },
    [armRoot, armImport, boxOfRow, isRemote, opsRef, linksRef]
  );

  const onDragLeave = useCallback(
    (e: React.DragEvent): void => {
      const next = e.relatedTarget;
      if (next instanceof Node && hostRef.current?.contains(next) === true) {
        return;
      }
      armRoot(false);
      armImport(null);
    },
    [armRoot, armImport, hostRef]
  );

  const onDrop = useCallback(
    (e: React.DragEvent): void => {
      // ---- PHASE 154, the drop from OUTSIDE ------------------------------
      if (isExternalFileDrag(e.nativeEvent)) {
        e.preventDefault();
        e.stopPropagation();
        const hover = importRef.current;
        armImport(null);
        if (isRemote) {
          useApp
            .getState()
            .toast('info', remoteTreeNoImport(remoteLabel ?? 'that machine'));
          return;
        }
        if (hover === null || hover.refused) return;
        // SYNCHRONOUS, and this is the most likely bug in the whole feature:
        // after the first await `dataTransfer.files` reads empty (research 16
        // §4.2). `extractDrop` captures the File objects, which survive it.
        const files = extractDrop(e.nativeEvent).files;
        const sources: string[] = [];
        let unresolved = 0;
        for (const file of files) {
          // `pathForFile` and NOT `resolveFilePath`: the fallback in that one
          // writes the bytes into the drop store under userData and hands back
          // a path there. That is right for attaching an image to a prompt and
          // WRONG for bringing a file into a project — a file with no path of
          // its own has nothing to copy, and copying Tortie's own scratch copy
          // in would be a lie about where it came from.
          const path = pathForFile(file);
          if (path.length > 0) sources.push(path);
          else unresolved += 1;
        }
        opsRef.current?.importPaths(sources, hover.dest, unresolved);
        return;
      }

      // ---- the internal MOVE ----------------------------------------------
      const armedForRoot = rootArmedRef.current;
      const dragged = dragPathsRef.current;
      armRoot(false);
      armImport(null);
      dragPathsRef.current = [];
      if (dragged.length === 0) return;
      // PHASE 343 (its fix round). Over a LINK ROW the drop lands beside the
      // link. The folder is read again from THIS event, the way Pierre's own
      // drop handler reads it, rather than trusted from the last dragover, so
      // the host never carries a drop Pierre has carried itself.
      const overRow = rowFromEvent(e.nativeEvent);
      if (overRow !== null) {
        const beside = besideLinkDrop(
          dragged,
          linkAimFromEvent(e.nativeEvent, linksRef.current),
          linksRef.current,
          overRow
        );
        if (beside === null) return;
        e.preventDefault();
        opsRef.current?.drop(dragged, beside, false);
        return;
      }
      if (!armedForRoot) return;
      // Pierre's own drop handler already ran with a null target, so nothing
      // moved in the model: this verb owns both sides of the move.
      e.preventDefault();
      opsRef.current?.drop(dragged, '', false);
    },
    [armRoot, armImport, isRemote, remoteLabel, opsRef, linksRef]
  );

  const onDragEnd = useCallback((): void => {
    dragPathsRef.current = [];
    armRoot(false);
    armImport(null);
  }, [armRoot, armImport]);

  return {
    rootArmed,
    importHover,
    onDragStart,
    onDragOver,
    onDragLeave,
    onDrop,
    onDragEnd
  };
}

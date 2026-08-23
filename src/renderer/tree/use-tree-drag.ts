/**
 * The tree's half of the drag contract, and only its half.
 *
 * This is a hook behind FileTree.tsx. A drag that starts on a row means MOVE
 * over the tree and ATTACH over a terminal pane, and the contract is written
 * once in ../terminal/drop/tree-drag.ts. Three obligations are performed here
 * and nothing else: `beginTreeDrag` is armed on the host's bubbled dragstart,
 * no window level drag listener is ever installed, and no dragover outside this
 * host's own box is ever prevented.
 */

import { useCallback, useRef, useState } from 'react';
import { beginTreeDrag } from '../terminal/drop/tree-drag';
import { rowFromEvent } from './row-events';
import { absOf } from './tree-paths';
import type { TreeModelBridge } from './use-tree-model';

export interface TreeDragOptions
  extends Pick<TreeModelBridge, 'model' | 'hostRef' | 'opsRef'> {
  rootPath: string;
  isRemote: boolean;
}

export interface TreeDragResult {
  /** True while the empty space below the rows is the drop target. */
  rootArmed: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

export function useTreeDrag({
  rootPath,
  isRemote,
  model,
  hostRef,
  opsRef
}: TreeDragOptions): TreeDragResult {
  const dragPathsRef = useRef<readonly string[]>([]);
  const rootArmedRef = useRef(false);
  const [rootArmed, setRootArmed] = useState(false);

  const onDragStart = useCallback(
    (e: React.DragEvent): void => {
      // Bubbled: Pierre's row handler has already run, so the drag session
      // (and its refusal) is settled and the multi-select set is resolved.
      // A refusal shows up as a prevented default — `.git`, an out-of-root
      // row, or a drag attempted while the filter is narrowing the tree.
      // PHASE 90.3. `canDrag` already refuses in the model, which is what
      // prevents the default here. This is the second door, and it is the one
      // that matters: `beginTreeDrag` arms the terminal pane's ATTACH contract
      // with ABSOLUTE PATHS, and an absolute path from another machine names a
      // file on this Mac or nothing at all.
      if (e.defaultPrevented || isRemote) {
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
    [model, rootPath, isRemote]
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

  return { rootArmed, onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd };
}

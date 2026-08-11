/**
 * THE window-level file-drop router.
 *
 * One set of listeners owns every file drag in the app and dispatches by
 * hit-test, so no two drop affordances can ever arm at once (research 16
 * §8.2). Two drags arrive here, and they mean different things:
 *
 *  A drag from OUTSIDE (Finder, a browser, another app):
 *   dragover → over a session leaf?  arm the attach zone on THAT leaf
 *              anywhere else?        arm the window zone (add a project)
 *   drop     → session leaf: focus it, resolve paths, insert references
 *              elsewhere:   a folder adds a project; a file says how to
 *   ⌘V       → the same pipeline from the clipboard's image data
 *
 *  A drag from the FILE TREE (Phase 12.9 move vs Phase 12.10 attach — the
 *  contract and the reasoning live in ./tree-drag.ts):
 *   dragover → over a session leaf?  arm the attach zone, dropEffect 'copy'
 *              anywhere else?        arm NOTHING and do not preventDefault,
 *                                    leaving the tree's own move affordance
 *                                    the only thing lit in its own territory
 *   drop     → session leaf: focus it and attach the tree's absolute paths
 *              elsewhere:   untouched — Pierre already handled its own drop
 *
 * It does not compete with gmux's split drag-and-drop: that is a POINTER
 * gesture (pointerdown/pointermove), and during an OS drag Chromium dispatches
 * only drag events, so `armPointerDrag` never arms. xterm itself registers no
 * drag or drop listeners at all, and its helper textarea is parked off-screen
 * where the cursor can never reach it (§8.1).
 */

import { useEffect } from 'react';
import { useApp } from '../../state/store';
import {
  dragFileCount,
  dragHasFiles,
  dragLooksLikeImage,
  extractDrop,
  extractPasteImages,
  firstUrl,
  pathForFile
} from './acquire';
import { forwardClipboardPaste, MAX_REFERENCES } from './insert';
import {
  addProjectFromDrop,
  attachPaths,
  attachUrl,
  resolveAll
} from './pipeline';
import { useDropUi } from './state';
import { imageDropFor, primeImageDropTable } from './strategy';
import {
  focusSession,
  leafSessionId,
  leafUnder,
  LEAF_SELECTOR,
  paneAccepts,
  promiseFor,
  sessionById
} from './target';
import {
  endTreeDrag,
  isTreeDragEvent,
  treeDrag,
  treeDragHasImage
} from './tree-drag';

/** Light the whole leaf with the promise its session can actually keep. */
function armLeaf(
  leaf: HTMLElement,
  looksLikeImage: boolean,
  count: number
): void {
  const sessionId = leafSessionId(leaf);
  const rect = leaf.getBoundingClientRect();
  const { promise, label } = promiseFor(
    sessionById(sessionId),
    looksLikeImage,
    count
  );
  const ui = useDropUi.getState();
  ui.setWindow(false);
  ui.setLeaf({
    sessionId,
    rect: {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height
    },
    promise,
    label
  });
}

function onDragOver(event: DragEvent): void {
  if (isTreeDragEvent(event)) {
    onTreeDragOver(event);
    return;
  }
  if (!dragHasFiles(event)) return;
  // Without preventDefault Chromium refuses the drop and shows no copy cursor.
  event.preventDefault();
  // This is THE file-drop router: no other window listener may also arm an
  // overlay for the same drag. (React handlers live on the root container,
  // which the event already passed — they are unaffected.)
  event.stopImmediatePropagation();
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';

  const ui = useDropUi.getState();
  const leaf = leafUnder(event.clientX, event.clientY);
  if (!leaf) {
    ui.setLeaf(null);
    ui.setWindow(true);
    return;
  }
  armLeaf(
    leaf,
    dragLooksLikeImage(event),
    Math.min(Math.max(1, dragFileCount(event)), MAX_REFERENCES)
  );
}

/**
 * A drag that started in the tree, still in flight.
 *
 * gmux's whole half of the conflict rule is here: arm over a pane, arm
 * nothing anywhere else, never the window frame. `preventDefault` is deliberately
 * scoped to the leaf branch — outside it, an un-prevented dragover is
 * Chromium's own way of saying "not a drop target here", which keeps the
 * no-drop cursor honest over the sidebar and stops a stray `drop` from ever
 * firing outside the two families.
 */
function onTreeDragOver(event: DragEvent): void {
  const ui = useDropUi.getState();
  const drag = treeDrag();
  const leaf =
    drag === null ? null : leafUnder(event.clientX, event.clientY);
  if (drag === null || leaf === null) {
    // The tree's own territory (or neither's). Pierre owns the affordance.
    ui.clear();
    return;
  }
  event.preventDefault();
  event.stopImmediatePropagation();
  // COPY, not move: the file stays exactly where it is in the project. The
  // cursor is then the cheapest honest distinction between the two families —
  // Pierre sets 'move' over its own rows.
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  armLeaf(
    leaf,
    treeDragHasImage(drag.paths),
    Math.min(drag.paths.length, MAX_REFERENCES)
  );
}

function onDragLeave(event: DragEvent): void {
  // Only the drag actually leaving the window counts; leaving a child element
  // fires here too and must not disarm the overlay mid-drag.
  if (event.relatedTarget === null) useDropUi.getState().clear();
}

/**
 * Any way a drag can end without a drop over us. Also the ONE place a tree
 * drag is disarmed on cancellation: dragend always fires on the source, and
 * dragleave does not qualify — a drag that leaves the window and comes back
 * gets no second dragstart, so ending the session there would strand it.
 */
function onDragEnd(): void {
  endTreeDrag();
  useDropUi.getState().clear();
}

function onDrop(event: DragEvent): void {
  if (isTreeDragEvent(event)) {
    onTreeDrop(event);
    return;
  }
  if (!dragHasFiles(event)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const ui = useDropUi.getState();
  const armed = ui.leaf;
  ui.clear();

  // SYNCHRONOUS: after the first await the DataTransfer reads empty.
  const transfer = extractDrop(event);
  const sessionId =
    leafSessionId(leafUnder(event.clientX, event.clientY)) ||
    (armed?.sessionId ?? '');

  if (sessionId.length === 0) {
    void addProjectFromDrop(transfer.files);
    return;
  }

  if (transfer.files.length === 0) {
    // A cross-app image drag can arrive as a URL only. Agents fetch URLs
    // themselves; the renderer CSP forbids us from downloading it.
    const url = firstUrl(transfer);
    if (url.length > 0) attachUrl(sessionId, url);
    return;
  }

  // Cap before resolving: a pathless file costs a write to the drop store,
  // and nobody wants 40 of them typed into their prompt either.
  const files = transfer.files.slice(0, MAX_REFERENCES);
  const truncated = transfer.files.length > files.length;
  void resolveAll(files)
    .then((paths) => attachPaths(sessionId, paths, { truncated }))
    .catch(() =>
      useApp.getState().toast('error', 'That file could not be attached.')
    );
}

/**
 * The tree's half of the drop. Every path is already absolute and already on
 * disk, so there is nothing to resolve or persist: this is the same
 * `attachPaths` the Finder drop ends in, entered one step later.
 *
 * A tree drop that did NOT land on a pane is left completely alone — the
 * event is not prevented and not stopped, because Pierre's own handler on the
 * tree root has already run and performed the MOVE.
 */
function onTreeDrop(event: DragEvent): void {
  const ui = useDropUi.getState();
  const drag = treeDrag();
  endTreeDrag();
  const armed = ui.leaf;
  const sessionId =
    leafSessionId(leafUnder(event.clientX, event.clientY)) ||
    (armed?.sessionId ?? '');
  ui.clear();
  if (drag === null || sessionId.length === 0) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  const paths = drag.paths.slice(0, MAX_REFERENCES);
  void attachPaths(sessionId, paths, {
    truncated: drag.paths.length > paths.length,
    folders: 'reference'
  });
}

/**
 * ⌘V with an image on the clipboard. Text pastes fall through untouched —
 * xterm's own helper textarea handles those, and it must keep handling them.
 */
function onPaste(event: ClipboardEvent): void {
  const images = extractPasteImages(event.clipboardData);
  if (images.length === 0) return;

  const focused = document.activeElement;
  const leaf =
    focused instanceof Element
      ? focused.closest<HTMLElement>(LEAF_SELECTOR)
      : null;
  const sessionId =
    leafSessionId(leaf) || (useApp.getState().activeSession()?.id ?? '');
  const session = sessionById(sessionId);
  if (!paneAccepts(session) || session === null) return;

  event.preventDefault();
  event.stopPropagation();

  // The image is ALREADY on the system pasteboard, so agents that read it
  // there need nothing from us but the keystroke: no clipboard write, no
  // temp file, nothing of the user's clipboard disturbed. This only holds for
  // real image DATA — a pasteboard carrying just a file URL (what a Finder
  // Copy produces) yields nothing in those agents, so it takes the path route
  // like everyone else. `pathForFile` is the discriminator: '' means bytes.
  const first = images[0];
  if (
    imageDropFor(session.agent).strategy === 'clipboard-attach' &&
    first !== undefined &&
    pathForFile(first).length === 0
  ) {
    focusSession(sessionId);
    forwardClipboardPaste(sessionId);
    return;
  }

  const capped = images.slice(0, MAX_REFERENCES);
  void resolveAll(capped)
    .then((paths) =>
      attachPaths(sessionId, paths, {
        truncated: images.length > capped.length
      })
    )
    .catch(() =>
      useApp.getState().toast('error', 'That image could not be attached.')
    );
}

/**
 * Mount once, at the app root. Owns every window-level file-drag listener in
 * gmux — nothing else may install one, or the two overlays will fight.
 */
export function useFileDropRouter(): void {
  useEffect(() => {
    void primeImageDropTable();
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('dragend', onDragEnd);
    window.addEventListener('drop', onDrop);
    // Capture phase: xterm's helper textarea would otherwise consume the
    // paste and insert only its text/plain flavor, ignoring the image.
    document.addEventListener('paste', onPaste, true);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('dragend', onDragEnd);
      window.removeEventListener('drop', onDrop);
      document.removeEventListener('paste', onPaste, true);
      endTreeDrag();
      useDropUi.getState().clear();
    };
  }, []);
}

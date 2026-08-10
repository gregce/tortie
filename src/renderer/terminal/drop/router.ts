/**
 * THE window-level file-drop router.
 *
 * One set of listeners owns every file drag in the app and dispatches by
 * hit-test, so the "add a project" overlay and the "attach to this session"
 * overlay can never both arm (research 16 §8.2):
 *
 *   dragover → over a session leaf?  arm the attach zone on THAT leaf
 *              anywhere else?        arm the window zone (add a project)
 *   drop     → session leaf: focus it, resolve paths, insert references
 *              elsewhere:   a folder adds a project; a file says how to
 *   ⌘V       → the same pipeline from the clipboard's image data
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

function onDragOver(event: DragEvent): void {
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
  const sessionId = leafSessionId(leaf);
  const rect = leaf.getBoundingClientRect();
  const { promise, label } = promiseFor(
    sessionById(sessionId),
    dragLooksLikeImage(event)
  );
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

function onDragLeave(event: DragEvent): void {
  // Only the drag actually leaving the window counts; leaving a child element
  // fires here too and must not disarm the overlay mid-drag.
  if (event.relatedTarget === null) useDropUi.getState().clear();
}

/** Any way a drag can end without a drop over us. */
function onDragEnd(): void {
  useDropUi.getState().clear();
}

function onDrop(event: DragEvent): void {
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
    .then((paths) => attachPaths(sessionId, paths, truncated))
    .catch(() =>
      useApp.getState().toast('error', 'That file could not be attached.')
    );
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
      attachPaths(sessionId, paths, images.length > capped.length)
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
      useDropUi.getState().clear();
    };
  }, []);
}

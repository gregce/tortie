/**
 * THE FIGMA KEY SET for the map's camera (Phase 162), as one pure decision
 * table: which keydown means which camera command. The container owns the
 * listener; this file owns the answer, so every rule below is testable
 * without a DOM.
 *
 * The set, from research 68 section 5.2: Shift+1 fits all, Shift+2 fits the
 * selection, F centres then fits per the Perfetto convention, and the panel
 * zoom chord ⌘+ / ⌘− / ⌘0 routes into the camera's own scale because the
 * map tab is EXEMPT from the CSS zoom regions (the Monaco and Pierre
 * precedent; the window listener in `zoom/keys.ts` defers over
 * `.arch-map-tab` and the chord reaches the container's bubble handler).
 *
 * WHAT IS DELIBERATELY NOT HERE, checked against every keymap row and
 * against what a terminal pane needs (Phase 156's method):
 *
 * - **Space.** Space+drag is the hand tool and belongs to the GESTURE layer,
 *   not this table; and inside the drawing, Space on a focused box would
 *   collide with the drill's own activation, so Enter stays the drill's
 *   keyboard activation and this table never answers for Space.
 * - **Shift+⌘0.** That is `view.zoomResetAll`, the global CSS-region reset,
 *   and the camera is not a CSS region. It stays global and untouched.
 * - **Anything with a modifier the app already owns.** F2 renames, ⌘F finds,
 *   ⌘1…⌘9 switch projects; every rule below requires the exact modifier
 *   shape it names, so none of those can ever land here.
 * - **Anything typed into a field.** {@link isEditableTarget} guards a
 *   rename box or a future filter input: a person typing an F is writing a
 *   letter, not framing a selection.
 *
 * None of this registers a menu accelerator and nothing listens at the
 * window: a terminal pane with focus is outside `.arch-map-tab`, so no chord
 * an agent needs can be taken by this table.
 */

import type { ArchCameraHandle } from './seam';

/** The camera verbs a keydown can name. */
export type ArchCameraCommand =
  | 'zoomIn'
  | 'zoomOut'
  | 'zoomReset'
  | 'fitAll'
  | 'fitSelection'
  | 'frame';

/** The five fields of a keydown the table reads. A plain shape, testable. */
export interface CameraKeyStroke {
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  /** `KeyboardEvent.code`: layout independent, `Digit1` under any layout. */
  code: string;
  /** `KeyboardEvent.key`, read only for the layouts where ⌘+ is its own key. */
  key: string;
}

/**
 * The table. Null means "not ours": the event proceeds untouched, which is
 * what keeps Enter opening a box and every unclaimed chord reaching whatever
 * owns it.
 */
export function cameraKeyCommand(e: CameraKeyStroke): ArchCameraCommand | null {
  if (e.metaKey && !e.ctrlKey && !e.altKey) {
    // `code` rather than `key` for the pair, the image viewer's own reason:
    // ⌘+ is Shift+Equal on a US layout and the character differs by layout.
    if (e.code === 'Equal' || e.key === '+') return 'zoomIn';
    if (e.code === 'Minus' || e.key === '-') return 'zoomOut';
    // ⌘0 resets THIS camera; ⇧⌘0 stays the app's reset-all and is not ours.
    if (e.code === 'Digit0' && !e.shiftKey) return 'zoomReset';
    return null;
  }
  if (e.metaKey || e.ctrlKey || e.altKey) return null;
  if (e.shiftKey) {
    if (e.code === 'Digit1') return 'fitAll';
    if (e.code === 'Digit2') return 'fitSelection';
    return null;
  }
  if (e.code === 'KeyF') return 'frame';
  return null;
}

/**
 * True when the keydown began in something a person types into, so the
 * table must not answer. `closest` covers a focused child of a
 * contenteditable region, and the tag check covers the plain controls.
 */
export function isEditableTarget(target: unknown): boolean {
  if (
    typeof Element === 'undefined' ||
    !(target instanceof Element)
  ) {
    return false;
  }
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return target.closest('[contenteditable="true"], [contenteditable=""]') !== null;
}

/** One command onto the handle. Null-safe: before the camera mounts, a no-op. */
export function runCameraCommand(
  handle: ArchCameraHandle | null,
  command: ArchCameraCommand
): void {
  if (handle === null) return;
  handle[command]();
}

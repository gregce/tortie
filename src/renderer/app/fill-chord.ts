/**
 * ⇧⌘↩, routed by the region the keyboard is in (Phase 129).
 *
 * Phase 80.1 gave this chord to a session. An open file had no answer to it
 * at all, so a person reading a file pressed it and nothing happened. This
 * module is the router, and it invents no third mode. Both behaviours already
 * exist. `editorFill` has been in the chrome slice since Phase 12.9 and
 * `sessionFocus` since Phase 80.1, and `enterEditorFill` already turns
 * session focus off, so the two can never both be on.
 *
 * THE RULE, and it is the whole file. The region the keyboard is in decides
 * which fill runs. It is read from `document.activeElement` at the moment the
 * chord fires, never from a stored "last focused region", because a stored
 * region is a second copy of focus and the DOM already knows.
 *
 *   inside .ed-panel                       -> the open file fills the window
 *   inside .gmux-terminal-mount, the        -> the session surface fills it
 *   session strip or the session dock
 *   anywhere else                           -> nothing at all
 *
 * The View menu's row runs the same router, so the row and the accelerator
 * printed on it cannot say two different things. The only difference is that
 * the row says out loud why nothing happened, because a chosen menu row that
 * does nothing at all is not honest.
 *
 * "Anywhere else" is deliberate. The activity bar, the sidebar and a modal
 * are not a region this chord has a meaning for, and guessing one would grow
 * or shrink a layout the person was not looking at.
 *
 * WHY THE TWO REFUSALS ARE DUPLICATED HERE. `toggleEditorFill` refuses in
 * silence when no file is open and when the window is too narrow to split.
 * Silence is the right answer for the fill button, which is not drawn in
 * either case, and for ⇧⌘B, which is a chord about the editor. It is the
 * wrong answer here, because a person who pressed this chord in a file has
 * just been told by the keymap that it fills the file. So this module asks
 * the same two questions first and says the answer out loud. The button and
 * ⇧⌘B still arrive at `toggleEditorFill` and still keep its own guards.
 *
 * LEAVING IS SYMMETRIC AND COSTS NOTHING EXTRA. Both underlying functions
 * toggle. In a filled editor `toggleEditorFill` sees `editorFill !== null`
 * and calls `exitEditorFill`, which replays the memento. In a focused session
 * `toggleSessionFocus` flies back. Neither path writes a width, so the layout
 * returns byte for byte, which is the promise Phase 80.1 measured.
 *
 * Editor fill stays a fill INSIDE the app chrome. The titlebar is still
 * drawn. Nothing here goes near the packaged full screen row from Phase 62.1.
 */

import { editorIsOverlay } from '../state/chrome-geometry';
import { liveChromeGeometry, useApp } from '../state/store';
import { toggleEditorFill, useEditor } from '../editor';
import { toggleSessionFocus } from './focus-flight';
import { showOneTimeTip } from './one-time-tip';

/** The panel root the editor stream renders, in EditorPanel.tsx. */
const EDITOR_SELECTOR = '.ed-panel';

/**
 * The three roots that mean "the keyboard is on the session side". The mount
 * is the terminal itself. The other two are the session list in its two
 * densities, and they are named because a person who has just arrowed to a
 * session is on the session side even though the terminal does not yet have
 * the keyboard.
 */
const SESSION_SELECTOR =
  '.gmux-terminal-mount, [data-slot="session-strip"], [data-slot="session-dock"]';

/** Which fill the chord means right now. `null` means it means nothing. */
export type FillRegion = 'editor' | 'session';

/** No file is open, so there is nothing to fill the window with. */
export const NO_FILE_TO_FILL = 'Open a file first, then press the keys again.';

/** The window cannot seat the editor beside the terminal at all. */
export const WINDOW_TOO_NARROW =
  'The window is too narrow to fill from a file. Make it wider and press the keys again.';

/**
 * The rule as arithmetic on one element, so it can be tested without a DOM.
 *
 * The editor is asked FIRST. It cannot contain a terminal mount or a session
 * list, so the order decides nothing today, and asking the smaller region
 * first stays correct if the editor is ever drawn inside the work row's own
 * wrapper.
 */
export function fillRegionOf(el: Element | null): FillRegion | null {
  if (el === null) return null;
  if (el.closest(EDITOR_SELECTOR) !== null) return 'editor';
  if (el.closest(SESSION_SELECTOR) !== null) return 'session';
  return null;
}

/** The region the keyboard is in, or null when it is in neither. */
export function activeFillRegion(): FillRegion | null {
  if (typeof document === 'undefined') return null;
  return fillRegionOf(document.activeElement);
}

/**
 * Fill the window from the open file, or say why not.
 *
 * The exit branch is first and asks nothing, for the reason focus mode's
 * leave asks nothing. A mode you cannot get out of because the window has
 * since been made narrower is the failure both of these guards exist to
 * avoid.
 */
function runEditorFill(): void {
  const app = useApp.getState();
  if (app.editorFill !== null) {
    toggleEditorFill();
    return;
  }
  const ed = useEditor.getState();
  if (!ed.panelOpen || ed.tabs.length === 0) {
    app.toast('info', NO_FILE_TO_FILL);
    return;
  }
  const { windowWidth, workArea } = liveChromeGeometry();
  if (editorIsOverlay(windowWidth, workArea)) {
    app.toast('info', WINDOW_TOO_NARROW);
    return;
  }
  toggleEditorFill();
  // The tip is shown only when the fill actually happened, so the store is
  // read back rather than assumed. Escape does not leave this mode either,
  // so the way out is said once, in words, exactly as focus mode says it.
  if (useApp.getState().editorFill !== null) showOneTimeTip('editor-fill-exit');
}

/**
 * The View menu's row was chosen with the keyboard in neither region.
 *
 * The chord itself stays silent there, for the reason written at the top of
 * this file. A menu row is different. A person who has just chosen a row and
 * seen nothing happen is owed a sentence, so this one says where to put the
 * keyboard. The layout is untouched either way, so the row and its
 * accelerator still do the same thing.
 */
export const FILL_CHORD_NO_REGION =
  'Put the keyboard in a session or in an open file, then choose this again.';

/** Where the chord came from. The menu says why nothing happened; ⇧⌘↩ does not. */
export type FillChordSource = 'chord' | 'menu';

/** ⇧⌘↩, and View > Focus the Session or File. The region decides which fill runs. */
export async function runFillChord(
  source: FillChordSource = 'chord'
): Promise<void> {
  const region = activeFillRegion();
  if (region === 'editor') {
    runEditorFill();
    return;
  }
  if (region === 'session') {
    await toggleSessionFocus();
    return;
  }
  if (source === 'menu') useApp.getState().toast('info', FILL_CHORD_NO_REGION);
}

/**
 * Harness probe for the right-click selection path (Phase 40 item 1).
 *
 * Driven by the GMUX_SHOT hook (`selectionMenu` on ShotDriveSpec), which owns
 * the project and the real session; everything gesture-shaped lives here so
 * the shared harness file carries four lines of this feature and no more.
 *
 * The three things it exists to read, in order, for one right-click position:
 *
 *   1. what is selected after a REAL mouse drag over several rows;
 *   2. what is selected immediately after a REAL contextmenu event, which is
 *      where xterm's own handler used to replace or destroy the selection;
 *   3. the labels and the enabled state of every item the menu path produced,
 *      and optionally the result of running one of those items for real.
 *
 * Nothing is mocked but the OS menu. The drag is real mouse events at real
 * cell coordinates, so xterm's SelectionService, the pane's React handler,
 * `showTerminalMenu` and `terminalMenuItems` are all on the path. The menu is
 * recorded by swapping the store's `setMenu` action for a recorder, for two
 * reasons: the preload bridge is a `contextBridge` object and cannot be
 * monkeypatched, and a real `Menu.popup` takes an OS mouse grab that no
 * automated run can dismiss. The recorded item's own `run` is then called, so
 * the action under test is the shipped one and not a copy of it.
 *
 * What this cannot see: the native menu's own drawing. `Menu.popup` opens an
 * NSMenu outside the BrowserWindow and `capturePage` only sees the window.
 */

import { measureCells, screenElement } from './capture/metrics';
import { getTerminal } from './drop/registry';
import type { MenuItemSpec, MenuSpec } from '../state/store';
import { useApp } from '../state/store';

export interface SelectionProbeSpec {
  /** Rows to drag over, 0-based and inclusive, e.g. [2, 4] for three lines. */
  rows: [number, number];
  /** Where the right click lands. */
  at: 'inside' | 'blank';
  /** Pick this menu item for real after recording the menu. Omit to record only. */
  invoke?: string;
}

export interface SelectionProbeReading {
  optionRightClickSelectsWord: boolean;
  beforeMenu: { hasSelection: boolean; text: string };
  afterMenu: { hasSelection: boolean; text: string };
  menu: { label: string; disabled: boolean }[];
  invoked: string | null;
}

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * How far right the drag ends, and how far right the blank-space click lands,
 * as fractions of the pane's width. The gap between them is what makes the
 * second point land outside the selection on the last dragged row.
 */
const DRAG_END_FRACTION = 0.6;
const BLANK_FRACTION = 0.95;

function mouse(
  target: EventTarget,
  type: string,
  x: number,
  y: number,
  init: MouseEventInit = {}
): void {
  target.dispatchEvent(
    new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      ...init
    })
  );
}

/**
 * Drag over `rows` with the primary button, exactly as a hand would.
 *
 * `mousedown` goes to the screen element and bubbles to `.xterm`, which is
 * where xterm binds it. `detail: 1` is not decoration: SelectionService only
 * starts a selection for a single click, and a synthetic event defaults
 * `detail` to 0, which it ignores. The moves and the up go to the DOCUMENT,
 * because that is where `_addMouseDownListeners` puts them so a drag can
 * leave the viewport.
 */
async function dragOverRows(
  screen: HTMLElement,
  cell: { width: number; height: number },
  rows: [number, number]
): Promise<void> {
  const rect = screen.getBoundingClientRect();
  const yOf = (row: number): number => rect.top + (row + 0.5) * cell.height;
  const startX = rect.left + cell.width * 0.5;
  const endX = rect.left + rect.width * DRAG_END_FRACTION;

  mouse(screen, 'mousedown', startX, yOf(rows[0]), {
    button: 0,
    buttons: 1,
    detail: 1
  });
  await wait(40);
  const steps = 6;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    mouse(
      document,
      'mousemove',
      startX + (endX - startX) * t,
      yOf(rows[0]) + (yOf(rows[1]) - yOf(rows[0])) * t,
      { button: 0, buttons: 1 }
    );
    await wait(30);
  }
  mouse(document, 'mouseup', endX, yOf(rows[1]), { button: 0, buttons: 0 });
  await wait(120);
}

/** Read a menu spec's items, dropping the separators. */
function itemsOf(menu: MenuSpec | null): { label: string; disabled: boolean }[] {
  if (menu === null) return [];
  return menu.items
    .filter((item): item is MenuItemSpec => item !== 'sep')
    .map((item) => ({ label: item.label, disabled: item.disabled === true }));
}

export async function driveSelectionMenu(
  sessionId: string,
  spec: SelectionProbeSpec
): Promise<SelectionProbeReading> {
  const term = getTerminal(sessionId);
  const screen = screenElement(sessionId);
  if (term === null || screen === null) {
    throw new Error(`selection probe: no live terminal for ${sessionId}`);
  }
  const metrics = measureCells(term, screen);
  const cell = { width: metrics.cellWidth, height: metrics.cellHeight };

  await dragOverRows(screen, cell, spec.rows);
  const beforeMenu = {
    hasSelection: term.hasSelection(),
    text: term.getSelection()
  };

  // Where the right click lands. Inside means the second cell of the first
  // dragged row, which is inside a multi-row selection by construction.
  // Blank means the far right of the LAST dragged row, past where the drag
  // ended and past the end of any text the command printed — the natural
  // place a hand lands after dragging over a block of output, and the one
  // that used to leave nothing selected at all.
  const rect = screen.getBoundingClientRect();
  const clickX =
    spec.at === 'inside'
      ? rect.left + cell.width * 1.5
      : rect.left + rect.width * BLANK_FRACTION;
  const clickY =
    rect.top + ((spec.at === 'inside' ? spec.rows[0] : spec.rows[1]) + 0.5) * cell.height;

  // An array rather than a nullable local, so the value the callback wrote is
  // readable afterwards without a cast.
  const recorder: MenuSpec[] = [];
  const original = useApp.getState().setMenu;
  useApp.setState({
    setMenu: (menu: MenuSpec | null): void => {
      if (menu !== null) recorder.push(menu);
    }
  });

  let afterMenu: { hasSelection: boolean; text: string };
  try {
    mouse(screen, 'contextmenu', clickX, clickY, { button: 2, buttons: 2 });
    // Read the model in the same turn the handler ran in. xterm's damage, if
    // it were still happening, is synchronous inside its contextmenu
    // listener, so waiting first would measure the wrong instant.
    afterMenu = {
      hasSelection: term.hasSelection(),
      text: term.getSelection()
    };
    // The menu itself arrives after the scrollback read, which is capped at
    // 150 ms. Poll well past that so a slow control client is a slow read and
    // not a false negative.
    for (let i = 0; i < 40 && recorder.length === 0; i++) await wait(100);
  } finally {
    useApp.setState({ setMenu: original });
  }

  const recorded = recorder[0] ?? null;
  const menu = itemsOf(recorded);
  let invoked: string | null = null;
  if (spec.invoke !== undefined && recorded !== null) {
    const wanted = recorded.items.find(
      (item): item is MenuItemSpec =>
        item !== 'sep' && item.label === spec.invoke
    );
    if (wanted !== undefined && wanted.disabled !== true) {
      // The recorded item's OWN run, which is the shipped action.
      wanted.run();
      invoked = wanted.label;
      // Copy as HTML serializes, then writes through the bridge to main.
      await wait(1500);
    }
  }

  return {
    optionRightClickSelectsWord: term.options.rightClickSelectsWord === true,
    beforeMenu,
    afterMenu,
    menu,
    invoked
  };
}

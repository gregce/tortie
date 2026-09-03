/**
 * A selection that keeps growing while the buffer moves — Phase 205 item 3.
 *
 * THE DEFECT, measured at 57d9358 on 2026-09-02. Select some text and the
 * selection stops the moment you scroll. A drag held twenty pixels above the
 * top of a pane for three seconds left `#{scroll_position}` at 0, so the
 * buffer never moved at all and the selection topped out at the forty rows on
 * screen. A wheel during a live drag did scroll, to position 51, but the
 * selection stayed pinned to the same SCREEN rows and came back covering
 * different text. Apple's own Terminal keeps extending in both gestures, and
 * the operator asked for the session panes to match.
 *
 * WHY THE BUFFER NEVER MOVED. xterm scrolls a drag held off the edge on its
 * own fifty millisecond timer, but it scrolls ITS buffer, and a gmux pane's
 * xterm has none: `tmux attach` puts the client in the alternate buffer as
 * its first bytes, so `scrollLines` has nothing to do. The history is the
 * private server's, reached over IPC by ../scroll/surface.ts, and nothing
 * connected the drag to it.
 *
 * WHAT THIS OWNS, AND WHAT IT LEAVES ALONE. An ordinary drag inside the pane
 * is xterm's, untouched, including word and line modes, column select and
 * shift extension. This takes the gesture over at exactly one moment, being
 * the first time the buffer MOVES while a button is down, whether that came
 * from the edge tick below or from the person's own wheel. From then on the
 * selection is re-issued through the public `Terminal.select`, because that
 * is the only way to move the anchor, and it is also what ends xterm's own
 * drag: `setSelection` drops the document listeners and the drag scroll timer
 * it installed. That is why the listeners here are ours from the same moment.
 *
 * AND IT LEAVES A PANE WHOSE MOUSE IS NOT OURS ENTIRELY ALONE, which is a fix
 * round's doing and the one thing that was wrong here. `ScrollSurface` has
 * kept the WHEEL out of two kinds of pane since Phase 12.3, being the three
 * routes in ../scroll/surface.ts's header: a program that asked for mouse
 * reporting, and an app on its own alternate screen, each of which owns the
 * gesture because tmux has no history to show for it. The drag is under the
 * same rule and was not. MEASURED at 44941af with `cat` behind SGR mouse
 * reporting in the pane, a drag held above the top edge scrolled the history
 * from 0 to 104, put the pane into copy mode and painted 43 lines the program
 * never asked for; at 57d9358 the same gesture moved nothing. So `view.owned`
 * is read where the gesture begins and again on every tick, because a picker
 * can open while the button is already down.
 *
 * THE SELECTION IS THE HISTORY, NOT THE SCREEN, which is Phase 209 and the
 * one limit Phase 205 shipped with. As first shipped the anchor was a SCREEN
 * cell moved by the difference of two `#{scroll_position}` readings and
 * clamped at the edge it left by, so a drag that pushed it past the far edge
 * kept extending from that edge rather than off it: an eight second hold
 * above the top edge travelled 668 lines of history and the copy was 43, one
 * screen at the far end, where Apple's own Terminal accumulates across the
 * whole travel. Reproduced at a87a826 on 2026-09-03 at 324 travelled and 43
 * copied, the same law at a smaller overshoot. Now each end is a HISTORY
 * position, being `history - position + row` and a column, read from the
 * same display-message the surface already makes, and it is never clamped.
 * The highlight is that range projected through the current view and
 * clamped only for drawing, by ./drag-math.ts's `visibleSpan`, and it is
 * re-projected on every view change for as long as xterm keeps it, so
 * scrolling back to the anchor shows it drawn again. Copy composes the text
 * from tmux between the two positions, in ../capture/history-copy.ts, and a
 * selection that never left the screen keeps xterm's own path byte for byte.
 *
 * A STREAMING PANE cannot move the anchor, and that is arithmetic rather than
 * care: the poll re-anchors a parked view by exactly the lines that arrived,
 * so `history` and `position` grow together and the line under a row is the
 * line that was there. MEASURED at the parent with a pane printing ten lines
 * a second under a live drag: the screen cell anchor slid 38 rows in four
 * seconds and the line the person anchored on fell out of the copy, while
 * the history position of that line was the same number before and after.
 *
 * THE LIMIT NOW, with the number a person will meet it at. The history is
 * tmux's and it is finite: the Scrollback depth setting, 25,000 lines by
 * default and up to 100,000, and once it is full each new line pushes the
 * oldest out. A selection cannot reach above the oldest line the server
 * still holds, the drag stops there rather than running on, and a selection
 * left open across a full history for long enough has its far end walk
 * forward with the lines that fall off. The copy says nothing about either
 * and simply stops where the history does.
 */

import type { Terminal } from '@xterm/xterm';
import { measureCells, screenElement } from '../capture/metrics';
import { holdHistorySelection } from '../capture/history-selection';
import type {
  Cell,
  HistoryFrame,
  HistoryPos,
  HistoryRange,
  PaneBox
} from './drag-math';
import {
  cellAtPoint,
  edgeScrollLines,
  historyRange,
  spansHistory,
  toHistory,
  visibleSpan
} from './drag-math';
import { scrollBridge } from './surface';
import type { ScrollSurface, ScrollView } from './surface';

/**
 * Edge tick. The same fifty milliseconds xterm uses for its own drag scroll,
 * so a pane that scrolls tmux feels like every other terminal on the machine.
 */
const EDGE_TICK_MS = 50;

/**
 * THE CAPTURE PHASE IS NOT A PREFERENCE, IT IS THE ONLY PHASE THAT WORKS, and
 * the reason is worth the six lines because a later round will otherwise
 * "tidy" it away.
 *
 * MEASURED in the app, 2026-09-02, over 38 real mouse moves during one drag,
 * with one counter per listener target:
 *
 *     document, capture   38     body, bubble        38
 *     document, bubble     0     window, bubble       0
 *
 * xterm's SelectionService adds its own `mousemove` listener to the SAME
 * document when the drag starts, and its first statement is
 * `event.stopImmediatePropagation()` (SelectionService.ts, `_handleMouseMove`,
 * with the comment that it is stopping mouse events reaching the pty). Its
 * mousedown handler is on `.xterm`, a descendant of the mount, so it runs and
 * registers BEFORE the mount's own handler below, and on one node the
 * immediate form kills every listener added after it. So a bubble listener
 * here is registered, is never called, and looks exactly like a listener that
 * was never registered at all: the pointer stayed at the position it was
 * pressed at for all 72 ticks of a three second hold.
 */
const LISTEN: AddEventListenerOptions = { capture: true };

export class DragSelect {
  private box: PaneBox | null = null;
  /**
   * Where the drag began, as a history position. Set from the pressed cell
   * and the surface's last reading, then refined by a fresh reading of the
   * same display-message, because at the live bottom of a streaming pane the
   * last poll can be a second old.
   */
  private anchor: HistoryPos | null = null;
  /** The latest view, so the anchor can be projected without a round trip. */
  private history = 0;
  private position = 0;
  private pointer: { x: number; y: number } | null = null;
  /** True once the buffer has moved under this drag and we own the range. */
  private taken = false;
  /** The range this drag last drew, kept after the button comes up. */
  private held: HistoryRange | null = null;
  /** True while a `select` here is the cause of xterm's own change event. */
  private reissuing = false;
  /** Counts gestures, so a fresh reading cannot land on the wrong one. */
  private gesture = 0;
  private ticker: ReturnType<typeof setInterval> | null = null;
  private unsubscribe: (() => void) | null = null;
  private unwatch: (() => void) | null = null;
  /**
   * The document the moves and the release are listened for on, held so the
   * teardown removes them from the same one it added them to. A drag leaves
   * the pane, which is why they are not on the element, and it is where xterm
   * puts its own for that reason.
   */
  private doc: Document | null = null;

  private readonly onMove = (event: MouseEvent): void => {
    this.pointer = { x: event.clientX, y: event.clientY };
    if (this.taken) this.render();
  };
  private readonly onUp = (): void => {
    this.stop();
  };
  private readonly onView = (view: ScrollView): void => {
    const moved = view.position !== this.position;
    const grew = view.history !== this.history;
    if (!moved && !grew) return;
    this.position = view.position;
    this.history = view.history;
    if (this.anchor !== null) {
      // The buffer moved while a button is down. That is the takeover moment,
      // and it is the same one for the edge tick and for a wheel. History
      // growing at the live bottom is not a move: an in-screen drag stays
      // xterm's while lines arrive, exactly as it did before.
      if (moved) this.taken = true;
      if (this.taken) this.render();
      return;
    }
    // No drag, but a range is held: the view moved under it, so draw the
    // part of it that is on screen now. This is what makes scrolling back to
    // the anchor show it highlighted.
    if (this.held !== null) this.project(this.held);
  };
  /**
   * xterm changed the selection and it was not us: a click, a new drag, a
   * select all, a clear. The held range describes nothing now, so drop it.
   * Nothing here fires on a repaint; xterm reports its own gestures and its
   * public calls, never the bytes tmux writes.
   */
  private readonly onSelectionChange = (): void => {
    if (this.reissuing) return;
    this.release();
  };

  constructor(
    private readonly sessionId: string,
    private readonly term: Terminal,
    private readonly surface: ScrollSurface
  ) {}

  /** Listen on the pane's mount. Returns the teardown. */
  attach(container: HTMLElement): () => void {
    const down = (event: MouseEvent): void => this.begin(event);
    container.addEventListener('mousedown', down);
    this.unsubscribe = this.surface.subscribe(this.onView);
    const watch = this.term.onSelectionChange(this.onSelectionChange);
    this.unwatch = () => watch.dispose();
    return () => {
      container.removeEventListener('mousedown', down);
      this.stop();
      this.release();
      this.unsubscribe?.();
      this.unsubscribe = null;
      this.unwatch?.();
      this.unwatch = null;
    };
  }

  /** True while a drag this module is watching is in progress. */
  get dragging(): boolean {
    return this.anchor !== null;
  }

  private begin(event: MouseEvent): void {
    // Primary button, one click, no modifier. A double or triple click is
    // xterm's word and line mode, alt is its column mode, and shift extends
    // an existing selection. Every one of those stays xterm's own.
    if (event.button !== 0 || event.detail !== 1) return;
    if (event.shiftKey || event.altKey || event.metaKey || event.ctrlKey) {
      return;
    }
    // The pane's mouse belongs to the program inside it. See the header.
    if (!this.surface.view.owned) return;
    const box = this.geometry();
    if (box === null) return;
    this.stop();
    this.release();
    this.box = box;
    const cell = this.pressedCell(event.clientX, event.clientY, box);
    const view = this.surface.view;
    this.history = view.history;
    this.position = view.position;
    this.anchor = toHistory(cell, this.frame(box));
    this.pointer = { x: event.clientX, y: event.clientY };
    this.taken = false;
    this.gesture += 1;
    const gesture = this.gesture;
    // The reading the anchor was set from is the last poll, up to a second
    // old at the live bottom. Ask once more, now, and move the anchor to the
    // line that was really under the pointer; the answer is a millisecond
    // over the control client, and it lands on this gesture alone.
    void scrollBridge()
      ?.state({ sessionId: this.sessionId })
      .then((state) => {
        if (gesture !== this.gesture || this.anchor === null) return;
        if (!state.hasPane) return;
        this.anchor = toHistory(cell, {
          history: state.history,
          position: state.position,
          rows: box.rows,
          cols: box.cols
        });
        if (this.taken) this.render();
      })
      .catch(() => undefined);
    const target = event.target;
    this.doc =
      target instanceof Node && target.ownerDocument !== null
        ? target.ownerDocument
        : ((globalThis.document as Document | undefined) ?? null);
    this.doc?.addEventListener('mousemove', this.onMove, LISTEN);
    this.doc?.addEventListener('mouseup', this.onUp, LISTEN);
    this.ticker = setInterval(() => this.tick(), EDGE_TICK_MS);
  }

  /**
   * The cell the press landed on, adjusted the way xterm adjusts its own
   * start: a press on the second half of a wide character selects from the
   * cell after it (SelectionService, `_handleMouseDown`), so the range here
   * begins where xterm's did and the two agree on the first character.
   */
  private pressedCell(clientX: number, clientY: number, box: PaneBox): Cell {
    const cell = cellAtPoint(clientX, clientY, box);
    const width = this.term.buffer?.active
      .getLine(cell.row)
      ?.getCell(cell.col)
      ?.getWidth();
    return width === 0 ? { col: cell.col + 1, row: cell.row } : cell;
  }

  /** One edge tick: scroll the private server's history, nothing else. */
  private tick(): void {
    // Read again, not once: a program can turn mouse reporting on, or open on
    // its own alternate screen, while the button is already down.
    if (!this.surface.view.owned) return;
    const pointer = this.pointer;
    if (pointer === null) return;
    const box = this.geometry() ?? this.box;
    if (box === null) return;
    this.box = box;
    const lines = edgeScrollLines(pointer.y, box);
    if (lines !== 0) this.surface.scrollBy(lines);
  }

  private frame(box: PaneBox): HistoryFrame {
    return {
      history: this.history,
      position: this.position,
      rows: box.rows,
      cols: box.cols
    };
  }

  /** The range from the anchor to the pointer, drawn and held. */
  private render(): void {
    const box = this.box;
    const anchor = this.anchor;
    const pointer = this.pointer;
    if (box === null || anchor === null || pointer === null) return;
    const head = toHistory(
      cellAtPoint(pointer.x, pointer.y, box),
      this.frame(box)
    );
    this.hold(historyRange(anchor, head));
  }

  /** Hold a range for the copy verbs and draw its visible part. */
  private hold(range: HistoryRange): void {
    this.held = range;
    const cols = this.box?.cols ?? this.term.cols;
    holdHistorySelection(this.sessionId, {
      start: range.start,
      end: range.end,
      cols,
      spansScreen: () => {
        const box = this.box;
        return box === null ? true : spansHistory(range, this.frame(box));
      },
      redraw: () => {
        if (this.held === null) this.hold(range);
      }
    });
    this.project(range);
  }

  /** Draw the part of a range that is on screen, through xterm's public API. */
  private project(range: HistoryRange): void {
    const box = this.box;
    if (box === null) return;
    const span = visibleSpan(range, this.frame(box));
    this.reissuing = true;
    try {
      if (span === null) this.term.clearSelection();
      else this.term.select(span.column, span.row, span.length);
    } finally {
      this.reissuing = false;
    }
  }

  /** Forget the held range. The highlight, if any, is xterm's to keep. */
  private release(): void {
    if (this.held === null) return;
    this.held = null;
    holdHistorySelection(this.sessionId, null);
  }

  /** End the gesture, leaving whatever is selected selected. */
  private stop(): void {
    if (this.ticker !== null) {
      clearInterval(this.ticker);
      this.ticker = null;
    }
    this.doc?.removeEventListener('mousemove', this.onMove, LISTEN);
    this.doc?.removeEventListener('mouseup', this.onUp, LISTEN);
    this.doc = null;
    this.anchor = null;
    this.pointer = null;
    // A drag that never took over drew nothing here, so there is nothing to
    // hold: the selection on screen is xterm's own.
    if (!this.taken) this.release();
    this.taken = false;
  }

  private geometry(): PaneBox | null {
    const screen = screenElement(this.sessionId);
    if (screen === null) return null;
    const cells = measureCells(this.term, screen);
    if (cells.cellWidth <= 0 || cells.cellHeight <= 0) return null;
    const rect = screen.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      cellWidth: cells.cellWidth,
      cellHeight: cells.cellHeight,
      cols: cells.cols,
      rows: cells.rows
    };
  }
}

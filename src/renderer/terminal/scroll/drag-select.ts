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
 * THE LIMIT, and it is stated because a person will reach it. The selection
 * is what the SCREEN holds, so a drag that pushes the anchor past the far
 * edge keeps extending from that edge rather than off it, and what you copy
 * is what you can see highlighted. Highlight and copy therefore never
 * disagree. Selecting across more history than one screen would mean
 * composing the text from tmux rather than from the pane, which is a bigger
 * change than this one.
 */

import type { Terminal } from '@xterm/xterm';
import { measureCells, screenElement } from '../capture/metrics';
import type { Cell, PaneBox } from './drag-math';
import {
  anchorAfterScroll,
  cellAtPoint,
  edgeScrollLines,
  selectionSpan
} from './drag-math';
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
  /** Where the drag began, in screen cells, before anything scrolled. */
  private anchor: Cell | null = null;
  /** `#{scroll_position}` when the drag began. */
  private basePosition = 0;
  /** The latest reading, so the anchor can be tracked without a round trip. */
  private position = 0;
  private pointer: { x: number; y: number } | null = null;
  /** True once the buffer has moved under this drag and we own the range. */
  private taken = false;
  private ticker: ReturnType<typeof setInterval> | null = null;
  private unsubscribe: (() => void) | null = null;
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
    if (this.anchor === null || view.position === this.position) return;
    this.position = view.position;
    // The buffer moved while a button is down. That is the takeover moment,
    // and it is the same one for the edge tick and for a wheel.
    this.taken = true;
    this.render();
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
    return () => {
      container.removeEventListener('mousedown', down);
      this.stop();
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
    const box = this.geometry();
    if (box === null) return;
    this.stop();
    this.box = box;
    this.anchor = cellAtPoint(event.clientX, event.clientY, box);
    this.pointer = { x: event.clientX, y: event.clientY };
    this.basePosition = this.surface.view.position;
    this.position = this.basePosition;
    this.taken = false;
    const target = event.target;
    this.doc =
      target instanceof Node && target.ownerDocument !== null
        ? target.ownerDocument
        : ((globalThis.document as Document | undefined) ?? null);
    this.doc?.addEventListener('mousemove', this.onMove, LISTEN);
    this.doc?.addEventListener('mouseup', this.onUp, LISTEN);
    this.unsubscribe = this.surface.subscribe(this.onView);
    this.ticker = setInterval(() => this.tick(), EDGE_TICK_MS);
  }

  /** One edge tick: scroll the private server's history, nothing else. */
  private tick(): void {
    const pointer = this.pointer;
    if (pointer === null) return;
    const box = this.geometry() ?? this.box;
    if (box === null) return;
    this.box = box;
    const lines = edgeScrollLines(pointer.y, box);
    if (lines !== 0) this.surface.scrollBy(lines);
  }

  /** Re-issue the range from the tracked anchor to the pointer. */
  private render(): void {
    const box = this.box;
    const anchor = this.anchor;
    const pointer = this.pointer;
    if (box === null || anchor === null || pointer === null) return;
    const tracked = anchorAfterScroll(
      anchor,
      this.position - this.basePosition,
      box
    );
    const span = selectionSpan(
      tracked,
      cellAtPoint(pointer.x, pointer.y, box),
      box.cols
    );
    this.term.select(span.column, span.row, span.length);
  }

  /** End the gesture, leaving whatever is selected selected. */
  private stop(): void {
    if (this.ticker !== null) {
      clearInterval(this.ticker);
      this.ticker = null;
    }
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.doc?.removeEventListener('mousemove', this.onMove, LISTEN);
    this.doc?.removeEventListener('mouseup', this.onUp, LISTEN);
    this.doc = null;
    this.anchor = null;
    this.pointer = null;
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


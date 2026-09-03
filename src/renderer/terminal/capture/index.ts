/**
 * Terminal capture and copy — the actions behind the context menu (Phase 12
 * items 1 and 2), one place so the menu, the keyboard and any future surface
 * (a session-tab item, a command) all take the same path.
 *
 * Three sources, one sink (research 17 §5):
 *
 *   Capture Visible      → main capturePage(.xterm-screen rect)     pixel-exact
 *   Capture Selection    → on screen? the row band, same way
 *                          scrolled away? the HTML path below
 *   Capture Last N Lines → tmux capture-pane -e → an off-screen Terminal
 *                          → inline HTML → SVG foreignObject → canvas → PNG
 *
 * Everything lands on the clipboard, and the toast offers Save… — the bytes
 * are already in main, so saving never re-shoots a terminal that has since
 * scrolled.
 */

import { Terminal } from '@xterm/xterm';
import type { IBufferRange } from '@xterm/xterm';
import type { InstalledGmuxApi } from '@shared/ipc';
import type { Session } from '@shared/types';
import { errorText, useApp } from '../../state/store';
import { getTerminal } from '../drop/registry';
import {
  resolveTerminalFontFamily,
  resolveTerminalTheme,
  TERMINAL_BACKGROUND,
  TERMINAL_FONT_SIZE,
  TERMINAL_LETTER_SPACING,
  TERMINAL_LINE_HEIGHT
} from '../theme';
import {
  currentWorkAreaFont,
  faceCssFor,
  hasBoldRuns
} from './capture-fonts';
import { historyRangeToCopy, historySelection } from './history-selection';
import type {
  HistorySelection,
  HistorySelectionRange
} from './history-selection';
import type { CellMetrics } from './metrics';
import {
  measureCells,
  rowBandRect,
  screenElement,
  visibleScreenRect
} from './metrics';
import { historyLinesFor, paneLines, selectionBand } from './range';
import { letterSpacingCorrection, rasterizeHtml } from './rasterize';
import { serializeAsHtml, toClipboardHtml } from './serialize';
import { gmuxBridge } from '../../bridge';

/** Line presets the menu offers. Past 1,000 rows a PNG stops being useful. */
export const CAPTURE_PRESETS = [250, 1000] as const;

/** Hard ceiling on rasterized rows (a 2,000-row PNG measured 47 MB). */
const MAX_CAPTURE_ROWS = 1000;

type CaptureBridge = NonNullable<InstalledGmuxApi['capture']>;

/** The slice of Terminal the selection dance needs. */
type TerminalLike = Pick<
  Terminal,
  'getSelectionPosition' | 'clearSelection' | 'select' | 'selectLines'
>;

/** The capture surface on the preload bridge, or null on older preloads. */
export function captureBridge(): CaptureBridge | null {
  const api = gmuxBridge();
  return api?.capture ?? null;
}

function toast(
  kind: 'info' | 'success' | 'error',
  text: string,
  action?: { label: string; run: () => void }
): void {
  useApp.getState().toast(kind, text, action ? { action } : undefined);
}

/**
 * Captures announce themselves and stay put: the clipboard was just replaced
 * (never do that silently), and this toast is the only place Save… lives —
 * a five-second window to notice it would make saving a matter of reflexes.
 */
function captured(text: string): void {
  const bridge = captureBridge();
  if (bridge === null) return;
  useApp.getState().toast('success', text, {
    sticky: true,
    action: {
      label: 'Save…',
      run: () => {
        void bridge.saveLast().then(
          (res) => {
            if (res.path !== null) toast('success', 'Saved to your Mac.');
          },
          (err: unknown) => toast('error', errorText(err))
        );
      }
    }
  });
}

function failed(err: unknown): void {
  toast('error', errorText(err));
}

// ---------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------

/** True when a terminal is mounted for this session (not ended or saved). */
export function hasLiveTerminal(sessionId: string): boolean {
  return getTerminal(sessionId) !== null;
}

/**
 * True when this session has text selected right now.
 *
 * A selection held in the history (Phase 209) counts even when none of it is
 * on screen, because the person scrolled away from it rather than dropping
 * it: command C then copies it, exactly as Apple's Terminal does, rather than
 * sending an interrupt to the session.
 */
export function hasSelection(sessionId: string): boolean {
  return (
    (getTerminal(sessionId)?.hasSelection() ?? false) ||
    historySelection(sessionId) !== null
  );
}

/** What was selected at the instant the user right-clicked. */
export interface TerminalSelectionSnapshot {
  /**
   * The selected text, exactly as Copy would write it. For a selection held
   * in the history it is the part on screen, and `history` is the answer.
   */
  text: string;
  /**
   * The selected range on screen, so a later serialize reads the same cells.
   * Absent only for a selection held in the history with no row on screen.
   */
  position?: IBufferRange;
  /**
   * The two history positions, Phase 209, for a selection a drag that
   * scrolled is holding. Every verb takes this over `text` and `position`
   * when present.
   */
  history?: HistorySelectionRange;
}

/** The session row, for the tmux name a history read needs. */
function sessionRow(sessionId: string): Session | undefined {
  return useApp.getState().sessions.find((s) => s.id === sessionId);
}

/**
 * Read this session's selection now, or null when nothing is selected.
 *
 * The context menu is built after an await of up to 150 ms for the scrollback
 * read, and each item's `run` fires later still, after the native menu has
 * closed. Reading the live model at three different instants is what let the
 * enabled state and the action disagree. One read at right-click time removes
 * that whole class of drift.
 */
export function snapshotSelection(
  sessionId: string
): TerminalSelectionSnapshot | null {
  const term = getTerminal(sessionId);
  if (term === null) return null;
  // A selection a drag that scrolled is holding is its two history
  // positions, which do not move, so the snapshot is exact whatever the
  // screen does later.
  const history = historyRangeToCopy(sessionId);
  if (history !== null) {
    const position = term.getSelectionPosition();
    return {
      text: term.getSelection(),
      ...(position !== undefined ? { position } : {}),
      history
    };
  }
  if (!term.hasSelection()) return null;
  const position = term.getSelectionPosition();
  if (position === undefined) return null;
  const text = term.getSelection();
  // An empty string is what `copySelection` has always refused to write, so a
  // snapshot of one would enable a menu item that then did nothing.
  if (text.length === 0) return null;
  return { text, position };
}

/**
 * The history range a verb should compose from: the snapshot's when one was
 * taken, the live one otherwise, and null for a drag that never scrolled,
 * which stays on xterm's own path byte for byte.
 */
function historyToCopy(
  sessionId: string,
  snapshot: TerminalSelectionSnapshot | null | undefined
): HistorySelectionRange | null {
  if (snapshot === undefined) return historyRangeToCopy(sessionId);
  return snapshot?.history ?? null;
}

/**
 * Text and clipboard HTML for a selection in the history, composed from the
 * pane's own server (./history-copy.ts, behind a lazy door).
 */
async function composeFromHistory(
  sessionId: string,
  bridge: CaptureBridge,
  history: HistorySelectionRange,
  withHtml: boolean
): Promise<{ text: string; html: string } | null> {
  const session = sessionRow(sessionId);
  if (session === undefined) return null;
  const { composeHistorySelection } = await import('./history-copy');
  return composeHistorySelection(
    bridge,
    session.tmuxName,
    history,
    withHtml
      ? {
          theme: resolveTerminalTheme(),
          fontFamily: resolveTerminalFontFamily(),
          fontSizePx: TERMINAL_FONT_SIZE
        }
      : null
  );
}

/**
 * Copy the selection as plain text. Returns false when nothing was selected.
 *
 * With a `snapshot` the text is the snapshot's and the live model is never
 * read. Without one the behavior is unchanged, which is what keeps the ⌘C
 * path (no menu, no gap) exactly as it was.
 */
export async function copySelection(
  sessionId: string,
  snapshot?: TerminalSelectionSnapshot | null
): Promise<boolean> {
  const bridge = captureBridge();
  if (bridge === null) return false;
  const history = historyToCopy(sessionId, snapshot);
  if (history !== null) {
    try {
      const composed = await composeFromHistory(sessionId, bridge, history, false);
      if (composed === null || composed.text.length === 0) return false;
      await bridge.writeRich({ text: composed.text, html: '' });
      return true;
    } catch (err) {
      failed(err);
      return false;
    }
  }
  let text: string;
  if (snapshot != null) {
    text = snapshot.text;
  } else {
    const term = getTerminal(sessionId);
    if (term === null || !term.hasSelection()) return false;
    text = term.getSelection();
  }
  if (text.length === 0) return false;
  await bridge.writeRich({ text, html: '' });
  return true;
}

/**
 * Copy the selection with its colors and attributes intact. The light
 * rendition (black on white, ANSI colors kept) is what a document wants;
 * the dark rendition belongs to the capture items.
 *
 * With a `snapshot` the serializer is handed the snapshot's range, so the
 * bytes on the clipboard are the bytes the menu was built from.
 */
export async function copySelectionAsHtml(
  sessionId: string,
  snapshot?: TerminalSelectionSnapshot | null
): Promise<void> {
  const term = getTerminal(sessionId);
  const bridge = captureBridge();
  if (term === null || bridge === null) return;
  const history = historyToCopy(sessionId, snapshot);
  if (history !== null) {
    try {
      const composed = await composeFromHistory(sessionId, bridge, history, true);
      if (composed === null || composed.text.length === 0) return;
      await bridge.writeRich(composed);
      toast('success', 'Copied with colors.');
    } catch (err) {
      failed(err);
    }
    return;
  }
  if (snapshot == null && !term.hasSelection()) return;
  try {
    const body = serializeAsHtml(term, {
      theme: resolveTerminalTheme(),
      onlySelection: true,
      selection: snapshot?.position,
      includeGlobalBackground: false,
      fontFamily: resolveTerminalFontFamily(),
      fontSizePx: TERMINAL_FONT_SIZE
    });
    await bridge.writeRich({
      text: snapshot?.text ?? term.getSelection(),
      html: toClipboardHtml(body)
    });
    toast('success', 'Copied with colors.');
  } catch (err) {
    failed(err);
  }
}

/** Paste through the browser command so xterm applies bracketed paste. */
export async function pasteIntoSession(): Promise<void> {
  const bridge = captureBridge();
  if (bridge === null) return;
  try {
    await bridge.paste();
  } catch (err) {
    failed(err);
  }
}

/** Select every line the terminal is holding. */
export function selectAll(sessionId: string): void {
  getTerminal(sessionId)?.selectAll();
}

/**
 * Clear: drop what is on screen AND the server-side history, so "capture the
 * last 250 lines" agrees with what the user just cleared.
 */
export async function clearSession(
  sessionId: string,
  tmuxName: string
): Promise<void> {
  getTerminal(sessionId)?.clear();
  const bridge = captureBridge();
  if (bridge === null) return;
  try {
    await bridge.clearHistory(tmuxName);
  } catch {
    // The screen is already clear; a server that would not drop its history
    // is not worth a toast.
  }
}

// ---------------------------------------------------------------------------
// Capture
// ---------------------------------------------------------------------------

/** What lands in the file name: `gmux-<session>-<stamp>.png`. */
function suggestedName(session: Session): string {
  return session.name;
}

/** Let xterm's rAF-scheduled renderer paint before we grab the pixels. */
function nextFrames(count = 2): Promise<void> {
  return new Promise((resolve) => {
    let left = count;
    const tick = (): void => {
      left -= 1;
      if (left <= 0) resolve();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/**
 * Run a pixel capture with the selection highlight OFF.
 *
 * capturePage takes the composited frame, so a live selection would wash the
 * whole image in `selectionBackground` — a screenshot of highlighted text,
 * not of the text. The selection is put back afterwards (exactly for a
 * one-row drag, as full lines for a multi-row one, which is all the public
 * API can express).
 *
 * `restore` names the range to put back. The menu passes the range it decided
 * on when the user right-clicked, for the same reason the verbs above take a
 * snapshot: the range read here is read later and could have moved.
 */
async function withoutSelection<T>(
  term: TerminalLike,
  run: () => Promise<T>,
  restore?: IBufferRange,
  held?: HistorySelection | null
): Promise<T> {
  const live = term.getSelectionPosition();
  // Nothing is highlighted, so there is nothing to wash out and nothing to
  // put back. Restoring a range here would CREATE a selection the user never
  // made.
  if (live === undefined) return run();
  const selection = restore ?? live;
  term.clearSelection();
  await nextFrames();
  try {
    return await run();
  } finally {
    // A selection held in the history is put back through its own entry,
    // read before the clear dropped it, so a photograph does not shorten it
    // to the screen (Phase 209).
    if (held != null) {
      held.redraw();
    } else if (selection.start.y === selection.end.y) {
      term.select(
        selection.start.x,
        selection.start.y,
        Math.max(1, selection.end.x - selection.start.x)
      );
    } else {
      term.selectLines(selection.start.y, selection.end.y);
    }
  }
}

/** The visible screen, exactly as it is composited — glyphs, overlays, all. */
export async function captureVisible(session: Session): Promise<void> {
  const term = getTerminal(session.id);
  const bridge = captureBridge();
  const screen = screenElement(session.id);
  if (term === null || bridge === null || screen === null) return;
  const rect = visibleScreenRect(session.id, screen);
  if (rect === null) {
    toast('info', 'This session is not on screen.');
    return;
  }
  try {
    await withoutSelection(
      term,
      () => bridge.viewport({ rect, suggestedName: suggestedName(session) }),
      undefined,
      historySelection(session.id)
    );
    captured('Captured this screen to the clipboard.');
  } catch (err) {
    failed(err);
  }
}

/**
 * The selected rows. On screen → a pixel-exact band; scrolled out of view →
 * the HTML path over the same buffer range.
 *
 * With a `snapshot` the rows are the snapshot's, and the highlight put back
 * after the shot is the snapshot's too.
 */
export async function captureSelection(
  session: Session,
  snapshot?: TerminalSelectionSnapshot | null
): Promise<void> {
  const term = getTerminal(session.id);
  const bridge = captureBridge();
  const screen = screenElement(session.id);
  if (term === null || bridge === null || screen === null) return;
  const metrics = measureCells(term, screen);
  // A selection that reaches off the screen follows Copy (Phase 209): its
  // rows come from the pane's own server, as drawn rather than joined,
  // because a picture keeps the screen's wrapping.
  const history = historyToCopy(session.id, snapshot);
  if (history !== null) {
    await captureHistorySelection(session, bridge, metrics, history);
    return;
  }
  const selection = snapshot?.position ?? term.getSelectionPosition();
  if (selection === undefined) return;

  const band = selectionBand(
    selection,
    term.buffer.active.viewportY,
    metrics.rows
  );

  if (band.onScreen) {
    const rect = rowBandRect(
      session.id,
      screen,
      metrics,
      band.topRow,
      band.rowCount
    );
    if (rect !== null) {
      try {
        await withoutSelection(
          term,
          () => bridge.viewport({ rect, suggestedName: suggestedName(session) }),
          selection,
          historySelection(session.id)
        );
        captured('Captured your selection to the clipboard.');
        return;
      } catch (err) {
        failed(err);
        return;
      }
    }
  }

  // Scrolled away: render the rows from the buffer instead. A Select All in a
  // long buffer would otherwise ask the canvas for tens of thousands of rows,
  // so keep the most recent slice and say so.
  const endLine = selection.end.y;
  const startLine = Math.max(selection.start.y, endLine - MAX_CAPTURE_ROWS + 1);
  const rowCount = endLine - startLine + 1;
  if (rowCount < band.rowCount) {
    toast('info', `Capturing the last ${rowCount} of the selected lines.`);
  }
  try {
    // Measure the advance against a face that has finished loading. Without
    // this the correction below can be computed from the fallback face on the
    // first capture after a preset change, which is a wrong number rather than
    // a missing one. `captureHistory` has had this await since Phase 12.
    try {
      await document.fonts?.ready;
    } catch {
      /* no FontFaceSet outside a browser, so proceed */
    }
    const html = serializeAsHtml(term, {
      theme: resolveTerminalTheme(),
      range: { startLine, endLine },
      includeGlobalBackground: true,
      fontFamily: resolveTerminalFontFamily(),
      fontSizePx: TERMINAL_FONT_SIZE,
      lineHeightPx: metrics.cellHeight,
      letterSpacingPx: letterSpacingCorrection(
        metrics.cellWidth,
        TERMINAL_FONT_SIZE,
        resolveTerminalFontFamily()
      )
    });
    const png = await rasterizeHtml({
      html,
      widthCss: metrics.cellWidth * metrics.cols,
      heightCss: metrics.cellHeight * rowCount,
      background: resolveTerminalTheme().background ?? TERMINAL_BACKGROUND,
      // The SVG is its own document and the page's faces do not reach into
      // it, so a bundled preset has to travel with the capture (Phase 78).
      fontCss: await faceCssFor(currentWorkAreaFont(), {
        bold: hasBoldRuns(html)
      })
    });
    await bridge.image({ png, suggestedName: suggestedName(session) });
    captured('Captured your selection to the clipboard.');
  } catch (err) {
    failed(err);
  }
}

/**
 * The last `lines` lines, ending at the bottom of the visible screen —
 * CleanShot's long capture, sourced from the durable server rather than the
 * renderer's buffer (which holds only what streamed since this attach).
 */
export async function captureHistory(
  session: Session,
  lines: number
): Promise<void> {
  const term = getTerminal(session.id);
  const bridge = captureBridge();
  const screen = screenElement(session.id);
  if (term === null || bridge === null || screen === null) return;

  // NO alternate-screen guard. `tmux attach` sends ESC[?1049h as its very
  // FIRST bytes (measured on the wire: the attach client owns the outer
  // terminal's alternate buffer so detaching can restore the user's screen),
  // so xterm's `buffer.active.type` reads 'alternate' for EVERY gmux session
  // for its whole life. Reading it told us nothing about the pane and made
  // this — item 2's headline capability — permanently unreachable: the two
  // menu items were always disabled and this function always bailed with
  // "showing a full-screen app". The pane's own history lives in the tmux
  // server either way, as deep as the Scrollback depth setting, 25,000 lines
  // by default and up to 100,000 (Phase 209 corrected the 50,000 that stood
  // here, which was one server's setting); when there is genuinely nothing
  // to show, `paneLines` comes back empty and says so below.
  const metrics = measureCells(term, screen);

  try {
    const { ansi } = await bridge.pane({
      tmuxName: session.tmuxName,
      historyLines: historyLinesFor(lines, metrics.rows)
    });
    const rows = paneLines(ansi, MAX_CAPTURE_ROWS);
    if (rows.length === 0) {
      toast('info', 'This session has no history yet.');
      return;
    }
    await rasterizeRows(session, bridge, metrics, rows);
    captured(`Captured the last ${rows.length} lines to the clipboard.`);
  } catch (err) {
    failed(err);
  }
}

/**
 * The selected rows when the selection reaches off the screen (Phase 209):
 * `capture-pane` between its two lines, as drawn, through the same
 * off-screen terminal the line count rows use. The cap is the same one the
 * on-screen path applies when it renders from the buffer, and it says so.
 */
async function captureHistorySelection(
  session: Session,
  bridge: CaptureBridge,
  metrics: CellMetrics,
  history: HistorySelectionRange
): Promise<void> {
  try {
    const { readHistoryRows } = await import('./history-copy');
    const wanted = history.end.line - history.start.line + 1;
    const start = Math.max(
      history.start.line,
      history.end.line - MAX_CAPTURE_ROWS + 1
    );
    const { rows } = await readHistoryRows(
      bridge,
      session.tmuxName,
      start,
      history.end.line,
      false
    );
    if (rows.length === 0) {
      toast('info', 'This session has no history yet.');
      return;
    }
    if (rows.length < wanted) {
      toast('info', `Capturing the last ${rows.length} of the selected lines.`);
    }
    await rasterizeRows(session, bridge, metrics, rows);
    captured('Captured your selection to the clipboard.');
  } catch (err) {
    failed(err);
  }
}

/**
 * Rows of pane text with their SGR escapes, drawn by an off-screen terminal
 * of the pane's width and rasterized to a PNG on the clipboard. Shared by
 * the line count rows and by a selection in the history.
 */
async function rasterizeRows(
  session: Session,
  bridge: CaptureBridge,
  metrics: CellMetrics,
  rows: string[]
): Promise<void> {
  const fontFamily = resolveTerminalFontFamily();
  const theme = resolveTerminalTheme();
  let offscreen: Terminal | null = null;
  let host: HTMLDivElement | null = null;
  try {
    try {
      await document.fonts?.ready;
    } catch {
      /* no FontFaceSet outside a browser, so proceed */
    }

    offscreen = new Terminal({
      cols: metrics.cols,
      rows: rows.length,
      // NOT zero: if any captured line is wider than the pane it wraps into
      // an extra row and the top of the capture falls off the buffer. Give it
      // room and read the real length back after writing.
      scrollback: MAX_CAPTURE_ROWS,
      fontFamily,
      fontSize: TERMINAL_FONT_SIZE,
      lineHeight: TERMINAL_LINE_HEIGHT,
      letterSpacing: TERMINAL_LETTER_SPACING,
      theme,
      allowProposedApi: true
    });
    // Off screen, NOT display:none — the latter also breaks xterm's font
    // measurement (research 17 §1.3).
    host = document.createElement('div');
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText =
      'position:absolute;left:-99999px;top:0;pointer-events:none;' +
      `width:${Math.ceil(metrics.cellWidth * metrics.cols)}px;` +
      `height:${Math.ceil(metrics.cellHeight * rows.length)}px`;
    document.body.appendChild(host);
    offscreen.open(host);

    const term2 = offscreen;
    await new Promise<void>((resolve) => {
      term2.write(rows.join('\r\n'), resolve);
    });

    // Wrapping means the buffer can be taller than the line count we wrote.
    const drawnRows = term2.buffer.active.length;
    const html = serializeAsHtml(term2, {
      theme,
      range: { startLine: 0, endLine: drawnRows - 1 },
      includeGlobalBackground: true,
      fontFamily,
      fontSizePx: TERMINAL_FONT_SIZE,
      lineHeightPx: metrics.cellHeight,
      letterSpacingPx: letterSpacingCorrection(
        metrics.cellWidth,
        TERMINAL_FONT_SIZE,
        fontFamily
      )
    });
    const png = await rasterizeHtml({
      html,
      widthCss: metrics.cellWidth * metrics.cols,
      heightCss: metrics.cellHeight * drawnRows,
      background: theme.background ?? TERMINAL_BACKGROUND,
      // Same as the selection path above. The face rides along, or the PNG
      // comes back in Menlo while the screen shows the chosen preset.
      fontCss: await faceCssFor(currentWorkAreaFont(), {
        bold: hasBoldRuns(html)
      })
    });
    await bridge.image({ png, suggestedName: suggestedName(session) });
  } finally {
    offscreen?.dispose();
    host?.remove();
  }
}

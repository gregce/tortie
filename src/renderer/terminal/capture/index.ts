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
import type { GmuxCaptureExtras } from '@shared/ipc';
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
import {
  measureCells,
  rowBandRect,
  screenElement,
  visibleScreenRect
} from './metrics';
import { historyLinesFor, paneLines, selectionBand } from './range';
import { letterSpacingCorrection, rasterizeHtml } from './rasterize';
import { serializeAsHtml, toClipboardHtml } from './serialize';

/** Line presets the menu offers. Past 1,000 rows a PNG stops being useful. */
export const CAPTURE_PRESETS = [250, 1000] as const;

/** Hard ceiling on rasterized rows (a 2,000-row PNG measured 47 MB). */
const MAX_CAPTURE_ROWS = 1000;

type CaptureBridge = NonNullable<GmuxCaptureExtras['capture']>;

/** The slice of Terminal the selection dance needs. */
type TerminalLike = Pick<
  Terminal,
  'getSelectionPosition' | 'clearSelection' | 'select' | 'selectLines'
>;

/** The capture surface on the preload bridge, or null on older preloads. */
export function captureBridge(): CaptureBridge | null {
  const api = window.gmux as (GmuxCaptureExtras & object) | undefined;
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

/** True when this session has text selected right now. */
export function hasSelection(sessionId: string): boolean {
  return getTerminal(sessionId)?.hasSelection() ?? false;
}

/** What was selected at the instant the user right-clicked. */
export interface TerminalSelectionSnapshot {
  /** The selected text, exactly as Copy would write it. */
  text: string;
  /** The selected range, so a later serialize reads the same cells. */
  position: IBufferRange;
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
  if (term === null || !term.hasSelection()) return null;
  const position = term.getSelectionPosition();
  if (position === undefined) return null;
  const text = term.getSelection();
  // An empty string is what `copySelection` has always refused to write, so a
  // snapshot of one would enable a menu item that then did nothing.
  if (text.length === 0) return null;
  return { text, position };
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
  restore?: IBufferRange
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
    if (selection.start.y === selection.end.y) {
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
    await withoutSelection(term, () =>
      bridge.viewport({ rect, suggestedName: suggestedName(session) })
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
  const selection = snapshot?.position ?? term.getSelectionPosition();
  if (selection === undefined) return;

  const metrics = measureCells(term, screen);
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
          selection
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
  // server either way (history-limit 50000); when there is genuinely nothing
  // to show, `paneLines` comes back empty and says so below.
  const metrics = measureCells(term, screen);
  const fontFamily = resolveTerminalFontFamily();
  const theme = resolveTerminalTheme();
  let offscreen: Terminal | null = null;
  let host: HTMLDivElement | null = null;

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

    try {
      await document.fonts?.ready;
    } catch {
      /* no FontFaceSet outside a browser — proceed */
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
    captured(`Captured the last ${rows.length} lines to the clipboard.`);
  } catch (err) {
    failed(err);
  } finally {
    offscreen?.dispose();
    host?.remove();
  }
}

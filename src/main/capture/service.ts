/**
 * Terminal capture — the main-process half.
 *
 * The renderer owns pixels and markup: it is the only side that can measure
 * xterm's real cell box and serialize a buffer. Main owns the three things a
 * renderer cannot touch — the system clipboard, the save dialog, and tmux.
 *
 * Three sources feed one sink (docs/research/17-terminal-capture.md §5):
 *   visible viewport  → webContents.capturePage(rect)        [pixel-exact]
 *   selection on screen → same, over the selected row band   [pixel-exact]
 *   beyond the screen → tmux capture-pane -e, rasterized by the renderer
 *
 * Why tmux and not the xterm buffer: a tmux attach redraws the current screen
 * only, and hidden panes are unmounted, so the renderer's 10k-line scrollback
 * usually holds nothing. The real history is the private server's, and its
 * depth is the Scrollback depth setting: `history-limit 25000` in
 * resources/gmux-tmux.conf by default, up to 100,000 (research 17 §2). The
 * 50,000 this comment used to name is the operator's own server, not a
 * constant of the product.
 */

import { basename, dirname, join } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { app, clipboard, dialog, nativeImage } from 'electron';
import type { BrowserWindow } from 'electron';
import type {
  CaptureImageInput,
  CapturePaneInput,
  CapturePaneResult,
  CaptureResult,
  CaptureSaveResult,
  CaptureViewportInput,
  ClipboardRichInput
} from '@shared/ipc';
import * as tmux from '../tmux';

/**
 * The most recent capture, kept so the toast's "Save…" action can write the
 * exact bytes the user already has on the clipboard instead of re-shooting a
 * terminal that has since scrolled. One image, replaced each time.
 */
let lastCapture: { png: Buffer; suggestedName: string } | null = null;

/** Directory of the last successful save — the next dialog opens there. */
let lastSaveDir: string | null = null;

function timestamp(): string {
  const d = new Date();
  const p = (n: number): string => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` +
    `-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  );
}

/** `tortie-<session>-<stamp>.png`, sanitized for a filesystem. */
function defaultFileName(suggestedName: string): string {
  const safe = suggestedName.replace(/[/\\:]+/g, '-').trim();
  return `tortie-${safe.length > 0 ? safe : 'terminal'}-${timestamp()}.png`;
}

function remember(png: Buffer, suggestedName: string): CaptureResult {
  lastCapture = { png, suggestedName };
  const image = nativeImage.createFromBuffer(png);
  clipboard.writeImage(image);
  const size = image.getSize();
  return { width: size.width, height: size.height, bytes: png.byteLength };
}

/**
 * Grab a rect of the live window. `rect` is in DIP/CSS pixels; the returned
 * NativeImage is at the device scale (2× on Retina), so the clipboard gets a
 * sharp image without any scaling work here.
 */
export async function captureViewport(
  win: BrowserWindow,
  input: CaptureViewportInput
): Promise<CaptureResult> {
  const { rect } = input;
  const image = await win.webContents.capturePage({
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.max(1, Math.round(rect.width)),
    height: Math.max(1, Math.round(rect.height))
  });
  if (image.isEmpty()) {
    throw new Error('the terminal produced an empty image');
  }
  return remember(image.toPNG(), input.suggestedName);
}

/** Take PNG bytes the renderer rasterized and put them on the clipboard. */
export function captureImage(input: CaptureImageInput): CaptureResult {
  const png = Buffer.from(
    input.png.buffer,
    input.png.byteOffset,
    input.png.byteLength
  );
  if (png.byteLength === 0) throw new Error('the capture produced no image');
  return remember(png, input.suggestedName);
}

/**
 * Write the last capture to an exact path, no dialog. The screenshot harness
 * (GMUX_SHOT_CAPTURE_OUT) uses this to keep the PNG a driven capture produced
 * — the only way to prove the offscreen-Terminal → serializeAsHtml →
 * rasterizeHtml → capture:image path end to end without a human at a dialog.
 */
export async function saveLastCaptureTo(
  filePath: string
): Promise<CaptureSaveResult> {
  if (lastCapture === null) throw new Error('there is no capture to save');
  await writeFile(filePath, lastCapture.png);
  lastSaveDir = dirname(filePath);
  return { path: filePath };
}

/** Write the last capture to disk. Resolves `{ path: null }` when cancelled. */
export async function saveLastCapture(
  win: BrowserWindow | null
): Promise<CaptureSaveResult> {
  if (lastCapture === null) throw new Error('there is no capture to save');
  const name = defaultFileName(lastCapture.suggestedName);
  const defaultPath = join(
    lastSaveDir ?? app.getPath('desktop'),
    basename(name)
  );
  const result =
    win === null
      ? await dialog.showSaveDialog({ defaultPath })
      : await dialog.showSaveDialog(win, {
          defaultPath,
          filters: [{ name: 'PNG image', extensions: ['png'] }]
        });
  if (result.canceled || result.filePath.length === 0) return { path: null };
  return saveLastCaptureTo(result.filePath);
}

/**
 * Scrollback beyond the visible screen, straight from the private server.
 *
 * `-e` keeps SGR attributes and `-J` is deliberately OFF: joining wrapped
 * lines would destroy the on-screen wrapping a screenshot exists to
 * reproduce. Works for sessions that are not even mounted.
 */
export async function capturePaneText(
  input: CapturePaneInput
): Promise<CapturePaneResult> {
  const target = await tmux.resolvePaneTarget(input.tmuxName);
  if (input.range !== undefined) {
    return captureHistoryRange(target, input.range, input.join === true);
  }
  const ansi = await tmux.capturePane(
    target,
    Math.max(0, Math.floor(input.historyLines)),
    { join: false }
  );
  return { ansi };
}

/**
 * An exact range of history lines, Phase 209.
 *
 * The renderer numbers lines from the oldest the server holds, and
 * `capture-pane` numbers them from the top of the live screen, so the
 * conversion needs `#{history_size}` read at this instant rather than the
 * renderer's, which can be a poll old under a streaming pane. THE CLAMP IS
 * OURS, not tmux's: tmux moves a range above the top to the oldest line and
 * answers one row for it, measured 2026-09-03, so a range that is entirely
 * gone answers nothing here, and one that starts above the top answers from
 * the oldest line and says so in `firstLine`. A range that reaches below the
 * screen is cut at the last row, which is where the history ends.
 */
async function captureHistoryRange(
  target: string,
  range: { start: number; end: number },
  join: boolean
): Promise<CapturePaneResult> {
  const extent = await tmux.readPaneExtent(target);
  const last = extent.history + extent.rows - 1;
  const start = Math.max(0, Math.floor(range.start));
  const end = Math.min(last, Math.floor(range.end));
  if (end < start) return { ansi: '', firstLine: start };
  const ansi = await tmux.capturePane(target, 0, {
    join,
    range: { start: start - extent.history, end: end - extent.history }
  });
  return { ansi, firstLine: start };
}

/**
 * Copy / Copy as HTML: both flavors in one write. An empty `html` means
 * text-only — writing an empty HTML flavor would blank the rich paste in
 * every app that prefers it.
 */
export function writeRichClipboard(input: ClipboardRichInput): void {
  clipboard.write(
    input.html.length > 0
      ? { text: input.text, html: input.html }
      : { text: input.text }
  );
}

/** Clear: drop the server-side history so "last N lines" agrees with it. */
export async function clearHistory(tmuxName: string): Promise<void> {
  const target = await tmux.resolvePaneTarget(tmuxName);
  await tmux.clearPaneHistory(target);
}

/** Test seam: forget the cached capture and the remembered directory. */
export function resetCaptureState(): void {
  lastCapture = null;
  lastSaveDir = null;
}

/**
 * Screenshot harness — GMUX_SHOT=<path>.
 * Moved out of src/main/index.ts in Phase 42 stage 3, byte for byte.
 *
 * capturePage after 3 s (GMUX_SHOT_DELAY_MS) → PNG → quit.
 * GMUX_SHOT_CAPTURE_OUT=<path> additionally writes the image a DRIVEN
 * capture produced — see shot-hook.ts. GMUX_SHOT_JS=<expr> evaluates one
 * expression in the driven window and prints its JSON, so a verifier can
 * MEASURE the running app and not only photograph it. GMUX_SHOT_OFFLINE=1 puts
 * the window offline over CDP before the drive runs (Phase 166).
 * GMUX_SHOT_CLIPBOARD runs the window's own Copy command and prints what the
 * system clipboard then holds, having saved what it held before and put that
 * back (Phase 191; every flavour since Phase 369). Its value is either `1`,
 * for one copy of whatever the drive left selected, or a JSON array of
 * expressions, each evaluated in the driven window to set up ONE selection
 * before its own copy.
 */

import { app, BrowserWindow, clipboard, ClipboardItem } from 'electron';
import { writeFile } from 'node:fs/promises';
import { saveLastCaptureTo } from '../capture';
import { openSettingsWindow } from '../settings';
import { broadcastEvent } from '../typed-events';
import { EVT_POWER_RESUME } from '@shared/ipc';
import {
  drainWatcherCloses,
  pendingWatcherCloseCount
} from '../watcher/teardown';

export interface ShotDeps {
  /** The real app window factory, owned by the composition root. */
  createWindow(): BrowserWindow;
}

/**
 * Every exit from this harness goes through here (Phase 161 fix round).
 *
 * `app.exit()` never reaches before-quit, so it skips the watcher drain the
 * real quit door runs (src/main/capabilities.ts, Phase 36). The cleanup a
 * driven capture runs just before exiting closes the driven project and
 * kills the driven sessions, and both of those issue tracked
 * `@parcel/watcher` unsubscribes. When the uv threadpool is busy, an arch
 * re-scan of the driven repository is exactly that, the unsubscribe
 * completion is still queued when `node::FreeEnvironment` runs, napi
 * refuses the late call, and the module aborts the process. That is the
 * measured Phase 36 crash, and on 2026-08-27 it came through THIS door: a
 * verifier run that quit within two seconds of file appends landing died
 * with SIGABRT while three runs without a burst at quit exited 0.
 *
 * So the harness drains the same tracked set the quit door drains. The
 * setImmediate beat first lets a close a dispose path has started but not
 * yet issued reach the tracked set. When nothing is pending, which is every
 * undriven capture, the whole thing costs one loop turn. When the drain
 * expires, proceeding to ANY environment teardown is a guaranteed abort,
 * so the harness ends itself the one way that cannot abort, SIGKILL to
 * self, and says so first. That needs a wedged FSEvents, not a busy pool.
 *
 * Exported for the drain-order test only; nothing outside this file and its
 * test may call it.
 */
export async function exitShot(code: number): Promise<void> {
  // A window the drive pinned frontmost is released first, whatever the
  // exit code, so no path out of the harness leaves one pinned.
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed() && win.isAlwaysOnTop()) win.setAlwaysOnTop(false);
  }
  await new Promise<void>((resolve) => setImmediate(resolve));
  const pending = pendingWatcherCloseCount();
  if (pending > 0) {
    // One observable line, so a harness run is evidence the door is real:
    // a driven capture's cleanup leaves closes here on every run.
    console.log(
      `[gmux-shot] draining ${pending} watcher close(s) before exit`
    );
  }
  const leftover = await drainWatcherCloses(8_000);
  if (leftover > 0) {
    console.error(
      `[gmux-shot] ${leftover} watcher close(s) still pending after 8 s; ` +
        'ending the process hard because environment teardown would abort'
    );
    process.kill(process.pid, 'SIGKILL');
    return;
  }
  app.exit(code);
}

/*
 * THE PERSON'S PASTEBOARD, READ AND PUT BACK BY GMUX_SHOT_CLIPBOARD (Phase
 * 369). Shot mode only: nothing outside that knob reaches any of it.
 *
 * Electron 44 replaced the clipboard module (#52508). `availableFormats`,
 * `readHTML`, `readRTF`, `readImage` and the object form of `write` are gone.
 * `read()` answers one item listing every flavour the pasteboard holds: the
 * standard ones by MIME type, and every other one RAW, as
 * `electron application/osclipboard;format="<name>"`, whose bytes are read
 * and written back exactly. Under Electron 43 every flavour but text, HTML,
 * RTF and one image was lost to the copy. Under 45 far less is, among it a
 * picture's SVG (its `getType` answers from the PNG) and any flavour whose
 * name is not ASCII, which Chromium never lists; and, as under 43, a picture
 * comes back re-encoded, and RTF with no HTML beside it comes back with HTML
 * converted from it, because Chromium lists `text/html` for RTF. Read from
 * Electron's source at v45.3.4 (shell/browser/api/electron_api_clipboard.cc
 * and electron_api_clipboard_item.cc, byte-identical to v45.3.2's), its
 * clipboard documentation and Chromium's ui/base/clipboard/clipboard_mac.mm
 * at 156.0.8078.100, not yet from a run.
 *
 * Two facts in that source decide the shape. A flavour's bytes are fetched
 * when `getType` is asked, from whatever the pasteboard holds THEN, so every
 * flavour is read into memory before the copy and never after it. And four
 * kinds of listed name are never written back, each named with its reason in
 * the record: the find text (another pasteboard, which no copy touches), the
 * bookmark (derived from the URL flavours, which are kept raw), a `web ` name
 * (the twin of the raw `org.w3.web-custom-format.*` flavours, which are kept)
 * and any `image/*` but `image/png` (its `getType` answers from the PNG).
 */

/** A standard flavour: written back only when its read answered bytes. */
const STANDARD_FLAVOURS: ReadonlySet<string> = new Set([
  'text/plain',
  'text/html',
  'text/rtf',
  'text/uri-list',
  'image/png'
]);

/** The prefix of a raw flavour: written back byte for byte, even empty. */
const RAW_FLAVOUR = 'electron application/osclipboard;format="';

/** The find pasteboard's text, which `read()` lists beside the pasteboard's. */
const FIND_TEXT = 'electron application/findtext';

/** What Chromium's HTML writer puts in front of the markup it is handed. */
const CHROMIUM_HTML_MARK = "<meta charset='utf-8'>";

interface KeptFlavour {
  readonly type: string;
  /** The bytes, held in memory for the run and never printed. */
  readonly blob: Blob;
}

type KeptPasteboard =
  | {
      readonly ok: true;
      /** Every name `read()` listed, in its order. */
      readonly types: readonly string[];
      readonly kept: readonly KeptFlavour[];
      /** Each listed name that is not kept, with the reason. */
      readonly left: Readonly<Record<string, string>>;
    }
  | { readonly ok: false; readonly why: string };

/** Why a listed name is never written back, or null when it is kept. */
function notKept(type: string): string | null {
  if (STANDARD_FLAVOURS.has(type) || type.startsWith(RAW_FLAVOUR)) return null;
  if (type === FIND_TEXT) return 'another pasteboard';
  if (type.startsWith('image/')) return 'read as png';
  if (type === 'electron application/bookmark' || type.startsWith('web ')) {
    return 'derived';
  }
  return 'unknown';
}

/**
 * Every flavour the pasteboard holds, read now. It never rejects: a refused
 * `read()` answers `ok: false`, and the caller then copies nothing. A flavour
 * whose own read is refused is named `unreadable` and is lost to the copy,
 * as every flavour without a reader was under Electron 43.
 *
 * Only a LISTED name is ever read, because a read can invent a flavour.
 * Measured on 2026-09-01 against a pasteboard holding 44 bytes of plain text
 * and nothing else: Electron 43's `readHTML()` answered 66 bytes, being
 * `<meta charset='utf-8'>` and those same 44 bytes, and writing that back
 * left the pasteboard carrying an HTML flavour it never had.
 */
async function keepPasteboard(): Promise<KeptPasteboard> {
  let items: Awaited<ReturnType<typeof clipboard.read>>;
  try {
    items = await clipboard.read();
  } catch (err) {
    return { ok: false, why: err instanceof Error ? err.message : String(err) };
  }
  const types: string[] = [];
  const kept: KeptFlavour[] = [];
  const left: Record<string, string> = {};
  for (const item of items) {
    for (const type of item.types) {
      if (types.includes(type)) continue;
      types.push(type);
      const reason = notKept(type);
      if (reason !== null) {
        left[type] = reason;
        continue;
      }
      try {
        const blob = await item.getType(type);
        if (blob instanceof Blob) kept.push({ type, blob });
        else left[type] = 'unreadable';
      } catch {
        left[type] = 'unreadable';
      }
    }
  }
  return { ok: true, types, kept, left };
}

/**
 * The entries of the ONE write that puts the kept flavours back, or null when
 * none has anything to write.
 *
 * A standard flavour whose read answered no bytes is not written, as under
 * Electron 43. A raw one is written even empty, because an empty raw flavour
 * says something: the `org.nspasteboard.ConcealedType` and `TransientType`
 * markers a password manager writes beside a password are empty by
 * convention (Chromium writes its own confidentiality marker with no data),
 * and a password put back without its marker is no longer marked concealed.
 *
 * `text/html` goes back through Chromium's HTML writer, `WriteHTML(text, "")`,
 * the same call Electron 43's `write({ html })` made, and that writer PREPENDS
 * `<meta charset='utf-8'>` to whatever it is handed (`ClipboardMac::WriteHTML`
 * at Chromium 156.0.8078.100, Electron 45's, still does). Measured on
 * 2026-09-01 against a pasteboard whose HTML a browser had written: 619 bytes
 * before a run, 641 after, the flavour then beginning with the tag twice. So
 * the one leading tag the write is about to add again is taken off first.
 * Markup that never began with the tag still gains one, which is the writer's
 * own doing.
 */
async function putBackEntries(
  kept: readonly KeptFlavour[]
): Promise<Record<string, string | Blob> | null> {
  const entries: Record<string, string | Blob> = {};
  for (const { type, blob } of kept) {
    if (!type.startsWith(RAW_FLAVOUR) && blob.size === 0) continue;
    if (type === 'text/html') {
      const html = await blob.text();
      entries[type] = html.startsWith(CHROMIUM_HTML_MARK)
        ? html.slice(CHROMIUM_HTML_MARK.length)
        : html;
    } else {
      entries[type] = blob;
    }
  }
  return Object.keys(entries).length > 0 ? entries : null;
}

/** Names and sizes, never a byte: `[name, bytes]`, or `[name, reason]`. */
function pasteboardRecord(
  board: KeptPasteboard
): Array<[string, number | string]> | string {
  if (!board.ok) return board.why;
  return board.types.map((type): [string, number | string] => [
    type,
    board.kept.find((one) => one.type === type)?.blob.size ??
      board.left[type] ??
      'unknown'
  ]);
}

export async function runShot(outPath: string, deps: ShotDeps): Promise<void> {
  // Optional drive (Phase 5): GMUX_SHOT_DRIVE carries a JSON spec that the
  // renderer's window.__gmuxShotDrive hook (src/renderer/editor/shot-hook.ts)
  // executes — open a project, open a diff — so the capture shows the real
  // UI. The hook flips __gmuxShotReady; cleanup removes the driven project.
  const driveJson = process.env['GMUX_SHOT_DRIVE'];

  // How long to let the app settle before capturing. 3 s covers a warm boot,
  // but an UNDRIVEN capture (no project to open — e.g. the §6.1 first-run
  // state) has no readiness hook to wait on, and on a busy private tmux
  // server the core takes longer than that to answer projects:list. Rather
  // than let the harness quietly photograph a half-booted shell, the delay
  // is a knob: GMUX_SHOT_DELAY_MS=12000.
  const delayMs = Number(process.env['GMUX_SHOT_DELAY_MS'] ?? '') || 3_000;

  // Settings-window capture (Phase 10 S13 harness extension): with
  // GMUX_SHOT_SETTINGS=1 the shot targets the dedicated Settings window
  // instead of the app shell. GMUX_SHOT_SETTINGS_JS optionally runs a
  // renderer-side driver first (e.g. switch to a section) before capture.
  if (process.env['GMUX_SHOT_SETTINGS'] === '1') {
    openSettingsWindow();
    const win = BrowserWindow.getAllWindows()[0];
    if (!win) {
      console.error('[gmux-shot] FAIL: settings window did not open');
      await exitShot(1);
      return;
    }
    win.webContents.once('did-finish-load', () => {
      setTimeout(async () => {
        try {
          // RAISE IT BEFORE THE DRIVER RUNS, not only before the capture
          // (Phase 174.1). A window that is merely shown can still be
          // OCCLUDED by whatever else is on the screen, and Chromium reports
          // an occluded page as `document.visibilityState === 'hidden'`. Some
          // platform calls refuse a hidden page outright: measured here,
          // `queryLocalFonts()` rejects with "Page needs to be visible." and
          // the driver then reads an empty list, which looks exactly like a
          // product that offers nothing. The same three calls already ran
          // after the driver for the capture's sake, and the reason recorded
          // there applies just as well before it.
          win.show();
          win.moveTop();
          win.focus();
          // AND KEEP IT UP FOR THE WHOLE DRIVE (Phase 174.1's fix round).
          // Raising it once is not enough. Measured here on 2026-08-31: a
          // Settings window raised exactly as above went `hidden` 13.5 s into
          // its driver because something else came forward, `queryLocalFonts`
          // then rejected with "Page needs to be visible.", the driver read an
          // empty suggestion list, and every setTimeout in it was throttled to
          // about one a second and then to one a MINUTE, which turned a 40 s
          // sweep into an eight minute stall at 0 percent CPU. A driver that
          // takes longer than a moment cannot rely on staying frontmost by
          // luck, so it is pinned there for as long as it runs and released
          // once the photograph is taken.
          win.setAlwaysOnTop(true);
          await win.webContents
            .executeJavaScript(
              'new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(1))))',
              true
            )
            .catch(() => undefined);
          const js = process.env['GMUX_SHOT_SETTINGS_JS'];
          if (js !== undefined && js.length > 0) {
            // The driver's own return value is printed (Phase 15): a driver
            // that silently failed to find its target used to be invisible,
            // and the capture below would then photograph the undriven window
            // as if that were the state under test.
            const result = await win.webContents
              .executeJavaScript(js, true)
              .catch((err: unknown) => `FAILED: ${(err as Error).message}`);
            console.log(`[gmux-shot] driver → ${String(result)}`);
            await new Promise((r) => setTimeout(r, 600));
          }
          // MEASURED (Phase 15): capturePage on a window that is not frontmost
          // returns the LAST PAINTED FRAME, so a shot driven while another app
          // held focus came back showing the section the driver had navigated
          // AWAY from. Raising the window and then waiting for two real frames
          // is what makes the capture show what the driver did.
          win.show();
          win.moveTop();
          win.focus();
          await win.webContents
            .executeJavaScript(
              'new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(1))))',
              true
            )
            .catch(() => undefined);
          const image = await win.webContents.capturePage();
          win.setAlwaysOnTop(false);
          await writeFile(outPath, image.toPNG());
          console.log(`[gmux-shot] wrote ${outPath}`);
          await exitShot(0);
        } catch (err) {
          win.setAlwaysOnTop(false);
          console.error(`[gmux-shot] FAIL: ${(err as Error).message}`);
          await exitShot(1);
        }
      }, 2_000);
    });
    return;
  }

  const mainWindow = deps.createWindow();
  // Phase 137.2. GMUX_SHOT_SIZE=<width>x<height> resizes the window before
  // the drive runs, so a probe can photograph a narrow layout. The window's
  // own minimum still applies, which is the point: the narrowest photograph
  // is the narrowest window a person can make.
  const sizeSpec = process.env['GMUX_SHOT_SIZE'];
  if (sizeSpec !== undefined && sizeSpec.length > 0) {
    const parsed = /^(\d+)x(\d+)$/.exec(sizeSpec);
    if (parsed !== null) {
      mainWindow.setSize(Number(parsed[1]), Number(parsed[2]));
    } else {
      console.error(`[gmux-shot] GMUX_SHOT_SIZE not understood: ${sizeSpec}`);
    }
  }
  // Phase 166 verification knob. GMUX_SHOT_OFFLINE=1 puts the driven
  // window offline over CDP before the drive runs, the same emulation the
  // DevTools Network panel applies, so a probe can prove that project images
  // over gmux-asset:, the editor's own chunks and the recovery strip need no
  // network at all. The attach is synchronous and happens before the load
  // listener below is registered, so a fast file: load cannot slip past it;
  // the two commands are awaited inside that listener before the drive.
  // Shot mode only. No product behavior.
  let offlineReady: Promise<void> = Promise.resolve();
  if (process.env['GMUX_SHOT_OFFLINE'] === '1') {
    const dbg = mainWindow.webContents.debugger;
    dbg.attach('1.3');
    offlineReady = (async () => {
      await dbg.sendCommand('Network.enable');
      await dbg.sendCommand('Network.emulateNetworkConditions', {
        offline: true,
        latency: 0,
        downloadThroughput: -1,
        uploadThroughput: -1
      });
      console.log('[gmux-shot] network offline over CDP');
    })();
  }
  // A drive runs on the renderer's own timers, and Chromium clamps every
  // timer in an occluded window to one second. A probe window on a busy
  // display is occluded by whatever is on top of it, so a drive that took
  // 25 s with the window clear took over 60 s and missed the deadline below
  // with a terminal in front of it, measured on 2026-09-01 (Phase 190): each
  // 200 ms wait was read at 1000 ms from the second fixture on. The harness
  // window is nobody's foreground window, so its timers are not throttled.
  mainWindow.webContents.setBackgroundThrottling(false);
  // GMUX_SHOT_VERBOSE=1 tees the renderer's console into the harness output —
  // the only way to see WHERE a drive stalled, since the drive runs entirely
  // inside the renderer.
  if (process.env['GMUX_SHOT_VERBOSE'] === '1') {
    mainWindow.webContents.on('console-message', (details) => {
      console.log(`[gmux-shot][renderer] ${details.message}`);
    });
  }
  /**
   * The copies to take, or null for none. `1` means one copy of whatever the
   * drive left selected; a JSON array means one copy per entry, each preceded
   * by evaluating that entry as an expression in the driven window.
   */
  const clipboardSteps = ((): (string | null)[] | null => {
    const raw = process.env['GMUX_SHOT_CLIPBOARD'];
    if (raw === undefined || raw === '') return null;
    if (raw === '1') return [null];
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((one) => (typeof one === 'string' ? one : null));
      }
    } catch {
      /* not JSON, fall through to the single form */
    }
    return [null];
  })();
  /**
   * WHAT THE PERSON'S PASTEBOARD HELD BEFORE THIS RUN, in every flavour
   * Electron can read, because putting back only the text is not putting it
   * back. It is read HERE, before the drive, as it always was, so a drive that
   * writes the pasteboard itself is never mistaken for what was there. The
   * copy below waits for this read, and copies nothing if it was refused.
   *
   * Two things were wrong with the first version of this and both stay fixed.
   * The first is that `clipboard.clear()` was the answer for "there was no
   * text". Clear empties EVERY flavour, so somebody holding an image or a
   * file reference with no text alongside it lost it to a harness run.
   * Restoring "no text" is not the same as clearing the pasteboard.
   *
   * The second is honest rather than fixed, and it belongs written down: it is
   * `wc.copy()` that replaces the pasteboard, not the restore, so a flavour
   * Electron cannot read is already gone by the time anything here runs. That
   * is a property of the pasteboard itself and it was measured on 2026-09-01
   * rather than assumed: an image put on it read back as eight flavours, being
   * PNGf, 8BPS, GIF, jp2, JPEG, TIFF, BMP and TPIC, and one write of twelve
   * characters of text left exactly four text flavours and none of the eight.
   * So the rule is to put back everything readable and, when nothing readable
   * was there, to clear ONLY if the pasteboard was empty of every flavour. A
   * pasteboard that held something unreadable is left alone rather than
   * emptied, because emptying it is a second loss on top of the first.
   */
  const priorClipboard: Promise<KeptPasteboard> | null =
    clipboardSteps === null ? null : keepPasteboard();
  /**
   * Puts back what `priorClipboard` read, in ONE awaited write of a new item
   * (Electron refuses to write an item `read()` answered), then prints the
   * names and sizes before and after. A refused save writes nothing, because
   * nothing was copied over it.
   */
  const restoreClipboard = async (): Promise<void> => {
    const kept = priorClipboard === null ? null : await priorClipboard;
    if (kept === null || !kept.ok) return;
    const entries = await putBackEntries(kept.kept);
    if (entries !== null) {
      await clipboard.write([new ClipboardItem(entries)]);
    } else if (kept.types.every((type) => type === FIND_TEXT)) {
      clipboard.clear();
    }
    const after = await keepPasteboard();
    console.log(
      `[gmux-shot] clipboard-put-back ${JSON.stringify({
        before: pasteboardRecord(kept),
        after: pasteboardRecord(after)
      })}`
    );
  };
  mainWindow.webContents.once('did-finish-load', () => {
    setTimeout(async () => {
      try {
        const wc = mainWindow.webContents;
        await offlineReady;
        if (driveJson !== undefined && driveJson.length > 0) {
          // PINNED FRONTMOST FOR THE WHOLE DRIVE (Phase 194), the way the
          // Settings branch above has been since Phase 174.1's fix round and
          // for the reason measured there: a window something else has come
          // in front of is `hidden` to Chromium, which then aligns every
          // timer in the renderer to one second. Measured again here on
          // 2026-09-01 driving the redline view: the same drive reached its
          // squeeze at 18 s with the window visible and at 52 s occluded,
          // every wait in it rounded up to a whole second, and the 60 s
          // ceiling below then ended a drive that had done nothing wrong.
          // The operator's own windows can come forward at any moment on the
          // Mac a probe runs on, so a drive cannot rely on staying frontmost
          // by luck. Released in exitShot, on every path out.
          mainWindow.show();
          mainWindow.moveTop();
          mainWindow.focus();
          mainWindow.setAlwaysOnTop(true);
          // Wait for the hook to EXIST before calling it. `?.()` on a
          // renderer that has not finished evaluating its bundle is a silent
          // no-op, and the harness would then capture a correct-looking but
          // completely undriven app — which is exactly how a cold start
          // (first run after a build) produced a first-run screenshot where
          // a driven one was expected. A capture that quietly shows the
          // wrong thing is worse than one that fails.
          const hookDeadline = Date.now() + 30_000;
          let hooked = false;
          while (Date.now() < hookDeadline) {
            hooked = (await wc.executeJavaScript(
              "typeof window.__gmuxShotDrive === 'function'"
            )) as boolean;
            if (hooked) break;
            await new Promise((r) => setTimeout(r, 250));
          }
          if (!hooked) {
            console.error('[gmux-shot] FAIL: drive hook never appeared');
            await exitShot(1);
            return;
          }
          // NOT awaited. The IIFE returns a promise, and awaiting it here
          // would hand the whole harness to the drive: a drive that hangs
          // (one bad await inside the renderer) would hang main FOREVER,
          // never reaching the deadline loop below that exists to catch
          // exactly that. Kick it off; the loop owns the timeout.
          void wc
            .executeJavaScript(
              `(async () => {
               try { await window.__gmuxShotDrive(${driveJson}); }
               catch (err) {
                 window.__gmuxShotError = String(err && err.stack || err);
               }
             })(); undefined`,
              true
            )
            .catch(() => undefined);
          const deadline = Date.now() + 60_000;
          for (;;) {
            const state = (await wc.executeJavaScript(
              '({ ready: window.__gmuxShotReady === true,' +
                ' error: window.__gmuxShotError ?? null })'
            )) as { ready: boolean; error: string | null };
            if (state.error !== null) {
              console.error(`[gmux-shot] FAIL: drive threw — ${state.error}`);
              await exitShot(1);
              return;
            }
            if (state.ready) break;
            if (Date.now() > deadline) {
              console.error('[gmux-shot] FAIL: drive never finished');
              await exitShot(1);
              return;
            }
            await new Promise((r) => setTimeout(r, 250));
          }
        }
        // GMUX_SHOT_CLIPBOARD=1 (Phase 191). A copy handler can only be
        // proved by reading what the clipboard ACTUALLY received, which no
        // renderer expression can do: `navigator.clipboard.readText()` is
        // gated on a permission and a gesture, and reading back the value the
        // handler computed proves the handler, not the clipboard. So main
        // reads it, which is the one place that can.
        //
        // THIS RUNS ON A PERSON'S MACHINE AND THE CLIPBOARD IS THEIRS. Every
        // flavour Electron can read is saved before the drive and put back in
        // a `finally`, whatever happened. Shot mode only. No product
        // behavior.
        if (clipboardSteps !== null) {
          // NOTHING IS COPIED OVER A PASTEBOARD THAT WAS NOT SAVED FIRST (Phase
          // 369). A refused read means there is nothing to put back, so the
          // run fails here, before `wc.copy()`, and leaves the pasteboard as
          // it was.
          const kept = priorClipboard === null ? null : await priorClipboard;
          if (kept === null || !kept.ok) {
            throw new Error(
              'the pasteboard could not be read first, so nothing was copied: ' +
                (kept === null ? 'no read' : kept.why)
            );
          }
          // THE RESTORE IS IN A `finally`, and that is the whole shape of this
          // block. Everything from here to the end of the drive used to sit in
          // one `try` whose `catch` only logs and exits, so a throw in the
          // GMUX_SHOT_JS expression, in `capturePage` or in the PNG write left
          // the copied diff text sitting on the person's own pasteboard. It
          // worked every time it was run, because nothing threw. That is the
          // shape CLAUDE.md legislates against for an Electron teardown and it
          // is the same argument here: this is his machine state.
          //
          // Restoring at the END of this block rather than at the end of the
          // drive is deliberate and it covers both cases: a throw inside the
          // loop unwinds through the `finally`, and a throw anywhere after it
          // happens with the pasteboard already put back.
          try {
            // The window's own Copy command, which is the SAME editing command
            // the menu bar and the keyboard run: it dispatches a real `copy`
            // event at the current selection, honours `preventDefault`, and
            // writes what the handler set. A renderer's own
            // `document.execCommand('copy')` is gated on user activation that
            // an async drive no longer has: measured on 2026-09-01, it
            // returned false and fired no event at all, so this is the only
            // door.
            const taken: unknown[] = [];
            for (const setup of clipboardSteps) {
              let answer: unknown = null;
              if (setup !== null) {
                answer = await wc.executeJavaScript(
                  `Promise.resolve(${setup})`,
                  true
                );
              }
              wc.copy();
              await new Promise((r) => setTimeout(r, 600));
              taken.push({ setup: answer, text: await clipboard.readText() });
            }
            console.log(`[gmux-shot] clipboard ${JSON.stringify(taken)}`);
            // The flavour NAMES only, never their contents, so a probe can
            // check that the pasteboard came back with what it had. The sizes
            // are on the `clipboard-put-back` line the restore prints.
            console.log(
              `[gmux-shot] clipboard-formats ${JSON.stringify(kept.types)}`
            );
          } finally {
            await restoreClipboard();
          }
        }
        // GMUX_SHOT_JS: one expression, evaluated in the DRIVEN window, its
        // value printed as JSON. A screenshot proves a thing was drawn; this
        // is how a verifier proves a thing is TRUE — that a handler is still
        // attached, that a measured width is what the design says, that a
        // count matches ground truth. Runs after the drive and before the
        // capture, so it observes exactly the frame that gets photographed.
        const probeJs = process.env['GMUX_SHOT_JS'];
        if (probeJs !== undefined && probeJs.length > 0) {
          const value: unknown = await wc.executeJavaScript(probeJs, true);
          console.log(`[gmux-shot] probe ${JSON.stringify(value) ?? 'undefined'}`);
        }
        // Phase 28 verification knob. Sends the wake broadcast on the same
        // channel a real resume uses, so a verifier can exercise the terminal
        // webgl retry without putting a machine to sleep. Shot mode only. No
        // product behavior. The first wait is 4 s because xterm's webgl addon
        // holds a lost context for 3 s hoping the browser restores it, and
        // only then fires onContextLoss. A broadcast inside that grace window
        // finds nothing to retry.
        if (process.env['GMUX_SHOT_POWER_RESUME'] === '1') {
          await new Promise((r) => setTimeout(r, 4000));
          broadcastEvent(EVT_POWER_RESUME);
          await new Promise((r) => setTimeout(r, 500));
        }
        // The same measurement the Settings branch above records, applied to
        // the window every other capture uses. capturePage on a window that
        // is not frontmost returns the LAST PAINTED FRAME, so a shot taken
        // while another app held focus photographs the app as it looked
        // BEFORE the drive ran. Phase 39 hit it: two runs of
        // build/probe-openwith.mjs, whose drive reported every step and every
        // reading, wrote an image of an app with no project open and the
        // default view selected. Raising the window and waiting for two real
        // frames is what makes the capture show what the drive did. It costs
        // one window activation during a harness run, which is already what
        // the Settings branch does, and nothing outside GMUX_SHOT reaches
        // this code.
        mainWindow.show();
        mainWindow.moveTop();
        mainWindow.focus();
        await wc
          .executeJavaScript(
            'new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(1))))',
            true
          )
          .catch(() => undefined);
        const image = await wc.capturePage();
        await writeFile(outPath, image.toPNG());
        console.log(`[gmux-shot] wrote ${outPath}`);
        // GMUX_SHOT_CAPTURE_OUT: keep the PNG the DRIVEN CAPTURE produced,
        // not the window shot — for terminalCapture runs that is the only
        // artifact proving the rasterizer path ran (see shot-hook.ts).
        const captureOut = process.env['GMUX_SHOT_CAPTURE_OUT'];
        if (captureOut !== undefined && captureOut.length > 0) {
          const saved = await saveLastCaptureTo(captureOut);
          console.log(`[gmux-shot] capture written to ${saved.path}`);
        }
        if (driveJson !== undefined && driveJson.length > 0) {
          await wc
            .executeJavaScript('window.__gmuxShotCleanup?.()', true)
            .catch(() => undefined);
        }
        await exitShot(0);
      } catch (err) {
        console.error(`[gmux-shot] FAIL: ${(err as Error).message}`);
        await exitShot(1);
      }
    }, delayMs);
  });
}

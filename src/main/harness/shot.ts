/**
 * Screenshot harness — GMUX_SHOT=<path>.
 * Moved out of src/main/index.ts in Phase 42 stage 3, byte for byte.
 *
 * capturePage after 3 s (GMUX_SHOT_DELAY_MS) → PNG → quit.
 * GMUX_SHOT_CAPTURE_OUT=<path> additionally writes the image a DRIVEN
 * capture produced — see shot-hook.ts. GMUX_SHOT_JS=<expr> evaluates one
 * expression in the driven window and prints its JSON, so a verifier can
 * MEASURE the running app and not only photograph it.
 */

import { app, BrowserWindow } from 'electron';
import { writeFile } from 'node:fs/promises';
import { saveLastCaptureTo } from '../capture';
import { openSettingsWindow } from '../settings';
import { broadcastEvent } from '../typed-events';
import { EVT_POWER_RESUME } from '@shared/ipc';

export interface ShotDeps {
  /** The real app window factory, owned by the composition root. */
  createWindow(): BrowserWindow;
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
      app.exit(1);
      return;
    }
    win.webContents.once('did-finish-load', () => {
      setTimeout(async () => {
        try {
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
          await writeFile(outPath, image.toPNG());
          console.log(`[gmux-shot] wrote ${outPath}`);
          app.exit(0);
        } catch (err) {
          console.error(`[gmux-shot] FAIL: ${(err as Error).message}`);
          app.exit(1);
        }
      }, 2_000);
    });
    return;
  }

  const mainWindow = deps.createWindow();
  // GMUX_SHOT_VERBOSE=1 tees the renderer's console into the harness output —
  // the only way to see WHERE a drive stalled, since the drive runs entirely
  // inside the renderer.
  if (process.env['GMUX_SHOT_VERBOSE'] === '1') {
    mainWindow.webContents.on('console-message', (details) => {
      console.log(`[gmux-shot][renderer] ${details.message}`);
    });
  }
  mainWindow.webContents.once('did-finish-load', () => {
    setTimeout(async () => {
      try {
        const wc = mainWindow.webContents;
        if (driveJson !== undefined && driveJson.length > 0) {
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
            app.exit(1);
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
              app.exit(1);
              return;
            }
            if (state.ready) break;
            if (Date.now() > deadline) {
              console.error('[gmux-shot] FAIL: drive never finished');
              app.exit(1);
              return;
            }
            await new Promise((r) => setTimeout(r, 250));
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
        app.exit(0);
      } catch (err) {
        console.error(`[gmux-shot] FAIL: ${(err as Error).message}`);
        app.exit(1);
      }
    }, delayMs);
  });
}

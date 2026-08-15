/**
 * GMUX_SMOKE=basic — window + native modules + private tmux reachability.
 * Moved out of src/main/index.ts in Phase 42 stage 3, byte for byte.
 */

import { app, type BrowserWindow } from 'electron';
import { proveNativeModules } from '../diagnostics/native-proof';
import * as tmux from '../tmux';
import { armWatchdog, smokeFail, smokeLog } from './support';

export interface BasicSmokeDeps {
  /** The real app window factory, owned by the composition root. */
  createWindow(): BrowserWindow;
}

/** GMUX_SMOKE=basic — window + native modules + tmux reachability. */
export async function runSmokeBasic(deps: BasicSmokeDeps): Promise<void> {
  armWatchdog(15_000);
  try {
    smokeLog('1/6 app ready');

    const win = deps.createWindow();
    await new Promise<void>((resolve, reject) => {
      win.webContents.once('did-finish-load', () => resolve());
      win.webContents.once('did-fail-load', (_e, code, desc) =>
        reject(new Error(`renderer failed to load: ${code} ${desc}`))
      );
    });
    smokeLog('2/6 window created, renderer + preload loaded');

    const native = await proveNativeModules();
    if (!native.ok) throw new Error(native.detail);
    smokeLog(`3/6 native modules OK — ${native.detail}`);

    const bin = tmux.findTmuxBinary();
    if (!bin) {
      throw new Error('tmux not found (checked homebrew + /usr/bin + PATH)');
    }
    smokeLog(`4/6 tmux binary: ${bin}`);

    await tmux.ensureServer();
    // Reachability roundtrip: create → kill a throwaway session.
    const probe = await tmux.createSession({
      displayName: `__gmux_smoke_${process.pid}`,
      cwd: app.getPath('home'),
      argv: ['sleep', '30']
    });
    await tmux.killSession(probe.sessionId);
    smokeLog(`5/6 tmux server reachable on private socket -L ${tmux.activeTmuxSocket()}`);

    // Cleanup: if the private server holds ZERO sessions (incl. the control
    // session), kill it so repeated smoke runs don't leak servers. Any real
    // session ⇒ leave the server strictly alone.
    const remaining = await tmux.listSessions({ includeControl: true });
    if (remaining.length === 0) {
      await tmux.execTmux(['kill-server']).catch(() => undefined);
    }
    smokeLog('6/6 cleanup done — PASS');
    app.exit(0);
  } catch (err) {
    smokeFail(err);
  }
}

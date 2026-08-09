/**
 * gmux main process entry.
 *
 * Scaffold responsibilities only:
 *  - create the single BrowserWindow
 *  - prove native modules (node-pty, better-sqlite3) load inside Electron
 *  - smoke harness:  GMUX_SMOKE=basic  → window + private tmux server
 *    reachability + native-module proof, exit 0 within 15 s, steps on stdout
 *  - screenshot harness:  GMUX_SHOT=<path>  → capturePage after 3 s → PNG → quit
 *
 * Later work streams own src/main/{tmux,manifest,attach,git,watcher,fs}/ and
 * src/main/ipc.ts; the tmux helpers below are deliberately minimal and should
 * be superseded by the tmux stream's supervisor. NOTE: we run the SYSTEM tmux
 * (3.6a at scaffold time) — bundling a pinned tmux build inside gmux.app is
 * out of scope today (see docs/FINAL-REPORT.md §5 Stream A1 for the plan).
 */

import { app, BrowserWindow } from 'electron';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const execFileP = promisify(execFile);

// ---------------------------------------------------------------------------
// Paths & constants
// ---------------------------------------------------------------------------

/** Private tmux socket name — NEVER touch the user's default tmux server. */
const TMUX_SOCKET = 'gmux';

function tmuxConfPath(): string {
  // Packaged: electron-builder copies resources/gmux-tmux.conf into Resources/.
  // Dev / `electron .`: repo-root resources/.
  return app.isPackaged
    ? join(process.resourcesPath, 'gmux-tmux.conf')
    : join(app.getAppPath(), 'resources', 'gmux-tmux.conf');
}

/**
 * Locate the tmux binary. GUI-launched Electron apps inherit a minimal PATH
 * (no /opt/homebrew/bin), so we probe known locations before trusting PATH.
 */
function findTmux(): string | null {
  const candidates = [
    '/opt/homebrew/bin/tmux',
    '/usr/local/bin/tmux',
    '/usr/bin/tmux'
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null; // caller decides how to surface TMUX_NOT_FOUND
}

function tmuxArgs(...rest: string[]): string[] {
  return ['-L', TMUX_SOCKET, '-f', tmuxConfPath(), ...rest];
}

// ---------------------------------------------------------------------------
// Native-module proof (scaffold gate: node-pty + better-sqlite3 must load
// inside Electron's main process after electron-rebuild)
// ---------------------------------------------------------------------------

interface NativeProofResult {
  ok: boolean;
  detail: string;
}

async function proveNativeModules(): Promise<NativeProofResult> {
  const parts: string[] = [];

  // better-sqlite3: open an in-memory DB and run a query end-to-end.
  try {
    const { default: Database } = await import('better-sqlite3');
    const db = new Database(':memory:');
    const row = db.prepare('SELECT 1 + 1 AS v').get() as { v: number };
    db.close();
    if (row.v !== 2) {
      return { ok: false, detail: 'better-sqlite3 query returned wrong value' };
    }
    parts.push('better-sqlite3 ok (in-memory SELECT)');
  } catch (err) {
    return {
      ok: false,
      detail: `better-sqlite3 failed to load: ${(err as Error).message}`
    };
  }

  // node-pty: spawn a real PTY and wait for clean exit.
  try {
    const pty = await import('node-pty');
    const exitCode = await new Promise<number>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('pty spawn timed out (5s)')),
        5000
      );
      const p = pty.spawn('/bin/sh', ['-c', 'exit 0'], {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd: app.getPath('home'),
        env: process.env as Record<string, string>
      });
      p.onExit(({ exitCode: code }) => {
        clearTimeout(timer);
        resolve(code);
      });
    });
    if (exitCode !== 0) {
      return { ok: false, detail: `node-pty test shell exited ${exitCode}` };
    }
    parts.push('node-pty ok (PTY spawn/exit roundtrip)');
  } catch (err) {
    return {
      ok: false,
      detail: `node-pty failed to load: ${(err as Error).message}`
    };
  }

  return { ok: true, detail: parts.join('; ') };
}

// ---------------------------------------------------------------------------
// Minimal tmux server bootstrap (superseded later by src/main/tmux/)
// ---------------------------------------------------------------------------

interface TmuxCheckResult {
  ok: boolean;
  detail: string;
}

/** Start (idempotent) the private tmux server and prove it is reachable. */
async function startAndVerifyTmux(tmuxBin: string): Promise<TmuxCheckResult> {
  const conf = tmuxConfPath();
  if (!existsSync(conf)) {
    return { ok: false, detail: `gmux-tmux.conf missing at ${conf}` };
  }

  // start-server is a no-op when the server is already up.
  try {
    await execFileP(tmuxBin, tmuxArgs('start-server'));
  } catch (err) {
    return {
      ok: false,
      detail: `tmux start-server failed: ${(err as Error).message}`
    };
  }

  // Reachability roundtrip: create → has-session → kill a throwaway session.
  // Unique name so we can never collide with (or harm) a real user session.
  const probe = `__gmux_smoke_${process.pid}`;
  try {
    await execFileP(tmuxBin, tmuxArgs('new-session', '-d', '-s', probe, 'sleep 30'));
    await execFileP(tmuxBin, tmuxArgs('has-session', '-t', `=${probe}`));
    await execFileP(tmuxBin, tmuxArgs('kill-session', '-t', `=${probe}`));
  } catch (err) {
    return {
      ok: false,
      detail: `tmux reachability probe failed: ${(err as Error).message}`
    };
  }
  return { ok: true, detail: `server reachable on private socket -L ${TMUX_SOCKET}` };
}

/**
 * Smoke-only cleanup: if the private server holds ZERO sessions, kill it so
 * repeated smoke runs don't leak servers (exit-empty is off in our conf).
 * If any real session exists we leave the server strictly alone.
 */
async function cleanupTmuxIfEmpty(tmuxBin: string): Promise<void> {
  try {
    const { stdout } = await execFileP(
      tmuxBin,
      tmuxArgs('list-sessions', '-F', '#{session_name}')
    );
    if (stdout.trim().length === 0) {
      await execFileP(tmuxBin, tmuxArgs('kill-server'));
    }
  } catch {
    // "no server running" or zero sessions reported as error — nothing to do.
  }
}

// ---------------------------------------------------------------------------
// Window
// ---------------------------------------------------------------------------

let mainWindow: BrowserWindow | null = null;

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 800,
    minHeight: 500,
    title: 'gmux',
    show: false,
    backgroundColor: '#1e1e1e',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  win.on('ready-to-show', () => win.show());

  // electron-vite: dev server URL in dev, bundled file otherwise.
  const devUrl = process.env['ELECTRON_RENDERER_URL'];
  if (!app.isPackaged && devUrl) {
    void win.loadURL(devUrl);
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'));
  }

  win.on('closed', () => {
    mainWindow = null;
  });
  return win;
}

// ---------------------------------------------------------------------------
// Smoke harness — GMUX_SMOKE=basic
// ---------------------------------------------------------------------------

function smokeLog(step: string): void {
  // Parsed by CI / the orchestrator; keep the prefix stable.
  console.log(`[gmux-smoke] ${step}`);
}

async function runSmoke(): Promise<never> {
  const watchdog = setTimeout(() => {
    console.error('[gmux-smoke] FAIL: 15s watchdog expired');
    app.exit(1);
  }, 15_000);
  watchdog.unref?.();

  try {
    smokeLog('1/6 app ready');

    mainWindow = createWindow();
    await new Promise<void>((resolve, reject) => {
      mainWindow!.webContents.once('did-finish-load', () => resolve());
      mainWindow!.webContents.once('did-fail-load', (_e, code, desc) =>
        reject(new Error(`renderer failed to load: ${code} ${desc}`))
      );
    });
    smokeLog('2/6 window created, renderer + preload loaded');

    const native = await proveNativeModules();
    if (!native.ok) throw new Error(native.detail);
    smokeLog(`3/6 native modules OK — ${native.detail}`);

    const tmuxBin = findTmux();
    if (!tmuxBin) throw new Error('tmux not found (checked homebrew + /usr/bin)');
    smokeLog(`4/6 tmux binary: ${tmuxBin}`);

    const tmux = await startAndVerifyTmux(tmuxBin);
    if (!tmux.ok) throw new Error(tmux.detail);
    smokeLog(`5/6 tmux ${tmux.detail}`);

    await cleanupTmuxIfEmpty(tmuxBin);
    smokeLog('6/6 cleanup done — PASS');
    clearTimeout(watchdog);
    app.exit(0);
  } catch (err) {
    console.error(`[gmux-smoke] FAIL: ${(err as Error).message}`);
    app.exit(1);
  }
  // app.exit never returns, but TypeScript wants a tail.
  return undefined as never;
}

// ---------------------------------------------------------------------------
// Screenshot harness — GMUX_SHOT=<path>
// ---------------------------------------------------------------------------

async function runShot(outPath: string): Promise<void> {
  mainWindow = createWindow();
  mainWindow.webContents.once('did-finish-load', () => {
    setTimeout(async () => {
      try {
        const image = await mainWindow!.webContents.capturePage();
        await writeFile(outPath, image.toPNG());
        console.log(`[gmux-shot] wrote ${outPath}`);
        app.exit(0);
      } catch (err) {
        console.error(`[gmux-shot] FAIL: ${(err as Error).message}`);
        app.exit(1);
      }
    }, 3000);
  });
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------

app.whenReady().then(async () => {
  const smoke = process.env['GMUX_SMOKE'];
  const shot = process.env['GMUX_SHOT'];

  if (smoke === 'basic') {
    await runSmoke();
    return;
  }
  if (shot) {
    await runShot(shot);
    return;
  }

  // Normal startup. Native-module sanity is logged (not fatal) so a broken
  // rebuild is visible immediately in dev consoles.
  const native = await proveNativeModules();
  if (native.ok) {
    console.log(`[gmux] native modules: ${native.detail}`);
  } else {
    console.error(`[gmux] NATIVE MODULE FAILURE: ${native.detail}`);
  }

  mainWindow = createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
    }
  });
});

// Single-window app: quitting on last-window-close is correct on macOS too —
// the durable tmux server (not the GUI) is what keeps sessions alive.
app.on('window-all-closed', () => {
  app.quit();
});

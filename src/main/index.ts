/**
 * gmux main process entry.
 *
 * Boot sequence (Phase 2, FINAL-REPORT §2.4): register IPC handlers → boot
 * the durable core (private tmux server on socket -L gmux → SQLite manifest →
 * control-mode event bus → reconcile) → open the single window. The core
 * boots lazily-with-retry via getGmuxCore(), so a missing tmux surfaces as a
 * friendly renderer state instead of a dead app.
 *
 * Harnesses (all exit the process; parsed by CI / the orchestrator):
 *  - GMUX_SMOKE=basic   window + native modules + private tmux reachability
 *  - GMUX_SMOKE=create  create durable 'smoke-keeper' session, assert term
 *                       bytes arrive in main, exit LEAVING IT RUNNING
 *  - GMUX_SMOKE=verify  assert smoke-keeper survived (tmux ls + manifest),
 *                       re-attach, receive bytes, kill it, exit 0
 *    (create → verify across two processes = the P1/T1 restart acceptance test)
 *  - GMUX_SHOT=<path>   capturePage after 3 s → PNG → quit
 *
 * NOTE: we run the SYSTEM tmux (3.6a at build time) — bundling a pinned tmux
 * inside gmux.app is out of scope today (docs/FINAL-REPORT.md §5 Stream A1).
 */

import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { registerAgentsIpc } from './agents';
import { registerFsIpc } from './fs';
import { disposeGitIpc, registerGitIpc } from './git';
import { getGmuxCore, registerIpcHandlers, shutdownGmuxCore } from './ipc';
import type { GmuxCore } from './ipc';
import { installAppMenu } from './menu';
import { registerRestoreIpc, snapshotPath, stripAnsi } from './restore';
import * as tmux from './tmux';

// ---------------------------------------------------------------------------
// Native-module proof (node-pty + better-sqlite3 must load inside Electron)
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
// Window
// ---------------------------------------------------------------------------

let mainWindow: BrowserWindow | null = null;

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    // DESIGN.md §2.1: "Min window 960×600. Default 1440×900."
    minWidth: 960,
    minHeight: 600,
    title: 'gmux',
    show: false,
    // --bg-canvas: pre-paint fill must match the app so launch/resize never
    // flashes a foreign color (DESIGN.md §0: one material).
    backgroundColor: '#131417',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  win.on('ready-to-show', () => win.show());

  // Terminal web links (and any window.open) go to the system browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });

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
// Smoke harnesses
// ---------------------------------------------------------------------------

function smokeLog(step: string): void {
  // Parsed by CI / the orchestrator; keep the prefix stable.
  console.log(`[gmux-smoke] ${step}`);
}

function smokeFail(err: unknown): never {
  console.error(`[gmux-smoke] FAIL: ${(err as Error).message}`);
  app.exit(1);
  return undefined as never;
}

function armWatchdog(ms: number): void {
  const watchdog = setTimeout(() => {
    console.error(`[gmux-smoke] FAIL: ${ms / 1000}s watchdog expired`);
    app.exit(1);
  }, ms);
  watchdog.unref?.();
}

/** GMUX_SMOKE=basic — window + native modules + tmux reachability. */
async function runSmokeBasic(): Promise<void> {
  armWatchdog(15_000);
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
    smokeLog(`5/6 tmux server reachable on private socket -L ${tmux.TMUX_SOCKET}`);

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

const SMOKE_KEEPER = 'smoke-keeper';

/** Attach `sessionId` to a hidden window and resolve once bytes flow. */
async function receiveTermBytes(
  core: GmuxCore,
  sessionId: string
): Promise<number> {
  const win = new BrowserWindow({ show: false });
  try {
    return await new Promise<number>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('no term:data bytes arrived within 15s')),
        15_000
      );
      core.onTermData = (sid, byteLength) => {
        if (sid !== sessionId || byteLength <= 0) return;
        clearTimeout(timer);
        resolve(byteLength);
      };
      core.attachSession(sessionId, win.webContents).catch((err: unknown) => {
        clearTimeout(timer);
        reject(err as Error);
      });
    });
  } finally {
    core.onTermData = null;
    core.detachSession(sessionId);
    // Deliberately NOT destroying the hidden window here: window-all-closed
    // would app.quit() → before-quit → close the manifest DB while the smoke
    // is still using it. app.exit() at the end reaps the window anyway.
  }
}

/** GMUX_SMOKE=create — first half of the T1 restart acceptance test. */
async function runSmokeCreate(): Promise<void> {
  armWatchdog(30_000);
  try {
    const core = await getGmuxCore();
    smokeLog('1/5 core booted: tmux server + manifest + control client + reconcile');

    // Deterministic re-runs: discard any smoke-keeper left by aborted runs.
    for (const rec of core.listSessionRecords()) {
      if (rec.name === SMOKE_KEEPER && rec.status !== 'exited') {
        await core.killSession(rec.id);
      }
      if (rec.name === SMOKE_KEEPER) core.discardSession(rec.id);
    }

    const home = homedir();
    const session = await core.createSession({
      name: SMOKE_KEEPER,
      projectPath: home,
      cwd: home,
      agent: 'shell',
      extraArgs: ['-c', 'while true; do date; sleep 1; done']
    });
    smokeLog(
      `2/5 session created: "${session.name}" (tmux ${session.tmuxName}, id ${session.id})`
    );

    const bytes = await receiveTermBytes(core, session.id);
    smokeLog(`3/5 term data flowing: ${bytes} bytes arrived in main`);

    smokeLog('4/5 detached — tmux session left RUNNING for the verify pass');
    await shutdownGmuxCore();
    smokeLog('5/5 PASS (create)');
    app.exit(0);
  } catch (err) {
    smokeFail(err);
  }
}

/** GMUX_SMOKE=verify — second half: the session must have SURVIVED. */
async function runSmokeVerify(): Promise<void> {
  armWatchdog(30_000);
  try {
    const core = await getGmuxCore();
    smokeLog('1/6 core booted (fresh process — simulated app restart)');

    const live = await tmux.listSessions();
    const keeper = live.find((s) => s.tmuxName === SMOKE_KEEPER);
    if (!keeper) {
      throw new Error(
        `"${SMOKE_KEEPER}" missing from tmux list-sessions — T1 durability FAILED`
      );
    }
    smokeLog(`2/6 tmux still runs ${SMOKE_KEEPER} (${keeper.sessionId})`);

    const rec = core
      .listSessionRecords()
      .find((r) => r.name === SMOKE_KEEPER && r.status !== 'exited');
    if (!rec) throw new Error(`"${SMOKE_KEEPER}" missing from the manifest`);
    if (rec.status !== 'running') {
      throw new Error(
        `manifest status is "${rec.status}", expected "running" after reconcile`
      );
    }
    smokeLog(`3/6 manifest row reconciled to running (id ${rec.id})`);

    const bytes = await receiveTermBytes(core, rec.id);
    smokeLog(`4/6 re-attach works: ${bytes} bytes arrived in main`);

    await core.killSession(rec.id);
    const after = await tmux.listSessions();
    if (after.some((s) => s.tmuxName === SMOKE_KEEPER)) {
      throw new Error(`"${SMOKE_KEEPER}" still alive after kill`);
    }
    core.discardSession(rec.id);
    smokeLog('5/6 killed smoke-keeper; tmux and manifest both clean');

    await shutdownGmuxCore();
    smokeLog('6/6 PASS (verify) — T1 restart acceptance test complete');
    app.exit(0);
  } catch (err) {
    smokeFail(err);
  }
}

// ---------------------------------------------------------------------------
// T3 smoke — reboot-survival acceptance test (FINAL-REPORT §2.4 Steps 2–3)
//
//   GMUX_SMOKE=t3-prep    create a durable session with a known scrollback
//                         marker, plant a deterministic resume argv (a FAKE
//                         claude uuid — armed commands are typed, never run,
//                         so no real agent is involved), quit so the app-quit
//                         snapshot is written, leave the session running.
//   GMUX_SMOKE=t3-verify  kill ONLY that tmux session OUT-OF-BAND (simulating
//                         the reboot for that session), boot fresh, assert the
//                         manifest row shows 'restorable', restore it, and
//                         assert capture-pane shows BOTH the replayed marker
//                         and the armed resume command line.
// ---------------------------------------------------------------------------

const SMOKE_T3 = 'smoke-t3';
const T3_MARKER_RE = /GMUX-T3-MARKER-\d+/;

/** Kill + discard every prior smoke-t3 trace (manifest rows AND raw tmux). */
async function cleanupT3Leftovers(core: GmuxCore): Promise<void> {
  for (const rec of core.listSessionRecords()) {
    if (rec.name !== SMOKE_T3) continue;
    if (rec.status !== 'exited' && rec.status !== 'restorable') {
      await core.killSession(rec.id).catch(() => undefined);
    }
    core.discardSession(rec.id);
  }
  // Raw leftovers from aborted runs (deduped names included).
  const live = await tmux.listSessions().catch(() => []);
  for (const s of live) {
    if (s.tmuxName === SMOKE_T3 || s.tmuxName.startsWith(`${SMOKE_T3}-`)) {
      await tmux.killSession(s.sessionId).catch(() => undefined);
    }
  }
}

/** GMUX_SMOKE=t3-prep — first half of the T3 acceptance test. */
async function runSmokeT3Prep(): Promise<void> {
  armWatchdog(45_000);
  try {
    const core = await getGmuxCore();
    smokeLog('1/6 core booted');

    await cleanupT3Leftovers(core);
    smokeLog('2/6 prior smoke-t3 traces cleaned');

    const marker = `GMUX-T3-MARKER-${Date.now()}`;
    const home = homedir();
    const session = await core.createSession({
      name: SMOKE_T3,
      projectPath: home,
      cwd: home,
      agent: 'shell',
      extraArgs: ['-c', `echo ${marker}; while true; do date; sleep 1; done`]
    });
    smokeLog(`3/6 session created: ${session.tmuxName} (${session.id})`);

    const bytes = await receiveTermBytes(core, session.id);
    smokeLog(`4/6 term data flowing (${bytes} bytes) — marker is on screen`);

    // Simulated agent id: restore ARMS this command without running it, so a
    // fake uuid exercises the full path with zero real-agent side effects.
    const fakeId = randomUUID();
    core.manifest.setAgentSessionId(session.id, fakeId, [
      'claude',
      '--resume',
      fakeId
    ]);
    smokeLog(`5/6 armed resume argv planted (claude --resume ${fakeId})`);

    // Quit path writes the app-quit snapshot; prove it landed with content.
    await shutdownGmuxCore();
    const snapText = await readFile(snapshotPath(session.id), 'utf8');
    if (!snapText.includes(marker)) {
      throw new Error('app-quit snapshot missing the scrollback marker');
    }
    smokeLog('6/6 PASS (t3-prep) — snapshot on disk, session left RUNNING');
    app.exit(0);
  } catch (err) {
    smokeFail(err);
  }
}

/** GMUX_SMOKE=t3-verify — second half: restorable → restore → armed. */
async function runSmokeT3Verify(): Promise<void> {
  armWatchdog(60_000);
  try {
    // OUT-OF-BAND kill BEFORE the core boots: the manifest never hears about
    // it — exactly the state a reboot leaves behind for this session.
    await tmux.ensureServer();
    const preLive = await tmux.listSessions();
    const keeper = preLive.find((s) => s.tmuxName === SMOKE_T3);
    if (!keeper) {
      throw new Error(`"${SMOKE_T3}" not running — run GMUX_SMOKE=t3-prep first`);
    }
    await tmux.killSession(keeper.sessionId);
    smokeLog(`1/7 killed ${SMOKE_T3} out-of-band (simulated reboot)`);

    const core = await getGmuxCore();
    smokeLog('2/7 core booted fresh — reconcile ran');

    const rec = core
      .listSessionRecords()
      .find((r) => r.name === SMOKE_T3 && r.status !== 'exited');
    if (!rec) throw new Error(`"${SMOKE_T3}" missing from the manifest`);
    if (rec.status !== 'restorable') {
      throw new Error(
        `manifest status is "${rec.status}", expected "restorable" — the
         sidebar would not offer [Restore]`
      );
    }
    smokeLog(`3/7 manifest row is 'restorable' (id ${rec.id})`);

    const marker = T3_MARKER_RE.exec(rec.argv.join(' '))?.[0];
    const armed = (rec.resumeArgv ?? []).join(' ');
    if (!marker) throw new Error('marker missing from recorded argv');
    if (!/^claude --resume /.test(armed)) {
      throw new Error(`recorded resume argv wrong: "${armed}"`);
    }

    const restored = await core.restoreSession(rec.id);
    if (restored.status !== 'running') {
      throw new Error(`restore left status "${restored.status}"`);
    }
    smokeLog(`4/7 restored as tmux "${restored.tmuxName}" — status running`);

    // Capture by immutable $-id: on tmux 3.6a capture-pane does NOT honor
    // the '=' exact-name prefix in target-pane resolution (verified).
    const restoredLive = (await tmux.listSessions()).find(
      (s) => s.tmuxName === restored.tmuxName
    );
    if (!restoredLive) {
      throw new Error(`restored session "${restored.tmuxName}" not in tmux ls`);
    }

    // The pane runs the user's real interactive shell; poll capture-pane
    // until the replayed marker AND the armed (typed, unexecuted) resume
    // command are both visible.
    const deadline = Date.now() + 25_000;
    let lastCapture = '';
    let ok = false;
    while (Date.now() < deadline) {
      lastCapture = stripAnsi(
        await tmux.capturePane(restoredLive.sessionId).catch(() => '')
      );
      if (lastCapture.includes(marker) && lastCapture.includes(armed)) {
        ok = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    if (!ok) {
      throw new Error(
        `capture-pane never showed marker+armed command.\n` +
          `wanted marker: ${marker}\nwanted armed: ${armed}\n` +
          `last capture tail:\n${lastCapture.split('\n').slice(-15).join('\n')}`
      );
    }
    smokeLog('5/7 capture-pane shows replayed scrollback AND armed resume line');

    // The armed line must be TYPED, not executed — the fake uuid would have
    // errored loudly if claude had actually run. Cheap negative check:
    if (/No conversation found|command not found/i.test(lastCapture)) {
      throw new Error('armed command appears to have EXECUTED');
    }
    smokeLog('6/7 armed command was not executed (as designed)');

    await core.killSession(rec.id);
    core.discardSession(rec.id);
    await shutdownGmuxCore();
    smokeLog('7/7 PASS (t3-verify) — T3 reboot-restore acceptance test complete');
    app.exit(0);
  } catch (err) {
    smokeFail(err);
  }
}

// ---------------------------------------------------------------------------
// Screenshot harness — GMUX_SHOT=<path>
// ---------------------------------------------------------------------------

async function runShot(outPath: string): Promise<void> {
  // Optional drive (Phase 5): GMUX_SHOT_DRIVE carries a JSON spec that the
  // renderer's window.__gmuxShotDrive hook (src/renderer/editor/shot-hook.ts)
  // executes — open a project, open a diff — so the capture shows the real
  // UI. The hook flips __gmuxShotReady; cleanup removes the driven project.
  const driveJson = process.env['GMUX_SHOT_DRIVE'];
  mainWindow = createWindow();
  mainWindow.webContents.once('did-finish-load', () => {
    setTimeout(async () => {
      try {
        const wc = mainWindow!.webContents;
        if (driveJson !== undefined && driveJson.length > 0) {
          await wc.executeJavaScript(
            `(async () => {
               try { await window.__gmuxShotDrive?.(${driveJson}); }
               catch (err) { console.error('[gmux-shot] drive failed', err); }
             })()`,
            true
          );
          const deadline = Date.now() + 30_000;
          while (Date.now() < deadline) {
            const ready = (await wc.executeJavaScript(
              'window.__gmuxShotReady === true'
            )) as boolean;
            if (ready) break;
            await new Promise((r) => setTimeout(r, 250));
          }
        }
        const image = await wc.capturePage();
        await writeFile(outPath, image.toPNG());
        console.log(`[gmux-shot] wrote ${outPath}`);
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
    }, 3000);
  });
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------

app.whenReady().then(async () => {
  const smoke = process.env['GMUX_SMOKE'];
  const shot = process.env['GMUX_SHOT'];

  // Native menu bar (About / Edit roles for terminal copy-paste / every
  // DESIGN.md §4 shortcut mirrored; ⌘W = close editor tab, never the
  // window). Installed in every mode — harness windows are unaffected.
  installAppMenu();

  // Handlers are lazy (each awaits getGmuxCore()), so registering them in
  // every mode is free and keeps harness renderers from hitting
  // "No handler registered" noise.
  registerIpcHandlers();
  // Phase 4: git sidebar (git:* + repo watchers) and file tree (fs:readDir/
  // fs:reveal). Both are self-contained registries, lazy per repo.
  registerGitIpc(ipcMain);
  registerFsIpc(ipcMain);
  // Phase 6: restore extension channels (sessions:restore, sessions:discard,
  // app:get/setLoginItem).
  registerRestoreIpc(ipcMain);
  // Phase 8: agent CLI availability probe (agents:availability).
  registerAgentsIpc(ipcMain);

  if (smoke === 'basic') return runSmokeBasic();
  if (smoke === 'create') return runSmokeCreate();
  if (smoke === 'verify') return runSmokeVerify();
  if (smoke === 't3-prep') return runSmokeT3Prep();
  if (smoke === 't3-verify') return runSmokeT3Verify();
  if (shot) return runShot(shot);

  // Normal startup. Native-module sanity is logged (not fatal) so a broken
  // rebuild is visible immediately in dev consoles.
  const native = await proveNativeModules();
  if (native.ok) {
    console.log(`[gmux] native modules: ${native.detail}`);
  } else {
    console.error(`[gmux] NATIVE MODULE FAILURE: ${native.detail}`);
  }

  // Kick the core boot now so the window opens onto live data; failures are
  // retried per-IPC-call and surfaced as friendly renderer states.
  getGmuxCore().catch((err: unknown) => {
    console.error(`[gmux] core boot failed: ${(err as Error).message}`);
  });

  mainWindow = createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
    }
  });
});

// Quit-time teardown kills ONLY gmux-side clients (attach PTYs, control
// client, repo watchers). The tmux server and every session keep running —
// T1 by design. Phase 6: quit is deferred ONCE so scrollback snapshots
// (§2.4 Step 2 app-quit capture point) finish before the process dies;
// shutdownGmuxCore bounds the capture at 8 s so quit can never wedge.
let quitFlowStarted = false;
app.on('before-quit', (event) => {
  if (quitFlowStarted) return; // second pass: let the quit proceed
  quitFlowStarted = true;
  event.preventDefault();
  void (async () => {
    try {
      await shutdownGmuxCore(); // snapshots first, then dispose
    } catch {
      /* never block quit */
    }
    void disposeGitIpc();
    app.quit();
  })();
});

// Single-window app: quitting on last-window-close is correct on macOS too —
// the durable tmux server (not the GUI) is what keeps sessions alive.
app.on('window-all-closed', () => {
  app.quit();
});

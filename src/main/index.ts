/**
 * Tortie main process entry.
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
 *  - GMUX_SMOKE=migrate the gmux -> Tortie userData migration, against a
 *                       POPULATED fixture and real live tmux sessions: rows,
 *                       settings, hotkeys, tip flags, snapshots, adoption from
 *                       the migrated manifest, and the captured session whose
 *                       recorded specstory bin the rename kills (Phase 16.5a)
 *  - GMUX_SMOKE=identity  sessions bind by @gmux-id, never by name: external
 *                       rename, a foreign session squatting the freed name,
 *                       kill, stale-row reconcile, pane markers, and an
 *                       external SIGTERM recorded as a signal (Phase 12.7)
 *  - GMUX_SMOKE=conformance-resume  the per-agent RESUME CONFORMANCE matrix
 *                       (Phase 13.5): for every installed agent, create →
 *                       plant a nonce turn → assert gmux captured the id →
 *                       kill out-of-band → restore → prove the conversation
 *                       came back. `npm run conformance:resume`; the harness
 *                       itself is src/main/conformance/resume.ts.
 *  - GMUX_SMOKE=procid  what the OUTSIDE world sees of gmux (Phase 13.8):
 *                       app name, process.title, what `ps` prints, and the
 *                       gmux-owned process list (app + helpers + private tmux
 *                       server + sessions + strays). Read-only unless
 *                       GMUX_PROCID_REAP=1, which also runs the boot reap.
 *  - GMUX_SHOT=<path>   capturePage after 3 s (GMUX_SHOT_DELAY_MS) → PNG → quit
 *                       (GMUX_SHOT_CAPTURE_OUT=<path> additionally writes the
 *                       image a DRIVEN capture produced — see shot-hook.ts;
 *                       GMUX_SHOT_JS=<expr> evaluates one expression in the
 *                       driven window and prints its JSON, so a verifier can
 *                       MEASURE the running app and not only photograph it)
 *
 * NOTE: we run the SYSTEM tmux (3.6a at build time) — bundling a pinned tmux
 * inside gmux.app is out of scope today (docs/FINAL-REPORT.md §5 Stream A1).
 */

import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { registerAgentsIpc } from './agents';
import {
  registerAssetProtocol,
  registerAssetSchemePrivileged
} from './assets';
import { registerCaptureIpc, saveLastCaptureTo } from './capture';
import { runResumeConformance } from './conformance';
import { registerDropIpc, startDropStorePruning } from './drop';
import { registerFsIpc, registerImageIpc } from './fs';
import { disposeGitIpc, registerGitIpc } from './git';
import { registerIpcHandlers } from './ipc';
import { getGmuxCore, shutdownGmuxCore } from './sessions';
import type { GmuxCore } from './sessions';
import { handle } from './typed-ipc';
import { WINDOW_BACKGROUND } from '@shared/window-chrome';
import type { ManifestSessionRecord } from './manifest';
import type { CreateSessionInput } from '@shared/types';
import { installAppMenu } from './menu';
import { migrateUserDataIfNeeded, showRenameNoticeOnce } from './migrate';
import { runMigrateSmoke } from './migrate/smoke';
import { registerProjectCreateIpc } from './projects';
import { disposeQuickOpenIpc, registerQuickOpenIpc } from './quickopen';
import {
  reconcileLoginItem,
  registerRestoreIpc,
  snapshotPath,
  stripAnsi
} from './restore';
// Phase 15 capture smoke: the resolver answers WHICH specstory a captured
// session should be running under, and unwrapArgv reads the inner command
// back out of a wrap for the assertion that the resume survived it.
import { resolveSpecstory, unwrapArgv } from './specstory';
import { disposeSearchIpc, registerSearchIpc } from './search';
import { disposeSymbolsIpc, registerSymbolsIpc } from './symbols';
import { openSettingsWindow, registerSettingsIpc } from './settings';
import { disposeTray, installTray } from './tray';
import * as tmux from './tmux';
import { applyProcessIdentity } from './proc/identity';
import { reapGuardedChildren } from './proc/guarded';
import { reapOrphanedTmuxClients } from './proc/orphans';

// Phase 13.8: say our name before anything else runs — app.setName feeds the
// menu bar, the About panel and app.getPath('userData'), and process.title is
// what makes a DEV run greppable as gmux (see proc/identity.ts for the honest
// account of what dev mode cannot rename).
applyProcessIdentity(app);

// ---------------------------------------------------------------------------
// One Tortie per user data directory (Phase 18.5 item 4)
// ---------------------------------------------------------------------------
//
// Two copies of the app against one manifest (SQLite, WAL) and one tmux server
// is a manifest-corruption hazard and a double-adoption hazard. It is also not
// hypothetical. Every updater ends by relaunching the app, and that relaunch
// races the old process's exit, so the first update to ship would walk straight
// into it (docs/research/27-release-and-updates.md section 2.7).
//
// The lock is taken HERE, above the rename migration, so a second copy can
// never copy a user data directory that the first copy is already reading. The
// app name has to be set first, because that is what Electron derives the
// userData path from, and the lock lives inside it.
//
// A refused copy exits with app.exit rather than app.quit. app.quit lets
// whenReady still run, which would boot a second core against the manifest we
// are protecting. app.exit ends the process where it is called, so nothing
// below this block runs in a second copy.
//
// Measured on Electron 43.3.0 against an isolated profile:
//  - the second launch gets false, and app.exit at module scope ends it before
//    the next statement, exit code 0;
//  - the first launch gets the 'second-instance' event and brings its window
//    forward;
//  - a holder killed with SIGKILL leaves SingletonLock, SingletonSocket and
//    SingletonCookie behind in the profile, and the next launch still takes the
//    lock. A dead holder does not lock the user out. The same held with
//    SingletonLock pointed at a live pid that was not an app.
//
// The harnesses never take the lock. Each already runs under its own
// --user-data-dir, and several of them run at the same time as each other, so a
// lock would make one exit instead of doing its job.
//
// GMUX_ALLOW_SECOND_INSTANCE=1 starts a second copy anyway. It is there for the
// case the measurements above did not reach, e.g. a profile on a volume where
// the lock files cannot be created. A forced copy still takes the lock when it
// can get it, so it is itself protected against a third copy.
const harnessLaunch =
  (process.env['GMUX_SMOKE'] ?? '') !== '' ||
  (process.env['GMUX_SHOT'] ?? '') !== '';
if (!harnessLaunch) {
  if (!app.requestSingleInstanceLock()) {
    const profile = app.getPath('userData');
    if (process.env['GMUX_ALLOW_SECOND_INSTANCE'] === '1') {
      console.warn(
        `[gmux] Tortie is already running on ${profile}. ` +
          'GMUX_ALLOW_SECOND_INSTANCE=1 is set, so this second copy is starting anyway.'
      );
    } else {
      console.log(
        `[gmux] Tortie is already running on ${profile}. ` +
          'Bringing that window forward and exiting. ' +
          'Set GMUX_ALLOW_SECOND_INSTANCE=1 to start a second copy anyway.'
      );
      app.exit(0);
    }
  }
  // Fires in the copy that HOLDS the lock, once per refused launch. A launch
  // that arrives during our own quit is ignored, because reopening the window
  // there would rebuild everything the quit flow is tearing down.
  app.on('second-instance', () => {
    if (quitFlowStarted) return;
    console.log('[gmux] a second launch was refused; showing this window');
    showAppWindow();
  });
}

// Phase 16.5a: the app name we just stated is also what Electron derives
// userData from, so the FIRST launch after a rename points at an empty
// directory — manifest, snapshots, settings and hotkeys all apparently gone,
// every durable session unrestorable. Carry them over before anything can
// read (or create) that directory: synchronous, guarded against every
// harness's --user-data-dir, a no-op while the name is unchanged, and it
// leaves the original in place as the backup. See migrate/userdata.ts.
// Kept, not discarded: the one-time rename notice below is driven from it,
// and it carries the warnings (old app still running, databases verified) a
// support answer needs.
const userDataMigration = migrateUserDataIfNeeded(app);

// `gmux-asset:` (markdown images) must be declared before the app is ready —
// Electron throws if registerSchemesAsPrivileged runs later. The handler
// itself is installed in the whenReady block below.
registerAssetSchemePrivileged();

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
    title: app.name, // "Tortie" — stated once, in proc/identity.ts

    show: false,
    // --bg-canvas: pre-paint fill must match the app so launch/resize never
    // flashes a foreign color (DESIGN.md §0: one material).
    backgroundColor: WINDOW_BACKGROUND,
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

  // setWindowOpenHandler only covers window.open / target=_blank. A plain
  // <a href="https://…"> — which rendered markdown is full of — would
  // navigate THIS renderer away from the app, tearing down every terminal
  // attachment with it. gmux is a single fixed document: nothing may
  // navigate it except the initial load and a dev-server reload.
  win.webContents.on('will-navigate', (event, url) => {
    if (url === win.webContents.getURL()) return; // reload
    event.preventDefault();
    if (/^https?:/i.test(url)) void shell.openExternal(url);
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

/**
 * Bring the app window forward — the Dock 'activate' path and the menu-bar
 * status item's "Show Tortie" are the same act, so they share one function.
 * app.focus({steal:true}) is what makes it work from the status item: a
 * status-item click does NOT activate the app on its own.
 */
function showAppWindow(): void {
  const win =
    mainWindow !== null && !mainWindow.isDestroyed()
      ? mainWindow
      : (mainWindow = createWindow());
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
  app.focus({ steal: true });
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
/**
 * The second T3 row, and the reason it exists: until Phase 13.5.1 the ONLY
 * restore this gate ever exercised was claude's, so "restore works" was a
 * claim about one tenth of the registry — the exact regression BACKLOG 13.5
 * item 6 was written to prevent, sitting uncovered inside the battery that
 * was supposed to prevent it. Nothing here launches a real agent: the pane is
 * a shell, the row is relabelled, and the planted argv is a pi one, because
 * what must not regress is that restore arms WHATEVER the manifest recorded
 * rather than something claude-shaped. (A real per-agent roundtrip is a
 * different, heavier test — `npm run conformance:resume`.)
 */
const SMOKE_T3_AGENT = 'smoke-t3-agent';
const T3_MARKER_RE = /GMUX-T3-MARKER-\d+/;

/** The two rows this gate restores, and the argv shape each must come back with. */
const T3_CASES: readonly { name: string; agent: string; argvRe: RegExp }[] = [
  { name: SMOKE_T3, agent: 'claude', argvRe: /^claude --resume / },
  { name: SMOKE_T3_AGENT, agent: 'pi', argvRe: /^pi --session-id / }
];

/** Kill + discard every prior smoke-t3 trace (manifest rows AND raw tmux). */
async function cleanupT3Leftovers(core: GmuxCore): Promise<void> {
  for (const rec of core.listSessionRecords()) {
    if (rec.name !== SMOKE_T3 && rec.name !== SMOKE_T3_AGENT) continue;
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
  armWatchdog(60_000);
  try {
    const core = await getGmuxCore();
    smokeLog('1/6 core booted');

    await cleanupT3Leftovers(core);
    smokeLog('2/6 prior smoke-t3 traces cleaned');

    const home = homedir();
    const planted: { id: string; marker: string }[] = [];
    for (const kase of T3_CASES) {
      const marker = `GMUX-T3-MARKER-${Date.now()}`;
      const session = await core.createSession({
        name: kase.name,
        projectPath: home,
        cwd: home,
        agent: 'shell',
        extraArgs: ['-c', `echo ${marker}; while true; do date; sleep 1; done`]
      });
      const bytes = await receiveTermBytes(core, session.id);
      smokeLog(
        `3/6 ${kase.name} created: ${session.tmuxName} (${session.id}), ` +
          `${bytes} bytes of term data — marker is on screen`
      );

      // The row is relabelled to the agent under test so restore takes that
      // agent's path (including the original-cwd guard), while the pane stays
      // a shell — no agent binary, no network, no first-run prompt.
      if (kase.agent !== 'shell') {
        core.manifest.updateSession(session.id, {
          agent: kase.agent as ManifestSessionRecord['agent']
        });
      }
      // Simulated agent id: restore ARMS this command without running it, so
      // a fake uuid exercises the full path with zero real-agent side effects.
      const fakeId = randomUUID();
      const resumeArgv =
        kase.agent === 'claude'
          ? ['claude', '--resume', fakeId]
          : ['pi', '--session-id', fakeId];
      core.manifest.setAgentSessionId(session.id, fakeId, resumeArgv);
      smokeLog(`4/6 armed resume argv planted (${resumeArgv.join(' ')})`);
      planted.push({ id: session.id, marker });
    }

    // Quit path writes the app-quit snapshot; prove it landed with content.
    await shutdownGmuxCore();
    for (const p of planted) {
      const snapText = await readFile(snapshotPath(p.id), 'utf8');
      if (!snapText.includes(p.marker)) {
        throw new Error(`app-quit snapshot ${p.id} missing the scrollback marker`);
      }
    }
    smokeLog(`5/6 ${planted.length} snapshots on disk, each with its marker`);
    smokeLog('6/6 PASS (t3-prep) — sessions left RUNNING');
    app.exit(0);
  } catch (err) {
    smokeFail(err);
  }
}

/**
 * One restored row, proven end to end: the manifest offers it, restore
 * recreates it, and the pane shows the replayed scrollback with the recorded
 * resume command TYPED but not run.
 */
async function verifyT3Case(
  core: GmuxCore,
  kase: (typeof T3_CASES)[number]
): Promise<string> {
  const rec = core
    .listSessionRecords()
    .find((r) => r.name === kase.name && r.status !== 'exited');
  if (!rec) throw new Error(`"${kase.name}" missing from the manifest`);
  if (rec.status !== 'restorable') {
    throw new Error(
      `${kase.name}: manifest status is "${rec.status}", expected ` +
        '"restorable" — the sidebar would not offer [Restore]'
    );
  }
  if (rec.agent !== kase.agent) {
    throw new Error(`${kase.name}: row agent is "${rec.agent}"`);
  }

  const marker = T3_MARKER_RE.exec(rec.argv.join(' '))?.[0];
  const armed = (rec.resumeArgv ?? []).join(' ');
  if (!marker) throw new Error(`${kase.name}: marker missing from recorded argv`);
  if (!kase.argvRe.test(armed)) {
    throw new Error(`${kase.name}: recorded resume argv wrong: "${armed}"`);
  }

  const restored = await core.restoreSession(rec.id);
  if (restored.status !== 'running') {
    throw new Error(`${kase.name}: restore left status "${restored.status}"`);
  }

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
      `${kase.name}: capture-pane never showed marker+armed command.\n` +
        `wanted marker: ${marker}\nwanted armed: ${armed}\n` +
        `last capture tail:\n${lastCapture.split('\n').slice(-15).join('\n')}`
    );
  }

  // The armed line must be TYPED, not executed — the fake uuid would have
  // errored loudly if the agent had actually run. Cheap negative check:
  if (/No conversation found|command not found|No project session/i.test(lastCapture)) {
    throw new Error(`${kase.name}: armed command appears to have EXECUTED`);
  }

  await core.killSession(rec.id);
  core.discardSession(rec.id);
  return armed;
}

/** GMUX_SMOKE=t3-verify — second half: restorable → restore → armed. */
async function runSmokeT3Verify(): Promise<void> {
  armWatchdog(120_000);
  try {
    // OUT-OF-BAND kill BEFORE the core boots: the manifest never hears about
    // it — exactly the state a reboot leaves behind for these sessions.
    await tmux.ensureServer();
    const preLive = await tmux.listSessions();
    for (const kase of T3_CASES) {
      const keeper = preLive.find((s) => s.tmuxName === kase.name);
      if (!keeper) {
        throw new Error(
          `"${kase.name}" not running — run GMUX_SMOKE=t3-prep first`
        );
      }
      await tmux.killSession(keeper.sessionId);
    }
    smokeLog(
      `1/3 killed ${T3_CASES.length} sessions out-of-band (simulated reboot)`
    );

    const core = await getGmuxCore();
    smokeLog('2/3 core booted fresh — reconcile ran');

    for (const kase of T3_CASES) {
      const armed = await verifyT3Case(core, kase);
      smokeLog(
        `    ${kase.agent}: restorable → restored → pane shows replayed ` +
          `scrollback and the armed, unexecuted "${armed}"`
      );
    }

    await shutdownGmuxCore();
    smokeLog('3/3 PASS (t3-verify) — T3 reboot-restore acceptance test complete');
    app.exit(0);
  } catch (err) {
    smokeFail(err);
  }
}

// ---------------------------------------------------------------------------
// Agent-launch smoke — GMUX_SMOKE=agent (Phase 9.2 Bug A regression test)
//
// Creates a REAL agent session (GMUX_SMOKE_AGENT=claude|codex, default
// claude) and asserts the whole Bug A fix chain: login-shell PATH injected
// into the tmux server env, manifest argv[0] recorded ABSOLUTE, and the
// pane alive with no "command not found" — then cleans up completely.
// ---------------------------------------------------------------------------

const SMOKE_AGENT_PREFIX = 'smoke-agent-';

async function runSmokeAgent(): Promise<void> {
  armWatchdog(60_000);
  try {
    const agent =
      process.env['GMUX_SMOKE_AGENT'] === 'codex' ? 'codex' : 'claude';
    const core = await getGmuxCore();
    smokeLog('1/7 core booted (login-shell PATH captured + injected)');

    // The server's global env must now carry the user's install dirs.
    const serverPath = await tmux.execTmux(['show-environment', '-g', 'PATH']);
    if (!/(\.local\/bin|homebrew)/.test(serverPath)) {
      throw new Error(`tmux server PATH not injected: ${serverPath.trim()}`);
    }
    smokeLog('2/7 tmux server global PATH carries user install dirs');

    // Deterministic re-runs: clear leftovers from aborted runs.
    for (const rec of core.listSessionRecords()) {
      if (!rec.name.startsWith(SMOKE_AGENT_PREFIX)) continue;
      if (rec.status !== 'exited' && rec.status !== 'restorable') {
        await core.killSession(rec.id).catch(() => undefined);
      }
      core.discardSession(rec.id);
    }

    const home = homedir();
    const session = await core.createSession({
      name: `${SMOKE_AGENT_PREFIX}${process.pid}`,
      projectPath: home,
      cwd: home,
      agent
    });
    // Bug A lives in the MANIFEST RECORD, not in the launch (Phase 12.7 F3):
    // restores must survive PATH drift, so argv/resume_argv stay absolute —
    // but the process itself is launched by bare name, asserted below.
    const rec = core.listSessionRecords().find((r) => r.id === session.id);
    if (!rec || rec.argv[0]?.startsWith('/') !== true) {
      throw new Error(
        `manifest argv[0] is not absolute: ${JSON.stringify(rec?.argv)}`
      );
    }
    if (agent === 'claude' && rec.resumeArgv?.[0] !== rec.argv[0]) {
      throw new Error(
        `resume argv[0] not absolute/matching: ${JSON.stringify(rec.resumeArgv)}`
      );
    }
    smokeLog(
      `3/7 ${agent} session recorded with absolute argv[0]=${rec.argv[0]}`
    );

    // Give the CLI a beat to boot (or die), then assert the pane survived.
    await new Promise((r) => setTimeout(r, 5_000));
    const live = (await tmux.listSessions()).find(
      (s) => s.tmuxName === session.tmuxName
    );
    const after = core.listSessionRecords().find((r) => r.id === session.id);
    if (!live || !after || after.status === 'exited') {
      throw new Error(
        `agent session died right after spawn (status ${after?.status}, ` +
          `exit ${after?.exitCode ?? '?'}) — Bug A regression`
      );
    }
    const paneState = await tmux.execTmux([
      'list-panes',
      '-t',
      live.sessionId,
      '-F',
      '#{pane_dead} #{pane_dead_status} #{pane_dead_signal}'
    ]);
    if (paneState.trim().startsWith('1')) {
      throw new Error(`pane is dead: ${paneState.trim()}`);
    }
    const capture = stripAnsi(await tmux.capturePane(live.sessionId, 200));
    if (/command not found/i.test(capture)) {
      throw new Error(
        `"command not found" in pane:\n${capture.slice(-500)}`
      );
    }
    smokeLog('4/7 pane alive after 5s — no "command not found", not dead');

    // F3 (research 21 §8): the RUNNING process must not carry the absolute
    // path, or `pkill -f "$(command -v <agent>)"` singles out exactly the
    // durable gmux session and misses every ephemeral copy of the agent.
    // The assertion is the real one — what `pgrep -f` (i.e. `pkill -f`)
    // matches — read-only, and never `pkill`.
    const pane = await panePs(live.sessionId);
    const abs = rec.argv[0] as string;
    if (pane.command.includes(abs)) {
      throw new Error(
        `pane process still launched by ABSOLUTE path — a pattern kill would ` +
          `hit this durable session and nothing else: ${pane.command}`
      );
    }
    const matched = await pgrepFull(abs);
    if (matched.includes(pane.pid)) {
      throw new Error(
        `pgrep -f "${abs}" matches this durable session (pid ${pane.pid})`
      );
    }
    smokeLog(
      `5/7 pane runs by bare name (${pane.command}); ` +
        `pgrep -f "${abs}" matched ${matched.length} process(es), none of them this one`
    );

    await core.killSession(session.id);
    core.discardSession(session.id);
    smokeLog('6/7 agent session killed + discarded (clean)');

    await shutdownGmuxCore();
    smokeLog('7/7 PASS (agent) — Bug A launch chain verified, argv[0] bare');
    app.exit(0);
  } catch (err) {
    smokeFail(err);
  }
}

// ---------------------------------------------------------------------------
// Capture smoke — GMUX_SMOKE=capture (Phase 15)
//
// The claim this harness exists to make executable: turning capture ON changes
// WHO launches the agent and NOTHING ELSE the user depends on. It creates a
// real captured agent session in a throwaway project and asserts, in order:
//
//   1. the manifest carries a capture record with the resolved binary, the
//      provider, and the UNWRAPPED agent argv (the only non-lossy source for
//      re-composing a wrap later);
//   2. argv AND resume_argv are both stored WRAPPED — this is what makes a
//      restored session keep capturing, and the resume's own id and flags are
//      still inside the `-c` string where the agent will receive them;
//   3. the pane is alive, running specstory, with the real agent as its child
//      (capture that dies in the pane is the failure mode this whole phase is
//      one flag away from);
//   4. Phase 12.7 F3 survives the wrap: the AGENT's absolute path is not in
//      the running command line, so `pkill -f "$(command -v claude)"` still
//      cannot single out this durable session;
//   5. `specstory run` really engaged — `.specstory/history` exists in the
//      project directory that had none a moment ago;
//   6. ending the session drains the session-end flush (the SIGHUP backstop)
//      without a failure.
//
// Cloud is FORCED OFF here, by the harness rather than by the operator: this
// creates real captured sessions, and a scratch session must never reach
// anyone's SpecStory Cloud.
// ---------------------------------------------------------------------------

const SMOKE_CAPTURE_PREFIX = 'smoke-capture-';

async function runSmokeCapture(): Promise<void> {
  armWatchdog(120_000);
  let dir: string | null = null;
  try {
    process.env['GMUX_SPECSTORY_NO_CLOUD'] = '1';
    const agent = process.env['GMUX_SMOKE_AGENT'] ?? 'claude';
    const core = await getGmuxCore();
    smokeLog('1/8 core booted; cloud sync FORCED OFF for this harness');

    const { active } = await resolveSpecstory();
    if (active === null) {
      throw new Error(
        'no specstory binary resolved — run `npm run vendor:specstory` (bundled) ' +
          'or install the CLI'
      );
    }
    smokeLog(`2/8 specstory resolved: ${active.path} ${active.version ?? '?'} (${active.source})`);

    for (const rec of core.listSessionRecords()) {
      if (!rec.name.startsWith(SMOKE_CAPTURE_PREFIX)) continue;
      if (rec.status !== 'exited' && rec.status !== 'restorable') {
        await core.killSession(rec.id).catch(() => undefined);
      }
      core.discardSession(rec.id);
    }

    dir = mkdtempSync(join(tmpdir(), 'gmux-capture-smoke-'));
    const session = await core.createSession({
      name: `${SMOKE_CAPTURE_PREFIX}${process.pid}`,
      projectPath: dir,
      cwd: dir,
      agent: agent as CreateSessionInput['agent'],
      capture: true
    });

    const rec = core.listSessionRecords().find((r) => r.id === session.id);
    const cap = rec?.specstory;
    if (rec === undefined || cap === undefined || !cap.enabled) {
      throw new Error(
        `capture was requested and not recorded: ${JSON.stringify(rec?.specstory)}`
      );
    }
    if (cap.bin !== active.path || cap.agentArgv[0]?.startsWith('/') !== true) {
      throw new Error(
        `capture record is not restore-grade: ${JSON.stringify(cap)}`
      );
    }
    smokeLog(
      `3/8 manifest records capture: provider=${cap.provider} bin=${cap.bin} ` +
        `agentArgv[0]=${cap.agentArgv[0]} exitCodes=${cap.exitCodeFidelity}`
    );

    // (2) BOTH argvs wrapped — the resume is the one that matters after a
    // reboot, and its id and flags must still be inside the -c string.
    const wrappedLaunch = rec.argv[0] === active.path && rec.argv.includes('-c');
    if (!wrappedLaunch) {
      throw new Error(`launch argv is not wrapped: ${JSON.stringify(rec.argv)}`);
    }
    const resume = rec.resumeArgv;
    if (resume !== undefined && resume.length > 0) {
      if (resume[0] !== active.path || !resume.includes('-c')) {
        throw new Error(
          `resume argv is NOT wrapped — a restore would stop capturing: ${JSON.stringify(resume)}`
        );
      }
      const inner = unwrapArgv(resume);
      if (!inner.includes('--resume') && !inner.includes('resume')) {
        throw new Error(
          `wrapped resume lost its resume verb: ${JSON.stringify(inner)}`
        );
      }
      smokeLog(`4/8 resume argv wrapped, inner command intact: ${inner.join(' ')}`);
    } else {
      smokeLog('4/8 no pre-assigned resume argv for this agent (harvest arms it later)');
    }

    // (3) the pane, and the agent under the wrapper.
    await new Promise((r) => setTimeout(r, 6_000));
    const live = (await tmux.listSessions()).find(
      (s) => s.tmuxName === session.tmuxName
    );
    const after = core.listSessionRecords().find((r) => r.id === session.id);
    if (!live || !after || after.status === 'exited') {
      throw new Error(
        `captured session died right after spawn (status ${after?.status}, ` +
          `exit ${after?.exitCode ?? '?'}) — capture must never cost a launch`
      );
    }
    const paneText = stripAnsi(await tmux.capturePane(live.sessionId, 200));
    if (/command not found|not a valid provider|Update Available/i.test(paneText)) {
      throw new Error(`wrapper complained in the pane:\n${paneText.slice(-600)}`);
    }
    const pane = await panePs(live.sessionId);
    const children = await psChildren(pane.pid);
    if (!pane.command.includes('specstory')) {
      throw new Error(`pane process is not specstory: ${pane.command}`);
    }
    // The agent must be a REAL process under the wrapper, not merely the
    // provider word inside the wrapper's own command line — which is why the
    // match excludes any process that is itself a specstory.
    const agentProc = children.find(
      (c) => !c.includes('specstory') && c.includes(agent)
    );
    if (agentProc === undefined) {
      throw new Error(
        `no ${agent} process under the wrapper — capture swallowed the agent: ` +
          JSON.stringify(children)
      );
    }
    smokeLog(
      `5/8 pane alive: ${pane.command.slice(0, 80)} … → agent ${agentProc.slice(0, 70)}`
    );

    // (4) F3 under the wrap: the agent's ABSOLUTE path must not be greppable.
    const abs = cap.agentArgv[0] as string;
    const matched = await pgrepFull(abs);
    if (matched.includes(pane.pid)) {
      throw new Error(
        `pgrep -f "${abs}" matches this captured session (pid ${pane.pid}) — F3 lost to the wrap`
      );
    }
    smokeLog(`6/8 F3 holds under capture: pgrep -f "${abs}" does not match this pane`);

    // (5) specstory really engaged in THIS directory.
    const historyDir = join(dir, '.specstory', 'history');
    if (!existsSync(historyDir)) {
      throw new Error(
        `${historyDir} was never created — the wrapper did not start capturing`
      );
    }
    smokeLog('7/8 .specstory/history exists in the project — capture is live');

    // (6) the session-end flush drains.
    await core.killSession(session.id);
    await core.captureSyncsIdle();
    core.discardSession(session.id);

    await shutdownGmuxCore();
    smokeLog('8/8 PASS (capture) — wrapped launch, wrapped resume, live capture, flushed on end');
    app.exit(0);
  } catch (err) {
    smokeFail(err);
  } finally {
    if (dir !== null) rmSync(dir, { recursive: true, force: true });
  }
}

/** Command lines of a pid's direct children, as `ps` sees them. */
async function psChildren(pid: number): Promise<string[]> {
  return new Promise((resolve) => {
    execFile('ps', ['-o', 'command=', '-g', String(pid)], (_err, stdout) => {
      resolve(
        stdout
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l.length > 0)
      );
    });
  });
}

/** The pane process's pid and real argv, as `ps` sees it. */
async function panePs(
  tmuxTarget: string
): Promise<{ pid: number; command: string }> {
  const raw = (
    await tmux.execTmux(['list-panes', '-t', tmuxTarget, '-F', '#{pane_pid}'])
  ).trim();
  const pid = Number(raw);
  const command = await new Promise<string>((resolve, reject) => {
    execFile('ps', ['-o', 'command=', '-p', raw], (err, stdout) => {
      if (err) reject(new Error(`ps failed for pid ${raw}: ${err.message}`));
      else resolve(stdout.trim());
    });
  });
  return { pid, command };
}

/** Pids `pkill -f <pattern>` would signal. READ-ONLY — never pkill. */
async function pgrepFull(pattern: string): Promise<number[]> {
  return new Promise((resolve) => {
    execFile('pgrep', ['-f', pattern], (_err, stdout) => {
      // pgrep exits 1 with no output when nothing matches — not an error.
      resolve(
        stdout
          .split('\n')
          .map((line) => Number(line.trim()))
          .filter((n) => Number.isFinite(n) && n > 0)
      );
    });
  });
}

// ---------------------------------------------------------------------------
// Identity smoke — GMUX_SMOKE=identity (Phase 12.7 F1/F2/F3 regression test)
//
// Names are mutable and reusable; ids are not. This harness stages the exact
// sequence research 21 §6 reproduced against the live server — gmux renames
// its own session, a FOREIGN session takes the freed name — and asserts that
// gmux keeps its own session, ignores the stranger, and kills only what it
// owns. It also asserts the F3 pane markers and the F2 signal record.
//
// Every session it creates is `zz-ident-` prefixed, and the only session it
// kills that gmux did not create is the decoy this harness made itself.
//
// Run it through `npm run smoke:identity`, which hands Electron its OWN
// --user-data-dir. Every harness here shares the user's live tmux socket
// (research 21 §9.2), and a second gmux polling the SAME manifest will reap
// this harness's victim first — recording nothing if it is an older build,
// which reads as a failure of code that is fine. A private manifest means
// the other instance has no row for these sessions and leaves them alone.
// ---------------------------------------------------------------------------

const SMOKE_IDENT = 'zz-ident';

/** Is `name` a leftover from this harness (own sessions AND decoys)? */
const isIdentLeftover = (name: string): boolean => name.startsWith(SMOKE_IDENT);

async function runSmokeIdentity(): Promise<void> {
  // Generous: step 8 waits out the 1 Hz reaper before it can conclude
  // anything, and five real sessions are created along the way.
  armWatchdog(90_000);
  const decoys: string[] = [];
  try {
    const core = await getGmuxCore();

    // Deterministic re-runs: clear rows and raw sessions from aborted runs.
    for (const rec of core.listSessionRecords()) {
      if (!isIdentLeftover(rec.name)) continue;
      if (rec.status !== 'exited' && rec.status !== 'restorable') {
        await core.killSession(rec.id).catch(() => undefined);
      }
      core.discardSession(rec.id);
    }
    for (const s of await tmux.listSessions().catch(() => [])) {
      if (isIdentLeftover(s.tmuxName)) {
        await tmux.killSession(s.sessionId).catch(() => undefined);
      }
    }
    smokeLog('1/9 core booted, prior zz-ident traces cleared');

    const home = homedir();
    const name = `${SMOKE_IDENT}-${process.pid}`;
    const session = await core.createSession({
      name,
      projectPath: home,
      cwd: home,
      agent: 'shell',
      // The pane ITSELF reports the markers it was given: macOS `ps` will not
      // print another process's environment, and tmux's own show-environment
      // proves only what tmux was told, not what the process received.
      extraArgs: [
        '-c',
        'echo "MARKERS[$GMUX_MANAGED][$GMUX_SESSION_ID]"; ' +
          'while true; do sleep 1; done'
      ]
    });
    const mine = (await tmux.listSessions()).find(
      (s) => s.tmuxName === session.tmuxName
    );
    if (!mine) throw new Error('created session is not in list-sessions');
    if (mine.gmuxId !== session.id) {
      throw new Error(
        `@gmux-id is "${mine.gmuxId ?? ''}", expected ${session.id}`
      );
    }
    smokeLog(`2/9 session created and stamped: ${mine.sessionId} @gmux-id ok`);

    // F3: the pane markers, read back out of tmux's session environment.
    const markedId = await tmux.getSessionEnv(mine.sessionId, 'GMUX_SESSION_ID');
    const managed = await tmux.getSessionEnv(mine.sessionId, 'GMUX_MANAGED');
    if (markedId !== session.id || managed !== '1') {
      throw new Error(
        `pane env markers missing: GMUX_SESSION_ID=${markedId ?? ''} ` +
          `GMUX_MANAGED=${managed ?? ''}`
      );
    }
    // The manifest row records the pane pid for post-mortems (F2).
    const created = core.listSessionRecords().find((r) => r.id === session.id);
    if (created?.panePid === undefined) {
      throw new Error('pane_pid was not captured at create');
    }
    // …and the markers must reach the PROCESS, not just tmux's idea of the
    // session environment — that is what makes a durable agent identifiable
    // to anyone who has its pid.
    const want = `MARKERS[1][${session.id}]`;
    let echoed = '';
    for (let i = 0; i < 20 && !echoed.includes(want); i++) {
      await new Promise((r) => setTimeout(r, 250));
      echoed = stripAnsi(await tmux.capturePane(mine.sessionId, 20));
    }
    if (!echoed.includes(want)) {
      throw new Error(
        `the pane process did not receive the GMUX_* markers: ` +
          `${echoed.trim().split('\n').slice(-2).join(' / ')}`
      );
    }
    smokeLog(
      `3/9 GMUX_MANAGED/GMUX_SESSION_ID in tmux and in the pane process; ` +
        `pane_pid ${created.panePid} recorded`
    );

    // Identity survives a rename gmux did not make.
    const moved = `${name}-moved`;
    await tmux.execTmux(['rename-session', '-t', mine.sessionId, moved]);
    await core.refresh();
    const afterRename = core.listSessionRecords().find((r) => r.id === session.id);
    if (afterRename?.status !== 'running' || afterRename.tmuxName !== moved) {
      throw new Error(
        `external rename disowned the row (status ${afterRename?.status}, ` +
          `tmux_name ${afterRename?.tmuxName ?? '?'})`
      );
    }
    smokeLog('4/9 external rename: row still claimed, tmux_name re-synced');

    // A FOREIGN session takes the freed name — the reproduced repro.
    const decoy = await tmux.createSession({
      displayName: name,
      cwd: home,
      argv: ['sleep', '600']
    });
    decoys.push(decoy.sessionId);
    if (decoy.tmuxName !== name) {
      throw new Error(`decoy did not take the freed name: ${decoy.tmuxName}`);
    }
    await core.refresh();
    const afterDecoy = core.listSessionRecords().find((r) => r.id === session.id);
    if (afterDecoy?.tmuxName !== moved) {
      throw new Error(
        `the name squatter was adopted: row now points at ${afterDecoy?.tmuxName ?? '?'}`
      );
    }
    smokeLog('5/9 name squatter NOT adopted; row still bound to its own $-id');

    // Kill through gmux: ours dies, the stranger lives.
    await core.killSession(session.id);
    const afterKill = await tmux.listSessions();
    if (afterKill.some((s) => s.sessionId === mine.sessionId)) {
      throw new Error('gmux failed to kill its own session');
    }
    if (!afterKill.some((s) => s.sessionId === decoy.sessionId)) {
      throw new Error('gmux killed a session it did not create — F1 REGRESSION');
    }
    smokeLog('6/9 kill hit only the owned session; the stranger survived');

    // A stale row (its session gone, its name held by the stranger) must go
    // restorable and take nothing with it.
    core.discardSession(session.id);
    const stale = await core.createSession({
      name: `${SMOKE_IDENT}-stale-${process.pid}`,
      projectPath: home,
      cwd: home,
      agent: 'shell',
      extraArgs: ['-c', 'while true; do sleep 1; done']
    });
    const staleLive = (await tmux.listSessions()).find(
      (s) => s.tmuxName === stale.tmuxName
    );
    if (!staleLive) throw new Error('stale-test session missing');
    await tmux.killSession(staleLive.sessionId); // out-of-band death
    const squatter = await tmux.createSession({
      displayName: stale.tmuxName,
      cwd: home,
      argv: ['sleep', '600']
    });
    decoys.push(squatter.sessionId);
    await core.refresh();
    const staleRow = core.listSessionRecords().find((r) => r.id === stale.id);
    if (staleRow?.status !== 'restorable') {
      throw new Error(`stale row is "${staleRow?.status}", expected restorable`);
    }
    if (!(await tmux.listSessions()).some((s) => s.sessionId === squatter.sessionId)) {
      throw new Error('reconcile killed the name squatter — F1 REGRESSION');
    }
    core.discardSession(stale.id);
    smokeLog('7/9 stale row → restorable, and nothing was killed');

    // F2: an external `kill -TERM` on a process that does NOT self-map the
    // signal. tmux reports an EMPTY exit status here — before this phase the
    // row recorded no cause at all and the UI said only "Session ended".
    const victim = await core.createSession({
      name: `${SMOKE_IDENT}-signal-${process.pid}`,
      projectPath: home,
      cwd: home,
      agent: 'shell',
      extraArgs: ['-c', 'exec sleep 600']
    });
    const victimRec = core.listSessionRecords().find((r) => r.id === victim.id);
    const victimPid = victimRec?.panePid;
    if (victimPid === undefined) throw new Error('no pane_pid for the signal test');
    process.kill(victimPid, 'SIGTERM');
    const deadline = Date.now() + 20_000;
    let reaped = core.listSessionRecords().find((r) => r.id === victim.id);
    while (reaped?.status !== 'exited' && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 500));
      reaped = core.listSessionRecords().find((r) => r.id === victim.id);
    }
    if (reaped?.status !== 'exited') {
      throw new Error('the killed session was never reaped');
    }
    if (reaped.exitSignal !== 'term') {
      throw new Error(
        `exit_signal is "${reaped.exitSignal ?? ''}" (exit_code ` +
          `${reaped.exitCode ?? '-'}), expected "term"`
      );
    }
    core.discardSession(victim.id);
    smokeLog('8/9 external SIGTERM recorded as exit_signal=term');

    for (const id of decoys.splice(0)) {
      await tmux.killSession(id).catch(() => undefined);
    }
    await shutdownGmuxCore();
    smokeLog('9/9 PASS (identity) — sessions bind by id, deaths name their cause');
    app.exit(0);
  } catch (err) {
    for (const id of decoys) {
      await tmux.killSession(id).catch(() => undefined);
    }
    smokeFail(err);
  }
}

// ---------------------------------------------------------------------------
// Process-identity harness — GMUX_SMOKE=procid (Phase 13.8)
// ---------------------------------------------------------------------------
//
// Prints what the OUTSIDE WORLD sees of this process, from inside it: the
// name Electron thinks it has, the argv[0] `ps` will show, the executable
// Activity Monitor reads its label from, and the gmux-owned process list the
// diagnostics surface consumes. Strictly read-only — it never boots the
// durable core, never creates or kills a session, and only ever asks tmux to
// LIST. Safe to run against a machine full of the user's live work.
//
// Run it in both worlds; the answers are meant to differ:
//   npm run smoke:procid
//   GMUX_SMOKE=procid release/mac-arm64/gmux.app/Contents/MacOS/gmux
async function runSmokeProcId(): Promise<void> {
  armWatchdog(20_000);
  try {
    const { listGmuxProcesses } = await import('./diagnostics/owned-processes');
    const { runGuarded } = await import('./proc/guarded');

    smokeLog(`app.getName()      ${app.getName()}`);
    smokeLog(`process.title      ${process.title}`);
    smokeLog(`app.isPackaged     ${String(app.isPackaged)}`);
    smokeLog(`process.execPath   ${process.execPath}`);

    // What `ps` says about US — comm= is the executable (what Activity
    // Monitor's name follows), command= is argv[0] (what pgrep -f matches).
    const self = await runGuarded(
      '/bin/ps',
      ['-p', String(process.pid), '-o', 'comm=,command='],
      { timeoutMs: 5_000 }
    );
    smokeLog(`ps -o comm,command ${self.stdout.trim()}`);

    const rows = await listGmuxProcesses();
    smokeLog(`owned processes    ${rows.length}`);
    for (const r of rows) {
      const mb = (r.rssBytes / (1024 * 1024)).toFixed(1);
      const where = r.sessionName !== undefined ? ` [${r.sessionName}]` : '';
      smokeLog(
        `  ${String(r.pid).padStart(6)} ${r.role.padEnd(14)} ${mb.padStart(7)} MB${where}  ${r.command.slice(0, 96)}`
      );
    }
    // Opt-in second half: run the boot reap this harness otherwise only
    // reports on, so the destructive path is executable and observable
    // WITHOUT starting a whole app. GMUX_PROCID_REAP=1.
    if (process.env['GMUX_PROCID_REAP'] === '1') {
      const { reapOrphanedTmuxClients } = await import('./proc/orphans');
      const before = rows.filter(
        (r) => r.role === 'orphan-client' || r.role === 'orphan-probe'
      ).length;
      const result = await reapOrphanedTmuxClients();
      smokeLog(
        `reap: ${before} stray process(es) before; found ${result.found.length} client(s) + ${result.probes.length} stranded probe(s), signalled ${result.signalled.length}${result.skipped !== undefined ? ` (skipped: ${result.skipped})` : ''}`
      );
      const after = (await listGmuxProcesses()).filter(
        (r) => r.role === 'orphan-client' || r.role === 'orphan-probe'
      ).length;
      smokeLog(`reap: ${after} stray process(es) after`);
    }

    smokeLog(
      process.env['GMUX_PROCID_REAP'] === '1'
        ? 'PASS (procid) — identity printed, strays cleared'
        : 'PASS (procid) — identity printed, nothing was signalled'
    );
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

  mainWindow = createWindow();
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
        const wc = mainWindow!.webContents;
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

  // `gmux-asset:` handler — images referenced by rendered markdown (item 6).
  registerAssetProtocol();

  // Handlers are lazy (each awaits getGmuxCore()), so registering them in
  // every mode is free and keeps harness renderers from hitting
  // "No handler registered" noise.
  registerIpcHandlers();
  // Phase 4: git sidebar (git:* + repo watchers) and file tree (fs:readDir/
  // fs:reveal). Both are self-contained registries, lazy per repo.
  registerGitIpc(ipcMain);
  registerFsIpc(ipcMain);
  // Phase 12.10 item 1: the IMAGE path (fs:readImage). Registered apart from
  // registerFsIpc on purpose — that registrar owns the text surface, and the
  // point of the image channel is that images never share a door with text.
  registerImageIpc(ipcMain);
  // Phase 12.9 item 1: projects:create — the only project channel that
  // writes to disk (mkdir + optional `git init`, then the usual add).
  registerProjectCreateIpc(ipcMain);
  // Phase 6: restore extension channels (sessions:restore, sessions:discard,
  // app:get/setLoginItem).
  registerRestoreIpc(ipcMain);
  // Phase 8: agent CLI availability probe (agents:availability).
  registerAgentsIpc(ipcMain);
  // Phase 10 (S13): settings store + Settings window + flag-preset catalogs
  // (settings:get/set, settings:openWindow, agents:flagPresets).
  registerSettingsIpc(ipcMain);
  // Phase 12 item 8: file/image drop (drop:strategies/prepare/persist) and
  // the userData drop store's prune-at-ready + daily timer.
  registerDropIpc(ipcMain);
  startDropStorePruning();
  // Phase 12 items 1 + 2: terminal capture + rich clipboard + Clear
  // (capture:*, clipboard:writeRich, terminal:clearHistory).
  registerCaptureIpc(ipcMain);
  // Phase 14: project-wide content search (search:start/cancel/context). The
  // vendored ripgrep is spawned per query and streamed; nothing is indexed,
  // nothing runs in the background, so registering it costs one closure.
  registerSearchIpc(ipcMain);
  // Phase 14: quick open (quickopen:warm/query). The resident ranking worker
  // is created on the FIRST ⌘P, never at boot — registering it costs one
  // closure, and a user who never opens the palette never pays for it.
  registerQuickOpenIpc(ipcMain);
  // Phase 14: go to symbol (symbols:query/ensure/release). The tree-sitter
  // worker pool, the six wasm grammars and the symbol database are ALL created
  // on the first ⌘⇧O for a project and never at boot — "never on project
  // open" is the lifecycle rule this registration exists to keep enforceable.
  registerSymbolsIpc(ipcMain);
  // Phase 8.2: renderer-confirmed quit (first-quit toast flow — the Quit
  // menu item forwards to the renderer, which invokes this after showing
  // the one-time §4 toast; see src/main/menu.ts for the fallback timer).
  handle(ipcMain, 'app:quit', () => {
    app.quit();
  });

  if (smoke === 'basic') return runSmokeBasic();
  if (smoke === 'create') return runSmokeCreate();
  if (smoke === 'verify') return runSmokeVerify();
  if (smoke === 't3-prep') return runSmokeT3Prep();
  if (smoke === 't3-verify') return runSmokeT3Verify();
  if (smoke === 'agent') return runSmokeAgent();
  // Phase 15: the captured-launch acceptance test (wrap + resume + flush).
  if (smoke === 'capture') return runSmokeCapture();
  if (smoke === 'identity') return runSmokeIdentity();
  // Phase 16.5a: the rename upgrade, driven against a populated fixture and
  // REAL live tmux sessions (src/main/migrate/smoke.ts). Never reads the real
  // userData; the guard it asserts first is what keeps it that way.
  if (smoke === 'migrate') return runMigrateSmoke();
  // Phase 13.8: what the outside world sees of gmux (read-only).
  if (smoke === 'procid') return runSmokeProcId();
  // Phase 13.5 item 5 — `npm run conformance:resume`. Lives in
  // src/main/conformance/ rather than here: it is a per-agent matrix with its
  // own report format, not a pass/fail smoke, and it is the one harness meant
  // to be run against agent CLIs that change under us.
  if (smoke === 'conformance-resume') return runResumeConformance();
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

  // Phase 13.8: detach tmux clients that previous runs left attached to the
  // private server (12 of them were found alive on the reporting machine,
  // one per launch that ended abruptly). Clients only — sessions are never
  // touched — and only ones no live gmux owns. See proc/orphans.ts for the
  // four safety conditions. Fire-and-forget: it must never delay the window.
  void reapOrphanedTmuxClients().catch(() => undefined);

  mainWindow = createWindow();

  // Phase 12.85: the menu-bar sentinel. Normal startup only — no harness has
  // any business planting a status item in the user's menu bar.
  installTray({ showWindow: showAppWindow });

  // Phase 16.5, rename hazard 3. SMAppService keys the login item on the
  // BUNDLE ID, so com.specstory.gmux's registration means nothing to
  // com.specstory.tortie: the toggle silently reads back off and sessions
  // stop coming back after a reboot. Re-register from the recorded
  // preference where there is one, then — once, ever — say out loud what
  // macOS is about to re-ask for. Both are deliberately non-fatal.
  const loginReconcile = reconcileLoginItem();
  mainWindow.once('show', () => {
    void showRenameNoticeOnce({
      result: userDataMigration,
      login: loginReconcile
    });
  });

  // Phase 13: the activity poll runs at 1 Hz while gmux has focus and 2 s
  // when it does not — nobody is reading status dots in a background app,
  // and the always-on tier is already only 0.28 % of one core.
  const syncPollCadence = (focused: boolean): void => {
    void getGmuxCore()
      .then((core) => core.setPollFocused(focused))
      .catch(() => undefined);
  };
  app.on('browser-window-focus', () => syncPollCadence(true));
  app.on('browser-window-blur', () => {
    // 'blur' also fires when focus moves BETWEEN gmux windows.
    setTimeout(() => {
      syncPollCadence(BrowserWindow.getAllWindows().some((w) => w.isFocused()));
    }, 0);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) showAppWindow();
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
    disposeSearchIpc(); // SIGKILL any in-flight ripgrep
    void disposeQuickOpenIpc(); // terminate the ⌘P ranking worker
    void disposeSymbolsIpc(); // terminate the tree-sitter pool, close its db
    // Phase 13.8: any question-asking child still in flight (login-shell PATH
    // probe, an agent `--version`, cursor's create-chat) dies WITH the app.
    // This is the hole the 19-hour `zsh -lic` orphans came through: their
    // deadline was pending and the timer died with the process that set it.
    const reaped = reapGuardedChildren();
    if (reaped > 0) console.log(`[gmux] reaped ${reaped} in-flight probe(s)`);
    disposeTray();
    app.quit();
  })();
});

// Single-window app: quitting on last-window-close is correct on macOS too —
// the durable tmux server (not the GUI) is what keeps sessions alive.
app.on('window-all-closed', () => {
  app.quit();
});

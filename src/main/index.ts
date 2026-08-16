/**
 * Tortie main process entry — the composition root (Phase 42 stage 3).
 *
 * Boot sequence (Phase 2, FINAL-REPORT §2.4): install the main capabilities
 * (src/main/capabilities.ts — the native menu, the protocol handlers, every
 * domain IPC registrar, and the one ordered quit disposer) → dispatch a
 * harness launch if this is one (src/main/harness/ — the GMUX_SMOKE and
 * GMUX_SHOT catalog lives on that dispatch) → boot the durable core (private
 * tmux server on socket -L gmux → SQLite manifest → control-mode event bus →
 * reconcile) → open the single window. The core boots lazily-with-retry via
 * getGmuxCore(), so a missing tmux surfaces as a friendly renderer state
 * instead of a dead app.
 *
 * NOTE: we run the SYSTEM tmux (3.6a at build time) — bundling a pinned tmux
 * inside gmux.app is out of scope today (docs/audits/2026-08-09-prebuild-architecture-assessment.md §5 Stream A1).
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'node:path';
import {
  disposeMainCapabilities,
  installMainCapabilities,
  type MainDisposeOutcome
} from './capabilities';
// Phase 23: the configuration file is read at boot, on an explicit reload and
// on a watcher debounce, and nowhere else. `initAgentOverlay` is the boot read.
import { initAgentOverlay } from './config/store';
import { proveNativeModules } from './diagnostics/native-proof';
// Phase 28: one log line when a helper or renderer process dies. Log only.
import { installProcessGoneLogging } from './diagnostics/process-gone';
import { dispatchHarness } from './harness';
// Phase 35: one structured log file, local crash capture. initLogging and
// startCrashCapture run at module scope below, before whenReady; the boot
// sequence (sentinel, Crashpad diff, boot.env, prune) runs inside whenReady.
import {
  getLog,
  initLogging,
  runLogBootSequence
} from './log';
import { startCrashCapture } from './log/crash';
import { postDurabilityNotice } from './notice';
import {
  registerAssetSchemePrivileged
} from './assets';
import { PREVIEW_PRIVILEGED_SCHEME } from './preview';
import { getGmuxCore } from './sessions';
import { WINDOW_BACKGROUND } from '@shared/window-chrome';
import { migrateUserDataIfNeeded, showRenameNoticeOnce } from './migrate';
// Phase 21 fix round: the refusal, and the screen that says it in words.
import { manifestRefusal } from './manifest/refusal';
import { isSchemaRefusal } from './db/schema-version';
import { presentManifestRefusal } from './notice/refusal-screen';
import { reconcileLoginItem } from './restore';
// Phase 42 stage 1: navigation, new-window and IPC sender trust — one policy
// module, applied to every window Tortie creates for its own renderers.
import { applyTrustedWindowPolicy } from './security/trusted-window';
import { installTray } from './tray';
// Phase 19 item 11: the two power handlers. Normal startup only.
import { installPowerHandlers } from './power';
import { broadcastEvent } from './typed-events';
import { EVT_POWER_RESUME } from '@shared/ipc';
import { applyProcessIdentity } from './proc/identity';
import { reapOrphanedTmuxClients } from './proc/orphans';
// Phase 51: `tortie .` — a launch may carry ONE folder to open as a project
// tab. The shim, the argv acceptance and the pending slot live in ./shell;
// this file only wires the three entry points (boot argv, second-instance
// argv, the open-file event).
import {
  nudgeRenderer,
  pickShellOpenPath,
  setPendingShellOpen
} from './shell';
// Phase 61: a Finder open may carry a file. The arrival module decides the
// project folder for it, or refuses, and this file only logs and stores.
import { resolveShellArrival } from './shell/arrival';
// Phase 24: self update. The updater engine is one module, the post update
// self check runs once per version change, and updates:state feeds the
// Settings row. All three are wired below on normal startup paths only.
import { initUpdater } from './updates/updater';
import { runPostUpdateSelfCheck } from './updates/self-check';
// Phase 31: the refusal surface. The first launch after a failed install
// says why, once, from the evidence Squirrel left on disk.
import { announceRefusedInstallIfAny } from './updates/ui';

// Phase 13.8: say our name before anything else runs — app.setName feeds the
// menu bar, the About panel and app.getPath('userData'), and process.title is
// what makes a DEV run greppable as gmux (see proc/identity.ts for the honest
// account of what dev mode cannot rename).
applyProcessIdentity(app);

// Phase 35: logging first, crash capture second, both before whenReady.
// initLogging must follow applyProcessIdentity because the file lives under
// userData, which the app name decides. crashReporter.start must run before
// app ready (25 to 33 ms measured, research 42 §6) and runs in EVERY mode,
// so dumps exist even in dev profiles. uploadToServer is false and no code
// path may ever flip it (build/assert-bundle-refusals.mjs pins the fragment).
initLogging();
startCrashCapture();
const bootLog = getLog('boot');

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
// Phase 24: the update rehearsal is DELIBERATELY not on this list, even
// though `activeTmuxSocket` in src/main/tmux/supervisor.ts honours
// GMUX_UPDATE_REHEARSAL as a harness term. A rehearsal launch must still
// take the lock. The lock lives in the isolated profile the rehearsal
// always passes, so it protects the rehearsal without touching the
// operator's instance. A rehearsal launched WITHOUT --user-data-dir is
// refused by the operator's own running copy, and that refusal is the
// protective direction. Both files state this asymmetry on purpose.
//
// GMUX_ALLOW_SECOND_INSTANCE=1 starts a second copy anyway. It is there for the
// case the measurements above did not reach, e.g. a profile on a volume where
// the lock files cannot be created. A forced copy still takes the lock when it
// can get it, so it is itself protected against a third copy.
const harnessLaunch =
  (process.env['GMUX_SMOKE'] ?? '') !== '' ||
  (process.env['GMUX_SHOT'] ?? '') !== '';
// A harness launch never touches the macOS keychain (2026-08-16 incident).
// Chromium stores its safe-storage key in the DEFAULT keychain, and a probe
// that redirects HOME has no keychain there, so macOS pops "A keychain
// cannot be found to store ..." and WAITS. Keychain prompts queue
// system-wide behind one modal, so one unanswered dialog on an unattended
// machine blocks every later process that touches the keychain. That chain
// hung conformance:resume:capture for a whole evening, because it is the
// one gate that spawns real agent CLIs and claude reads its OAuth
// credentials from the keychain at boot. --use-mock-keychain is Chromium's
// own switch for exactly this case: a deterministic in-process key, no
// keychain access, no dialog. Harness profiles are throwaway, so nothing of
// value is ever stored under the mock key. Normal launches are unaffected.
if (harnessLaunch) {
  app.commandLine.appendSwitch('use-mock-keychain');
}
if (!harnessLaunch) {
  if (!app.requestSingleInstanceLock()) {
    const profile = app.getPath('userData');
    if (process.env['GMUX_ALLOW_SECOND_INSTANCE'] === '1') {
      bootLog.warn(
        `Tortie is already running on ${profile}. ` +
          'GMUX_ALLOW_SECOND_INSTANCE=1 is set, so this second copy is starting anyway.',
        { profile }
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
  //
  // Phase 51: the event delivers the refused copy's full argv, which is how
  // `tortie <folder>` reaches a running Tortie — the shim starts a fresh copy
  // with `open -n`, this copy refuses it, and the folder lands here. The
  // argv goes through the same one-folder acceptance as a boot argv. The
  // nudge is skipped while a recreated window is still loading; the fresh
  // renderer's hydrate pull delivers instead (take-and-clear, never twice).
  app.on('second-instance', (_event, argv) => {
    if (quitFlowStarted) return;
    console.log('[gmux] a second launch was refused; showing this window');
    const opened = noteShellOpenArgs(argv.slice(app.isPackaged ? 1 : 2));
    showAppWindow();
    if (opened) nudgeRenderer();
  });
}

// ---------------------------------------------------------------------------
// `tortie .` from the shell (Phase 51)
// ---------------------------------------------------------------------------
//
// THE CAP: a launch argument can open one folder as a project tab, and it
// can do nothing else. No argument may ever select an agent, start a
// session, or run a command — any process on the machine can invoke the
// shim, so a shim that could start an agent would be a remote control for a
// process the user never confirmed (refusal 8; research 48 §9.3). The
// acceptance function drops everything beyond one absolute existing folder
// and this helper logs one line naming what was dropped.

/** Accept at most one folder from launch arguments; true when one was set. */
function noteShellOpenArgs(rawArgs: string[]): boolean {
  const pick = pickShellOpenPath(rawArgs);
  const shellLog = getLog('shell');
  if (pick.dropped.length > 0) {
    shellLog.info(
      `launch arguments beyond one folder path were ignored: ${pick.dropped.join(', ')}`
    );
  }
  if (pick.path === null) return false;
  shellLog.info(`opening folder from launch: ${pick.path}`);
  setPendingShellOpen(pick.path);
  return true;
}

// Boot argv: parsed once, before any whenReady work. The renderer pulls the
// slot at the end of hydrateAppState, so a shim launch while Tortie is not
// running opens the folder on boot with no nudge needed. Runs in every mode:
// harness argv is all switches, which the acceptance skips silently.
noteShellOpenArgs(process.argv.slice(app.isPackaged ? 1 : 2));

// The Apple open-file event — `open -a Tortie <path>`, a Dock drop, and
// since Phase 61 every Finder "Open With" delivery. Registered inside
// will-finish-launching so a COLD open is caught too (the event fires
// before ready on a cold start; the hydrate pull delivers it, because no
// window exists to nudge yet). A folder opens as a project tab. A file
// opens its project first (the nearest git repository root above it, or
// its parent folder), then opens in a tab. The cap holds: an arriving path
// can never start an agent, select an agent or run a command, and macOS
// sends one event per selected file, so anything beyond one path per event
// does not exist. Each arrival replaces the pending pair whole; the last
// one wins. The argv path (`tortie <file>`) is unchanged and still accepts
// folders only; Finder never uses argv.
app.on('will-finish-launching', () => {
  app.on('open-file', (event, path) => {
    event.preventDefault();
    const shellLog = getLog('shell');
    const arrival = resolveShellArrival(path, app.getPath('home'));
    // One log line per outcome. For a file, the no-viewer line wins over
    // the project lines, because it explains what the tab will show.
    if (arrival.kind === 'refused') {
      shellLog.info(`a Finder open was ignored: ${path} (${arrival.reason})`);
      return;
    }
    if (arrival.kind === 'folder') {
      shellLog.info(`opening folder from Finder: ${arrival.folder}`);
      setPendingShellOpen(arrival.folder, null);
    } else {
      if (!arrival.displayable) {
        shellLog.info(
          `opening file from Finder: ${arrival.file} ` +
            '(Tortie has no viewer for this file type, so its tab will say so)'
        );
      } else if (arrival.repository) {
        shellLog.info(
          `opening file from Finder: ${arrival.file} (project ${arrival.folder})`
        );
      } else {
        shellLog.info(
          `opening file from Finder: ${arrival.file} ` +
            '(no git repository above it, so the project is its parent ' +
            `folder ${arrival.folder})`
        );
      }
      setPendingShellOpen(arrival.folder, arrival.file);
    }
    if (!app.isReady()) return;
    showAppWindow();
    nudgeRenderer();
  });
});

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

// `gmux-asset:` (markdown images) and `gmux-preview:` (the Phase 20.5 HTML
// preview frame) must both be declared before the app is ready — Electron
// throws if registerSchemesAsPrivileged runs later. The handlers themselves
// are installed by installMainCapabilities in the whenReady block below.
//
// ONE CALL, BOTH SCHEMES. A second call does not add a scheme, it strips
// `secure`, `supportFetchAPI` and `corsEnabled` from whichever scheme was
// registered first, silently. The measurement is on
// `registerAssetSchemePrivileged` and a test fails on a second call site.
registerAssetSchemePrivileged([PREVIEW_PRIVILEGED_SCHEME]);

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

  // Navigation + new-window restrictions + trusted IPC sender registration —
  // one policy, stated once for every Tortie window (Phase 42 stage 1).
  applyTrustedWindowPolicy(win);

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
// App lifecycle
// ---------------------------------------------------------------------------

// The one ordered quit disposer (Phase 42 stage 3). installMainCapabilities
// returns it; the fallback direct reference exists because the before-quit
// handler below is registered at module scope, and a quit that arrives
// before whenReady finished installing must still run the same ordered
// teardown, exactly as the pre-move inline handler did.
let disposeCapabilities: () => Promise<MainDisposeOutcome> =
  disposeMainCapabilities;

app.whenReady().then(async () => {
  // Every app-ready capability — the native menu, the two protocol handlers,
  // and every domain IPC registrar — installs here, in every mode. Handlers
  // are lazy (each awaits getGmuxCore()), so registering them in every mode
  // is free and keeps harness renderers from hitting "No handler registered"
  // noise. The return value is the one ordered disposer invoked at quit.
  disposeCapabilities = installMainCapabilities({ ipcMain });

  // Phase 35: the crash story's whenReady half, before any window exists.
  // It reads the run sentinel, diffs the Crashpad directories, writes
  // boot.unclean_exit, posts the one quiet notice, sweeps the dumps, prunes
  // the logs directory, arms a fresh sentinel, and detaches the boot.env
  // snapshot. It runs before dispatchHarness so a probe profile gets the same
  // records the shipped app gets, and it does nothing at all unless file
  // logging is on (app.isPackaged, or GMUX_LOG_FILE=1). That gate is what
  // stops a harness that ends in app.exit() from leaving a sentinel behind
  // and faking a crash at the next smoke boot.
  runLogBootSequence({ postNotice: postDurabilityNotice });

  // A harness launch (GMUX_SMOKE / GMUX_SHOT) owns the process from here:
  // every harness ends in app.exit, or, for the quit smoke, the real
  // app.quit. Normal startup never runs behind one.
  if (await dispatchHarness({ createWindow })) return;

  // PHASE 21 FIX ROUND, and it is the FIRST thing normal startup does.
  //
  // A session list a newer Tortie has already upgraded is one this build must
  // not write to, and research 27 §4.4 says what the person sees: a blocking,
  // plain language screen with Quit and Reveal data folder. The check has to
  // be here rather than at the first IPC call because the renderer's first
  // paint asks for the session list, and a window that opens and then
  // apologises has already told the user their sessions are gone. A verifier
  // drove exactly that: the empty home screen offering "New project", with the
  // real reason truncated inside a corner toast.
  //
  // The probe opens the file READ ONLY and returns null for anything it cannot
  // prove, so a missing or damaged manifest carries on to the recovery path
  // below and only a file that says it needs a newer build stops here.
  const refusal = manifestRefusal();
  if (refusal !== null) {
    await presentManifestRefusal(refusal);
    return;
  }

  // PHASE 23: the boot read of `<userData>/gmux/config/agents.json`, and it
  // happens BEFORE the core boots and before the first agent scan, so the
  // merged table is already in memory by the time anything asks for it.
  //
  // It is deliberately not awaited. Everything that matters here is
  // synchronous and has already run by the time this line returns: the
  // directory is created, the guide is seeded, the file is read, validated and
  // merged, and the gate is handed its row source. The only thing behind the
  // await is the file watcher, and a window must not wait on a watcher.
  //
  // A throw here can never stop Tortie starting. A configuration file is an
  // addition to the compiled twelve agents, so the failure direction is
  // "you get the agents the build ships" rather than "the app does not open".
  void initAgentOverlay().catch((err: unknown) => {
    getLog('config').error(
      `the configuration file was not read: ${(err as Error).message}`
    );
  });

  // Normal startup. Native-module sanity is logged (not fatal) so a broken
  // rebuild is visible immediately in dev consoles.
  const native = await proveNativeModules();
  if (native.ok) {
    console.log(`[gmux] native modules: ${native.detail}`);
  } else {
    bootLog.error(`NATIVE MODULE FAILURE: ${native.detail}`, {
      detail: native.detail
    });
  }

  // Kick the core boot now so the window opens onto live data; failures are
  // retried per-IPC-call and surfaced as friendly renderer states.
  getGmuxCore().catch((err: unknown) => {
    // …except a refusal, which is not a failure to boot. The probe above
    // already caught the case that exists today. This is the second door: a
    // file that became newer between the probe and the open, and any future
    // caller that reaches the store without passing the probe. Both end at the
    // same screen rather than at a toast in the corner of an empty window.
    if (isSchemaRefusal(err)) {
      void presentManifestRefusal(err);
      return;
    }
    bootLog.error(`core boot failed: ${(err as Error).message}`);
  });

  // Phase 31: the refusal surface. If the last run promised an install and
  // this launch still runs the old version, one dialog names the reason.
  // This call must come BEFORE the self check below. The refusal decision
  // reads lastSeenVersion to tell "no install happened" apart from "some
  // other install happened", and the self check rewrites that field on the
  // same launch. Fire and forget; it never rejects.
  void announceRefusedInstallIfAny();

  // Phase 24: the post update self check. On the first boot after the
  // version changes it verifies the bundled resources resolve on disk and
  // surfaces one quiet failure if any is missing. Fire and forget, catches
  // internally, and must never delay the window.
  void runPostUpdateSelfCheck();

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

  // Phase 19 item 11: sleep and wake. `powerMonitor` appeared nowhere in the
  // app before this, so a lid closing was a durability gap Tortie never saw.
  //
  // Suspend forces the same capture the quit path runs. Sleep is the other
  // moment the app is told in advance that it is about to stop, and without
  // this the newest snapshot on disk could be hours older than the pane when
  // a machine goes down and does not come back.
  //
  // Resume does two things. It asks every terminal to clear its WebGL glyph
  // atlas, because a texture atlas does not survive the GPU process losing
  // its context across a sleep and the pane comes back drawing wrong or blank
  // glyphs. And it reconciles, because a session can die while the machine is
  // asleep and the 1 Hz status poll would otherwise take until its next tick
  // to notice. Both are the handler VS Code wires from the same event.
  //
  // Normal startup only. No harness has any business reacting to the
  // operator's machine going to sleep.
  installPowerHandlers({
    captureAll: async () => {
      const core = await getGmuxCore();
      // 'system-sleep', not the 'app-quit' default. The reason is recorded in
      // every capsule so Phase 20 can tell a capture taken on the way to sleep
      // from one taken as the app closed, and this is the call site that
      // creates the sleep case.
      await core.snapshotAllSessions('system-sleep');
    },
    onResume: () => {
      broadcastEvent(EVT_POWER_RESUME);
      void getGmuxCore()
        .then((core) => core.scheduleRefresh())
        .catch(() => undefined);
    }
  });

  // Phase 24: the self updater. Three refusals live inside it. The first
  // check runs 30 seconds from now and never at launch, a failed background
  // check is one log line and nothing above the surface, and Tortie never
  // calls quitAndInstall on its own initiative. Normal startup only, because
  // every harness mode returned before this line.
  initUpdater();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) showAppWindow();
  });
});

// Phase 28: record helper and renderer process death. Registered at module
// scope because the GPU process can die before whenReady resolves, and
// registering before ready is safe. Log only, no behavior change.
installProcessGoneLogging(app);

// Quit-time teardown kills ONLY gmux-side clients (attach PTYs, control
// client, repo watchers). The tmux server and every session keep running —
// T1 by design. Phase 6: quit is deferred ONCE so scrollback snapshots
// (§2.4 Step 2 app-quit capture point) finish before the process dies;
// shutdownGmuxCore bounds the capture at 8 s so quit can never wedge. The
// ordered teardown itself is disposeMainCapabilities (capabilities.ts),
// Phase 36's order preserved whole.
let quitFlowStarted = false;
app.on('before-quit', (event) => {
  if (quitFlowStarted) return; // second pass: let the quit proceed
  quitFlowStarted = true;
  event.preventDefault();
  void (async () => {
    // 'killed' means a wedged watcher close forced SIGKILL to self inside
    // the disposer; nothing after that call runs, and calling app.quit()
    // here would only re-enter the teardown the disposer refused to trust.
    const outcome = await disposeCapabilities();
    if (outcome === 'killed') return;
    app.quit();
  })();
});

// Single-window app: quitting on last-window-close is correct on macOS too —
// the durable tmux server (not the GUI) is what keeps sessions alive.
app.on('window-all-closed', () => {
  app.quit();
});

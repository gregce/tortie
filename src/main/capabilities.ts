/**
 * Main-process capability installation and ordered disposal (Phase 42 stage 3).
 *
 * `installMainCapabilities` is the one place the app-ready registrations
 * live: the native menu, the two protocol handlers, and every domain IPC
 * registrar, in the order src/main/index.ts installed them before the move.
 * It returns `disposeMainCapabilities`, the one ordered disposer the
 * composition root awaits inside before-quit.
 *
 * The disposal ORDER is Phase 36's and it is load bearing. Every watcher
 * close the quit path issues is awaited before app.quit, because an
 * unsubscribe completion still queued at FreeEnvironment is answered by
 * napi_fatal_error, and all 5 real quits on 2026-08-14 died that way. The
 * drain bounds (2 s inside a 3 s race, then a 15 s second drain) and the
 * classified log lines are contract for Phase 35; do not reorder, unbound,
 * or silence them.
 */

import { app, BrowserWindow, type IpcMain } from 'electron';
import { writeSync } from 'node:fs';
import { disposeActionsIpc, registerActionsIpc } from './actions';
import { registerAgentsIpc } from './agents';
import { disposeArchIpc, registerArchIpc } from './arch/ipc';
import { registerAssetProtocol } from './assets';
import { registerCaptureIpc } from './capture';
import { registerConfigIpc } from './config/ipc';
// Phase 23: the configuration file is read at boot, on an explicit reload and
// on a watcher debounce, and nowhere else. `stopAgentOverlayWatch` is the
// teardown that matches the boot read.
import { stopAgentOverlayWatch } from './config/store';
import { registerContextIpc } from './context/ipc';
import { registerDiagnosticsIpc } from './diagnostics/ipc';
import { disposeOverviewIpc, registerOverviewIpc } from './overview/ipc';
// Phase 181: the subscription usage meter. Two read channels and the held
// snapshot they answer from, dropped in the ordered disposer below.
import { disposeUsageService, registerUsageIpc } from './usage/ipc';
import { registerLoginsIpc } from './logins/ipc';
import { stopLiveSampling } from './diagnostics/live';
import { foldChosenNow, foldSuspension } from './sessions/fold-wiring';
import { installLaunchContextResolver } from './context/launch-resolver';
import { registerDropIpc, startDropStorePruning } from './drop';
import { registerFsIpc, registerImageIpc } from './fs';
import { disposeGitIpc, registerGitIpc } from './git';
import { registerIpcHandlers } from './ipc';
// Phase 35: the five log channels, and the sentinel clear the SIGKILL escape
// below owes the next boot.
import { clearLogRunSentinel, getLog, logEvent } from './log';
import { registerLogIpc } from './log/ipc';
// Phase 68: the machines domain. The watcher teardown and the live test
// cancellation are both in the ordered disposer below.
import { cancelLiveMachineTest } from './machines/connection-test';
// Phase 118: the ledger that owns every long running ssh child. Its three lines
// are in the ordered disposer below, beside the three feed stops.
import {
  beginRemoteExecutionShutdown,
  cancelRemoteExecutions,
  joinRemoteExecutions
} from './machines/execution-ledger';
import { registerMachinesIpc } from './machines/ipc';
// Phase 72: the saved output capture for sessions on another machine. Its
// cadence is armed here and stopped in the ordered disposer below.
import {
  startRemoteCaptures,
  stopRemoteCaptures
} from './machines/remote-capsule';
// Phase 73: the two connected-time cadences of M6. The first reads an agent's
// own store on a machine Tortie is connected to. The second copies the record
// it found home. Both are armed here and both are stopped in the ordered
// disposer below.
import {
  startRemoteHarvest,
  stopRemoteHarvest
} from './machines/remote-harvest';
import {
  startRemoteStoreSync,
  stopRemoteStoreSync
} from './machines/remote-store-sync';
import { stopMachinesWatch } from './machines/store';
import { installAppMenu, installDiagnosticsDoor } from './menu';
import { registerNoticeIpc } from './notice/ipc';
import {
  registerPreviewIpc,
  registerPreviewProtocol,
  rewriteExternalAnchors
} from './preview';
import { reapGuardedChildren } from './proc/guarded';
import {
  disposeProjectCloneIpc,
  registerProjectCloneIpc,
  registerProjectCreateIpc
} from './projects';
import { disposeQuickOpenIpc, registerQuickOpenIpc } from './quickopen';
import { registerRecentsIpc } from './recents';
import { registerRestartIpc } from './restart';
import { registerRestoreIpc } from './restore';
import { disposeSearchIpc, registerSearchIpc } from './search';
import { getGmuxCore, shutdownGmuxCore } from './sessions';
import { registerSettingsIpc } from './settings';
import { registerShellIpc } from './shell';
import { disposeSymbolsIpc, registerSymbolsIpc } from './symbols';
import { disposeTray } from './tray';
import { handle } from './typed-ipc';
import { registerUpdatesIpc } from './updates/ipc';
// Phase 36: the quit-time watcher-close drain. See watcher/teardown.ts for
// why a fire-and-forget unsubscribe near quit is a SIGABRT and not a quit.
import {
  drainWatcherCloses,
  pendingWatcherCloseCount
} from './watcher/teardown';

export interface MainCapabilityDeps {
  /** The IPC main the registrars bind their handlers to. */
  ipcMain: IpcMain;
}

/**
 * What the disposer decided: 'proceed' means the teardown settled and the
 * caller may let the quit continue; 'killed' means a wedged watcher close
 * forced SIGKILL to self and nothing after the call will run.
 */
export type MainDisposeOutcome = 'proceed' | 'killed';

/**
 * Install every app-ready capability, in the pre-move order, and hand back
 * the one ordered disposer. Handlers are lazy (each awaits getGmuxCore()),
 * so installing them in every mode is free and keeps harness renderers from
 * hitting "No handler registered" noise.
 */
export function installMainCapabilities(
  deps: MainCapabilityDeps
): () => Promise<MainDisposeOutcome> {
  const { ipcMain } = deps;

  // Native menu bar (About / Edit roles for terminal copy-paste / every
  // DESIGN.md §4 shortcut mirrored; ⌘W = close editor tab, never the
  // window). Installed in every mode — harness windows are unaffected.
  installAppMenu();
  // Phase 163. The Settings window's one door to the diagnostics report tab,
  // answered by a forward of the Help menu's own action (src/main/menu.ts).
  installDiagnosticsDoor(ipcMain);

  // `gmux-asset:` handler — images referenced by rendered markdown (item 6).
  registerAssetProtocol();
  // `gmux-preview:` handler (Phase 20.5) — the bytes behind the HTML preview
  // frame. It is read-only, it serves paths below ONE project root, and every
  // response it builds carries `default-src 'none'`.
  //
  // The anchor rewrite is passed in rather than imported by the handler, and
  // the field is required, so a document cannot be served with its external
  // links left pointing at addresses the application policy refuses. Refusing
  // them is what turns the frame blank, which is why the rewrite exists.
  registerPreviewProtocol({ rewriteHtml: rewriteExternalAnchors });

  registerIpcHandlers();
  // Phase 4: git sidebar (git:* + repo watchers) and file tree (fs:readDir/
  // fs:reveal). Both are self-contained registries, lazy per repo.
  registerGitIpc(ipcMain);
  registerFsIpc(ipcMain);
  // Phase 12.10 item 1: the IMAGE path (fs:readImage). Registered apart from
  // registerFsIpc on purpose — that registrar owns the text surface, and the
  // point of the image channel is that images never share a door with text.
  registerImageIpc(ipcMain);
  // Phase 20.5: preview:url — the one question the renderer may ask about a
  // preview. Nothing inside a previewed page can reach it, because that frame
  // has no preload and no parent access. See src/main/preview/ipc.ts.
  registerPreviewIpc(ipcMain);
  // Phase 22: the ONE `context:*` registrar (research 29 §12). Six channels —
  // the configuration scan, the launch snapshot, the pin re-check, and the
  // three that drive the bundled skills CLI. Only `context:skillsRun` spawns
  // anything, and only after a person has confirmed the command line it is
  // about to run. It takes a getter because the manifest is opened during boot
  // and the registrars are installed before that finishes.
  registerContextIpc(ipcMain, async () => {
    const core = await getGmuxCore();
    return core.manifest;
  });
  // Phase 137: the ONE `overview:*` registrar. Two channels, and both read.
  // They list the project's manifest rows read only, open the agent logs
  // through the keep map, keep a redacted copy in Tortie's own overview
  // store, and answer from that store. Neither channel spawns a process,
  // writes the manifest or sets a session's status. It takes the same
  // manifest getter the context registrar takes, for the same boot reason.
  // The overview store opens on the first call and the ordered disposer
  // below closes it.
  // Phase 138 adds the third channel, being what Settings offers for the
  // fold. The suspension sentence comes from the session core's own fold
  // scheduler, so the registrar reads it rather than owning it.
  registerOverviewIpc(
    ipcMain,
    async () => {
      const core = await getGmuxCore();
      return core.manifest;
    },
    () => foldSuspension(),
    // Phase 138. The project channel draws a model's sentence only while this
    // says a person picked an agent. Picking None brings the built line back.
    () => foldChosenNow()
  );
  // Phase 63: the ONE `arch:*` registrar. Three channels, and none of them
  // writes a file, starts an agent or sets a session's status. Two read, and
  // the third drafts bytes for unsaved editor buffers. Registering it opens no
  // database, arms no watcher and spawns no git: the store opens on the first
  // call and the re-checks ride the repo-changed fan out that already exists,
  // so a person who never opens the arch view pays three handle calls.
  registerArchIpc(ipcMain);
  // Phase 181: the ONE `usage:*` registrar. Two channels, and both read. They
  // are the only outbound requests Tortie makes, they go to the two vendor
  // hosts compiled into src/main/usage/endpoints.ts and to nowhere else, and
  // they run only for a provider a person has switched on in Settings, which
  // both default to off. Registering opens nothing: the service is built on
  // the first call, and while the switches are off that call opens no
  // keychain, reads no credentials file and makes no request.
  registerUsageIpc(ipcMain);
  // Phase 202: the ONE `logins:*` registrar. Four channels, and none of them
  // signs anybody in. The list reads one JSON file, the add creates one empty
  // directory, the choose writes one name and the remove deletes one directory
  // Tortie made. Nothing here opens a keychain, spawns a process, reaches a
  // network, touches tmux or writes the manifest. Refusal 8 holds through the
  // add: creating a directory starts nothing, and the sign in that fills it is
  // one ordinary session the person starts through the create path every other
  // session uses.
  registerLoginsIpc(ipcMain);
  // Phase 22: turn the launch snapshot on. Without this call every session gets
  // a NULL snapshot and the readout shows its unrecorded sentence, which is
  // correct behaviour and not a stub, so the feature simply does nothing. The
  // resolver cannot fail a launch: `recordLaunchContext` is detached, deadlined
  // and wrapped, and a throw inside it becomes a missing record.
  installLaunchContextResolver();
  // Phase 23: the ONE `config:*` registrar. Three channels, and none of them
  // spawns: the list reads, the confirm writes one record, and the withdrawal
  // deletes one. A configured agent starts through the ordinary session create
  // path, which asks the gate first. Until the overlay loader is wired in, the
  // default source reports no rows, which is what a machine with no
  // configuration file has.
  registerConfigIpc(ipcMain);
  // Phase 68: the ONE `machines:*` registrar. Ten channels, and what is not
  // here is the point. There is no channel that opens a session on a machine,
  // no channel that connects on a file change, and no channel that sets a
  // session's status. Two of the ten start a process, being the tailnet picker
  // and the one visible connection test, and both are a button a person
  // presses in Settings. The other eight read memory, write one row, or write
  // one record.
  registerMachinesIpc(ipcMain);
  // Phase 72: start keeping a copy of what sessions on other machines print.
  // It arms one timer and one subscription, and it reads nothing until a
  // machine has a live connection and rows on it, so a person with no machines
  // pays one timer that never fires a command. It is stopped in the disposer.
  startRemoteCaptures();
  // Phase 73: start reading conversation ids off machines Tortie is connected
  // to. It arms one timer and one subscription, and it reads nothing until a
  // machine has a live connection and rows on it whose conversation id is still
  // empty, so a person with no machines pays one timer that never sends a
  // command. Once a machine's rows are armed a pass costs nothing at all,
  // because a row that has an id is never asked about again.
  startRemoteHarvest();
  // Phase 73: start copying those conversations home while connected. It reads
  // the copies already on disk once, here, so a relaunch does not report that
  // Tortie has no copy of a conversation that is sitting in userData.
  startRemoteStoreSync();
  // Phase 12.9 item 1: projects:create — the only project channel that
  // writes to disk (mkdir + optional `git init`, then the usual add).
  registerProjectCreateIpc(ipcMain);
  // Phase 18.6 item 5: cloning (projects:clonePreflight/clone/cancelClone).
  // The second project channel that writes to disk, and the only one that
  // writes for as long as a download takes.
  registerProjectCloneIpc(ipcMain);
  // Phase 18.6 item 2: recent projects (recents:list/missing/remove), read
  // from <userData>/recents.json. Written by the two projects handlers in
  // ./ipc.ts, one on open and one on close.
  registerRecentsIpc(ipcMain);
  // Phase 6: restore extension channels (sessions:restore, sessions:discard,
  // app:get/setLoginItem).
  registerRestoreIpc(ipcMain);
  // Phase 19 item 8: sessions:restart. The replacement is created before the
  // original is removed, which is why it is one main-side call and not the
  // renderer's old discard-then-create pair.
  registerRestartIpc(ipcMain);
  // Phase 19 item 9: notice:pending. The degraded-state notices themselves ride
  // the existing scrollback:notice event; this hands over the ones posted
  // before a window existed to hear them, which is when the manifest is opened.
  registerNoticeIpc(ipcMain);
  // Phase 8: agent CLI availability probe (agents:availability).
  registerAgentsIpc(ipcMain);
  // Phase 10 (S13): settings store + Settings window + flag-preset catalogs
  // (settings:get/set, settings:openWindow, agents:flagPresets).
  registerSettingsIpc(ipcMain);
  // Phase 24: updates:state, the one updates channel, read by the Settings
  // row. Registering in every mode is the existing convention here and it
  // costs one closure.
  registerUpdatesIpc(ipcMain);
  // Phase 51: the four shell:* channels — the Settings shim row and the
  // pending-open pull. None takes an argument, none spawns anything, and
  // there is nothing to dispose: no watcher, no timer, no child process.
  registerShellIpc(ipcMain);
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
  // Phase 46: the SCM view's Runs section (actions:runs/jobs/observe/release).
  // Every channel is a read, and each one spawns the gh CLI with an argv the
  // allowlist in src/main/actions/argv.ts has already checked. Nothing here
  // runs until the user expands the section for a repository, so registering
  // it costs four closures.
  registerActionsIpc(ipcMain);
  // Phase 35: the five log channels. log:append is the renderer error
  // capture path (window.onerror, unhandledrejection, the error boundary),
  // bounded main-side so an error loop cannot eat the log budget. The other
  // four back Settings → Diagnostics. None of them spawns anything and none
  // of them can send a byte anywhere: Copy diagnostics returns text to the
  // clipboard and Open logs folder reveals a directory.
  registerLogIpc(ipcMain);
  // Phase 163: the on demand diagnostics report. Two channels open and close
  // one capture window and a third writes a heap snapshot to a path a person
  // chose in a dialog. Nothing here runs on a timer, and a capture reads ps,
  // footprint and du once each through the guarded runner.
  registerDiagnosticsIpc(ipcMain);
  // Phase 8.2: renderer-confirmed quit (first-quit toast flow — the Quit
  // menu item forwards to the renderer, which invokes this after showing
  // the one-time §4 toast; see src/main/menu.ts for the fallback timer).
  handle(ipcMain, 'app:quit', () => {
    app.quit();
  });

  return disposeMainCapabilities;
}

/**
 * A promise that resolves after `ms`, with a way to clear its timer.
 *
 * `Promise.race` settles on its first arm and leaves the other one running, so
 * the plain `setTimeout` shape below left one armed timer per race for the rest
 * of the process. Nothing measurable was lost, because Electron does not wait
 * for the event loop to drain at quit. It is cleared because a timer nobody
 * will ever read is one more thing the next reader has to work out.
 *
 * Phase 73.1, rows 20 and 37. The rows name the 2,000 ms race. The 3,000 ms one
 * above it has the same shape and this one helper covers both.
 */
function afterMs(ms: number): { wait: Promise<void>; cancel: () => void } {
  let timer: NodeJS.Timeout | undefined;
  const wait = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, ms);
  });
  return {
    wait,
    cancel: () => {
      if (timer !== undefined) clearTimeout(timer);
    }
  };
}

/**
 * Quit-time teardown, in Phase 36's order. It kills ONLY gmux-side clients
 * (attach PTYs, control client, repo watchers). The tmux server and every
 * session keep running — T1 by design.
 *
 * Exported by name as well as returned from installMainCapabilities: the
 * composition root's before-quit handler is registered at module scope, and
 * a quit that arrives before whenReady finished installing must still run
 * the same ordered teardown, exactly as the pre-move handler did.
 */
export async function disposeMainCapabilities(): Promise<MainDisposeOutcome> {
  // Phase 18.6: a clone in flight is cancelled the same way pressing
  // Cancel cancels it, with SIGTERM and never SIGKILL, because a hard kill
  // leaves a repository mid write. Awaited first and bounded inside, so
  // git gets its moment to remove its own destination and quit still
  // cannot wedge on a network.
  try {
    await disposeProjectCloneIpc();
  } catch {
    /* never block quit */
  }
  try {
    await shutdownGmuxCore(); // snapshots first, then dispose
  } catch {
    /* never block quit */
  }
  // Phase 36: every watcher close the quit path issues is AWAITED before
  // app.quit(). These two lines used to be `void disposeGitIpc()` and
  // `void stopAgentOverlayWatch()`, and that void was the crash: an
  // unsubscribe completion still queued at FreeEnvironment is answered by
  // napi_fatal_error, and all 5 real quits on 2026-08-14 died that way.
  // The drain must run AFTER shutdownGmuxCore above, because core.dispose()
  // is what issues the harvest-watch unsubscribes, and it picks up the
  // repo-watcher and agents.json closes started on this line. The manifest
  // quit generation already finished inside shutdownGmuxCore, so nothing
  // here can delay or cut it short. The outer 3 s race is a wedge guard
  // only; a measured unsubscribe completes in single-digit milliseconds
  // when the uv threadpool has a free thread.
  // Phase 68: a connection test still running at quit is killed first, and only
  // the pid this app started is killed. It is done before the watcher drain
  // because it is synchronous and because a pty nobody is watching is a process
  // nobody can answer.
  cancelLiveMachineTest();
  // Phase 72: stop reading screens on other machines. Synchronous, and before
  // the drain for the same reason the line above it is: it cancels work that
  // would otherwise still be waiting on a machine nobody is listening to. A
  // pass already in flight stops between reads and writes nothing more.
  stopRemoteCaptures();
  // Phase 73: stop reading stores and stop copying conversations. Synchronous,
  // and here for the same reason the line above it is: it cancels work that
  // would otherwise still be waiting on a machine nobody is listening to. A
  // pass already in flight stops between reads and writes nothing more.
  stopRemoteHarvest();
  stopRemoteStoreSync();
  // PHASE 118. The three lines that own the long running ssh children, and
  // their POSITION is deliberate.
  //
  // They are AFTER `await shutdownGmuxCore()` above, so the quit time snapshot
  // pass, which is the last thing that may legitimately read a machine, is not
  // refused. They are at the same point as the three feed stops above, which is
  // where the audit's own target order puts "cancel and bounded-await remote
  // child processes", after "stop timers and feeds".
  //
  // No await moves, none is added ahead of an existing one, and no existing line
  // changes. The common quit pays nothing here: `cancelRemoteExecutions` returns
  // 0 and `joinRemoteExecutions` returns at once, because the set is empty.
  beginRemoteExecutionShutdown();
  const cutOffChildren = cancelRemoteExecutions();
  const remoteJoin = await joinRemoteExecutions();
  if (cutOffChildren > 0) {
    getLog('quit').info(
      `ended ${cutOffChildren} remote child process(es); ` +
        `${remoteJoin.joined} settled and ${remoteJoin.unjoined} did not, ` +
        `after ${remoteJoin.waitedMs} ms`,
      {
        cancelled: cutOffChildren,
        joined: remoteJoin.joined,
        unjoined: remoteJoin.unjoined,
        waitedMs: remoteJoin.waitedMs
      }
    );
  }
  // Phase 73.1, rows 20 and 37. The wedge guard's timer is cleared once the
  // race has settled. The cancel runs after the catch, so it runs whichever arm
  // won and whether or not the other one rejected. Nothing about the ORDER of
  // this path moves: no await is added, none is removed, and neither arm waits
  // for anything different.
  const wedgeGuard = afterMs(3_000);
  await Promise.race([
    Promise.allSettled([
      disposeGitIpc(),
      // Phase 137: close the overview store, so its write ahead log settles
      // before the process ends. The call never throws, and it costs nothing
      // when the page was never opened, because the store opens on the first
      // read.
      disposeOverviewIpc(),
      // Phase 63: drop every arch watch, end the shared tree-sitter workers and
      // close the arch database, so its write ahead log settles before the
      // process ends. The call never throws, and it costs nothing when the view
      // was never opened, because the store opens on the first read.
      disposeArchIpc(),
      // Phase 181, rewritten by PHASE 200. Close the usage domain as one
      // joined operation: refuse every read and tap from its first line,
      // cancel the https request and the keychain child a held read is waiting
      // on, and await what was cancelled, bounded at one second. The sentence
      // that used to be here, being "there is no file, no socket and no timer
      // behind it", was not true after Phase 181 shipped the endpoint and
      // Phase 182 shipped the tap. It never throws, and a quit with nothing in
      // flight resolves it in the same tick.
      //
      // It is AFTER `await shutdownGmuxCore()` above, which is what joins the
      // hook server's own shutdown, so no accepted status line post is still
      // running when the service it would call is closed.
      disposeUsageService(),
      // PHASE 200. Live Diagnostics joins the ordered disposer. Its timer, its
      // destroyed window watcher and its streaming `top` child used to be
      // ended only by the renderer's own `diagnostics:liveStop`, by the
      // subscribing window being destroyed, or by a replacement start. On a
      // quit with a VISIBLE live tab, none of those three is guaranteed to
      // happen before main tears down, so main ends it itself. The call is
      // idempotent and costs nothing when no tab was ever live, which is why
      // it can sit unconditionally beside the others.
      Promise.resolve().then(() => {
        stopLiveSampling();
      }),
      stopAgentOverlayWatch(),
      // Phase 68: the machines.json watcher, closed through the same tracked
      // path the agents.json one uses, for the same Phase 36 reason.
      stopMachinesWatch()
    ]).then(() => drainWatcherCloses(2_000)),
    wedgeGuard.wait
  ]).catch(() => undefined);
  wedgeGuard.cancel();
  disposeSearchIpc(); // SIGKILL any in-flight ripgrep
  disposeActionsIpc(); // stop every Runs watch timer; the watch is not durable
  // Phase 77. These two were `void`, and that is the shape Phase 36 measured
  // as fatal three lines above. A napi completion still queued when
  // node::FreeEnvironment runs is answered with napi_fatal_error, and all 5
  // real quits on 2026-08-14 died that way. Both of these terminate a live
  // worker_threads Worker, the ⌘P ranking worker and the tree-sitter pool,
  // which is the same class of pending completion. The bound is a wedge guard
  // only. Measured on this build with neither surface ever opened, the pair
  // resolves in 0.036 ms, 0.044 ms and 0.037 ms across three quit harness
  // runs, because the coordinator and the service are still null.
  // Phase 73.1, rows 20 and 37. This is the timer the rows name. It lost the
  // race on every measured quit, because the pair resolves in under 0.05 ms,
  // and it stayed armed until the process exited.
  const workerGuard = afterMs(2_000);
  await Promise.race([
    Promise.allSettled([disposeQuickOpenIpc(), disposeSymbolsIpc()]),
    workerGuard.wait
  ]).catch(() => undefined);
  workerGuard.cancel();
  // Phase 13.8: any question-asking child still in flight (login-shell PATH
  // probe, an agent `--version`, cursor's create-chat) dies WITH the app.
  // This is the hole the 19-hour `zsh -lic` orphans came through: their
  // deadline was pending and the timer died with the process that set it.
  const reaped = reapGuardedChildren();
  if (reaped > 0) {
    getLog('quit').info(`reaped ${reaped} in-flight probe(s)`, { reaped });
  }
  disposeTray();
  // Phase 36 fix round: the drain can expire. The pool can still be backed
  // up here, because shutdownGmuxCore bounds its snapshot work at 8 s and
  // abandons whatever is still queued, and external CPU load stretches
  // every queued job. An unsubscribe completion still pending past this
  // point makes ANY environment teardown a guaranteed abort:
  // node::FreeEnvironment runs RunCleanup, napi refuses the late call, and
  // @parcel/watcher answers with napi_fatal_error. Worse, the NEXT launch
  // then wedges on the macOS reopen-windows prompt. Every graceful exit
  // was measured on 2026-08-14, dev Electron 43.3.0 under a 65 load
  // average, with a pending unsubscribe queued behind a saturated pool:
  //   app.quit()      aborts (SIGABRT, the production stack)
  //   app.exit(0)     ALSO aborts. The stack still shows FreeEnvironment
  //                   -> RunCleanup, so it is not the escape it looks like
  //   process.exit(0) wedges the process for minutes
  // The only exits that cannot abort are (a) waiting until the close has
  // actually settled, then quitting cleanly, and (b) SIGKILL to self,
  // which skips all teardown. So the degraded path does (a) with a second,
  // much longer drain, and (b) only if even that expires, which needs a
  // wedged FSEvents, not just a busy pool. The window is hidden first so
  // the late quit is invisible; nothing durable is pending by this line
  // (the manifest quit generation finished inside shutdownGmuxCore).
  // Each step writes one line so Phase 35 can classify the quit.
  // writeSync, because stdout to a pipe is asynchronous and a hard exit
  // right after console.log can drop the line.
  //
  // PHASE 35 classified these lines, and it did NOT move them. The writeSync
  // calls are load bearing exactly as Phase 36 left them, and the drain
  // bounds either side of them are untouched. What Phase 35 added is a
  // MIRROR into app.log for the two lines whose write cannot race the hard
  // exit, so a packaged quit leaves a durable record of a late teardown. The
  // line immediately before SIGKILL is deliberately NOT mirrored: the file
  // transport buffers, the signal does not wait, and a record that may or
  // may not be on disk is worse than none.
  const logQuit = (line: string): void => {
    try {
      writeSync(1, `${line}\n`);
    } catch {
      /* stdout may already be closed in a packaged run */
    }
  };
  /** The file mirror. `console: false` because logQuit already said it. */
  const recordQuit = (
    event: string,
    msg: string,
    fields: Record<string, unknown>
  ): void => {
    logEvent('quit', 'warn', event, msg, fields, { console: false });
  };
  let leftover = pendingWatcherCloseCount();
  if (leftover > 0) {
    logQuit(
      `[gmux] quit: ${leftover} watcher close(s) still pending after the drain; waiting up to 15 s more so quit is not a crash`
    );
    recordQuit(
      'quit.late_drain',
      'watcher closes are still pending after the drain. Waiting up to 15 s more, so this quit is not a crash.',
      { pending: leftover, waitMs: 15_000 }
    );
    try {
      for (const w of BrowserWindow.getAllWindows()) w.hide();
    } catch {
      /* hiding is cosmetic; never let it block the quit */
    }
    const lateStart = Date.now();
    leftover = await drainWatcherCloses(15_000);
    if (leftover > 0) {
      logQuit(
        `[gmux] quit: ${leftover} watcher close(s) still pending after 15 s more; ending the process hard because environment teardown would abort`
      );
      // PHASE 35, and this is the whole interlock. This line is a LATE QUIT,
      // never a crash, and the next boot must not tell the operator their app
      // crashed because of it. Nothing durable is pending here (Phase 36
      // proved it: the manifest quit generation finished inside
      // shutdownGmuxCore), so removing the sentinel is truthful. It is one
      // synchronous unlink immediately before the signal, and it cannot
      // reorder, unbound or silence anything above it.
      clearLogRunSentinel();
      process.kill(process.pid, 'SIGKILL');
      return 'killed';
    }
    const lateMs = Date.now() - lateStart;
    logQuit(
      `[gmux] quit: the late watcher close(s) settled after ${lateMs} ms; quitting cleanly`
    );
    recordQuit(
      'quit.late_settled',
      'the late watcher closes settled. Quitting cleanly.',
      { settledMs: lateMs }
    );
  }
  return 'proceed';
}

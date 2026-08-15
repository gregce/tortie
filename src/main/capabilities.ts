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
import { registerAgentsIpc } from './agents';
import { registerAssetProtocol } from './assets';
import { registerCaptureIpc } from './capture';
import { registerConfigIpc } from './config/ipc';
// Phase 23: the configuration file is read at boot, on an explicit reload and
// on a watcher debounce, and nowhere else. `stopAgentOverlayWatch` is the
// teardown that matches the boot read.
import { stopAgentOverlayWatch } from './config/store';
import { registerContextIpc } from './context/ipc';
import { installLaunchContextResolver } from './context/launch-resolver';
import { registerDropIpc, startDropStorePruning } from './drop';
import { registerFsIpc, registerImageIpc } from './fs';
import { disposeGitIpc, registerGitIpc } from './git';
import { registerIpcHandlers } from './ipc';
import { installAppMenu } from './menu';
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

  return disposeMainCapabilities;
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
  await Promise.race([
    Promise.allSettled([disposeGitIpc(), stopAgentOverlayWatch()]).then(() =>
      drainWatcherCloses(2_000)
    ),
    new Promise((r) => setTimeout(r, 3_000))
  ]).catch(() => undefined);
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
  const logQuit = (line: string): void => {
    try {
      writeSync(1, `${line}\n`);
    } catch {
      /* stdout may already be closed in a packaged run */
    }
  };
  let leftover = pendingWatcherCloseCount();
  if (leftover > 0) {
    logQuit(
      `[gmux] quit: ${leftover} watcher close(s) still pending after the drain; waiting up to 15 s more so quit is not a crash`
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
      process.kill(process.pid, 'SIGKILL');
      return 'killed';
    }
    logQuit(
      `[gmux] quit: the late watcher close(s) settled after ${Date.now() - lateStart} ms; quitting cleanly`
    );
  }
  return 'proceed';
}

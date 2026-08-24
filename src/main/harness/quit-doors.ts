/**
 * GMUX_SMOKE=quit-doors, Phase 144 stage 1. Every IPC door closes the moment
 * quit starts, proven against REAL handlers through the REAL window.
 *
 * ## The defect this gate exists to keep closed
 *
 * Quit intent used to live in a boolean local to src/main/index.ts, so the
 * one typed invoke wrapper could not read it. The ordered disposer awaits
 * shutdownGmuxCore() before it begins the remote execution shutdown, and the
 * renderer stays alive through that wait, so a renderer request could still
 * reach a filesystem, git or machine mutation handler in the middle of a
 * quit. Stage 1 moved the state into src/main/lifecycle.ts, flipped
 * synchronously in the first before-quit pass, and the wrapper refuses every
 * new renderer invoke after it.
 *
 * ## What one run proves, in one real Electron process
 *
 *  1. A real window through the real preload can drive a real filesystem
 *     write handler BEFORE quit, and the bytes land. Same channel, same
 *     method, so the refusals below are measured with an instrument that has
 *     been seen passing traffic.
 *  2. A session create invoked through the real IPC door before quit is
 *     ADMITTED, and it is JOINED: it resolves with its session while the
 *     held shutdown is still inside the snapshot pass.
 *  3. The REAL quit is started through the real composition root, app.quit(),
 *     and the real shutdown is held open inside shutdownGmuxCore's snapshot
 *     pass. That hold sits BEFORE beginRemoteExecutionShutdown() in the
 *     disposer, which is exactly the window the old code left open.
 *  4. Held in that window, four real handlers are invoked from the real
 *     renderer: fs:writeFile, git:init, machines:add and
 *     machines:cloneProject. Every one rejects with the typed SHUTTING_DOWN
 *     payload.
 *  5. None of them did anything: the refused write's file does not exist, the
 *     refused git:init made no repository, machines.json is byte for byte
 *     what it was, the manifest row count and the tmux session count are
 *     unchanged, and the remote execution ledger owns zero children.
 *
 * ## How the hold works
 *
 * `snapshotAllSessions` is wrapped on the instance with a promise this probe
 * releases, exactly the Phase 116 shape in ./shutdown-refusal.ts. Everything
 * else in the process is real: the composition root's before-quit handler,
 * the ordered disposer, the registrars, the preload, the window.
 *
 * ## Safety
 *
 * `assertHarnessIsolation` runs before anything else, every path this probe
 * writes is inside the harness scratch root, and the one session it creates
 * lives on the scratch tmux server that build/harness-socket.mjs ends. The
 * probe finishes by letting the REAL quit complete, so the exit code of the
 * process is the quit path's own verdict, as GMUX_SMOKE=quit is.
 *
 * `npm run smoke:quitdoors` is the only supported way to run it.
 */

import { app, type BrowserWindow } from 'electron';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { appLifecycleState } from '../lifecycle';
import { liveRemoteExecutions } from '../machines/execution-ledger';
import { machinesPath } from '../machines/store';
import { getGmuxCore } from '../sessions';
import * as tmux from '../tmux';
import { assertHarnessIsolation } from './isolation';
import { armWatchdog, smokeFail, smokeLog } from './support';

const ADMITTED_SESSION = 'p144-admitted';

export interface QuitDoorsDeps {
  /** The real app window factory, owned by the composition root. */
  createWindow(): BrowserWindow;
}

/** Sessions on the harness server, counted through the same tmux module. */
async function tmuxSessionCount(): Promise<number> {
  return (await tmux.listSessions()).length;
}

/** machines.json as bytes, or a marker when the file does not exist yet. */
function machinesBytes(): string {
  const path = machinesPath();
  return existsSync(path) ? readFileSync(path, 'utf8') : '<absent>';
}

/**
 * Run one renderer expression that awaits a real invoke and reports how it
 * settled: 'resolved' or the rejection's message text.
 */
async function settle(
  win: BrowserWindow,
  expression: string
): Promise<string> {
  return (await win.webContents.executeJavaScript(
    `(async () => {
       try {
         await (${expression});
         return 'resolved';
       } catch (err) {
         return String((err && err.message) || err);
       }
     })()`,
    true
  )) as string;
}

/** Assert one refused invoke carried the typed SHUTTING_DOWN payload. */
function expectRefused(what: string, outcome: string): void {
  if (outcome === 'resolved') {
    throw new Error(
      `${what} was NOT refused after quit started: the handler ran`
    );
  }
  if (!outcome.includes('SHUTTING_DOWN')) {
    throw new Error(
      `${what} rejected, and not with SHUTTING_DOWN: ${outcome}`
    );
  }
}

export async function runQuitDoorsSmoke(deps: QuitDoorsDeps): Promise<void> {
  armWatchdog(60_000);
  try {
    const iso = assertHarnessIsolation('GMUX_HARNESS_DIR');
    smokeLog(`1/9 isolated: socket ${iso.socket}, profile inside ${iso.root}`);

    // --- Boot the real core and open the real window --------------------
    const core = await getGmuxCore();
    const win = deps.createWindow();
    await new Promise<void>((resolve) => {
      if (!win.webContents.isLoading()) resolve();
      else win.webContents.once('did-finish-load', () => resolve());
    });
    const bridged = (await win.webContents.executeJavaScript(
      `typeof window.gmux === 'object' && window.gmux !== null`,
      true
    )) as boolean;
    if (!bridged) {
      throw new Error('the real preload did not expose window.gmux');
    }
    smokeLog('2/9 core booted and a real window is up through the real preload');

    // --- The instrument works: a real write BEFORE quit lands ------------
    const allowedFile = join(iso.root, 'p144-allowed.txt');
    const refusedFile = join(iso.root, 'p144-refused.txt');
    const refusedRepo = join(iso.root, 'p144-refused-repo');
    mkdirSync(refusedRepo, { recursive: true });
    const before = await settle(
      win,
      `window.gmux.fs.writeFile(${JSON.stringify(allowedFile)}, 'before quit')`
    );
    if (before !== 'resolved' || !existsSync(allowedFile)) {
      throw new Error(`the pre-quit fs:writeFile did not land: ${before}`);
    }
    smokeLog('3/9 fs:writeFile through the real door lands while running');

    // --- Hold the real shutdown open inside the snapshot pass ------------
    let releaseHold!: () => void;
    const hold = new Promise<void>((resolve) => {
      releaseHold = resolve;
    });
    let signalEntered!: () => void;
    const entered = new Promise<void>((resolve) => {
      signalEntered = resolve;
    });
    const realSnapshot = core.snapshotAllSessions.bind(core);
    core.snapshotAllSessions = async (reason) => {
      signalEntered();
      await hold;
      return realSnapshot(reason);
    };
    smokeLog('4/9 snapshot pass wrapped with a held promise');

    // --- Admit real work through the real door, then quit for real -------
    const home = homedir();
    await win.webContents.executeJavaScript(
      `(() => {
         window.__p144Admitted = { done: false, ok: false, err: null };
         window.gmux.sessions.create({
           name: ${JSON.stringify(ADMITTED_SESSION)},
           projectPath: ${JSON.stringify(home)},
           cwd: ${JSON.stringify(home)},
           agent: 'shell',
           extraArgs: ['-c', 'while true; do date; sleep 1; done']
         }).then(
           (s) => { window.__p144Admitted.done = true; window.__p144Admitted.ok = true; window.__p144Admitted.id = s.id; },
           (e) => { window.__p144Admitted.done = true; window.__p144Admitted.err = String((e && e.message) || e); }
         );
         return true;
       })()`,
      true
    );
    // Quit only once the create is past admission: its manifest row exists.
    const rowDeadline = Date.now() + 10_000;
    while (
      !core.listSessionRecords().some((rec) => rec.name === ADMITTED_SESSION)
    ) {
      if (Date.now() > rowDeadline) {
        throw new Error('the admitted create never reached the manifest');
      }
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    const sawBeforeQuit = new Promise<void>((resolve) => {
      app.once('before-quit', () => resolve());
    });
    app.quit();
    await sawBeforeQuit;
    if (appLifecycleState() !== 'quitting') {
      throw new Error(
        'before-quit ran and the lifecycle does not read quitting: the ' +
          'state change is not synchronous'
      );
    }
    smokeLog(
      '5/9 real quit started through the composition root; lifecycle reads ' +
        'quitting inside the first before-quit pass'
    );

    // --- Held inside shutdownGmuxCore, BEFORE the remote ledger closes ----
    await entered;
    const admitted = (await win.webContents.executeJavaScript(
      'JSON.parse(JSON.stringify(window.__p144Admitted))',
      true
    )) as { done: boolean; ok: boolean; err: string | null; id?: string };
    if (!admitted.done || !admitted.ok) {
      throw new Error(
        `the create admitted before quit was not joined: ` +
          `done=${String(admitted.done)} ok=${String(admitted.ok)} ` +
          `err=${admitted.err ?? 'none'}`
      );
    }
    smokeLog(
      `6/9 the admitted create resolved (${admitted.id ?? '?'}) before the ` +
        'held snapshot pass: work admitted before quit is still joined'
    );

    // --- Four real handlers, four typed refusals --------------------------
    const rowsHeld = core.listSessionRecords().length;
    const tmuxHeld = await tmuxSessionCount();
    const machinesHeld = machinesBytes();
    expectRefused(
      'fs:writeFile',
      await settle(
        win,
        `window.gmux.fs.writeFile(${JSON.stringify(refusedFile)}, 'after quit')`
      )
    );
    expectRefused(
      'git:init',
      await settle(win, `window.gmux.git.init(${JSON.stringify(refusedRepo)})`)
    );
    expectRefused(
      'machines:add',
      await settle(
        win,
        `window.gmux.machines.add({ id: 'p144', label: 'p144', color: 'blue',
           host: '127.0.0.1', user: null, port: null,
           remoteTmuxPath: '/usr/bin/false', hashRead: 'x', linesRead: [] })`
      )
    );
    expectRefused(
      'machines:cloneProject',
      await settle(
        win,
        `window.gmux.machines.cloneProject({ machineId: 'p144',
           projectPath: ${JSON.stringify(home)}, destination: '/tmp/p144' })`
      )
    );
    smokeLog(
      '7/9 refused while held: fs:writeFile, git:init, machines:add and ' +
        'machines:cloneProject all rejected with SHUTTING_DOWN, in the ' +
        'window between the core shutdown and the remote ledger close'
    );

    // --- The refused calls did nothing ------------------------------------
    if (existsSync(refusedFile)) {
      throw new Error('the refused fs:writeFile wrote its file anyway');
    }
    if (existsSync(join(refusedRepo, '.git'))) {
      throw new Error('the refused git:init made a repository anyway');
    }
    if (machinesBytes() !== machinesHeld) {
      throw new Error('the refused machines:add changed machines.json');
    }
    const rowsAfter = core.listSessionRecords().length;
    if (rowsAfter !== rowsHeld) {
      throw new Error(
        `manifest rows moved under refusal: ${String(rowsHeld)} -> ${String(rowsAfter)}`
      );
    }
    const tmuxAfter = await tmuxSessionCount();
    if (tmuxAfter !== tmuxHeld) {
      throw new Error(
        `tmux sessions moved under refusal: ${String(tmuxHeld)} -> ${String(tmuxAfter)}`
      );
    }
    const owned = liveRemoteExecutions().length;
    if (owned !== 0) {
      throw new Error(
        `the remote execution ledger owns ${String(owned)} child(ren); ` +
          'a refused clone must own none'
      );
    }
    smokeLog(
      `8/9 nothing happened: no file, no repository, machines.json ` +
        `unchanged, ${String(rowsAfter)} manifest rows, ` +
        `${String(tmuxAfter)} tmux sessions, 0 remote children owned`
    );

    // --- Let the REAL quit finish; its exit code is the second verdict ----
    smokeLog('9/9 PASS (quit-doors); releasing the hold so the real quit ends');
    releaseHold();
  } catch (err) {
    smokeFail(err);
  }
}

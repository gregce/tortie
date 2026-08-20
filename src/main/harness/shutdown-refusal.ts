/**
 * GMUX_SMOKE=shutdown-refusal — Phase 116, the live proof that the core
 * fails closed once shutdown starts.
 *
 * WHAT IT PROVES, in one real Electron process on an isolated socket and an
 * isolated profile:
 *
 *  1. A create admitted before shutdown is JOINED: it resolves before the
 *     quit path enters the snapshot pass, so the final snapshot sees its row.
 *  2. While the real shutdown is held inside the snapshot pass, the exact
 *     expression every mutating IPC handler runs, being
 *     `(await getGmuxCore()).createSession(...)`, is refused at BOTH halves
 *     with the typed `SHUTTING_DOWN` payload.
 *  3. The refused calls did nothing: the manifest row count, the tmux session
 *     count and the set of pane pids on the harness server are unchanged.
 *  4. After the held shutdown completes, the lifecycle reads `empty` and a
 *     second boot in the same process is real: a fresh core reads both
 *     sessions back.
 *
 * HOW THE HOLD WORKS. `snapshotAllSessions` is wrapped on the instance with a
 * promise the probe releases. That is the one deterministic hold the proof
 * needs; everything else in the process stays real. The wrap must release
 * within the quit path's own 8,000 ms snapshot bound, and the checks it runs
 * while held take milliseconds.
 *
 * WHAT IS NOT PROVEN HERE. The ipcMain routing layer is not driven, and it is
 * unchanged by this phase. The remote exec refusal is not driven against a
 * live machine; it is proven at unit level by the guard sitting above the
 * remote branch, and the exec plane's own shutdown ownership is Phase 118.
 *
 * SAFETY. `assertHarnessIsolation` runs before anything else, the only
 * sessions ended are the ones this probe created, recorded by id, and the
 * supervisor (build/harness-socket.mjs) ends the scratch server afterwards.
 */

import { app } from 'electron';
import { homedir } from 'node:os';
import type { CreateSessionInput } from '@shared/types';
import { isGmuxError } from '../errors';
import {
  coreLifecycleState,
  getGmuxCore,
  shutdownGmuxCore
} from '../sessions';
import type { GmuxCore } from '../sessions';
import * as tmux from '../tmux';
import { assertHarnessIsolation } from './isolation';
import { armWatchdog, smokeFail, smokeLog } from './support';

const FIRST_SESSION = 'p116-first';
const ADMITTED_SESSION = 'p116-admitted';
const REFUSED_SESSION = 'p116-refused';

/** A durable shell session, the same shape the t1 smoke creates. */
function shellInput(name: string): CreateSessionInput {
  const home = homedir();
  return {
    name,
    projectPath: home,
    cwd: home,
    agent: 'shell',
    extraArgs: ['-c', 'while true; do date; sleep 1; done']
  };
}

/** Sessions on the harness server, counted through the same tmux module. */
async function tmuxSessionCount(): Promise<number> {
  return (await tmux.listSessions()).length;
}

/** Every pane pid on the harness server, sorted, for a byte comparison. */
async function panePids(): Promise<string> {
  const raw = await tmux
    .execTmux(['list-panes', '-a', '-F', '#{pane_pid}'])
    .catch(() => '');
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .sort()
    .join(',');
}

/** Await a promise that must reject with the typed shutdown refusal. */
async function expectShutdownRefusal(
  what: string,
  p: Promise<unknown>
): Promise<void> {
  let refused = false;
  try {
    await p;
  } catch (err) {
    refused = isGmuxError(err, 'SHUTTING_DOWN');
    if (!refused) {
      throw new Error(
        `${what} rejected, and not with SHUTTING_DOWN: ${(err as Error).message}`
      );
    }
  }
  if (!refused) {
    throw new Error(`${what} was not refused while shutdown was in progress`);
  }
}

export async function runShutdownRefusalSmoke(): Promise<void> {
  armWatchdog(60_000);
  try {
    const iso = assertHarnessIsolation('GMUX_HARNESS_DIR');
    smokeLog(
      `1/8 isolated: socket ${iso.socket}, profile inside ${iso.root}`
    );

    // Step 1: boot the real core and create one real durable session.
    const core = await getGmuxCore();
    if (coreLifecycleState() !== 'ready') {
      throw new Error(
        `lifecycle reads "${coreLifecycleState()}" after boot, expected "ready"`
      );
    }
    const first = await core.createSession(shellInput(FIRST_SESSION));
    smokeLog(
      `2/8 booted ready and created "${first.name}" (${first.id}); ` +
        `${String(core.listSessionRecords().length)} manifest rows, ` +
        `${String(await tmuxSessionCount())} tmux sessions`
    );

    // Step 2: hold the real shutdown inside the snapshot pass. Only this one
    // method is wrapped; the rest of the teardown is the real thing.
    const order: string[] = [];
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
      order.push('snapshot-entered');
      signalEntered();
      await hold;
      return realSnapshot(reason);
    };
    smokeLog('3/8 snapshot pass wrapped with a held promise');

    // Step 3: a second real create, admitted and NOT awaited, then the real
    // shutdown on the next tick. The join must land the create before the
    // snapshot pass begins.
    const admittedCreate = core
      .createSession(shellInput(ADMITTED_SESSION))
      .then((session) => {
        order.push('create-resolved');
        return session;
      });
    await new Promise((resolve) => setImmediate(resolve));
    const shutdown = shutdownGmuxCore();
    await entered;
    if (order.join(' -> ') !== 'create-resolved -> snapshot-entered') {
      throw new Error(
        `the admitted create was not joined before the snapshot: ${order.join(' -> ')}`
      );
    }
    const admitted = await admittedCreate;
    const rowsAfterAdmitted = core.listSessionRecords().length;
    const tmuxAfterAdmitted = await tmuxSessionCount();
    const pidsAfterAdmitted = await panePids();
    smokeLog(
      `4/8 admitted create "${admitted.name}" resolved BEFORE the snapshot ` +
        `pass (order: ${order.join(' -> ')})`
    );

    // Step 4: held inside the snapshot pass, both halves of the handler
    // expression are refused, and the state says why.
    await expectShutdownRefusal('getGmuxCore()', getGmuxCore());
    await expectShutdownRefusal(
      'core.createSession() on the held reference',
      core.createSession(shellInput(REFUSED_SESSION))
    );
    if (coreLifecycleState() !== 'shuttingDown') {
      throw new Error(
        `lifecycle reads "${coreLifecycleState()}" while held, expected "shuttingDown"`
      );
    }
    smokeLog(
      '5/8 refused while held: getGmuxCore() and createSession() both ' +
        'rejected with SHUTTING_DOWN'
    );

    // Step 5: still held, the refused calls did nothing.
    const rowsHeld = core.listSessionRecords().length;
    const tmuxHeld = await tmuxSessionCount();
    const pidsHeld = await panePids();
    if (rowsHeld !== rowsAfterAdmitted) {
      throw new Error(
        `manifest rows moved under refusal: ${String(rowsAfterAdmitted)} -> ${String(rowsHeld)}`
      );
    }
    if (tmuxHeld !== tmuxAfterAdmitted) {
      throw new Error(
        `tmux sessions moved under refusal: ${String(tmuxAfterAdmitted)} -> ${String(tmuxHeld)}`
      );
    }
    if (pidsHeld !== pidsAfterAdmitted) {
      throw new Error(
        `pane pids moved under refusal: [${pidsAfterAdmitted}] -> [${pidsHeld}]`
      );
    }
    smokeLog(
      `6/8 nothing happened: ${String(rowsHeld)} manifest rows, ` +
        `${String(tmuxHeld)} tmux sessions, pane pids unchanged`
    );

    // Step 6: release the hold, finish the real shutdown, boot again.
    releaseHold();
    await shutdown;
    if (coreLifecycleState() !== 'empty') {
      throw new Error(
        `lifecycle reads "${coreLifecycleState()}" after shutdown, expected "empty"`
      );
    }
    const fresh = await getGmuxCore();
    if (fresh === core) {
      throw new Error('the second boot handed back the disposed core');
    }
    const names = fresh.listSessionRecords().map((rec) => rec.name);
    if (!names.includes(FIRST_SESSION) || !names.includes(ADMITTED_SESSION)) {
      throw new Error(
        `the fresh core cannot read the sessions back: [${names.join(', ')}]`
      );
    }
    smokeLog(
      '7/8 clean re-boot: lifecycle walked back to empty and a REAL second ' +
        'boot reads both sessions'
    );

    // End only what this probe created, by recorded id, then tear down.
    await cleanupOwnSessions(fresh);
    await shutdownGmuxCore();
    smokeLog('8/8 PASS (shutdown-refusal)');
    app.exit(0);
  } catch (err) {
    smokeFail(err);
  }
}

/** Kill and hard delete the probe's own rows, and nothing else. */
async function cleanupOwnSessions(core: GmuxCore): Promise<void> {
  for (const rec of core.listSessionRecords()) {
    if (rec.name !== FIRST_SESSION && rec.name !== ADMITTED_SESSION) continue;
    if (rec.status === 'running') {
      await core.killSession(rec.id).catch(() => undefined);
    }
    core.discardSession(rec.id);
  }
}

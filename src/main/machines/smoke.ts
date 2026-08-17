/**
 * GMUX_SMOKE=machines. Drive the machine confirm gate inside a real Electron
 * process, against the built bundle, with a real OS keychain.
 *
 * ## Why a unit test is not enough here, twice over
 *
 * The unit tests fake `safeStorage`. That is the right call for them, because
 * the property they check is "Tortie can produce this value and the file's
 * author cannot", and a fake models it exactly. What a fake cannot tell you is
 * whether `safeStorage` works at all in a packaged app on this machine, and the
 * gate FAILS CLOSED, so a keychain that is unavailable does not misbehave. It
 * refuses everything. A build where sealing quietly never works would pass
 * every unit test and refuse every machine in a person's hands.
 *
 * The second reason is the one Phase 20 paid for. Rollup deletes a branch whose
 * condition it can prove, and it proved two of the agent gate's four refusals
 * when the only caller passed a constant. `build/assert-bundle-refusals.mjs`
 * reads the artifact and says so, and the repo's answer to it is a second caller
 * the bundler cannot see through. This file is that caller for the six machine
 * refusals, and it is a useful one rather than a decoy.
 *
 * ## What is real here
 *
 * The gate is the real one from the bundle. The keychain is the real one. The
 * record is a real file written to a real path with a real atomic rename, and
 * the forged record is written by this process with ordinary `fs` calls, which
 * is exactly what an agent with write access to the home directory would do.
 * The ONE thing replaced is the person, because a harness cannot be one.
 *
 * ## Safety
 *
 * It refuses to run unless the profile is inside `GMUX_CONFIG_ROOT` and the
 * tmux socket is not the real one, using the same guard the fault harness and
 * the config smoke make, from the same module. It reuses that existing variable
 * rather than adding a third one. It creates no tmux session, it never opens the
 * manifest, and it starts NO process at all. The last part is the sentence the
 * whole phase turns on, so it is asserted here by two independent counts rather
 * than assumed.
 */

import { app } from 'electron';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { assertHarnessIsolation } from '../harness/isolation';
import { confirmPath } from '../config/confirm-record';
import {
  MACHINE_CONFIRM_ACKNOWLEDGEMENT,
  assertMachineMayConnect,
  confirmMachine,
  describeMachine,
  forgetMachine,
  machineExecutionHash,
  machineRecordKey,
  machineRowStatus,
  whileReadingMachines,
  type MachineExecutionFields
} from './confirm';
import { machineSshSpawnCount } from './connection-test';
import {
  addMachineRow,
  initMachines,
  loadMachines,
  stopMachinesWatch
} from './store';

function log(line: string): void {
  console.log(`[gmux-machines] ${line}`);
}

function fail(message: string): never {
  throw new Error(message);
}

/** The synthetic machine. It names an address nothing answers to. */
const ROW: MachineExecutionFields = {
  host: 'smoke-machine.invalid',
  user: 'smokeuser',
  port: 2222,
  remoteTmuxPath: '/usr/bin/tmux'
};

const ID = 'smokemachine';

/**
 * Run `work` and require it to throw, with `expect` somewhere in the message.
 *
 * The refusal has to come from the artifact rather than from a copy of the
 * source, so this reads what actually came back rather than asserting that
 * something went wrong.
 */
function assertRefused(what: string, expect: string, work: () => void): void {
  let message = '';
  try {
    work();
  } catch (err) {
    message = (err as Error).message;
  }
  if (message === '') fail(`${what}: nothing was refused`);
  if (!message.includes(expect)) {
    fail(`${what}: the refusal said "${message}" and should mention "${expect}"`);
  }
  log(`${what}: refused, and it said so`);
}

/** Confirm a machine the way the IPC handler does, from what the sheet showed. */
function confirmAsAPerson(fields: MachineExecutionFields): void {
  const summary = describeMachine(ID, fields);
  const recorded = confirmMachine(ID, fields, {
    acknowledgement: MACHINE_CONFIRM_ACKNOWLEDGEMENT,
    hashRead: summary.hash,
    linesRead: summary.lines
  });
  if (recorded === null) {
    fail(
      'the confirmation could not be sealed. safeStorage is unavailable in ' +
        'this build, so every machine would be refused in a person’s hands.'
    );
  }
}

/** Children of this process, read from the process table. */
function childProcessLines(): string[] {
  try {
    const out = execFileSync('/bin/ps', ['-o', 'pid=,ppid=,comm='], {
      encoding: 'utf8'
    });
    return out
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => {
        const parts = line.split(/\s+/);
        return parts[1] === String(process.pid);
      });
  } catch {
    return [];
  }
}

export async function runMachinesSmoke(): Promise<void> {
  try {
    const iso = assertHarnessIsolation('GMUX_CONFIG_ROOT');
    log(`profile ${iso.userData}, tmux socket ${iso.socket}`);

    const path = confirmPath();
    if (!path.startsWith(iso.root)) {
      fail(`the record would be written to ${path}, outside ${iso.root}`);
    }
    log(`the record lives at ${path}`);

    // --- 1. A machine nobody confirmed refuses ------------------------------
    assertRefused('a machine nobody confirmed', 'nobody has confirmed it', () => {
      assertMachineMayConnect(ID, ROW);
    });

    // --- 2. A confirmation comes from a person ------------------------------
    // The wrong sentence is built at RUNTIME so that no bundler can fold this
    // branch away and quietly turn the check into a check of nothing.
    assertRefused(
      'a call with the wrong acknowledgement',
      'confirmed by a person, not by a file',
      () => {
        const summary = describeMachine(ID, ROW);
        confirmMachine(ID, ROW, {
          acknowledgement: `not the acknowledgement ${String(
            process.pid
          )}` as typeof MACHINE_CONFIRM_ACKNOWLEDGEMENT,
          hashRead: summary.hash,
          linesRead: summary.lines
        });
      }
    );

    // --- 3. A machine a person confirmed passes, against the real keychain ---
    confirmAsAPerson(ROW);
    assertMachineMayConnect(ID, ROW);
    const sealed = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
    if (typeof sealed['seal'] !== 'string' || (sealed['seal'] as string).length === 0) {
      fail('the record was written with no seal');
    }
    log('confirmed, sealed by the real keychain, and it may be connected to');

    // --- 4. Change an execution bearing field and it asks again -------------
    const moved: MachineExecutionFields = { ...ROW, host: 'somewhere-else.invalid' };
    assertRefused(
      'the same machine with a different address',
      'its details changed after you',
      () => {
        assertMachineMayConnect(ID, moved);
      }
    );
    const changed = machineRowStatus(ID, moved);
    if (changed.confirmedLines.join('\n').includes('somewhere-else.invalid')) {
      fail('the record shows the new address as though the person had read it');
    }
    log('and the record still shows the person the line they actually read');

    // --- 5. A presentation change moves nothing -----------------------------
    // A machine's label and colour are not in the hash and are not in these
    // fields at all, so the proof here is that the hash of the same four values
    // is byte equal to the one that was sealed.
    const before = machineExecutionHash(ID, ROW);
    const again = machineExecutionHash(ID, { ...ROW });
    if (before !== again) fail('hashing the same machine twice gave two answers');
    if (machineRowStatus(ID, ROW).state !== 'confirmed') {
      fail('a machine whose four fields did not move stopped being confirmed');
    }
    log(`the hash of the four fields is stable: ${before.slice(0, 16)}`);

    // --- 6. A hash that moved while the sheet was open is not confirmed -----
    assertRefused(
      'a confirmation carrying a stale hash',
      'changed after it was',
      () => {
        confirmMachine(ID, ROW, {
          acknowledgement: MACHINE_CONFIRM_ACKNOWLEDGEMENT,
          hashRead: `stale ${String(process.pid)}`,
          linesRead: []
        });
      }
    );

    // --- 7. A record forged beside a real one is dropped whole --------------
    // This is the agent adversary, doing exactly what an agent can do: writing
    // its own row and the matching hash into the file. The hash is correct. The
    // seal does not cover it.
    const forgedFields: MachineExecutionFields = {
      host: 'attacker.invalid',
      user: 'root',
      port: null,
      remoteTmuxPath: '/tmp/not-tmux'
    };
    const file = JSON.parse(readFileSync(path, 'utf8')) as {
      confirmations: Record<string, unknown>;
      seal: string;
    };
    file.confirmations[machineRecordKey('forged')] = {
      id: machineRecordKey('forged'),
      hash: machineExecutionHash('forged', forgedFields),
      algorithm: 'sha256-machine-exec-v1',
      at: Date.now(),
      lines: ['Machine: attacker.invalid']
    };
    writeFileSync(path, `${JSON.stringify(file, null, 2)}\n`, 'utf8');
    assertRefused('a forged record with a correct hash', 'nobody has confirmed it', () => {
      assertMachineMayConnect('forged', forgedFields);
    });
    if (machineRowStatus(ID, ROW).state !== 'confirmed') {
      fail('the forgery took the real confirmation down with it');
    }
    log('and the real confirmation beside it is untouched');

    // --- 8. A record with someone else's seal is worth nothing --------------
    const foreign = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
    foreign['seal'] = Buffer.from(
      `not tortie ${String(process.pid)}`,
      'utf8'
    ).toString('base64');
    writeFileSync(path, `${JSON.stringify(foreign, null, 2)}\n`, 'utf8');
    assertRefused('a record sealed by another key', 'nobody has confirmed it', () => {
      assertMachineMayConnect(ID, ROW);
    });

    // --- 9. Reading the machines file never connects to anything ------------
    confirmAsAPerson(ROW);
    assertMachineMayConnect(ID, ROW);
    whileReadingMachines(() => {
      assertRefused(
        'a connection asked for from inside the machines file read',
        'never starts anything on its own',
        () => {
          assertMachineMayConnect(ID, ROW);
        }
      );
    });
    assertMachineMayConnect(ID, ROW);
    log('and an ordinary connection after the read is unaffected');

    // --- 10. A withdrawn agreement puts the machine back --------------------
    forgetMachine(ID);
    assertRefused('a withdrawn agreement', 'nobody has confirmed it', () => {
      assertMachineMayConnect(ID, ROW);
    });

    // --- 11. A confirmation survives a real write and a real reload ---------
    // The row goes to disk through the store, the file is read back, and the
    // confirmation recorded against it is still there. This is the round trip
    // the Settings surface makes when a person adds a machine.
    await initMachines();
    addMachineRow({
      id: ID,
      label: 'Smoke Machine',
      color: 'cyan',
      host: ROW.host,
      user: ROW.user ?? undefined,
      port: ROW.port ?? undefined,
      remoteTmuxPath: ROW.remoteTmuxPath ?? undefined
    });
    confirmAsAPerson(ROW);
    const reloaded = loadMachines('reload');
    const row = reloaded.rows.find((r) => r.id === ID);
    if (row === undefined) fail('the machine Tortie wrote was not read back');
    if (row.host !== ROW.host || row.remoteTmuxPath !== ROW.remoteTmuxPath) {
      fail('the machine read back with different details from the ones written');
    }
    if (machineRowStatus(ID, ROW).state !== 'confirmed') {
      fail('the confirmation did not survive the write and the reload');
    }
    if (reloaded.problems.length > 0) {
      fail(
        `the file Tortie wrote came back with problems: ${reloaded.problems
          .map((p) => p.message)
          .join(' ')}`
      );
    }
    log('a machine written by Tortie reads back confirmed, with no problems');

    // --- 12. Booting with a confirmed machine starts ZERO ssh processes -----
    // Two independent counts, because one of them could be wrong in a way the
    // other cannot. The module's own counter says nothing in this process
    // called spawn, and the process table says this pid has no ssh child.
    const spawns = machineSshSpawnCount();
    if (spawns !== 0) {
      fail(`the connection test module started ${spawns} ssh process(es)`);
    }
    const children = childProcessLines();
    const sshChildren = children.filter((line) => line.includes('ssh'));
    if (sshChildren.length > 0) {
      fail(`this process has ssh children: ${sshChildren.join(', ')}`);
    }
    log(
      `no ssh process was started at any point: the module counter is 0 and ` +
        `this pid has ${children.length} child process(es), none of them ssh`
    );

    // The watcher this smoke started is closed before the exit, so nothing is
    // left queued behind an environment teardown (Phase 36's crash shape).
    await stopMachinesWatch();

    log('PASS');
    app.exit(0);
  } catch (err) {
    console.error(`[gmux-machines] FAIL: ${(err as Error).message}`);
    await stopMachinesWatch().catch(() => undefined);
    app.exit(1);
  }
}

/**
 * GMUX_SMOKE=remote-sessions. Create, list, rename and end a session on a
 * machine, inside a real Electron process against the built bundle (Phase 70).
 *
 * ## What only this can prove
 *
 * Four things, and none of them is provable by a unit test.
 *
 * The confirm gate is sealed through `safeStorage`, which needs an Electron
 * process, so this is where an unconfirmed machine and a machine whose details
 * moved are watched refusing a create against the real keychain.
 *
 * The ssh process count is read from the process table, so "nothing was started
 * after the refusal" is a measurement rather than an assertion.
 *
 * The two refusals this rung pins are reachable in production but rarely, and
 * rollup deletes a branch whose condition it can prove. This file is the second
 * caller `build/assert-bundle-refusals.mjs` needs for `machine.restore-refused`
 * and `machine.remote-target-unbound`.
 *
 * And the claim that no remote path writes to the manifest is checked here by
 * looking for a database file in the profile after a whole create, rename and
 * kill. The unit test counts the writes; this counts the bytes.
 *
 * ## Safety
 *
 * It refuses to run unless the profile is inside `GMUX_CONFIG_ROOT` and the tmux
 * socket is not the real one, using the same guard the fault harness makes, from
 * the same module. On this rung the socket matters more than it ever has: the
 * far side of the connection is this same Mac, so a remote `new-session` on
 * socket `gmux` would create a session on the operator's own server.
 *
 * It reads the scratch sshd's port and key from a JSON file inside that root,
 * written by `build/probe-execplane.mjs`. When the file is not there, the steps
 * that need a real far side are SKIPPED and said to be skipped, and the refusal
 * steps still run, because none of them sends anything.
 */

import { app } from 'electron';
import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { dirname, join } from 'node:path';
import { assertHarnessIsolation } from '../harness/isolation';
import { activeTmuxSocket, TMUX_SOCKET } from '../tmux/resolve';
import {
  MACHINE_CONFIRM_ACKNOWLEDGEMENT,
  confirmMachine,
  describeMachine,
  type MachineExecutionFields
} from './confirm';
import { execOn } from './exec-plane';
import { prepareMachine } from './prepare';
import { machineContext, type RemoteMachineContext } from './context';
import {
  addMachineRow,
  machineHostKeysPath,
  machinesPath,
  reloadMachines
} from './store';
import { RESTORE_REFUSED, TARGET_UNBOUND } from './remote-copy';
import {
  parseRemoteListLine,
  refuseRemoteRestore,
  remoteCreate,
  remoteKill,
  remoteListArgs,
  remoteMachineFacts,
  remoteRename,
  remoteSessionRow,
  remoteSessions,
  startRemotePoll
} from './remote-sessions';

function log(line: string): void {
  console.log(`[gmux-remote-sessions] ${line}`);
}

function fail(message: string): never {
  throw new Error(message);
}

/** What `build/probe-execplane.mjs` wrote, when it wrote one. */
interface Carriage {
  host: string;
  port: number;
  user: string;
  remoteTmuxPath: string;
  stubTmuxPath?: string;
}

const ID = 'remotesessions';
const MOVED_ID = 'remotemoved';
const UNCONFIRMED_ID = 'remoteunconfirmed';
const STUB_ID = 'remotestub';

/** The file the exec plane probe leaves inside the harness root. */
const CARRIAGE_FILE = 'p69-carriage.json';

function readCarriage(root: string): Carriage | null {
  try {
    return JSON.parse(readFileSync(join(root, CARRIAGE_FILE), 'utf8')) as Carriage;
  } catch {
    return null;
  }
}

/** ssh children of this process, read from the process table. */
function sshChildCount(): number {
  try {
    const out = execFileSync('/bin/ps', ['-o', 'pid=,ppid=,comm='], {
      encoding: 'utf8'
    });
    return out
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => {
        const parts = line.split(/\s+/);
        return parts[1] === String(process.pid) && line.includes('ssh');
      }).length;
  } catch {
    return 0;
  }
}

/** Every database file under one directory, so a manifest write cannot hide. */
function databaseFiles(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const path = join(dir, entry);
    let isDir = false;
    try {
      isDir = statSync(path).isDirectory();
    } catch {
      continue;
    }
    if (isDir) databaseFiles(path, out);
    else if (/\.(db|sqlite3?)(-wal|-shm)?$/.test(entry)) out.push(path);
  }
  return out;
}

/** Run `work` and require it to reject with `expect` in its message. */
async function assertRefused(
  what: string,
  expect: string,
  work: () => Promise<unknown>
): Promise<void> {
  let message = '';
  try {
    await work();
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
function confirmAsAPerson(id: string, fields: MachineExecutionFields): void {
  const summary = describeMachine(id, fields);
  const recorded = confirmMachine(id, fields, {
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

/** The operator's own server, read only, counted. */
function operatorSessionCount(): number {
  try {
    const out = execFileSync(
      '/bin/sh',
      ['-c', 'tmux -L gmux list-sessions 2>/dev/null | wc -l'],
      { encoding: 'utf8' }
    );
    return Number(out.trim());
  } catch {
    return -1;
  }
}

export async function runRemoteSessionsSmoke(): Promise<void> {
  try {
    const iso = assertHarnessIsolation('GMUX_CONFIG_ROOT');
    // Said again, by name. On this rung the far side is this same Mac, and a
    // remote new-session on this socket would create a session on the server
    // holding the operator's live work.
    if (activeTmuxSocket() === TMUX_SOCKET) {
      fail(
        `the socket is "${TMUX_SOCKET}", the real one. This harness creates a ` +
          `session on a machine, and on this socket that machine is this Mac.`
      );
    }
    const operatorBefore = operatorSessionCount();
    log(`profile ${iso.userData}, socket ${iso.socket}`);
    log(`the operator's own server holds ${String(operatorBefore)} session(s)`);

    const carriage = readCarriage(iso.root);
    const fields: MachineExecutionFields =
      carriage === null
        ? {
            host: '127.0.0.1',
            user: 'nobody',
            port: 65_000,
            remoteTmuxPath: '/usr/bin/tmux'
          }
        : {
            host: carriage.host,
            user: carriage.user,
            port: carriage.port,
            remoteTmuxPath: carriage.remoteTmuxPath
          };

    const sshBefore = sshChildCount();
    log(`ssh children before anything: ${String(sshBefore)}`);

    const createOn = async (machineId: string): Promise<unknown> =>
      remoteCreate({
        machineId,
        name: 'p70 smoke',
        projectPath: '/tmp',
        cwd: '/tmp',
        agent: 'shell'
      });

    // --- 1. A row nobody confirmed ------------------------------------------
    await assertRefused(
      '1. a machine nobody confirmed refuses Create',
      'Tortie has not signed in to that machine yet',
      () => createOn(UNCONFIRMED_ID)
    );
    if (sshChildCount() !== sshBefore) {
      fail('the refused create started an ssh process');
    }
    log(`   and the ssh child count is still ${String(sshBefore)}`);

    // --- 2. A row whose fields moved after the confirmation ------------------
    confirmAsAPerson(MOVED_ID, fields);
    const moved: MachineExecutionFields = { ...fields, host: '127.0.0.2' };
    const movedPrepare = await prepareMachine({
      machineId: MOVED_ID,
      fields: moved,
      tortieHostKeys: machineHostKeysPath()
    });
    if (!movedPrepare.detail.includes('changed after you')) {
      fail(`a moved row was not refused by the gate: ${movedPrepare.detail}`);
    }
    await assertRefused(
      '2. a machine whose details moved refuses Create',
      'Tortie has not signed in to that machine yet',
      () => createOn(MOVED_ID)
    );
    if (sshChildCount() !== sshBefore) {
      fail('the refused create on a moved row started an ssh process');
    }
    log(`   and the ssh child count is still ${String(sshBefore)}`);

    // --- 3. A file change starts nothing -------------------------------------
    const before = sshChildCount();
    addMachineRow({
      id: 'remotereload',
      label: 'reload probe',
      color: 'blue',
      host: '127.0.0.1',
      user: 'nobody',
      port: 65_001,
      remoteTmuxPath: '/usr/bin/tmux'
    });
    reloadMachines();
    const after = sshChildCount();
    if (after !== before) {
      fail(
        `reading ${machinesPath()} started ${String(after - before)} ssh ` +
          `process(es). A configuration change never starts anything on its own.`
      );
    }
    log(
      `3. writing and re-reading the machines file started zero processes ` +
        `(${String(before)} before, ${String(after)} after)`
    );

    if (carriage === null) {
      log('4 to 10. SKIPPED, and it is not evidence: no scratch carriage file');
      log(`11. the operator's server: ${String(operatorSessionCount())}`);
      log('PASS');
      app.exit(0);
      return;
    }

    // The one first contact, done by hand, exactly as the exec plane smoke does
    // it and for the same reason: the plane carries StrictHostKeyChecking=yes
    // and BatchMode=yes, so it refuses a machine whose identity is not recorded
    // and it could not ask. In the product that answer comes from the one
    // visible connection test, where a person is watching.
    const record = machineHostKeysPath();
    mkdirSync(dirname(record), { recursive: true });
    writeFileSync(
      record,
      execFileSync(
        '/usr/bin/ssh-keyscan',
        ['-p', String(carriage.port), carriage.host],
        { encoding: 'utf8', timeout: 30_000 }
      ),
      'utf8'
    );

    // --- 4. A version nobody measured ---------------------------------------
    if (carriage.stubTmuxPath !== undefined) {
      const stubFields: MachineExecutionFields = {
        ...fields,
        remoteTmuxPath: carriage.stubTmuxPath
      };
      confirmAsAPerson(STUB_ID, stubFields);
      const refused = await prepareMachine({
        machineId: STUB_ID,
        fields: stubFields,
        tortieHostKeys: machineHostKeysPath()
      });
      if (refused.class !== 'version-unmeasured') {
        fail(`a machine running a stub answered ${refused.class}`);
      }
      if (refused.serverBorn || refused.options.length > 0) {
        fail('a machine refused for its version had something started on it');
      }
      await assertRefused(
        '4. a machine whose version nobody measured refuses Create',
        'Tortie has not signed in to that machine yet',
        () => createOn(STUB_ID)
      );
      log(
        `   it reported ${String(refused.version)} and the refusal names the ` +
          `versions Tortie has measured: ${refused.supported.join(', ')}`
      );
    } else {
      log('4. SKIPPED: the probe wrote no stub path');
    }

    // --- 5. A confirmed and measured machine takes a create ------------------
    confirmAsAPerson(ID, fields);
    const prepared = await prepareMachine({
      machineId: ID,
      fields,
      tortieHostKeys: machineHostKeysPath()
    });
    if (prepared.class !== 'prepared') {
      fail(`the prepare answered ${prepared.class}: ${prepared.detail}`);
    }
    const ctx = machineContext(ID) as RemoteMachineContext;
    const created = await createOn(ID);
    const session = created as { id: string; name: string; machine?: { id: string } };
    log(`5. created ${session.id} on ${String(session.machine?.id)}`);

    const listed = await execOn(ctx, remoteListArgs());
    const row = listed
      .split('\n')
      .map(parseRemoteListLine)
      .find((one) => one !== null && one.gmuxId === session.id);
    if (row === null || row === undefined) {
      fail('the created session was not in the machine’s own list');
    }
    const stampChecks: [string, string][] = [
      ['@gmux-id', session.id],
      ['@gmux-agent', 'shell'],
      ['@gmux-name', 'p70 smoke'],
      ['@gmux-project', '/tmp']
    ];
    for (const [option, wanted] of stampChecks) {
      const observed = (
        await execOn(ctx, ['show-options', '-v', '-t', row.tmuxId, option])
      ).replace(/\n$/, '');
      if (observed !== wanted) {
        fail(`${option} on the far side is ${JSON.stringify(observed)} and it ` +
          `should be ${JSON.stringify(wanted)}`);
      }
    }
    const env = await execOn(ctx, ['show-environment', '-t', row.tmuxId]);
    for (const pair of ['GMUX_MANAGED=1', `GMUX_SESSION_ID=${session.id}`]) {
      if (env.includes(pair)) continue;
      fail(`the pane environment on the far side does not carry ${pair}`);
    }
    log(
      `   all four stamps and both environment variables read back byte for ` +
        `byte from ${row.tmuxId}`
    );

    // --- 6. The poll lists it ------------------------------------------------
    await startRemotePoll(ID);
    const facts = remoteMachineFacts(ID);
    const projected = remoteSessions().find((one) => one.id === session.id);
    if (projected === undefined) fail('the poll did not project the new session');
    if (projected.name !== 'p70 smoke') {
      fail(`the projected name is ${JSON.stringify(projected.name)}`);
    }
    if (projected.agent !== 'shell') fail('the projected agent is wrong');
    if (projected.projectPath !== '/tmp') fail('the projected folder is wrong');
    if (projected.machine?.id !== ID) fail('the projected machine is wrong');
    log(
      `6. the poll reported ${String(facts.rows)} row(s) of Tortie's and ` +
        `${String(facts.foreign)} that are not, and the projection carries the ` +
        `name, the agent, the folder and the machine`
    );

    // --- 7. A rename lands on the far side ----------------------------------
    await remoteRename(session.id, 'p70 renamed');
    const renamedStamp = (
      await execOn(ctx, ['show-options', '-v', '-t', row.tmuxId, '@gmux-name'])
    ).replace(/\n$/, '');
    if (renamedStamp !== 'p70 renamed') {
      fail(`the name stamp on the far side is ${JSON.stringify(renamedStamp)}`);
    }
    log('7. the rename landed on the far side and the name stamp moved with it');

    // --- 8. A kill nothing reported -----------------------------------------
    const sshBeforeUnbound = sshChildCount();
    await assertRefused(
      '8. a kill aimed at a session no list reported',
      TARGET_UNBOUND,
      () => remoteKill(`never-listed-${String(process.pid)}`)
    );
    if (sshChildCount() !== sshBeforeUnbound) {
      fail('the refused kill started an ssh process');
    }
    log('   and it sent nothing');

    // --- 9. The bound kill ---------------------------------------------------
    await remoteKill(session.id);
    const afterKill = await execOn(ctx, remoteListArgs()).catch(() => '');
    if (
      afterKill
        .split('\n')
        .map(parseRemoteListLine)
        .some((one) => one !== null && one.gmuxId === session.id)
    ) {
      fail('the session is still on the machine after the kill');
    }
    log('9. the bound kill removed it from the machine');

    // --- 10. Restore refused, and nothing was written ------------------------
    const ended = remoteSessionRow(session.id);
    if (ended === null) fail('the ended row was forgotten rather than held');
    await assertRefused('10. restore on a remote row', RESTORE_REFUSED, () =>
      Promise.resolve().then(() => {
        refuseRemoteRestore(session.id);
      })
    );
    const databases = databaseFiles(iso.userData);
    if (databases.length > 0) {
      fail(
        `a create, a rename and a kill on a machine left ${String(
          databases.length
        )} database file(s) in the profile: ${databases.join(', ')}. Nothing ` +
          `about a remote session may be written here.`
      );
    }
    log(
      `    and zero database files exist in ${iso.userData} after the whole ` +
        `create, rename and kill`
    );

    // --- 11. The operator's server -------------------------------------------
    const operatorAfter = operatorSessionCount();
    if (operatorAfter !== operatorBefore) {
      fail(
        `the operator's own server held ${String(operatorBefore)} session(s) ` +
          `before this run and ${String(operatorAfter)} after it`
      );
    }
    log(
      `11. the operator's own server held ${String(operatorBefore)} session(s) ` +
        `before and after`
    );

    log('PASS');
    app.exit(0);
  } catch (err) {
    console.error(`[gmux-remote-sessions] FAIL: ${(err as Error).message}`);
    app.exit(1);
  }
}

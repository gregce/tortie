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
 * The refusals this rung pins are reachable in production but rarely, and rollup
 * deletes a branch whose condition it can prove. This file is the second caller
 * `build/assert-bundle-refusals.mjs` needs for `machine.remote-target-unbound`
 * and for the four Phase 72 added, being `machine.restore-unseen`,
 * `machine.restore-wrong-machine`, `machine.restore-forgotten` and
 * `machine.resume-not-collected`.
 *
 * PHASE 72 TURNED ONE OF ITS CHECKS INSIDE OUT. Phase 70 looked for a database
 * file in the profile after a create, a rename and a kill, because no remote
 * path was allowed to write one. This build writes a manifest row for a session
 * on a machine, so the check is now that the row IS there, that it names the
 * machine, and that its recorded program path is the path that machine reported
 * rather than the path this Mac holds. The unit tests count the writes. This one
 * reads the row out of a real database in a real Electron process.
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
// Phase 72 fix round. The per machine program capture is only exercised by a
// session that HAS a program, and every session this harness made was a plain
// shell, whose argv is empty by construction.
import {
  LAUNCHABLE_AGENT_IDS,
  agentBinaryName
} from '../agents/registry';
import type { LaunchableAgentId } from '@shared/types';
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
import {
  RESTORE_FORGOTTEN,
  RESTORE_STILL_RUNNING,
  RESTORE_UNSEEN,
  RESTORE_WRONG_MACHINE,
  RESUME_NOT_COLLECTED,
  TARGET_UNBOUND
} from './remote-copy';
import {
  forgetMachineRows,
  markMachineQuiet,
  parseRemoteListLine,
  refuseRemoteRestore,
  remoteCreate,
  remoteKill,
  remoteListArgs,
  remoteMachineFacts,
  remoteRename,
  remoteRestoreVerdictFor,
  remoteSessionRow,
  remoteSessions,
  startRemotePoll
} from './remote-sessions';
// Phase 72. The manifest row a remote create now writes, the restore behind the
// gate, and the per machine program path capture.
import { ManifestStore } from '../manifest/store';
import {
  remoteRecordOf,
  remoteRecordsForMachine,
  setRemoteManifest
} from './remote-record';
import { restoreRemoteSession } from './remote-restore';
import { assertArgvBelongsToMachine, captureRemoteArgv } from './remote-argv';
import { removeMachineRow } from './store';

function log(line: string): void {
  console.log(`[gmux-remote-sessions] ${line}`);
}

/** One agent that machine actually has, with the path it keeps it at. */
interface AgentOnMachine {
  agent: LaunchableAgentId;
  bare: string;
  path: string;
}

/**
 * The first agent in the table that machine has a copy of (Phase 72 fix round).
 *
 * It ASKS THE MACHINE, one bare name at a time, through the same read the
 * create uses. It does not read this Mac's own program list, even though the
 * machine here is this same Mac, because the question is what that machine
 * holds and a second way of answering it would be a second answer.
 *
 * Null when the machine has none of them. The caller fails rather than skipping,
 * because a step that quietly measures nothing is the vacuous pass this fix
 * round exists to remove.
 */
async function firstAgentOnMachine(
  ctx: RemoteMachineContext
): Promise<AgentOnMachine | null> {
  for (const agent of LAUNCHABLE_AGENT_IDS) {
    let bare: string;
    try {
      bare = agentBinaryName(agent);
    } catch {
      continue;
    }
    try {
      const path = await captureRemoteArgv(ctx, bare);
      return { agent, bare, path };
    } catch {
      // That machine does not have this one. The next name is asked.
    }
  }
  return null;
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

    // PHASE 72. A real manifest, inside this run's own profile, installed the
    // same way `../sessions/core.ts` installs it. Without it every write below
    // is a no-op and the checks would prove the harness rather than the product.
    const manifestPath = join(iso.userData, 'gmux', 'manifest.db');
    mkdirSync(dirname(manifestPath), { recursive: true });
    const manifest = new ManifestStore(manifestPath);
    setRemoteManifest(manifest);
    log(`a session list was opened at ${manifestPath}`);

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
      // PHASE 71 FIX ROUND. This used to log a skip and exit PASS, so from a
      // clean checkout the gate proved 3 of its 11 steps and reported success.
      // `npm run smoke:remote` now starts its own machine through
      // `build/with-scratch-machine.mjs`, so a missing file means the machine
      // did not come up and there is nothing here to be optimistic about.
      fail(
        `no scratch machine details at ${CARRIAGE_FILE} inside the harness ` +
          `root. Seven of this gate's eleven steps need a machine to talk to, ` +
          `so a run without one has proved almost nothing and must not pass. ` +
          `Run it through "npm run smoke:remote", which starts the machine.`
      );
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
    //
    // PHASE 72 FIX ROUND. THE ROW IS ADDED TO THE MACHINES FILE FIRST, which is
    // what a person does in Settings before they confirm anything. Without it
    // this harness confirmed and prepared a machine that was in no file, so
    // every restore below reached the gate's first arm, which asks whether the
    // machine is still known, and every refusal came back as "you removed this
    // machine from Tortie". Step 8c then failed and the whole gate stopped
    // before it reached the restore it exists to prove.
    addMachineRow({
      id: ID,
      label: 'Remote Sessions',
      color: 'orange',
      host: fields.host,
      ...(fields.user === null ? {} : { user: fields.user }),
      ...(fields.port === null ? {} : { port: fields.port }),
      ...(fields.remoteTmuxPath === null
        ? {}
        : { remoteTmuxPath: fields.remoteTmuxPath })
    });
    reloadMachines();
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

    // --- 8b. The manifest row, and the path that machine reported ------------
    //
    // PHASE 72. The create wrote a row before it sent the create line. This is
    // what proves it, out of a real database, in a real Electron process.
    const recorded = remoteRecordOf(session.id);
    if (recorded === null) {
      fail('the create on a machine wrote no row to the session list');
    }
    if (recorded.machineId !== ID) {
      fail(
        `the row says machine ${JSON.stringify(String(recorded.machineId))} and ` +
          `it should say ${JSON.stringify(ID)}`
      );
    }
    if (recorded.resumeArgv !== undefined) {
      fail('the row carries a resume command, and no remote row may have one');
    }
    if (recorded.resumeProvenance?.source !== 'remote-not-collected') {
      fail(
        `the row records where its conversation id came from as ` +
          `${JSON.stringify(String(recorded.resumeProvenance?.source))}`
      );
    }
    log(
      `8b. the row for ${session.id} names machine ${ID}, has no resume ` +
        `command, and records why there is none`
    );

    // The capture itself, against a program every machine has. A shell session
    // records no program, so this is what drives the read end to end.
    const shPath = await captureRemoteArgv(ctx, 'sh');
    if (!shPath.startsWith('/')) {
      fail(`the machine answered ${JSON.stringify(shPath)} for sh`);
    }
    log(`    and the machine says it keeps sh at ${shPath}`);

    // --- 8c. Restore is refused while the machine still lists it -------------
    //
    // THE DOUBLE RUN GUARD, watched firing. This is the one failure research 28
    // ranks as destroying work, and it is refused before anything is composed.
    const sshBeforeRunning = sshChildCount();
    await assertRefused(
      '8c. restore while the machine still lists the session',
      RESTORE_STILL_RUNNING,
      () => restoreRemoteSession(session.id)
    );
    if (sshChildCount() !== sshBeforeRunning) {
      fail('the refused restore started an ssh process');
    }
    log('    and it sent nothing');

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

    // --- 10. The restore, end to end ----------------------------------------
    //
    // The machine answered, its answer did not hold the session, and every other
    // condition holds, so the gate offers the verb and the verb runs. This is
    // the whole of what M5 added, watched in a real process against a real
    // machine.
    const ended = remoteSessionRow(session.id);
    if (ended === null) fail('the ended row was forgotten rather than held');
    const offered = remoteRestoreVerdictFor(session.id, ID);
    if (!offered.offered) {
      fail(
        `the gate refused a row the machine answered about, with ` +
          `${String(offered.refusal)}: ${String(offered.reason)}`
      );
    }
    const startedAt = Date.now();
    const outcome = await restoreRemoteSession(session.id);
    const restoreMs = Date.now() - startedAt;
    if (!outcome.tmuxId.startsWith('$')) {
      fail(`the restore answered ${JSON.stringify(outcome.tmuxId)}`);
    }
    if (outcome.stampsLanded !== 4) {
      fail(
        `${String(outcome.stampsLanded)} of the four session options landed ` +
          `on the restored session`
      );
    }
    // A shell has no conversation and never had one, so the arming gate says
    // nothing about it. The sentence belongs to a session whose agent keeps
    // one, and step 10a below is where it is watched.
    if (outcome.resumeNote !== null) {
      fail(
        `the restore of a shell session said ${JSON.stringify(outcome.resumeNote)} ` +
          `about a conversation it never had`
      );
    }
    if (outcome.resumeRefusal !== 'nothing-to-arm') {
      fail(
        `the arming gate answered ${String(outcome.resumeRefusal)} for a shell`
      );
    }
    // Read back from the machine, byte for byte, the same four stamps and both
    // pane variables the create wrote.
    const afterRestore = await execOn(ctx, remoteListArgs());
    const back = afterRestore
      .split('\n')
      .map(parseRemoteListLine)
      .find((one) => one !== null && one.gmuxId === session.id);
    if (back === null || back === undefined) {
      fail('the restored session is not in the machine\u2019s own list');
    }
    if (back.agent !== 'shell' || back.projectPath !== '/tmp') {
      fail('the restored session came back with different stamps');
    }
    const restoredEnv = await execOn(ctx, ['show-environment', '-t', back.tmuxId]);
    for (const pair of ['GMUX_MANAGED=1', `GMUX_SESSION_ID=${session.id}`]) {
      if (restoredEnv.includes(pair)) continue;
      fail(`the restored pane environment does not carry ${pair}`);
    }
    log(
      `10. the restore brought ${session.id} back on ${ID} as ${back.tmuxId} ` +
        `in ${String(restoreMs)} ms, with four stamps and both pane variables ` +
        `reading back byte for byte, and it said nothing about a conversation ` +
        `because a shell never had one`
    );

    // --- 10a. The per machine program path, into the row and back out -------
    //
    // PHASE 72 FIX ROUND. Everything above this line is a plain shell session,
    // whose argv is empty by construction, so the row's `argv[0]` was "" and
    // the restore's own program check was skipped every time. Only the refusal
    // half of the claim was proven. This step creates a session that HAS a
    // program, reads the row, and brings it back.
    const onMachine = await firstAgentOnMachine(ctx);
    if (onMachine === null) {
      fail(
        `no agent Tortie can launch is installed on that machine, so the per ` +
          `machine program capture could not be measured. This gate runs ` +
          `against a machine that is this same Mac, so install one of ` +
          `${LAUNCHABLE_AGENT_IDS.join(', ')} and run it again.`
      );
    }
    const agentSession = await remoteCreate({
      machineId: ID,
      name: 'p72 agent',
      projectPath: '/tmp',
      cwd: '/tmp',
      agent: onMachine.agent
    });
    const agentRecord = remoteRecordOf(agentSession.id);
    if (agentRecord === null) fail('the agent create wrote no row');
    const recordedBin = agentRecord.argv[0] ?? '';
    if (recordedBin !== onMachine.path) {
      fail(
        `the row records ${JSON.stringify(recordedBin)} and the machine says ` +
          `it keeps ${onMachine.bare} at ${JSON.stringify(onMachine.path)}`
      );
    }
    if (agentRecord.agentContract?.bin !== onMachine.path) {
      fail(
        `the recovery record's program is ` +
          `${JSON.stringify(String(agentRecord.agentContract?.bin))}`
      );
    }
    log(
      `10a. the row for ${agentSession.id} records ${onMachine.bare} at ` +
        `${onMachine.path}, which is where that machine says it keeps it`
    );

    // The launch itself stays BY BARE NAME on both sides. The recorded path is
    // evidence about a machine, never an instruction, so it must not appear on
    // the command the machine ran.
    const agentListed = await execOn(ctx, remoteListArgs());
    const agentRow = agentListed
      .split('\n')
      .map(parseRemoteListLine)
      .find((one) => one !== null && one.gmuxId === agentSession.id);
    if (agentRow === null || agentRow === undefined) {
      fail('the agent session was not in the machine’s own list');
    }
    if (agentRow.agent !== onMachine.agent) {
      fail(`the agent stamp on the far side is ${JSON.stringify(agentRow.agent)}`);
    }

    // Ended on the machine, then brought back. The restore reads the program
    // again before it composes anything, which is the half nothing exercised.
    await remoteKill(agentSession.id);
    const agentOutcome = await restoreRemoteSession(agentSession.id);
    if (agentOutcome.stampsLanded !== 4) {
      fail(
        `${String(agentOutcome.stampsLanded)} of the four session options ` +
          `landed on the restored agent session`
      );
    }
    if (agentOutcome.resumeRefusal !== 'not-collected') {
      fail(
        `the arming gate answered ${String(agentOutcome.resumeRefusal)} for a ` +
          `session whose conversation Tortie never collected`
      );
    }
    if (agentOutcome.resumeNote !== RESUME_NOT_COLLECTED) {
      fail('the restore result does not say that no conversation comes back');
    }
    if (agentOutcome.resumeArmed) {
      fail('the restore claims it continued a conversation');
    }
    log(
      `    and the restore brought it back as ${agentOutcome.tmuxId} with four ` +
        `stamps, saying the conversation does not come back`
    );
    await remoteKill(agentSession.id).catch(() => undefined);

    // --- 10b. The three rare refusals, watched firing ------------------------
    //
    // Each one is a branch a bundler folds away, and each one is the sentence
    // between a person and a second agent on one conversation.
    await assertRefused(
      '10b. a row whose recorded machine is not the machine in hand',
      RESTORE_WRONG_MACHINE,
      () =>
        Promise.resolve().then(() => {
          assertArgvBelongsToMachine(ID, 'some-other-machine');
        })
    );
    markMachineQuiet(ID, 'the smoke cut it on purpose');
    await assertRefused(
      '10c. a restore while Tortie cannot see the machine',
      RESTORE_UNSEEN,
      () =>
        Promise.resolve().then(() => {
          refuseRemoteRestore(session.id);
        })
    );
    await startRemotePoll(ID);

    // --- 10d. The tombstone --------------------------------------------------
    //
    // A person removes the machine. Nothing is sent to it, the row survives as a
    // record of what Tortie last knew, and the session is still running there.
    // Two rows live on that machine by now, being the shell of step 5 and the
    // agent of step 10a, and both must survive the removal as a record.
    const liveRows = remoteRecordsForMachine(ID).filter(
      (row) => row.status !== 'discarded'
    ).length;
    const tombstoned = forgetMachineRows(ID);
    removeMachineRow(ID);
    if (tombstoned !== liveRows || tombstoned < 2) {
      fail(
        `${String(liveRows)} row(s) were on that machine and removing it ` +
          `tombstoned ${String(tombstoned)}`
      );
    }
    const gone = remoteRecordOf(session.id);
    if (gone?.machineTombstone === undefined) {
      fail('the row for a removed machine carries no record of what was known');
    }
    if (gone.status !== 'discarded') {
      fail(`the row for a removed machine reads ${gone.status}`);
    }
    await assertRefused(
      '10d. a restore for a machine the person removed',
      RESTORE_FORGOTTEN,
      () => restoreRemoteSession(session.id)
    );
    const stillThere = await execOn(ctx, remoteListArgs()).catch(() => '');
    const survivor = stillThere
      .split('\n')
      .map(parseRemoteListLine)
      .find((one) => one !== null && one.gmuxId === session.id);
    if (survivor === null || survivor === undefined) {
      fail('removing the machine ended the session on it');
    }
    log(
      `    ${String(tombstoned)} row(s) became a record of what Tortie last ` +
        `knew, the first says ${gone.machineTombstone.machineLabel} was ` +
        `removed, and the session is still running on that machine as ` +
        `${survivor.tmuxId}`
    );

    // The database this rung DOES write, named so a reader can find it.
    const databases = databaseFiles(iso.userData);
    if (databases.length === 0) {
      fail(
        `a create on a machine left no database file in ${iso.userData}. This ` +
          `build records a session on another machine and the row is what ` +
          `makes it restorable.`
      );
    }
    log(`    and the session list is on disk: ${databases.join(', ')}`);
    manifest.close();
    setRemoteManifest(null);

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

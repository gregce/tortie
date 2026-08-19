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
 *
 * ## PHASE 85 added steps 19a, 19b and 19c
 *
 * They are the phase's central proof, and they are here rather than in a unit
 * test because a unit test cannot make a real pane print. 19a plants a line in a
 * pane on the machine and measures how long the row takes to read `running` and
 * then `idle` again, with nothing calling the poll by hand. It waits for the new
 * session to settle to `idle` first, because a shell prints its prompt when it
 * starts and the row correctly reads `running` for a few seconds because of it. 19b reads both
 * activity fields through the product's own call and pins which one moved. 19c
 * times ten lists over the open connection and prints the mean.
 */

import { app } from 'electron';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import {
  chmodSync,
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
import {
  machineContext,
  machineGeneration,
  type RemoteMachineContext
} from './context';
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
  REMOTE_DIR_MISSING,
  RESUME_NOT_COLLECTED,
  RESUME_NOT_TYPED_HERE,
  TARGET_UNBOUND
} from './remote-copy';
import {
  REMOTE_POLL_FOCUSED_MS,
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
  splitQuotedLine,
  startRemotePoll,
  type RemoteListRow
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
// Phase 73, M6. The connected harvest, the conversation copy, the door they
// both ride, and the gate that decides whether a resume may be typed.
import { remoteHarvestRoots } from '../manifest/harvest/remote';
import {
  dropClaimsOfMovedConnections,
  harvestMachineOnce,
  remoteHarvestClaims,
  remoteHarvestFacts,
  setRemoteHarvestFactsForHarness,
  stopRemoteHarvest
} from './remote-harvest';
import {
  remoteStoreSessionDir,
  stopRemoteStoreSync,
  syncMachineOnce
} from './remote-store-sync';
import {
  conversationSyncedAt,
  remoteStoreRecordOf
} from './remote-record';
import { resumeArmingVerdict } from './resume-arming';
// PHASE 84. The five lifecycle steps drive the REAL core, so they need the real
// core, the real restart verb, the real capsule store and the real notice
// channel. Every one of these is the production module, not a stand in.
import { getGmuxCore } from '../sessions';
import { restartSession } from '../restart/restart';
import { RESTART_ON_MACHINE } from './remote-copy';
import { newestCapsuleFor, remoteCaptureArgs } from './remote-capsule';
import { hasSaidNotice, takePendingNotices } from '../notice';
import { remoteTmuxArgv } from './context';
// Phase 84 fix round. Steps 17 and 18 are the gate the spec asked for and the
// first build did not write: the two halves of the Directory field, and the
// four answers the folder picker's own read can give.
import { listRemoteDir } from './dir-list';
import { remoteMachineHome } from './remote-image';
// The folder this Mac keeps copies of session screens in. Step 14 makes it read
// only for the length of one end, inside this run's own isolated profile.
import { snapshotsDir } from '../restore/snapshots';
import { runRemoteRead } from './remote-run';
import { pollRemoteMachine, remoteStampArgs } from './remote-sessions';
import { provenanceOf } from '../manifest/contract';
import { createHash } from 'node:crypto';

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
  /**
   * Where that machine keeps its own session server.
   *
   * `build/with-scratch-machine.mjs` writes it and `build/probe-execplane.mjs`
   * does not, so it is optional. Only `plantInPane` reads it, and that helper
   * says in full why it needs it.
   */
  tmuxTmp?: string;
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
    // PHASE 73. The two connected-time cadences are turned OFF for the whole of
    // this gate, and the reason is a safety one rather than a tidiness one. IN
    // THIS HARNESS THE OTHER MACHINE IS THIS MAC, so a background harvest pass
    // would list and read the operator's own agent stores under their own home
    // directory. The gate drives both cadences explicitly instead, against a
    // scratch home inside this run's isolated root, so every byte it reads is a
    // byte it planted. It also makes steps 10e to 10h deterministic: a
    // background pass racing an explicit one wrote one of the four rows before
    // the explicit pass could, and the step then counted three.
    stopRemoteHarvest();
    stopRemoteStoreSync();
    const operatorBefore = operatorSessionCount();
    log(`profile ${iso.userData}, socket ${iso.socket}`);
    log('the connected-time harvest and copy cadences are off for this run');
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

    // PHASE 84 REVERSED THE LAUNCH RULE ON THE REMOTE SIDE, so this read is no
    // longer looking for a bare name. A pane on another machine does not get
    // that machine's login shell program list, and `-e PATH=` cannot give it
    // one, both measured by step 17c of `build/probe-execplane.mjs`. So the
    // absolute path this row records is also the command that ran, and what is
    // asserted here is that the machine's own list holds the session with the
    // agent stamp on it.
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
    // THE RESTORED PANE IS ALIVE AND IT IS RUNNING THE PATH THE ROW RECORDS.
    //
    // THIS IS THE GUARD FOR THE WORK LOSING DEFECT THE FIX ROUND CLOSED. Phase
    // 84 moved the CREATE onto the absolute path and left the RESTORE launching
    // by bare name. MEASURED on the operator's Mac Pro, 2026-08-18: a restored
    // claude session read `pane_start_command = claude --session-id <id>`,
    // `pane_dead=1`, `pane_dead_status=1` and an empty screen, while the
    // manifest row still read idle. The same failure reproduces on this
    // harness, because a pane here gets four directories and claude is at
    // /Users/gdc/.local/bin/claude, which is on none of them.
    //
    // The far side runs no `remain-on-exit`, so a dead pane takes its window and
    // its session with it. Both facts are read anyway, because a session that is
    // still listed and a pane that is alive are two different claims.
    await new Promise((r) => setTimeout(r, 2500));
    const restoredPane = (
      await execOn(ctx, [
        'display-message',
        '-p',
        '-t',
        agentOutcome.tmuxId,
        '#{pane_dead}|#{pane_start_command}'
      ]).catch(() => '')
    ).trim();
    const [restoredDead = '', restoredCommand = ''] = restoredPane.split('|');
    if (restoredPane === '') {
      fail(
        `${agentOutcome.tmuxId} was gone from ${ID} 2500 ms after the restore, ` +
          `which is what a program the machine could not find looks like`
      );
    }
    if (restoredDead !== '0') {
      fail(
        `the restored pane reads pane_dead=${JSON.stringify(restoredDead)} and ` +
          `it was started with ${JSON.stringify(restoredCommand)}`
      );
    }
    if (!restoredCommand.startsWith(onMachine.path)) {
      fail(
        `the restored pane was started with ${JSON.stringify(restoredCommand)} ` +
          `and the row records ${onMachine.bare} at ` +
          `${JSON.stringify(onMachine.path)}. A restore that launches by bare ` +
          `name is the defect the Phase 84 fix round closed.`
      );
    }
    log(
      `    the restored pane is alive and was started with ` +
        `${restoredCommand}`
    );

    // WHICH SENTENCE IS OWED DEPENDS ON ONE FACT ABOUT THE ROW, and the fact is
    // read off the row rather than assumed. Phase 84 item 9 puts a conversation
    // id on the launch line for the seven agents that take one, and that row's
    // provenance is `preassigned` with `exact` confidence, so the arming gate
    // arms it. An agent that takes no such flag records nothing and the gate
    // refuses it with `not-collected`.
    //
    // BOTH ARMS DEMAND A SENTENCE. Neither may report null, because a restore
    // that continues nothing and says nothing is the failure both sentences
    // exist to prevent. The arm taken is printed, so a reader of the log knows
    // which agent this machine had.
    const preAssigned = agentRecord.agentSessionId !== undefined;
    const owedRefusal = preAssigned ? 'not-typed-here' : 'not-collected';
    const owedNote = preAssigned ? RESUME_NOT_TYPED_HERE : RESUME_NOT_COLLECTED;
    if (agentOutcome.resumeRefusal !== owedRefusal) {
      fail(
        `the restore answered ${String(agentOutcome.resumeRefusal)} for a row ` +
          `whose conversation id Tortie ` +
          `${preAssigned ? 'chose itself' : 'never collected'}, and ` +
          `${owedRefusal} is what it owes`
      );
    }
    if (agentOutcome.resumeNote !== owedNote) {
      fail(
        `the restore result says ${JSON.stringify(agentOutcome.resumeNote)} ` +
          `rather than the sentence for ${owedRefusal}`
      );
    }
    if (agentOutcome.resumeArmed) {
      fail('the restore claims it continued a conversation');
    }
    log(
      `    and the restore brought it back as ${agentOutcome.tmuxId} with four ` +
        `stamps, answering ${owedRefusal} and saying the conversation does ` +
        `not come back`
    );
    await remoteKill(agentSession.id).catch(() => undefined);

    // --- 10e. The connected harvest, end to end (Phase 73, item 1) ----------
    //
    // WHAT IS REAL HERE AND WHAT IS SUBSTITUTED, said before the result.
    //
    // Real: the connection, the second door, the three scripts, the listing,
    // the record read, the base64 decode, the confirm, the decision, the
    // manifest write and the arming gate's answer. The `machine-facts` script
    // is run first, for real, and its answer is printed.
    //
    // Substituted: the far side's HOME, replaced with a scratch directory
    // inside this run's own isolated root. IN THIS HARNESS THE OTHER MACHINE IS
    // THIS MAC, so the real HOME is the operator's own home directory, and
    // planting agent records there to drive a harvest would write conversation
    // files into stores the operator's own agents read. The scratch home is a
    // real directory on the far side and every read below it goes over the
    // connection.
    //
    // The sessions are plain shells wearing an agent stamp. Launching four real
    // agents would write four real conversations into the operator's home for
    // no gain, because what this step proves is the READ path and not any
    // agent's own behaviour.
    const factsAnswer = await runRemoteRead(ctx, 'machine-facts', []);
    log(
      `10e. the machine says about itself: ` +
        `${factsAnswer.payload.split('\n').join(', ')}`
    );

    const scratchHome = join(iso.root, 'p73-remote-home');
    mkdirSync(scratchHome, { recursive: true });
    setRemoteHarvestFactsForHarness(ID, {
      home: scratchHome,
      env: {},
      platform: 'Darwin'
    });
    log(`    the harvest was pointed at ${scratchHome} on that machine`);

    /** One conversation id per agent, so a row can be traced to its record. */
    const plantedIds: Record<string, string> = {
      muse: '11111111-2222-4333-8444-000000000001',
      codex: '11111111-2222-4333-8444-000000000002',
      deepseek: '11111111-2222-4333-8444-000000000003',
      pi: '11111111-2222-4333-8444-000000000004'
    };
    const harvestAgents = ['muse', 'codex', 'deepseek', 'pi'] as const;
    const harvestSessions: Record<string, string> = {};

    for (const agent of harvestAgents) {
      const made = await remoteCreate({
        machineId: ID,
        name: `p73 ${agent}`,
        projectPath: '/tmp',
        cwd: '/tmp',
        agent: 'shell'
      });
      harvestSessions[agent] = made.id;
      const live = remoteSessionRow(made.id);
      if (live === null) fail(`the create for ${agent} left no row`);
      await execOn(ctx, remoteStampArgs(live.tmuxId, '@gmux-agent', agent));
    }
    await startRemotePoll(ID);

    // The records, planted into the directories THE PRODUCT ITSELF names. The
    // roots come from `remoteHarvestRoots`, so a store layout that moved would
    // fail this step rather than being quietly worked around.
    const now = Date.now();
    const two = (n: number): string => String(n).padStart(2, '0');
    for (const agent of harvestAgents) {
      const sessionId = harvestSessions[agent] ?? '';
      const live = remoteSessionRow(sessionId);
      if (live === null) fail(`${agent}'s row went away before it was planted`);
      const plan = remoteHarvestRoots(agent, live.cwd, {
        home: scratchHome,
        env: {},
        platform: 'Darwin'
      });
      if (plan === null) fail(`the product names no store for ${agent}`);
      const root = plan.roots[0] ?? '';
      const id = plantedIds[agent] ?? '';
      const when = new Date(now);
      const shard = `${String(when.getFullYear())}/${two(when.getMonth() + 1)}/${two(when.getDate())}`;
      let path = '';
      let body = '';
      if (agent === 'muse') {
        path = join(root, shard, id, 'session.jsonl');
        body =
          `${JSON.stringify({ payload_type: 'session.open' })}\n` +
          `${JSON.stringify({
            payload_type: 'runtime.session.route_facts',
            payload: { record: { tmux_pane: `${live.tmuxId}:@1.%1` } }
          })}\n`;
      } else if (agent === 'codex') {
        const stamp =
          `${String(when.getFullYear())}-${two(when.getMonth() + 1)}-${two(when.getDate())}` +
          `T${two(when.getHours())}-${two(when.getMinutes())}-${two(when.getSeconds())}`;
        path = join(root, shard, `rollout-${stamp}-${id}.jsonl`);
        body = `${JSON.stringify({ payload: { cwd: live.cwd } })}\n`;
      } else if (agent === 'deepseek') {
        path = join(root, `${id}.json`);
        body = JSON.stringify({ metadata: { workspace: live.cwd } });
      } else {
        const iso8601 = new Date(now).toISOString().replace(/[:.]/g, '-');
        path = join(root, `${iso8601}_${id}.jsonl`);
        body = `${JSON.stringify({ type: 'session', cwd: live.cwd })}\n`;
      }
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, body, 'utf8');
    }
    log(`    four records were planted under ${scratchHome}`);

    const factsBefore = remoteHarvestFacts();
    const startedHarvest = Date.now();
    const harvested = await harvestMachineOnce(ID);
    const harvestMs = Date.now() - startedHarvest;
    const factsAfter = remoteHarvestFacts();
    if (harvested !== 4) {
      fail(
        `the harvest wrote ${String(harvested)} conversation id(s) and four ` +
          `records were planted. The claims it holds are ` +
          `${remoteHarvestClaims()
            .map((one) => `${one.sessionId}=${one.conversationId}`)
            .join(', ')}`
      );
    }
    log(
      `    one pass over four sessions took ${String(harvestMs)} ms, sent ` +
        `${String(factsAfter.commandsSent - factsBefore.commandsSent)} read(s) ` +
        `and carried ${String(factsAfter.bytesRead - factsBefore.bytesRead)} ` +
        `byte(s) of payload`
    );

    // The rows, read back out of the real database in this real process.
    for (const agent of harvestAgents) {
      const sessionId = harvestSessions[agent] ?? '';
      const row = remoteRecordOf(sessionId);
      if (row === null) fail(`${agent}'s row is gone`);
      if (row.agentSessionId !== plantedIds[agent]) {
        fail(
          `${agent}'s row records conversation ` +
            `${JSON.stringify(String(row.agentSessionId))} and the planted ` +
            `record carried ${String(plantedIds[agent])}`
        );
      }
      const prov = provenanceOf(row.resumeProvenance);
      if (prov.source !== 'remote-store-harvest') {
        fail(`${agent}'s row records source ${String(prov.source)}`);
      }
      if (prov.machineId !== ID) {
        fail(`${agent}'s row records machine ${String(prov.machineId)}`);
      }
      if ((row.resumeArgv ?? []).length === 0) {
        fail(`${agent}'s row has no resume command`);
      }
    }
    log(
      `    all four rows name ${ID} and record remote-store-harvest, with a ` +
        `resume command each`
    );

    // --- 10f. The arming matrix, four rows, from the real gate --------------
    //
    // This is the honest headline of the whole rung: one agent of the thirteen
    // gets an armed conversation resume on another machine, and it is muse.
    const armingRows: string[] = [];
    for (const agent of harvestAgents) {
      const sessionId = harvestSessions[agent] ?? '';
      const row = remoteRecordOf(sessionId);
      if (row === null) fail(`${agent}'s row is gone`);
      const prov = provenanceOf(row.resumeProvenance);
      const verdict = resumeArmingVerdict({
        machineId: ID,
        targetMachineId: ID,
        agentKeepsConversation: true,
        resumeArgvLength: (row.resumeArgv ?? []).length,
        provenance: prov
      });
      armingRows.push(
        `${agent}: key=${String(prov.key)} confidence=${prov.confidence} ` +
          `arm=${String(verdict.arm)} refusal=${String(verdict.refusal)}`
      );
      const shouldArm = agent === 'muse';
      if (verdict.arm !== shouldArm) {
        fail(
          `the arming gate answered ${String(verdict.arm)} for ${agent} and it ` +
            `should have answered ${String(shouldArm)}`
        );
      }
      if (!shouldArm && verdict.refusal !== 'weaker-source') {
        fail(
          `${agent} was refused with ${String(verdict.refusal)} rather than ` +
            `weaker-source`
        );
      }
    }
    log(`10f. the arming matrix:`);
    for (const line of armingRows) log(`      ${line}`);

    // --- 10g. Connected only, watched refusing ------------------------------
    //
    // The link is cut on purpose and a second pass is asked for. What this step
    // holds is that NOTHING WAS SENT, which is a different fact from "no claim
    // was written": a pass that read everything and found nothing also writes
    // no claim.
    const readsBeforeCut = remoteHarvestFacts().commandsSent;
    markMachineQuiet(ID, 'the smoke cut it on purpose');
    const cutHarvest = await harvestMachineOnce(ID);
    const cutSync = await syncMachineOnce(ID);
    if (cutHarvest !== 0 || cutSync !== 0) {
      fail(
        `a pass over a machine that is not answering wrote ` +
          `${String(cutHarvest)} id(s) and ${String(cutSync)} copy(s)`
      );
    }
    if (remoteHarvestFacts().commandsSent !== readsBeforeCut) {
      fail('a pass over a machine that is not answering sent a command');
    }
    log(
      `10g. with the machine not answering, the harvest and the copy both sent ` +
        `zero commands and wrote nothing`
    );
    // The link is brought back by a COMPLETED LIST rather than by asking the
    // feed to start again. `startMachineFeed` is a no-op for a machine that
    // already has one, so on its own it leaves the link reading quiet and every
    // read below would be refused for the right reason at the wrong moment.
    await pollRemoteMachine(ID);

    // --- 10h. The conversation copy, and the staleness it promises ----------
    setRemoteHarvestFactsForHarness(ID, {
      home: scratchHome,
      env: {},
      platform: 'Darwin'
    });
    const copied = await syncMachineOnce(ID);
    if (copied < 1) {
      const claimLines = remoteHarvestClaims()
        .map((one) => `${one.sessionId}=${one.storePath}`)
        .join(', ');
      fail(
        `the copy pass brought nothing home. The claims it had were ` +
          `[${claimLines}] and the machine link reads ` +
          `${remoteMachineFacts(ID).answering ? 'answering' : 'not answering'}`
      );
    }
    const museSession = harvestSessions['muse'] ?? '';
    const copyRecord = remoteStoreRecordOf(museSession);
    let checkedSession = museSession;
    let checkedRecord = copyRecord;
    if (checkedRecord === null) {
      // At most two sessions are copied in one pass and the order breaks on the
      // session id, so muse is not always one of them. Any copied session
      // proves the same thing.
      for (const agent of harvestAgents) {
        const id = harvestSessions[agent] ?? '';
        const record = remoteStoreRecordOf(id);
        if (record !== null && record.outcome === 'copied') {
          checkedSession = id;
          checkedRecord = record;
          break;
        }
      }
    }
    if (checkedRecord === null || checkedRecord.outcome !== 'copied') {
      fail('no conversation was copied home in one piece');
    }
    const localCopy = join(
      remoteStoreSessionDir(ID, checkedSession),
      checkedRecord.name
    );
    const localSum = createHash('sha256')
      .update(readFileSync(localCopy))
      .digest('hex');
    if (localSum !== checkedRecord.remoteSha256) {
      fail(
        `the copy on this Mac hashes to ${localSum} and the machine said ` +
          `${String(checkedRecord.remoteSha256)}`
      );
    }
    const syncedFirst = conversationSyncedAt(checkedSession);
    if (syncedFirst === null) fail('a copied conversation reports no instant');
    log(
      `10h. ${checkedRecord.name} came home to ${localCopy}, ` +
        `${String(checkedRecord.localBytes)} bytes, and both sides hash to ` +
        `${localSum.slice(0, 16)}`
    );

    // Staleness, measured rather than asserted. The machine stops answering,
    // another pass is asked for, and the instant a person reads does not move.
    markMachineQuiet(ID, 'the smoke cut it on purpose');
    await syncMachineOnce(ID);
    const syncedAfter = conversationSyncedAt(checkedSession);
    if (syncedAfter !== syncedFirst) {
      fail(
        `the last copy instant moved from ${String(syncedFirst)} to ` +
          `${String(syncedAfter)} while the machine was not answering`
      );
    }
    log(
      `     with the machine not answering the instant is still ` +
        `${String(syncedFirst)}, so the sentence a person reads gets older ` +
        `rather than being refreshed`
    );
    await pollRemoteMachine(ID);

    // --- 10i. The claim count either side of a connection that moved --------
    //
    // PHASE 73 FIX ROUND. Property 2 of connected only says a claim never
    // outlives the connection that produced it. Step 10g proves the read half,
    // being that a machine which is not answering is asked nothing. This proves
    // the memory half, and it proves it as a NUMBER read out of the live claim
    // store rather than as an argument from the code.
    //
    // The connection is moved the way the product moves it, by preparing the
    // machine again, which is what a reconnect does. Then the same function the
    // cadence calls at the top of every tick is called once, and the claim
    // count is read either side of it.
    const claimsBeforeMove = remoteHarvestFacts().claims;
    if (claimsBeforeMove < 1) {
      fail('the harvest held no claim, so there was nothing to drop');
    }
    const generationBefore = machineGeneration(ID).generation;
    const reconnected = await prepareMachine({
      machineId: ID,
      fields,
      tortieHostKeys: machineHostKeysPath()
    });
    if (reconnected.class !== 'prepared') {
      fail(
        `the reconnect answered ${reconnected.class}: ${reconnected.detail}`
      );
    }
    const generationAfter = machineGeneration(ID).generation;
    if (generationAfter === generationBefore) {
      fail(
        `a reconnect left the connection number at ` +
          `${String(generationBefore)}, so nothing moved`
      );
    }
    const droppedClaims = dropClaimsOfMovedConnections();
    const claimsAfterMove = remoteHarvestFacts().claims;
    if (droppedClaims !== claimsBeforeMove || claimsAfterMove !== 0) {
      fail(
        `the harvest held ${String(claimsBeforeMove)} claim(s) under ` +
          `connection ${String(generationBefore)}, the connection became ` +
          `${String(generationAfter)}, and it dropped ` +
          `${String(droppedClaims)} leaving ${String(claimsAfterMove)}`
      );
    }
    log(
      `10i. connection ${String(generationBefore)} became ` +
        `${String(generationAfter)}, and the harvest went from ` +
        `${String(claimsBeforeMove)} claim(s) to ${String(claimsAfterMove)}`
    );

    for (const agent of harvestAgents) {
      await remoteKill(harvestSessions[agent] ?? '').catch(() => undefined);
    }

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

    // =======================================================================
    // PHASE 84. Steps 12 to 16, the three verbs that could lose work.
    // =======================================================================
    //
    // WHY THEY DRIVE THE REAL CORE AND NOT THIS FILE'S OWN HANDLE. Items 1, 2
    // and 3 are three lines of ORDER inside `../sessions/core.ts`, and an order
    // is only proved by the thing that has it. So the harness hands its manifest
    // back, boots the product's own core, and asks that core to restart, end and
    // remove sessions exactly as the buttons do.
    //
    // WHY A SECOND MACHINE. Step 10d removed the first one from the machines
    // file and tombstoned every row on it, which is what that step is about.
    // These five steps need a machine that is still there, so they add, confirm
    // and prepare one of their own, against the same scratch sshd.
    const LIFE_ID = 'p84lifecycle';
    addMachineRow({
      id: LIFE_ID,
      label: 'Phase 84 Lifecycle',
      color: 'blue',
      host: fields.host,
      ...(fields.user === null ? {} : { user: fields.user }),
      ...(fields.port === null ? {} : { port: fields.port }),
      ...(fields.remoteTmuxPath === null
        ? {}
        : { remoteTmuxPath: fields.remoteTmuxPath })
    });
    reloadMachines();
    confirmAsAPerson(LIFE_ID, fields);

    // The core opens its own manifest at the same path this harness just closed,
    // installs it for the machine layer, and is the object every step below
    // talks to. Nothing else in this file uses `manifest` after this line.
    const core = await getGmuxCore();
    const lifePrepared = await prepareMachine({
      machineId: LIFE_ID,
      fields,
      tortieHostKeys: machineHostKeysPath()
    });
    if (lifePrepared.class !== 'prepared') {
      fail(`the lifecycle machine answered ${lifePrepared.class}: ${lifePrepared.detail}`);
    }
    await startRemotePoll(LIFE_ID);
    const lifeCtx = machineContext(LIFE_ID) as RemoteMachineContext;

    /** Every session this profile holds that is NOT on a machine. */
    const localSessionCount = (): number =>
      core.listSessions().filter((one) => one.machine === undefined).length;

    /** Every name the machine's own server lists right now. */
    const machineList = async (): Promise<RemoteListRow[]> =>
      (await execOn(lifeCtx, remoteListArgs()))
        .split('\n')
        .map(parseRemoteListLine)
        .filter((one): one is RemoteListRow => one !== null);

    /** Is this Tortie id still on that machine's own list? */
    const stillOnMachine = async (sessionId: string): Promise<boolean> =>
      (await machineList()).some((one) => one.gmuxId === sessionId);

    /** One create on the lifecycle machine, through the product's own path. */
    const createLife = async (name: string): Promise<string> => {
      const made = await core.createSession({
        machineId: LIFE_ID,
        name,
        projectPath: '/tmp',
        cwd: '/tmp',
        agent: 'shell'
      });
      return made.id;
    };

    /**
     * Plant a value in one remote pane, as a PERSON WOULD.
     *
     * THIS IS HARNESS SETUP AND IT DELIBERATELY GOES AROUND EVERY PRODUCT PATH.
     * `send-keys` is on `VERBS_THIS_RUNG_REFUSES` forever, because a person's
     * keystrokes belong on the attach plane and never on the exec plane, and
     * `./exec-smoke.ts` watches that refusal fire. What this helper needs is a
     * person at the keyboard, and no product path in this harness has one.
     *
     * IT RUNS THE COMMAND ON THIS MAC, and that is the whole reason it is
     * allowed to exist. On this harness the other machine IS this Mac, over a
     * scratch sshd, and `remoteTmuxArgv` names that machine's own program and
     * that machine's own scratch socket. So the argv can be run here with
     * `execFileSync` and it reaches exactly the pane it would have reached over
     * the connection. Nothing in the product is asked to carry it, so
     * `execRemoteShell` keeps the five callers `build/conformance-machines.mjs`
     * allows it, and a keystroke still has no route through the exec plane.
     *
     * A LOOPBACK ONLY HELPER, said plainly. Point this harness at a machine that
     * is not this Mac and this helper stops working, because the command would
     * run here and the pane would be over there. Every step that uses it says so.
     *
     * It retries, because a pane whose shell has not finished starting swallows
     * what is typed at it. The value is read back through `capture-pane`, which
     * IS on the ledger as a read, so the confirmation goes through the product's
     * own door.
     */
    const plantInPane = async (
      tmuxId: string,
      token: string
    ): Promise<boolean> => {
      const argv = remoteTmuxArgv(lifeCtx, [
        'send-keys',
        '-t',
        tmuxId,
        `printf '${token}\\n'`,
        'Enter'
      ]);
      // The machine's own session directory, which is the whole reason this
      // works. Without it the command would reach this Mac's own default
      // directory, which holds a different server and not this pane.
      const farEnv = {
        ...process.env,
        ...(carriage.tmuxTmp === undefined
          ? {}
          : { TMUX_TMPDIR: carriage.tmuxTmp })
      };
      for (let attempt = 0; attempt < 20; attempt += 1) {
        try {
          execFileSync(argv[0] ?? '', argv.slice(1), {
            stdio: 'ignore',
            env: farEnv
          });
        } catch {
          /* a pane that is not ready yet, and the read below is what decides */
        }
        await new Promise((r) => setTimeout(r, 500));
        const screen = await execOn(
          lifeCtx,
          remoteCaptureArgs(tmuxId, 200)
        ).catch(() => '');
        // The command line that typed it is on the screen too, so the token is
        // only proof when it stands on a line of its own.
        if (screen.split('\n').some((line) => line.trim() === token)) return true;
      }
      return false;
    };

    // --- 12. A restart of a row on a machine is refused, and nothing moves ----
    //
    // The defect was one composition. `restartSession` built a create with no
    // machine on it, so the replacement started on THIS Mac, and step 4 of the
    // restart then hard deleted the row for the session still running there.
    const restartId = await createLife('p84 restart');
    const localBeforeRestart = localSessionCount();
    let restartRefusal = '';
    try {
      await restartSession(core, restartId);
    } catch (err) {
      restartRefusal = (err as Error).message;
    }
    if (!restartRefusal.includes(RESTART_ON_MACHINE)) {
      fail(
        `a restart of a session on a machine answered "${restartRefusal}" ` +
          `instead of refusing`
      );
    }
    const restartRow = core.manifest.getSession(restartId);
    if (restartRow === undefined) {
      fail('the refused restart removed the row it was aimed at');
    }
    if (restartRow.status === 'discarded' || restartRow.status === 'exited') {
      fail(`the refused restart left the row reading ${restartRow.status}`);
    }
    if (restartRow.machineId !== LIFE_ID) {
      fail(
        `the refused restart moved the row from ${LIFE_ID} to ` +
          `${String(restartRow.machineId)}`
      );
    }
    if (!(await stillOnMachine(restartId))) {
      fail('the refused restart ended the session on the machine');
    }
    if (localSessionCount() !== localBeforeRestart) {
      fail(
        `the refused restart created ${String(
          localSessionCount() - localBeforeRestart
        )} session(s) on this Mac`
      );
    }
    log(
      `12. a restart of a session on a machine was refused, the row still ` +
        `reads ${restartRow.status} on ${LIFE_ID}, the session is still on ` +
        `that machine, and this Mac still holds ` +
        `${String(localBeforeRestart)} local session(s)`
    );

    // --- 13. End takes the copy BEFORE it kills ------------------------------
    //
    // The value is planted in the pane and appears nowhere else in this run. A
    // copy holding it cannot have been taken after the kill, because there is
    // no pane to read after the kill. That is the whole proof of the order.
    const endId = await createLife('p84 end');
    const endRow = remoteSessionRow(endId);
    if (endRow === null) fail('the create for step 13 produced no row');
    const token = `TORTIE-P84-${randomBytes(6).toString('hex').toUpperCase()}`;
    if (!(await plantInPane(endRow.tmuxId, token))) {
      fail(
        `the harness could not get ${token} onto the screen of ${endRow.tmuxId}, ` +
          `so step 13 would have measured nothing`
      );
    }
    await core.killSession(endId);
    const capsule = newestCapsuleFor(endId);
    if (capsule === null) {
      fail(
        'ending a session on a machine wrote no copy of its screen. The end ' +
          'confirm promises one before anything is stopped.'
      );
    }
    const body = readFileSync(capsule.path, 'utf8');
    if (!body.includes(token)) {
      fail(
        `the copy taken at the end does not hold ${token}, so it is older ` +
          `than the last thing the session printed`
      );
    }
    if (await stillOnMachine(endId)) {
      fail('the end left the session running on the machine');
    }
    log(
      `13. the end wrote a copy of ${String(capsule.bytes)} byte(s) holding ` +
        `${token}, and only then stopped the session on ${LIFE_ID}`
    );

    // --- 14. A copy that cannot be taken never cancels the end ---------------
    //
    // TWO DEVIATIONS FROM THE SPEC'S WORDING, AND BOTH ARE NAMED RATHER THAN
    // HIDDEN. The spec asked for a machine made unreachable.
    //
    // A machine that cannot be reached cannot be sent `kill-session` either, so
    // the end would fail and the step could not check that the end still
    // happened. That is the first deviation and the first build of this step
    // already carried it.
    //
    // The first build then ended the pane out of band and let the read fail on
    // a pane that was gone. MEASURED by the Phase 84 verifier and it does not
    // work: a completed list runs before the end reaches `remoteKill`, the row
    // leaves the machine's own list, and `boundRemoteRow` refuses the kill with
    // the `TARGET_UNBOUND` sentence. That refusal is correct. Tortie will not
    // send a command aimed at a session no completed list reported. So the step
    // measured a refusal rather than an end, and everything after it never ran.
    //
    // WHAT IS DRIVEN NOW is the second of the two failures
    // `captureRemoteSessionNow` can have. The screen is read and the copy
    // cannot be KEPT, because the folder this Mac writes copies into is made
    // read only for the length of the end. The pane is alive the whole time, so
    // the kill goes through the ordinary path with the ordinary binding, and
    // what is measured is the promise being withdrawn in words while the end
    // still happens.
    const orphanId = await createLife('p84 orphan');
    const orphanRow = remoteSessionRow(orphanId);
    if (orphanRow === null) fail('the create for step 14 produced no row');
    // A VALUE ON THE SCREEN FIRST, and the step is vacuous without it. MEASURED
    // by the first run of this step: a pane that has printed nothing yet is
    // trimmed to zero bytes, `storeCapsuleText` returns without writing and
    // without throwing, and the end posts no notice because nothing failed.
    // That is the correct answer for a screen with nothing on it, and it is not
    // what this step is about. This step is about a write that was attempted
    // and could not be kept, so the pane is given something to hold first.
    const orphanToken = `TORTIE-P84-${randomBytes(6).toString('hex').toUpperCase()}`;
    if (!(await plantInPane(orphanRow.tmuxId, orphanToken))) {
      fail(
        `the harness could not get ${orphanToken} onto the screen of ` +
          `${orphanRow.tmuxId}, so step 14 would have measured an empty screen ` +
          `rather than a copy that could not be kept`
      );
    }
    // The notice channel latches one notice per kind per run, so this step is
    // only worth anything while nothing has spent that latch. Nothing should
    // have, because step 13's copy was written and asserted. If something did,
    // the step says so rather than passing on an empty read.
    if (hasSaidNotice('snapshot-failed')) {
      fail(
        'something earlier in this run already posted a snapshot-failed ' +
          'notice, so the latch is spent and step 14 would measure nothing'
      );
    }
    // INSIDE THIS RUN'S OWN ISOLATED PROFILE, never the operator's. `iso` is the
    // isolation guard's answer and step 10d already read `iso.userData` above.
    const copiesDir = snapshotsDir();
    if (!copiesDir.startsWith(iso.userData)) {
      fail(
        `the copies folder is ${copiesDir}, which is not inside this run's own ` +
          `profile at ${iso.userData}`
      );
    }
    const copiesMode = statSync(copiesDir).mode & 0o777;
    // WHAT IS ON DISK BEFORE THE END, so the check after it is about the end's
    // own copy and not about every copy of that session. The background cadence
    // in `./remote-capsule.ts` keeps copies of a connected machine's screens on
    // its own timer, and one of those can land between the create and the end.
    // Comparing the generation number rather than asking whether any copy exists
    // is what makes this step immune to that timer.
    const copyBefore = newestCapsuleFor(orphanId)?.generation ?? 0;
    chmodSync(copiesDir, 0o500);
    try {
      await core.killSession(orphanId);
    } finally {
      chmodSync(copiesDir, copiesMode);
    }
    // No renderer is listening in this harness, so every notice posted so far
    // is still queued. This takes the whole queue and looks for the one the end
    // was supposed to post.
    const notices = takePendingNotices();
    const said = notices.find(
      (one) =>
        one.kind === 'snapshot-failed' &&
        one.atSessionEnd === true &&
        one.remote === true
    );
    if (said === undefined) {
      fail(
        `ending a session whose screen could not be read posted ` +
          `${String(notices.length)} notice(s) and none of them said the copy ` +
          `was not taken`
      );
    }
    if (said.kind === 'snapshot-failed' && said.sessionName !== 'p84 orphan') {
      fail(`the notice named ${String(said.sessionName)} rather than the session`);
    }
    const orphanAfter = remoteSessionRow(orphanId);
    if (orphanAfter === null || orphanAfter.status !== 'exited') {
      fail(
        `the end did not finish. The row reads ` +
          `${String(orphanAfter?.status)} rather than exited`
      );
    }
    if (await stillOnMachine(orphanId)) {
      fail('the end left the session on the machine');
    }
    const copyAfter = newestCapsuleFor(orphanId)?.generation ?? 0;
    if (copyAfter !== copyBefore) {
      fail(
        `the copies of ${orphanId} went from generation ` +
          `${String(copyBefore)} to ${String(copyAfter)}, so the end wrote one ` +
          `after all and step 14 measured an ordinary end`
      );
    }
    log(
      `14. a copy that could not be kept did not cancel the end. The copies of ` +
        `${orphanId} are still at generation ${String(copyAfter)}, the session ` +
        `is gone from ${LIFE_ID}, the row reads exited, and the notice said so.`
    );

    // --- 15. Remove sticks in the run you did it in --------------------------
    //
    // Read back from a SECOND handle opened on the file, not from the one the
    // core holds. The defect was that nothing durable was written at all, and a
    // read through the writer's own memory would not have caught it.
    core.removeSession(endId);
    const freshHandle = new ManifestStore(manifestPath);
    let readBack: string | undefined;
    try {
      readBack = freshHandle.getSession(endId)?.status;
    } finally {
      freshHandle.close();
    }
    if (readBack !== 'discarded') {
      fail(
        `after Remove, a fresh handle on ${manifestPath} reads ` +
          `${String(readBack)} rather than discarded`
      );
    }
    if (remoteSessionRow(endId) !== null) {
      fail('Remove left the row in memory');
    }
    log(
      `15. Remove wrote the tombstone. A second handle on the file reads ` +
        `discarded, and the row is gone from memory`
    );

    // --- 16. The same four verbs on this Mac, unchanged ----------------------
    //
    // The regression guard. Everything above is a branch in code every session
    // goes through, so a change that fixes a machine and breaks this Mac must
    // not pass, and it has to fail in the SAME run.
    const localMade = await core.createSession({
      name: 'p84 local',
      projectPath: '/tmp',
      cwd: '/tmp',
      agent: 'shell'
    });
    if (core.manifest.getSession(localMade.id) === undefined) {
      fail('a create on this Mac wrote no row');
    }
    const restarted = await restartSession(core, localMade.id);
    if (core.manifest.getSession(localMade.id) !== undefined) {
      fail('a restart on this Mac left the original row behind');
    }
    const survivorRow = core.manifest.getSession(restarted.session.id);
    if (survivorRow === undefined) {
      fail('a restart on this Mac wrote no row for the replacement');
    }
    if (survivorRow.name !== 'p84 local') {
      fail(`the replacement is called ${survivorRow.name}`);
    }
    await core.killSession(restarted.session.id);
    if (core.manifest.getSession(restarted.session.id)?.status !== 'exited') {
      fail(
        `an end on this Mac left the row reading ` +
          `${String(core.manifest.getSession(restarted.session.id)?.status)}`
      );
    }
    core.removeSession(restarted.session.id);
    const localHandle = new ManifestStore(manifestPath);
    let localReadBack: string | undefined;
    try {
      localReadBack = localHandle.getSession(restarted.session.id)?.status;
    } finally {
      localHandle.close();
    }
    if (localReadBack !== 'discarded') {
      fail(
        `after Remove on this Mac, a fresh handle reads ` +
          `${String(localReadBack)} rather than discarded`
      );
    }
    log(
      `16. create, restart, end and remove on this Mac all still land in the ` +
        `session list, and the removed row reads discarded on disk`
    );

    // --- 17. The Directory field, both halves (item 5) ----------------------
    //
    // The spec's own verification plan asked for these two and the first build
    // did not write them, so both behaviours were correct and unwatched.
    //
    // 17a. AN EMPTY FIELD LANDS IN THAT MACHINE'S OWN HOME. Before this phase
    // an empty field sent this Mac's project path, which names nothing over
    // there. Now no folder is sent at all and tmux's own fallback decides, and
    // the fallback is the home directory of the account the connection signed in
    // as. The home is read from the machine's own `machine-facts` answer rather
    // than from this Mac's environment, so the two sides are not being compared
    // against one guess.
    const farHome = await remoteMachineHome(lifeCtx);
    if (!farHome.startsWith('/')) {
      fail(`the machine answered ${JSON.stringify(farHome)} for its own home`);
    }
    const homeMade = await core.createSession({
      machineId: LIFE_ID,
      name: 'p84 no folder',
      projectPath: '/tmp',
      agent: 'shell'
    });
    const homeRow = core.manifest.getSession(homeMade.id);
    if (homeRow === undefined) fail('the create with no folder wrote no row');
    if (homeRow.cwd !== '') {
      fail(
        `the row for a create with no folder records ` +
          `${JSON.stringify(homeRow.cwd)} rather than the empty string. The ` +
          `row records what Tortie sent, and it sent no folder.`
      );
    }
    const homeListed = (await machineList()).find(
      (one) => one.gmuxId === homeMade.id
    );
    if (homeListed === undefined) {
      fail('the create with no folder is not on the machine’s own list');
    }
    if (homeListed.cwd !== farHome) {
      fail(
        `the session with no folder is in ${JSON.stringify(homeListed.cwd)} ` +
          `and that machine says its home is ${JSON.stringify(farHome)}`
      );
    }
    log(
      `17a. a create with no folder recorded the empty string and landed in ` +
        `${farHome}, which is the home that machine states for itself`
    );

    // 17b. A FOLDER THAT IS NOT THERE IS REFUSED BEFORE ANY CREATE LINE.
    //
    // MEASURED 2026-08-18 on tmux 3.6a: `new-session -c <a path that is not
    // there>` exits 0, prints a session id, makes a live session and silently
    // puts the pane in the home directory. So the only place this can be caught
    // is before the line is composed, and the proof that it was caught there is
    // that the machine's own session count did not move.
    const missingDir = `/tmp/p84-not-there-${randomBytes(6).toString('hex')}`;
    const beforeMissing = (await machineList()).length;
    let missingRefusal = '';
    try {
      await core.createSession({
        machineId: LIFE_ID,
        name: 'p84 missing folder',
        projectPath: '/tmp',
        cwd: missingDir,
        agent: 'shell'
      });
    } catch (err) {
      missingRefusal = (err as Error).message;
    }
    if (!missingRefusal.includes(REMOTE_DIR_MISSING)) {
      fail(
        `a create naming a folder that is not there answered ` +
          `${JSON.stringify(missingRefusal)} rather than the sentence for a ` +
          `folder that is not there`
      );
    }
    const afterMissing = (await machineList()).length;
    if (afterMissing !== beforeMissing) {
      fail(
        `the refused create moved that machine from ` +
          `${String(beforeMissing)} to ${String(afterMissing)} session(s), so ` +
          `it was refused after a session had already been made`
      );
    }
    log(
      `17b. a create naming ${missingDir} was refused before anything was ` +
        `composed, and that machine still holds ${String(afterMissing)} ` +
        `session(s)`
    );

    // --- 18. The folder picker's own read (item 6) --------------------------
    //
    // `machines:listDir` is a new channel and `dir-list` is the eighth frozen
    // script, and the first build of this phase put neither of them under a
    // gate. Four answers are driven here, being the three the machine can give
    // and the one Tortie gives when it cannot ask.
    const pickRoot = join(iso.userData, 'p84-pick');
    mkdirSync(join(pickRoot, 'beta'), { recursive: true });
    mkdirSync(join(pickRoot, 'alpha'), { recursive: true });
    writeFileSync(join(pickRoot, 'a-file.txt'), 'not a folder\n');
    const picked = await listRemoteDir({ machineId: LIFE_ID, path: pickRoot });
    if (picked.refusal !== null) {
      fail(`the picker read of ${pickRoot} answered ${picked.refusal}`);
    }
    const names = picked.entries.map((one) => one.name);
    if (names.join(',') !== 'alpha,beta') {
      fail(
        `the picker listed ${JSON.stringify(names)}. It owes exactly the two ` +
          `folders, in name order, and never the file beside them.`
      );
    }
    if (picked.total !== 2) {
      fail(`the picker counted ${String(picked.total)} folder(s) rather than 2`);
    }
    if (picked.parent !== iso.userData) {
      fail(
        `the picker offers ${String(picked.parent)} as the folder one level up ` +
          `from ${pickRoot}`
      );
    }
    const missingListing = await listRemoteDir({
      machineId: LIFE_ID,
      path: missingDir
    });
    if (missingListing.refusal !== 'missing') {
      fail(
        `the picker answered ${String(missingListing.refusal)} for a folder ` +
          `that is not there`
      );
    }
    if (missingListing.refusalText !== REMOTE_DIR_MISSING) {
      fail('the picker drew no sentence for a folder that is not there');
    }
    const fileListing = await listRemoteDir({
      machineId: LIFE_ID,
      path: join(pickRoot, 'a-file.txt')
    });
    if (fileListing.refusal !== 'notdir') {
      fail(
        `the picker answered ${String(fileListing.refusal)} for a path that is ` +
          `a file`
      );
    }
    const unknownListing = await listRemoteDir({
      machineId: 'p84-no-such-machine',
      path: '/tmp'
    });
    if (unknownListing.refusal !== 'unreachable') {
      fail(
        `the picker answered ${String(unknownListing.refusal)} for a machine ` +
          `Tortie has not signed in to`
      );
    }
    log(
      `18. the picker read ${String(picked.total)} folder(s) in ${pickRoot} and ` +
        `never the file beside them, and it drew a sentence for a folder that ` +
        `is not there, for a path that is a file, and for a machine it cannot ` +
        `reach`
    );

    // --- 19. PHASE 85. The dot tells the truth on a connected machine --------
    //
    // THE CENTRAL PROOF OF THE PHASE, and nothing here calls the poll by hand.
    // A session is made on the lifecycle machine, a line is planted in its pane
    // the way a person would type one, and the row is watched until it reads
    // `running` and then until it reads `idle` again. Both numbers are printed.
    //
    // Before Phase 85 this could not pass for two separate reasons, and both had
    // to be fixed for it to pass now. The list read `#{session_activity}`, which
    // does not move when a detached session prints. And a machine on a live
    // connection issued no list at all unless the machine reported an event, so
    // there was nothing to re-read the field with.
    const statusId = await createLife('p85 status');
    const statusRow = remoteSessionRow(statusId);
    if (statusRow === null) fail('the create for step 19 produced no row');
    // A first pause, so the shell's own prompt is out before the row is
    // watched. It is not on its own enough, and the wait further down is what
    // settles the row. See the comment there for the measurement.
    await new Promise((r) => setTimeout(r, 2_000));

    // A LIVE CONNECTION, or this step measures the fallback timer instead.
    const connected = await (async (): Promise<boolean> => {
      const until = Date.now() + 20_000;
      while (Date.now() < until) {
        if (remoteMachineFacts(LIFE_ID).onControl) return true;
        await new Promise((r) => setTimeout(r, 250));
      }
      return false;
    })();
    if (!connected) {
      fail(
        `${LIFE_ID} never reached a live connection, so step 19 would measure ` +
          `the fallback timer rather than the status list Phase 85 added`
      );
    }
    const feedNow = remoteMachineFacts(LIFE_ID);
    if (feedNow.timerArmed) {
      fail(
        `${LIFE_ID} has the fallback timer armed beside a live connection, ` +
          `which is the Phase 71 property and it must still hold`
      );
    }
    if (!feedNow.statusTimerArmed) {
      fail(
        `${LIFE_ID} is on a live connection and has no status list armed, so ` +
          `nothing would re-read what its sessions are doing`
      );
    }

    /** Both activity fields for this session, through the product's own call. */
    const activityFields = async (): Promise<{
      session: number;
      window: number;
    }> => {
      const printed = await execOn(lifeCtx, [
        'list-sessions',
        '-F',
        '#{q:@gmux-id} #{q:session_activity} #{q:window_activity}'
      ]);
      for (const one of printed.split('\n')) {
        const parts = splitQuotedLine(one);
        if (parts[0] !== statusId) continue;
        return { session: Number(parts[1]), window: Number(parts[2]) };
      }
      return { session: 0, window: 0 };
    };

    /** Watch the row until it reads this status, and count the lists that ran. */
    const watchFor = async (
      want: string,
      upToMs: number,
      lists: Set<number>
    ): Promise<number> => {
      const from = Date.now();
      while (Date.now() - from < upToMs) {
        lists.add(remoteMachineFacts(LIFE_ID).snapshotAt);
        const row = remoteSessions().find((one) => one.id === statusId);
        if (row?.status === want) return Date.now() - from;
        await new Promise((r) => setTimeout(r, 250));
      }
      return -1;
    };

    // WAIT FOR IDLE, DO NOT ASSERT IT AT A FIXED MOMENT. A shell prints its
    // prompt when it starts, that is output like any other, and after this
    // phase the row correctly reads `running` because of it. The worst case is
    // a 5,000 ms tick that observes the prompt plus the 4,000 ms hold that
    // follows, so a brand new row can read `running` for about 9 seconds before
    // anybody types anything. The wait is 15,000 ms to leave room above that
    // sum.
    //
    // MEASURED by the Phase 85 fix round. The version of this step that slept
    // 2,000 ms and then asserted `idle` failed 5 of 9 runs at this line, always
    // with the row reading `running`. Waiting for the row to settle passed 4 of
    // 4.
    const settleLists = new Set<number>();
    const toSettle = await watchFor('idle', 15_000, settleLists);
    if (toSettle < 0) {
      const stuck = remoteSessions().find((one) => one.id === statusId);
      fail(
        `the new session on ${LIFE_ID} still reads ${String(stuck?.status)} ` +
          `15,000 ms after it was made, with nothing planted in it, so step 19 ` +
          `would prove nothing`
      );
    }
    const fieldsBefore = await activityFields();

    // The plant and the watch run together, because the row goes back to idle
    // one cadence after the last line and the plant confirms itself by reading
    // the screen, which takes a second of its own.
    const statusToken = `TORTIE-P85-${randomBytes(6).toString('hex').toUpperCase()}`;
    const runningLists = new Set<number>();
    const planting = plantInPane(statusRow.tmuxId, statusToken);
    const toRunning = await watchFor('running', 12_000, runningLists);
    const planted = await planting;
    if (!planted) {
      fail(
        `the harness could not get ${statusToken} onto the screen of ` +
          `${statusRow.tmuxId}, so step 19 would have measured nothing`
      );
    }
    if (toRunning < 0) {
      fail(
        `a line was printed in a pane on ${LIFE_ID} and the row never read ` +
          `running in 12,000 ms. That is the defect Phase 85 exists to end.`
      );
    }
    const fieldsAfter = await activityFields();

    const idleLists = new Set<number>();
    const toIdle = await watchFor('idle', 12_000, idleLists);
    if (toIdle < 0) {
      fail(
        `the row on ${LIFE_ID} stopped printing and never read idle again in ` +
          `12,000 ms, so it would say a finished session is still working`
      );
    }
    log(
      `19a. a line printed in a pane on ${LIFE_ID} made the row read running ` +
        `after ${String(toRunning)} ms, and it read idle again ` +
        `${String(toIdle)} ms after that. ${String(runningLists.size - 1)} and ` +
        `${String(idleLists.size - 1)} list(s) ran in the two windows, on a ` +
        `${String(REMOTE_POLL_FOCUSED_MS)} ms cadence, and nothing in this ` +
        `harness asked for any of them. The same session took ` +
        `${String(toSettle)} ms to read idle after it was made, with nothing ` +
        `planted in it, because a shell prints its prompt when it starts and ` +
        `that is output like any other.`
    );

    // --- 19b. The field, pinned in a gate for the first time -----------------
    //
    // Phase 83 measured this question through `display-message`. The product
    // uses `list-sessions -F`, and that is the call made here. It puts the
    // measurement inside a gate that runs from now on rather than inside a
    // document that has to be believed.
    if (!(fieldsAfter.window > fieldsBefore.window)) {
      fail(
        `#{window_activity} read ${String(fieldsBefore.window)} before the ` +
          `line was printed and ${String(fieldsAfter.window)} after it. It did ` +
          `not move, so the field the product reads is the wrong one on this ` +
          `machine.`
      );
    }
    if (fieldsAfter.session !== fieldsBefore.session) {
      fail(
        `#{session_activity} read ${String(fieldsBefore.session)} before the ` +
          `line was printed and ${String(fieldsAfter.session)} after it. It ` +
          `moved, which this Mac does not do, and the phase's measurement ` +
          `needs re-taking on this machine.`
      );
    }
    log(
      `19b. through list-sessions -F, session_activity read ` +
        `${String(fieldsBefore.session)} before the line and ` +
        `${String(fieldsAfter.session)} after it, and window_activity read ` +
        `${String(fieldsBefore.window)} then ${String(fieldsAfter.window)}. ` +
        `Only the second one moved.`
    );

    // --- 19c. What one list costs ------------------------------------------
    //
    // A FLOOR AND NOT A TAILNET NUMBER, said plainly. The far side of this
    // connection is this same Mac over the loopback address, so this measures
    // the local ssh client, the local sshd and the local tmux and nothing else.
    // Nobody has paid this over a network with real packet loss.
    const listMs: number[] = [];
    for (let taken = 0; taken < 10; taken += 1) {
      const from = Date.now();
      await execOn(lifeCtx, remoteListArgs());
      listMs.push(Date.now() - from);
    }
    const meanMs = listMs.reduce((a, b) => a + b, 0) / listMs.length;
    log(
      `19c. ten lists over the open connection took ${meanMs.toFixed(1)} ms on ` +
        `average, from ${String(Math.min(...listMs))} ms to ` +
        `${String(Math.max(...listMs))} ms. It is a loopback floor and not a ` +
        `number for a real network.`
    );

    await core.killSession(statusId).catch(() => undefined);
    core.removeSession(statusId);

    await core.killSession(homeMade.id).catch(() => undefined);
    core.removeSession(homeMade.id);

    // Everything this block made on the machine goes, so the count in step 11
    // is about the operator's server and nothing else.
    for (const id of [restartId, orphanId]) {
      await core.killSession(id).catch(() => undefined);
      core.removeSession(id);
    }
    forgetMachineRows(LIFE_ID);
    removeMachineRow(LIFE_ID);

    // --- 11. The operator's server -------------------------------------------
    //
    // Numbered 11 because it was written before steps 12 to 16 existed. It stays
    // LAST whatever its number says, because it is the count that has to hold
    // after everything this file did.
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

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
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
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
// Phase 94. The re-home rule is READ here, over a folder this machine really
// reported, so the step proves the create rule and the re-home rule agree on
// measured values rather than on two constants.
import { remoteProjectPathFor } from './remote-rehome';
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
  TARGET_UNBOUND
} from './remote-copy';
// PHASE 89. The sentence an armed resume carries, compared byte for byte in
// step 10a rather than described. It is imported from the module that produces
// it, so a rewording that forgets this harness fails the gate rather than
// passing it.
import { RESUME_ARMED_NOT_PRESSED } from './remote-arm';
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
import { listRemoteTree } from './tree-list';
import { remoteMachineHome } from './remote-image';
// The folder this Mac keeps copies of session screens in. Step 14 makes it read
// only for the length of one end, inside this run's own isolated profile.
import { snapshotsDir } from '../restore/snapshots';
import { runRemoteRead, runRemoteWrite } from './remote-run';
// PHASE 90.2. The walk that finds this project on a machine, and the copy that
// puts it there. Step 20 drives both against the scratch machine.
import {
  findProjectOnMachine,
  remoteProjectWalkCount,
  remoteRepoKey,
  resetRemoteProjectFindForTests,
  resetRemoteProjectWalkCountForTests,
  walkRemoteRepos
} from './project-counterpart';
import {
  cloneProjectOnMachine,
  parseCloneAnswer,
  remoteCloneSendCount,
  resetRemoteCloneSendCountForTests
} from './remote-clone';
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

    // --- 10a LIVE PROBE 1. THE RESUME COMMAND, TYPED FOR REAL (Phase 89) ----
    //
    // WHICH SHAPE THE RESTORE TOOK DEPENDS ON ONE FACT ABOUT THE ROW, and the
    // fact is read off the row rather than chosen here. Phase 84 puts a
    // conversation id on the launch line for the seven agents that take one,
    // and that row's provenance is `preassigned` with `exact` confidence, so
    // the arming gate arms it. An agent that takes no such flag records nothing
    // and the gate refuses it with `not-collected`.
    //
    // AN ARMED ROW COMES BACK RUNNING THE MACHINE'S OWN SHELL, because the
    // create takes an empty argv, and Tortie types the resume command into that
    // shell without pressing Enter. A REFUSED ROW COMES BACK RUNNING ITS OWN
    // PROGRAM, which is exactly what every remote restore did before Phase 89.
    //
    // BOTH ARMS DEMAND A SENTENCE. Neither may report null, because a restore
    // that continues nothing and says nothing is the failure both sentences
    // exist to prevent. The arm taken is printed, so a reader of the log knows
    // which agent this machine had.
    const preAssigned = agentRecord.agentSessionId !== undefined;

    // THE RESTORED PANE IS ALIVE, and on the refused arm it is running the path
    // the row records.
    //
    // THAT SECOND HALF IS THE GUARD FOR THE WORK LOSING DEFECT THE PHASE 84 FIX
    // ROUND CLOSED. Phase 84 moved the CREATE onto the absolute path and left
    // the RESTORE launching by bare name. MEASURED on the operator's Mac Pro,
    // 2026-08-18: a restored claude session read
    // `pane_start_command = claude --session-id <id>`, `pane_dead=1`,
    // `pane_dead_status=1` and an empty screen, while the manifest row still
    // read idle. The same failure reproduces on this harness, because a pane
    // here gets four directories and claude is at
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
        '#{pane_dead}|#{pane_start_command}|#{pane_current_command}'
      ]).catch(() => '')
    ).trim();
    const [restoredDead = '', restoredCommand = '', restoredCurrent = ''] =
      restoredPane.split('|');
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

    if (preAssigned) {
      // 1. THE CREATE TOOK THE EMPTY ARGV BRANCH. This is what makes typing a
      //    resume command mean anything: the pane is a shell waiting for a
      //    line, not an agent with an input box.
      if (restoredCommand.startsWith(onMachine.path)) {
        fail(
          `the restored pane was started with ` +
            `${JSON.stringify(restoredCommand)}, so the create took the launch ` +
            `argv for a row the arming gate armed. Typing a resume command ` +
            `into a pane already running the agent puts the text in that ` +
            `agent's own input box and continues nothing.`
        );
      }
      if (restoredCurrent === onMachine.bare) {
        fail(
          `the restored pane is running ${restoredCurrent}, and an armed row ` +
            `has to come back running that machine's own shell`
        );
      }

      // 2. THE LANDING, AND THE SENTENCE, BYTE FOR BYTE.
      if (agentOutcome.resumeLanding !== 'armed') {
        fail(
          `the restore answered landing ` +
            `${JSON.stringify(String(agentOutcome.resumeLanding))} and refusal ` +
            `${JSON.stringify(String(agentOutcome.resumeRefusal))} for a row ` +
            `whose conversation id Tortie chose itself`
        );
      }
      if (!agentOutcome.resumeArmed) {
        fail('the restore landed the command and does not say it is armed');
      }
      if (agentOutcome.resumeRefusal !== null) {
        fail(
          `the restore reports refusal ` +
            `${JSON.stringify(String(agentOutcome.resumeRefusal))} on a row it armed`
        );
      }
      if (agentOutcome.resumeNote !== RESUME_ARMED_NOT_PRESSED) {
        fail(
          `the restore result says ${JSON.stringify(agentOutcome.resumeNote)} ` +
            `rather than the sentence for an armed resume`
        );
      }

      // 3. THE SCREEN SHOWS THE COMMAND EXACTLY ONCE. The count is printed
      //    rather than only asserted, because "once" is the whole claim and a
      //    reader of this log should see the number Tortie counted.
      const typed = agentOutcome.resumeCommand ?? '';
      if (typed.length === 0) {
        fail('the restore says it armed a resume and names no command');
      }
      const screen = await execOn(ctx, [
        'capture-pane',
        '-p',
        '-J',
        '-t',
        agentOutcome.tmuxId
      ]);
      const copies = screen.split(typed).length - 1;
      log(`    the screen of ${agentOutcome.tmuxId} shows the command ${String(copies)} time(s)`);
      if (copies !== 1) {
        fail(
          `the screen shows the command ${String(copies)} times and one is ` +
            `the only right answer. Two is the machine taking the send twice, ` +
            `and zero is a send that did not arrive.`
        );
      }

      // 4. THE BYTES ARE THE ONES TORTIE COMPOSED. An absolute path at
      //    `argv[0]`, because a pane on another machine does not get that
      //    machine's login shell program list, and the row's own conversation
      //    id in the line.
      if (!typed.startsWith(onMachine.path)) {
        fail(
          `the typed command is ${JSON.stringify(typed)} and that machine ` +
            `keeps ${onMachine.bare} at ${JSON.stringify(onMachine.path)}. A ` +
            `bare name would print "command not found" the moment the person ` +
            `presses Enter.`
        );
      }
      const convo = agentRecord.agentSessionId ?? '';
      if (convo.length === 0 || !typed.includes(convo)) {
        fail(
          `the typed command does not carry the row's own conversation id ` +
            `${JSON.stringify(convo)}`
        );
      }

      // 5. ENTER WAS NOT PRESSED. If it had been, the agent would be running
      //    in that pane by now. The pane is read again after a wait rather than
      //    once, because a program takes a moment to appear.
      await new Promise((r) => setTimeout(r, 1500));
      const stillShell = (
        await execOn(ctx, [
          'display-message',
          '-p',
          '-t',
          agentOutcome.tmuxId,
          '#{pane_current_command}'
        ]).catch(() => '')
      ).trim();
      if (stillShell === onMachine.bare) {
        fail(
          `${agentOutcome.tmuxId} is running ${stillShell} 1500 ms after the ` +
            `resume command was typed into it, which is what pressing Enter ` +
            `looks like. Tortie never presses Enter.`
        );
      }
      log(
        `    and the restore brought it back as ${agentOutcome.tmuxId} with ` +
          `four stamps, running ${stillShell} rather than ${onMachine.bare}, ` +
          `with the resume command typed once and no key pressed after it`
      );
    } else {
      if (!restoredCommand.startsWith(onMachine.path)) {
        fail(
          `the restored pane was started with ${JSON.stringify(restoredCommand)} ` +
            `and the row records ${onMachine.bare} at ` +
            `${JSON.stringify(onMachine.path)}. A restore that launches by bare ` +
            `name is the defect the Phase 84 fix round closed.`
        );
      }
      if (agentOutcome.resumeRefusal !== 'not-collected') {
        fail(
          `the restore answered ${String(agentOutcome.resumeRefusal)} for a row ` +
            `whose conversation id Tortie never collected, and not-collected ` +
            `is what it owes`
        );
      }
      if (agentOutcome.resumeNote !== RESUME_NOT_COLLECTED) {
        fail(
          `the restore result says ${JSON.stringify(agentOutcome.resumeNote)} ` +
            `rather than the sentence for not-collected`
        );
      }
      if (agentOutcome.resumeArmed || agentOutcome.resumeLanding !== null) {
        fail('the restore claims it typed a command into a row the gate refused');
      }
      log(
        `    and the restore brought it back as ${agentOutcome.tmuxId} with four ` +
          `stamps, started with ${restoredCommand}, answering not-collected ` +
          `and saying the conversation does not come back`
      );
    }
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
     * PHASE 89 MOVED `send-keys` off `VERBS_THIS_RUNG_REFUSES` and onto the
     * ledger as the first row that is unsafe to run twice, so the general door
     * refuses it and one narrow door may send one line of Tortie's own composed
     * text through it. Neither of those is what this helper wants. It wants a
     * person at the keyboard typing whatever a test decided, and no product path
     * in this harness has one. `./exec-smoke.ts` watches the general door refuse
     * the verb and watches the narrow door refuse a text that is not one line.
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

    // --- 17c to 17e. The operator's own sequence, Phase 94 ------------------
    //
    // He opened a folder on his Mac Pro from a local tab, got a tab for it,
    // pressed Cmd+T again inside that tab and changed nothing. The second
    // session started in his whole home folder on that computer and Tortie
    // opened a second tab named after it. These three steps are that sequence,
    // driven through the product's own core, with every folder read back from
    // the machine's own list rather than from anything this Mac believes.
    //
    // The far folder is inside this profile, so nothing outside `iso.userData`
    // is written and the operator's own home is never touched. It is realpathed
    // because tmux reports the resolved path and `/tmp` on this Mac is a link.
    const p94FarMade = join(iso.userData, 'p94-far');
    mkdirSync(p94FarMade, { recursive: true });
    const p94Far = realpathSync(p94FarMade);

    // 17c. FROM A LOCAL TAB, NAMING A FAR FOLDER. This is the half that already
    // worked, and it is asserted here so that the fix below cannot be bought by
    // breaking it.
    const p94TabsOf = (): string[] =>
      core.manifest
        .listProjects()
        .filter((one) => one.machineId === LIFE_ID)
        .map((one) => one.path)
        .sort();
    const p94TabsAtStart = p94TabsOf();
    const p94First = await core.createSession({
      machineId: LIFE_ID,
      name: 'p94 first',
      projectPath: '/tmp',
      cwd: p94Far,
      agent: 'shell'
    });
    const p94FirstListed = (await machineList()).find(
      (one) => one.gmuxId === p94First.id
    );
    if (p94FirstListed === undefined) {
      fail('the first Phase 94 create is not on the machine’s own list');
    }
    if (p94FirstListed.cwd !== p94Far) {
      fail(
        `the first Phase 94 session is in ${JSON.stringify(p94FirstListed.cwd)} ` +
          `and the folder named in the Directory field was ` +
          `${JSON.stringify(p94Far)}`
      );
    }
    const p94TabsAfterFirst = p94TabsOf();
    if (!p94TabsAfterFirst.includes(p94Far)) {
      fail(
        `the first Phase 94 create opened no tab for ${p94Far}. That machine ` +
          `holds ${JSON.stringify(p94TabsAfterFirst)}.`
      );
    }
    // The ADDED tabs, and nothing else. This profile is reused between runs of
    // this harness, so the tab for that folder may already be there from a run
    // before this one. What must be true either way is that this create added
    // no tab other than the folder it was given.
    const p94AddedByFirst = p94TabsAfterFirst.filter(
      (one) => !p94TabsAtStart.includes(one) && one !== p94Far
    );
    if (p94AddedByFirst.length > 0) {
      fail(
        `the first Phase 94 create also opened ` +
          `${JSON.stringify(p94AddedByFirst)}, and it owes only the folder it ` +
          `was given`
      );
    }
    /** Every tab that machine holds right now, as one comparable string. */
    const p94PathsBefore = p94TabsAfterFirst.join(', ');
    log(
      `17c. a create from a local tab naming ${p94Far} landed there on the ` +
        `machine and opened one tab for it`
    );

    // 17d. FROM THE TAB THAT STEP JUST MADE, WITH NOTHING TYPED. This is the
    // defect. The sheet drops a Directory value equal to the tab's own folder,
    // so `cwd` is absent and `projectMachineId` names the machine, which is
    // exactly the shape composed here. Before the fix no `-c` was sent, that
    // machine's tmux fell back to the home directory, and the re-home opened a
    // second tab named after the home folder.
    const p94Second = await core.createSession({
      machineId: LIFE_ID,
      projectMachineId: LIFE_ID,
      name: 'p94 second',
      projectPath: p94Far,
      agent: 'shell'
    });
    const p94AfterSecond = await machineList();
    const p94SecondListed = p94AfterSecond.find(
      (one) => one.gmuxId === p94Second.id
    );
    const p94FirstAgain = p94AfterSecond.find(
      (one) => one.gmuxId === p94First.id
    );
    if (p94SecondListed === undefined || p94FirstAgain === undefined) {
      fail('the two Phase 94 sessions are not both on the machine’s own list');
    }
    // The two REPORTED values are compared with each other rather than with a
    // constant, so this asserts the thing the operator asked for, being that the
    // second session sits beside the first, and not that both match a string
    // this Mac composed.
    if (p94SecondListed.cwd !== p94FirstAgain.cwd) {
      fail(
        `the second session is in ${JSON.stringify(p94SecondListed.cwd)} and ` +
          `the first is in ${JSON.stringify(p94FirstAgain.cwd)}. A create in a ` +
          `remote tab owes the folder of the tab it was started in.`
      );
    }
    if (p94SecondListed.cwd === farHome) {
      fail(
        `the second session is in ${farHome}, which is the home directory that ` +
          `machine states for itself. No folder reached it.`
      );
    }
    // THE TAB COUNT. The second create was started in a tab that already
    // existed, so it owes no new tab at all. The whole path list is compared
    // rather than the count, so a tab that is swapped for another is caught too.
    const p94PathsAfter = p94TabsOf().join(', ');
    if (p94PathsAfter !== p94PathsBefore) {
      fail(
        `the second create moved that machine's tabs from ` +
          `${JSON.stringify(p94PathsBefore)} to ` +
          `${JSON.stringify(p94PathsAfter)}. It owes no new tab at all.`
      );
    }
    // THE SECOND TAB THE OPERATOR REPORTED, PROVED WITHOUT WAITING FOR A POLL.
    // The extra tab he saw was not written by the create. It was written by the
    // re-home, which read the folder that machine reported and found it was not
    // the folder Tortie recorded. So the rule is read here, over the folder that
    // machine really reported a moment ago, and it must keep the recorded tab.
    // This is deterministic where waiting for the next poll would not be.
    //
    // The far home already has a tab of its own at this point, written by the
    // re-home for the session step 17a deliberately started there. That is why
    // this step compares path lists and reads the rule, rather than asserting
    // that no tab for the far home exists anywhere.
    const p94Rehomed = remoteProjectPathFor(p94Far, p94SecondListed.cwd);
    if (p94Rehomed !== p94Far) {
      fail(
        `the re-home would move the second session's tab from ` +
          `${JSON.stringify(p94Far)} to ${JSON.stringify(p94Rehomed)}, which ` +
          `is the second tab the operator reported`
      );
    }
    log(
      `17d. a second create in that tab landed in ${p94SecondListed.cwd}, the ` +
        `same folder the first is in, the re-home keeps that tab, and that ` +
        `machine's tabs are unchanged at ${JSON.stringify(p94PathsAfter)}`
    );

    // 17e. THE MAIN BACKSTOP, being item 2. No `machineId` at all, which is
    // what the agent board and the per-agent hotkeys send. Before the fix this
    // started a process on THIS Mac, at a path only that machine has, and the
    // operator got three sessions with no folder and no tab.
    const p94LocalBefore = localSessionCount();
    const p94NoMachine = await core.createSession({
      projectMachineId: LIFE_ID,
      name: 'p94 no machine',
      projectPath: p94Far,
      agent: 'shell'
    });
    if (p94NoMachine.machine === undefined) {
      fail(
        'a create with no machine, started in a tab on a machine, came back ' +
          'with no machine of its own, so it ran on this Mac'
      );
    }
    if (p94NoMachine.machine.id !== LIFE_ID) {
      fail(
        `a create with no machine came back on ${p94NoMachine.machine.id} ` +
          `rather than on the machine its tab is on`
      );
    }
    const p94NoMachineRow = core.manifest.getSession(p94NoMachine.id);
    if (p94NoMachineRow?.machineId !== LIFE_ID) {
      fail(
        `the row for a create with no machine records ` +
          `${String(p94NoMachineRow?.machineId)} rather than ${LIFE_ID}`
      );
    }
    const p94NoMachineListed = (await machineList()).find(
      (one) => one.gmuxId === p94NoMachine.id
    );
    if (p94NoMachineListed === undefined) {
      fail('a create with no machine is not on that machine’s own list');
    }
    if (p94NoMachineListed.cwd !== p94FirstAgain.cwd) {
      fail(
        `a create with no machine landed in ` +
          `${JSON.stringify(p94NoMachineListed.cwd)} rather than in the tab's ` +
          `own folder ${JSON.stringify(p94FirstAgain.cwd)}`
      );
    }
    const p94LocalAfter = localSessionCount();
    if (p94LocalAfter !== p94LocalBefore) {
      fail(
        `a create with no machine moved this Mac from ` +
          `${String(p94LocalBefore)} to ${String(p94LocalAfter)} session(s), ` +
          `so it started a process here`
      );
    }
    log(
      `17e. a create carrying no machine ran on ${LIFE_ID} in ` +
        `${p94NoMachineListed.cwd}, and this Mac still holds ` +
        `${String(p94LocalAfter)} session(s) of its own`
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


    // --- 19. PHASE 90.3. The Explorer's one read of a folder tree (item 1) ---
    //
    // `machines:listTree` is a new channel and `tree-list` is the twelfth
    // frozen script. SIX SHAPES are driven here against a real sign in server,
    // being a listing, a folder that is not there, a path that is a file, a
    // capped answer, a folder whose name holds a space, and the containment
    // refusal the safety fix to `review-file` added.
    //
    // Every path below is inside this run's own isolated root. Nothing under
    // the operator's home is read and nothing outside `iso.userData` is
    // written.
    const treeRoot = join(iso.userData, 'p903-tree');
    mkdirSync(join(treeRoot, 'src', 'deep', 'deeper'), { recursive: true });
    mkdirSync(join(treeRoot, 'with space'), { recursive: true });
    mkdirSync(join(treeRoot, '.git', 'objects'), { recursive: true });
    writeFileSync(join(treeRoot, 'README.md'), 'top\n');
    writeFileSync(join(treeRoot, 'src', 'a.ts'), 'a\n');
    writeFileSync(join(treeRoot, 'src', 'deep', 'b.ts'), 'b\n');
    writeFileSync(join(treeRoot, 'src', 'deep', 'deeper', 'c.ts'), 'c\n');
    writeFileSync(join(treeRoot, 'with space', 'file one.txt'), 'one\n');
    writeFileSync(join(treeRoot, '.git', 'objects', 'secret'), 'never\n');

    const treeListed = await listRemoteTree({ machineId: LIFE_ID, root: treeRoot });
    if (treeListed.status !== 'ok') {
      fail(`the tree read of ${treeRoot} answered ${treeListed.status}`);
    }
    const treePaths: string[] =
      treeListed.status === 'ok'
        ? treeListed.entries.map((one) => one.path)
        : [];
    for (const wanted of [
      join(treeRoot, 'README.md'),
      join(treeRoot, 'src'),
      join(treeRoot, 'src', 'a.ts'),
      join(treeRoot, 'src', 'deep'),
      join(treeRoot, 'src', 'deep', 'b.ts'),
      join(treeRoot, 'with space'),
      join(treeRoot, 'with space', 'file one.txt')
    ]) {
      if (!treePaths.includes(wanted)) {
        fail(
          `the tree read did not carry ${wanted}. It carried ` +
            `${JSON.stringify(treePaths.slice(0, 12))}`
        );
      }
    }
    // A folder whose name holds a space arrives whole, because the far side
    // prints one path per line and the path is the rest of the line.
    const treeSpaced =
      treeListed.status === 'ok'
        ? treeListed.entries.find((one) => one.path.endsWith('with space'))
        : undefined;
    if (treeSpaced === undefined || treeSpaced.kind !== 'dir') {
      fail('a folder whose name holds a space did not arrive as a folder');
    }
    // `.git` is pruned on the far side, so no repository internals cross.
    const treeGitLines = treePaths.filter((one) => one.includes('/.git'));
    if (treeGitLines.length !== 0) {
      fail(
        `the tree read carried ${String(treeGitLines.length)} path(s) inside .git, ` +
          `so a repository's internals crossed the link`
      );
    }
    // The default depth is 3, so the fourth level is NOT in the answer.
    if (treePaths.includes(join(treeRoot, 'src', 'deep', 'deeper', 'c.ts'))) {
      fail('the tree read walked past its own depth');
    }

    const treeMissing = await listRemoteTree({
      machineId: LIFE_ID,
      root: join(treeRoot, 'not-there')
    });
    if (treeMissing.status !== 'missing') {
      fail(
        `the tree read answered ${treeMissing.status} for a folder that is ` +
          `not there`
      );
    }
    const treeFile = await listRemoteTree({
      machineId: LIFE_ID,
      root: join(treeRoot, 'README.md')
    });
    if (treeFile.status !== 'notdir') {
      fail(`the tree read answered ${treeFile.status} for a path that is a file`);
    }
    const treeUnknown = await listRemoteTree({
      machineId: 'p903-no-such-machine',
      root: treeRoot
    });
    if (treeUnknown.status !== 'notConnected') {
      fail(
        `the tree read answered ${treeUnknown.status} for a machine Tortie ` +
          `has not signed in to`
      );
    }
    // The capped answer. Depth 1 with the shipped cap would fit, so the cap is
    // proven by asking the far side directly with a cap of one, through the
    // same door the product uses.
    const cappedOut = await runRemoteRead(
      lifeCtx,
      'tree-list',
      [treeRoot, '3', '1'],
      { timeoutMs: 20_000 }
    );
    const cappedLines = cappedOut.payload.split('\n');
    const cappedHead = cappedLines[0] ?? '';
    const cappedTotal = Number(cappedHead.split(' ')[1] ?? '0');
    if (cappedLines.length - 1 !== 1 || cappedTotal <= 1) {
      fail(
        `a capped read printed ${String(cappedLines.length - 1)} line(s) and ` +
          `reported a total of ${String(cappedTotal)}. It owes one line and a ` +
          `total larger than one, because the count is taken separately from ` +
          `the listing.`
      );
    }
    // The containment refusal. `review-file` refuses a path that climbs out of
    // the repository, and it refuses by printing no markers at all, which the
    // door reads as an answer it cannot use.
    let contained = '';
    try {
      await runRemoteRead(
        lifeCtx,
        'review-file',
        [treeRoot, '../../etc/passwd', '200'],
        { timeoutMs: 20_000 }
      );
    } catch (err) {
      contained = (err as Error).message;
    }
    if (contained.length === 0) {
      fail(
        'review-file answered for a path that climbs out of the folder it was ' +
          'given, so the containment line is not doing anything'
      );
    }
    log(
      `19. one tree read of ${treeRoot} carried ` +
        `${String(treePaths.length)} entr(ies) including a folder with a space in ` +
        `its name, carried nothing from .git, stopped at its own depth, and ` +
        `answered missing, notdir and notConnected for the three refusals. A ` +
        `capped read reported ${String(cappedTotal)} entries and printed one. ` +
        `A review of ../../etc/passwd was refused.`
    );

    // --- 20. PHASE 90.2. Finding this project on a machine, and putting it
    //     there (items 2 and 3) ------------------------------------------------
    //
    // NINE STEPS, A TO I, and every one of them runs inside this run's own
    // isolated root. Nothing under the operator's home is read and nothing
    // outside `iso.userData` is written. In this harness the other machine is
    // this same Mac, so every path below is a scratch path this harness made.
    //
    // WHAT THESE STEPS PROVE AND WHAT THEY DO NOT. They drive the two new
    // catalogue scripts against a real sign in server and read what a real git
    // did. They do NOT reach any network: every address in them is a scratch
    // repository on this disk, or a path that is deliberately not there. The
    // product's own classification of the four answers is covered by the unit
    // tests, and the live drive against a second computer is
    // `node build/probe-remote-clone.mjs`.
    const p902Root = join(iso.userData, 'p902');
    // PHASE 90.3 FIX ROUND. Thrown away first, so a second run at the same
    // config root builds this block's repositories rather than tripping over
    // the ones the last run left. MEASURED on 2026-08-19: a second
    // `npm run smoke:remote` at one root exited 1 on
    // "git remote add origin https://github.com/gregce/alpha.git", and after
    // that was closed it exited 1 on the push into `bare.git`. One removal of
    // the whole folder closes every one of them. This path is written by this
    // harness alone and is inside this run's own isolated user data directory.
    rmSync(p902Root, { recursive: true, force: true });
    const p902Search = join(p902Root, 'search');
    const p902Made: string[] = [];
    const gitHere = (cwd: string, args: string[]): void => {
      execFileSync('git', args, {
        cwd,
        stdio: 'ignore',
        env: {
          ...process.env,
          GIT_TERMINAL_PROMPT: '0',
          GIT_CONFIG_GLOBAL: '/dev/null',
          GIT_CONFIG_SYSTEM: '/dev/null'
        }
      });
    };
    const p902Repo = (path: string, origin: string | null): void => {
      mkdirSync(path, { recursive: true });
      gitHere(path, ['init', '-q', '.']);
      if (origin !== null) gitHere(path, ['remote', 'add', 'origin', origin]);
      p902Made.push(path);
    };
    p902Repo(join(p902Search, 'alpha'), 'https://github.com/gregce/alpha.git');
    p902Repo(join(p902Search, 'beta'), 'git@github.com:gregce/beta.git');
    p902Repo(join(p902Search, 'with a space'), 'https://github.com/gregce/spaced.git');
    // A worktree carries a `.git` FILE rather than a directory, and the walk
    // asks for a directory. This is the limit stated rather than assumed.
    mkdirSync(join(p902Search, 'worktree'), { recursive: true });
    writeFileSync(join(p902Search, 'worktree', '.git'), 'gitdir: /nowhere\n');

    // --- A. The walk answers for a whole tree in one call -------------------
    const walked = await walkRemoteRepos(lifeCtx, p902Search, 3);
    if (walked.length !== 3) {
      fail(
        `the walk of ${p902Search} returned ${String(walked.length)} folder(s) ` +
          `and three git folders with an origin are in there`
      );
    }
    for (const one of walked) {
      if (remoteRepoKey(one.url) === null) {
        fail(`the walk returned ${JSON.stringify(one.url)}, which is no address`);
      }
      if (!one.path.startsWith(p902Search)) {
        fail(`the walk returned ${one.path}, which is outside the scratch root`);
      }
    }
    log(
      `20a. one call walked ${p902Search} and returned ${String(walked.length)} ` +
        `git folders, and every address parsed`
    );

    // --- B. A folder whose name holds a space comes back whole --------------
    const spaced = walked.find((one) => one.path.endsWith('with a space'));
    if (spaced === undefined) {
      fail(
        `the walk cut the folder whose name holds a space. It returned ` +
          `${JSON.stringify(walked.map((one) => one.path))}`
      );
    }
    log(`20b. the folder named ${JSON.stringify(spaced.path)} came back whole`);

    // --- C. A worktree is not returned, and the limit is real ---------------
    if (walked.some((one) => one.path.endsWith('worktree'))) {
      fail(
        'the walk returned a folder whose .git is a file. It asks for a ' +
          'directory, so a worktree and a submodule are both outside what it ' +
          'can find, and the phase report says so.'
      );
    }
    log('20c. a folder whose .git is a FILE was not returned, as stated');

    // --- D. A project with no remote contacts the machine zero times --------
    const p902NoRemote = join(p902Root, 'no-remote');
    p902Repo(p902NoRemote, null);
    resetRemoteProjectFindForTests();
    resetRemoteProjectWalkCountForTests();
    const noRemote = await findProjectOnMachine({
      machineId: LIFE_ID,
      localPath: p902NoRemote
    });
    if (noRemote.outcome !== 'noRemote') {
      fail(
        `a project with no git remote answered ${noRemote.outcome} rather than ` +
          `noRemote`
      );
    }
    if (remoteProjectWalkCount() !== 0) {
      fail(
        `a project with no git remote sent ` +
          `${String(remoteProjectWalkCount())} command(s) to the machine. It ` +
          `owes none, because the local read happens first.`
      );
    }
    log(
      `20d. a project with no git remote answered noRemote and sent 0 commands ` +
        `to ${LIFE_ID}`
    );

    // --- E. A destination that is already there is never opened -------------
    const p902Taken = join(p902Root, 'taken');
    mkdirSync(p902Taken, { recursive: true });
    writeFileSync(join(p902Taken, 'mine.txt'), 'do not touch\n');
    const takenBefore = readFileSync(join(p902Taken, 'mine.txt'), 'utf8');
    const takenSizeBefore = statSync(join(p902Taken, 'mine.txt')).size;
    const p902Bare = join(p902Root, 'bare.git');
    execFileSync('git', ['init', '-q', '--bare', p902Bare], { stdio: 'ignore' });
    gitHere(join(p902Search, 'alpha'), [
      '-c',
      'user.email=p902@tortie.test',
      '-c',
      'user.name=p902',
      'commit',
      '-q',
      '--allow-empty',
      '-m',
      'one'
    ]);
    gitHere(join(p902Search, 'alpha'), ['push', '-q', p902Bare, 'HEAD:refs/heads/main']);
    const existsAnswer = parseCloneAnswer(
      (
        await runRemoteWrite(lifeCtx, 'git-clone', [p902Bare, p902Taken], {
          timeoutMs: 60_000
        })
      ).payload
    );
    if (existsAnswer?.word !== 'exists') {
      fail(
        `the copy into a folder that is already there answered ` +
          `${JSON.stringify(existsAnswer?.word)} rather than exists`
      );
    }
    const takenAfter = readFileSync(join(p902Taken, 'mine.txt'), 'utf8');
    if (takenAfter !== takenBefore) {
      fail('the refused copy changed the file that was already in that folder');
    }
    if (statSync(join(p902Taken, 'mine.txt')).size !== takenSizeBefore) {
      fail('the refused copy changed the size of the file that was there');
    }
    log(
      `20e. a copy into ${p902Taken} answered exists, and the ` +
        `${String(takenSizeBefore)} byte file already in it is byte identical`
    );

    // --- F. An address nobody can reach writes nothing, and does not hang ---
    const p902Nowhere = join(p902Root, 'nowhere');
    const unreachableFrom = Date.now();
    const unreachableAnswer = parseCloneAnswer(
      (
        await runRemoteWrite(
          lifeCtx,
          'git-clone',
          [join(p902Root, 'no-such-repository.git'), p902Nowhere],
          { timeoutMs: 60_000 }
        )
      ).payload
    );
    const unreachableMs = Date.now() - unreachableFrom;
    if (unreachableAnswer?.word !== 'unreachable') {
      fail(
        `a copy from an address nobody can reach answered ` +
          `${JSON.stringify(unreachableAnswer?.word)} rather than unreachable`
      );
    }
    if (existsSync(p902Nowhere)) {
      fail(`the refused copy created ${p902Nowhere}`);
    }
    if (unreachableMs > 30_000) {
      fail(
        `a copy from an address nobody can reach took ` +
          `${String(unreachableMs)} ms. It answers before it starts, so it owes ` +
          `an answer well inside 30,000 ms, and a longer one means it waited ` +
          `for something.`
      );
    }
    log(
      `20f. a copy from an address nobody can reach answered unreachable in ` +
        `${String(unreachableMs)} ms, created nothing at ${p902Nowhere}, and ` +
        `waited for nothing`
    );

    // --- G. A copy that can be made is made ---------------------------------
    const p902Dest = join(p902Root, 'copied');
    const clonedAnswer = parseCloneAnswer(
      (
        await runRemoteWrite(lifeCtx, 'git-clone', [p902Bare, p902Dest], {
          timeoutMs: 60_000
        })
      ).payload
    );
    if (clonedAnswer?.word !== 'cloned') {
      fail(
        `the copy answered ${JSON.stringify(clonedAnswer?.word)} rather than ` +
          `cloned`
      );
    }
    if (!existsSync(join(p902Dest, '.git'))) {
      fail(`the copy said cloned and there is no repository at ${p902Dest}`);
    }
    log(`20g. the copy answered cloned and ${p902Dest} holds a repository`);

    // --- H. The same copy again is the same folder, not a refusal -----------
    //
    // A link that dies after the far side finished leaves a good copy Tortie
    // never heard about. The retry reads `exists` for a folder Tortie itself
    // made, so the product asks the destination what it holds and answers
    // `existsSame`. That second read is what is driven here.
    const againAnswer = parseCloneAnswer(
      (
        await runRemoteWrite(lifeCtx, 'git-clone', [p902Bare, p902Dest], {
          timeoutMs: 60_000
        })
      ).payload
    );
    if (againAnswer?.word !== 'exists') {
      fail(
        `the second copy answered ${JSON.stringify(againAnswer?.word)} rather ` +
          `than exists`
      );
    }
    const atDest = await walkRemoteRepos(lifeCtx, p902Dest, 1);
    const bareKey = remoteRepoKey(p902Bare);
    const sameThere = atDest.some((one) => remoteRepoKey(one.url) === bareKey);
    if (bareKey !== null && !sameThere) {
      fail(
        `the read at ${p902Dest} did not recognise the folder Tortie itself ` +
          `made, so a retry after a lost answer would be reported as a refusal`
      );
    }
    if (atDest.length !== 1) {
      fail(
        `the read at ${p902Dest} returned ${String(atDest.length)} folder(s) ` +
          `and it looks one folder deep, so it owes exactly one`
      );
    }
    log(
      `20h. the second copy answered exists, and the one read at ${p902Dest} ` +
        `found the folder Tortie made, which is what turns that answer into ` +
        `existsSame. The address there is a folder on this disk, so its key is ` +
        `${JSON.stringify(bareKey)} and the product refuses to copy from it.`
    );

    // --- I. An address the sheet drew that main does not agree with ---------
    resetRemoteCloneSendCountForTests();
    const changed = await cloneProjectOnMachine({
      machineId: LIFE_ID,
      localPath: join(p902Search, 'alpha'),
      expectUrl: 'https://github.com/someone/else.git',
      path: join(p902Root, 'never')
    });
    if (changed.outcome !== 'changed') {
      fail(
        `a copy whose address does not equal main's own read answered ` +
          `${changed.outcome} rather than changed`
      );
    }
    if (remoteCloneSendCount() !== 0) {
      fail(
        `a copy whose address does not equal main's own read sent ` +
          `${String(remoteCloneSendCount())} command(s) to the machine`
      );
    }
    if (existsSync(join(p902Root, 'never'))) {
      fail('the refused copy created its destination');
    }
    log(
      `20i. a copy whose address does not equal main's own read answered ` +
        `changed, sent 0 commands and created nothing. This is why the ` +
        `renderer cannot choose what crosses.`
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

/**
 * GMUX_SMOKE=p118-prep and GMUX_SMOKE=p118-verify. A long running copy onto
 * another machine is owned, ended and written down, and a machine removal is
 * one transaction (Phase 118).
 *
 * ## The two sentences this gate exists to prove
 *
 * ONE. Start a copy of a project onto another machine that really takes
 * minutes. Quit Tortie while it is running. Prove that Tortie owned the ssh
 * child underneath it, ended it, waited for it, refused every remote call made
 * after the quit began, classified the copy as cut off, and left a durable row
 * behind. Then start Tortie again on the same profile and prove the person is
 * told once, in one sentence, and never again.
 *
 * TWO. Remove a machine whose record cannot be written. Prove that NOTHING was
 * removed: every session row is exactly as it was, `machines.json` is unchanged
 * byte for byte, the agreement is still on record and the machine is still in
 * the list. Then remove it again with nothing in the way and prove all five
 * rows are recorded in one transaction. Then remove it a third time and prove
 * it changes nothing.
 *
 * Both are phase 2 of
 * `docs/audits/2026-08-20-electron-typescript-architecture.md`, which the
 * operator ranked P1.
 *
 * ## The long running copy is real rather than forged
 *
 * `build/p118-remote-children.mjs` writes a small program on the far side and
 * puts it first on that machine's own program search list, through that
 * machine's own sshd configuration. The program is a pass through for every git
 * command except `ls-remote`, which is the first thing the copy script runs. On
 * that one it sleeps. So the copy really is long running, the ssh child under it
 * really is alive for minutes, and NO FAULT SEAM IS ADDED TO THE EXEC PLANE.
 * Nothing in `src/main/machines/exec-plane.ts` knows this harness exists.
 *
 * The one seam this file does use is `armRemovalFault` in
 * `../machines/removal.ts`, and it is refused unless `GMUX_SMOKE` is set. It
 * exists because the alternative is a description of a rollback rather than a
 * rollback.
 *
 * ## The division of work, and why the app never grades itself
 *
 * The supervisor owns the machine, the wrapper, the recorded pids and the
 * verdict. This process owns the moments, because only it knows when a copy has
 * been started and not yet answered. It writes facts to `p118-facts.json` and
 * the supervisor reads them. That is the division `build/partition-harness.mjs`
 * already uses, and `./p117-create-unknown.ts` copies.
 *
 * ## The two modes
 *
 *   p118-prep    the copy, the real quit, the refusal and the durable row
 *   p118-verify  a second launch on the SAME user data directory, which is
 *                what makes the restart real rather than described, then the
 *                removal transaction three times over
 *
 * ## Safety
 *
 * It refuses to run unless the profile is inside `GMUX_CONFIG_ROOT`, and it
 * refuses the real socket by name, for the reason `../machines/remote-smoke.ts`
 * gives: the far side of this connection is this same Mac. It counts the
 * operator's sessions before and after. It never uses `pkill` and it never uses
 * `kill-server`.
 *
 * `npm run smoke:p118` is the only supported way to run it.
 */

import { app } from 'electron';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { GmuxError } from '../errors';
import { assertHarnessIsolation } from './isolation';
import { armWatchdog, smokeFail } from './support';
import { activeTmuxSocket, TMUX_SOCKET } from '../tmux/resolve';
import { disposeMainCapabilities } from '../capabilities';
import {
  MACHINE_CONFIRM_ACKNOWLEDGEMENT,
  confirmMachine,
  describeMachine,
  isMachineConfirmed,
  type MachineExecutionFields
} from '../machines/confirm';
import { machineContext, type RemoteMachineContext } from '../machines/context';
import { execRemoteShell } from '../machines/exec-plane';
import { prepareMachine } from '../machines/prepare';
import { cloneProjectOnMachine } from '../machines/remote-clone';
import {
  readOriginUrl,
  remoteCloneUrl
} from '../machines/project-counterpart';
import { machineIsConnected } from '../machines/remote-run';
// The two sentences this phase pins, imported from the modules that produce
// them so a rewording that forgets this harness fails the gate.
import { REMOTE_EXEC_SHUTDOWN } from '../machines/execution-ledger';
import {
  MACHINE_REMOVAL_NOT_RECORDED,
  armRemovalFault,
  removeMachineCompletely
} from '../machines/removal';
import {
  liveRemoteExecutions,
  settledRemoteExecutions
} from '../machines/execution-ledger';
import {
  noteRemoteRowSeen,
  remoteManifest,
  remoteRecordsForMachine,
  writeRemoteRow
} from '../machines/remote-record';
import { stopMachineFeeds } from '../machines/remote-sessions';
import { stopRemoteHarvest } from '../machines/remote-harvest';
import { stopRemoteStoreSync } from '../machines/remote-store-sync';
import {
  addMachineRow,
  machineHostKeysPath,
  machineRow,
  machinesPath,
  reloadMachines
} from '../machines/store';
import { takePendingNotices } from '../notice';
import { defaultManifestDbPath } from '../manifest/store';
import { getGmuxCore } from '../sessions';

function log(line: string): void {
  console.log(`[gmux-p118] ${line}`);
}

function fail(message: string): never {
  throw new Error(message);
}

/**
 * The sentence a person would read out of a thrown error.
 *
 * A `GmuxError`'s own `message` is the JSON of its payload, because that is how
 * the payload crosses the bridge. The sentence is `payload.message`, and every
 * byte for byte comparison below is against that.
 */
function sentenceOf(err: unknown): string {
  if (err instanceof GmuxError) return err.payload.message;
  return err instanceof Error ? err.message : String(err);
}

/** The machine the copy runs on. One machine, and it is this same Mac. */
const CLONE_ID = 'p118-copy';
const CLONE_LABEL = 'Copy Probe';

/** The machine the removal is proved against. It is never connected to. */
const REMOVE_ID = 'p118-remove';
const REMOVE_LABEL = 'Removal Probe';

/** How many session rows the removal is proved over. */
const REMOVAL_ROWS = 5;

/** The `$0` the copy script runs under on the far side. */
const FAR_SIDE_NAME = 'tortie-git-clone';

/** What `build/p118-remote-children.mjs` wrote for this run. */
interface Carriage {
  host: string;
  port: number;
  user: string;
  /** The real tmux. The wrapper in this run is `git`, not tmux. */
  remoteTmuxPath: string;
  /** The project on this Mac the copy is made from. */
  localProject: string;
  /** The destination on the machine. It does not exist when the leg starts. */
  destination: string;
}

const CARRIAGE_FILE = 'p118-carriage.json';
const FACTS_FILE = 'p118-facts.json';

/** What the prep leg measured, read by the supervisor. */
interface Facts {
  machineId: string;
  machineLabel: string;
  destination: string;
  /** The ssh child the ledger owned. */
  clonePid: number;
  sshClientsBeforeQuit: number;
  farSideBeforeQuit: number;
  /** Every process naming the copy, before and after the refused call. */
  namingBeforeRefusal: number;
  namingAfterRefusal: number;
  /** Ledger entries the refused call opened. It owes zero. */
  liveAfterRefusal: number;
  settledBeforeRefusal: number;
  settledAfterRefusal: number;
  farSideAfterQuit: number;
  /** Milliseconds the whole real teardown took, measured. */
  teardownMs: number;
  cutOff: number;
  unjoined: number;
  refusalSentence: string;
  cloneOutcome: string;
  unfinishedRows: number;
  operatorSessions: number;
}

function readCarriage(root: string): Carriage | null {
  try {
    return JSON.parse(readFileSync(join(root, CARRIAGE_FILE), 'utf8')) as Carriage;
  } catch {
    return null;
  }
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

/** The operator's own server, read only, counted. This is the only mention. */
function operatorSessionCount(): number {
  try {
    return Number(
      execFileSync(
        '/bin/sh',
        ['-c', 'tmux -L gmux list-sessions 2>/dev/null | wc -l'],
        { encoding: 'utf8' }
      ).trim()
    );
  } catch {
    return -1;
  }
}

/** Refuse the real socket, and refuse a profile outside the run's own root. */
function isolate(): { root: string; userData: string; socket: string } {
  const iso = assertHarnessIsolation('GMUX_CONFIG_ROOT');
  if (activeTmuxSocket() === TMUX_SOCKET) {
    fail(
      `the socket is "${TMUX_SOCKET}", the real one. This gate starts work on ` +
        `a machine, and on this socket that machine is this Mac.`
    );
  }
  // The far side is this same Mac, so a connected time pass would read the
  // operator's own agent stores under their own home directory. Both cadences
  // are off for the whole of this gate, exactly as the Phase 70, Phase 91,
  // Phase 93 and Phase 117 gates turn them off, and for the same reason.
  stopRemoteHarvest();
  stopRemoteStoreSync();
  return { root: iso.root, userData: iso.userData, socket: iso.socket };
}

/** True while this pid names a process on this Mac. Read only. */
function pidIsAlive(pid: number): boolean {
  try {
    const out = execFileSync('/bin/ps', ['-o', 'pid=', '-p', String(pid)], {
      encoding: 'utf8'
    });
    return out.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Every process on this Mac whose command names the copy script.
 *
 * In this harness the far side is this same Mac, so `/bin/ps` can see BOTH
 * halves: Tortie's own ssh client, whose command line carries the whole remote
 * command, and the shells the machine runs it in. They are told apart by the
 * ssh binary's own path, because only the client names it.
 *
 * That is a property of this harness and of nothing else, and the report says
 * so. The filter is the `$0` `remoteScriptName` gives the script.
 */
function processesNamingTheCopy(): { sshClients: number; farSide: number } {
  try {
    const table = execFileSync('/bin/ps', ['-ax', '-o', 'pid=,command='], {
      encoding: 'utf8',
      maxBuffer: 8 * 1024 * 1024
    });
    const lines = table
      .split('\n')
      .filter((line) => line.includes(FAR_SIDE_NAME));
    const sshClients = lines.filter((line) => /\/ssh\b/.test(line)).length;
    return { sshClients, farSide: lines.length - sshClients };
  } catch {
    return { sshClients: -1, farSide: -1 };
  }
}

/** Add the machine row, seal the agreement, and hand back its fields. */
function installMachine(
  id: string,
  label: string,
  carriage: Carriage
): MachineExecutionFields {
  const fields: MachineExecutionFields = {
    host: carriage.host,
    user: carriage.user,
    port: carriage.port,
    remoteTmuxPath: carriage.remoteTmuxPath
  };
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
  addMachineRow({
    id,
    label,
    color: 'green',
    host: carriage.host,
    user: carriage.user,
    port: carriage.port,
    remoteTmuxPath: carriage.remoteTmuxPath
  });
  reloadMachines();
  confirmAsAPerson(id, fields);
  return fields;
}

/** Wait until `read` answers true, or give up and say what was waited for. */
async function until(
  what: string,
  read: () => boolean,
  ms: number
): Promise<void> {
  const deadline = Date.now() + ms;
  for (;;) {
    if (read()) return;
    if (Date.now() > deadline) {
      fail(`${what} did not happen within ${String(ms)} ms`);
    }
    await new Promise((r) => setTimeout(r, 100));
  }
}

// ---------------------------------------------------------------------------
// The prep leg
// ---------------------------------------------------------------------------

export async function runP118PrepSmoke(): Promise<void> {
  armWatchdog(600_000);
  try {
    const iso = isolate();
    const operatorBefore = operatorSessionCount();
    log(`profile ${iso.userData}, socket ${iso.socket}`);
    log(`the operator's own server holds ${String(operatorBefore)} session(s)`);

    // The core is booted BEFORE the machine exists, for the reason
    // ./capture-remote.ts gives: `getGmuxCore` fires the sign in loop without
    // waiting for it, and a second prepare drops the program search list
    // captured for the first one.
    await getGmuxCore();

    const carriage = readCarriage(iso.root);
    if (carriage === null) {
      // ABSENT IS A FAILURE, never a skip. Every claim below needs a machine.
      fail(
        `no scratch machine details at ${CARRIAGE_FILE} inside ${iso.root}. ` +
          `Run this through "npm run smoke:p118", which starts the machine, ` +
          `writes the wrapper and writes that file.`
      );
    }

    const fields = installMachine(CLONE_ID, CLONE_LABEL, carriage);
    const prepared = await prepareMachine({
      machineId: CLONE_ID,
      fields,
      tortieHostKeys: machineHostKeysPath()
    });
    if (prepared.class !== 'prepared') {
      fail(`the prepare answered ${prepared.class}: ${prepared.detail}`);
    }
    if (!machineIsConnected(CLONE_ID)) {
      fail(
        `${CLONE_LABEL} is not connected, so the copy would answer offline ` +
          `and nothing below would be measuring an ssh child at all`
      );
    }
    const ctx = machineContext(CLONE_ID) as RemoteMachineContext;
    log(`1. ${CLONE_LABEL} is signed in on 127.0.0.1:${String(carriage.port)}`);

    // --- 2. The copy, started and NOT awaited -------------------------------
    //
    // Main re-reads this project's address itself and refuses anything else, so
    // the address the copy carries is composed here exactly as the sheet would
    // compose it: main's own read of the folder, rewritten to a web address.
    const originUrl = await readOriginUrl(carriage.localProject);
    if (originUrl === null) {
      fail(`${carriage.localProject} has no origin address to copy from`);
    }
    const expectUrl = remoteCloneUrl(originUrl);
    if (expectUrl === null) {
      fail(`${originUrl} is not an address a copy can be made from`);
    }
    const copying = cloneProjectOnMachine({
      machineId: CLONE_ID,
      localPath: carriage.localProject,
      expectUrl,
      path: carriage.destination
    });
    // The promise is settled at the end of this leg, whatever it says. Nothing
    // waits on it here, because the whole point is to quit while it runs.
    let cloneOutcome = 'not settled';
    void copying.then((result) => {
      cloneOutcome = result.outcome;
    });
    log(`2. a copy of ${expectUrl} onto ${carriage.destination} was started`);

    // --- 3. The ledger owns exactly one copy ---------------------------------
    await until(
      'the ledger to hold the copy',
      () => liveRemoteExecutions().some((one) => one.kind === 'clone'),
      5_000
    );
    const live = liveRemoteExecutions();
    if (live.length !== 1) {
      fail(
        `the ledger holds ${String(live.length)} open piece(s) of remote work ` +
          `and exactly one copy was started: ` +
          `${live.map((one) => `${one.kind}/${one.subject}`).join(', ')}`
      );
    }
    const entry = live[0];
    if (entry === undefined || entry.kind !== 'clone') {
      fail(`the open entry reads ${String(entry?.kind)} rather than clone`);
    }
    if (entry.machineId !== CLONE_ID) {
      fail(`the open entry names machine ${entry.machineId}`);
    }
    if (entry.subject !== carriage.destination) {
      fail(
        `the open entry names ${JSON.stringify(entry.subject)} and the copy ` +
          `was aimed at ${JSON.stringify(carriage.destination)}`
      );
    }
    log(
      `3. the ledger holds exactly one open piece of work: a clone on ` +
        `${entry.machineLabel} aimed at ${entry.subject}`
    );

    // --- 4. Its ssh child is a live process ----------------------------------
    await until('the ledger to be given the ssh child', () => {
      const now = liveRemoteExecutions()[0];
      return now !== undefined && now.pid !== null;
    }, 5_000);
    const clonePid = liveRemoteExecutions()[0]?.pid ?? 0;
    if (clonePid <= 0) fail('the ledger never received the ssh child');
    if (!pidIsAlive(clonePid)) {
      fail(`the ssh child ${String(clonePid)} is not a live process`);
    }
    log(`4. the ssh child is pid ${String(clonePid)} and /bin/ps sees it`);

    // --- 5. The far side, counted --------------------------------------------
    await until(
      'the copy script to be running on the far side',
      () => processesNamingTheCopy().farSide > 0,
      20_000
    );
    const running = processesNamingTheCopy();
    const farSideBeforeQuit = running.farSide;
    const sshClientsBeforeQuit = running.sshClients;
    log(
      `5. /bin/ps finds ${String(farSideBeforeQuit)} process(es) on the far ` +
        `side named ${FAR_SIDE_NAME}, and ${String(sshClientsBeforeQuit)} ` +
        `ssh client(s) of Tortie's own carrying that command. In this harness ` +
        `the far side is this same Mac, which is why either number can be ` +
        `counted at all.`
    );

    // --- 6. The real quit ----------------------------------------------------
    const teardownFrom = Date.now();
    await disposeMainCapabilities();
    const teardownMs = Date.now() - teardownFrom;
    log(`6. the real quit teardown ran and took ${String(teardownMs)} ms`);

    // --- 7. The refusal ------------------------------------------------------
    const namingBeforeRefusal = (() => {
      const now = processesNamingTheCopy();
      return now.sshClients + now.farSide;
    })();
    const settledBeforeRefusal = settledRemoteExecutions().length;
    let refusalSentence = '';
    let refusalCode = '';
    try {
      await execRemoteShell(ctx, 'echo p118');
    } catch (err) {
      refusalSentence = sentenceOf(err);
      refusalCode = err instanceof GmuxError ? err.payload.code : '';
    }
    if (refusalSentence !== REMOTE_EXEC_SHUTDOWN) {
      fail(
        `a remote call made after the quit began said\n` +
          `${JSON.stringify(refusalSentence)}\nand the sentence this phase ` +
          `ships is\n${JSON.stringify(REMOTE_EXEC_SHUTDOWN)}`
      );
    }
    if (refusalCode !== 'SHUTTING_DOWN') {
      fail(`the refusal carried code ${JSON.stringify(refusalCode)}`);
    }
    const namingAfterRefusal = (() => {
      const now = processesNamingTheCopy();
      return now.sshClients + now.farSide;
    })();
    const liveAfterRefusal = liveRemoteExecutions().length;
    const settledAfterRefusal = settledRemoteExecutions().length;
    if (liveAfterRefusal !== 0) {
      fail(
        `the refused call left ${String(liveAfterRefusal)} open ledger ` +
          `entry(s). A refusal happens before an argv is composed, so it can ` +
          `open nothing at all.`
      );
    }
    if (settledAfterRefusal !== settledBeforeRefusal) {
      fail(
        `the refused call was classified. The ledger held ` +
          `${String(settledBeforeRefusal)} classified entry(s) before it and ` +
          `${String(settledAfterRefusal)} after it.`
      );
    }
    if (namingAfterRefusal > namingBeforeRefusal) {
      fail(
        `${String(namingBeforeRefusal)} process(es) named the copy before the ` +
          `refused call and ${String(namingAfterRefusal)} after it, so a ` +
          `child was spawned for a call that was refused`
      );
    }
    log(
      `7. a remote call made after the quit began was refused with ` +
        `SHUTTING_DOWN. It opened no ledger entry, was never classified, and ` +
        `the number of processes naming the copy went from ` +
        `${String(namingBeforeRefusal)} to ${String(namingAfterRefusal)}.`
    );

    // --- 8. The child is ended ------------------------------------------------
    if (pidIsAlive(clonePid)) {
      fail(
        `the ssh child ${String(clonePid)} is still alive after the quit ` +
          `joined. That is the defect this phase exists to close.`
      );
    }
    log(`8. /bin/ps finds nothing for pid ${String(clonePid)}`);

    // --- 9. The outcome is classified ----------------------------------------
    const settled = settledRemoteExecutions();
    const mine = settled.filter((one) => one.kind === 'clone');
    if (mine.length !== 1) {
      fail(
        `${String(mine.length)} copies were classified and exactly one was ` +
          `started`
      );
    }
    const cutOff = settled.filter((one) => one.outcome === 'cutOff').length;
    const unjoined = settled.filter((one) => one.outcome === 'unjoined').length;
    if (mine[0]?.outcome !== 'cutOff') {
      fail(
        `the copy was classified ${String(mine[0]?.outcome)} and Tortie ended ` +
          `it because it was quitting, which is cutOff`
      );
    }
    if (unjoined !== 0) {
      fail(
        `${String(unjoined)} piece(s) of work were still open when the join ` +
          `bound expired`
      );
    }
    log(
      `9. the copy is classified cutOff. ${String(cutOff)} piece(s) of work ` +
        `were cut off, ${String(unjoined)} were left unjoined, and the whole ` +
        `teardown took ${String(teardownMs)} ms.`
    );

    // --- 10. The far side afterwards -----------------------------------------
    const farSideAfterQuit = processesNamingTheCopy().farSide;
    log(
      `10. /bin/ps now finds ${String(farSideAfterQuit)} process(es) on the ` +
        `far side named ${FAR_SIDE_NAME}, down from ` +
        `${String(farSideBeforeQuit)}. Tortie ended its own ssh child and can ` +
        `do nothing about the far side, so this number is printed rather ` +
        `than claimed.`
    );

    // --- 11. The durable row --------------------------------------------------
    //
    // The manifest was closed by the teardown above, so this reads the file
    // itself. That is the honest read: it is the bytes the next launch opens.
    const { default: Database } = await import('better-sqlite3');
    const db = new Database(defaultManifestDbPath(), { readonly: true });
    const rows = db
      .prepare(
        `SELECT machine_id, machine_label, kind, subject, outcome
           FROM remote_executions
          WHERE outcome IS NULL`
      )
      .all() as {
      machine_id: string;
      machine_label: string;
      kind: string;
      subject: string;
    }[];
    db.close();
    if (rows.length !== 1) {
      fail(
        `${String(rows.length)} unfinished row(s) are in the manifest and ` +
          `exactly one copy was cut off`
      );
    }
    const row = rows[0];
    if (
      row === undefined ||
      row.machine_id !== CLONE_ID ||
      row.machine_label !== CLONE_LABEL ||
      row.kind !== 'clone' ||
      row.subject !== carriage.destination
    ) {
      fail(
        `the unfinished row reads ${JSON.stringify(row)} and it should name ` +
          `${CLONE_ID}, ${CLONE_LABEL}, clone and ${carriage.destination}`
      );
    }
    log(
      `11. the manifest holds exactly one unfinished copy: ` +
        `${row.machine_label} at ${row.subject}`
    );

    // --- 12. The facts, for the supervisor ------------------------------------
    const written: Facts = {
      machineId: CLONE_ID,
      machineLabel: CLONE_LABEL,
      destination: carriage.destination,
      clonePid,
      sshClientsBeforeQuit,
      farSideBeforeQuit,
      namingBeforeRefusal,
      namingAfterRefusal,
      liveAfterRefusal,
      settledBeforeRefusal,
      settledAfterRefusal,
      farSideAfterQuit,
      teardownMs,
      cutOff,
      unjoined,
      refusalSentence,
      cloneOutcome,
      unfinishedRows: rows.length,
      operatorSessions: operatorBefore
    };
    writeFileSync(
      join(iso.root, FACTS_FILE),
      JSON.stringify(written, null, 2),
      'utf8'
    );
    stopMachineFeeds();
    const operatorAfter = operatorSessionCount();
    if (operatorAfter !== operatorBefore) {
      fail(
        `the operator's own server held ${String(operatorBefore)} session(s) ` +
          `and now holds ${String(operatorAfter)}`
      );
    }
    log(
      `12. PASS (p118-prep). The copy was owned, ended and written down, and ` +
        `the operator's server still holds ${String(operatorAfter)} session(s).`
    );
    app.exit(0);
  } catch (err) {
    smokeFail(err);
  }
}

// ---------------------------------------------------------------------------
// The verify leg
// ---------------------------------------------------------------------------

/**
 * Everything a removal could change, as one string.
 *
 * It is compared byte for byte, which is the only comparison worth making about
 * a rollback. A field left out of this is a field a half commit could move
 * without the gate noticing, so it carries every session row's status and
 * tombstone, the bytes of `machines.json`, and whether the agreement is still on
 * record.
 */
function removalFingerprint(fields: MachineExecutionFields): string {
  const rows = remoteRecordsForMachine(REMOVE_ID)
    .map((record) => ({
      id: record.id,
      status: record.status,
      removedAt: record.removedAt ?? null,
      tombstone: record.machineTombstone ?? null
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
  const file = existsSync(machinesPath()) ? readFileSync(machinesPath(), 'utf8') : '';
  return JSON.stringify(
    {
      rows,
      machinesFile: file,
      confirmed: isMachineConfirmed(REMOVE_ID, fields),
      inTheList: machineRow(REMOVE_ID) !== null
    },
    null,
    2
  );
}

export async function runP118VerifySmoke(): Promise<void> {
  armWatchdog(600_000);
  try {
    const iso = isolate();
    const operatorBefore = operatorSessionCount();
    log(`profile ${iso.userData}, socket ${iso.socket}`);
    log(`the operator's own server holds ${String(operatorBefore)} session(s)`);

    const carriage = readCarriage(iso.root);
    if (carriage === null) fail(`no ${CARRIAGE_FILE} inside ${iso.root}`);
    let facts: Facts;
    try {
      facts = JSON.parse(readFileSync(join(iso.root, FACTS_FILE), 'utf8')) as Facts;
    } catch {
      return fail(
        `no ${FACTS_FILE} inside ${iso.root}. The prep leg did not finish, so ` +
          `there is nothing to verify.`
      );
    }

    // The boot read runs inside this call, because installing the manifest is
    // what triggers it. Nothing below has asked any machine anything.
    await getGmuxCore();

    // --- 13. The person is told, once ----------------------------------------
    const notices = takePendingNotices();
    const cutOffNotices = notices.filter(
      (one) => one.kind === 'remote-work-cut-off'
    );
    if (cutOffNotices.length !== 1) {
      fail(
        `${String(cutOffNotices.length)} remote-work-cut-off notice(s) were ` +
          `posted and exactly one copy was cut off. Every notice posted was: ` +
          `${notices.map((one) => one.kind).join(', ') || 'none'}`
      );
    }
    const notice = cutOffNotices[0];
    if (notice === undefined || notice.kind !== 'remote-work-cut-off') {
      fail('the notice read back is not the one this phase posts');
    }
    if (notice.machineLabel !== facts.machineLabel) {
      fail(
        `the notice names ${JSON.stringify(notice.machineLabel)} and the copy ` +
          `ran on ${JSON.stringify(facts.machineLabel)}`
      );
    }
    if (notice.path !== facts.destination) {
      fail(
        `the notice names the folder ${JSON.stringify(notice.path)} and the ` +
          `copy was aimed at ${JSON.stringify(facts.destination)}`
      );
    }
    if (notice.count !== 1) {
      fail(`the notice counts ${String(notice.count)} and exactly one was cut off`);
    }
    log(
      `13. one remote-work-cut-off notice was posted, naming ` +
        `${notice.machineLabel} and ${notice.path}, with a count of ` +
        `${String(notice.count)}`
    );

    // --- 14. It is said once and never again ---------------------------------
    const left = remoteManifest().listUnfinishedRemoteExecutions();
    if (left.length !== 0) {
      fail(
        `${String(left.length)} unfinished row(s) are still open after the ` +
          `boot read, so the person would be told again at the next launch`
      );
    }
    log('14. no unfinished copy is left in the manifest');

    // --- 15. Five rows on a machine, and an agreement for it ------------------
    const fields = installMachine(REMOVE_ID, REMOVE_LABEL, carriage);
    const at = Date.now();
    for (let i = 0; i < REMOVAL_ROWS; i += 1) {
      const id = `p118-row-${String(i + 1)}`;
      writeRemoteRow({
        sessionId: id,
        machineId: REMOVE_ID,
        name: `p118 removal ${String(i + 1)}`,
        tmuxName: `p118-removal-${String(i + 1)}`,
        projectPath: '/tmp/p118',
        cwd: '/tmp/p118',
        agent: 'shell',
        argv: ['/bin/sh'],
        bin: '/bin/sh',
        createdAt: at
      });
      noteRemoteRowSeen(id, 'running', at);
    }
    const written = remoteRecordsForMachine(REMOVE_ID);
    if (written.length !== REMOVAL_ROWS) {
      fail(
        `${String(written.length)} row(s) were written for ${REMOVE_ID} and ` +
          `${String(REMOVAL_ROWS)} were asked for`
      );
    }
    log(
      `15. ${String(REMOVAL_ROWS)} session rows are on ${REMOVE_LABEL}, the ` +
        `machine is in the list, and the agreement is on record`
    );

    // --- 16. The fingerprint before -------------------------------------------
    const before = removalFingerprint(fields);
    log(`16. the before fingerprint is ${String(before.length)} bytes`);

    // --- 17. The removal that cannot be recorded ------------------------------
    armRemovalFault(3);
    let removalSentence = '';
    let removalCode = '';
    try {
      removeMachineCompletely(REMOVE_ID);
    } catch (err) {
      removalSentence = sentenceOf(err);
      removalCode = err instanceof GmuxError ? err.payload.code : '';
    }
    if (removalSentence !== MACHINE_REMOVAL_NOT_RECORDED) {
      fail(
        `a removal whose record could not be written said\n` +
          `${JSON.stringify(removalSentence)}\nand the sentence this phase ` +
          `ships is\n${JSON.stringify(MACHINE_REMOVAL_NOT_RECORDED)}`
      );
    }
    if (removalCode !== 'FS_FAILED') {
      fail(`the refused removal carried code ${JSON.stringify(removalCode)}`);
    }
    log('17. a removal that could not be recorded threw, and named itself');

    // --- 18. Nothing moved ----------------------------------------------------
    const after = removalFingerprint(fields);
    if (after !== before) {
      fail(
        `the failed removal changed something. Before:\n${before}\nAfter:\n${after}`
      );
    }
    const tombstonedNow = remoteRecordsForMachine(REMOVE_ID).filter(
      (one) => one.machineTombstone !== undefined
    ).length;
    if (tombstonedNow !== 0) {
      fail(
        `${String(tombstonedNow)} row(s) were tombstoned by a removal that ` +
          `failed. That is the half commit this phase closes.`
      );
    }
    log(
      `18. the after fingerprint equals the before fingerprint byte for byte. ` +
        `0 rows tombstoned, machines.json unchanged, the agreement still on ` +
        `record, and the machine still in the list.`
    );

    // --- 19. The retry --------------------------------------------------------
    armRemovalFault(null);
    const outcome = removeMachineCompletely(REMOVE_ID);
    if (outcome.tombstoned !== REMOVAL_ROWS) {
      fail(
        `the retry tombstoned ${String(outcome.tombstoned)} row(s) and ` +
          `${String(REMOVAL_ROWS)} were there`
      );
    }
    if (outcome.commandsSent !== 0) {
      fail(
        `the removal sent ${String(outcome.commandsSent)} command(s) to the ` +
          `machine, and it may send none`
      );
    }
    const recorded = remoteRecordsForMachine(REMOVE_ID);
    for (const one of recorded) {
      if (one.status !== 'discarded') {
        fail(`row ${one.id} reads ${one.status} rather than discarded`);
      }
      if (one.machineTombstone?.machineLabel !== REMOVE_LABEL) {
        fail(
          `row ${one.id} carries the label ` +
            `${JSON.stringify(one.machineTombstone?.machineLabel)} and the ` +
            `machine was called ${REMOVE_LABEL}`
        );
      }
    }
    log(
      `19. the retry tombstoned ${String(outcome.tombstoned)} row(s) in one ` +
        `transaction, sent ${String(outcome.commandsSent)} command(s), and ` +
        `every row carries ${REMOVE_LABEL}`
    );

    // --- 20. The file and the agreement ---------------------------------------
    reloadMachines();
    if (machineRow(REMOVE_ID) !== null) {
      fail('the machine is still in machines.json after it was removed');
    }
    if (isMachineConfirmed(REMOVE_ID, fields)) {
      fail('the agreement is still on record after the machine was removed');
    }
    log('20. the machine left machines.json and the agreement went with it');

    // --- 21. The third removal changes nothing ---------------------------------
    const settledPrint = removalFingerprint(fields);
    const third = removeMachineCompletely(REMOVE_ID);
    if (third.tombstoned !== 0) {
      fail(
        `a third removal tombstoned ${String(third.tombstoned)} row(s) and ` +
          `every row was already recorded`
      );
    }
    const afterThird = removalFingerprint(fields);
    if (afterThird !== settledPrint) {
      fail(
        `a third removal changed something. Before:\n${settledPrint}\n` +
          `After:\n${afterThird}`
      );
    }
    log(
      '21. a third removal answered 0, threw nothing, and changed nothing. ' +
        'That is what makes a retry after a failure safe.'
    );

    // --- 22. The operator's own server ----------------------------------------
    stopMachineFeeds();
    const operatorAfter = operatorSessionCount();
    if (operatorAfter !== operatorBefore) {
      fail(
        `the operator's own server held ${String(operatorBefore)} session(s) ` +
          `and now holds ${String(operatorAfter)}`
      );
    }
    log(
      `22. PASS (p118-verify). The person was told once about the copy that ` +
        `was cut off, a removal that could not be recorded removed nothing, ` +
        `the retry recorded all ${String(REMOVAL_ROWS)} rows in one ` +
        `transaction, and a third removal changed nothing. The operator's ` +
        `server still holds ${String(operatorAfter)} session(s).`
    );
    app.exit(0);
  } catch (err) {
    smokeFail(err);
  }
}

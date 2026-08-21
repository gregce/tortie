/**
 * GMUX_SMOKE=p117-prep and GMUX_SMOKE=p117-verify. A remote create whose answer
 * was lost keeps its row, and a later run binds the same session (Phase 117).
 *
 * ## The sentence this gate exists to prove
 *
 * Let the far side create really succeed. Lose the reply. Make the confirmation
 * read unreachable. Restart Tortie. Prove that the next run binds the SAME
 * immutable id to the session that machine is still running, and that no second
 * create was made.
 *
 * Before Phase 117 the confirmation read had a broad catch. Every failure came
 * back as `null`, the caller read `null` as "nothing is running there", the
 * durable row was deleted, and the person was told nothing had started. The
 * session was running on the other machine and nothing on this Mac recorded it.
 * That is phase 1 of docs/audits/2026-08-20-electron-typescript-architecture.md
 * and the operator ranked it P0.
 *
 * ## The fault is real rather than forged
 *
 * `build/p117-create-unknown.mjs` writes a small program on the far side and
 * names it as the machine's `remoteTmuxPath`. That program is a pass through for
 * every command except the one create this run arms it for. On that one it runs
 * the real tmux, lets the session be created, and then ends the sign in server
 * and its own connection. So the create really succeeded, the reply really was
 * lost because the transport really died under it, and the confirmation read
 * that follows really cannot reach the machine.
 *
 * NO STDERR IS FORGED AND NO FAULT SEAM IS ADDED TO PRODUCTION CODE. Nothing in
 * `src/main/machines/` knows this harness exists.
 *
 * ## The division of work, and why the app never grades itself
 *
 * The supervisor owns the machine, the wrapper, the recorded pids and the
 * verdict. This process owns the moments, because only it knows when a create
 * has been sent and not yet answered. It writes facts to `p117-facts.json` and
 * the supervisor reads them. That is the division `build/partition-harness.mjs`
 * already uses.
 *
 * ## The two modes
 *
 *   p117-prep    the negative, then the fault create, then the durable read
 *   p117-verify  a second launch on the SAME user data directory, which is
 *                what makes the restart real rather than described
 *
 * ## The run order, and one deviation from the written plan
 *
 * The plan numbered the negative create as step 6, inside the prep leg and after
 * the fault. It cannot run there. The negative needs a machine that ANSWERS, and
 * the fault takes the sign in server away for the rest of that leg. So the
 * negative runs at the end of the VERIFY leg, where the machine is back and the
 * wrapper has already spent its one fault. Every claim it makes is unchanged by
 * the move, and the count of sessions on that machine is read before it and
 * again after it. The step numbers below are the plan's numbers, and the order
 * they run in is the order they are written in.
 *
 * ## Safety
 *
 * It refuses to run unless the profile is inside `GMUX_CONFIG_ROOT`, and it
 * refuses the real socket by name, for the reason `../machines/remote-smoke.ts`
 * gives: the far side of this connection is this same Mac, so a remote
 * `new-session` on socket `gmux` would land on the server holding the operator's
 * live work. It counts the operator's sessions before and after. It never uses
 * `pkill` and it never uses `kill-server`.
 *
 * `npm run smoke:p117` is the only supported way to run it.
 */

import { app } from 'electron';
import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { GmuxError } from '../errors';
import { assertHarnessIsolation } from './isolation';
import { armWatchdog, smokeFail } from './support';
import { activeTmuxSocket, TMUX_SOCKET } from '../tmux/resolve';
// The pinned control session a live connection opens on every machine. It is
// filtered out of every count below, because it is Tortie's own connection and
// not a session anybody created. `src/main/sessions/` filters it for the same
// reason, from the same constant.
import { isControlSession } from '../tmux/control-client';
import {
  MACHINE_CONFIRM_ACKNOWLEDGEMENT,
  confirmMachine,
  describeMachine,
  type MachineExecutionFields
} from '../machines/confirm';
import { machineContext, type RemoteMachineContext } from '../machines/context';
import { execOn } from '../machines/exec-plane';
import { prepareMachine } from '../machines/prepare';
// The two sentences this phase added, imported from the module that produces
// them so a rewording that forgets this harness fails the gate rather than
// passing it.
import {
  CREATE_ANSWER_LOST,
  RESTORE_CREATE_UNCONFIRMED
} from '../machines/remote-copy';
import {
  parseRemoteListLine,
  refuseRemoteRestore,
  remoteCreate,
  remoteListArgs,
  remoteMachineFacts,
  remoteRestoreVerdictFor,
  remoteSessionRow,
  startRemotePoll,
  stopMachineFeeds
} from '../machines/remote-sessions';
import {
  remoteRecordOf,
  unconfirmedRemoteRecords
} from '../machines/remote-record';
import { stopRemoteHarvest } from '../machines/remote-harvest';
import { stopRemoteStoreSync } from '../machines/remote-store-sync';
import {
  addMachineRow,
  machineHostKeysPath,
  reloadMachines
} from '../machines/store';
import { getGmuxCore } from '../sessions';

function log(line: string): void {
  console.log(`[gmux-p117] ${line}`);
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

/** The machine this gate makes. One machine, and it is this same Mac. */
const ID = 'p117';
const LABEL = 'Unknown Probe';

/** What `build/p117-create-unknown.mjs` wrote for this run. */
interface Carriage {
  host: string;
  port: number;
  user: string;
  /** The wrapper, not the real tmux. This is the whole of the fault. */
  remoteTmuxPath: string;
  /** The name prefix the wrapper refuses outright, for the negative. */
  absentPrefix: string;
  /** The name prefix the wrapper arms its one fault on. */
  lostPrefix: string;
}

const CARRIAGE_FILE = 'p117-carriage.json';
const FACTS_FILE = 'p117-facts.json';

/** What the prep leg learned, read by the verify leg and by the supervisor. */
interface Facts {
  machineId: string;
  /** The create whose answer was lost. Its row must survive. */
  lostSessionId: string;
  projectPath: string;
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
      `the socket is "${TMUX_SOCKET}", the real one. This gate creates a ` +
        `session on a machine, and on this socket that machine is this Mac.`
    );
  }
  // The far side is this same Mac, so a connected time pass would read the
  // operator's own agent stores under their own home directory. Both cadences
  // are off for the whole of this gate, exactly as the Phase 70, Phase 91 and
  // Phase 93 gates turn them off, and for the same reason.
  stopRemoteHarvest();
  stopRemoteStoreSync();
  return { root: iso.root, userData: iso.userData, socket: iso.socket };
}

/** Add the machine row, seal the agreement, and hand back its fields. */
function installMachine(carriage: Carriage): MachineExecutionFields {
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
    id: ID,
    label: LABEL,
    color: 'green',
    host: carriage.host,
    user: carriage.user,
    port: carriage.port,
    remoteTmuxPath: carriage.remoteTmuxPath
  });
  reloadMachines();
  confirmAsAPerson(ID, fields);
  return fields;
}

/** Wait until `read` answers true, or give up and say what was waited for. */
async function until(
  what: string,
  read: () => Promise<boolean> | boolean,
  ms = 60_000
): Promise<void> {
  const deadline = Date.now() + ms;
  for (;;) {
    if (await read()) return;
    if (Date.now() > deadline) {
      fail(`${what} did not happen within ${String(ms)} ms`);
    }
    await new Promise((r) => setTimeout(r, 250));
  }
}

/**
 * Every session the far side holds right now, parsed from its own list.
 *
 * The control session is left out. A live connection is opened with
 * `new-session -A -s gmux-control`, so every machine Tortie is connected to
 * holds one session nobody created, and counting it would make every number
 * below one too many.
 */
async function farSideRows(
  ctx: RemoteMachineContext
): Promise<{ tmuxId: string; tmuxName: string; gmuxId: string }[]> {
  const listed = await execOn(ctx, remoteListArgs());
  return listed
    .split('\n')
    .map(parseRemoteListLine)
    .flatMap((row) =>
      row === null || isControlSession(row.tmuxName)
        ? []
        : [{ tmuxId: row.tmuxId, tmuxName: row.tmuxName, gmuxId: row.gmuxId }]
    );
}

// ---------------------------------------------------------------------------
// The prep leg
// ---------------------------------------------------------------------------

export async function runP117PrepSmoke(): Promise<void> {
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
          `Run this through "npm run smoke:p117", which starts the machine, ` +
          `writes the wrapper and writes that file.`
      );
    }

    // --- 1 and 2. A real machine, confirmed and prepared ---------------------
    const fields = installMachine(carriage);
    const prepared = await prepareMachine({
      machineId: ID,
      fields,
      tortieHostKeys: machineHostKeysPath()
    });
    if (prepared.class !== 'prepared') {
      fail(`the prepare answered ${prepared.class}: ${prepared.detail}`);
    }
    const ctx = machineContext(ID) as RemoteMachineContext;
    const before = await farSideRows(ctx);
    if (before.length !== 0) {
      fail(
        `${LABEL} already holds ${String(before.length)} session(s) that are ` +
          `not the control session, so every count below would be measuring ` +
          `somebody else's work: ` +
          `${before.map((one) => one.tmuxName).join(', ')}`
      );
    }
    log(
      `2. ${LABEL} is signed in and holds no session but Tortie's own control ` +
        `connection`
    );

    // The far side is this same Mac, so a directory made here is a directory
    // that is there. That is a property of this harness and of nothing else.
    const projectPath = mkdtempSync(join(tmpdir(), 'p117-'));

    // --- 3. THE FAULT CREATE ------------------------------------------------
    //
    // The wrapper runs the real tmux, lets the session be created, and then
    // ends the sign in server and its own connection. Everything after this
    // line runs against a machine that cannot be reached at all.
    let lostMessage = '';
    try {
      await remoteCreate({
        machineId: ID,
        name: `${carriage.lostPrefix}-${String(process.pid)}`,
        projectPath,
        cwd: projectPath,
        agent: 'shell'
      });
    } catch (err) {
      lostMessage = sentenceOf(err);
    }
    if (lostMessage === '') {
      fail(
        'the create whose answer was lost resolved. The wrapper did not arm, ' +
          'so nothing below is measuring a lost answer.'
      );
    }
    if (lostMessage !== CREATE_ANSWER_LOST) {
      fail(
        `the create whose answer was lost said\n${JSON.stringify(lostMessage)}\n` +
          `and the sentence this phase ships is\n` +
          `${JSON.stringify(CREATE_ANSWER_LOST)}`
      );
    }
    log('3. the create threw the lost answer sentence, byte for byte');

    // --- 5. The row that no longer disappears --------------------------------
    const unconfirmed = unconfirmedRemoteRecords();
    if (unconfirmed.length !== 1) {
      fail(
        `${String(unconfirmed.length)} row(s) read as an unconfirmed create ` +
          `and exactly one create in this run lost its answer. Before this ` +
          `phase the answer here was zero, because the row was deleted.`
      );
    }
    const lostSessionId = unconfirmed[0]?.id ?? '';
    const row = remoteRecordOf(lostSessionId);
    if (row === null) fail('the unconfirmed row is not in the manifest at all');
    if (row.status !== 'unknown') {
      fail(`the unconfirmed row's status column reads ${String(row.status)}`);
    }
    if (row.machineId !== ID) {
      fail(`the unconfirmed row names machine ${String(row.machineId)}`);
    }
    const facts = remoteMachineFacts(ID);
    if (facts.unconfirmedCreates !== 1) {
      fail(
        `the feed counts ${String(facts.unconfirmedCreates)} unconfirmed ` +
          `create(s) on ${ID} and this run made exactly one`
      );
    }
    log(
      `5. the row for ${lostSessionId} is still there and its status column ` +
        `reads unknown`
    );

    // --- 7. Nothing is carried in memory to the next step --------------------
    const written: Facts = {
      machineId: ID,
      lostSessionId,
      projectPath,
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
      `7. PASS (p117-prep). The create's answer was lost and the row was kept ` +
        `and marked unknown. The operator's server still holds ` +
        `${String(operatorAfter)} session(s).`
    );
    app.exit(0);
  } catch (err) {
    smokeFail(err);
  }
}

// ---------------------------------------------------------------------------
// The verify leg
// ---------------------------------------------------------------------------

export async function runP117VerifySmoke(): Promise<void> {
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

    const core = await getGmuxCore();

    // --- 9. The unknown declaration survived a restart -----------------------
    //
    // Before any feed starts, and before this launch has asked that machine
    // anything at all.
    const unconfirmed = unconfirmedRemoteRecords();
    if (unconfirmed.length !== 1) {
      fail(
        `${String(unconfirmed.length)} unconfirmed row(s) survived the ` +
          `restart and exactly one was left behind`
      );
    }
    const kept = unconfirmed[0];
    if (kept === undefined || kept.id !== facts.lostSessionId) {
      fail(
        `the row that survived is ${String(kept?.id)} and the create in the ` +
          `first launch generated ${facts.lostSessionId}`
      );
    }
    if (kept.status !== 'unknown') {
      fail(`the row that survived reads ${String(kept.status)}, not unknown`);
    }
    log(
      `9. one row survived the restart, its id is ${kept.id}, and its status ` +
        `column still reads unknown`
    );

    // --- 10. It is shown, and it is never drawn as working -------------------
    const drawn = core.listSessions().find((one) => one.id === kept.id);
    if (drawn === undefined) {
      fail(
        'the row a person would see does not hold the unconfirmed session. A ' +
          'row Tortie cannot account for is shown and never hidden.'
      );
    }
    if (drawn.status !== 'unknown') {
      fail(
        `the row a person would see reads ${drawn.status}. An unconfirmed ` +
          `create is never drawn as working.`
      );
    }
    log(`10. the row is in the list a window draws and it reads unknown`);

    // --- 11. No duplicate can be made through the restore verb ---------------
    //
    // The machine row is added and the agreement is sealed first, because
    // without a row in machines.json the gate answers `forgotten` and this step
    // would be measuring a machine a person removed rather than a create nobody
    // confirmed.
    const fields = installMachine(carriage);
    let refusal = '';
    try {
      refuseRemoteRestore(kept.id);
    } catch (err) {
      refusal = sentenceOf(err);
    }
    if (refusal === '') {
      fail(
        'Restore was OFFERED for a session Tortie cannot say started. This is ' +
          'the failure research 28 ranks above every other, being two agents ' +
          'on one conversation.'
      );
    }
    if (refusal !== RESTORE_CREATE_UNCONFIRMED) {
      const verdict = remoteRestoreVerdictFor(kept.id);
      fail(
        `the restore gate refused with ${String(verdict.refusal)} and said\n` +
          `${JSON.stringify(refusal)}\n` +
          `and the sentence for an unconfirmed create is\n` +
          `${JSON.stringify(RESTORE_CREATE_UNCONFIRMED)}\n` +
          `The arm is asked in the wrong place: a row whose create was never ` +
          `confirmed reaches an earlier arm and a person reads the wrong ` +
          `sentence.`
      );
    }
    log('11. Restore is refused, and the sentence names the unconfirmed create');

    // --- 12. The machine comes back and the same id binds --------------------
    const prepared = await prepareMachine({
      machineId: ID,
      fields,
      tortieHostKeys: machineHostKeysPath()
    });
    if (prepared.class !== 'prepared') {
      fail(`the prepare answered ${prepared.class}: ${prepared.detail}`);
    }
    await startRemotePoll(ID);
    await until(
      'the row to bind to the session that machine is still running',
      () => remoteSessionRow(kept.id) !== null
    );
    const bound = remoteSessionRow(kept.id);
    if (bound === null) fail('the row did not bind');
    const ctx = machineContext(ID) as RemoteMachineContext;
    const rows = await farSideRows(ctx);
    const mine = rows.filter((one) => one.gmuxId === kept.id);
    if (mine.length !== 1) {
      fail(
        `${String(mine.length)} session(s) on that machine carry ` +
          `${kept.id} as their @gmux-id and exactly one should`
      );
    }
    log(
      `12. the row bound to ${bound.tmuxId}, and @gmux-id read back off the ` +
        `far side is ${String(mine[0]?.gmuxId)}`
    );

    // --- 13. No duplicate create happened ------------------------------------
    if (rows.length !== 1) {
      fail(
        `${LABEL} holds ${String(rows.length)} session(s) and it should hold ` +
          `exactly the one the first launch created: ` +
          `${rows.map((one) => `${one.tmuxName}=${one.gmuxId}`).join(', ')}`
      );
    }
    log(`13. that machine holds exactly one session, and it is that one`);

    // --- 14. The unknown is spent, and the gate stops refusing ---------------
    await until('the status column to move off unknown', () => {
      const now = remoteRecordOf(kept.id);
      return now !== null && now.status !== 'unknown';
    });
    const settled = remoteRecordOf(kept.id);
    if (settled === null) fail('the row went away once it bound');
    if (unconfirmedRemoteRecords().length !== 0) {
      fail('the row still reads as an unconfirmed create after it bound');
    }
    const verdict = remoteRestoreVerdictFor(kept.id);
    if (verdict.refusal === 'unconfirmed') {
      fail(
        'the restore gate still refuses with unconfirmed after the machine ' +
          'answered and the row bound'
      );
    }
    log(
      `14. the status column reads ${settled.status}, and the restore gate no ` +
        `longer refuses with unconfirmed. It now says ` +
        `${String(verdict.refusal ?? 'nothing, the restore is offered')}.`
    );

    // --- 6. THE NEGATIVE ----------------------------------------------------
    //
    // Without it the phase has traded one data loss for a pile of dead rows. A
    // create the machine ANSWERS and refuses is a proven absence, so its row is
    // deleted exactly as it always was and the person reads the ordinary create
    // failure rather than the new sentence.
    //
    // It runs here rather than in the prep leg because it needs a machine that
    // answers, and the prep leg's fault takes the machine away for the rest of
    // that leg. The wrapper has already spent its one fault by now, so this
    // create is refused by the wrapper without tmux being run at all.
    const beforeNegative = (await farSideRows(ctx)).length;
    let absentMessage = '';
    try {
      await remoteCreate({
        machineId: ID,
        name: `${carriage.absentPrefix}-${String(process.pid)}`,
        projectPath: facts.projectPath,
        cwd: facts.projectPath,
        agent: 'shell'
      });
    } catch (err) {
      absentMessage = sentenceOf(err);
    }
    if (absentMessage === '') {
      fail('the create the machine refuses was not refused at all');
    }
    if (absentMessage.includes(CREATE_ANSWER_LOST)) {
      fail(
        'a create the machine ANSWERED was reported as an answer nobody could ' +
          'read. A refusal that came back is a proven absence, so the row for ' +
          'it must be deleted rather than kept as unknown. The whole of this ' +
          'phase is telling those two apart.'
      );
    }
    if (unconfirmedRemoteRecords().length !== 0) {
      fail(
        `the refused create left ` +
          `${String(unconfirmedRemoteRecords().length)} unconfirmed row(s) ` +
          `behind: ` +
          `${unconfirmedRemoteRecords().map((one) => one.id).join(', ')}`
      );
    }
    const afterNegative = await farSideRows(ctx);
    if (afterNegative.length !== beforeNegative) {
      fail(
        `the create the machine refuses moved that machine from ` +
          `${String(beforeNegative)} session(s) to ` +
          `${String(afterNegative.length)}`
      );
    }
    log(
      `6. a create that machine answered and refused kept no row, said ` +
        `${JSON.stringify(absentMessage.split('\n')[0] ?? '')}, and started ` +
        `nothing`
    );

    const operatorAfter = operatorSessionCount();
    if (operatorAfter !== operatorBefore) {
      fail(
        `the operator's own server held ${String(operatorBefore)} session(s) ` +
          `and now holds ${String(operatorAfter)}`
      );
    }
    log(
      `PASS (p117-verify). A create whose answer was lost kept its row across ` +
        `a restart, Restore was refused while nothing could say whether it ` +
        `started, and the machine coming back bound the SAME id to the session ` +
        `it was still running. No second create was made.`
    );
    app.exit(0);
  } catch (err) {
    smokeFail(err);
  }
}

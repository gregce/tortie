/**
 * The ONE `machines:*` registrar (Phase 68, one channel added in Phase 69, one
 * more in Phase 71, one more in Phase 79.1, one more in Phase 83, one more in
 * Phase 84, two more in Phase 90.2, one more in Phase 90.3 and one more in
 * Phase 98).
 *
 * Twenty two channels, and what is NOT here is the point of the file.
 *
 *  - There is no `machines:connect`, no `machines:attach` and no
 *    `machines:createSession`. Neither Phase 68 nor Phase 69 opens a session on
 *    any machine.
 *  - There is no channel that reads the file and then acts. `machines:reload`
 *    returns rows and does nothing else.
 *  - There is no channel that sets a session's status.
 *
 * Four channels start a process, and every one is a person pressing a button.
 * `machines:tailscaleNames` runs the pinned Tailscale program once.
 * `machines:test` runs ssh once. `machines:prepare` runs ssh and starts the
 * program a machine's work will live in. `machines:installKey` runs the program
 * macOS ships for making a key and then one ssh. Nothing else in this file
 * spawns anything.
 *
 * ## Phase 79.1 adds one channel, and puts its gate somewhere new
 *
 * `machines:installKey` makes a key for one machine and adds its public half to
 * one file on that machine. It does NOT ask {@link assertMachineMayConnect},
 * and the reason is the whole point of the channel: a machine that has never
 * let Tortie in has no program path, so it cannot be confirmed, so requiring a
 * confirmation would make this call unreachable for exactly the person it is
 * for. The operator hit that himself, with no key at all and his own machine
 * refusing his connection.
 *
 * What stands in the gate's place is this call's OWN hash, and it is stronger
 * for this act than the machine hash would be. It covers the machine id, the
 * address, the account name, the port, the file that will be written on that
 * machine and the path the private half is kept at here, so a person agrees to
 * the file name rather than to a row. Main recomputes it before anything is
 * started. A hash that does not match refuses, and at that point no key has
 * been made and nothing has been sent.
 *
 * ## Phase 72 adds no channel, and changes one
 *
 * `machines:remove` used to write the machines file and forget the
 * confirmation. Now it first turns every session row Tortie holds for that
 * machine into a record of what it last knew, then removes the row. It still
 * sends nothing to the machine. The count of commands it sent is returned and
 * logged rather than promised, and `machines:rows` carries the same count of
 * sessions so the question a person answers names a number.
 *
 * ## Where the gate sits, and where it deliberately does not
 *
 * `machines:test` takes a mode.
 *
 *  - `draft` is the Add Machine form. The values are the person's own
 *    keystrokes on their own screen. There is no row and no confirmation, so
 *    the gate is not consulted and must not be: a `machines.json` an agent
 *    wrote can never be the source of a draft test.
 *  - `saved` is a row in `machines.json`, reached from the row menu. That path
 *    calls {@link assertMachineMayConnect} BEFORE it spawns anything, so an
 *    unconfirmed row and a row whose hash moved both refuse with their sentence
 *    and nothing is started.
 *
 * ## Why add and confirm are one handler
 *
 * `machines:add` writes the row and records the confirmation inside one call,
 * because both are caused by one person's click. A stale hash refuses and
 * writes nothing at all. When the row is written and the keychain then refuses
 * to seal the record, the row STAYS and the call returns the sentence saying the
 * confirmation was not recorded. The machine is then visible and not usable,
 * which is honest. A row a person just made is never deleted because of a
 * keychain hiccup.
 */

import { homedir } from 'node:os';
import { app, type IpcMain, type WebContents } from 'electron';
import type { MachineRowV1 } from '@shared/machines';
import {
  MACHINE_COLORS,
  MACHINE_DEFAULT_COLOR,
  MACHINE_VERSION_PATTERN
} from '@shared/machines';
import type {
  MachineAcceptVersionInput,
  MachineAddInput,
  MachineConfirmInput,
  MachineKeyInstallInput,
  MachineKeyInstallResult,
  MachinePrepareResult,
  MachineRowView,
  MachinesResult,
  MachineStateView,
  MachineTestEvent,
  MachineTestInput,
  MachineTestStarted,
  TailscaleSourceResult,
  // ---- PHASE 73 BLOCK B ----
  MachineImagePlacement,
  MachineImagePutInput,
  // ---- END PHASE 73 BLOCK B ----
  // ---- PHASE 73 BLOCK C ----
  MachineReviewFileInput,
  MachineReviewInput,
  MachineReviewList,
  MachineReviewPair,
  // ---- END PHASE 73 BLOCK C ----
  // ---- PHASE 84 ----
  RemoteDirListInput,
  RemoteTreeListInput,
  RemoteTreeListing,
  RemoteDirListing,
  // ---- END PHASE 84 ----
  // ---- PHASE 90.2 ----
  RemoteCloneInput,
  RemoteCloneResult,
  RemoteProjectFindInput,
  RemoteProjectFindResult,
  // ---- END PHASE 90.2 ----
  // ---- PHASE 98 ----
  MachineSearchInput,
  MachineSearchResult
  // ---- END PHASE 98 ----
} from '@shared/ipc';
import { EVT_MACHINE_STATE, EVT_MACHINE_TEST } from '@shared/ipc';
import { gmuxError } from '../errors';
import { handle } from '../typed-ipc';
// Guardrail 1, event half. Every static event channel goes out through this
// one wrapper, never through a bare `webContents.send`, and
// src/shared/__tests__/ipc-single-bridge.test.ts fails on any raw send.
import { broadcastEvent, sendEvent } from '../typed-events';
// Phase 71: the link state of every machine, composed in one module in main.
import { currentMachineStates, onMachineStateChanged } from './machine-state';
import { configDir } from '../config/paths';
import {
  MACHINE_CONFIRM_ACKNOWLEDGEMENT,
  MACHINE_CONFIRM_WARNING,
  MACHINE_PATH_HONESTY,
  assertMachineMayConnect,
  confirmMachine,
  describeMachine,
  forgetMachine,
  machineRowStatus,
  type MachineExecutionFields
} from './confirm';
import {
  cancelLiveMachineTest,
  cancelMachineTest,
  resolveSsh,
  sendMachineTestInput,
  startKeyInstall,
  startMachineTest,
  userHostKeysPath,
  type MachineHostKeyFiles
} from './connection-test';
// Phase 79.1. The sentences, the hash and the composed strings. It starts
// nothing, which is why the runner above and not this module owns the terminal.
import {
  MACHINE_KEY_NO_ID,
  MACHINE_KEY_STALE,
  composeKeyInstallCopy,
  describeKeyInstall
} from './key-install';
// Phase 79.1. The key itself. `machineKeyPath` is pure and makes nothing, so a
// failed connection test can name the file on the block without a key existing.
// `ensureMachineKey` is the one call that runs ssh-keygen, and it runs only
// after the hash a person read has been checked.
import { allowControlPlaneAgain } from './control-plane';
import {
  ensureMachineKey,
  machineKeyLeaf,
  machineKeyPairPresent,
  machineKeyPath
} from './key-material';
// Phase 84, item 8. Whether a create on this machine would get past the ready
// check, asked here so the create sheet does not have to guess and does not
// have to ask the machine.
import { machineCanHoldSession } from './remote-sessions';
// Phase 84, item 6. The folder listing, which is a read and writes nothing on
// either computer.
import { listRemoteDir } from './dir-list';
import { listRemoteTree } from './tree-list';
// Phase 98. One folder on one machine, searched with that machine's own grep.
// It reads and writes nothing on either computer.
import { searchOnMachine } from './remote-search';
// Phase 90.2, item 2. One git config read here, then one folder walk there. It
// writes nothing on either computer.
import { findProjectOnMachine } from './project-counterpart';
// Phase 90.2, item 3. The SECOND write this product can make on another
// computer, and the only one this phase adds. It starts no process of its own:
// the copy goes through the write door in ./remote-run.ts, which can send only
// a script the frozen catalogue holds.
import { cloneProjectOnMachine } from './remote-clone';
import { prepareMachine } from './prepare';
import { validateMachinesFile } from './schema';
// Phase 72: the record a removal leaves behind. It writes tombstones and
// closes the machine down locally. It has no route to the machine at all, and
// the number of commands it returns having sent is a constant zero.
import { forgetMachineSessions, machineSessionCount } from './tombstone';
import {
  addMachineRow,
  currentMachines,
  ensureMachineHostKeysPath,
  machineColorOf,
  machineFieldsOf,
  machineLabelOf,
  machineRow,
  machinesPath,
  reloadMachines,
  removeMachineRow,
  setMachineAcceptedVersion
} from './store';
import { readTailnetMachines } from './tailscale';
// ---- PHASE 73 BLOCK B ----
// Phase 73, item 3. The one write this product makes on another computer. It
// starts no process of its own: the bytes go through the write door in
// ./remote-run.ts, which can send exactly one script because the catalogue
// holds exactly one script that writes.
import { putImagesOnMachine } from './remote-image';
// ---- END PHASE 73 BLOCK B ----
// ---- PHASE 73 BLOCK C ----
// The read only review. It reads a folder on one machine and writes nothing on
// either computer. It starts no process of its own: every byte it moves goes
// through the one door in ./remote-run.ts, which refuses a machine Tortie is
// not connected to.
import { reviewFileOn, reviewFilesOn } from './remote-review';
// ---- END PHASE 73 BLOCK C ----

/**
 * Windows that already carry the "you went away, so the test stops" listener.
 *
 * One listener per window rather than one per test. A person may press the test
 * button many times in one sitting, and a `once` listener that never fires is a
 * listener that stays, so without this the tenth test would print Node's max
 * listeners warning and the hundredth would leak. Weak, so a window that closes
 * is collectable.
 */
const watchedSenders = new WeakSet<WebContents>();

/** One row, as the list draws it. */
function viewOf(row: MachineRowV1): MachineRowView {
  const fields = machineFieldsOf(row);
  const status = machineRowStatus(row.id, fields);
  return {
    id: row.id,
    label: machineLabelOf(row),
    color: machineColorOf(row),
    host: row.host,
    user: fields.user,
    port: fields.port,
    remoteTmuxPath: fields.remoteTmuxPath,
    state: status.state,
    usable: status.state === 'confirmed',
    hash: status.hash,
    confirmedHash: status.confirmedHash,
    confirmedAt: status.confirmedAt,
    confirmedLines: [...status.confirmedLines],
    lines: [...status.lines],
    refusal: status.refusal,
    warning: MACHINE_CONFIRM_WARNING,
    // Phase 72. Counted on this Mac, from the manifest. The machine is not
    // asked, so the answer is the same whether it is reachable or not.
    sessions: machineSessionCount(row.id),
    // Phase 83. The version this person accepted for this machine, so the row
    // can draw it and offer to withdraw it.
    acceptedTmuxVersion: fields.acceptedTmuxVersion,
    // PHASE 84, item 8. Whether a session could be started on this machine
    // RIGHT NOW, which is a different question from whether a person confirmed
    // it. `usable` above keeps its meaning, because Settings reads it to decide
    // whether the Prepare button is offered and a confirmed machine that is
    // asleep has to keep offering Prepare. This one asks exactly what
    // `readyRemoteContext` asks, and it asks the machine nothing.
    ready: machineCanHoldSession(row.id),
    // PHASE 84, item 7. The file name of Tortie's own key for this machine, or
    // null when there is none. The LEAF and never the path: the row already
    // draws the whole path where a person needs it.
    keyFile: machineKeyPairPresent(row.id) ? machineKeyLeaf(row.id) : null
  };
}

/** Everything the section needs in one read. Reads memory, never the disk. */
function resultOf(): MachinesResult {
  const snap = currentMachines();
  const ssh = resolveSsh({ packaged: app.isPackaged, env: process.env });
  return {
    rows: snap.rows.map(viewOf),
    errors: snap.problems.map((problem) => ({
      id: problem.id ?? problem.field,
      field: problem.field,
      reason: problem.message
    })),
    directory: configDir(),
    path: snap.path.length > 0 ? snap.path : machinesPath(),
    present: snap.present,
    honesty: MACHINE_PATH_HONESTY,
    warning: MACHINE_CONFIRM_WARNING,
    ssh: { path: ssh.path, source: ssh.source }
  };
}

/**
 * The two files one connection test checks a machine's identity against.
 *
 * Tortie's own file is FIRST, and that is what makes it the only one the client
 * adds a line to. The person's own file is second and is read, never written,
 * so a machine they already know still raises the alarm when its identity
 * changes. The measurements behind both halves are in the header of
 * ./connection-test.ts, and `build/conformance-machines.mjs` fails if the order
 * is ever reversed.
 */
function hostKeyFilesForTest(): MachineHostKeyFiles {
  return {
    tortie: ensureMachineHostKeysPath(),
    user: userHostKeysPath(homedir())
  };
}

/** The row this id names, or a refusal naming the id. */
function rowOrThrow(id: string): MachineRowV1 {
  const row = machineRow(id);
  if (row === null) {
    throw gmuxError(
      'INVALID_INPUT',
      `There is no machine called ${id} in the machines file. Nothing was ` +
        `started.`
    );
  }
  return row;
}

/**
 * Check one row the way the file would be checked, before it is written.
 *
 * The same validator the loader uses, run over a one row file, so a row Tortie
 * writes can never be a row Tortie then refuses to read. The refusal carries
 * the validator's own sentence, which names the field and the reason.
 */
function assertWritable(row: MachineRowV1): void {
  const checked = validateMachinesFile({ schema: 1, machines: [row] });
  const problem = checked.problems[0];
  if (problem !== undefined) {
    throw gmuxError('INVALID_INPUT', `${problem.message} Nothing was added.`);
  }
  if (currentMachines().rows.some((existing) => existing.id === row.id)) {
    throw gmuxError(
      'INVALID_INPUT',
      `There is already a machine called ${row.id}. Pick another name. ` +
        `Nothing was added.`
    );
  }
}

/** The row an add would write, built from what the renderer sent. */
function rowFromAdd(input: MachineAddInput): MachineRowV1 {
  const row: MachineRowV1 = {
    id: input.id,
    host: input.host,
    // Checked rather than trusted. The renderer is typed, and a value that
    // arrived over IPC is still data from outside this process.
    color: MACHINE_COLORS.includes(input.color)
      ? input.color
      : MACHINE_DEFAULT_COLOR,
    remoteTmuxPath: input.remoteTmuxPath
  };
  if (input.label.length > 0) row.label = input.label;
  if (input.user !== null) row.user = input.user;
  if (input.port !== null) row.port = input.port;
  return row;
}

/**
 * Record one agreement, or say why it was not recorded.
 *
 * The acknowledgement is supplied HERE, in main, by the handler a person's
 * click reaches. It is never sent from the renderer and never read from a file.
 */
function recordAgreement(
  id: string,
  fields: MachineExecutionFields,
  hashRead: string,
  linesRead: readonly string[]
): void {
  const recorded = confirmMachine(id, fields, {
    acknowledgement: MACHINE_CONFIRM_ACKNOWLEDGEMENT,
    hashRead,
    linesRead
  });
  if (recorded === null) {
    throw gmuxError(
      'INVALID_INPUT',
      `Tortie could not record your confirmation for ${id}, because the ` +
        `system keychain is unavailable. Nothing was confirmed.`
    );
  }
}

/**
 * The one push subscription, attached once.
 *
 * `registerMachinesIpc` is called once at boot and its handlers live for the
 * life of the process, so this does too. `broadcastEvent` skips a window that
 * has been destroyed, so a reload or a closed Settings window costs nothing.
 * The guard exists because a test may call the registrar more than once, and a
 * second subscription would send every push twice.
 */
let stateSubscribed = false;

export function registerMachinesIpc(ipc: IpcMain): void {
  handle(ipc, 'machines:rows', (): MachinesResult => resultOf());

  // PHASE 71. The link state of every machine. It reads memory in main and
  // answers: it asks no machine anything, opens no file and starts nothing. The
  // renderer reads it once at boot and is pushed every change after that.
  //
  // It exists because a machine that never answers produces no session row on
  // this Mac, and before this channel there was no way for the window to know
  // that a confirmed machine had gone silent.
  handle(ipc, 'machines:state', (): MachineStateView[] => currentMachineStates());
  if (!stateSubscribed) {
    stateSubscribed = true;
    onMachineStateChanged((states) => {
      broadcastEvent(EVT_MACHINE_STATE, states);
    });
  }

  handle(ipc, 'machines:reload', (): MachinesResult => {
    reloadMachines();
    return resultOf();
  });

  handle(
    ipc,
    'machines:tailscaleNames',
    async (): Promise<TailscaleSourceResult> =>
      readTailnetMachines({
        packaged: app.isPackaged,
        env: process.env,
        alreadyAdded: currentMachines().rows.map((row) => row.host)
      })
  );

  handle(
    ipc,
    'machines:test',
    (event, input: MachineTestInput): MachineTestStarted => {
      const fields = testFieldsOf(input);
      const sender: WebContents = event.sender;
      const emit = (payload: MachineTestEvent): void => {
        if (sender.isDestroyed()) return;
        sendEvent(sender, EVT_MACHINE_TEST, payload);
      };
      const sheetId = testSheetIdOf(input);
      const started = startMachineTest({
        fields,
        sheetId,
        // PHASE 79.1. The path the key for this machine WOULD be kept at. It is
        // computed and nothing is made: `machineKeyPath` opens no file and
        // starts no program. The test needs it because the block a person reads
        // after a refusal names the file, and the hash of that block covers it.
        keyPath: sheetId === null ? null : machineKeyPath(sheetId),
        packaged: app.isPackaged,
        env: process.env,
        hostKeys: hostKeyFilesForTest(),
        emit
      });
      // The window that started the test owns it. A window that goes away takes
      // the client with it, because a pty nobody is watching is a process
      // nobody can answer.
      //
      // One listener per window, not one per test. A person may press the
      // button many times in one sitting, and a `once` listener that never
      // fires is a listener that stays, so the tenth test would print Node's
      // max listeners warning and the hundredth would leak.
      if (!watchedSenders.has(sender)) {
        watchedSenders.add(sender);
        sender.once('destroyed', () => {
          cancelLiveMachineTest();
        });
      }
      return started;
    }
  );

  handle(
    ipc,
    'machines:testInput',
    (_event, input: { testId: string; data: string }): void => {
      sendMachineTestInput(input.testId, input.data);
    }
  );

  handle(ipc, 'machines:testCancel', (_event, testId: string): void => {
    cancelMachineTest(testId);
  });

  handle(ipc, 'machines:add', (_event, input: MachineAddInput): MachineRowView => {
    const row = rowFromAdd(input);
    assertWritable(row);
    const fields = machineFieldsOf(row);
    // The hash the sheet was drawn from is compared against the hash of the row
    // main is about to write. A mismatch refuses and writes NOTHING, so a sheet
    // that went stale cannot add a machine a person never read.
    const summary = describeMachine(row.id, fields);
    if (input.hashRead !== summary.hash) {
      throw gmuxError(
        'INVALID_INPUT',
        `Tortie did not add ${row.id}, because the machine changed after it ` +
          `was shown. Read it again and confirm what it says now. Nothing was ` +
          `added.`
      );
    }
    addMachineRow(row);
    // The row is on disk from here on. A keychain that refuses to seal leaves
    // the row in place and returns the sentence, rather than deleting a machine
    // a person just made.
    recordAgreement(row.id, fields, input.hashRead, input.linesRead);
    return viewOf(row);
  });

  handle(
    ipc,
    'machines:confirm',
    (_event, input: MachineConfirmInput): MachineRowView => {
      const row = rowOrThrow(input.id);
      recordAgreement(
        row.id,
        machineFieldsOf(row),
        input.hashRead,
        input.linesRead
      );
      return viewOf(row);
    }
  );

  // PHASE 83. A person accepts the version one machine reports, after Tortie
  // has said it has not measured it. The order below is `machines:add`'s order,
  // and it is the order that makes a stale sheet write nothing.
  //
  //  1. The machine has to be in the file.
  //  2. The version has to be a version. A value that is not refuses HERE, with
  //     nothing written and nothing started.
  //  3. The hash is recomputed over the row as it is now plus the accepted
  //     version, and compared against the hash the sheet was drawn from. A
  //     mismatch refuses and NOTHING is written.
  //  4. Only then is the field written, and only then is the agreement
  //     recorded.
  //
  // It contacts no machine and starts nothing. Preparing the machine is a
  // separate button the person presses afterwards.
  handle(
    ipc,
    'machines:acceptVersion',
    (_event, input: MachineAcceptVersionInput): MachineRowView => {
      const row = rowOrThrow(input.id);
      if (!new RegExp(MACHINE_VERSION_PATTERN).test(input.version)) {
        throw gmuxError(
          'INVALID_INPUT',
          `Tortie did not accept that value for ${row.id}, because it is not a ` +
            `version Tortie can read. A version looks like 3.7c. Nothing was ` +
            `written and nothing was started.`
        );
      }
      const next: MachineExecutionFields = {
        ...machineFieldsOf(row),
        acceptedTmuxVersion: input.version
      };
      const summary = describeMachine(row.id, next);
      if (input.hashRead !== summary.hash) {
        throw gmuxError(
          'INVALID_INPUT',
          `Tortie did not accept that version for ${row.id}, because the ` +
            `machine changed after it was shown. Read it again and confirm ` +
            `what it says now. Nothing was written.`
        );
      }
      setMachineAcceptedVersion(row.id, input.version);
      // The field is on disk from here on. A keychain that refuses to seal
      // leaves it in place and returns the sentence, rather than dropping what
      // a person just chose.
      recordAgreement(row.id, next, input.hashRead, input.linesRead);
      const written = machineRow(row.id);
      return viewOf(written ?? row);
    }
  );

  handle(ipc, 'machines:forget', (_event, id: string): MachineRowView => {
    // PHASE 83. The accepted version goes with the agreement, and it has to.
    // The version is one of the five facts the hash covers, so a row that kept
    // it after the agreement was dropped would ask to be confirmed again on a
    // sheet still carrying a version the person had just withdrawn. Both
    // buttons that reach this channel say so in their own words.
    setMachineAcceptedVersion(id, null);
    forgetMachine(id);
    const row = machineRow(id);
    if (row !== null) return viewOf(row);
    // The machine left the file as well. Report it as one nobody has agreed to,
    // which is what it is, rather than failing a withdrawal that succeeded.
    return {
      id,
      label: id,
      color: MACHINE_DEFAULT_COLOR,
      host: '',
      user: null,
      port: null,
      remoteTmuxPath: null,
      state: 'never',
      usable: false,
      hash: '',
      confirmedHash: null,
      confirmedAt: null,
      confirmedLines: [],
      lines: [],
      refusal: null,
      warning: MACHINE_CONFIRM_WARNING,
      // The row is not in the file, so Tortie holds no machine to count
      // sessions for.
      sessions: 0,
      acceptedTmuxVersion: null
    };
  });

  handle(ipc, 'machines:remove', (_event, id: string): MachinesResult => {
    // PHASE 72. The tombstones are written FIRST, and the order is the whole
    // of it. The label a person read is in machines.json and nowhere else, so
    // a removal that deleted the row first would write "You removed
    // studiomachine" instead of "You removed Studio". This call sends nothing
    // to the machine: it ends no session, stops no server, and reads nothing
    // there. Row 10 of the fault matrix is the measurement of that.
    const forgotten = forgetMachineSessions(id);
    removeMachineRow(id);
    // The record goes with the row. A machine that comes back later is a
    // machine nobody has agreed to yet.
    forgetMachine(id);
    if (forgotten.tombstoned > 0) {
      console.log(
        `[gmux] ${id} was removed. ${String(forgotten.tombstoned)} session ` +
          `row(s) became a record of what Tortie last knew, and ` +
          `${String(forgotten.commandsSent)} command(s) were sent to it.`
      );
    }
    return resultOf();
  });

  // PHASE 69. The one channel that starts something on another machine, and the
  // one production caller of the exec plane. It refuses an unconfirmed row before
  // any process exists, and it refuses a version nobody measured before any
  // server is started. It opens no session, because this release has no path that
  // could.
  handle(
    ipc,
    'machines:prepare',
    async (_event, id: string): Promise<MachinePrepareResult> => {
      const row = rowOrThrow(id);
      // PHASE 83. Preparing a machine is a person pressing a button, so it is
      // the one act that takes that machine back off the greeting deadline set.
      // Without this line a machine that missed the greeting once kept the timer
      // feed until Tortie was quit, and there was no way back from inside the
      // app. Nothing is sent to the machine by this call.
      allowControlPlaneAgain(row.id);
      return prepareMachine({
        machineId: row.id,
        fields: machineFieldsOf(row),
        tortieHostKeys: ensureMachineHostKeysPath(),
        // PHASE 84, item 7. The key Tortie made for this machine, named on
        // every command it sends there from now on. It is read HERE rather
        // than inside the context builder, because the module that knows
        // where a machine's key lives reads the store, and an import from the
        // context builder to it put a native file watcher into the import
        // graph of the manifest.
        identityFile: machineKeyPairPresent(row.id) ? machineKeyPath(row.id) : null
      });
    }
  );

  // PHASE 79.1. The one call that makes a key and puts its public half on one
  // machine. The order below is the whole safeguard, and it is the order the
  // spec of this phase names.
  //
  //  1. The machine has to have a name, because the name is on the hash.
  //  2. The fields are validated the same way a test's are, so a typed address
  //     the file would refuse is refused here with the same sentence.
  //  3. The hash is recomputed and compared. A mismatch refuses HERE, with no
  //     key made, no program started and nothing sent to any machine.
  //  4. Only then is the key made, and only then is one connection opened.
  handle(
    ipc,
    'machines:installKey',
    async (
      _event,
      input: MachineKeyInstallInput
    ): Promise<MachineKeyInstallResult> => {
      const id = keyInstallIdOf(input.target);
      const fields = keyInstallFieldsOf(input.target);
      const block = describeKeyInstall(id, {
        host: fields.host,
        user: fields.user,
        port: fields.port,
        localKeyPath: machineKeyPath(id)
      });
      if (input.hashRead !== block.hash || !sameLines(input.linesRead, block.lines)) {
        throw gmuxError('INVALID_INPUT', MACHINE_KEY_STALE);
      }
      // From here a key exists on this Mac. Nothing has been sent yet.
      const material = ensureMachineKey({ id });
      const run = await startKeyInstall({
        machineId: id,
        fields,
        publicKeyLine: material.publicKeyLine,
        password: input.password,
        packaged: app.isPackaged,
        env: process.env,
        hostKeys: hostKeyFilesForTest()
      });
      const copy = composeKeyInstallCopy({
        cls: run.cls,
        text: run.transcript,
        exitCode: run.exitCode
      });
      return {
        id,
        class: copy.class,
        alarm: copy.alarm,
        headline: copy.headline,
        detail: copy.detail,
        wrote: run.wrote,
        keyMade: material.made,
        fingerprint: material.fingerprint,
        transcript: run.transcript,
        durationMs: run.durationMs
      };
    }
  );

  // ---- PHASE 73 BLOCK B ----
  // PHASE 73, item 3. The ONE channel in this file that writes on another
  // computer, and the fifth that starts a process at all.
  //
  // What it writes is bounded by the script it sends rather than by this
  // handler. The name is composed in main from the session id and a checksum of
  // the bytes, the directory is `~/.tortie/images` resolved by that machine's
  // own shell, and a file that is already there is never opened for writing. So
  // running it twice writes one file, which is what every command that crosses
  // to a machine has to be able to do.
  //
  // It does not ask {@link assertMachineMayConnect} again, for the reason the
  // review channels below do not: a machine with a registered context has
  // already been through that gate, and `readyRemoteContext` refuses one that
  // has not.
  handle(
    ipc,
    'machines:putImage',
    async (
      _event,
      input: MachineImagePutInput
    ): Promise<MachineImagePlacement[]> =>
      putImagesOnMachine({
        machineId: input.machineId,
        sessionId: input.sessionId,
        paths: input.paths
      })
  );
  // ---- END PHASE 73 BLOCK B ----

  // ---- PHASE 73 BLOCK C ----
  // PHASE 73, item 4. Two channels that READ one folder on one machine.
  //
  // They are the first channels in this file that ask a machine for something
  // that is not a session, and the reason they are safe to add is that they
  // cannot compose what they ask. Every command that crosses to a machine is
  // one of Tortie's own constant scripts, chosen from the catalogue in
  // ./remote-scripts.ts by name, with the folder and the path arriving there as
  // positional parameters. Neither channel can name a git subcommand, so
  // neither can turn a review into a commit.
  //
  // Neither asks {@link assertMachineMayConnect} again. A machine with a live
  // connection has already been through that gate: nothing has a registered
  // context without it, and `readyRemoteContext` refuses a machine that has no
  // registered context with the sentence saying so.
  handle(
    ipc,
    'machines:reviewFiles',
    async (_event, input: MachineReviewInput): Promise<MachineReviewList> =>
      reviewFilesOn({ machineId: input.machineId, cwd: input.cwd })
  );

  handle(
    ipc,
    'machines:reviewFile',
    async (_event, input: MachineReviewFileInput): Promise<MachineReviewPair> =>
      reviewFileOn({
        machineId: input.machineId,
        repoPath: input.repoPath,
        path: input.path,
        origPath: input.origPath
      })
  );
  // ---- END PHASE 73 BLOCK C ----

  // ---- PHASE 84 ----
  // PHASE 84, item 6. One channel that READS the folders inside one folder on
  // one machine, so the create sheet can offer a picker for the other computer.
  //
  // It is safe to add for the reason the two review channels above are: it
  // cannot compose what it asks. The command that crosses is `dir-list` from
  // the frozen catalogue in ./remote-scripts.ts, chosen by name, with the
  // folder arriving there as a positional parameter. It lists folders and never
  // files, so it is a folder chooser rather than a file browser, and it carries
  // no file contents at all.
  //
  // It NEVER THROWS for anything the machine said. A folder that is not there,
  // a path that is not a folder, a folder the account cannot read and a machine
  // that did not answer all come back as a listing carrying its own refusal and
  // one sentence, because the picker has a panel to draw either way.
  //
  // It does not ask {@link assertMachineMayConnect} again, for the reason the
  // review channels do not: a machine with a registered context has already
  // been through that gate, and `readyRemoteContext` refuses one that has not.
  handle(
    ipc,
    'machines:listDir',
    async (_event, input: RemoteDirListInput): Promise<RemoteDirListing> =>
      listRemoteDir({ machineId: input.machineId, path: input.path })
  );
  // ---- END PHASE 84 ----

  // ---- PHASE 90.2 ----
  // PHASE 90.2, item 2. One channel that READS. It reads this project's git
  // remote on this Mac with `git config --get`, then asks one machine once for
  // every git folder under that machine's own home directory, and matches the
  // two here. It writes nothing on either computer.
  //
  // THE ADDRESS IS READ ONCE AND DROPPED. The result carries paths and
  // sentences and nothing a caller could resolve. No sidebar, no editor and no
  // search ever sees it, and the session that follows is bound to a machine id
  // and an absolute path exactly like every other session.
  //
  // A project with no git remote, and a project whose remote is a folder on
  // this Mac, contact the machine ZERO times. The local read happens first for
  // exactly that reason.
  //
  // It NEVER THROWS for anything the machine said. Six outcomes, each with its
  // own sentences, because the block in the create sheet has a panel to draw
  // either way.
  handle(
    ipc,
    'machines:findProject',
    async (
      _event,
      input: RemoteProjectFindInput
    ): Promise<RemoteProjectFindResult> =>
      findProjectOnMachine({
        machineId: input.machineId,
        localPath: input.localPath
      })
  );

  // PHASE 90.2, item 3. The channel that WRITES, and it is the second write
  // this product can make on another computer.
  //
  // It cannot compose what it sends. The command that crosses is `git-clone`
  // from the frozen catalogue in ./remote-scripts.ts, chosen by name, with the
  // address and the destination arriving there as positional parameters.
  //
  // THE RENDERER DOES NOT CHOOSE THE ADDRESS. Main re-reads the origin at
  // `localPath`, translates it again, and refuses with `changed` when its own
  // read does not equal `expectUrl`. So what crosses is always an address main
  // read from a repository on this Mac.
  //
  // NO SESSION EXISTS WHILE IT RUNS. Nothing is written into the manifest and
  // no session is started until the machine says the folder is there, so a
  // copy that failed cannot leave a session in a folder that is not there.
  handle(
    ipc,
    'machines:cloneProject',
    async (_event, input: RemoteCloneInput): Promise<RemoteCloneResult> =>
      cloneProjectOnMachine({
        machineId: input.machineId,
        localPath: input.localPath,
        expectUrl: input.expectUrl,
        path: input.path
      })
  );
  // ---- END PHASE 90.2 ----

  // ---- PHASE 90.3 ----
  // PHASE 90.3. One channel that READS one folder TREE on one machine, so the
  // Explorer of a project that lives over there can list rows.
  //
  // It is safe to add for the reason `machines:listDir` above is: it cannot
  // compose what it asks. The command that crosses is `tree-list` from the
  // frozen catalogue in ./remote-scripts.ts, chosen by name, with the folder,
  // the depth and the cap arriving there as positional parameters. It carries
  // no file contents at all, and `.git` is pruned on the far side, so a
  // repository's internals never cross the link.
  //
  // NOTHING CALLS IT ON A CLOCK. The renderer calls it when a tab is opened,
  // when a folder is expanded past the fetched depth, and when a person presses
  // Refresh. There is no poll in this product for it.
  //
  // It NEVER THROWS for anything the machine said. A folder that is not there,
  // a path that is a file, a folder the account cannot read, a machine that did
  // not answer and a machine Tortie is not signed in to all come back as a
  // status word. No prose crosses this channel: the renderer draws the sentence
  // from src/renderer/app/machine-copy.ts, where the vocabulary audit reads it.
  handle(
    ipc,
    'machines:listTree',
    async (_event, input: RemoteTreeListInput): Promise<RemoteTreeListing> =>
      listRemoteTree({
        machineId: input.machineId,
        root: input.root,
        ...(input.depth === undefined ? {} : { depth: input.depth })
      })
  );
  // ---- END PHASE 90.3 ----

  // ---- PHASE 98 ----
  // PHASE 98. One channel that READS one folder on one machine, so the Search
  // view of a project that lives over there draws rows instead of a sentence
  // saying search does not reach that far.
  //
  // It cannot compose what it asks. The command that crosses is `repo-search`
  // from the frozen catalogue in ./remote-scripts.ts, chosen by name, with the
  // folder, the pattern, the flag letters and the two caps arriving there as
  // positional parameters. NOTHING IS SENT TO THAT MACHINE except that constant
  // text: research 57 section 2 measured shipping a ripgrep and refused it.
  //
  // NOTHING CALLS IT ON A CLOCK. A search happens when a person types, and the
  // renderer owns the debounce. There is no poll in this product for it.
  //
  // It NEVER THROWS for anything the machine said. A folder that is not there,
  // a pattern that machine's grep refused, a machine that did not answer and a
  // machine Tortie is not signed in to all come back as a mode word. No prose
  // crosses this channel: the renderer draws the sentence from
  // src/renderer/app/machine-copy.ts, where the vocabulary audit reads it. The
  // one thing that throws is an empty pattern, which is a caller error rather
  // than a state of a machine, and nothing is sent for it.
  handle(
    ipc,
    'machines:searchContent',
    async (_event, input: MachineSearchInput): Promise<MachineSearchResult> =>
      searchOnMachine({
        machineId: input.machineId,
        cwd: input.cwd,
        query: input.query,
        isRegex: input.isRegex,
        isCaseSensitive: input.isCaseSensitive,
        matchWholeWord: input.matchWholeWord,
        ...(input.maxResults === undefined ? {} : { maxResults: input.maxResults })
      })
  );
  // ---- END PHASE 98 ----
}

/**
 * The machine one install is for, or the sentence saying it needs a name.
 *
 * A saved row has one. A draft has the id the person typed into the form, and
 * it is absent until they have typed it. There is no unnamed case, because the
 * name is part of what the person agreed to and it is what tells one machine's
 * key from another's.
 */
function keyInstallIdOf(target: MachineTestInput): string {
  const id = target.mode === 'saved' ? target.id : (target.draft.id ?? '');
  if (id.length === 0) throw gmuxError('INVALID_INPUT', MACHINE_KEY_NO_ID);
  return id;
}

/**
 * The fields one install runs against.
 *
 * A saved row is read from the file and a draft is checked by the SAME
 * validator the loader uses, so a typed address the file would refuse is
 * refused here with the validator's own sentence. Neither path asks
 * {@link assertMachineMayConnect}, and the reason is at the top of this file.
 */
function keyInstallFieldsOf(target: MachineTestInput): MachineExecutionFields {
  if (target.mode === 'saved') return machineFieldsOf(rowOrThrow(target.id));
  const draft = target.draft;
  const row: MachineRowV1 = {
    id: 'draft',
    host: draft.host,
    ...(draft.user !== null ? { user: draft.user } : {}),
    ...(draft.port !== null ? { port: draft.port } : {})
  };
  const checked = validateMachinesFile({ schema: 1, machines: [row] });
  const problem = checked.problems[0];
  if (problem !== undefined) {
    throw gmuxError('INVALID_INPUT', `${problem.message} Nothing was started.`);
  }
  return machineFieldsOf(row);
}

/** True when the renderer sent back exactly the lines main composed. */
function sameLines(read: readonly string[], composed: readonly string[]): boolean {
  if (read.length !== composed.length) return false;
  return read.every((line, at) => line === composed[at]);
}

/**
 * The machine id a test's confirm sheet should be composed for, or null.
 *
 * A saved test is about a row that already exists, so the sheet is that row's.
 * A draft test is about a machine the person is still typing, so the id is the
 * one they have typed, and it is absent until they have typed it. A test with no
 * id produces no sheet, which is honest: there is nothing yet to agree to.
 */
function testSheetIdOf(input: MachineTestInput): string | null {
  if (input.mode === 'saved') return input.id;
  const id = input.draft.id;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

/**
 * The fields one test runs against, and the ONE place the gate is asked.
 *
 * A `saved` test asks the gate before anything is started. A `draft` test does
 * not, and the reason is written at the top of this file.
 */
function testFieldsOf(input: MachineTestInput): MachineExecutionFields {
  if (input.mode === 'saved') {
    const row = rowOrThrow(input.id);
    const fields = machineFieldsOf(row);
    assertMachineMayConnect(row.id, fields);
    return fields;
  }
  const draft = input.draft;
  const row: MachineRowV1 = {
    id: 'draft',
    host: draft.host,
    ...(draft.user !== null ? { user: draft.user } : {}),
    ...(draft.port !== null ? { port: draft.port } : {}),
    ...(draft.remoteTmuxPath !== null
      ? { remoteTmuxPath: draft.remoteTmuxPath }
      : {})
  };
  // The draft is checked the same way a saved row is, so a typed address that
  // the file would refuse is refused here too, with the same sentence.
  const checked = validateMachinesFile({ schema: 1, machines: [row] });
  const problem = checked.problems[0];
  if (problem !== undefined) {
    throw gmuxError('INVALID_INPUT', `${problem.message} Nothing was started.`);
  }
  return machineFieldsOf(row);
}

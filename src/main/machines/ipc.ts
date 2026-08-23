/**
 * The ONE `machines:*` registrar (Phase 68, one channel added in Phase 69, one
 * more in Phase 71, one more in Phase 79.1, one more in Phase 83, one more in
 * Phase 84, two more in Phase 90.2, one more in Phase 90.3, one more in
 * Phase 98, one more in Phase 99 and one more in Phase 100).
 *
 * Twenty four channels, and what is NOT here is the point of the file.
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
  MachineSearchResult,
  // ---- END PHASE 98 ----
  // ---- PHASE 99 ----
  MachineFileListInput,
  MachineFileListResult,
  // ---- END PHASE 99 ----
  // ---- PHASE 100 ----
  MachineSessionLinesInput,
  MachineSessionLinesResult,
  // ---- END PHASE 100 ----
  // ---- PHASE 105 ----
  MachineRunsInput,
  MachineRunsResult,
  // ---- END PHASE 105 ----
  // ---- PHASE 106 ----
  MachineBranchInput,
  MachineBranchResult,
  // ---- END PHASE 106 ----
  // ---- PHASE 107 ----
  MachineHistoryInput,
  MachineHistoryResult,
  // ---- END PHASE 107 ----
  // ---- PHASE 108 ----
  MachineContextInput,
  MachineContextResult,
  // ---- END PHASE 108 ----
  // ---- PHASE 101 ----
  MachineAllowWritesInput,
  MachineConfirmSheet,
  MachineFilePutInput,
  MachineFilePutResult,
  MachineWriteSheetInput,
  // ---- END PHASE 101 ----
  // ---- PHASE 102 ----
  MachineMakeDirInput,
  MachineMakeDirResult,
  MachineRenameInput,
  MachineRenameResult,
  // ---- END PHASE 102 ----
  // ---- PHASE 103 ----
  MachineIndexWriteInput,
  MachineIndexWriteResult,
  // ---- END PHASE 103 ----
  // ---- PHASE 104 ----
  MachineCommitInput,
  MachineCommitResult
  // ---- END PHASE 104 ----
} from '@shared/ipc';
import {
  EVT_MACHINE_AGENTS,
  EVT_MACHINE_STATE,
  EVT_MACHINE_TEST
} from '@shared/ipc';
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
  MACHINE_KEY_STALE,
  composeKeyInstallCopy,
  describeKeyInstall
} from './key-install';
// Phase 123. One refusal sentence, from the leaf that holds it. It moved out of
// `./key-install.ts` so that file and `./key-material.ts` stopped loading each
// other. The sentence did not change.
import { MACHINE_KEY_NO_ID } from './key-codes';
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
// Phase 99. The file NAMES in one folder on one machine, for the Quick Open
// palette on a tab that lives over there. It carries no file contents and it
// writes nothing on either computer.
import { listFilesOnMachine } from './remote-files';
// Phase 100. The last lines one session on one machine printed, for a person
// who wants to read back what an agent over there said. It reads and writes
// nothing on either computer, and it is not a scrollbar.
import { readSessionLinesOnMachine } from './remote-lines';
// Phase 105. The branch checked out in one folder on one machine, and then the
// runs GitHub holds for it. The gh program runs on THIS Mac and never leaves it,
// and nothing on either computer is written.
import { readBranchOnMachine } from './remote-branch';
import { readHistoryOnMachine } from './remote-history';
// Phase 108. The agent configuration on one machine, being what the agents
// over there will load. The reader that resolves precedence runs on THIS Mac;
// the machine only lists directories and sends file bytes back. It reads and
// writes nothing on either computer.
import { readContextOnMachine } from './remote-agent-context';
import { readRunsOnMachine } from './remote-runs';
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
// Phase 72, made one transaction in Phase 118: the whole of a removal. It
// writes every tombstone in one durable transaction, and only when that has
// committed does it let go of the rows, the feeds, the link, the file and the
// agreement. It has no route to the machine at all, and the number of commands
// it returns having sent is a constant zero. A failure throws and nothing is
// removed, which the renderer already draws as a sentence beside the row.
import { machineSessionCount, removeMachineCompletely } from './removal';
// ---- PHASE 109 ----
// Which agents each machine has. `machines:agents` with `fresh: false` reads
// memory in main and starts nothing; with `fresh: true` it sends ONE batched
// read from the frozen catalogue, which is a person pressing Rescan.
// Fix 7's second half, being the drop of the machine's context and generation,
// moved into `./removal.ts` in Phase 118 so that every step of a removal is in
// one place and none of them can run before the record is safe.
import {
  allMachineAgentsViews,
  machineAgentsView,
  onMachineAgentsChanged,
  scanMachineAgents
} from './machine-agents';
// ---- END PHASE 109 ----
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
  setMachineAcceptedVersion,
  setMachineWriteRoot
} from './store';
import { readTailnetMachines } from './tailscale';
// ---- PHASE 73 BLOCK B ----
// Phase 73, item 3. The FIRST of the three writes this product makes on
// another computer. It starts no process of its own: the bytes go through the
// write door in ./remote-run.ts, which can send exactly the three scripts the
// catalogue marks as writes, and the gate holds it at those three by name.
import { putImagesOnMachine } from './remote-image';
// ---- END PHASE 73 BLOCK B ----
// ---- PHASE 73 BLOCK C ----
// The read only review. It reads a folder on one machine and writes nothing on
// either computer. It starts no process of its own: every byte it moves goes
// through the one door in ./remote-run.ts, which refuses a machine Tortie is
// not connected to.
import { reviewFileOn, reviewFilesOn } from './remote-review';
// ---- END PHASE 73 BLOCK C ----
// ---- PHASE 101 ----
// Saving one file on one machine. It owns the whole write decision, including
// the confirm gate, the size, containment and the reading of what the machine
// said. It starts no process of its own: the bytes go through the write door in
// ./remote-run.ts, which refuses a machine Tortie is not connected to.
import { putFileOnMachine } from './remote-file';
// The schema's own validator for the folder, so the sentence a person reads
// when they type a bad one is written in exactly one place.
import { writeRootField } from './schema';
// ---- END PHASE 101 ----
// ---- PHASE 102 ----
// Making a folder and renaming an entry on one machine. It owns both write
// decisions, being the confirm gate, the confirmed folder and containment for
// every path either verb names. It composes nothing here: the two handlers
// below pass their input through and read a status word back. It is imported
// directly rather than through ./index.ts, because its nearest sibling
// `listRemoteTree` in ./tree-list.ts is imported that way too.
import { makeRemoteDir, renameRemoteEntry } from './remote-entry';
// ---- END PHASE 102 ----
// ---- PHASE 103 ----
// Staging and unstaging in one repository on one machine. It owns both write
// decisions, being the confirm gate, the confirmed folder, its own fresh review
// read and the test that every path that read reported. It composes nothing
// here: the two handlers below pass their input through and read a status word
// back. Neither handler names a git verb, because the verb is inside Tortie's
// own script text.
import { stageOnMachine, unstageOnMachine } from './remote-stage';
// ---- END PHASE 103 ----
// ---- PHASE 104 ----
// Committing what is staged in one repository on one machine. It owns the whole
// write decision, being the confirm gate, the confirmed folder, its own fresh
// review read, the sha guard and the staged set comparison. It composes nothing
// here: the handler below passes its input through and reads a word and a list
// of sentences back. The handler names no git verb, because the verb is inside
// Tortie's own script text.
import { commitOnMachine } from './remote-commit';
// ---- END PHASE 104 ----

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
    keyFile: machineKeyPairPresent(row.id) ? machineKeyLeaf(row.id) : null,
    // PHASE 101. The folder this person granted, so the row can draw it and
    // offer to withdraw it, and the paragraph that says what a save costs. Both
    // are composed in main: `writeHonesty` comes from `writeHonestyOf` through
    // `machineRowStatus`, so no renderer decides the question by reading a line.
    writeRoot: fields.writeRoot ?? null,
    writeHonesty: status.writeHonesty
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
    // PHASE 109. The agent map rides the same guard: one subscription for the
    // life of the process, the whole map every push, every window including
    // Settings, because `broadcastEvent` iterates them all.
    onMachineAgentsChanged(() => {
      broadcastEvent(EVT_MACHINE_AGENTS, allMachineAgentsViews());
    });
  }

  // PHASE 109. Which agents each machine has. `fresh: false` reads memory in
  // main and starts nothing, and a null id is the whole map, which is what
  // the renderer asks once at init. `fresh: true` requires an id and sends
  // ONE batched read to that machine, which is a person pressing Rescan;
  // `scanMachineAgents` refuses it while the machine is not ready or not
  // answering, so the real gate is in main rather than in a button's enabled
  // state. The answer decides what a tile looks like and never what a
  // manifest row holds.
  handle(
    ipc,
    'machines:agents',
    async (_event, id: string | null, fresh: boolean) => {
      if (!fresh) {
        return id === null ? allMachineAgentsViews() : [machineAgentsView(id)];
      }
      if (id === null) {
        throw gmuxError(
          'INVALID_INPUT',
          'Tortie scans one machine at a time. Name the machine to scan. ' +
            'Nothing was sent anywhere.'
        );
      }
      await scanMachineAgents(id);
      return [machineAgentsView(id)];
    }
  );

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

  // ---- PHASE 101 BLOCK ----
  //
  // Three channels rather than one, and the split is the design.
  //
  // A person turns saving on for one machine by typing a folder and pressing a
  // button. The renderer may never compose that sheet's lines or its hash, and
  // there is no prior result to take the sheet from, because the person types
  // the folder. So there is a READ that answers the sheet and a WRITE that
  // records the agreement. A single channel that previewed when `hashRead` was
  // null and wrote when it was not was rejected: a channel that both previews
  // and writes is a channel where one wrong argument writes.
  //
  // The third is the save itself, and it is the only door to `file-put`.

  /**
   * The folder a person typed, checked with the schema's own validator.
   *
   * The validator throws its own sentence naming the field and the reason, and
   * that sentence is what a person reads. Nothing is written and nothing is
   * started when it refuses.
   */
  const writeRootOrThrow = (id: string, value: unknown): string => {
    try {
      return writeRootField(value, 'The folder Tortie may save under');
    } catch (err) {
      throw gmuxError(
        'INVALID_INPUT',
        `${(err as Error).message} Nothing was written for ${id} and nothing ` +
          `was started.`
      );
    }
  };

  // THIS ONE READS. It composes the sheet for the row as it is now plus the
  // folder, and answers it. It starts nothing, opens no connection, sends
  // nothing to any machine and writes nothing at all.
  handle(
    ipc,
    'machines:writeSheet',
    (_event, input: MachineWriteSheetInput): MachineConfirmSheet => {
      const row = rowOrThrow(input.id);
      const root = writeRootOrThrow(row.id, input.writeRoot);
      const summary = describeMachine(row.id, {
        ...machineFieldsOf(row),
        writeRoot: root
      });
      return {
        hash: summary.hash,
        lines: [...summary.lines],
        warning: summary.warning,
        // The paragraph that says what a save costs. It is answered by main and
        // it is not one of `lines`, so the hash does not cover it and no sheet
        // that grants file replacement can be drawn without it.
        writeHonesty: summary.writeHonesty
      };
    }
  );

  // PHASE 101. A person turns saving on for one machine. The order below is
  // `machines:acceptVersion`'s order, because that channel is this one's
  // precedent, and it is the order that makes a stale sheet write nothing.
  //
  //  1. The machine has to be in the file.
  //  2. The folder has to pass the schema's validator. A value that does not
  //     refuses HERE, with nothing written and nothing started.
  //  3. The hash is recomputed over the row as it is now plus the proposed
  //     folder, and compared against the hash the sheet was drawn from. A
  //     mismatch refuses and NOTHING is written.
  //  4. Only then is the field written, and only then is the agreement
  //     recorded.
  //
  // It contacts no machine, starts nothing and opens no connection.
  handle(
    ipc,
    'machines:allowWrites',
    (_event, input: MachineAllowWritesInput): MachineRowView => {
      const row = rowOrThrow(input.id);
      const root = writeRootOrThrow(row.id, input.writeRoot);
      const next: MachineExecutionFields = {
        ...machineFieldsOf(row),
        writeRoot: root
      };
      const summary = describeMachine(row.id, next);
      if (input.hashRead !== summary.hash) {
        throw gmuxError(
          'INVALID_INPUT',
          `Tortie did not turn saving on for ${row.id}, because the machine ` +
            `changed after it was shown. Read it again and confirm what it ` +
            `says now. Nothing was written.`
        );
      }
      setMachineWriteRoot(row.id, root);
      // The field is on disk from here on. A keychain that refuses to seal
      // leaves it in place and returns the sentence, rather than dropping what
      // a person just chose.
      recordAgreement(row.id, next, input.hashRead, input.linesRead);
      const written = machineRow(row.id);
      return viewOf(written ?? row);
    }
  );

  // PHASE 101. The save. It is the third channel in this product that can write
  // on another computer, and the only door to the `file-put` script.
  //
  // EVERY REFUSAL IT CAN ANSWER MEANS NOTHING WAS WRITTEN. The three main
  // decides on this Mac, being `writesOff`, `tooLarge` and `outsideRoot`,
  // happen before anything is composed. The five the machine reports, being
  // `stale`, `missing`, `exists`, `nomode` and `nosum`, are all printed above
  // the line in the script that writes and none of them below it. That is a
  // property of the script text and the gate's condition 80 reads it out of
  // that text, rather than a claim made here. The first fix round of this
  // phase found `nosum` being printed after the write and closed it.
  //
  // A save whose result nobody can describe is NOT a refusal and is not in this
  // list. The script prints `unsure` for it and the call throws the sentence
  // that says Tortie cannot tell whether the file was saved.
  handle(
    ipc,
    'machines:putFile',
    async (
      _event,
      input: MachineFilePutInput
    ): Promise<MachineFilePutResult> => {
      return putFileOnMachine(input);
    }
  );
  // ---- END PHASE 101 BLOCK ----

  handle(ipc, 'machines:forget', (_event, id: string): MachineRowView => {
    // PHASE 83. The accepted version goes with the agreement, and it has to.
    // The version is one of the five facts the hash covers, so a row that kept
    // it after the agreement was dropped would ask to be confirmed again on a
    // sheet still carrying a version the person had just withdrawn. Both
    // buttons that reach this channel say so in their own words.
    setMachineAcceptedVersion(id, null);
    // PHASE 101. The folder goes with the agreement for the same reason the
    // version does. It is one of the six facts the hash covers, so a row that
    // kept it after the agreement was dropped would ask to be confirmed again
    // on a sheet still granting file replacement the person had just withdrawn.
    // The button that reaches this channel says so in its own words.
    setMachineWriteRoot(id, null);
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
      acceptedTmuxVersion: null,
      // PHASE 101. The row is not in the file, so there is no folder and there
      // is nothing to say about saving.
      writeRoot: null,
      writeHonesty: null
    };
  });

  handle(ipc, 'machines:remove', (_event, id: string): MachinesResult => {
    // PHASE 118. ONE call, and the order inside it is `./removal.ts`'s own.
    // The tombstones are written FIRST, in one durable transaction, and the
    // label a person read is in machines.json and nowhere else, so a removal
    // that deleted the row first would write "You removed studiomachine"
    // instead of "You removed Studio". Nothing below the transaction runs
    // unless it committed, so a failure leaves the machine in the list and
    // every session record exactly as it was.
    //
    // A THROW IS THE REFUSAL PATH AND IT NEEDS NO CODE HERE. It crosses the
    // bridge as a rejected invoke, and `src/renderer/state/machines-store.ts`
    // already turns that into an error sentence beside the row and a refresh.
    //
    // This call sends nothing to the machine: it ends no session, stops no
    // server, and reads nothing there. Row 10 of the fault matrix is the
    // measurement of that.
    const forgotten = removeMachineCompletely(id);
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
        // PHASE 109. The label the person typed, or the host when they typed
        // none. It goes onto the context so a far side refusal can name the
        // machine the way the person named it. It reaches no argv and it is
        // not part of the confirmed hash.
        label: machineLabelOf(row),
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
  // from src/renderer/machines/presentation.ts, where the vocabulary audit reads it.
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

  // ---- PHASE 102 BLOCK ----
  // TWO CHANNELS THAT WRITE ON ANOTHER COMPUTER, being the fourth and the fifth
  // in this product. They sit beside `machines:listTree` because they are what
  // the same Explorer does after it has listed rows.
  //
  // WHAT BOUNDS THEM IS THE SAME ONE FIELD `machines:putFile` is bounded by,
  // being `writeRoot` on the machine row. PHASE 102 ADDS NO CONFIRMED FIELD and
  // no hash moves. A machine that carries no folder answers `writesOff` and
  // nothing is composed.
  //
  // NEITHER CARRIES A ROOT FROM THE RENDERER. `machines:listTree` above passes
  // `input.root` straight through, and its comment justifies that by saying the
  // channel cannot compose what it asks and carries no file contents. That
  // argument holds for a read and it does not carry to a write, so these two
  // take a path and main reads the confirmed folder off the row itself.
  //
  // EVERY REFUSAL EITHER OF THEM CAN ANSWER MEANS NOTHING WAS CHANGED. The two
  // main decides on this Mac, being `writesOff` and `outsideRoot`, happen
  // before anything is composed. `exists`, `denied`, `noparent` and `gone` are
  // what the machine reported, and each of them is printed above the line that
  // writes in its own script and none below it. Condition 38 of
  // `build/conformance-machines.mjs` reads that out of the script text.
  //
  // A CALL THAT THREW IS NOT A CALL THAT CHANGED NOTHING. Both verbs rethrow a
  // sentence saying the machine did not answer and the work may have gone
  // through, because Phase 101 measured a killed ssh completing the far side
  // write. No prose about a machine's answer crosses either channel: the
  // renderer draws every sentence from src/renderer/machines/presentation.ts.
  handle(
    ipc,
    'machines:makeDir',
    async (
      _event,
      input: MachineMakeDirInput
    ): Promise<MachineMakeDirResult> => makeRemoteDir(input)
  );
  handle(
    ipc,
    'machines:renameEntry',
    async (
      _event,
      input: MachineRenameInput
    ): Promise<MachineRenameResult> => renameRemoteEntry(input)
  );
  // ---- END PHASE 102 BLOCK ----

  // ---- PHASE 103 BLOCK ----
  // TWO CHANNELS THAT WRITE ON ANOTHER COMPUTER, being the sixth and the
  // seventh in this product, and the first two that change a git repository
  // over there. Until this phase no command Tortie sent could.
  //
  // NEITHER CHANNEL NAMES A GIT VERB and neither handler body composes one. The
  // verb is inside Tortie's own script text in ./remote-scripts.ts, so no
  // caller can turn a stage into a commit, a checkout or a discard. Condition
  // 83 of `build/conformance-machines.mjs` makes the discard refusal executable
  // over the whole catalogue rather than merely absent.
  //
  // NEITHER CARRIES A REPOSITORY ROOT FROM THE RENDERER. The input carries the
  // tab's folder, and ./remote-stage.ts runs its own review read on it and uses
  // the root that machine's own rev-parse answered. Without that, the pair of
  // an absolute folder and relative paths under it would let one call stage
  // inside any repository on that machine.
  //
  // WHAT BOUNDS THEM IS THE SAME ONE FIELD `machines:putFile` is bounded by,
  // being `writeRoot` on the machine row. PHASE 103 ADDS NO CONFIRMED FIELD and
  // no hash moves.
  //
  // A CALL THAT ANSWERED `unsure` IS NOT A CALL THAT CHANGED NOTHING. Phase 101
  // measured a killed ssh completing the far side write, so that word means the
  // machine did not say, and the panel re-reads rather than claiming. No prose
  // about a machine's answer crosses either channel: the renderer draws every
  // sentence from src/renderer/machines/presentation.ts.
  handle(
    ipc,
    'machines:stage',
    async (
      _event,
      input: MachineIndexWriteInput
    ): Promise<MachineIndexWriteResult> => stageOnMachine(input)
  );
  handle(
    ipc,
    'machines:unstage',
    async (
      _event,
      input: MachineIndexWriteInput
    ): Promise<MachineIndexWriteResult> => unstageOnMachine(input)
  );
  // ---- END PHASE 103 BLOCK ----

  // ---- PHASE 104 BLOCK ----
  // ONE CHANNEL THAT WRITES ON ANOTHER COMPUTER, being the eighth in this
  // product and the third that changes a git repository over there.
  //
  // IT NAMES NO GIT VERB and the handler body composes none. The verb is inside
  // Tortie's own script text in ./remote-scripts.ts, so no caller can turn a
  // commit into an amend, a reset or a discard. Condition 83 of
  // `build/conformance-machines.mjs` makes the discard refusal executable over
  // the whole catalogue rather than merely absent.
  //
  // IT CARRIES NO REPOSITORY ROOT FROM THE RENDERER. The input carries the
  // tab's folder, and ./remote-commit.ts runs its own review read on it and
  // uses the root that machine's own rev-parse answered.
  //
  // WHAT BOUNDS IT IS THE SAME ONE FIELD `machines:putFile` is bounded by,
  // being `writeRoot` on the machine row. PHASE 104 ADDS NO CONFIRMED FIELD and
  // no hash moves.
  //
  // THE REPEAT IS GUARDED BY HEAD. Main re-reads the folder immediately before
  // it composes, sends the sha it just read, and that machine refuses to commit
  // when its own HEAD no longer equals it. The first run moves HEAD, so a
  // second send of one request commits nothing.
  //
  // A CALL THAT ANSWERED `unsure` IS NOT A CALL THAT CHANGED NOTHING. The word
  // means the machine did not say, and the panel offers the one read that
  // answers it. THE SENTENCES ARE COMPOSED IN MAIN for this channel, which is
  // `machines:cloneProject`'s shape, because a person reads Tortie's own
  // sentence and that machine's own words together and only main has both.
  handle(
    ipc,
    'machines:commit',
    async (
      _event,
      input: MachineCommitInput
    ): Promise<MachineCommitResult> => commitOnMachine(input)
  );
  // ---- END PHASE 104 BLOCK ----

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
  // src/renderer/machines/presentation.ts, where the vocabulary audit reads it. The
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

  // ---- PHASE 99 ----
  // PHASE 99. One channel that READS the file NAMES in one folder on one
  // machine, so the Quick Open palette on a tab that lives over there lists
  // files instead of a sentence saying it does not reach that far.
  //
  // IT CARRIES NAMES AND NEVER CONTENTS. A person's source stays on the
  // computer it is on. Opening one of these names is a separate read, and it
  // lands in the read only tab Phase 90.3 shipped.
  //
  // It cannot compose what it asks. The command that crosses is `repo-files`
  // from the frozen catalogue in ./remote-scripts.ts, chosen by name, with the
  // folder and the name cap plus one arriving there as positional parameters.
  // NOTHING IS SENT TO THAT MACHINE except that constant text.
  //
  // NOTHING CALLS IT ON A CLOCK. The palette asks when a person opens it, and
  // the renderer skips a root it read less than QUICK_OPEN_WARM_STALE_MS ago.
  //
  // It NEVER THROWS. A folder that is not there, a machine that did not answer
  // and a machine Tortie is not signed in to all come back as a mode word. No
  // prose crosses this channel: the renderer draws the sentence from
  // src/renderer/machines/presentation.ts, where the vocabulary audit reads it.
  handle(
    ipc,
    'machines:listFiles',
    async (_event, input: MachineFileListInput): Promise<MachineFileListResult> =>
      listFilesOnMachine({
        machineId: input.machineId,
        cwd: input.cwd,
        ...(input.maxPaths === undefined ? {} : { maxPaths: input.maxPaths })
      })
  );
  // ---- END PHASE 99 ----

  // ---- PHASE 100 ----
  // PHASE 100. One channel that READS the LAST LINES one session on one machine
  // printed, so a person can read back what an agent over there said instead of
  // being told that scrolling back is not available.
  //
  // IT IS NOT A SCROLLBAR. Research 57 section 3.1 refused one twice over, and
  // this is the smaller affordance it adopted in its place. The whole read is
  // `./remote-lines.ts`, whose header states the refusal, and condition 54 of
  // build/conformance-machines.mjs fails when that file names either of the two
  // verbs a scrollbar would need.
  //
  // THE COMMAND IS ALREADY ON THE LEDGER. `capture-pane -p -e -J -t <id> -S
  // -<n>` is row 5, with kind read and repeat safe, and `remoteCaptureArgs` in
  // ./remote-capsule.ts already composes it. This channel adds no script to the
  // frozen catalogue and no verb to the ledger.
  //
  // IT WRITES NOTHING, on either computer. It does not go through
  // `storeCapsuleText` and it makes no snapshot generation, because it is a live
  // read a person asked for rather than the background copy ./remote-capsule.ts
  // keeps.
  //
  // NOTHING CALLS IT ON A CLOCK. A person opens the panel or presses a depth
  // button, and each of those is one read.
  //
  // It NEVER THROWS. A session Tortie holds no row for, a machine that did not
  // answer and a machine Tortie is not signed in to all come back as a mode
  // word. No prose crosses this channel: the renderer draws the sentence from
  // src/renderer/machines/presentation.ts, where the vocabulary audit reads it.
  handle(
    ipc,
    'machines:readSessionLines',
    async (
      _event,
      input: MachineSessionLinesInput
    ): Promise<MachineSessionLinesResult> =>
      readSessionLinesOnMachine({
        sessionId: input.sessionId,
        lines: input.lines
      })
  );
  // ---- END PHASE 100 ----

  // ---- PHASE 105 ----
  // PHASE 105. One channel that READS which branch is checked out in one folder
  // on one machine, and then asks GitHub about that branch FROM THIS MAC.
  //
  // NO CREDENTIAL AND NO gh CROSSES. The gh program runs here and never leaves
  // this Mac. No token, no gh invocation and no GitHub host name is sent to the
  // machine. Four short strings travel back, being a mode word, the origin
  // address, the branch name and the commit HEAD points at. Condition 55d of
  // build/conformance-machines.mjs reads the script text and fails on any of the
  // nine words a credential would travel in, and `npm run probe:p105` puts a
  // program called gh on the far side's own path and asserts it was never run.
  //
  // It cannot compose what it asks. The command that crosses is `repo-facts`
  // from the frozen catalogue in ./remote-scripts.ts, chosen by name, with the
  // folder arriving there as the one positional parameter. The gh argv is
  // composed by ../actions/argv.ts and refused by `assertReadOnlyArgv` before a
  // process exists.
  //
  // IT WRITES NOTHING, on either computer and on GitHub. The catalogue's two
  // writers did not move and every gh shape the allowlist permits is a read.
  //
  // NOTHING CALLS IT ON A CLOCK. A person expands the section or presses
  // Refresh, and each of those is one read. There is no watch, because main
  // cannot see a push made on another computer.
  //
  // It NEVER THROWS. A folder that is not there, a folder git does not track, a
  // repository with no GitHub address, a detached head, a machine that did not
  // answer and a machine Tortie is not signed in to all come back as a mode
  // word. No prose crosses this channel: the renderer draws the sentence from
  // src/renderer/machines/presentation.ts, where the vocabulary audit reads it.
  handle(
    ipc,
    'machines:readRuns',
    async (_event, input: MachineRunsInput): Promise<MachineRunsResult> =>
      readRunsOnMachine({
        machineId: input.machineId,
        cwd: input.cwd,
        ...(input.limit === undefined ? {} : { limit: input.limit })
      })
  );
  // ---- END PHASE 105 ----

  // ---- PHASE 106 ----
  // PHASE 106. One channel that READS which branch is checked out in one folder
  // on one machine, the branch it follows, and how far ahead and how far behind
  // it is.
  //
  // It cannot compose what it asks. The command that crosses is `repo-branch`
  // from the frozen catalogue in ./remote-scripts.ts, chosen by name, with the
  // folder arriving there as the one positional parameter.
  //
  // IT WRITES NOTHING, on either computer. The catalogue's two writers did not
  // move, and this channel cannot change what is checked out over there. There
  // is no checkout verb behind it and the renderer draws no control that could
  // ask for one.
  //
  // IT NEVER FETCHES. The two counts are measured against the copy of the
  // upstream that machine last fetched, so the answer can be older than what is
  // on the server. Condition 56i of build/conformance-machines.mjs fails the
  // script text if it ever names `git fetch`, `git pull` or `git remote update`,
  // which is what keeps the sentence on screen checkable.
  //
  // NOTHING CALLS IT ON A CLOCK. A person expands the group or presses Refresh,
  // and each of those is one read. There is no watch, because main cannot see a
  // branch switched on another computer.
  //
  // It NEVER THROWS. A folder that is not there, a folder git does not track, a
  // detached head, a git too old to answer the format, a machine that did not
  // answer and a machine Tortie is not signed in to all come back as a mode
  // word. No prose crosses this channel: the renderer draws the sentence from
  // src/renderer/machines/presentation.ts, where the vocabulary audit reads it.
  handle(
    ipc,
    'machines:readBranch',
    async (_event, input: MachineBranchInput): Promise<MachineBranchResult> =>
      readBranchOnMachine({ machineId: input.machineId, cwd: input.cwd })
  );
  // ---- END PHASE 106 ----

  // ---- PHASE 107 ----
  // PHASE 107. One channel that READS a page of the newest commits in one
  // folder on one machine, with the two anchors the swimlane picture needs and
  // the marks that say which commits are ahead of the followed branch and which
  // are behind it.
  //
  // It cannot compose what it asks. The command that crosses is `repo-history`
  // from the frozen catalogue in ./remote-scripts.ts, chosen by name, with the
  // folder and the count arriving there as the two positional parameters.
  //
  // IT WRITES NOTHING, on either computer. The catalogue's two writers did not
  // move. There is no checkout, no branch, no cherry pick and no revert behind
  // this channel, and the renderer draws no control that could ask for one. The
  // local History group has three of those verbs and this one has none.
  //
  // THE COUNT IS CLAMPED HERE as well as in the renderer, to 1 and to
  // REMOTE_HISTORY_MAX_COMMITS, which is 500. A renderer that asked for 20,000
  // is answered with 500. Condition 57j of build/conformance-machines.mjs holds
  // that number, and it is what keeps one answer under about 162,000 bytes.
  //
  // IT NEVER FETCHES. The marks are measured against the copy of the upstream
  // that machine last fetched, so they can be older than what is on the server.
  // Condition 57g of build/conformance-machines.mjs fails the script text if it
  // ever names `git fetch`, `git pull` or `git remote update`.
  //
  // NOTHING CALLS IT ON A CLOCK. A person expands the group, presses Load more
  // or presses Refresh, and each of those is one read. There is no watch,
  // because main cannot see a commit made on another computer.
  //
  // THE FILES ONE COMMIT CHANGED ARE NOT READ. That is a second script and a
  // third one for the two sides of a file, and this phase ships one script. The
  // renderer says so on screen.
  //
  // It NEVER THROWS. A folder that is not there, a folder git does not track, a
  // repository with no commits, a machine that did not answer and a machine
  // Tortie is not signed in to all come back as a mode word. No prose crosses
  // this channel: the renderer draws every sentence from
  // src/renderer/machines/presentation.ts, where the vocabulary audit reads it.
  handle(
    ipc,
    'machines:readHistory',
    async (_event, input: MachineHistoryInput): Promise<MachineHistoryResult> =>
      readHistoryOnMachine({
        machineId: input.machineId,
        cwd: input.cwd,
        ...(input.maxCount === undefined ? {} : { maxCount: input.maxCount })
      })
  );
  // ---- END PHASE 107 ----

  // ---- PHASE 108 ----
  // PHASE 108. One channel that READS the agent configuration on one machine,
  // being the skills, MCP servers, hooks, plugins and instruction files the
  // agents THERE will load.
  //
  // THE READER RUNS ON THIS MAC. The far side does no parsing: `context-read`
  // from the frozen catalogue in ./remote-scripts.ts lists directories and
  // sends file bytes back, and the same scanContext that draws a local tab
  // folds them here. So there is no second precedence table, and
  // npm run conformance:context keeps proving the one matrix for both kinds
  // of tab. Condition 58d of build/conformance-machines.mjs reads the driver's
  // imports and holds that.
  //
  // IT CANNOT COMPOSE WHAT IT ASKS. The commands that cross are
  // `machine-facts` and `context-read`, chosen by name, with the two path
  // lists and the depth arriving there as positional parameters.
  //
  // IT WRITES NOTHING, on either computer. The catalogue's two writers did not
  // move. Install, enable and pin are refused on a remote tab, permanently,
  // and the renderer draws no control that could ask for any of them.
  //
  // NOTHING CALLS IT ON A CLOCK. A read happens when the view opens on the
  // tab, when the tab's project changes, and when a person presses Refresh.
  // There is no watch, because main cannot see a file change on another
  // computer.
  //
  // It NEVER THROWS for a machine state. A machine Tortie is not signed in to,
  // a machine that did not say where its home folder is, and a machine that
  // did not answer all come back as a mode word. No prose crosses this
  // channel: the renderer draws every sentence from
  // src/renderer/machines/presentation.ts, where the vocabulary audit reads it.
  handle(
    ipc,
    'machines:readContext',
    async (_event, input: MachineContextInput): Promise<MachineContextResult> =>
      readContextOnMachine({ machineId: input.machineId, cwd: input.cwd })
  );
  // ---- END PHASE 108 ----
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

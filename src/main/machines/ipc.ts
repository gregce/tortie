/**
 * The ONE `machines:*` registrar (Phase 68, one channel added in Phase 69 and
 * one more in Phase 71).
 *
 * Twelve channels, and what is NOT here is the point of the file.
 *
 *  - There is no `machines:connect`, no `machines:attach` and no
 *    `machines:createSession`. Neither Phase 68 nor Phase 69 opens a session on
 *    any machine.
 *  - There is no channel that reads the file and then acts. `machines:reload`
 *    returns rows and does nothing else.
 *  - There is no channel that sets a session's status.
 *
 * Three channels start a process, and every one is a person pressing a button.
 * `machines:tailscaleNames` runs the pinned Tailscale program once.
 * `machines:test` runs ssh once. `machines:prepare` runs ssh and starts the
 * program a machine's work will live in, and it is the only channel in the
 * product that starts anything on another computer. Nothing else in this file
 * spawns anything.
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
import { MACHINE_COLORS, MACHINE_DEFAULT_COLOR } from '@shared/machines';
import type {
  MachineAddInput,
  MachineConfirmInput,
  MachinePrepareResult,
  MachineRowView,
  MachinesResult,
  MachineStateView,
  MachineTestEvent,
  MachineTestInput,
  MachineTestStarted,
  TailscaleSourceResult
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
  startMachineTest,
  userHostKeysPath,
  type MachineHostKeyFiles
} from './connection-test';
import { prepareMachine } from './prepare';
import { validateMachinesFile } from './schema';
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
  removeMachineRow
} from './store';
import { readTailnetMachines } from './tailscale';

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
    warning: MACHINE_CONFIRM_WARNING
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
      const started = startMachineTest({
        fields,
        sheetId: testSheetIdOf(input),
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

  handle(ipc, 'machines:forget', (_event, id: string): MachineRowView => {
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
      warning: MACHINE_CONFIRM_WARNING
    };
  });

  handle(ipc, 'machines:remove', (_event, id: string): MachinesResult => {
    removeMachineRow(id);
    // The record goes with the row. A machine that comes back later is a
    // machine nobody has agreed to yet.
    forgetMachine(id);
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
      return prepareMachine({
        machineId: row.id,
        fields: machineFieldsOf(row),
        tortieHostKeys: ensureMachineHostKeysPath()
      });
    }
  );
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

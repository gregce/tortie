/**
 * Tortie Machines. A machine you confirmed once is a place sessions can live
 * (Phase 68, M1).
 *
 * A machine is a configuration row that names a computer Tortie may sign in to
 * as the user. This directory builds the row, the gate in front of it, the
 * channels the Settings surface reads, the tailnet picker and one visible
 * connection test.
 *
 * **It builds nothing that opens a session.** No context, no exec plane, no
 * remote server boot, no version probe, no attach, no manifest column, and no
 * session status of any kind. Those are Phases 69 to 73.
 *
 * The pieces are deliberately separate, the same way `../config/` is.
 *
 *  - `schema.ts` validates, and is pure. No disk, no Electron.
 *  - `store.ts` owns every read, the snapshot, the reload, the watcher and the
 *    two writes.
 *  - `confirm.ts` owns the four execution bearing fields, the hash, the sealed
 *    record key and the six refusals.
 *  - `errors.ts` turns what the sign in program printed into one class and one
 *    piece of copy, with exactly one alarming class.
 *  - `tailscale.ts` resolves the pinned Tailscale program and parses its answer.
 *  - `connection-test.ts` runs the one visible test, and it is the only module
 *    here that spawns a pty.
 *  - `ipc.ts` is the one `machines:*` registrar.
 *  - `smoke.ts` is the Electron smoke, and the second caller the refusals need.
 */

export {
  parseMachines,
  serializeMachines,
  validateMachinesFile,
  type MachinesValidation
} from './schema';

export {
  addMachineRow,
  currentMachines,
  ensureMachineHostKeysPath,
  initMachines,
  loadMachines,
  machineColorOf,
  machineHostKeysPath,
  machineRecordDir,
  machineFieldsOf,
  machineLabelOf,
  machineRow,
  machinesDiskReads,
  machinesPath,
  onMachinesChanged,
  reloadMachines,
  removeMachineRow,
  resetMachinesStoreForTests,
  startMachinesWatch,
  stopMachinesWatch,
  type MachinesLoadReason,
  type MachinesSnapshot
} from './store';

export {
  assertMachineMayConnect,
  canonicalMachineText,
  confirmMachine,
  describeMachine,
  forgetMachine,
  isMachineConfirmed,
  listMachineConfirmations,
  machineExecutionHash,
  machineRecordKey,
  machineRowStatus,
  whileReadingMachines,
  EMPTY_MACHINE_FIELDS,
  MACHINE_CONFIRM_ACKNOWLEDGEMENT,
  MACHINE_CONFIRM_ID_PREFIX,
  MACHINE_CONFIRM_WARNING,
  MACHINE_EXECUTION_HASH_ALGORITHM,
  MACHINE_PATH_HONESTY,
  type MachineConfirmState,
  type MachineExecutionFields,
  type MachineRowStatus,
  type MachineSummary
} from './confirm';

export {
  classifyMachineOutput,
  composeOutcomeCopy,
  lastPrintedLine,
  machineOutcomeCopy,
  MACHINE_ALARM_CLASS,
  MACHINE_OUTCOME_CLASSES,
  type MachineOutcomeCopy
} from './errors';

export {
  parseTailscaleStatus,
  readTailnetMachines,
  resetTailscaleWarningsForTests,
  resolveTailscale,
  TAILSCALE_CANDIDATES,
  TAILSCALE_EMPTY_NOTE,
  TAILSCALE_MISSING_NOTE,
  type TailscaleParsedPeer,
  type TailscaleResolution
} from './tailscale';

export {
  cancelLiveMachineTest,
  cancelMachineTest,
  composeKnownHostsOption,
  composeTestArgv,
  composeTestCommandLine,
  liveMachineTestId,
  liveMachineTestPid,
  machineSshSpawnCount,
  parseResolvedPath,
  remoteProbeCommand,
  resetMachineTestForTests,
  resolveSsh,
  sendMachineTestInput,
  startMachineTest,
  userHostKeysPath,
  KNOWN_HOSTS_OPTION,
  PINNED_SSH_PATH,
  REMOTE_PATH_MARKER,
  SSH_BATCH_MODE_INTERACTIVE,
  SSH_BATCH_MODE_STEADY,
  TEST_DEADLINE_MS,
  TEST_MAX_OUTPUT_BYTES,
  type MachineHostKeyFiles,
  type SshResolution
} from './connection-test';

export { registerMachinesIpc } from './ipc';

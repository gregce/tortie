/**
 * Tortie Machines. A machine you confirmed once is a place sessions can live
 * (Phase 68, M1).
 *
 * A machine is a configuration row that names a computer Tortie may sign in to
 * as the user. This directory builds the row, the gate in front of it, the
 * channels the Settings surface reads, the tailnet picker and one visible
 * connection test.
 *
 * PHASE 69 added the exec plane. There is now a `MachineContext`, this Mac is one
 * of them, a confirmed machine is another, and one function composes the command
 * for both. `Prepare this machine` starts what Tortie needs on a machine and sets
 * every option it depends on.
 *
 * **It still builds nothing that opens a session.** No attach, no create, no
 * kill, no rename, no manifest column, no machine badge and no session status of
 * any kind. Those are Phases 70 to 73, and the verb ledger in `exec-plane.ts`
 * refuses every one of their verbs in code rather than in prose.
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
 *  - `carriage.ts` holds the declarations BOTH the visible test and the exec
 *    plane read, being the pinned client, the steady state batch mode, the
 *    connect timeout, the marker pair and the two identity record files. It
 *    starts nothing, and its own test refuses any import that could.
 *  - `connection-test.ts` runs the one visible test, and it is the only module
 *    here that spawns a pty. It re-exports every name that moved to
 *    `carriage.ts`, so no caller of it changed.
 *  - `context.ts` holds the two kinds of place a command can run, the registry
 *    keyed by machine id, and the ONE composer for both argv shapes.
 *  - `ssh.ts` is the carriage, pure: every option a steady state command carries
 *    and the short name of the connection Tortie keeps open to one machine.
 *  - `exec-plane.ts` is the one door, plus the verb ledger that decides what may
 *    cross to a machine at all.
 *  - `remote-server.ts` starts what Tortie needs on a machine and reads it back.
 *  - `remote-path.ts` reads that machine's own program search list.
 *  - `prepare.ts` is the one production caller of the plane.
 *  - `ipc.ts` is the one `machines:*` registrar.
 *  - `smoke.ts` and `exec-smoke.ts` are the Electron smokes, and the second
 *    callers the refusals need.
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
  composeKnownHostsOption,
  resetSshWarningsForTests,
  resolveSsh,
  userHostKeysPath,
  KNOWN_HOSTS_OPTION,
  PINNED_SSH_PATH,
  REMOTE_PATH_MARKER,
  SSH_BATCH_MODE_STEADY,
  SSH_CONNECT_TIMEOUT_SECONDS,
  type MachineHostKeyFiles,
  type SshResolution
} from './carriage';

export {
  cancelLiveMachineTest,
  cancelMachineTest,
  classifyProbeOutput,
  composeTestArgv,
  composeTestCommandLine,
  liveMachineTestId,
  liveMachineTestPid,
  machineSshSpawnCount,
  parseResolvedPath,
  remoteProbeCommand,
  resetMachineTestForTests,
  sendMachineTestInput,
  startMachineTest,
  SSH_BATCH_MODE_INTERACTIVE,
  TEST_DEADLINE_MS,
  TEST_MAX_OUTPUT_BYTES
} from './connection-test';

export { registerMachinesIpc } from './ipc';

// ---------------------------------------------------------------------------
// Phase 69, M2: where a command runs, and the one door it goes through
// ---------------------------------------------------------------------------

export {
  buildRemoteMachineContext,
  bumpMachineGeneration,
  clearMachineRemotePathForHarness,
  localMachineContext,
  machineContext,
  machineGeneration,
  registerRemoteMachineContext,
  registeredMachineIds,
  remoteTmuxArgv,
  resetMachineContexts,
  setMachineRemotePath,
  shellCommand,
  tmuxCommand,
  LOCAL_MACHINE_ID,
  REMOTE_CONF_PATH,
  type LocalMachineContext,
  type MachineContext,
  type MachineGeneration,
  type MachineKind,
  type RemoteContextInput,
  type RemoteMachineContext,
  type SpawnPlan
} from './context';

export {
  composeControlPath,
  controlDirCandidates,
  controlPathLeaf,
  sshOptions,
  CONTROL_DIR_MODE,
  CONTROL_DIR_NAME,
  CONTROL_PATH_MAX_BYTES,
  CONTROL_PATH_TOO_LONG,
  REQUIRED_SSH_OPTIONS,
  SSH_CONTROL_PERSIST_SECONDS,
  SSH_SERVER_ALIVE_COUNT_MAX,
  SSH_SERVER_ALIVE_INTERVAL_SECONDS,
  type ControlPathInput,
  type SshCarriage
} from './ssh';

export {
  assertRemoteVerbAllowed,
  execOn,
  execRemoteShell,
  ledgerRowFor,
  remoteVerbsOf,
  socketBeforeContext,
  PATH_BEFORE_MUTATION,
  REMOTE_VERB_LEDGER,
  REPEAT_UNSAFE,
  VERBS_THIS_RUNG_REFUSES,
  VERB_NOT_IN_LEDGER,
  type ExecTmuxOptions,
  type LedgerRow,
  type RepeatClass,
  type VerbClass
} from './exec-plane';

export {
  ensureRemoteServer,
  remoteBootArgs,
  remoteServerVerdict,
  type RemoteOptionReadback,
  type RemoteServerResult
} from './remote-server';

export {
  captureRemotePath,
  noRemotePathRefusal,
  parseRemotePath,
  remotePathCommand,
  remotePathWithPrefixCommand,
  REMOTE_PATH_TIMEOUT_MS
} from './remote-path';

export {
  prepareMachine,
  readRemoteTmuxVersion,
  REMOTE_VERSION_TIMEOUT_MS,
  type PrepareInput
} from './prepare';

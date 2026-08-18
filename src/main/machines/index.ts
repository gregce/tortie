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
 * PHASE 70 opened sessions on it. A person can create, rename and end a session
 * on a confirmed machine, and see it in the list with the machine's badge beside
 * it. `remote-sessions.ts` owns all of that.
 *
 * PHASE 72 BROUGHT THEM BACK. A session Tortie creates on a machine now gets a
 * manifest row at create time, carrying that machine's id and the absolute
 * program path captured on that machine. Restore is offered behind six
 * conditions checked by one pure table, and a machine a person removes leaves a
 * record of what Tortie last knew rather than silence.
 *
 * **What is still not here.** No conversation comes back, because Tortie reads
 * no agent's own files on another machine, so every remote row records
 * `remote-not-collected` and `resume_argv` is NULL. The output Tortie saved
 * stays on this Mac and is not put back into the recreated session. The verb
 * ledger in `exec-plane.ts` still refuses `kill-server`, `attach-session`,
 * `send-keys` and `respawn-pane` in code rather than in prose.
 *
 * The pieces are deliberately separate, the same way `../config/` is.
 *
 *  - `schema.ts` validates, and is pure. No disk, no Electron.
 *  - `store.ts` owns every read, the snapshot, the reload, the watcher and the
 *    two writes.
 *  - `confirm.ts` owns the five execution bearing fields, the hash, the sealed
 *    record key and the six refusals. Phase 68 shipped four of them and Phase 83
 *    added the accepted tmux version as the fifth.
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
 *  - `remote-sessions.ts` owns the four remote verbs, the poll, the per-machine
 *    registry and the projection into `Session`. It imports nothing from
 *    `../manifest/` except `remote-record.ts`, which is the rung's central rule
 *    stated as an import list.
 *  - `remote-record.ts` is the ONE place a remote session meets the manifest.
 *  - `remote-argv.ts` reads where ONE machine keeps ONE program, and records the
 *    answer against that machine's id. It never sends it.
 *  - `restore-gate.ts` is the pure table that decides whether a session on
 *    another machine may be brought back. Six facts in, one verdict out.
 *  - `remote-restore.ts` is the verb behind that verdict.
 *  - `remote-copy.ts` holds every sentence main prints about a remote session.
 *  - `ipc.ts` is the one `machines:*` registrar.
 *  - `smoke.ts`, `exec-smoke.ts` and `remote-smoke.ts` are the Electron smokes,
 *    and the second callers the refusals need.
 *
 * PHASE 79.1 added two modules and this file re-exports NEITHER, which is a
 * decision rather than an oversight.
 *
 *  - `key-material.ts` makes and reads the key for one machine, under Tortie's
 *    own directory. It never touches the person's own key folder.
 *  - `key-install.ts` holds every sentence, every hash and every composed
 *    string about putting that key on a machine. It starts nothing. The runner
 *    that does is in `connection-test.ts`, beside the other one, because both
 *    spawn a pty and one module owns that.
 *
 * Their only callers are `ipc.ts` and `connection-test.ts`, both inside this
 * directory, and both import the module directly. A re-export here would be a
 * second name for something nothing outside asks for, and the growth guardrail
 * in CLAUDE.md asks for a small deliberate export surface rather than a
 * complete one. Add the re-export when a caller outside this directory needs
 * one, and not before.
 *
 * PHASE 83 ADDED NO MODULE, and it changed two things worth naming here.
 *
 *  - A machine row gained a fifth execution bearing field,
 *    `acceptedTmuxVersion`. It is the version of the program on that machine
 *    which a person accepted after Tortie said it had not measured it. The
 *    confirm hash covers it, and `confirm.ts` appends it to the hash text only
 *    when it is set, so every machine a person had already confirmed stays
 *    confirmed. `prepare.ts` asks the version gate about it and refuses when
 *    the machine reports something else.
 *  - `control-plane.ts` now takes a live connection away when its greeting
 *    never arrives, and hands the machine back to the timer feed. The deadline
 *    itself lives in `../tmux/control-client.ts`, because that class schedules
 *    its own reconnects and each one spawns a child.
 *
 * **What is still not here.** No conversation resumes on a machine. The status
 * dot still only moves when a list runs.
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

// ---------------------------------------------------------------------------
// Phase 70, M3: sessions that live on another machine
// ---------------------------------------------------------------------------

export {
  MACHINE_NOT_READY,
  REMOTE_DIR_MISSING,
  RESTORE_FORGOTTEN,
  RESTORE_STILL_RUNNING,
  RESTORE_UNSEEN,
  RESTORE_WRONG_MACHINE,
  RESUME_NOT_COLLECTED,
  TARGET_UNBOUND,
  noRemoteProgramRefusal,
  noRemoteRowFor
} from './remote-copy';

export {
  boundRemoteRow,
  forgetMachineRows,
  forgetRemoteRow,
  isRemoteSessionId,
  markMachineQuiet,
  nameOf,
  notifyRemoteRowsChanged,
  oneLine,
  parseRemoteListLine,
  pollEveryRemoteMachine,
  pollRemoteMachine,
  projectRemoteRecord,
  readyRemoteContext,
  refuseRemoteRestore,
  remoteCreate,
  remoteCreateArgs,
  remoteKill,
  remoteListArgs,
  remoteMachineFacts,
  remoteMachinesWoke,
  remoteRename,
  remoteRestoreFactsFor,
  remoteRestoreVerdictFor,
  remoteRowLastKnown,
  remoteRowStatus,
  remoteSessionMachine,
  remoteSessionRow,
  remoteSessions,
  remoteStampArgs,
  resetRemoteSessionsForTests,
  setRemotePollFocused,
  splitQuotedLine,
  startMachineFeed,
  startRemotePoll,
  stopMachineFeeds,
  stopRemotePolls,
  onRemoteSessionsChanged,
  REMOTE_CREATE_FORMAT,
  REMOTE_LIST_FIELDS,
  REMOTE_LIST_FORMAT,
  REMOTE_POLL_FOCUSED_MS,
  REMOTE_POLL_IDLE_MS,
  REMOTE_POLL_TIMEOUT_MS,
  REMOTE_STAMPS,
  type RemoteCreateInput,
  type RemoteListRow,
  type RemoteRowLastKnown,
  type RemoteSessionRow
} from './remote-sessions';

// ---------------------------------------------------------------------------
// Phase 72, M5: bringing a session on another machine back
// ---------------------------------------------------------------------------

export {
  remoteRestoreVerdict,
  REMOTE_RESTORE_REFUSALS,
  type RemoteRestoreFacts,
  type RemoteRestoreRefusal,
  type RemoteRestoreVerdict
} from './restore-gate';

export {
  assertArgvBelongsToMachine,
  captureRemoteArgv,
  parseRemoteWhich,
  remoteWhichCommand,
  REMOTE_ARGV_TIMEOUT_MS
} from './remote-argv';

export {
  isRemoteRecord,
  noteRemoteRowSeen,
  remoteManifest,
  remoteManifestInstalled,
  remoteRecordOf,
  remoteRecordsForMachine,
  remoteResumeProvenance,
  setRemoteManifest,
  tombstoneRemoteRow,
  writeRemoteRow,
  type RemoteRowInput
} from './remote-record';

export {
  readBackRemoteStamps,
  restoreRemoteSession,
  REPLAY_IS_NOT_ATTEMPTED,
  RESTORE_NO_RECORD,
  type RemoteRestoreOutcome
} from './remote-restore';

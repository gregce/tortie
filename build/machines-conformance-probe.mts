/**
 * The probe half of `npm run conformance:machines` (Phase 68).
 *
 * It prints, as JSON, everything the checker beside it needs to decide whether
 * the machine confirm gate binds a person's agreement to the right four fields
 * and to nothing else. The checker (`conformance-machines.mjs`) decides pass or
 * fail and prints the two tables a person reads.
 *
 * It is a separate file rather than an inline `--eval` because the modules are
 * TypeScript with path aliases, and a probe that cannot resolve `@shared/*`
 * silently prints nothing. That is the same reason `agents-conformance-probe.mts`
 * exists next to it.
 *
 * IT SPAWNS NOTHING. It starts no ssh, no tmux server and no Electron. It opens
 * no manifest, reads no file under the person's home, makes no request and
 * writes nothing anywhere. Every function it calls is pure. It is safe to run
 * on a machine with live sessions on it.
 *
 * PHASE 100 ADDED ONE MODULE LOAD, said here rather than left to be noticed.
 * `remote-capsule.ts` holds `remoteCaptureArgs`, which is the composer the
 * Phase 100 read reuses, and loading it pulls in the restore snapshot store and
 * the control plane. Loading those modules starts no timer, opens no window and
 * reads no file: `startRemoteCaptures` is never called here, and every function
 * this probe calls from that side is pure.
 *
 * PHASE 79.1 ADDED ONE MODULE LOAD, said here rather than left to be noticed.
 * `key-material.ts` reads the record directory from `../src/main/machines/store`,
 * which imports Electron's `app` and the watcher package. Loading those modules
 * starts nothing, opens no window, watches no directory and reads no file. No
 * function in this probe makes a key, and `ensureMachineKey` is never called.
 *
 * PHASE 117 ADDED TWO MODULE LOADS AND ONE PIECE OF STATE, said here rather
 * than left to be noticed. `create-confirmation.ts` is pure in the same way
 * `restore-gate.ts` is: it takes an answer or an error and returns a word.
 * `pane-env-rescue.ts` is NOT pure. It holds one map in this process's own
 * memory, and conditions 69 to 73 drive the seed against that map.
 * `resetRescueForTests` empties it before and after, so nothing is left behind.
 * No command runs, no machine is asked anything, no file is opened for writing
 * and nothing is spawned by either load.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT CANNOT PROVE, said here so nobody reads more into a pass
 * ---------------------------------------------------------------------------
 * The confirm record is sealed through `safeStorage`, which needs an Electron
 * process, so this gate never watches a confirmed machine pass and an
 * unconfirmed one refuse. That belongs to `npm run smoke:machines`, which runs
 * in a real Electron process against the real keychain.
 *
 * It also connects to nothing. No ssh runs, no remote tmux is started and no
 * version is measured. The connection test is proven pure here, live by the
 * probe in `build/probe-machines.mjs`, and by nothing else in this phase.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  MACHINE_EXECUTION_FIELDS,
  MACHINE_PRESENTATION_FIELDS
} from '../src/shared/machines';
import {
  MACHINE_CONFIRM_ID_PREFIX,
  canonicalMachineText,
  describeMachine,
  machineExecutionHash,
  machineRecordKey,
  type MachineExecutionFields
} from '../src/main/machines/confirm';
import {
  CONFIG_EXECUTION_HASH_ALGORITHM,
  EMPTY_EXECUTION_FIELDS,
  canonicalExecutionText,
  executionHash
} from '../src/main/config/confirm';
import {
  MACHINE_ALARM_CLASS,
  MACHINE_OUTCOME_CLASSES,
  machineOutcomeCopy
} from '../src/main/machines/errors';
import {
  KNOWN_HOSTS_OPTION,
  SSH_BATCH_MODE_INTERACTIVE,
  SSH_BATCH_MODE_STEADY,
  composeTestArgv,
  userHostKeysPath
} from '../src/main/machines/connection-test';
import { validateMachinesFile } from '../src/main/machines/schema';
// Phase 106, condition 56d. One exported constant, read so the format the far
// side prints and the format this end parses cannot drift apart. Loading this
// module spawns nothing: every function in it is a pure parser.
import { BRANCH_FORMAT } from '../src/main/git/parse';
// Phase 107, condition 57d. The same reason as the line above, for the format
// the history walk asks with. Loading this module spawns nothing, because
// every function in it is a pure parser.
import { GRAPH_LOG_FORMAT } from '../src/main/git/graph-parse';
// Phase 107, condition 57j reads its two numbers out of the dynamic import of
// '../src/shared/ipc' below, rather than with a static import. A static one
// through that barrel is refused at instantiation time by this loader, which is
// why every other constant this probe takes from the contract arrives the same
// way.
// Phase 69, conditions 11 to 18. Every one of these is pure: no spawn, no server,
// no Electron and no request.
import {
  REMOTE_CONF_PATH,
  remoteTmuxArgv,
  tmuxCommand,
  type RemoteMachineContext,
  type LocalMachineContext
} from '../src/main/machines/context';
import {
  controlPathLeaf,
  sshOptions,
  CONTROL_DIR_MODE,
  CONTROL_DIR_NAME,
  CONTROL_PATH_MAX_BYTES,
  REQUIRED_SSH_OPTIONS,
  SSH_SERVER_ALIVE_COUNT_MAX,
  SSH_SERVER_ALIVE_INTERVAL_SECONDS
} from '../src/main/machines/ssh';
import {
  REMOTE_VERB_LEDGER,
  VERBS_THIS_RUNG_REFUSES,
  composeArmedResumeArgv,
  remoteVerbsOf
} from '../src/main/machines/exec-plane';
import { remoteBootArgs } from '../src/main/machines/remote-server';
// Phase 89 fix round, condition 68. The counter that decides whether an armed
// resume landed. It is pure and it spawns nothing, so the gate can drive it
// against the screen shapes a real shell produces.
import { countOccurrences } from '../src/main/machines/remote-arm';
// Phase 70, conditions 19 to 24. All four are pure. `attach-plan` is imported
// DIRECTLY rather than through `../src/main/attach`, because that index also
// exports the attach host and that file loads node-pty. This probe must load no
// native module.
import { attachPlan } from '../src/main/attach/attach-plan';
import {
  REMOTE_CREATE_FORMAT,
  REMOTE_LIST_FIELDS,
  REMOTE_LIST_FORMAT,
  remoteCreateArgs
} from '../src/main/machines/remote-sessions';
import { SERVER_OPTIONS } from '../src/main/tmux/server-options';
import {
  TESTED_REMOTE_TMUX_VERSIONS,
  decideRemoteControlGate,
  decideRemoteVersionGate
} from '../src/main/tmux/version';
// Phase 71, condition 25. `status-truth.ts` imports one type from @shared and
// nothing else: no tmux, no SQLite, no filesystem, no timer. The manifest's own
// numbers are deliberately NOT read here, because importing them would load
// better-sqlite3 into a gate whose whole claim is that it loads nothing. Those
// numbers are gated by `build/contract-inventory.mjs` and by
// `src/main/manifest/__tests__/machine-id-migration.test.ts`.
import {
  MACHINE_EVENT_KINDS,
  machineTruth,
  mayFlipRestorable
} from '../src/main/machines/status-truth';
// Phase 72, conditions 26 and 27. The gate that decides whether Restore is
// offered for a session on a machine. It is pure for the same reason the case
// table is, so it can be driven here without starting anything.
import {
  REMOTE_RESTORE_REFUSALS,
  remoteRestoreVerdict,
  type RemoteRestoreFacts
} from '../src/main/machines/restore-gate';
// Phase 79.1, conditions 28 to 34. The key Tortie makes for one machine and the
// one command that puts its public half on that machine. Both modules are pure:
// `key-install.ts` composes strings, and nothing in `key-material.ts` runs until
// a caller asks for a key, which this probe never does.
import {
  AUTHORIZED_KEYS_SCRIPT,
  MACHINE_KEY_HASH_ALGORITHM,
  REMOTE_AUTHORIZED_KEYS_DISPLAY,
  canonicalKeyInstallText,
  composeAuthorizedKeysCommand,
  composeKeyInstallArgv,
  keyInstallHash,
  type KeyInstallFacts
} from '../src/main/machines/key-install';
import {
  machineKeyComment,
  machineKeyDir,
  machineKeyPath
} from '../src/main/machines/key-material';
import { machineRecordDir } from '../src/main/machines/store';
import { shellQuoteArgv } from '../src/main/restore/command';
// Phase 117, conditions 69 to 73. The three state confirmation is pure for the
// same reason the restore gate is, so it can be driven here without starting
// anything. `pane-env-rescue.ts` is not pure, and that is said rather than left
// to be noticed: it holds one map in this process's own memory. The seed is
// driven against that map and `resetRescueForTests` empties it again. No
// command runs, no file is opened and nothing is spawned.
import {
  CONFIRMATION_KINDS,
  classifyConfirmationFailure,
  confirmationArgs,
  confirmationDisposition,
  readConfirmationEnvironment,
  type RemoteCreateConfirmation
} from '../src/main/machines/create-confirmation';
import {
  issuedRemoteIdHeld,
  issuedRemoteIdsFor,
  noteIssuedRemoteId,
  resetRescueForTests,
  seedIssuedRemoteIds
} from '../src/main/machines/pane-env-rescue';
import { gmuxError } from '../src/main/errors';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const machinesDir = join(repoRoot, 'src', 'main', 'machines');

/** The machine every comparison below is made against. */
const BASE: MachineExecutionFields = {
  host: 'pop-os.tail1a2b.ts.net',
  user: 'greg',
  port: 22,
  remoteTmuxPath: '/usr/bin/tmux'
};

const ID = 'pop-os';

/**
 * The two files a run checks a machine's identity against.
 *
 * These are shapes, not this machine's real paths. The probe reads no file
 * under the person's home and writes nothing anywhere, so it composes the argv
 * against a Tortie path with a space in it, which is what the real one has, and
 * against the person's file for a home directory that is not theirs.
 */
const HOST_KEYS = {
  tortie: '/Users/x/Library/Application Support/Tortie/gmux/machines/known-machines',
  user: userHostKeysPath('/Users/x')
};

/** One variation per execution bearing field, changed and unset. */
const CHANGED: Record<string, MachineExecutionFields> = {
  host: { ...BASE, host: 'attic.tail1a2b.ts.net' },
  user: { ...BASE, user: 'root' },
  port: { ...BASE, port: 2222 },
  remoteTmuxPath: { ...BASE, remoteTmuxPath: '/opt/homebrew/bin/tmux' }
};

const UNSET: Record<string, MachineExecutionFields> = {
  user: { ...BASE, user: null },
  port: { ...BASE, port: null },
  remoteTmuxPath: { ...BASE, remoteTmuxPath: null }
};

const base = machineExecutionHash(ID, BASE);

// ---------------------------------------------------------------------------
// 1. The hash, per field
// ---------------------------------------------------------------------------

/**
 * The execution bearing fields the hash text APPENDS rather than always emits.
 *
 * Phase 83. `acceptedTmuxVersion` is absent from the hash of every row that
 * carries no acceptance, which is what keeps every already confirmed machine
 * confirmed. It therefore cannot be varied by the generic loop below, whose
 * whole shape is "change it, unset it, and both must move the hash". It gets
 * its own block, and conditions 41 to 43 read that block.
 */
const APPENDED_EXECUTION_FIELDS = ['acceptedTmuxVersion'];

const fieldRows = [
  ...MACHINE_EXECUTION_FIELDS.filter(
    (field) => !APPENDED_EXECUTION_FIELDS.includes(field)
  ).map((field) => ({
    field,
    kind: 'execution',
    changedHash: CHANGED[field] === undefined ? null : machineExecutionHash(ID, CHANGED[field]),
    unsetHash: UNSET[field] === undefined ? null : machineExecutionHash(ID, UNSET[field])
  })),
  // The two presentation fields are not in the hash's type at all, so the only
  // way to ask "does the hash move for a label" is to ask whether the label
  // string can reach the canonical text. That is what the checker reads.
  ...MACHINE_PRESENTATION_FIELDS.map((field) => ({
    field,
    kind: 'presentation',
    changedHash: null,
    unsetHash: null
  }))
];

// ---------------------------------------------------------------------------
// 2. The canonical text, and what may not appear in it
// ---------------------------------------------------------------------------

const canonical = canonicalMachineText(ID, BASE);

// ---------------------------------------------------------------------------
// 3. The two key spaces
// ---------------------------------------------------------------------------

const agentFields = {
  ...EMPTY_EXECUTION_FIELDS,
  launchable: true,
  binaries: [ID],
  launchArgv: [ID]
};

// ---------------------------------------------------------------------------
// 4. The normalizer key set, read from the canonical text itself
// ---------------------------------------------------------------------------
//
// The normalizer object is private to confirm.ts, which is correct. What the
// gate needs is whether its key set and MACHINE_EXECUTION_FIELDS agree, and the
// canonical text is the honest place to read that from: it is exactly the keys
// the hash covered.

const hashedKeys = (JSON.parse(canonical.split('\n')[1] ?? '[]') as [string, unknown][])
  .map(([key]) => key)
  .filter((key) => key !== 'id')
  .sort();

// Phase 83. A row carrying every field, so the key set the hash covers can be
// compared against MACHINE_EXECUTION_FIELDS in full. The row above carries no
// acceptance, so its key set is the four Phase 68 fields and condition 43 reads
// that one.
const ACCEPTED: MachineExecutionFields = { ...BASE, acceptedTmuxVersion: '3.9a' };
const canonicalAccepted = canonicalMachineText(ID, ACCEPTED);
const hashedKeysAccepted = (
  JSON.parse(canonicalAccepted.split('\n')[1] ?? '[]') as [string, unknown][]
)
  .map(([key]) => key)
  .filter((key) => key !== 'id')
  .sort();

/** Everything conditions 41 and 42 need about the fifth field. */
const acceptedVersion = {
  unaccepted: base,
  accepted: machineExecutionHash(ID, ACCEPTED),
  acceptedOther: machineExecutionHash(ID, {
    ...BASE,
    acceptedTmuxVersion: '3.8a'
  }),
  backToUnset: machineExecutionHash(ID, {
    ...ACCEPTED,
    acceptedTmuxVersion: null
  }),
  canonicalCarriesVersion: canonicalAccepted.includes('3.9a'),
  unacceptedCanonicalCarriesKey: canonical.includes('acceptedTmuxVersion'),
  sheetLines: [...describeMachine(ID, ACCEPTED).lines],
  appendedFields: APPENDED_EXECUTION_FIELDS
};

/**
 * Condition 44. An acceptance is for the exec plane and reaches no other one.
 *
 * The two gates are asked about the SAME version with the SAME acceptance. The
 * exec gate answers `accepted` and the control gate answers `unmeasured`,
 * because control mode is a different wire protocol and an acceptance says
 * nothing about it.
 */
const acceptanceReach = (() => {
  const version = '9.9z';
  return {
    version,
    exec: decideRemoteVersionGate(version, TESTED_REMOTE_TMUX_VERSIONS, version)
      .kind,
    control: decideRemoteControlGate(version, TESTED_REMOTE_TMUX_VERSIONS).kind,
    execWithoutAcceptance: decideRemoteVersionGate(
      version,
      TESTED_REMOTE_TMUX_VERSIONS,
      null
    ).kind,
    unreadableWithAcceptance: decideRemoteVersionGate(
      null,
      TESTED_REMOTE_TMUX_VERSIONS,
      version
    ).kind,
    measuredBeatsAccepted: decideRemoteVersionGate(
      TESTED_REMOTE_TMUX_VERSIONS[0]?.version ?? '3.6a',
      TESTED_REMOTE_TMUX_VERSIONS,
      TESTED_REMOTE_TMUX_VERSIONS[0]?.version ?? '3.6a'
    ).kind
  };
})();

// ---------------------------------------------------------------------------
// 5. The drop whole rule
// ---------------------------------------------------------------------------

const GOOD_ROW = {
  id: 'pop-os',
  label: 'Pop OS',
  color: 'blue',
  host: 'pop-os.tail1a2b.ts.net',
  user: 'greg',
  port: 22,
  remoteTmuxPath: '/usr/bin/tmux'
};

const BAD_ROWS: { name: string; row: unknown; field: string }[] = [
  { name: 'a host beginning with a hyphen', row: { id: 'dash', host: '-oProxyCommand=x' }, field: 'host' },
  { name: 'a user beginning with a hyphen', row: { id: 'du', host: 'a.example', user: '-oX=y' }, field: 'user' },
  { name: 'a relative program path', row: { id: 'rel', host: 'a.example', remoteTmuxPath: 'tmux' }, field: 'remoteTmuxPath' },
  { name: 'a program path holding a quote', row: { id: 'q', host: 'a.example', remoteTmuxPath: "/usr/bin/it's" }, field: 'remoteTmuxPath' },
  { name: 'a port outside the range', row: { id: 'p', host: 'a.example', port: 70000 }, field: 'port' },
  { name: 'a colour outside the six', row: { id: 'c', host: 'a.example', color: 'puce' }, field: 'color' },
  { name: 'an unknown key', row: { id: 'u', host: 'a.example', sshOptions: [] }, field: 'sshOptions' },
  { name: 'a missing address', row: { id: 'nohost' }, field: 'host' },
  // Phase 83, condition 45. A value in the accepted version field reaches
  // nothing that runs, and it still drops the row whole, because a field Tortie
  // cannot read is a field a person cannot rely on.
  {
    name: 'an accepted version carrying a command',
    row: { id: 'av1', host: 'a.example', acceptedTmuxVersion: '3.7c; rm -rf /' },
    field: 'acceptedTmuxVersion'
  },
  {
    name: 'an accepted version that is a path',
    row: { id: 'av2', host: 'a.example', acceptedTmuxVersion: '../../etc' },
    field: 'acceptedTmuxVersion'
  },
  {
    name: 'an empty accepted version',
    row: { id: 'av3', host: 'a.example', acceptedTmuxVersion: '' },
    field: 'acceptedTmuxVersion'
  },
  {
    name: 'an accepted version of forty characters',
    row: {
      id: 'av4',
      host: 'a.example',
      acceptedTmuxVersion: '3.7c3.7c3.7c3.7c3.7c3.7c3.7c3.7c3.7c3.7c'
    },
    field: 'acceptedTmuxVersion'
  },
  {
    name: 'an accepted version carrying a newline',
    row: { id: 'av5', host: 'a.example', acceptedTmuxVersion: '3.7c\n3.6a' },
    field: 'acceptedTmuxVersion'
  }
];

const dropRows = BAD_ROWS.map((entry) => {
  const out = validateMachinesFile({ schema: 1, machines: [GOOD_ROW, entry.row] });
  const problem = out.problems[0] ?? null;
  return {
    name: entry.name,
    expectField: entry.field,
    survivorKept: out.rows.length === 1 && out.rows[0]?.id === 'pop-os',
    droppedWhole: !out.rows.some((r) => r.id !== 'pop-os'),
    problemCount: out.problems.length,
    problemField: problem?.field ?? null,
    problemMessage: problem?.message ?? null
  };
});

// ---------------------------------------------------------------------------
// 6. The taxonomy
// ---------------------------------------------------------------------------

const taxonomy = MACHINE_OUTCOME_CLASSES.map((cls) => {
  const copy = machineOutcomeCopy(cls);
  return {
    class: cls,
    alarm: copy.alarm,
    headline: copy.headline,
    detailLength: copy.detail.length,
    hasDash: copy.headline.includes('—') || copy.detail.includes('—')
  };
});

// ---------------------------------------------------------------------------
// 7. The source scan: what these files may not mention, and what may appear once
// ---------------------------------------------------------------------------

/** Every production .ts under src/main/machines/, excluding the tests. */
function productionFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (entry === '__tests__') continue;
      productionFiles(path, out);
    } else if (entry.endsWith('.ts')) {
      out.push(path);
    }
  }
  return out;
}

/**
 * Lines mentioning a phrase, with the line text, so the checker can tell a
 * comment that says Tortie does not read something from code that reads it.
 */
function mentions(files: string[], phrase: string): { file: string; line: number; text: string }[] {
  const hits: { file: string; line: number; text: string }[] = [];
  for (const file of files) {
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((text, index) => {
      if (text.includes(phrase)) {
        hits.push({ file: file.slice(repoRoot.length + 1), line: index + 1, text: text.trim() });
      }
    });
  }
  return hits;
}

// ---------------------------------------------------------------------------
// 8. Phase 69. The exec plane's composition, the ledger, the options and the list
// ---------------------------------------------------------------------------
//
// The two contexts below are SHAPES, not this machine's real state. Nothing here
// resolves a binary, opens a socket or asks Electron anything.

/** The scratch socket a harness launch would use. Never the literal `gmux`. */
const PROBE_SOCKET = 'gmux-p69-conformance';

const LOCAL_CTX: LocalMachineContext = {
  kind: 'local',
  machineId: 'local',
  bin: '/opt/homebrew/bin/tmux',
  socket: PROBE_SOCKET,
  confPath: '/Users/x/repo/resources/gmux-tmux.conf',
  binSource: 'dev-path',
  packaged: false
};

const REMOTE_CTX: RemoteMachineContext = {
  kind: 'remote',
  machineId: ID,
  sshBin: '/usr/bin/ssh',
  host: BASE.host,
  user: BASE.user,
  port: BASE.port,
  remoteTmuxPath: BASE.remoteTmuxPath ?? '/usr/bin/tmux',
  socket: PROBE_SOCKET,
  controlPath: `/var/folders/7f/abcdefghijklmnopqrstuvwxyz/T/${CONTROL_DIR_NAME}/m-0123456789ab`,
  hostKeys: HOST_KEYS
};

/**
 * The twelve argument vectors the local composition is compared on.
 *
 * They are the real verbs, taken from the call sites: the list every reconcile
 * makes, the two reads the version gate makes, the option writes the boot makes,
 * a capture with its flags, a kill by identity, and one carrying an empty string
 * argument because `copy-mode-position-format ''` is one of the five.
 */
const LOCAL_VECTORS: readonly (readonly string[])[] = [
  ['start-server'],
  ['list-sessions', '-F', '#{session_id}'],
  ['display-message', '-p', '#{version}'],
  ['list-sessions', '-F', '#{version}'],
  ['set-environment', '-g', 'PATH', '/usr/bin:/bin'],
  ['set-option', '-g', 'history-limit', '25000'],
  ['set-option', '-g', 'copy-mode-position-format', ''],
  ['set-option', '-g', 'mode-style', 'noattr,bg=default,fg=default'],
  ['show-options', '-gv', 'history-limit'],
  ['capture-pane', '-p', '-J', '-e', '-t', '$3'],
  ['kill-session', '-t', '$7'],
  ['has-session', '-t', '=smoke-keeper']
];

/**
 * The golden local argv, being what `tmuxArgs` produced at `ab94847`.
 *
 * It is written out here rather than imported, ON PURPOSE. Importing the current
 * implementation and comparing it against itself would pass whatever the
 * implementation did. This list is the shape from before the refactor, typed out
 * from `ab94847`'s one line body, `['-L', ctx.socket, '-f', ctx.confPath, ...rest]`.
 */
const localGolden = LOCAL_VECTORS.map((rest) => [
  '-L',
  LOCAL_CTX.socket,
  '-f',
  LOCAL_CTX.confPath,
  ...rest
]);

const localRows = LOCAL_VECTORS.map((rest, index) => {
  const plan = tmuxCommand(LOCAL_CTX, rest);
  const want = localGolden[index] ?? [];
  return {
    verb: rest[0] ?? '',
    file: plan.file,
    got: [...plan.argv],
    want,
    equal: JSON.stringify([...plan.argv]) === JSON.stringify(want)
  };
});

const REMOTE_VERB = ['list-sessions', '-F', '#{session_id}'];
const remotePlan = tmuxCommand(REMOTE_CTX, REMOTE_VERB);
const remoteBootPlan = tmuxCommand(REMOTE_CTX, remoteBootArgs());
const remoteOptions = sshOptions(REMOTE_CTX);

// The tmux call as a LIST, before it is quoted into one argument of the ssh argv.
// Conditions 11 read this rather than the ssh argv, and the reason is what the live
// probe measured: ssh carries no argv to the other machine, it joins everything
// after the address with single spaces and hands one string to that machine's login
// shell. So the whole tmux call travels as ONE quoted argument, and looking for
// `-L` inside it would be reading the quoting rather than the command.
const remoteCall = remoteTmuxArgv(REMOTE_CTX, REMOTE_VERB);
const remoteBootCall = remoteTmuxArgv(REMOTE_CTX, remoteBootArgs());

/** Every `set`, `set-option` and `setw` line in the conf, as name/scope/value. */
function confOptions(): { name: string; scope: string; value: string }[] {
  const text = readFileSync(join(repoRoot, 'resources', 'gmux-tmux.conf'), 'utf8');
  const out: { name: string; scope: string; value: string }[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line.startsWith('#') || line.length === 0) continue;
    const m = /^set(?:-option|w)?\s+(-[A-Za-z]+)\s+(\S+)\s*(.*)$/.exec(line);
    if (m === null) continue;
    const [, scope, name, rest] = m;
    const value = (rest ?? '').trim().replace(/^"(.*)"$/, '$1');
    out.push({ name: name ?? '', scope: scope ?? '', value });
  }
  return out;
}

const conf = confOptions();
const optionRows = SERVER_OPTIONS.map((row) => {
  const found = conf.find((entry) => entry.name === row.name) ?? null;
  return {
    name: row.name,
    scope: row.scope,
    value: row.value,
    inConf: found !== null,
    confScope: found?.scope ?? '',
    confValue: found?.value ?? '',
    // `history-limit` is the one row whose runtime value is the person's Settings
    // value, and the conf's number is the first boot default, so the values must
    // still agree here: this list carries the conf's literal.
    agrees:
      found !== null && found.scope === row.scope && found.value === row.value
  };
});
const confOnly = conf
  .filter((entry) => !SERVER_OPTIONS.some((row) => row.name === entry.name))
  .map((entry) => entry.name);

const ledgerRows = REMOTE_VERB_LEDGER.map((row) => ({
  verb: row.verb,
  repeat: row.repeat,
  kind: row.kind,
  reasonLength: row.reason.length,
  // Phase 89. An unsafe row names the thing that finds a repeat after it has
  // happened. A safe row has none, because it needs none.
  guard: row.guard ?? ''
}));

const remoteList = TESTED_REMOTE_TMUX_VERSIONS.map((row) => ({
  version: row.version,
  exec: row.measured.exec,
  control: row.measured.control,
  measuredAt: row.measuredAt,
  noteLength: row.note.length,
  // Phase 83. Which copy of that version was read. A row that does not say is
  // a row the next reader cannot trust, so condition 17 fails on an empty one.
  subject: row.subject,
  subjectLength: row.subject.length
}));

/** The golden files and the manifest beside them. */
function goldens(): {
  present: string[];
  manifest: unknown;
} {
  const dir = join(machinesDir, '__tests__', 'golden');
  let present: string[] = [];
  let manifest: unknown = null;
  try {
    present = readdirSync(dir).filter((name) => name.endsWith('.txt')).sort();
  } catch {
    present = [];
  }
  try {
    manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
  } catch {
    manifest = null;
  }
  return { present, manifest };
}

const golden = goldens();

// ---------------------------------------------------------------------------
// 9. Phase 70. The attach argv, the create argv, the list format and the
//    containment rule
// ---------------------------------------------------------------------------

/**
 * The eight vectors the LOCAL attach argv is compared on.
 *
 * They are the shapes a real name takes: a plain one, one with a space, one with
 * a hyphen, one a caller already prefixed, a long one, a digit-only one, and the
 * two that vary the server rather than the name.
 */
const ATTACH_LOCAL_VECTORS: readonly {
  name: string;
  bin: string;
  socket: string;
  confPath: string;
}[] = [
  { name: 'work', bin: '/opt/homebrew/bin/tmux', socket: PROBE_SOCKET, confPath: '/r/gmux-tmux.conf' },
  { name: 'the zen of tortie', bin: '/opt/homebrew/bin/tmux', socket: PROBE_SOCKET, confPath: '/r/gmux-tmux.conf' },
  { name: 'phase-70', bin: '/opt/homebrew/bin/tmux', socket: PROBE_SOCKET, confPath: '/r/gmux-tmux.conf' },
  { name: '=already', bin: '/opt/homebrew/bin/tmux', socket: PROBE_SOCKET, confPath: '/r/gmux-tmux.conf' },
  { name: 'work', bin: '/opt/homebrew/bin/tmux', socket: 'gmux-p70-other', confPath: '/r/gmux-tmux.conf' },
  { name: 'work', bin: '/usr/local/bin/tmux', socket: PROBE_SOCKET, confPath: '/another/place/gmux-tmux.conf' },
  { name: 'a'.repeat(180), bin: '/opt/homebrew/bin/tmux', socket: PROBE_SOCKET, confPath: '/r/gmux-tmux.conf' },
  { name: '12345', bin: '/opt/homebrew/bin/tmux', socket: PROBE_SOCKET, confPath: '/r/gmux-tmux.conf' }
];

/**
 * The golden local attach argv, being what `attach-host.ts` composed inline at
 * `b660df9`.
 *
 * It is written out here rather than imported, ON PURPOSE, for the same reason
 * the local tmux golden above is: importing the current implementation and
 * comparing it against itself would pass whatever the implementation did.
 */
const attachLocalRows = ATTACH_LOCAL_VECTORS.map((vector) => {
  const plan = attachPlan({
    kind: 'local',
    bin: vector.bin,
    socket: vector.socket,
    confPath: vector.confPath,
    tmuxName: vector.name
  });
  const want = [
    '-u',
    '-L',
    vector.socket,
    '-f',
    vector.confPath,
    'attach-session',
    '-t',
    `=${vector.name}`
  ];
  return {
    name: vector.name.length > 24 ? `${vector.name.slice(0, 21)}...` : vector.name,
    file: plan.file,
    wantFile: vector.bin,
    got: [...plan.argv],
    want,
    equal:
      plan.file === vector.bin &&
      JSON.stringify([...plan.argv]) === JSON.stringify(want)
  };
});

const attachRemotePlan = attachPlan({
  kind: 'remote',
  ctx: REMOTE_CTX,
  tmuxName: '$4'
});

/** The remote create argv, composed against a shape rather than a machine. */
const remoteCreateArgv = remoteCreateArgs({
  tmuxName: 'work',
  cwd: '/srv/repo',
  sessionId: '0d1f6f2e-70a1-4a1c-9f2f-5c0b1a2d3e4f',
  argv: ['claude', '--model', 'opus']
});

/**
 * Every production file under `src/main/machines/` that names node-pty, and
 * every one that imports anything under `src/main/attach/`.
 *
 * Phase 69 found that reading one constant across this boundary put node-pty
 * into the import graph of the manifest store, and `contract-inventory --check`
 * crashed because its scratch bundle could not load `pty.node`. This rung adds a
 * remote attach, so it is exactly the rung that can undo that.
 */
const attachFiles = productionFiles(join(repoRoot, 'src', 'main', 'attach'));

// ---------------------------------------------------------------------------
// 10. Phase 71. The section 4.4 case table, read as data
// ---------------------------------------------------------------------------
//
// The checker holds research 51 section 4.4's table as a literal and compares
// this against it row by row. Writing the expected table in the checker rather
// than importing it is the same rule the local golden argv follows: importing
// the implementation and comparing it against itself passes whatever the
// implementation did.

const AT = 1_700_000_000_000;

const truthRows = MACHINE_EVENT_KINDS.map((kind) => {
  const event =
    kind === 'transport-lost'
      ? { kind, at: AT, errorClass: 'timed-out' as const }
      : { kind, at: AT };
  const truth = machineTruth(event);
  return {
    event: kind,
    rows: truth.rows.kind === 'per-row' ? 'per-row' : truth.rows.status,
    restoreOffered: truth.restoreOffered,
    reason: truth.restoreDisabledReason,
    evidence: truth.evidence,
    mayFlipRestorable: mayFlipRestorable(event)
  };
});

// ---------------------------------------------------------------------------
// 11. Phase 72. The restore gate, driven over every arm
// ---------------------------------------------------------------------------
//
// The gate decides whether a person is offered a button that starts an agent on
// another computer. Pressing it when the answer should have been no is how one
// conversation comes to have two agents on it, which research 28 ranks as the
// worst thing this whole rung can do.
//
// So the gate is driven here, from a baseline where every condition holds, with
// ONE condition turned off at a time. The checker asserts which arm each of
// those produces, that the order of the arms is the order the refusals are
// declared in, and that a row reading `unknown` is never offered whatever else
// is true.

/** Every condition true. The one input where the answer is yes. */
const GATE_BASELINE: RemoteRestoreFacts = {
  machineKnown: true,
  contextReady: true,
  machineReachable: true,
  completedListSeen: true,
  machineAnswering: true,
  listedNow: false,
  // PHASE 117. The third arm's own fact. False on the baseline, because the
  // baseline is the one input where the answer is yes.
  createUnconfirmed: false,
  rowMachineId: 'studio',
  targetMachineId: 'studio',
  rowStatus: 'restorable'
};

/** One condition turned off, and the arm it is expected to reach. */
const GATE_VECTORS: { name: string; facts: RemoteRestoreFacts }[] = [
  { name: 'everything holds', facts: GATE_BASELINE },
  {
    name: 'the machine was removed',
    facts: { ...GATE_BASELINE, machineKnown: false }
  },
  {
    name: 'the row belongs to another machine',
    facts: { ...GATE_BASELINE, rowMachineId: 'laptop' }
  },
  {
    name: 'nobody signed in to it in this run',
    facts: { ...GATE_BASELINE, contextReady: false }
  },
  {
    name: 'neither route to the machine answered',
    facts: { ...GATE_BASELINE, machineReachable: false }
  },
  {
    // PHASE 72 FIX ROUND, and it is the case restore exists for. A machine
    // whose own session server has died can never carry a live connection,
    // because the connection is opened only after a read proves that server is
    // running. It is still reachable over the route the restore itself uses,
    // and its completed answer is what says the session is not running.
    name: 'that machine’s own session server has died',
    facts: {
      ...GATE_BASELINE,
      machineReachable: true,
      completedListSeen: true,
      machineAnswering: true,
      listedNow: false
    }
  },
  {
    name: 'no list has completed yet',
    facts: { ...GATE_BASELINE, completedListSeen: false }
  },
  {
    name: 'the machine is not answering now',
    facts: { ...GATE_BASELINE, machineAnswering: false }
  },
  {
    name: 'the machine still lists the session',
    facts: { ...GATE_BASELINE, listedNow: true }
  },
  {
    name: 'the row reads unknown',
    facts: { ...GATE_BASELINE, rowStatus: 'unknown' }
  },
  {
    name: 'the row reads unknown and every condition holds',
    facts: { ...GATE_BASELINE, rowStatus: 'unknown', machineAnswering: true }
  },
  {
    name: 'the row is running',
    facts: { ...GATE_BASELINE, rowStatus: 'running', listedNow: true }
  },
  // PHASE 117. Four inputs for one arm, and the last three are not decoration.
  // A row whose create was never confirmed ALWAYS reads `unknown`, because
  // `remoteRecordStatus` gives it that status, and it is asked in states where
  // no list has completed and where nobody has signed in to the machine yet.
  // An arm placed below any of those three is an arm that never fires for the
  // case it was written for, and the sentence a person reads is one that does
  // not name the risk of a second agent on one conversation.
  {
    name: 'the create was never confirmed',
    facts: { ...GATE_BASELINE, createUnconfirmed: true }
  },
  {
    name: 'the create was never confirmed and the row reads unknown',
    facts: { ...GATE_BASELINE, createUnconfirmed: true, rowStatus: 'unknown' }
  },
  {
    name: 'the create was never confirmed and no list has completed yet',
    facts: {
      ...GATE_BASELINE,
      createUnconfirmed: true,
      rowStatus: 'unknown',
      completedListSeen: false
    }
  },
  {
    name: 'the create was never confirmed and nobody signed in to it',
    facts: {
      ...GATE_BASELINE,
      createUnconfirmed: true,
      rowStatus: 'unknown',
      contextReady: false
    }
  }
];

const gateRows = GATE_VECTORS.map((vector) => {
  const verdict = remoteRestoreVerdict(vector.facts);
  return {
    name: vector.name,
    rowStatus: vector.facts.rowStatus,
    offered: verdict.offered,
    refusal: verdict.refusal,
    reason: verdict.reason ?? ''
  };
});

// ---------------------------------------------------------------------------
// 12. Phase 72. The ten row fault matrix, counted from its own source
// ---------------------------------------------------------------------------
//
// The matrix is the gate on this rung, and a matrix that quietly lost a row
// would still print PASS over the rows it kept. So the ids are counted out of
// both halves and the checker holds the number at ten and asserts the two
// halves name the same set. It is a text scan rather than an import, because
// importing either half would load Electron into a gate whose whole claim is
// that it loads nothing.

const matrixAppSource = readFileSync(
  join(repoRoot, 'src', 'main', 'harness', 'remote-matrix.ts'),
  'utf8'
);
const matrixSupervisorSource = readFileSync(
  join(repoRoot, 'build', 'remote-matrix.mjs'),
  'utf8'
);
const matrixIdsIn = (text: string): string[] => [
  ...new Set([...text.matchAll(/'(matrix\.[a-z-]+)'/g)].map((hit) => hit[1] ?? ''))
];

// ---------------------------------------------------------------------------
// 13. Phase 79.1. The key install: its own agreement, its argv and its script
// ---------------------------------------------------------------------------
//
// Installing a key is a second act with a second agreement. The machine
// execution hash does not gain a field for it, and conditions 1, 2 and 7 above
// still hold that set at four. What is checked here is that the install has its
// OWN hash over the facts a person reads on its own sheet, that the two hashes
// are never the same value, and that nothing a person or an agent typed can
// reach the other machine's shell.
//
// Nothing below connects to anything, makes a key, or writes a file. Every call
// composes a string.

/** A userData root with a space in it, which is what every Mac has. */
const KEY_USER_DATA = '/Users/x/Library/Application Support/Tortie';

/** The one public key line shape Tortie ever installs. Made up, not a real key. */
const PUBLIC_KEY_LINE =
  'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIB6f4Iu2vQeJcuqZ0h1sK2n2u9C6VvVdV9wF1B2Q3R4S tortie-0123456789ab';

const KEY_FACTS: KeyInstallFacts = {
  host: BASE.host,
  user: BASE.user,
  port: BASE.port,
  localKeyPath: machineKeyPath(ID, KEY_USER_DATA)
};

/** One variation per hashed field, changed alone. */
const KEY_CHANGED: Record<string, KeyInstallFacts> = {
  host: { ...KEY_FACTS, host: 'attic.tail1a2b.ts.net' },
  user: { ...KEY_FACTS, user: 'root' },
  port: { ...KEY_FACTS, port: 2222 },
  localKeyPath: { ...KEY_FACTS, localKeyPath: `${KEY_FACTS.localKeyPath}-other` }
};

const KEY_UNSET: Record<string, KeyInstallFacts> = {
  user: { ...KEY_FACTS, user: null },
  port: { ...KEY_FACTS, port: null }
};

const keyBase = keyInstallHash(ID, KEY_FACTS);
const keyCanonical = canonicalKeyInstallText(ID, KEY_FACTS);

const keyFieldRows = Object.keys(KEY_CHANGED).map((field) => ({
  field,
  changedHash: keyInstallHash(ID, KEY_CHANGED[field] as KeyInstallFacts),
  unsetHash:
    KEY_UNSET[field] === undefined
      ? null
      : keyInstallHash(ID, KEY_UNSET[field] as KeyInstallFacts)
}));

/** The install argv, and the one command it carries to the other machine. */
const keyInstallArgv = composeKeyInstallArgv(BASE, HOST_KEYS, PUBLIC_KEY_LINE);
const keyInstallCommand = composeAuthorizedKeysCommand(PUBLIC_KEY_LINE);

/**
 * The same command, quoted here from an argv array rather than read from the
 * module. A byte difference between the two is a composer that stopped going
 * through one `shellQuoteArgv` call over a list.
 */
const keyInstallCommandRecomposed = shellQuoteArgv([
  '/bin/sh',
  '-c',
  AUTHORIZED_KEYS_SCRIPT,
  'tortie-install-key',
  PUBLIC_KEY_LINE
]);

/**
 * Five public key lines nobody would ever produce, each one a way a line could
 * carry something the other machine's shell would read. Every one of them must
 * produce no argv at all.
 */
const HOSTILE_KEY_LINES = [
  `${PUBLIC_KEY_LINE}\nssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEVIL evil`,
  `${PUBLIC_KEY_LINE}; rm -rf /`,
  `${PUBLIC_KEY_LINE}\`id\``,
  `${PUBLIC_KEY_LINE}$(id)`,
  `${PUBLIC_KEY_LINE}'`
];

const hostileKeyRows = HOSTILE_KEY_LINES.map((line) => {
  let composed: string[] | null = null;
  let threw = false;
  try {
    composed = composeKeyInstallArgv(BASE, HOST_KEYS, line);
  } catch {
    threw = true;
  }
  return {
    sample: line.slice(PUBLIC_KEY_LINE.length),
    threw,
    argvLength: composed === null ? 0 : composed.length
  };
});

/** Twelve ids the machines file is allowed to carry, and an agent can write. */
const HOSTILE_MACHINE_IDS = [
  '../../../../etc/ssh/ssh_host_ed25519_key',
  '..',
  '.',
  '/etc/shadow',
  'a/b/c',
  '   x   ',
  'id null',
  "'; rm -rf / #",
  '$(id)',
  '`id`',
  'two\nlines',
  'unicode-horse-abcdefghij'.repeat(40)
];

const keyRecordDir = machineRecordDir(KEY_USER_DATA);
const hostileKeyPaths = HOSTILE_MACHINE_IDS.map((id) => ({
  path: machineKeyPath(id, KEY_USER_DATA),
  comment: machineKeyComment(id)
}));

/** The import specifiers of one module, for condition 34. */
function importSpecifiers(file: string): string[] {
  return [...readFileSync(file, 'utf8').matchAll(/from\s+'([^']+)'/g)].map(
    (hit) => hit[1] ?? ''
  );
}

/** Every line of a file, trimmed, for a source rule the checker decides. */
function sourceLines(file: string): { line: number; text: string }[] {
  return readFileSync(file, 'utf8')
    .split('\n')
    .map((text, index) => ({ line: index + 1, text: text.trim() }));
}

// --- Phase 73, conditions 35 to 40 -----------------------------------------
// Every one of these is pure. The catalogue imports nothing at all, and the
// door's two composers read no machine, open no file and start nothing.
const {
  REMOTE_SCRIPTS,
  REMOTE_SCRIPT_MARKER,
  REMOTE_SCRIPT_MAX_BYTES,
  // Phase 98, condition 52. The size ceiling one search answer may hold, read
  // here so the gate can compare it against the constant inside the script text.
  REMOTE_SEARCH_MAX_BYTES,
  // Phase 108, condition 58g. The per call cap on the context read list and
  // the per file byte cap, read here so the gate can compare the second
  // against the `head -c` literal inside the script text. Both are compiled
  // constants in a module that imports nothing.
  CONTEXT_READ_LIST_MAX_BYTES,
  CONTEXT_READ_FILE_MAX_BYTES
} = await import('../src/main/machines/remote-scripts');
const { composeRemoteScriptCommand, remoteScriptName } = await import(
  '../src/main/machines/remote-run'
);
const { REMOTE_DROP_IMAGES_ONLY: MAIN_DROP_COPY } = await import(
  '../src/main/machines/remote-copy'
);
const {
  REMOTE_IMAGE_MAX_BYTES,
  // Phase 99, condition 53. The size ceiling one name list may hold, read here
  // so the gate can compare it against the constant inside the script text.
  REMOTE_FILE_LIST_MAX_BYTES,
  // The most names one read carries, so the gate can say the number out loud.
  REMOTE_FILE_LIST_MAX,
  // Phase 100, condition 54. The depths the panel offers and the two ceilings
  // the read is bounded by. All four are compiled constants.
  REMOTE_SESSION_LINE_DEPTHS,
  REMOTE_SESSION_LINES_BYTES_MAX,
  REMOTE_SESSION_LINES_DEFAULT,
  REMOTE_SESSION_LINES_MAX,
  // Phase 107, condition 57j. The page and the ceiling, being the two numbers
  // that keep one history answer under about 162,000 bytes and keep this phase
  // at tier 2. Both are compiled constants.
  REMOTE_HISTORY_PAGE,
  REMOTE_HISTORY_MAX_COMMITS
} = await import('../src/shared/ipc');
// Phase 100, condition 54. The composer the read reuses. It is pure: it reads no
// machine, opens no file and starts nothing.
const { remoteCaptureArgs } = await import(
  '../src/main/machines/remote-capsule'
);
// Phase 105, condition 55. The gh argv builder and the allowlist that refuses a
// command line that would mutate GitHub. BOTH ARE PURE. `src/main/actions/argv`
// imports nothing at all, `src/main/actions/watch` imports one type, and NO gh
// PROCESS IS CREATED HERE: this probe composes an argv and asks the allowlist
// about it. It is the same pair `src/main/machines/remote-runs.ts` uses.
const { assertReadOnlyArgv, buildRunListForBranchArgv } = await import(
  '../src/main/actions/argv'
);
const { WATCH_LIMITS } = await import('../src/main/actions/watch');

// --- Phase 84, conditions 46 to 48 -----------------------------------------
// All three are pure. The allowed environment set is a compiled constant, the
// key path composer reads no file, and `sshOptions` starts nothing.
const { REMOTE_ENV_ALLOWED, REMOTE_ENV_MEASURED_AND_REFUSED } = await import(
  '../src/main/machines/remote-env'
);
const { machineKeyDir: keyDirFor, machineKeyPath: keyPathFor } = await import(
  '../src/main/machines/key-material'
);

/** A value nothing in this product would ever pass, for the hostile check. */
const HOSTILE_VALUE = "'; rm -rf ~; touch /tmp/pwned; echo '";

/**
 * Every command in one script that names `git`, with what stands in front of it
 * on the same line (Phase 90.2, condition 49).
 *
 * The two environment names are read from the text BEFORE the `git` token on
 * that line, because that is the only place a shell would accept them. A
 * command that carries neither is a command that can stop and wait for a
 * password on a machine nobody is watching, and a wait like that reads to a
 * person as the app freezing.
 */
function gitCallsOf(
  text: string
): { verb: string; prompt: boolean; gcm: boolean }[] {
  const out: { verb: string; prompt: boolean; gcm: boolean }[] = [];
  for (const line of text.split('\n')) {
    for (const hit of line.matchAll(/git (?:--no-pager )?([a-z-]+)/g)) {
      const before = line.slice(0, hit.index ?? 0);
      out.push({
        verb: hit[1] ?? '',
        prompt: before.includes('GIT_TERMINAL_PROMPT=0'),
        gcm: before.includes('GCM_INTERACTIVE=never')
      });
    }
  }
  return out;
}

/** Where every `$1` to `$9` sits in one script, and how it is quoted. */
function positionalsOf(
  text: string
): { index: number; at: number; quoting: 'double' | 'single' | 'bare' }[] {
  const out: { index: number; at: number; quoting: 'double' | 'single' | 'bare' }[] =
    [];
  let single = false;
  let double = false;
  for (let at = 0; at < text.length; at += 1) {
    const ch = text[at];
    if (ch === "'" && !double) {
      single = !single;
      continue;
    }
    if (ch === '"' && !single) {
      double = !double;
      continue;
    }
    if (ch !== '$') continue;
    const next = text[at + 1] ?? '';
    if (next < '1' || next > '9') continue;
    out.push({ index: Number(next), at, quoting: single ? 'single' : double ? 'double' : 'bare' });
  }
  return out;
}

const scriptRows = REMOTE_SCRIPTS.map((script) => {
  const args = Array.from({ length: script.params }, (_, at) =>
    at === 0 ? HOSTILE_VALUE : `v${String(at + 1)}`
  );
  const command = composeRemoteScriptCommand(script, args);
  const recomposed = shellQuoteArgv([
    '/bin/sh',
    '-c',
    script.text,
    remoteScriptName(script.id),
    ...args
  ]);
  const markers = script.text.split(REMOTE_SCRIPT_MARKER).length - 1;
  const lines = script.text.split('\n');
  return {
    id: script.id,
    mode: script.mode,
    params: script.params,
    reasonLength: script.reason.length,
    bytes: script.text.length,
    text: script.text,
    firstLine: lines[0] ?? '',
    secondLine: lines[1] ?? '',
    markers,
    carriesBacktick: script.text.includes('`'),
    positionals: positionalsOf(script.text),
    command,
    commandRecomposed: recomposed,
    scriptInCommandOnce: command.split(shellQuoteArgv([script.text])).length - 1,
    hostileInScript: script.text.includes(HOSTILE_VALUE),
    hostileInCommand: command.split(HOSTILE_VALUE).length - 1,
    hostileQuoted: command.includes(shellQuoteArgv([HOSTILE_VALUE])),
    // Every `>` that is not part of `2>/dev/null`, with what it aims at.
    redirects: [...script.text.matchAll(/(?<!2)>\s*([^\s;|)]+)/g)].map(
      (hit) => hit[1] ?? ''
    ),
    // Every git verb the text names, so a later edit cannot add `commit`.
    gitVerbs: [...script.text.matchAll(/git (?:--no-pager )?([a-z-]+)/g)].map(
      (hit) => hit[1] ?? ''
    ),
    gitVerbIsAValue: /git (?:--no-pager )?"?\$/.test(script.text),
    // Phase 90.2, condition 49. Every git command, with whether the two names
    // that turn a hidden password prompt off stand in front of it.
    gitCalls: gitCallsOf(script.text),
    // Every command word, for the mutating program check.
    words: script.text.split(/[\s;|&(){}]+/).filter((word) => word.length > 0)
  };
});

/** The one write, composed with a payload of the largest image allowed. */
const biggestImageCommand = (() => {
  const write = REMOTE_SCRIPTS.find((script) => script.mode === 'write');
  if (write === undefined) return { bytes: 0, fits: false };
  const payload = Buffer.alloc(REMOTE_IMAGE_MAX_BYTES, 7).toString('base64');
  const command = composeRemoteScriptCommand(write, ['s-1-abcdef0123456789.png', payload]);
  return { bytes: command.length, fits: command.length <= REMOTE_SCRIPT_MAX_BYTES };
})();

const runPath = join(machinesDir, 'remote-run.ts');
const scriptsPath = join(machinesDir, 'remote-scripts.ts');
const rendererDropRemotePath = join(
  repoRoot,
  'src',
  'renderer',
  'terminal',
  'drop',
  'remote.ts'
);
const rendererDropCopy = (() => {
  const text = readFileSync(rendererDropRemotePath, 'utf8');
  const match = /export const REMOTE_DROP_IMAGES_ONLY =\n([\s\S]*?);\n/.exec(text);
  if (match === null) return '';
  // eslint-disable-next-line no-eval
  return String(eval(`(${(match[1] ?? '').trim()})`));
})();

const keyMaterialPath = join(machinesDir, 'key-material.ts');
const keyInstallPath = join(machinesDir, 'key-install.ts');
const connectionTestPath = join(machinesDir, 'connection-test.ts');

const files = productionFiles(machinesDir);
const wholeTree = (() => {
  const collected: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      if (entry === 'node_modules' || entry === '__tests__') continue;
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.tsx?$/.test(entry)) collected.push(path);
    }
  };
  walk(join(repoRoot, 'src'));
  return collected;
})();

// ---------------------------------------------------------------------------
// Phase 89. Who may type on another machine, read out of the tree
// ---------------------------------------------------------------------------
//
// `sendArmedResumeText` is the only function that can send `send-keys` to a
// machine. It is declared in exec-plane.ts, so that file is left out of the
// list and what remains is every file that CALLS it. The gate beside this
// probe fails on a third one.
const armedResumeCallFiles = [
  ...new Set(
    mentions(wholeTree, 'sendArmedResumeText')
      .filter((hit) => hit.file !== 'src/main/machines/exec-plane.ts')
      .map((hit) => hit.file)
  )
].sort();

// Every file under src/main/machines/, tests excluded, that names the verb as a
// string. The local tmux layer is outside this scan on purpose: it sends keys
// to sessions on this Mac and always has.
const sendKeysLiteralFiles = [
  ...new Set(mentions(files, "'send-keys'").map((hit) => hit.file))
].sort();

// The argv the one door composes, read without spawning anything. Composing it
// cannot send it, because the only function that spawns is in exec-plane.ts.
const armedResumeArgv = composeArmedResumeArgv(
  '$7',
  '/Users/someone/.local/bin/claude --resume 11111111-2222-4333-8444-555555555555'
);

// ---------------------------------------------------------------------------
// Phase 89 fix round, condition 68. The counter against a wrapped screen
// ---------------------------------------------------------------------------
//
// MEASURED on this Mac, tmux 3.6a, a detached session 40 columns wide, the
// command typed with `send-keys -l` and read with `capture-pane -p -J`. Under
// `/bin/sh` the screen came back as one row, because the terminal did the
// wrapping and `-J` joins a row the terminal wrapped. Under `/bin/zsh` it came
// back as three rows, because zsh wraps its own input line and writes its own
// line break, so tmux never marks the row as wrapped and `-J` has nothing to
// join.
//
// The counter that only searched for a contiguous string found 0 copies of a
// command that was plainly on the screen. The person was told the conversation
// did not come back while it had, and a real double send was never reported as
// twice. The operator's own shell is zsh. These three screens are what that
// failure looked like, and the gate beside this probe asserts 1, 2 and 0.
const ARMED_WRAP_TEXT =
  '/Users/someone/.local/bin/claude --resume 11111111-2222-4333-8444-555555555555';
const armedResumeWrapCounts = {
  text: ARMED_WRAP_TEXT,
  onceWrapped: countOccurrences(
    'Gregs-Mac-Pro% /Users/someone/.local/b\n' +
      'in/claude --resume 11111111-2222-4333-\n' +
      '8444-555555555555\n',
    ARMED_WRAP_TEXT
  ),
  twiceWrapped: countOccurrences(
    'Gregs-Mac-Pro% /Users/someone/.local/b\n' +
      'in/claude --resume 11111111-2222-4333-\n' +
      '8444-555555555555/Users/someone/.local\n' +
      '/bin/claude --resume 11111111-2222-433\n' +
      '3-8444-555555555555\n',
    ARMED_WRAP_TEXT
  ),
  absent: countOccurrences('Gregs-Mac-Pro%\n\n\n', ARMED_WRAP_TEXT)
};

process.stdout.write(
  JSON.stringify({
    id: ID,
    base,
    sameAgain: machineExecutionHash(ID, { ...BASE }),
    fields: fieldRows,
    executionFields: [...MACHINE_EXECUTION_FIELDS],
    presentationFields: [...MACHINE_PRESENTATION_FIELDS],
    hashedKeys,
    // Phase 83, conditions 7 and 43.
    hashedKeysAccepted,
    acceptedVersion,
    acceptanceReach,
    canonical,
    canonicalCarriesLabel: canonical.includes('Pop OS') || canonical.includes('label'),
    canonicalCarriesColor: canonical.includes('blue') || canonical.includes('color'),
    canonicalCarriesPrefix: canonical.includes(`"${MACHINE_CONFIRM_ID_PREFIX}${ID}"`),
    recordKey: machineRecordKey(ID),
    recordKeyIsPrefixed: machineRecordKey(ID) === `${MACHINE_CONFIRM_ID_PREFIX}${ID}`,
    agentHashForSameBareId: executionHash(ID, agentFields),
    agentCanonicalAlgorithm: CONFIG_EXECUTION_HASH_ALGORITHM,
    agentCanonicalCarriesPrefix: canonicalExecutionText(ID, agentFields).includes(
      MACHINE_CONFIRM_ID_PREFIX
    ),
    sheetLines: [...describeMachine(ID, BASE).lines],
    sheetCarriesSshPath: describeMachine(ID, BASE).lines.some((l) => l.includes('/usr/bin/ssh')),
    sheetCarriesHonesty: describeMachine(ID, BASE).lines.some((l) =>
      l.includes('Confirming seals')
    ),
    drops: dropRows,
    taxonomy,
    alarmClass: MACHINE_ALARM_CLASS,
    argv: composeTestArgv(BASE, HOST_KEYS),
    batchModeInteractive: SSH_BATCH_MODE_INTERACTIVE,
    batchModeSteady: SSH_BATCH_MODE_STEADY,
    hostKeys: HOST_KEYS,
    knownHostsOption: KNOWN_HOSTS_OPTION,
    scannedFiles: files.map((f) => f.slice(repoRoot.length + 1)),
    sshConfigMentions: mentions(files, '.ssh/config'),
    knownHostsMentions: mentions(files, 'known_hosts'),
    batchModeNoMentions: mentions(wholeTree, "'BatchMode=no'"),
    batchModeYesPresent: mentions(wholeTree, "'BatchMode=yes'").length > 0,

    // --- Phase 69, conditions 11 to 18 -------------------------------------
    probeSocket: PROBE_SOCKET,
    realSocket: 'gmux',
    remoteConfPath: REMOTE_CONF_PATH,
    remoteFile: remotePlan.file,
    remoteArgv: [...remotePlan.argv],
    remoteCall: [...remoteCall],
    remoteBootArgv: [...remoteBootPlan.argv],
    remoteBootCall: [...remoteBootCall],
    remoteBootVerbs: remoteVerbsOf(remoteBootArgs()),
    remoteSshOptions: remoteOptions,
    requiredSshOptions: [...REQUIRED_SSH_OPTIONS],
    keepalive: {
      interval: SSH_SERVER_ALIVE_INTERVAL_SECONDS,
      countMax: SSH_SERVER_ALIVE_COUNT_MAX
    },
    controlPath: REMOTE_CTX.controlPath,
    controlPathBytes: Buffer.byteLength(REMOTE_CTX.controlPath, 'utf8'),
    controlPathMaxBytes: CONTROL_PATH_MAX_BYTES,
    controlDirName: CONTROL_DIR_NAME,
    controlDirMode: CONTROL_DIR_MODE,
    controlLeaf: controlPathLeaf({ executionHash: base, uid: 501 }),
    controlLeafForOtherUid: controlPathLeaf({ executionHash: base, uid: 502 }),
    localRows,
    ledger: ledgerRows,
    // --- Phase 89, conditions 63 to 67 --------------------------------------
    armedResumeCallFiles,
    sendKeysLiteralFiles,
    armedResumeArgv: [...armedResumeArgv],
    armedResumeWrapCounts,
    forbiddenVerbs: [...VERBS_THIS_RUNG_REFUSES],
    serverOptions: optionRows,
    confOnlyOptions: confOnly,
    localReassertOrder: SERVER_OPTIONS.filter((row) => row.localReassert === true).map(
      (row) => row.name
    ),
    fromSettingsRows: SERVER_OPTIONS.filter((row) => row.fromSettings === true).map(
      (row) => row.name
    ),
    remoteVersions: remoteList,
    goldenFiles: golden.present,
    goldenManifest: golden.manifest,

    // --- Phase 70, conditions 19 to 24 -------------------------------------
    attachLocalRows,
    attachRemoteFile: attachRemotePlan.file,
    attachRemoteArgv: [...attachRemotePlan.argv],
    attachRemoteSshBin: REMOTE_CTX.sshBin,
    attachRemoteProgram: REMOTE_CTX.remoteTmuxPath,
    remoteCreateArgv,
    remoteCreateFormat: REMOTE_CREATE_FORMAT,
    remoteListFormat: REMOTE_LIST_FORMAT,
    remoteListFields: REMOTE_LIST_FIELDS,
    remoteListFreeForm: [
      '#{q:session_name}',
      '#{q:@gmux-project}',
      '#{q:session_path}',
      '#{q:@gmux-name}'
    ],
    // The one file allowed to name node-pty under src/main/machines/.
    ptyOwnerFile: 'src/main/machines/connection-test.ts',
    // The QUOTED name, so a line of prose naming the module in backticks is not
    // read as an import. What matters is which files load the binding, and a
    // module specifier is always quoted.
    machinePtyMentions: mentions(files, "'node-pty'"),
    machineAttachImports: mentions(files, "from '../attach"),
    attachFiles: attachFiles.map((f) => f.slice(repoRoot.length + 1)),
    attachPtyMentions: mentions(attachFiles, "'node-pty'"),
    attachPlanSource: readFileSync(
      join(repoRoot, 'src', 'main', 'attach', 'attach-plan.ts'),
      'utf8'
    )
      .split('\n')
      .filter((line) => /^\s*import\b/.test(line) || /^\s*}\s*from\s*'/.test(line))
      .map((line) => line.trim()),

    // --- Phase 71, condition 25 --------------------------------------------
    truthAt: AT,
    truthRows,
    truthEventKinds: [...MACHINE_EVENT_KINDS],
    // The one line of this module a reader has to trust is that it imports no
    // machinery. The checker asserts that from the source rather than from the
    // header sentence.
    truthImports: readFileSync(
      join(machinesDir, 'status-truth.ts'),
      'utf8'
    )
      .split('\n')
      .filter((line) => /^\s*import\b/.test(line) || /^\s*}\s*from\s*'/.test(line))
      .map((line) => line.trim()),

    // --- Phase 72, condition 26 --------------------------------------------
    gateRefusals: [...REMOTE_RESTORE_REFUSALS],
    gateRows,
    // The gate has to be decidable from its facts alone, for the same reason
    // the case table does: it is the file a reviewer reads to learn when Tortie
    // will start an agent on another computer.
    gateImports: readFileSync(join(machinesDir, 'restore-gate.ts'), 'utf8')
      .split('\n')
      .filter((line) => /^\s*import\b/.test(line) || /^\s*}\s*from\s*'/.test(line))
      .map((line) => line.trim()),

    // --- Phase 72, condition 27 --------------------------------------------
    matrixAppRows: matrixIdsIn(matrixAppSource),
    matrixSupervisorRows: matrixIdsIn(matrixSupervisorSource),
    // The mode name the supervisor launches, read from the app's dispatch, so a
    // matrix nothing can start fails here rather than at midnight.
    matrixModeRegistered: readFileSync(
      join(repoRoot, 'src', 'main', 'harness', 'index.ts'),
      'utf8'
    ).includes("smoke === 'remote-matrix'"),

    // --- Phase 84, conditions 46 to 48 -------------------------------------
    phase84: {
      // 46. The two lists `program-find` walks are read into a local name
      //     before any loop reads them, so rule 2 of the catalogue still holds
      //     and a hostile value still appears exactly once, in the quoted tail.
      programFind: (() => {
        const script = REMOTE_SCRIPTS.find((row) => row.id === 'program-find');
        if (script === undefined) return null;
        const text = script.text;
        return {
          params: script.params,
          mode: script.mode,
          bareLoops: [...text.matchAll(/for\s+\w+\s+in\s+\$[1-9]/g)].map(
            (hit) => hit[0]
          ),
          assignments: [
            { name: 'p', at: text.indexOf('p="$2"'), loopAt: text.indexOf('for d in $p') },
            { name: 'x', at: text.indexOf('x="$3"'), loopAt: text.indexOf('for d in $x') }
          ],
          redirects: [...text.matchAll(/>/g)].length,
          // PHASE 109 EXTENDED CONDITION 46: every execute test carries a
          // file test beside it, because a DIRECTORY with the execute bit
          // passed `[ -x ]` alone and reached the manifest row.
          fileTests: [
            ...text.matchAll(/\[ -f "\$d\/\$n" \] && \[ -x "\$d\/\$n" \]/g)
          ].length,
          executeTests: [...text.matchAll(/\[ -x "\$d\/\$n" \]/g)].length
        };
      })(),
      // 47. The set a person's safety is argued from, and the one name Phase 84
      //     measured and did not add to it.
      envAllowed: [...REMOTE_ENV_ALLOWED],
      envMeasuredAndRefused: REMOTE_ENV_MEASURED_AND_REFUSED,
      // 48. Tortie's own key for one machine, named on every command, and the
      //     option that is deliberately NOT set beside it.
      identity: (() => {
        const keyPath = keyPathFor(ID, KEY_USER_DATA);
        const argv = sshOptions({ ...REMOTE_CTX, identityFile: keyPath });
        const bare = sshOptions(REMOTE_CTX);
        return {
          keyDir: keyDirFor(KEY_USER_DATA),
          keyPath,
          argv,
          bareArgv: bare,
          named: argv.filter((one) => one.startsWith('IdentityFile=')),
          identitiesOnly: argv.filter((one) => one.includes('IdentitiesOnly'))
        };
      })()
    },

    // --- Phase 90.3, conditions 50 and 51 ----------------------------------
    // Both are pure. They read two compiled script texts and nothing else.
    phase903: {
      // 50. The containment line in `review-file`. From this phase the renderer
      //     chooses the path that reaches it, so the far side has to refuse a
      //     path that climbs out of the repository. Research 55 section 9.3 ran
      //     the old text with `../above.txt` and read a file above the root.
      reviewFile: (() => {
        const script = REMOTE_SCRIPTS.find((row) => row.id === 'review-file');
        if (script === undefined) return null;
        const lines = script.text.split('\n');
        return {
          params: script.params,
          mode: script.mode,
          guard: lines.find((line) => line.startsWith('case ')) ?? null,
          guardAt: lines.findIndex((line) => line.startsWith('case ')),
          firstUseAt: lines.findIndex((line) => line.includes('$2') && !line.startsWith('case '))
        };
      })(),
      // 51. The new read. It walks a tree, it prunes `.git`, and it names no
      //     git verb, so a repository's internals never cross the link.
      treeList: (() => {
        const script = REMOTE_SCRIPTS.find((row) => row.id === 'tree-list');
        if (script === undefined) return null;
        const text = script.text;
        return {
          params: script.params,
          mode: script.mode,
          prunesGit: text.includes('-name ".git" -prune'),
          walkers: [...text.matchAll(/find /g)].length,
          capped: text.includes('head -n "$3"'),
          depthFromCaller: text.includes('-maxdepth "$2"')
        };
      })()
    },

    // --- Phase 98, condition 52 --------------------------------------------
    // Pure. It reads one compiled script text and one compiled number. It
    // starts nothing, opens no file under the person's home and contacts no
    // machine.
    phase98: {
      repoSearch: (() => {
        const script = REMOTE_SCRIPTS.find((row) => row.id === 'repo-search');
        if (script === undefined) return null;
        const text = script.text;
        // The two branches are the two lines that pipe a file list into grep.
        // Everything the caps check is on those lines, so they are collected
        // whole rather than as booleans over the file.
        const branches = text
          .split('\n')
          .filter((line) => line.includes('xargs -0 grep'));
        return {
          params: script.params,
          mode: script.mode,
          gitVerbs: [
            ...new Set(
              [...text.matchAll(/git (?:--no-pager )?([a-z-]+)/g)].map(
                (hit) => hit[1] ?? ''
              )
            )
          ].sort(),
          branches: branches.length,
          branchesCapped: branches.filter((line) => line.includes('head -n "$4"'))
            .length,
          branchesClamped: branches.filter((line) =>
            line.includes('cut -c "1-$5"')
          ).length,
          byteCaps: [...text.matchAll(/head -c ([0-9]+)/g)].map((hit) =>
            Number(hit[1] ?? '0')
          ),
          // The number the script itself compares the bytes it read against, so
          // the gate can prove the far side answers about the SAME ceiling it
          // reads one byte past.
          cutTests: [...text.matchAll(/"\$n" -gt ([0-9]+)/g)].map((hit) =>
            Number(hit[1] ?? '0')
          ),
          // The answer carries three words rather than two, being the mode, the
          // cut answer and the body.
          answerWords: text.includes(
            "printf '__TORTIE_RUN__%s %s %s__TORTIE_RUN__"
          )
            ? 3
            : 2,
          declaredMaxBytes: REMOTE_SEARCH_MAX_BYTES,
          prunesGit: text.includes("-name '.git' -prune"),
          // Every grep command in the text, up to the next pipe or newline. The
          // pattern has to ride behind `-e` in each one, or a pattern beginning
          // with a dash would be read as a flag.
          grepCalls: [...text.matchAll(/grep [^\n|]*/g)].map((hit) => hit[0]),
          // The executable form of the refusal in research 57 section 2.1.
          namesAProgram: [
            /ripgrep/,
            /\brg\b/,
            /\bcurl\b/,
            /\bscp\b/,
            /\binstall\b/
          ]
            .filter((one) => one.test(text))
            .map((one) => one.source)
        };
      })()
    },

    // --- Phase 99, condition 53 --------------------------------------------
    // Pure. It reads one compiled script text and two compiled numbers. It
    // starts nothing, opens no file under the person's home and contacts no
    // machine.
    phase99: {
      repoFiles: (() => {
        const script = REMOTE_SCRIPTS.find((row) => row.id === 'repo-files');
        if (script === undefined) return null;
        const text = script.text;
        // The two branches are the two lines that assign the encoded list. Every
        // cap the gate checks is on those lines, so they are collected whole
        // rather than as booleans over the whole file.
        const branches = text
          .split('\n')
          .filter((line) => line.includes('o=$('));
        return {
          params: script.params,
          mode: script.mode,
          gitVerbs: [
            ...new Set(
              [...text.matchAll(/git (?:--no-pager )?([a-z-]+)/g)].map(
                (hit) => hit[1] ?? ''
              )
            )
          ].sort(),
          branches: branches.length,
          branchesCapped: branches.filter((line) => line.includes('head -n "$2"'))
            .length,
          byteCaps: [...text.matchAll(/head -c ([0-9]+)/g)].map((hit) =>
            Number(hit[1] ?? '0')
          ),
          // The number the script itself compares the bytes it read against, so
          // the gate can prove the far side answers about the SAME ceiling it
          // reads one byte past.
          cutTests: [...text.matchAll(/"\$n" -gt ([0-9]+)/g)].map((hit) =>
            Number(hit[1] ?? '0')
          ),
          // The answer carries three words rather than two, being the mode, the
          // cut answer and the body.
          answerWords: text.includes(
            "printf '__TORTIE_RUN__%s %s %s__TORTIE_RUN__"
          )
            ? 3
            : 2,
          declaredMaxBytes: REMOTE_FILE_LIST_MAX_BYTES,
          declaredMaxPaths: REMOTE_FILE_LIST_MAX,
          prunesGit: text.includes("-name '.git'") && text.includes('-prune'),
          prunesNodeModules:
            text.includes("-name 'node_modules'") && text.includes('-prune'),
          // The executable form of the refusal in research 57 section 2.1. The
          // same five names Phase 98 refuses, because a name list is a second
          // door and a second door with a weaker rule is no rule.
          namesAProgram: [
            /ripgrep/,
            /\brg\b/,
            /\bcurl\b/,
            /\bscp\b/,
            /\binstall\b/
          ]
            .filter((one) => one.test(text))
            .map((one) => one.source)
        };
      })(),
      // 53j. Phase 98 added `ls-files` and Phase 99 added nothing. The gate
      // asserts the list's own contents so a later round that widens it for
      // convenience fails here rather than in review.
      gitVerbsAcrossReads: [
        ...new Set(
          REMOTE_SCRIPTS.filter((row) => row.mode === 'read').flatMap((row) =>
            [...row.text.matchAll(/git (?:--no-pager )?([a-z-]+)/g)].map(
              (hit) => hit[1] ?? ''
            )
          )
        )
      ].sort()
    },

    // --- Phase 100, condition 54 -------------------------------------------
    // Pure. It composes one argv, reads one module's own source text and reads
    // four compiled numbers. It starts nothing, opens no file under the
    // person's home and contacts no machine.
    phase100: (() => {
      const linesPath = join(machinesDir, 'remote-lines.ts');
      let source = '';
      try {
        source = readFileSync(linesPath, 'utf8');
      } catch {
        source = '';
      }
      return {
        present: source.length > 0,
        // The argv this phase sends, at the deepest depth it offers and at the
        // screen alone. The gate holds both element by element.
        argvDeep: remoteCaptureArgs('$9', REMOTE_SESSION_LINES_MAX),
        argvScreen: remoteCaptureArgs('$9', 0),
        depths: [...REMOTE_SESSION_LINE_DEPTHS],
        defaultDepth: REMOTE_SESSION_LINES_DEFAULT,
        maxDepth: REMOTE_SESSION_LINES_MAX,
        maxBytes: REMOTE_SESSION_LINES_BYTES_MAX,
        // The executable form of the refusal in research 57 section 3.1. A
        // builder who needs either verb has designed a scrollbar, which this
        // phase refused rather than deferred. The two names are composed rather
        // than written, so this probe's own text does not trip the rule.
        namesAScrollVerb: [`copy${'-'}mode`, `send${'-'}keys`].filter((one) =>
          source.includes(one)
        ),
        // A read is not a capsule. The one name this module may take from the
        // saved output side is the control stripper.
        snapshotImports: [
          ...source.matchAll(
            /import\s+\{([^}]*)\}\s+from\s+'\.\.\/restore\/snapshots'/g
          )
        ].map((hit) => (hit[1] ?? '').replace(/\s+/g, '')),
        callsCapsuleStore: source.includes('storeCapsuleText('),
        // The one command this module sends, counted in its own text. A second
        // verb here would be a second thing a person's session can be asked.
        execCalls: [...source.matchAll(/execOn\(/g)].length,
        composerCalls: [...source.matchAll(/remoteCaptureArgs\(/g)].length
      };
    })(),

    // --- Phase 105, condition 55 -------------------------------------------
    // Pure. It reads one compiled script text, one composed command, one
    // module's own source text and one composed gh argv. It starts nothing,
    // opens no file under the person's home, contacts no machine and makes no
    // request.
    phase105: (() => {
      const runsPath = join(machinesDir, 'remote-runs.ts');
      let source = '';
      try {
        source = readFileSync(runsPath, 'utf8');
      } catch {
        source = '';
      }
      const script = REMOTE_SCRIPTS.find((row) => row.id === 'repo-facts');
      const text = script?.text ?? '';
      // The exact bytes the door would compose for a hostile folder value. The
      // gate searches these rather than the script alone, because the command is
      // what actually crosses.
      const command =
        script === undefined
          ? ''
          : composeRemoteScriptCommand(script, [HOSTILE_VALUE]);
      // The nine words a credential would travel in. They are composed from
      // pieces rather than written whole, so this probe's own text does not trip
      // the rule it is checking.
      const CREDENTIAL_WORDS = [
        `g${'h'}`,
        `GH${'_'}TOKEN`,
        `GITHUB${'_'}TOKEN`,
        `GH${'_'}HOST`,
        `Author${'i'}zation`,
        `hosts${'.'}yml`,
        `.config/g${'h'}`,
        `net${'r'}c`,
        `cu${'r'}l`
      ];
      // The gh argv this module composes, built from the same pure builder it
      // imports. `assertReadOnlyArgv` is asked here rather than trusted.
      const ghArgv = buildRunListForBranchArgv({
        ownerRepo: 'owner/repo',
        branch: 'main',
        limit: WATCH_LIMITS.RUN_LIMIT
      });
      let ghRefusal: string | null = null;
      try {
        assertReadOnlyArgv(ghArgv);
      } catch (err) {
        ghRefusal = (err as Error).message;
      }
      return {
        present: source.length > 0,
        script:
          script === undefined
            ? null
            : { mode: script.mode, params: script.params },
        gitVerbs: [
          ...new Set(
            [...text.matchAll(/git (?:--no-pager )?([a-z-]+)/g)].map(
              (hit) => hit[1] ?? ''
            )
          )
        ].sort(),
        // 55d and 55e. The executable form of "no credential and no gh crosses".
        credentialWordsInScript: CREDENTIAL_WORDS.filter((word) =>
          text.includes(word)
        ),
        credentialWordsInCommand: CREDENTIAL_WORDS.filter((word) =>
          command.includes(word)
        ),
        command,
        hostileInCommand: command.split(HOSTILE_VALUE).length - 1,
        hostileQuoted: command.includes(shellQuoteArgv([HOSTILE_VALUE])),
        hostileInScript: text.includes(HOSTILE_VALUE),
        // 55f. Research 57 section 9 defect 5, made executable.
        namesCommonDir: text.includes('--git-common-dir'),
        namesAbsoluteDir: text.includes(`--absolute${'-'}git-dir`),
        // 55g. What the module does, counted in its own text.
        remoteReads: [...source.matchAll(/runRemoteRead\(/g)].length,
        callsRemoteWrite: source.includes('runRemoteWrite'),
        // Every catalogue id this module names as a quoted string. It may name
        // exactly one.
        scriptIdsNamed: REMOTE_SCRIPTS.map((row) => row.id).filter((id) =>
          source.includes(`'${id}'`)
        ),
        // 55i. The one gh command line, and the allowlist's own verdict on it.
        ghArgv,
        ghRefusal
      };
    })(),

    // --- Phase 106, condition 56 -------------------------------------------
    // Pure. It reads one compiled script text, one composed command, one
    // compiled format constant and one module's own source text. It starts
    // nothing, opens no file under the person's home, contacts no machine and
    // makes no request.
    phase106: (() => {
      const branchPath = join(machinesDir, 'remote-branch.ts');
      let source = '';
      try {
        source = readFileSync(branchPath, 'utf8');
      } catch {
        source = '';
      }
      const script = REMOTE_SCRIPTS.find((row) => row.id === 'repo-branch');
      const text = script?.text ?? '';
      // The exact bytes the door would compose for a hostile folder value. The
      // gate searches these rather than the script alone, because the command is
      // what actually crosses.
      const command =
        script === undefined
          ? ''
          : composeRemoteScriptCommand(script, [HOSTILE_VALUE]);
      // 56d. The format the far side asks with, read out of the text rather
      // than written a second time here.
      const format = /--format='([^']*)'/.exec(text)?.[1] ?? '';
      // 56i. The three verbs that would make the sentence on screen false. They
      // are composed from pieces so this probe's own text does not trip the rule
      // it is checking.
      const FETCH_VERBS = [
        `git fe${'t'}ch`,
        `git pu${'l'}l`,
        `git remote up${'d'}ate`
      ];
      return {
        present: source.length > 0,
        script:
          script === undefined
            ? null
            : { mode: script.mode, params: script.params },
        gitVerbs: [
          ...new Set(
            [...text.matchAll(/git (?:--no-pager )?([a-z-]+)/g)].map(
              (hit) => hit[1] ?? ''
            )
          )
        ].sort(),
        // 56d. Two copies of one format is how one of them goes stale.
        format,
        formatPlusSubject: format + '%(subject)',
        branchFormat: BRANCH_FORMAT,
        // 56e. Research 57 section 9 defect 5, made executable a second time.
        namesCommonDir: text.includes('--git-common-dir'),
        namesAbsoluteDir: text.includes(`--absolute${'-'}git-dir`),
        // 56f. The bytes that actually cross, rather than the script alone.
        command,
        hostileInCommand: command.split(HOSTILE_VALUE).length - 1,
        hostileQuoted: command.includes(shellQuoteArgv([HOSTILE_VALUE])),
        hostileInScript: text.includes(HOSTILE_VALUE),
        // 56i. THE EXECUTABLE FORM OF A SENTENCE ON SCREEN. The panel tells a
        // person Tortie does not fetch on their machine.
        fetchVerbsInScript: FETCH_VERBS.filter((verb) => text.includes(verb)),
        // 56g and 56j. What the module does, counted in its own text.
        remoteReads: [...source.matchAll(/runRemoteRead\(/g)].length,
        callsRemoteWrite: source.includes('runRemoteWrite'),
        scriptIdsNamed: REMOTE_SCRIPTS.map((row) => row.id).filter((id) =>
          source.includes(`'${id}'`)
        ),
        actionsImports: [
          ...source.matchAll(/from '\.\.\/actions\/([a-z-]+)'/g)
        ].map((hit) => hit[1] ?? '')
      };
    })(),

    // --- Phase 107, condition 57 -------------------------------------------
    // Pure. It reads one compiled script text, one composed command, two
    // compiled constants and three modules' own source text. It starts nothing,
    // opens no file under the person's home, contacts no machine and makes no
    // request. Two of the three source files belong to the renderer, and they
    // are READ AS TEXT rather than imported, because importing a React module
    // here would pull a renderer into a probe that must stay pure.
    phase107: (() => {
      const historyPath = join(machinesDir, 'remote-history.ts');
      let source = '';
      try {
        source = readFileSync(historyPath, 'utf8');
      } catch {
        source = '';
      }
      const rendererScm = join(repoRoot, 'src', 'renderer', 'scm');
      const readText = (path: string): string => {
        try {
          return readFileSync(path, 'utf8');
        } catch {
          return '';
        }
      };
      // 57l and 57m. The renderer's own two files, read as text.
      const storeText = readText(join(rendererScm, 'remote-history.ts'));
      const panelText = readText(join(rendererScm, 'RemoteHistorySection.tsx'));
      const script = REMOTE_SCRIPTS.find((row) => row.id === 'repo-history');
      const text = script?.text ?? '';
      // The exact bytes the door would compose for a hostile folder value. The
      // gate searches these rather than the script alone, because the command
      // is what actually crosses.
      const command =
        script === undefined
          ? ''
          : composeRemoteScriptCommand(script, [HOSTILE_VALUE, '51']);
      // 57d. The format the far side asks with, read out of the text rather
      // than written a second time here.
      const format = /--format='([^']*)'/.exec(text)?.[1] ?? '';
      // 57g. The three verbs that would make a sentence on screen false. They
      // are composed from pieces so this probe's own text does not trip the
      // rule it is checking.
      const FETCH_VERBS = [
        `git fe${'t'}ch`,
        `git pu${'l'}l`,
        `git remote up${'d'}ate`
      ];
      // 57l. A timer would make this group read a machine nobody asked it to
      // read. Names are composed so this probe's own text does not trip it.
      const TIMERS = [
        `setInt${'e'}rval`,
        `setTim${'e'}out`,
        `requestAnimation${'F'}rame`
      ];
      return {
        present: source.length > 0,
        script:
          script === undefined
            ? null
            : { mode: script.mode, params: script.params },
        gitVerbs: [
          ...new Set(
            [...text.matchAll(/git (?:--no-pager )?([a-z-]+)/g)].map(
              (hit) => hit[1] ?? ''
            )
          )
        ].sort(),
        // 57d. Two copies of one format is how one of them goes stale.
        format,
        graphLogFormat: GRAPH_LOG_FORMAT,
        // 57e. Research 57 section 9 defect 5, made executable a third time.
        namesCommonDir: text.includes('--git-common-dir'),
        namesAbsoluteDir: text.includes(`--absolute${'-'}git-dir`),
        // 57f. The bytes that actually cross, rather than the script alone.
        command,
        hostileInCommand: command.split(HOSTILE_VALUE).length - 1,
        hostileQuoted: command.includes(shellQuoteArgv([HOSTILE_VALUE])),
        hostileInScript: text.includes(HOSTILE_VALUE),
        // 57g. IT NEVER FETCHES.
        fetchVerbsInScript: FETCH_VERBS.filter((verb) => text.includes(verb)),
        // 57h. THE EXECUTABLE FORM OF "NO REF NAME IS A VALUE". The walk names
        // its three ref classes and enumerates nothing, so nothing is piped and
        // no name crosses the link.
        walksBranches: text.includes('--branches'),
        walksTags: text.includes('--tags'),
        walksRemotes: text.includes('--remotes'),
        refusedWalkFlags: ['--stdin', '--all', 'refs/stash', 'refs/notes'].filter(
          (flag) => text.includes(flag)
        ),
        // 57i. What the module does, counted in its own text.
        remoteReads: [...source.matchAll(/runRemoteRead\(/g)].length,
        callsRemoteWrite: source.includes('runRemoteWrite'),
        scriptIdsNamed: REMOTE_SCRIPTS.map((row) => row.id).filter((id) =>
          source.includes(`'${id}'`)
        ),
        actionsImports: [
          ...source.matchAll(/from '\.\.\/actions\/([a-z-]+)'/g)
        ].map((hit) => hit[1] ?? ''),
        // 57i, THE GUARD THAT STAYED HOME. The header of remote-history.ts
        // says in prose that `sanitizeRefNames` is never called and never
        // crosses, so a raw count of the name would fail on the sentence that
        // explains it. What is counted here is CODE LINES that name it, with
        // comment lines dropped, which is the shape `namesSafeStorage` below
        // already uses for the same reason.
        sanitizeRefNamesLines:
          source.length === 0
            ? []
            : sourceLines(historyPath)
                .filter(
                  (row) =>
                    row.text.includes('sanitizeRefNames') &&
                    !/^(\*|\/\/|\/\*)/.test(row.text)
                )
                .map((row) => row.line),
        // 57j. THE EXECUTABLE FORM OF THE TIER STAYING AT 2.
        page: REMOTE_HISTORY_PAGE,
        ceiling: REMOTE_HISTORY_MAX_COMMITS,
        // 57l. No timer, anywhere in the renderer's store.
        storePresent: storeText.length > 0,
        storeTimers: TIMERS.filter((name) => storeText.includes(name)),
        // 57m. THE EXECUTABLE FORM OF THE PHASE 99 HONESTY GAP NOT REPEATING.
        panelPresent: panelText.length > 0,
        panelHonestyFields: ['hasMore', 'atCeiling', 'divergenceTruncated'].filter(
          (field) => panelText.includes(field)
        )
      };
    })(),

    // --- Phase 108, condition 58 -------------------------------------------
    // Pure. It reads one compiled script text, two compiled constants and four
    // modules' own source text. It starts nothing, opens no file under the
    // person's home, contacts no machine and makes no request. Two of the four
    // source files belong to the renderer, and they are READ AS TEXT rather
    // than imported, because importing a React module here would pull a
    // renderer into a probe that must stay pure. The driver and the recording
    // filesystem are read as text too, so loading them cannot start anything.
    phase108: (() => {
      const readText = (path: string): string => {
        try {
          return readFileSync(path, 'utf8');
        } catch {
          return '';
        }
      };
      const driverPath = join(machinesDir, 'remote-agent-context.ts');
      const driverText = readText(driverPath);
      const recordingText = readText(
        join(repoRoot, 'src', 'main', 'context', 'recording-fs.ts')
      );
      const rendererContext = join(repoRoot, 'src', 'renderer', 'context');
      const storeText = readText(join(rendererContext, 'store.ts'));
      const viewText = readText(join(rendererContext, 'ContextView.tsx'));
      const script = REMOTE_SCRIPTS.find((row) => row.id === 'context-read');
      const text = script?.text ?? '';
      const facts = REMOTE_SCRIPTS.find((row) => row.id === 'machine-facts');
      const factsText = facts?.text ?? '';
      // 58e. A timer would make the panel read a machine nobody asked it to
      // read. Names are composed so this probe's own text does not trip it.
      const TIMERS = [
        `setInt${'e'}rval`,
        `setTim${'e'}out`,
        `requestAnimation${'F'}rame`
      ];
      // 58g. The caps the driver declares, read out of its text rather than by
      // importing it, because the driver imports the door and the door's
      // world. A constant read as text is still the shipped number: the
      // regexes anchor on the export statements.
      const constOf = (name: string): number | null => {
        const hit = new RegExp(
          `export const ${name} = ([0-9_]+);`
        ).exec(driverText);
        return hit?.[1] === undefined
          ? null
          : Number(hit[1].replaceAll('_', ''));
      };
      return {
        script:
          script === undefined
            ? null
            : { mode: script.mode, params: script.params },
        // 58c. Context is not a git question.
        gitVerbs: [
          ...new Set(
            [...text.matchAll(/git (?:--no-pager )?([a-z-]+)/g)].map(
              (hit) => hit[1] ?? ''
            )
          )
        ].sort(),
        // 58b. The row's own shape: both lists read into local names, split
        // under IFS, and the only redirection is 2>/dev/null (the generic
        // conditions already assert the redirection rule for every read).
        readsListsIntoLocals:
          text.includes('el="$1"') &&
          text.includes('dp="$2"') &&
          text.includes('rl="$3"'),
        splitsUnderIfs: text.includes("IFS='\n'"),
        marker: text.split(REMOTE_SCRIPT_MARKER).length - 1,
        // 58f. The three environment names Phase 108 added to machine-facts.
        machineFactsPrints: [
          'claude_config_dir',
          'xdg_config_home',
          'xdg_state_home'
        ].filter((name) => factsText.includes(`${name}=%s`)),
        // 58g. The caps.
        listMax: CONTEXT_READ_LIST_MAX_BYTES,
        fileMax: CONTEXT_READ_FILE_MAX_BYTES,
        headCapLiteral: (() => {
          const hit = /head -c (\d+)/.exec(text);
          return hit?.[1] === undefined ? null : Number(hit[1]);
        })(),
        maxPasses: constOf('CONTEXT_READ_MAX_PASSES'),
        enumDepth: constOf('CONTEXT_ENUM_DEPTH'),
        answerBudget: constOf('CONTEXT_ANSWER_BUDGET_BYTES'),
        // 58d. NO SECOND TABLE. The driver reuses scanContext whole, imports
        // nothing from agent-context, reads no disk of its own and declares no
        // location table. The recording filesystem imports nothing from the
        // machines domain, so the remote path cannot learn an agent's rules
        // anywhere but the one file the matrix gate reads.
        driverPresent: driverText.length > 0,
        driverImports: importSpecifiers(driverPath),
        driverImportsScan: driverText.includes("from '../context/scan'"),
        driverNamesAtTable: driverText.includes("at: '"),
        recordingPresent: recordingText.length > 0,
        recordingImports: [
          ...recordingText.matchAll(/from '([^']+)'/g)
        ].map((hit) => hit[1] ?? ''),
        // 58e. No timer, in main or in the renderer store.
        driverTimers: TIMERS.filter((name) => driverText.includes(name)),
        storePresent: storeText.length > 0,
        storeTimers: TIMERS.filter((name) => storeText.includes(name)),
        // 58h. The remote note lines are real, so a remote list cannot draw as
        // a local one and a cut list cannot draw as a whole one.
        viewPresent: viewText.length > 0,
        viewHonestyNames: [
          'contextOnMachineLine',
          'CONTEXT_NESTED_NOT_LISTED',
          'contextCutLine'
        ].filter((name) => viewText.includes(name))
      };
    })(),

    // --- Phase 109, condition 59 -------------------------------------------
    // Pure. It reads one compiled script text and nothing else. `agents-find`
    // is the batched form of `program-find`, so it is held to condition 46's
    // shape: mode read, three values, every list read into a local name and
    // split under IFS, no bare positional loop, no redirection, and the file
    // test beside every execute test from birth.
    phase109: (() => {
      const script = REMOTE_SCRIPTS.find((row) => row.id === 'agents-find');
      if (script === undefined) return { agentsFind: null };
      const text = script.text;
      return {
        agentsFind: {
          params: script.params,
          mode: script.mode,
          bareLoops: [...text.matchAll(/for\s+\w+\s+in\s+\$[1-9]/g)].map(
            (hit) => hit[0]
          ),
          assignments: [
            { name: 'p', at: text.indexOf('p="$1"'), loopAt: text.indexOf('for d in $p') },
            { name: 'x', at: text.indexOf('x="$2"'), loopAt: text.indexOf('for d in $x') },
            { name: 'r', at: text.indexOf('r="$3"'), loopAt: text.indexOf('for line in $r') }
          ],
          redirects: [...text.matchAll(/>/g)].length,
          splitsFoldersUnderIfs: text.includes('IFS=:'),
          splitsRecordsUnderIfs: text.includes("IFS='\n'"),
          fileTests: [
            ...text.matchAll(/\[ -f "\$d\/\$n" \] && \[ -x "\$d\/\$n" \]/g)
          ].length,
          executeTests: [...text.matchAll(/\[ -x "\$d\/\$n" \]/g)].length,
          namesUnreadable: text.includes('unreadable')
        }
      };
    })(),

    // --- Phase 73, conditions 35 to 40 -------------------------------------
    remoteRun: {
      marker: REMOTE_SCRIPT_MARKER,
      maxBytes: REMOTE_SCRIPT_MAX_BYTES,
      scripts: scriptRows,
      writers: REMOTE_SCRIPTS.filter((script) => script.mode === 'write').map(
        (script) => script.id
      ),
      biggestImageCommand,
      imageMaxBytes: REMOTE_IMAGE_MAX_BYTES,
      // The two copies of one sentence, being main's and the renderer's. Main
      // refuses the upload and the renderer refuses the drop, neither may
      // import the other, and this gate is what keeps them one sentence.
      dropCopyMain: MAIN_DROP_COPY,
      dropCopyRenderer: rendererDropCopy,
      // The import graph. `remote-run.ts` rides on `execRemoteShell`, and
      // nothing that `execRemoteShell` itself depends on may ride back.
      runImports: importSpecifiers(runPath),
      scriptsImports: importSpecifiers(scriptsPath),
      importersOfRun: files
        .filter((file) =>
          readFileSync(file, 'utf8').includes("from './remote-run'")
        )
        .map((file) => file.slice(machinesDir.length + 1)),
      shellCallers: files
        .filter((file) =>
          readFileSync(file, 'utf8').includes('execRemoteShell(')
        )
        .map((file) => file.slice(machinesDir.length + 1))
    },

    // --- Phase 117, conditions 69 to 73 ------------------------------------
    //
    // The create confirmation, the one writer of the unknown status, the
    // seventh restore arm, the read that does not name the variable, and the
    // seed. Everything here is decided in this process: no command runs, no
    // machine is asked anything and no file is opened except to be read as
    // text.
    phase117: (() => {
      const sessionsPath = join(machinesDir, 'remote-sessions.ts');
      const recordPath = join(machinesDir, 'remote-record.ts');
      const confirmPath = join(machinesDir, 'create-confirmation.ts');
      const rescuePath = join(machinesDir, 'pane-env-rescue.ts');
      const isCode = (text: string) => !/^(\*|\/\/|\/\*)/.test(text);
      const codeHits = (file: string, needle: string) =>
        sourceLines(file)
          .filter((row) => row.text.includes(needle) && isCode(row.text))
          .map((row) => ({
            file: file.slice(repoRoot.length + 1),
            line: row.line,
            text: row.text
          }));
      const everywhere = (needle: string) =>
        files.flatMap((file) => codeHits(file, needle));

      // Condition 69. One disposition per kind, driven rather than read.
      const samples: RemoteCreateConfirmation[] = [
        { kind: 'present', tmuxId: '$7' },
        { kind: 'provenAbsent', why: 'tmux named the session as missing' },
        { kind: 'unreachable', why: 'the machine did not answer' }
      ];

      // Condition 71 and the classifier. Every row of the table in
      // `create-confirmation.ts`, driven with the shape it names.
      const failures = [
        {
          name: 'tmux holds no server at all',
          answer: classifyConfirmationFailure(
            gmuxError('TMUX_UNREACHABLE', 'no answer', 'no server running on /tmp/x')
          )
        },
        {
          name: 'tmux named the session as missing',
          answer: classifyConfirmationFailure(
            new Error("can't find session: p117-lost")
          )
        },
        {
          // MEASURED 2026-08-20 on tmux 3.6a from /opt/homebrew/bin/tmux, on a
          // scratch socket with one real session on it:
          //   show-environment -t '=p117-absent-1'
          //     exit 1, stderr "no such session: =p117-absent-1"
          // That is the sentence this verb prints on the version Tortie ships
          // against, and it is neither of the two the table used to name. A
          // classifier that misses it answers `unreachable` for a machine that
          // answered, so a create the machine refused keeps a row for ever.
          name: 'tmux said there is no such session',
          answer: classifyConfirmationFailure(
            new Error('no such session: =p117-lost-9')
          )
        },
        {
          name: 'the session was not found',
          answer: classifyConfirmationFailure(
            gmuxError('SESSION_NOT_FOUND', 'gone', 'session not found')
          )
        },
        {
          name: 'the machine could not be reached',
          answer: classifyConfirmationFailure(
            gmuxError('TMUX_UNREACHABLE', 'no answer', 'connection refused')
          )
        },
        {
          name: 'the machine refused the caller',
          answer: classifyConfirmationFailure(
            gmuxError('INVALID_INPUT', 'refused', 'host-key-changed')
          )
        },
        {
          name: 'this Mac has no sign in program',
          answer: classifyConfirmationFailure(
            gmuxError('TMUX_NOT_FOUND', 'no ssh', 'no ssh on this Mac')
          )
        },
        {
          name: 'the read timed out',
          answer: classifyConfirmationFailure(new Error('ETIMEDOUT'))
        },
        {
          name: 'an answer nobody can read',
          answer: classifyConfirmationFailure(new Error('something else'))
        },
        {
          name: 'a thrown value that is not an error at all',
          answer: classifyConfirmationFailure('a string')
        }
      ];

      // Condition 73. The seed, driven against this process's own map. The map
      // is emptied before and after, so this leaves nothing behind.
      const seed = (() => {
        resetRescueForTests();
        const live = {
          id: 'live',
          machineId: 'studio',
          name: 'the name this run sent',
          agent: 'shell',
          projectPath: '/p',
          cwd: '/p',
          issuedAt: 1
        };
        noteIssuedRemoteId(live);
        const added = seedIssuedRemoteIds([
          { ...live, name: 'the name a past run recorded' },
          { ...live, id: 'past', issuedAt: 2 },
          { ...live, id: 'here', machineId: 'local', issuedAt: 3 },
          { ...live, id: '', issuedAt: 4 },
          { ...live, id: 'nameless', machineId: '', issuedAt: 5 }
        ]);
        const out = {
          added,
          liveName:
            issuedRemoteIdsFor('studio').find((one) => one.id === 'live')?.name ??
            '',
          pastHeld: issuedRemoteIdHeld('past'),
          localHeld: issuedRemoteIdHeld('here'),
          emptyHeld: issuedRemoteIdHeld(''),
          namelessHeld: issuedRemoteIdHeld('nameless'),
          onStudio: issuedRemoteIdsFor('studio')
            .map((one) => one.id)
            .sort(),
          onLocal: issuedRemoteIdsFor('local').map((one) => one.id)
        };
        resetRescueForTests();
        return out;
      })();

      return {
        kinds: [...CONFIRMATION_KINDS],
        dispositions: samples.map((one) => ({
          kind: one.kind,
          disposition: confirmationDisposition(one)
        })),
        // Condition 72. The read as it is sent. The variable is not on the line,
        // and the whole call as the exec plane quotes it, because an exact match
        // target that reaches a login shell bare never reaches tmux at all.
        argv: confirmationArgs('p117-lost-9'),
        quotedCall: shellQuoteArgv(confirmationArgs('p117-lost-9')),
        // The environment read, both directions.
        environment: [
          {
            name: 'this create own id is on a line of its own',
            answer: readConfirmationEnvironment(
              'TERM=xterm\nGMUX_SESSION_ID=abc123\nGMUX_MANAGED=1',
              'abc123'
            )
          },
          {
            name: 'a session of the same name carrying somebody else id',
            answer: readConfirmationEnvironment(
              'GMUX_SESSION_ID=somebody-else',
              'abc123'
            )
          },
          {
            name: 'an environment with nothing of ours in it',
            answer: readConfirmationEnvironment('TERM=xterm\nSHELL=/bin/sh', 'abc123')
          },
          {
            name: 'an empty answer',
            answer: readConfirmationEnvironment('', 'abc123')
          }
        ],
        failures,
        // Condition 69. Who may delete a durable row on the create path.
        dropCallers: codeHits(sessionsPath, 'dropRemoteRow(').filter(
          (row) => !row.text.startsWith('function ')
        ),
        dropNamedElsewhere: files
          .filter(
            (file) =>
              file !== sessionsPath &&
              readFileSync(file, 'utf8').includes('dropRemoteRow')
          )
          .map((file) => file.slice(repoRoot.length + 1)),
        // Condition 70. The one writer of the unknown status.
        unknownWriters: everywhere("setStatus(sessionId, 'unknown')"),
        markCallers: everywhere('markRemoteCreateUnconfirmed(').filter(
          (row) => !row.text.startsWith('export function ')
        ),
        markDefinedIn: codeHits(recordPath, 'export function markRemoteCreateUnconfirmed')
          .length,
        readerDefinedIn: codeHits(recordPath, 'export function unconfirmedRemoteRecords')
          .length,
        // The create's own arm, read as text so the two writes cannot come apart.
        createArmMarks: readFileSync(sessionsPath, 'utf8').includes(
          'markRemoteCreateUnconfirmed(sessionId)'
        ),
        createArmThrows: readFileSync(sessionsPath, 'utf8').includes(
          'CREATE_ANSWER_LOST'
        ),
        // Condition 73. The seed, and the file it lives in.
        seed,
        seedDefinedIn: codeHits(rescuePath, 'export function seedIssuedRemoteIds')
          .length,
        heldDefinedIn: codeHits(rescuePath, 'export function issuedRemoteIdHeld')
          .length,
        // The confirmation module may reason from nothing but what it is given.
        confirmImports: importSpecifiers(confirmPath)
      };
    })(),

    // --- Phase 118, conditions 74 to 78 ------------------------------------
    //
    // Who may spawn a long running child on another machine, who owns it, and
    // where the order of a removal lives. Every answer is read off the source,
    // and nothing here spawns, opens or connects to anything.
    phase118: (() => {
      const ledgerPath = join(machinesDir, 'execution-ledger.ts');
      const removalPath = join(machinesDir, 'removal.ts');
      const recordPath = join(machinesDir, 'remote-record.ts');
      const journalPath = join(
        repoRoot,
        'src',
        'main',
        'manifest',
        'remote-executions.ts'
      );
      const isCode = (text: string) => !/^(\*|\/\/|\/\*)/.test(text);
      const codeHits = (file: string, needle: string) =>
        sourceLines(file)
          .filter((row) => row.text.includes(needle) && isCode(row.text))
          .map((row) => ({
            file: file.slice(repoRoot.length + 1),
            line: row.line,
            text: row.text
          }));

      /**
       * Every quoted member of one `as const` array, read from its source.
       *
       * The doc comments between the members are stripped first, because an
       * apostrophe inside one of them would otherwise be read as a member.
       */
      const membersOf = (source: string, name: string): string[] => {
        const from = source.indexOf(`${name} = [`);
        if (from < 0) return [];
        const to = source.indexOf('] as const', from);
        if (to < 0) return [];
        const body = source
          .slice(from, to)
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\/\/[^\n]*/g, '');
        return [...body.matchAll(/'([^']+)'/g)].map((hit) => hit[1] ?? '');
      };
      const journalSource = readFileSync(journalPath, 'utf8');

      /** The body of one exported function, to its closing brace at column 0. */
      const bodyOf = (source: string, signature: string): string => {
        const from = source.indexOf(signature);
        if (from < 0) return '';
        const end = source.indexOf('\n}', from);
        return end < 0 ? source.slice(from) : source.slice(from, end + 2);
      };
      const recordSource = readFileSync(recordPath, 'utf8');

      return {
        // Condition 74. Two spawn sites, and they are both in the exec plane.
        spawnSites: files.flatMap((file) => codeHits(file, 'execFileP(')),
        // Condition 75. The ledger signals a pid and never a process group.
        // Read from CODE lines only. The header explains at length why the
        // group is wrong here, and a prose mention is the opposite of a defect.
        ledgerImports: importSpecifiers(ledgerPath),
        ledgerKillsGroup: codeHits(ledgerPath, 'killProcessGroup'),
        // Condition 76. The boot edge is one way, so no cycle is added.
        ledgerNamesRemoteRecord: codeHits(ledgerPath, './remote-record'),
        // Condition 77. The order of a removal lives in one file.
        removeRowCallers: files
          .filter((file) => file !== join(machinesDir, 'store.ts'))
          .flatMap((file) => codeHits(file, 'removeMachineRow('))
          .filter((row) => !row.text.startsWith('export function ')),
        tombstoneCallers: files
          .flatMap((file) => codeHits(file, 'tombstoneRemoteRows('))
          .filter((row) => !row.text.startsWith('export function ')),
        removalDefines: codeHits(
          removalPath,
          'export function removeMachineCompletely'
        ).length,
        // Condition 78. A per row failure can never be swallowed again.
        tombstoneBody: bodyOf(
          recordSource,
          'export function tombstoneRemoteRows('
        ),
        // The boundary, read off the code rather than off a document.
        kinds: membersOf(journalSource, 'REMOTE_EXECUTION_KINDS'),
        outcomes: membersOf(journalSource, 'REMOTE_EXECUTION_OUTCOMES'),
        journaled: (() => {
          const hit = /JOURNALED_REMOTE_EXECUTION_KIND: RemoteExecutionKind =\s*'([^']+)'/.exec(
            journalSource
          );
          return hit?.[1] ?? '';
        })()
      };
    })(),

    // --- Phase 79.1, conditions 28 to 34 -----------------------------------
    keyInstall: {
      id: ID,
      algorithm: MACHINE_KEY_HASH_ALGORITHM,
      base: keyBase,
      sameAgain: keyInstallHash(ID, { ...KEY_FACTS }),
      fields: keyFieldRows,
      canonical: keyCanonical,
      // The machine execution hash and the install hash are two agreements over
      // two different sets of facts, so they may never be one value.
      machineHash: base,
      // The remote file path is a compiled constant rather than a field a caller
      // passes, so the executable form of "the hash moves for it" is that the
      // canonical text carries it.
      remoteFilePath: REMOTE_AUTHORIZED_KEYS_DISPLAY,
      canonicalCarriesRemotePath: keyCanonical.includes(REMOTE_AUTHORIZED_KEYS_DISPLAY),
      canonicalCarriesLocalKeyPath: keyCanonical.includes(KEY_FACTS.localKeyPath),
      canonicalCarriesPrefix: keyCanonical.includes(`"${MACHINE_CONFIRM_ID_PREFIX}${ID}"`),
      // `remoteTmuxPath` is deliberately not in this hash. A machine that has
      // never authenticated has no program path, and that is the exact machine
      // this surface exists for.
      canonicalCarriesProgramPath: keyCanonical.includes('/usr/bin/tmux'),
      canonicalCarriesLabel: keyCanonical.includes('Pop OS') || keyCanonical.includes('label'),
      canonicalCarriesColor: keyCanonical.includes('blue') || keyCanonical.includes('color'),
      argv: keyInstallArgv,
      command: keyInstallCommand,
      commandRecomposed: keyInstallCommandRecomposed,
      commandEndsWithQuotedKey: keyInstallCommand.endsWith(
        shellQuoteArgv([PUBLIC_KEY_LINE])
      ),
      commandKeyOccurrences: keyInstallCommand.split(PUBLIC_KEY_LINE).length - 1,
      script: AUTHORIZED_KEYS_SCRIPT,
      scriptCarriesKey: AUTHORIZED_KEYS_SCRIPT.includes(PUBLIC_KEY_LINE),
      publicKeyLine: PUBLIC_KEY_LINE,
      hostileLines: hostileKeyRows,
      keyDir: machineKeyDir(KEY_USER_DATA),
      recordDir: keyRecordDir,
      hostilePaths: hostileKeyPaths,
      materialSource: sourceLines(keyMaterialPath),
      imports: {
        'key-material.ts': importSpecifiers(keyMaterialPath),
        'key-install.ts': importSpecifiers(keyInstallPath),
        'connection-test.ts': importSpecifiers(connectionTestPath)
      },
      namesSafeStorage: [keyMaterialPath, keyInstallPath, connectionTestPath]
        .map((file) => ({
          file: file.slice(repoRoot.length + 1),
          hits: sourceLines(file).filter(
            (row) => row.text.includes('safeStorage') && !/^(\*|\/\/|\/\*)/.test(row.text)
          )
        }))
        .filter((row) => row.hits.length > 0)
        .map((row) => row.file)
    }
  })
);

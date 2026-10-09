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
 * PHASE 100 ADDED ONE MODULE LOAD, `remote-capsule.ts`, for a read Phase
 * 320.2 deleted, and the load went with it.
 *
 * PHASE 336 ADDED ONE WRITE, said here because the paragraph above says this
 * probe writes nothing. Condition 119 drives the SHIPPING `writeGuarded`, the
 * local guarded save, once with a remote project row and once with a local one
 * naming the same folder, and that folder is a scratch directory under the
 * system temporary directory made and removed by the block itself. It still
 * spawns nothing, and the two write doors condition 114 drives are refused
 * before anything is composed, over a context no machine answers.
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

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  MACHINE_EXECUTION_FIELDS,
  MACHINE_PRESENTATION_FIELDS
} from '../src/shared/machines';
import {
  MACHINE_CONFIRM_ID_PREFIX,
  MACHINE_WRITE_HONESTY,
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
  remoteCreateArgs,
  // Phase 270, condition 90. The slot the create composes must never appear in
  // an argv that is not a create, and the list is the argv every reconcile
  // sends.
  remoteListArgs
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
import { GmuxError as GmuxErrorHere, gmuxError } from '../src/main/errors';
import { serverProbeVerdict } from '../src/main/tmux/errors';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const machinesDir = join(repoRoot, 'src', 'main', 'machines');

/**
 * The machines contract as ONE piece of text.
 *
 * Phase 125 split src/shared/ipc/machines.ts into nine domain files under
 * src/shared/ipc/machines/ (eight since Phase 320.2) and left the file itself
 * as the barrel, so a condition that reads a member of the contract now reads
 * the barrel plus the eight. Three conditions below did their own single-file read, and this is
 * that read written once. It changes what is scanned and no condition.
 */
function machinesContractSource(): string {
  const barrel = join(repoRoot, 'src', 'shared', 'ipc', 'machines.ts');
  const dir = join(repoRoot, 'src', 'shared', 'ipc', 'machines');
  const parts = [readFileSync(barrel, 'utf8')];
  for (const name of readdirSync(dir).sort()) {
    if (name.endsWith('.ts')) parts.push(readFileSync(join(dir, name), 'utf8'));
  }
  return parts.join('\n');
}

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
 *
 * Phase 101 added `writeRoot` by the same route and for the same reason. It
 * gets its own block too, and condition 79 reads that one.
 */
const APPENDED_EXECUTION_FIELDS = ['acceptedTmuxVersion', 'writeRoot'];

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

/**
 * The key set the hash covers for a row carrying EVERY execution bearing field
 * (Phase 101, condition 7).
 *
 * It was read from a row carrying the first five until Phase 101, which added a
 * sixth by the same appended route. A row missing one appended field reports a
 * key set that is short by that field, and condition 7 would then read "the
 * hash does not cover writeRoot" and fail on a property that is not true.
 */
const EVERYTHING: MachineExecutionFields = {
  ...BASE,
  acceptedTmuxVersion: '3.9a',
  writeRoot: '/Users/gdc'
};
const hashedKeysEverything = (
  JSON.parse(
    canonicalMachineText(ID, EVERYTHING).split('\n')[1] ?? '[]'
  ) as [string, unknown][]
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
 * Everything condition 79 needs about the sixth field (Phase 101).
 *
 * It mirrors the eight questions the `acceptedVersion` block above feeds, and
 * it adds one that block has no equivalent of: a row whose `host` moved while a
 * write root is set must still carry that root in its canonical text. That is
 * the second ruling of the phase, being that a write root SURVIVES an ordinary
 * re-confirm, made checkable rather than remembered.
 */
const WRITE_ROOT: MachineExecutionFields = { ...BASE, writeRoot: '/Users/gdc' };
const canonicalWriteRoot = canonicalMachineText(ID, WRITE_ROOT);
const writeRootFacts = {
  unset: base,
  set: machineExecutionHash(ID, WRITE_ROOT),
  setOther: machineExecutionHash(ID, { ...BASE, writeRoot: '/Users/gdc/code' }),
  backToUnset: machineExecutionHash(ID, { ...WRITE_ROOT, writeRoot: null }),
  unsetCanonicalCarriesKey: canonical.includes('writeRoot'),
  canonicalCarriesRoot: canonicalWriteRoot.includes('/Users/gdc'),
  sheetLines: [...describeMachine(ID, WRITE_ROOT).lines],
  appendedFields: APPENDED_EXECUTION_FIELDS,
  // The second ruling. The host moved, the hash moved with it, and the root is
  // still in the text a person is asked to agree to.
  movedHostCanonical: canonicalMachineText(ID, {
    ...WRITE_ROOT,
    host: 'attic.tail1a2b.ts.net'
  }),
  // The honesty paragraph. Answered by main, on every sheet, and in neither
  // `lines` nor the canonical text.
  honestyWhenSet: describeMachine(ID, WRITE_ROOT).writeHonesty,
  honestyWhenUnset: describeMachine(ID, BASE).writeHonesty,
  honestyText: MACHINE_WRITE_HONESTY,
  honestyInLines: describeMachine(ID, WRITE_ROOT)
    .lines.join('\n')
    .includes(MACHINE_WRITE_HONESTY),
  honestyInCanonical: canonicalWriteRoot.includes(MACHINE_WRITE_HONESTY)
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
  // Phase 324. The note itself, so condition 100e reads the imported value
  // rather than re-parsing a string built with `+` across lines.
  note: row.note,
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
  CONTEXT_READ_FILE_MAX_BYTES,
  // Phase 234, condition 87. The three ceilings the two Architecture reads
  // carry, read here so the gate can compare each against the literal inside
  // the script text it belongs to.
  ARCH_GIT_MAX_BYTES,
  ARCH_READ_FILE_MAX_BYTES,
  ARCH_READ_LIST_MAX_BYTES
} = await import('../src/main/machines/remote-scripts');
// Phase 234, condition 87. The five argv composers the Architecture checkers
// use on THIS Mac, so the gate can read the same five command lines out of the
// far side script's own text and fail when one drifts. Loading this module
// spawns nothing: every function in it composes a frozen array of compiled in
// words and the guard refuses anything else.
const {
  ARCH_GIT_CALL_KINDS,
  catFileBatchCall,
  logNameOnlyCall,
  lsFilesCall,
  revParseHeadCall,
  statusPorcelainCall
} = await import('../src/main/arch/argv-guard');
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
  // Phase 107, condition 57j. The page and the ceiling, being the two numbers
  // that keep one history answer under about 162,000 bytes and keep this phase
  // at tier 2. Both are compiled constants.
  REMOTE_HISTORY_PAGE,
  REMOTE_HISTORY_MAX_COMMITS
} = await import('../src/shared/ipc');
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

// --- Phase 270, conditions 89 to 98 ----------------------------------------
//
// The two modules Phase 270 adds under `src/main/machines/` are loaded ONLY
// IF THEY ARE THERE, so a tree where one half of the phase has landed and the
// other has not fails with a sentence naming the missing file rather than with
// a module resolution stack trace forty frames deep. A MISSING MODULE IS A
// FAILURE in the checker and never a skip: a gate that quietly passes when its
// subject is absent is not a gate.
//
// Both are pure. They compose strings and parse an answer. NOTHING IS SPAWNED,
// no machine is contacted, no shell is started on either side and no file under
// the person's home is read. `remoteEnvNamesFor` reads the settings door and
// guards that read, so this gate contributes no names rather than throwing when
// there is no Electron behind it.
const p270File = (file: string): string =>
  join(repoRoot, 'src', 'main', 'machines', `${file}.ts`);
const p270Load = async (file: string): Promise<Record<string, unknown> | null> =>
  existsSync(p270File(file))
    ? ((await import(pathToFileURL(p270File(file)).href)) as Record<
        string,
        unknown
      >)
    : null;
const p270Carriage = await p270Load('remote-env-carriage');
const p270Probe = await p270Load('remote-env-probe');

/**
 * CONDITION 98's HALF THAT USED TO BE A STRING PIN. Does the `env-unresolved`
 * notice this file raises carry the names the far machine said it did not have?
 *
 * WHY IT IS DERIVED. Until Phase 275 this was `code.includes('names:
 * envProbe.missing')`, and it went red on a change that made the notice say
 * MORE rather than less: both remote paths now pass `names: envMissing`, where
 * `envMissing` is the probe's own `missing` unioned with the names this rung's
 * cap refused to carry. A name past `REMOTE_ENV_NAMES_MAX` never reaches
 * `probeRemoteEnvNames` at all, so `envProbe.missing` cannot know about it —
 * the pin was guarding a spelling, and the property underneath it is that the
 * probe's answer is what the person is told.
 *
 * So the expression after `names:` inside the notice object is read, and it
 * answers yes when that expression names `.missing` itself, or when it is a
 * single local whose own initializer does. A literal, or a list assembled from
 * something that is not the probe, still answers no — which is what condition
 * 98 was always really asking.
 *
 * `code` arrives with comments already stripped by the caller, so a paragraph
 * naming `envProbe.missing` cannot answer a question about what the code does.
 */
function noticeNamesTheMissing(code: string): boolean {
  const notice = /kind:\s*'env-unresolved'[\s\S]{0,600}?\bnames:\s*([^\n]+)/.exec(
    code
  );
  if (notice === null) return false;
  const expr = (notice[1] ?? '').replace(/,\s*$/, '').trim();
  if (/\.missing\b/.test(expr)) return true;
  const local = /^[A-Za-z_$][\w$]*$/.exec(expr);
  if (local === null) return false;
  const decl = new RegExp(
    `\\b(?:const|let|var)\\s+${expr}\\b[^=]*=([\\s\\S]{0,400}?);`
  ).exec(code);
  return decl !== null && /\.missing\b/.test(decl[1] ?? '');
}

/**
 * PHASE 200, THE MIXED LOADER ARM. A SECOND COPY of `src/main/errors`, loaded
 * under a URL of its own so its `GmuxError` is a DIFFERENT CONSTRUCTOR from the
 * one this file imported at the top. That is exactly the shape the 0.98.0 audit
 * met: the value and the classifier came from two loaders, `err instanceof
 * GmuxError` answered no before the code or the detail could be read, and the
 * one completed answer that is allowed to delete a durable row read instead as
 * "nobody could read an answer". The safety default held and the positive path
 * was gone.
 *
 * It is the only place in this gate where the two sides are provably not the
 * same class, so condition 71a below REFUSES TO PASS if they turn out to be.
 * An arm that cannot fail proves nothing.
 *
 * It loads a module and does nothing else. No command runs, nothing is spawned,
 * no machine is asked anything and no file is opened for writing.
 */
const secondLoaderErrors = (await import(
  `${pathToFileURL(join(repoRoot, 'src', 'main', 'errors.ts')).href}?phase200-second-loader=1`
)) as typeof import('../src/main/errors');

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

/**
 * The spans of one script that hand a SECOND shell a program to run (Phase 270).
 *
 * `env-names` asks the far machine's own LOGIN shell which variables it has,
 * because the shell ssh gives a command is not a login shell and never reads
 * that person's rc files. The only way to write that is
 * `"$SHELL" -lc '<program>'`, and the single quotes are what keep the program a
 * constant rather than something the outer shell expands.
 *
 * Those quotes are load bearing, so condition 36 counts them: an inner program
 * may hold no single quote of its own, therefore a text holds exactly two per
 * inner program. A third is a quote that closes the program early, and what the
 * far machine's login shell would then run is not what this gate read.
 */
function innerShellSpans(text: string): { from: number; to: number }[] {
  const out: { from: number; to: number }[] = [];
  for (const hit of text.matchAll(/"\$SHELL" -li?c '/g)) {
    const from = (hit.index ?? 0) + hit[0].length;
    const to = text.indexOf("'", from);
    if (to < 0) continue;
    out.push({ from, to });
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
    // Phase 270, condition 36. An inner program is delimited by single quotes
    // and may hold none of its own, so the quotes in the whole text are exactly
    // two per inner program. That is what makes the span above sound.
    innerSpans: innerShellSpans(script.text).length,
    singleQuotes: [...script.text.matchAll(/'/g)].length,
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

/**
 * The checkable sentence, PER BRANCH of each write script (Phase 101,
 * condition 80).
 *
 * A whole-script test would pass `file-put` on its checksum arm alone, and the
 * `new` arm could then lose its existence test while the gate stayed green and
 * Tortie replaced a file it never read. So each arm is read on its own.
 */
const REFUSAL_WORDS = [
  'nosum',
  'stale',
  'missing',
  'exists',
  'nomode',
  // PHASE 336 (SPEC D9, D12). The folder check's four words and the shape
  // guards' one, every one of which means nothing was written, so none of
  // them may stand below the first write either.
  'notsame',
  'offlimits',
  'nohome',
  'protected',
  'badname'
] as const;

/**
 * PHASE 336 (D12). One far refusal as the text spells it: the word and its
 * `none` fields inside the markers, then `exit 0`, never `exit 1`.
 */
const farRefusal = (word: string, fields: number): string =>
  `printf '__TORTIE_RUN__${[word, ...Array.from({ length: fields - 1 }, () => 'none')].join(' ')}__TORTIE_RUN__\\n'; exit 0`;
/** PHASE 336 (D10). `.git` and `.ssh` as whole segments, any ASCII case. */
const RESERVED_SEGMENT_PATTERN =
  '.[Gg][Ii][Tt]|.[Gg][Ii][Tt]/*|*/.[Gg][Ii][Tt]|*/.[Gg][Ii][Tt]/*|' +
  '.[Ss][Ss][Hh]|.[Ss][Ss][Hh]/*|*/.[Ss][Ss][Hh]|*/.[Ss][Ss][Hh]/*';

const writeBranches = (() => {
  const textOf = (id: string): string =>
    REMOTE_SCRIPTS.find((script) => script.id === id)?.text ?? '';
  const imagePut = textOf('image-put');
  const gitClone = textOf('git-clone');
  const filePut = textOf('file-put');
  const armStart = filePut.indexOf('if [ "$3" = new ]; then');
  const armElse = armStart < 0 ? -1 : filePut.indexOf('\nelse\n', armStart);
  const armEnd = armElse < 0 ? -1 : filePut.indexOf('\nfi\n', armElse);
  const newArm = armStart < 0 || armElse < 0 ? '' : filePut.slice(armStart, armElse);
  const sumArm = armElse < 0 || armEnd < 0 ? '' : filePut.slice(armElse, armEnd);
  const compareAt = filePut.indexOf('if [ "$c" != "$3" ]');
  const firstWriteAt = filePut.indexOf('> "$t"');
  // Everything above the first arm, which is where the checksum program has to
  // be found AND run.
  const probeRegion = armStart < 0 ? '' : filePut.slice(0, armStart);
  return {
    imagePutRefusesExisting: imagePut.includes('if [ -f "$f" ]; then'),
    gitCloneRefusesExisting: gitClone.includes('if [ -e "$d" ]; then'),
    filePutArmsFound: armStart >= 0 && armElse >= 0 && armEnd >= 0,
    filePutNewArmRefusesExisting:
      newArm.includes('[ -f "$f" ]') && newArm.includes('exists'),
    filePutNewArmWrites: newArm.includes('> "$t"') || newArm.includes('mv "$t"'),
    filePutSumArmComparesChecksum: sumArm.includes('if [ "$c" != "$3" ]'),
    filePutSumArmComputesChecksum: sumArm.includes('c=$("$p"'),
    filePutComparesBeforeWriting:
      compareAt >= 0 && firstWriteAt >= 0 && compareAt < firstWriteAt,
    // PHASE 242 FIX ROUND. This was `filePutNamesRm`, a boolean, and the rule
    // it fed was that the text names no `rm` at all. That rule left the hole a
    // HARD LINK at the staged name walked through, which `[ -L ]` cannot see
    // and which the redirection followed. The fix is nofollow.ts's shape, being
    // unlink then create exclusively, so the text now names one. The probe
    // hands over the LINES and the gate does the judging, which is this file's
    // standing rule.
    filePutRmLines: filePut
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => /(^|[\s;|&(){}])rm([\s;|&(){}]|$)/.test(line)),
    // PHASE 336 (D12) RE-POINTED THE THREE, never weakened: each now prints
    // its word and exits 0, the root's `..` line stands in the legacy branch
    // (a pinned folder is judged by identity instead, D9), and the relative
    // part gained the reserved-name line file-put lacked (D10, fault 2).
    filePutHasRootCase: filePut.includes(`case "$1" in /*) ;; *) ${farRefusal('badname', 3)};; esac`),
    filePutHasRootDotDotCase: filePut.includes(`case "$1" in *..*) ${farRefusal('badname', 3)};; esac`),
    filePutHasRelCase:
      filePut.includes(`case "$2" in /*|*..*) ${farRefusal('badname', 3)};; esac`) &&
      filePut.includes(`case "$2" in ${RESERVED_SEGMENT_PATTERN}) ${farRefusal('protected', 3)};; esac`),
    filePutMovesIntoPlace: filePut.includes('mv "$t" "$f"'),
    // The program is looked up before either arm. This is what the first
    // version of this fact checked, and on its own it is not enough: a
    // lookup that succeeds says nothing about whether the program answers.
    filePutProbesChecksumFirst:
      filePut.indexOf('command -v shasum') >= 0 &&
      filePut.indexOf('command -v shasum') < (armStart < 0 ? 0 : armStart),
    // The program is RUN before either arm, and the `nosum` refusal is decided
    // on what that run said. A verifier proved the weaker fact above passes
    // while the script writes the file and then answers `nosum`, by putting a
    // `shasum` on PATH that exits 0 and prints nothing.
    filePutRunsChecksumFirst:
      probeRegion.includes('k=$("$p"') &&
      probeRegion.includes('/dev/null') &&
      probeRegion.includes('if [ -z "$k" ]; then'),
    // No word that means nothing was written appears after the first write.
    // This is the property, stated over the whole text, that the fix round
    // closed. The names are listed so a failure can print them.
    filePutRefusalWordsAfterWrite: REFUSAL_WORDS.filter(
      (word) =>
        firstWriteAt >= 0 && filePut.indexOf(word, firstWriteAt) >= 0
    ),
    // What it prints instead, when the bytes are in place and it cannot
    // describe them. `../src/main/machines/remote-file.ts` does not know this
    // word, so the call throws the sentence that says nobody can tell.
    filePutSaysUnsureAfterWrite:
      firstWriteAt >= 0 && filePut.indexOf('unsure', firstWriteAt) >= 0
  };
})();

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

/**
 * A module loader that records why a module did not load rather than throwing,
 * so a tree where one half of a phase has not landed fails in the checker with
 * a sentence naming the missing piece. Phase 320.1's block and Phase 336's
 * both use it; the Phase 336 integrator hoisted it when the second copy
 * appeared.
 */
function optionalLoader(
  loadErrors: Record<string, string>
): (key: string, rel: string) => Promise<Record<string, unknown> | null> {
  return async (key, rel) => {
    const path = join(repoRoot, rel);
    if (!existsSync(path)) {
      loadErrors[key] = `${rel} is not there`;
      return null;
    }
    try {
      return (await import(pathToFileURL(path).href)) as Record<string, unknown>;
    } catch (err) {
      loadErrors[key] = `${rel} did not load: ${err instanceof Error ? err.message.split('\n')[0] : String(err)}`;
      return null;
    }
  };
}

// ---------------------------------------------------------------------------
// Phase 320.1, conditions 101 to 112. The carriage door, DRIVEN.
// ---------------------------------------------------------------------------
//
// A session on another machine scrolls over that machine's live connection,
// through ONE runner that checks every argv against a closed table of six
// shapes before a byte is written (build/p3201/SPEC.md §3, research 130 §4).
// This block drives the shipping modules and hands the checker what they did.
// The source reads of those conditions (who names what, in which order) are
// the checker's own, over the files themselves.
//
// NOTHING IS SENT. The runner is handed a RECORDING `send` that answers from
// memory, so the only connection anything here writes to is an array. No ssh
// runs, no tmux server is started, no machine is contacted, no file is written.
//
// Each module is loaded ONLY IF IT IS THERE and its load error is carried to
// the checker, so a tree where one builder's half has landed and the other's
// has not fails with a sentence naming the missing piece. A MISSING MODULE IS
// A FAILURE in the checker and never a skip.
const p3201 = await (async () => {
  const loadErrors: Record<string, string> = {};
  const load = optionalLoader(loadErrors);
  const shapesMod = await load('shapes', 'src/main/machines/scroll-shapes.ts');
  const scrollMod = await load('scroll', 'src/main/tmux/scroll.ts');
  const planeMod = await load('controlPlane', 'src/main/machines/control-plane.ts');
  const sessionsMod = await load('remoteSessions', 'src/main/machines/remote-sessions.ts');
  const clientMod = await load('controlClient', 'src/main/tmux/control-client.ts');
  // PHASE 320.1's SECOND BUILD: the module that keeps a remote session's two
  // roads apart (build/p3201/SPEC.md D3, D6 to D9), driven for 109 to 111.
  const orderMod = await load('order', 'src/main/machines/scroll-order.ts');
  // THE COPY ON A MACHINE lives in whichever file exports `remoteHistoryArgs`.
  // The spec named `remote-history.ts`, which Phase 107's commit graph already
  // holds, so the file is found by the export rather than by a name.
  const historyFile = (() => {
    for (const name of readdirSync(machinesDir).sort()) {
      if (!name.endsWith('.ts')) continue;
      const text = readFileSync(join(machinesDir, name), 'utf8');
      if (/export\s+(?:async\s+)?function\s+remoteHistoryArgs\b/.test(text)) {
        return `src/main/machines/${name}`;
      }
    }
    return null;
  })();
  const historyMod =
    historyFile === null ? null : await load('history', historyFile);
  if (historyFile === null) {
    loadErrors['history'] = 'no file under src/main/machines/ exports remoteHistoryArgs';
  }

  const fn = <T>(mod: Record<string, unknown> | null, name: string): T | null =>
    mod !== null && typeof mod[name] === 'function' ? (mod[name] as T) : null;
  type Verdict = { ok: true; shape: string } | { ok: false; reason: string };
  const admit = fn<(args: readonly unknown[]) => Verdict>(shapesMod, 'admitScrollArgv');
  const guarded = fn<
    (input: {
      send: (line: string) => Promise<readonly string[]>;
      isCurrent: () => boolean;
      server: string;
      deadlineMs?: number;
    }) => ((args: readonly string[]) => Promise<string>) & { ordered?: boolean; server?: string }
  >(shapesMod, 'guardedScrollRunner');
  // THE READ A MACHINE IS ASKED WITH (Phase 320.1's fix round): the same eight
  // fields as this Mac's, one space between them, because a machine's control
  // client may have no UTF-8 locale and tmux then answers every tab as `_`.
  // `STATE_FORMAT_HERE` names it, since it is the one the table admits.
  const STATE_FORMAT_HERE =
    scrollMod !== null && typeof scrollMod['REMOTE_STATE_FORMAT'] === 'string'
      ? (scrollMod['REMOTE_STATE_FORMAT'] as string)
      : null;
  /** This Mac's read, the tab-separated one, which never crosses to a machine. */
  const THIS_MAC_FORMAT =
    scrollMod !== null && typeof scrollMod['STATE_FORMAT'] === 'string'
      ? (scrollMod['STATE_FORMAT'] as string)
      : null;
  const CHUNK =
    scrollMod !== null && typeof scrollMod['SCROLL_CHUNK_LINES'] === 'number'
      ? (scrollMod['SCROLL_CHUNK_LINES'] as number)
      : null;
  const verdictOf = (args: readonly unknown[]): Verdict | { ok: false; reason: string; threw: true } => {
    if (admit === null) return { ok: false, reason: 'admitScrollArgv is not exported', threw: true };
    try {
      return admit(args);
    } catch (err) {
      return { ok: false, reason: `threw ${err instanceof Error ? err.message : String(err)}`, threw: true };
    }
  };

  // --- 102, the table itself -------------------------------------------------
  const rawShapes = shapesMod !== null && Array.isArray(shapesMod['SCROLL_SHAPES'])
    ? (shapesMod['SCROLL_SHAPES'] as { id: unknown; argv: unknown; idempotent: unknown; repeat: unknown }[])
    : null;
  /** One slot as a word the checker compares: the fixed word itself, or the slot's kind and bounds. */
  const slotWord = (slot: unknown): string => {
    const s = (slot ?? {}) as { kind?: unknown; word?: unknown; words?: unknown; min?: unknown; max?: unknown };
    if (s.kind === 'word') return String(s.word);
    if (s.kind === 'int' || s.kind === 'hex-bytes') return `${String(s.kind)}:${String(s.min)}-${String(s.max)}`;
    if (s.kind === 'one-of') return `one-of:${Array.isArray(s.words) ? s.words.join('|') : ''}`;
    return String(s.kind);
  };
  const shapes = (rawShapes ?? []).map((row) => ({
    id: String(row.id),
    elements: Array.isArray(row.argv) ? row.argv.length : -1,
    slots: Array.isArray(row.argv) ? (row.argv as unknown[]).map(slotWord) : [],
    idempotent: row.idempotent === true,
    repeat: typeof row.repeat === 'string' ? row.repeat : ''
  }));

  // --- 102, every argv the four scroll.ts entry points emit ------------------
  //
  // THE EXPECTED SHAPE IS THIS PROBE'S OWN, written from research 130 §4's
  // table and never read from the module it judges.
  const expectedShapeOf = (args: readonly string[]): string => {
    if (args[0] === 'display-message') return 'read-state';
    if (args[0] === 'copy-mode') return 'enter-copy-mode';
    if (args.includes('-N')) return 'scroll-lines';
    if (args.includes('goto-line')) return 'goto-line';
    if (args.includes('top-line')) return 'top-line';
    if (args.includes('cancel')) return 'cancel';
    return 'none';
  };
  const recorded: { via: string; args: string[]; verdict: unknown; expected: string }[] = [];
  const recordErrors: string[] = [];
  /** A read's eight fields, as a machine answers them (a space) or as this Mac does (a tab). */
  const stateLine = (parked: boolean, separator = ' '): string =>
    [parked ? '1' : '0', parked ? '120' : '', '4000', '40', '0', '0', '150', parked ? '4000' : ''].join(separator);
  if (scrollMod !== null && admit !== null) {
    type Runner = ((args: readonly string[]) => Promise<string>) & { ordered?: boolean; server?: string };
    // `ordered` and `unordered` both NAME A SERVER, being a machine's runner
    // driven through the pipelined code and through the serial code. The
    // `fallback` road is this Mac's alone (D8: only a runner with no server may
    // latch the chunked walk), so it names none and reads with this Mac's tab
    // format, which never crosses to a machine: its reads are not recorded, and
    // condition 103 asks separately that the table refuses them.
    const recorder = (via: string, o: { ordered: boolean; server: boolean; failGotoOnce?: boolean }): Runner => {
      let gotoFailed = false;
      const run = (args: readonly string[]): Promise<string> => {
        const copy = [...args].map(String);
        // PHASE 342 (D11, D20): the fallback road is this Mac's alone, and its
        // copy-mode entry, today's four elements, never crosses to a machine,
        // so it is not recorded; condition 103's corpus asks that the table
        // refuses it, and condition 147 that it is byte for byte today's.
        if (o.server || (copy[0] !== 'display-message' && copy[0] !== 'copy-mode')) {
          recorded.push({ via, args: copy, verdict: verdictOf(copy), expected: expectedShapeOf(copy) });
        }
        if (o.failGotoOnce === true && copy.includes('goto-line') && !gotoFailed) {
          gotoFailed = true;
          return Promise.reject(new Error('unknown command: goto-line'));
        }
        if (copy[0] === 'display-message') return Promise.resolve(stateLine(true, o.server ? ' ' : '\t'));
        return Promise.resolve('');
      };
      if (!o.server) return run;
      return o.ordered
        ? Object.assign(run, { ordered: true, server: 'machine:probe' })
        : Object.assign(run, { server: 'machine:probe' });
    };
    const drive = async (via: string, runner: Runner): Promise<void> => {
      const s = scrollMod as Record<string, (...a: unknown[]) => Promise<unknown>>;
      for (const [name, args] of [
        ['readPaneScroll', ['$7']],
        ['scrollPaneBy', ['$7', 3]],
        ['scrollPaneBy', ['$7', -3]],
        ['scrollPaneBy', ['$7', 2500]],
        ['scrollPaneBy', ['$7', -2500]],
        ['scrollPaneTo', ['$7', 1500]],
        ['scrollPaneTo', ['$7', 0]],
        ['exitPaneScroll', ['$7']]
      ] as const) {
        const call = s[name];
        if (typeof call !== 'function') {
          recordErrors.push(`${name} is not exported by scroll.ts`);
          continue;
        }
        try {
          await call(runner, ...args);
        } catch (err) {
          recordErrors.push(`${via} ${name}(${args.join(', ')}) threw ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    };
    const reset = scrollMod['resetSeekSupportForTests'];
    const resetSeek = (): void => {
      if (typeof reset === 'function') (reset as () => void)();
    };
    resetSeek();
    await drive('ordered', recorder('ordered', { ordered: true, server: true }));
    resetSeek();
    await drive('unordered', recorder('unordered', { ordered: false, server: true }));
    // THE CHUNKED FALLBACK, which only this Mac's runner can reach (D8): its
    // first `goto-line` fails, the latch goes to "no", and the seek is walked
    // in slices of SCROLL_CHUNK_LINES. Every slice must fit the table too.
    resetSeek();
    await drive('fallback', recorder('fallback', { ordered: false, server: false, failGotoOnce: true }));
    resetSeek();
  }

  // --- 102, the hostile corpus, held HERE and never imported from a test ----
  const F = STATE_FORMAT_HERE ?? '#{pane_in_mode}';
  const HOSTILE: { label: string; args: unknown[] }[] = [
    { label: '-l literal text', args: ['send-keys', '-t', '$1', '-l', 'abc'] },
    // PHASE 337 (build/p337/SPEC.md D20): `send-keys -t $N <Name>` is the
    // EIGHTH shape now, for exactly the 35 names of POCKET_SCREEN_KEY_NAMES (his
    // word of 2026-10-05, "Every key, including Ctrl-C"), admitted and driven in
    // condition 122. What stays hostile is every name off that list, a second
    // name, a modifier, a flag and any target but $N.
    { label: 'a key name the eighth row does not carry', args: ['send-keys', '-t', '$1', 'F1'] },
    { label: 'a key name with Meta', args: ['send-keys', '-t', '$1', 'M-x'] },
    { label: 'a key name with Control on an arrow', args: ['send-keys', '-t', '$1', 'C-Up'] },
    { label: 'two key names', args: ['send-keys', '-t', '$1', 'Up', 'Down'] },
    { label: 'a key name with -l', args: ['send-keys', '-t', '$1', '-l', 'Up'] },
    { label: 'a key name to a % target', args: ['send-keys', '-t', '%1', 'Up'] },
    { label: 'a key name to a name target', args: ['send-keys', '-t', 'p320-sh', 'Enter'] },
    { label: 'a key name in lowercase', args: ['send-keys', '-t', '$1', 'enter'] },
    { label: 'a key name carrying ;', args: ['send-keys', '-t', '$1', 'C-c;'] },
    { label: 'a key name carrying a second command', args: ['send-keys', '-t', '$1', 'Enter', ';', 'kill-server'] },
    { label: 'a key name as a number rather than a string', args: ['send-keys', '-t', '$1', 3] },
    { label: 'a key name before -t', args: ['send-keys', 'Enter', '-t', '$1'] },
    // PHASE 320.1's SECOND BUILD. `send-keys -t $N -H 41` is the SEVENTH
    // SHAPE now (his word of 2026-09-30), admitted and driven in 109; what
    // stays hostile is every other spelling of -H (build/p3201/SPEC.md §6.3).
    { label: '-H with no byte', args: ['send-keys', '-t', '$1', '-H'] },
    { label: '-H with 257 bytes', args: ['send-keys', '-t', '$1', '-H', ...Array.from({ length: 257 }, () => '61')] },
    { label: '-H byte of one digit', args: ['send-keys', '-t', '$1', '-H', '6'] },
    { label: '-H byte of three digits', args: ['send-keys', '-t', '$1', '-H', '061'] },
    { label: '-H byte in capitals', args: ['send-keys', '-t', '$1', '-H', '6A'] },
    { label: '-H byte spelled 0x61', args: ['send-keys', '-t', '$1', '-H', '0x61'] },
    { label: '-H byte -1', args: ['send-keys', '-t', '$1', '-H', '-1'] },
    { label: '-H byte 100', args: ['send-keys', '-t', '$1', '-H', '100'] },
    { label: '-H byte with a space', args: ['send-keys', '-t', '$1', '-H', ' 61'] },
    { label: '-H byte in Arabic-Indic digits', args: ['send-keys', '-t', '$1', '-H', '٦١'] },
    { label: '-H byte as a number rather than a string', args: ['send-keys', '-t', '$1', '-H', 97] },
    { label: '-H then a key name', args: ['send-keys', '-t', '$1', '-H', 'Enter'] },
    { label: '-H, a byte, then a key name', args: ['send-keys', '-t', '$1', '-H', '61', 'Enter'] },
    { label: '-H, a byte, then a second command', args: ['send-keys', '-t', '$1', '-H', '61', ';', 'kill-server'] },
    { label: '-H with -l before it', args: ['send-keys', '-t', '$1', '-l', '-H', '61'] },
    { label: '-H with -l after it', args: ['send-keys', '-t', '$1', '-H', '-l', '61'] },
    { label: '-H with -K', args: ['send-keys', '-K', '-t', '$1', '-H', '61'] },
    { label: '-H with -M', args: ['send-keys', '-t', '$1', '-M', '-H', '61'] },
    { label: '-H with -R', args: ['send-keys', '-t', '$1', '-R', '-H', '61'] },
    { label: '-H with -X', args: ['send-keys', '-t', '$1', '-X', '-H', '61'] },
    { label: '-H with a second -t', args: ['send-keys', '-t', '$1', '-H', '-t', '$2'] },
    { label: '-H before -t', args: ['send-keys', '-H', '-t', '$1', '61'] },
    { label: '-H to a name target', args: ['send-keys', '-t', 'p320-sh', '-H', '61'] },
    { label: '-H to a % target', args: ['send-keys', '-t', '%1', '-H', '61'] },
    { label: '-H to an = target', args: ['send-keys', '-t', '=gmux', '-H', '61'] },
    { label: '-K', args: ['send-keys', '-K', '-t', '$1', '-X', 'cancel'] },
    { label: '-M', args: ['send-keys', '-M', '-t', '$1'] },
    { label: '-R', args: ['send-keys', '-R', '-t', '$1'] },
    { label: 'copy-pipe-and-cancel with a program', args: ['send-keys', '-t', '$1', '-X', 'copy-pipe-and-cancel', 'touch /tmp/p3201-ran'] },
    { label: 'copy-pipe with a program', args: ['send-keys', '-t', '$1', '-X', 'copy-pipe', 'touch /tmp/p3201-ran'] },
    { label: 'copy-pipe-no-clear', args: ['send-keys', '-t', '$1', '-X', 'copy-pipe-no-clear', 'touch x'] },
    { label: 'a second command after ;', args: ['send-keys', '-t', '$1', '-X', 'cancel', ';', 'kill-server'] },
    { label: 'a % pane target', args: ['send-keys', '-t', '%1', '-X', 'cancel'] },
    { label: 'an = exact name target', args: ['send-keys', '-t', '=gmux', '-X', 'cancel'] },
    { label: 'a name target', args: ['send-keys', '-t', 'p320-sh', '-X', 'cancel'] },
    { label: '-c', args: ['send-keys', '-c', '/dev/ttys001', '-t', '$1', '-X', 'cancel'] },
    { label: '-e on send-keys', args: ['send-keys', '-e', '-t', '$1', '-X', 'cancel'] },
    // PHASE 342 (D11): this Mac's own entry, four elements, which a machine's
    // carriage refuses now that the one spelling carries -H.
    { label: "copy-mode without -H, this Mac's entry", args: ['copy-mode', '-e', '-t', '$1'] },
    { label: '-u on copy-mode', args: ['copy-mode', '-u', '-t', '$1'] },
    { label: 'copy-mode flags in another order', args: ['copy-mode', '-t', '$1', '-e'] },
    { label: 'copy-mode, one element more', args: ['copy-mode', '-e', '-t', '$1', '-u'] },
    { label: 'copy-mode, one element fewer', args: ['copy-mode', '-e', '-t'] },
    { label: '-N 0', args: ['send-keys', '-t', '$1', '-X', '-N', '0', 'scroll-up'] },
    { label: '-N 2001', args: ['send-keys', '-t', '$1', '-X', '-N', '2001', 'scroll-up'] },
    { label: '-N 1e3', args: ['send-keys', '-t', '$1', '-X', '-N', '1e3', 'scroll-up'] },
    { label: '-N with a leading space', args: ['send-keys', '-t', '$1', '-X', '-N', ' 5', 'scroll-up'] },
    { label: '-N +5', args: ['send-keys', '-t', '$1', '-X', '-N', '+5', 'scroll-up'] },
    { label: '-N in Arabic-Indic digits', args: ['send-keys', '-t', '$1', '-X', '-N', '٥', 'scroll-up'] },
    { label: '-N with a leading zero', args: ['send-keys', '-t', '$1', '-X', '-N', '05', 'scroll-up'] },
    { label: '-N 0x10', args: ['send-keys', '-t', '$1', '-X', '-N', '0x10', 'scroll-up'] },
    { label: '-N negative', args: ['send-keys', '-t', '$1', '-X', '-N', '-5', 'scroll-up'] },
    { label: '-N 5.0', args: ['send-keys', '-t', '$1', '-X', '-N', '5.0', 'scroll-up'] },
    { label: '-N as a number rather than a string', args: ['send-keys', '-t', '$1', '-X', '-N', 5, 'scroll-up'] },
    { label: 'a target carrying ; kill-server', args: ['send-keys', '-t', '$1 ; kill-server', '-X', 'cancel'] },
    { label: 'a target with a leading zero', args: ['send-keys', '-t', '$01', '-X', 'cancel'] },
    { label: 'a target of ten digits', args: ['send-keys', '-t', '$1234567890', '-X', 'cancel'] },
    { label: 'a target in Arabic-Indic digits', args: ['send-keys', '-t', '$١', '-X', 'cancel'] },
    { label: 'a format that runs a program', args: ['display-message', '-p', '-t', '$1', '-F', '#(touch /tmp/p3201-ran)'] },
    { label: 'the format one byte longer', args: ['display-message', '-p', '-t', '$1', '-F', `${F} `] },
    { label: 'the format one byte shorter', args: ['display-message', '-p', '-t', '$1', '-F', F.slice(0, -1)] },
    { label: 'a format with #( appended', args: ['display-message', '-p', '-t', '$1', '-F', `${F}#(touch x)`] },
    { label: 'a read with no -F', args: ['display-message', '-p', '-t', '$1', '#{pane_in_mode}'] },
    { label: 'a read with no -p', args: ['display-message', '-t', '$1', '-F', F] },
    { label: 'a read, one element more', args: ['display-message', '-p', '-t', '$1', '-F', F, 'x'] },
    { label: "this Mac's tab-separated read, which a machine may answer as underscores", args: ['display-message', '-p', '-t', '$1', '-F', THIS_MAC_FORMAT ?? '#{pane_in_mode}\t#{scroll_position}'] },
    { label: 'goto-line -1', args: ['send-keys', '-t', '$1', '-X', 'goto-line', '-1'] },
    { label: 'goto-line past a C int', args: ['send-keys', '-t', '$1', '-X', 'goto-line', '2147483648'] },
    { label: 'goto-line 1e3', args: ['send-keys', '-t', '$1', '-X', 'goto-line', '1e3'] },
    { label: 'top-line, one element more', args: ['send-keys', '-t', '$1', '-X', 'top-line', 'x'] },
    { label: 'cancel, one element more', args: ['send-keys', '-t', '$1', '-X', 'cancel', 'x'] },
    { label: 'cancel, one element fewer', args: ['send-keys', '-t', '$1', '-X'] },
    { label: 'a scroll verb the table does not name', args: ['send-keys', '-t', '$1', '-X', '-N', '5', 'page-up'] },
    { label: '-X before -t', args: ['send-keys', '-X', '-t', '$1', 'cancel'] },
    { label: 'a search, which takes a caller string', args: ['send-keys', '-t', '$1', '-X', 'search-backward', 'x'] },
    { label: 'kill-server', args: ['kill-server'] },
    { label: 'run-shell', args: ['run-shell', 'touch /tmp/p3201-ran'] },
    { label: 'the verb in capitals', args: ['SEND-KEYS', '-t', '$1', '-X', 'cancel'] },
    { label: 'an empty argv', args: [] },
    { label: 'copy-mode then a second command', args: ['copy-mode', '-e', '-t', '$1', ';', 'run-shell', 'x'] }
  ];
  const hostile = HOSTILE.map((row) => ({ label: row.label, verdict: verdictOf(row.args) }));

  // --- 103, the pinned format --------------------------------------------------
  const format = {
    stateFormat: STATE_FORMAT_HERE,
    thisMacFormat: THIS_MAC_FORMAT,
    // Every byte printable ASCII, so no client's locale rewrites one.
    printable: STATE_FORMAT_HERE === null ? null : /^[\x20-\x7e]+$/.test(STATE_FORMAT_HERE),
    // The same eight fields as this Mac's read, in the same places.
    sameFields:
      STATE_FORMAT_HERE === null || THIS_MAC_FORMAT === null
        ? null
        : JSON.stringify(STATE_FORMAT_HERE.split(' ')) === JSON.stringify(THIS_MAC_FORMAT.split('\t')) &&
          THIS_MAC_FORMAT.split('\t').length === 8,
    thisMacRefused:
      THIS_MAC_FORMAT === null ? null : verdictOf(['display-message', '-p', '-t', '$0', '-F', THIS_MAC_FORMAT]),
    hasHashParen: STATE_FORMAT_HERE === null ? null : STATE_FORMAT_HERE.includes('#('),
    exact: STATE_FORMAT_HERE === null ? null : verdictOf(['display-message', '-p', '-t', '$0', '-F', STATE_FORMAT_HERE]),
    oneByteOff:
      STATE_FORMAT_HERE === null
        ? null
        : verdictOf(['display-message', '-p', '-t', '$0', '-F', `${STATE_FORMAT_HERE.slice(0, -1)}X`]),
    runsAProgram: verdictOf(['display-message', '-p', '-t', '$0', '-F', '#(touch x)'])
  };

  // --- 104, the live-row target, over its whole matrix --------------------------
  //
  // THE WANT IS THIS PROBE'S, written from D4: a gone row is ended whatever
  // else is true; no row is unknown; a live row is addressable only while its
  // machine is on its control connection AND the rows were listed by a pass
  // that started on the CURRENT connection.
  const addressOf = fn<(facts: unknown) => { kind: string; machineId?: string; tmuxId?: string }>(
    sessionsMod,
    'scrollAddressOf'
  );
  const ROW = { machineId: 'm1', tmuxId: '$4', id: 's1', name: 'p3201', tmuxName: 'p3201' };
  const address: { label: string; got: unknown; want: { kind: string; tmuxId?: string } }[] = [];
  for (const gone of [false, true]) {
    for (const hasRow of [false, true]) {
      for (const onControl of [false, true]) {
        for (const [controlEpoch, rowsEpoch] of [
          [0, 0],
          [2, 2],
          [3, 2],
          [2, 3]
        ] as const) {
          const want = gone
            ? { kind: 'ended' }
            : !hasRow
              ? { kind: 'unknown' }
              : onControl && rowsEpoch === controlEpoch
                ? { kind: 'live', tmuxId: '$4' }
                : { kind: 'waiting' };
          let got: unknown = null;
          if (addressOf !== null) {
            try {
              got = addressOf({ live: hasRow ? ROW : undefined, gone, onControl, controlEpoch, rowsEpoch });
            } catch (err) {
              got = { threw: err instanceof Error ? err.message : String(err) };
            }
          }
          address.push({
            label: `gone ${String(gone)}, row ${String(hasRow)}, on control ${String(onControl)}, control epoch ${String(controlEpoch)}, rows epoch ${String(rowsEpoch)}`,
            got,
            want
          });
        }
      }
    }
  }

  // --- 106, checked before written, refused when moved -------------------------
  const runner: Record<string, unknown> = { present: guarded !== null };
  if (guarded !== null) {
    const sends: string[] = [];
    let current = true;
    const run = guarded({
      send: (line) => {
        sends.push(line);
        return Promise.resolve([stateLine(false)]);
      },
      isCurrent: () => current,
      server: 'machine:probe'
    });
    runner['ordered'] = run.ordered === true;
    runner['server'] = run.server ?? null;
    const outcome = async (args: readonly unknown[]): Promise<{ sends: number; rejected: boolean; code: string | null }> => {
      const before = sends.length;
      let rejected = false;
      let code: string | null = null;
      try {
        await run(args as readonly string[]);
      } catch (err) {
        rejected = true;
        const payload = (err as { payload?: { code?: unknown } } | null)?.payload;
        code = typeof payload?.code === 'string' ? payload.code : err instanceof Error ? err.name : 'thrown';
      }
      return { sends: sends.length - before, rejected, code };
    };
    const hostileSends: { label: string; sends: number; rejected: boolean; code: string | null }[] = [];
    for (const row of HOSTILE) hostileSends.push({ label: row.label, ...(await outcome(row.args)) });
    runner['hostileSends'] = hostileSends;
    const read = ['display-message', '-p', '-t', '$4', '-F', STATE_FORMAT_HERE ?? ''];
    const admitted = await outcome(read);
    runner['admitted'] = { ...admitted, line: sends[sends.length - 1] ?? null };
    runner['quotedLine'] =
      clientMod !== null && typeof clientMod['quoteTmuxArg'] === 'function'
        ? read.map((a) => (clientMod['quoteTmuxArg'] as (s: string) => string)(a)).join(' ')
        : null;
    current = false;
    runner['notCurrent'] = await outcome(read);
    current = true;

    // THE ONE READ OF THE CALLER'S LIST. A list whose elements read one way at
    // the check and another at the write (a Proxy, a getter) must cross as the
    // bytes that were checked. The integrator's re-derivation found this hole
    // open, and the attack verifier found that no condition here owned it.
    const copyLines: string[] = [];
    let copyChecked = false;
    const copyRun = guarded({
      send: (line) => {
        copyLines.push(line);
        return Promise.resolve([]);
      },
      isCurrent: () => {
        copyChecked = true;
        return true;
      },
      server: 'machine:probe'
    });
    const shifty = new Proxy(['send-keys', '-t', '$3', '-X', 'cancel'], {
      get(target, prop, receiver) {
        if (copyChecked && prop === '2') return '$3 ; run-shell "touch /tmp/p3201-ran"';
        if (copyChecked && prop === '4') return 'copy-pipe-and-cancel';
        return Reflect.get(target, prop, receiver) as unknown;
      }
    });
    await copyRun(shifty).catch(() => undefined);
    runner['copyOnce'] = { lines: copyLines };

    // THE CALLER'S DEADLINE (D10), driven at 40 ms over a send that never
    // answers: the caller is answered TMUX_UNREACHABLE, and nothing waits on a
    // connection that stopped answering.
    const deadlineRun = guarded({
      send: () => new Promise<readonly string[]>(() => undefined),
      isCurrent: () => true,
      server: 'machine:probe',
      deadlineMs: 40
    });
    const deadlineStarted = Date.now();
    const deadlineOutcome = await Promise.race([
      deadlineRun(['send-keys', '-t', '$3', '-X', 'cancel']).then(
        () => ({ settled: 'answered', code: null as string | null }),
        (err: unknown) => {
          const payload = (err as { payload?: { code?: unknown } } | null)?.payload;
          return { settled: 'rejected', code: typeof payload?.code === 'string' ? payload.code : null };
        }
      ),
      new Promise<{ settled: string; code: string | null }>((resolve) => {
        setTimeout(() => resolve({ settled: 'no answer within 2000 ms', code: null }), 2_000);
      })
    ]);
    runner['deadline'] = { ...deadlineOutcome, ms: Date.now() - deadlineStarted, deadlineMs: 40 };
  }

  // --- 108, a machine's read, and the sequences around it ----------------------
  //
  // Phase 320.1's fix round. A machine's control client may have no UTF-8
  // locale, and tmux then answers every tab of a format as `_`. The attack
  // verifier measured the tab-separated read answering `0__1971_30_0_0_100_`
  // over the loopback machine on 3.6a and 3.7b, read as "live, no history"
  // while the far pane sat parked. So a machine is read with its own format and
  // read STRICTLY, and this drives that through the shipping entry points.
  const read107: Record<string, unknown> = { present: scrollMod !== null };
  if (scrollMod !== null) {
    type Runner = ((args: readonly string[]) => Promise<string>) & { ordered?: boolean; server?: string };
    const s = scrollMod as Record<string, (...a: unknown[]) => Promise<unknown>>;
    const isUnreadable =
      typeof scrollMod['isUnreadableScrollAnswer'] === 'function'
        ? (scrollMod['isUnreadableScrollAnswer'] as (err: unknown) => boolean)
        : null;
    read107['isUnreadablePresent'] = isUnreadable !== null;
    const SANITIZED = '0__1971_30_0_0_100_';
    const FIELDS = ['1', '10', '1971', '30', '0', '0', '100', '1971'];
    const machineRunner = (answer: string, formats: string[]): Runner =>
      Object.assign(
        (args: readonly string[]): Promise<string> => {
          if (args[0] === 'display-message') formats.push(String(args[args.length - 1]));
          return Promise.resolve(args[0] === 'display-message' ? answer : '');
        },
        { ordered: true, server: 'machine:probe' }
      );
    const hereRunner = (answer: string): Runner => (args: readonly string[]): Promise<string> =>
      Promise.resolve(args[0] === 'display-message' ? answer : '');
    const sanitized: Record<string, unknown>[] = [];
    for (const [name, args] of [
      ['readPaneScroll', ['$7']],
      ['scrollPaneBy', ['$7', 10]],
      ['scrollPaneBy', ['$7', -3]],
      ['scrollPaneBy', ['$7', 2500]],
      ['scrollPaneTo', ['$7', 500]],
      ['exitPaneScroll', ['$7']]
    ] as const) {
      const formats: string[] = [];
      const call = s[name];
      let outcome: Record<string, unknown>;
      if (typeof call !== 'function') outcome = { missing: true };
      else {
        try {
          outcome = { answered: await call(machineRunner(SANITIZED, formats), ...args) };
        } catch (err) {
          outcome = { threw: isUnreadable?.(err) === true ? 'unreadable' : err instanceof Error ? err.message : String(err) };
        }
      }
      sanitized.push({ label: `${name}(${args.join(', ')})`, formats, ...outcome });
    }
    read107['sanitized'] = sanitized;
    const tryRead = async (run: Runner): Promise<unknown> => {
      try {
        return await s['readPaneScroll']?.(run, '$7');
      } catch (err) {
        return { threw: err instanceof Error ? err.message : String(err) };
      }
    };
    read107['there'] = await tryRead(machineRunner(FIELDS.join(' '), []));
    read107['here'] = await tryRead(hereRunner(FIELDS.join('\t')));
    // This Mac's reader is unchanged: it still reads what it cannot read as a
    // live pane with nothing, exactly as it always has.
    read107['hereSanitized'] = await tryRead(hereRunner(SANITIZED));

    // NO UNHANDLED REJECTION from a pipelined sequence whose first answer fails:
    // the answers after it settle into handlers, never into the process.
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown): void => {
      unhandled.push(reason);
    };
    process.on('unhandledRejection', onUnhandled);
    try {
      const failing = Object.assign(
        (): Promise<string> => Promise.reject(new Error('far failure')),
        { ordered: true, server: 'machine:probe' }
      );
      await s['scrollPaneBy']?.(failing, '$7', 5).catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, 30));
    } finally {
      process.off('unhandledRejection', onUnhandled);
    }
    read107['unhandled'] = unhandled.length;

    // THE goto-line LATCH IS THIS MAC'S (D8): a machine's runner whose seek
    // fails throws and walks nothing, and this Mac's next seek still probes.
    const reset = scrollMod['resetSeekSupportForTests'];
    if (typeof reset === 'function') (reset as () => void)();
    const remoteCalls: string[][] = [];
    const remoteSeek = Object.assign(
      (args: readonly string[]): Promise<string> => {
        remoteCalls.push([...args]);
        if (args.includes('goto-line')) return Promise.reject(new Error('dropped'));
        return Promise.resolve(args[0] === 'display-message' ? ['1', '0', '9000', '40', '0', '0', '120', ''].join(' ') : '');
      },
      { server: 'machine:probe' }
    );
    let remoteThrew = false;
    try {
      await s['scrollPaneTo']?.(remoteSeek, '$7', 3000);
    } catch {
      remoteThrew = true;
    }
    const localCalls: string[][] = [];
    const localSeek = (args: readonly string[]): Promise<string> => {
      localCalls.push([...args]);
      return Promise.resolve(args[0] === 'display-message' ? ['1', '0', '9000', '40', '0', '0', '120', ''].join('\t') : '');
    };
    await s['scrollPaneTo']?.(localSeek, '$7', 3000).catch(() => undefined);
    if (typeof reset === 'function') (reset as () => void)();
    read107['latch'] = {
      remoteThrew,
      remoteWalked: remoteCalls.some((a) => a.includes('-N')),
      localSentGoto: localCalls.some((a) => a.includes('goto-line'))
    };
  }

  // --- 109, the typed shape: its one composer, driven ------------------------------
  //
  // PHASE 320.1's SECOND BUILD, his word of 2026-09-30 ("Yes, allow it"): a
  // keystroke over a scrolled-back remote pane crosses on the control
  // connection as `cancel`, then its UTF-8 bytes as `send-keys -t $N -H <hh>…`
  // of at most 256 bytes a command. `typedSequence` is the one composer. It is
  // driven here over inputs whose bytes the checker re-derives itself.
  const typedSeq = fn<(target: string, bytes: Uint8Array) => string[][]>(shapesMod, 'typedSequence');
  const typed: Record<string, unknown> = {
    present: typedSeq !== null,
    perCommand: shapesMod !== null && typeof shapesMod['TYPED_BYTES_PER_COMMAND'] === 'number' ? shapesMod['TYPED_BYTES_PER_COMMAND'] : null
  };
  if (typedSeq !== null) {
    const rows: Record<string, unknown>[] = [];
    for (const [label, text] of [
      ['one letter', 'a'],
      ['é😀 and a return, four-byte characters', 'é😀\r'],
      ['six hundred bytes', 'x'.repeat(600)],
      ['a hundred four-byte characters', '😀'.repeat(100)],
      ['exactly 256 bytes', 'y'.repeat(256)],
      ['257 bytes', 'z'.repeat(257)],
      ['a bracketed paste', '\x1b[200~日本語\x1b[201~']
    ] as const) {
      const bytes = Buffer.from(text, 'utf8');
      try {
        const seq = typedSeq('$4', new Uint8Array(bytes));
        rows.push({ label, hex: bytes.toString('hex'), length: bytes.length, seq, verdicts: seq.map((argv) => verdictOf(argv)) });
      } catch (err) {
        rows.push({ label, hex: bytes.toString('hex'), length: bytes.length, threw: err instanceof Error ? err.message : String(err) });
      }
    }
    typed['rows'] = rows;
    try {
      typed['empty'] = typedSeq('$4', new Uint8Array(0));
    } catch (err) {
      typed['empty'] = { threw: err instanceof Error ? err.message : String(err) };
    }
    // The shape at its bounds, admitted: one byte and 256 bytes.
    typed['bounds'] = [
      verdictOf(['send-keys', '-t', '$1', '-H', '41']),
      verdictOf(['send-keys', '-t', '$1', '-H', ...Array.from({ length: 256 }, () => 'ff')])
    ];
  }

  // --- 122, the eighth shape: its one composer, driven (Phase 337) -----------------
  //
  // His word of 2026-10-05 ("Every key, including Ctrl-C", build/p337/SPEC.md
  // D20): a named key crosses on the control connection as `cancel`, then
  // `send-keys -t $N <Name>`, one of the contract's 35. `namedKeySequence` is
  // the one composer. It is driven here for EVERY name the contract lists,
  // read from the loaded contract, and for names it must refuse.
  const namedSeq = fn<(target: string, name: string) => string[][]>(shapesMod, 'namedKeySequence');
  const pocketContract = await load('pocketContract', 'src/shared/ipc/pocket.ts');
  const contractNames: string[] | null =
    pocketContract !== null && Array.isArray(pocketContract['POCKET_SCREEN_KEY_NAMES'])
      ? (pocketContract['POCKET_SCREEN_KEY_NAMES'] as string[]).slice()
      : null;
  const typeKey: Record<string, unknown> = { present: namedSeq !== null, names: contractNames };
  if (namedSeq !== null && contractNames !== null) {
    const rows: Record<string, unknown>[] = [];
    for (const name of contractNames) {
      try {
        const seq = namedSeq('$4', name);
        rows.push({ name, seq, verdicts: seq.map((argv) => verdictOf(argv)) });
      } catch (err) {
        rows.push({ name, threw: err instanceof Error ? err.message : String(err) });
      }
    }
    typeKey['rows'] = rows;
    const refusedNames: Record<string, unknown>[] = [];
    for (const name of ['F1', 'M-x', 'C-Up', 'enter', 'Up Down', 'C-c;', '', 'Escape ']) {
      try {
        refusedNames.push({ name, seq: namedSeq('$4', name) });
      } catch {
        refusedNames.push({ name, threw: true });
      }
    }
    typeKey['refused'] = refusedNames;
  }

  // --- 110 and 111, the router and the park gate, driven ---------------------------
  //
  // Over a SCRIPTED runner and an INJECTED clock, through the module's own
  // seam (`resetScrollOrderForTests(clock, source)`), so nothing waits on a
  // real timer and nothing reaches a machine.
  const order: Record<string, unknown> = { present: orderMod !== null };
  if (orderMod !== null && scrollMod !== null) {
    const o = orderMod as Record<string, any>;
    const sc = scrollMod as Record<string, any>;
    order['quietMs'] = o['ROAD_QUIET_MS'] ?? null;
    const missing = ['routeKey', 'awaitRoadQuiet', 'readBeforePark', 'undoRacedPark', 'noteAnswer', 'resetScrollOrderForTests'].filter(
      (name) => typeof o[name] !== 'function'
    );
    order['missing'] = missing;
    if (missing.length === 0) {
      let t = 10_000;
      const sleeps: number[] = [];
      let duringSleep: (() => void) | null = null;
      const clock = {
        now: () => t,
        sleep: async (ms: number): Promise<void> => {
          sleeps.push(ms);
          const hook = duringSleep;
          duringSleep = null;
          hook?.();
          t += ms;
        }
      };
      const nowhere = { address: () => ({ kind: 'unknown' }), carriage: () => ({ kind: 'none' }) };
      try {
        // 111 (i): a key on the attach at 10,000, a park asked at 10,050.
        o['resetScrollOrderForTests'](clock, nowhere);
        const firstKey = o['routeKey']('g1', 'x', 10_000);
        t = 10_050;
        const firstQuiet = await o['awaitRoadQuiet']('g1', 10_050);
        order['wait'] = { firstKey, sleeps: [...sleeps], endedAt: t, quiet: firstQuiet };
        // 111 (ii), since the fix round (F2): a key typed 50 ms into the wait
        // DROPS the park. The wait answers false and does not wait again.
        sleeps.length = 0;
        o['resetScrollOrderForTests'](clock, nowhere);
        t = 20_000;
        o['routeKey']('g2', 'x', 20_000);
        t = 20_050;
        duringSleep = () => {
          order['keyInWait'] = o['routeKey']('g2', 'y', t + 50);
        };
        const restartQuiet = await o['awaitRoadQuiet']('g2', 20_050);
        order['restart'] = { sleeps: [...sleeps], endedAt: t, quiet: restartQuiet };
        // 111 (iii): a session the attach never carried a key for waits for nothing.
        sleeps.length = 0;
        o['resetScrollOrderForTests'](clock, nowhere);
        const neverQuiet = await o['awaitRoadQuiet']('g3', 30_000);
        order['quiet'] = { sleeps: [...sleeps], quiet: neverQuiet };
      } catch (err) {
        order['waitThrew'] = err instanceof Error ? err.message : String(err);
      }

      // 111 (iv) to (vii): D3 over a scripted pane. The runner answers every read
      // from what the pane is NOW: copy mode entered by `copy-mode`, left by
      // `cancel`, and the program's screen and mouse as the case sets them,
      // changed by `after` once the FIRST read has been answered (the race).
      const pane = (program: { alt: 0 | 1; mouse: 0 | 1 }, o2: { inMode?: boolean; after?: { alt: 0 | 1; mouse: 0 | 1 } } = {}) => {
        const writes: string[][] = [];
        let inMode = o2.inMode === true;
        let reads = 0;
        let prog = { ...program };
        const run = Object.assign(
          (args: readonly string[]): Promise<string> => {
            const argv = [...args].map(String);
            writes.push(argv);
            if (argv[0] === 'copy-mode') inMode = true;
            if (argv.includes('cancel')) inMode = false;
            if (argv[0] === 'display-message') {
              const line = [inMode ? '1' : '0', inMode ? '3' : '', '4000', '40', String(prog.alt), String(prog.mouse), '150', inMode ? '4000' : ''].join(' ');
              reads += 1;
              if (reads === 1 && o2.after !== undefined) prog = { ...o2.after };
              return Promise.resolve(line);
            }
            return Promise.resolve('');
          },
          { ordered: true, server: 'machine:probe' }
        );
        return { run, writes };
      };
      const op = (run: unknown, target: string): Promise<unknown> => sc['scrollPaneBy'](run, target, 3);
      const d3: Record<string, unknown> = {};
      const attempt = async (label: string, p: ReturnType<typeof pane>): Promise<void> => {
        try {
          const a = await o['readBeforePark'](p.run, '$4', op);
          const writtenBeforeUndo = p.writes.length;
          const state = await o['undoRacedPark'](p.run, '$4', a);
          d3[label] = {
            outcome: a.outcome,
            writes: p.writes.map((w) => w.join(' ')),
            writtenBeforeUndo,
            undoWrote: p.writes.slice(writtenBeforeUndo).map((w) => w.join(' ')),
            inModeAfter: state.inMode
          };
        } catch (err) {
          d3[label] = { threw: err instanceof Error ? err.message : String(err) };
        }
      };
      await attempt('alternate screen', pane({ alt: 1, mouse: 0 }));
      await attempt('mouse asked', pane({ alt: 0, mouse: 1 }));
      await attempt('plain', pane({ alt: 0, mouse: 0 }));
      await attempt('already parked', pane({ alt: 0, mouse: 0 }, { inMode: true }));
      await attempt('raced', pane({ alt: 0, mouse: 0 }, { after: { alt: 1, mouse: 1 } }));
      // Phase 292's exception: a pane the person parked on ordinary lines, whose
      // program then took the screen, is NOT undone.
      try {
        const p = pane({ alt: 1, mouse: 1 }, { inMode: true });
        const state = await o['undoRacedPark'](p.run, '$4', { outcome: 'already', state: { inMode: true, innerAlt: true, innerMouse: true, position: 3, history: 4000, rows: 40, cols: 150, frameHistory: 4000 } });
        d3['already, program took the screen since'] = { undoWrote: p.writes.map((w) => w.join(' ')), inModeAfter: state.inMode };
      } catch (err) {
        d3['already, program took the screen since'] = { threw: err instanceof Error ? err.message : String(err) };
      }
      order['d3'] = d3;

      // 112, THE FIX ROUND, driven (build/p3201/SPEC.md §As built, fixer):
      // F1 the way back to the attach is an answer; F2 a key typed since the
      // scroll began drops the park at D3's read; F3 a pane Tortie parked goes
      // back to its program; F4 a key over a parked pane whose connection is
      // down is held, then written behind one cancel when it is back.
      const fix: Record<string, unknown> = {};
      try {
        const fixLines: string[] = [];
        const fixRead = { line: ['0', '', '4000', '40', '0', '0', '150', ''].join(' ') };
        const fixRun = Object.assign(
          (args: readonly string[]): Promise<string> => {
            fixLines.push([...args].map(String).join(' '));
            return Promise.resolve(args[0] === 'display-message' ? fixRead.line : '');
          },
          { ordered: true, server: 'machine:probe' }
        );
        let carriageKind: 'live' | 'waiting' = 'live';
        o['resetScrollOrderForTests'](clock, {
          address: () => ({ kind: 'live', machineId: 'm1', tmuxId: '$4' }),
          carriage: () => (carriageKind === 'live' ? { kind: 'live', run: fixRun, generation: 1 } : { kind: 'waiting' })
        });
        const parkedState = { inMode: true, innerAlt: false, innerMouse: false, position: 30, history: 4000, rows: 40, cols: 150, frameHistory: 4000 };
        // F1: over a parked pane a key takes the carriage; once its read has
        // answered "live" and nothing is in flight, the next key, ONE ms later
        // on the clock, takes the attach.
        t = 50_000;
        o['noteAnswer']('f1', parkedState);
        const f1First = o['routeKey']('f1', 'a', 50_000);
        const f1Busy = o['routeKey']('f1', 'b', 50_000);
        await new Promise((resolve) => setTimeout(resolve, 5));
        const f1After = o['routeKey']('f1', 'c', 50_001);
        fix['f1'] = { first: f1First, busy: f1Busy, after: f1After };
        // F2: a key typed after the scroll began drops the park at D3's read.
        fixLines.length = 0;
        let f2Parking = 0;
        const f2 = await o['readBeforePark'](fixRun, '$4', (run: unknown, target: string) => sc['scrollPaneBy'](run, target, 3), {
          stillWanted: () => false,
          parking: () => {
            f2Parking += 1;
          }
        }).then((a: { outcome: string }) => a, (err: unknown) => ({ outcome: `threw ${String(err)}` }));
        fix['f2'] = { outcome: f2.outcome, writes: [...fixLines], parking: f2Parking };
        // F3: a pane Tortie parked, whose program has since taken the mouse.
        fixLines.length = 0;
        o['noteAnswer']('f3', parkedState);
        o['noteParkedByUs']('f3');
        const took = { ...parkedState, innerMouse: true };
        const f3Ours = await o['leaveForProgram']('f3', o['stampedRunner']('f3', fixRun), '$4', took);
        const f3OursWrote = [...fixLines];
        fixLines.length = 0;
        o['noteAnswer']('f3b', parkedState);
        const f3NotOurs = await o['leaveForProgram']('f3b', fixRun, '$4', took);
        fix['f3'] = { oursWrote: f3OursWrote, oursInMode: f3Ours.inMode, notOursWrote: [...fixLines], notOursInMode: f3NotOurs.inMode };
        // F4: the carriage waiting over a parked pane holds the key and writes
        // nothing; the carriage back, the loop's next look writes it behind a cancel.
        fixLines.length = 0;
        sleeps.length = 0;
        carriageKind = 'waiting';
        o['noteAnswer']('f4', parkedState);
        const f4Road = o['routeKey']('f4', 'z', 60_000);
        const f4WroteWhileDown = fixLines.length;
        carriageKind = 'live';
        // The fake clock's sleep resolves at once, so the loop delivers on its next turn.
        await new Promise((resolve) => setTimeout(resolve, 20));
        fix['f4'] = { road: f4Road, wroteWhileDown: f4WroteWhileDown, afterBack: [...fixLines], slept: [...sleeps] };
        // F5, THE RULED ROUND (GONE): the machine missed its greeting, so its
        // carriage is none for the run. A key over a parked pane there is held,
        // asks that machine ONCE for one more connection (a second key joins
        // the same ask), and nothing is written while it is asked; when it is
        // back, both keys behind one cancel. A machine that may not be asked:
        // the attach, as today.
        fixLines.length = 0;
        let f5Asks = 0;
        let f5Back = false;
        o['resetScrollOrderForTests'](clock, {
          address: (sessionId: string) =>
            f5Back
              ? { kind: 'live', machineId: 'm1', tmuxId: sessionId === 'f5' ? '$4' : '$5' }
              : { kind: 'waiting', machineId: 'm1' },
          carriage: () => (f5Back ? { kind: 'live', run: fixRun, generation: 2 } : { kind: 'none' }),
          mayReopen: () => true,
          reopen: () => {
            f5Asks += 1;
            return Promise.resolve(true);
          }
        });
        o['noteAnswer']('f5', parkedState);
        o['noteAnswer']('f5c', parkedState);
        const f5Road = o['routeKey']('f5', 'z', 70_000);
        const f5Second = o['routeKey']('f5', 'y', 70_000);
        // Another session on the same machine, while that ask is being handed over: it joins it.
        const f5Other = o['routeKey']('f5c', 'x', 70_000);
        const f5WroteWhileGone = fixLines.length;
        const f5AsksWhileGone = f5Asks;
        f5Back = true;
        await new Promise((resolve) => setTimeout(resolve, 20));
        const f5AfterBack = [...fixLines];
        o['resetScrollOrderForTests'](clock, {
          address: () => ({ kind: 'waiting', machineId: 'm1' }),
          carriage: () => ({ kind: 'none' }),
          mayReopen: () => false,
          reopen: () => {
            f5Asks += 1;
            return Promise.resolve(true);
          }
        });
        o['noteAnswer']('f5b', parkedState);
        const f5Refused = o['routeKey']('f5b', 'z', 80_000);
        fix['f5'] = {
          road: f5Road,
          second: f5Second,
          other: f5Other,
          wroteWhileGone: f5WroteWhileGone,
          asks: f5AsksWhileGone,
          afterBack: f5AfterBack,
          refused: f5Refused,
          asksAfterRefused: f5Asks
        };
      } catch (err) {
        fix['threw'] = err instanceof Error ? err.message : String(err);
      }
      order['fix'] = fix;

      // 123, driven (Phase 337, build/p337/SPEC.md D20): the phone's keys to a
      // session on another machine. Over a RECORDING runner, what is written
      // BEFORE typePhoneKeys returns (no await, so all of it), in order: one
      // cancel, each item's commands, the road's read; and over a carriage or
      // an address that is not live, nothing at all.
      const phoneKeys: Record<string, unknown> = { present: typeof o['typePhoneKeys'] === 'function' };
      if (typeof o['typePhoneKeys'] === 'function') {
        try {
          const pkLines: string[][] = [];
          const pkRun = Object.assign(
            (args: readonly string[]): Promise<string> => {
              pkLines.push([...args].map(String));
              return Promise.resolve(args[0] === 'display-message' ? ['0', '', '4000', '40', '0', '0', '150', ''].join(' ') : '');
            },
            { ordered: true, server: 'machine:probe' }
          );
          let pkCarriage: 'live' | 'waiting' | 'none' = 'live';
          let pkAddress: 'live' | 'waiting' = 'live';
          o['resetScrollOrderForTests'](clock, {
            address: () => (pkAddress === 'live' ? { kind: 'live', machineId: 'm7', tmuxId: '$4' } : { kind: 'waiting', machineId: 'm7' }),
            carriage: () => (pkCarriage === 'live' ? { kind: 'live', run: pkRun, generation: 1 } : { kind: pkCarriage })
          });
          const drive = (label: string, keys: unknown[]): Record<string, unknown> => {
            pkLines.length = 0;
            const road = o['typePhoneKeys'](`pk-${label}`, keys);
            const wroteBeforeReturn = pkLines.map((argv) => [...argv]);
            return { label, road, wrote: wroteBeforeReturn, verdicts: wroteBeforeReturn.map((argv) => verdictOf(argv)) };
          };
          const rows = [
            drive('up', [{ k: 'Up' }]),
            drive('ctrl-c', [{ k: 'C-c' }]),
            drive('text and backspace', [{ t: 'hi é' }, { k: 'BSpace' }, { t: '日本' }]),
            drive('300 bytes of text', [{ t: 'x'.repeat(300) }])
          ];
          pkCarriage = 'waiting';
          const waiting = drive('carriage waiting', [{ k: 'Enter' }]);
          pkCarriage = 'none';
          const none = drive('no carriage', [{ k: 'Enter' }]);
          pkCarriage = 'live';
          pkAddress = 'waiting';
          const noAddress = drive('address waiting', [{ k: 'Enter' }]);
          pkAddress = 'live';
          await new Promise((resolve) => setTimeout(resolve, 10));
          phoneKeys['rows'] = rows;
          phoneKeys['refused'] = [waiting, none, noAddress];
        } catch (err) {
          phoneKeys['threw'] = err instanceof Error ? err.message : String(err);
        }
      }
      order['phoneKeys'] = phoneKeys;
      for (const name of ['keysSoFar', 'leaveForProgram', 'noteParkedByUs', 'awaitsReopen']) {
        if (typeof o[name] !== 'function') (order['missing'] as string[]).push(name);
      }

      // 110, driven: a key over a pane known parked is WRITTEN before routeKey
      // returns, cancel then the bytes then a read, on the session's carriage;
      // a key at rest writes nothing and takes the attach. EVERYTHING the
      // module prints while it routes the two keys is caught and handed to the
      // checker, which holds that no byte of either key is in it: the person's
      // keystrokes never reach a log.
      const printed: string[] = [];
      const realOut = process.stdout.write.bind(process.stdout);
      const realErr = process.stderr.write.bind(process.stderr);
      const catcher = ((chunk: unknown): boolean => {
        printed.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk as Uint8Array).toString('utf8'));
        return true;
      }) as typeof process.stdout.write;
      process.stdout.write = catcher;
      process.stderr.write = catcher;
      try {
        const lines: string[][] = [];
        const rec = Object.assign(
          (args: readonly string[]): Promise<string> => {
            lines.push([...args].map(String));
            return Promise.resolve(args[0] === 'display-message' ? ['0', '', '4000', '40', '0', '0', '150', ''].join(' ') : '');
          },
          { ordered: true, server: 'machine:probe' }
        );
        o['resetScrollOrderForTests'](clock, {
          address: () => ({ kind: 'live', machineId: 'm1', tmuxId: '$4' }),
          carriage: () => ({ kind: 'live', run: rec, generation: 1 })
        });
        t = 40_000;
        const atRest = o['routeKey']('k1', 'ø', 40_000);
        const atRestWrote = lines.length;
        o['noteAnswer']('k1', { inMode: true, innerAlt: false, innerMouse: false, position: 30, history: 4000, rows: 40, cols: 150, frameHistory: 4000 });
        const parkedRoad = o['routeKey']('k1', 'é', 41_000);
        const syncLines = lines.slice(atRestWrote).map((w) => w.join(' '));
        // The typed sequence settles on the next turns: whatever it prints then
        // is caught too.
        await new Promise((resolve) => setTimeout(resolve, 20));
        order['route'] = { atRest, atRestWrote, parkedRoad, syncLines };
      } catch (err) {
        order['route'] = { threw: err instanceof Error ? err.message : String(err) };
      } finally {
        process.stdout.write = realOut;
        process.stderr.write = realErr;
      }
      order['printed'] = printed.join('');
      try {
        o['resetScrollOrderForTests']();
      } catch {
        /* the shipping clock and source back, or the next run starts clean anyway */
      }
    }
  }

  // --- 107, the copy on a machine ------------------------------------------------
  const historyArgs = fn<(target: string, range: { start: number; end: number }, join: boolean) => unknown>(
    historyMod,
    'remoteHistoryArgs'
  );
  const history: Record<string, unknown> = {
    file: historyFile,
    extentFormat: historyMod !== null && typeof historyMod['REMOTE_EXTENT_FORMAT'] === 'string' ? historyMod['REMOTE_EXTENT_FORMAT'] : null
  };
  if (historyArgs !== null) {
    try {
      history['joined'] = historyArgs('$3', { start: -40, end: 5 }, true);
      history['drawn'] = historyArgs('$3', { start: -40, end: 5 }, false);
    } catch (err) {
      history['threw'] = err instanceof Error ? err.message : String(err);
    }
  }

  return {
    loadErrors,
    controlPlaneExports: planeMod === null ? null : Object.keys(planeMod).sort(),
    shapes,
    shapesPresent: rawShapes !== null,
    chunkLines: CHUNK,
    recorded,
    recordErrors,
    hostile,
    format,
    address,
    runner,
    history,
    read107,
    typed,
    typeKey,
    order
  };
})();

// ---------------------------------------------------------------------------
// PHASE 336, conditions 113 to 121. Saving in a project on another machine the
// way it is saved on this Mac (build/p336/SPEC.md §8.1).
// ---------------------------------------------------------------------------
//
// THE MODULES THIS BLOCK LOADS, said here rather than left to be noticed.
// `src/shared/remote-write-folder.ts` is pure and imports nothing. The two
// copy modules and the two containment helpers are pure. `machine-state.ts`'s
// `machineStateViewOf` is pure. `project-roots.ts` imports a type and, lazily,
// the core, which this block never calls. `guarded-write.ts`'s `writeGuarded`
// is DRIVEN once, against a scratch folder under the system temporary
// directory made and removed here, with the project list handed to it as a
// function: it writes into that scratch folder and nowhere else, and starts
// nothing. `write-folder.ts` is NOT loaded: it reaches the manifest and the
// confirm record, which a plain node cannot open, so the gate reads it as text
// and its vitest file drives it.
const p336 = await (async () => {
  const loadErrors: Record<string, string> = {};
  const load = optionalLoader(loadErrors);
  const fnOf = <T>(mod: Record<string, unknown> | null, name: string): T | null =>
    mod !== null && typeof mod[name] === 'function' ? (mod[name] as T) : null;
  const tryIt = <T>(f: () => T): { value: T | null; threw: string | null } => {
    try {
      return { value: f(), threw: null };
    } catch (err) {
      return { value: null, threw: err instanceof Error ? err.message : String(err) };
    }
  };

  const shared = await load('shared', 'src/shared/remote-write-folder.ts');
  const fileMod = await load('remoteFile', 'src/main/machines/remote-file.ts');
  const stageMod = await load('remoteStage', 'src/main/machines/remote-stage.ts');
  const runMod = await load('remoteRun', 'src/main/machines/remote-run.ts');
  const copyMod = await load('remoteCopy', 'src/main/machines/remote-copy.ts');
  const stateMod = await load('machineState', 'src/main/machines/machine-state.ts');
  const rootsMod = await load('projectRoots', 'src/main/fs/project-roots.ts');
  const guardedMod = await load('guardedWrite', 'src/main/fs/guarded-write.ts');
  const scriptsMod = await load('remoteScripts', 'src/main/machines/remote-scripts.ts');
  const sharedMachines = await load('sharedMachines', 'src/shared/machines.ts');
  const editorCopy = await load('editorCopy', 'src/renderer/machines/editor.ts');
  const explorerCopy = await load('explorerCopy', 'src/renderer/machines/explorer.ts');
  const scmCopy = await load('scmCopy', 'src/renderer/machines/scm.ts');
  // PHASE 336'S FIX ROUND. The sheet that opens a folder on a machine and
  // Home's row for it said "Tortie writes there only where you have let it
  // save" after this phase removed that act; no module the scan read drew it.
  const projectTabCopy = await load('projectTabCopy', 'src/renderer/machines/project-tab.ts');

  type Pick = { path?: string; kind?: string; refused?: string };
  const pick = fnOf<(t: string, c: { projects: readonly string[]; legacyRoot: string | null }, m: string) => Pick>(shared, 'pickWriteFolder');
  const pickPair = fnOf<(f: string, t: string, c: { projects: readonly string[]; legacyRoot: string | null }) => Pick>(shared, 'pickWriteFolderForPair');
  const never = fnOf<(p: string) => boolean>(shared, 'neverWriteFolder');
  const fold = fnOf<(s: string) => string>(shared, 'foldReservedSegment');
  const isProtected = fnOf<(r: string) => boolean>(shared, 'isProtectedRemotePath');
  const relIn = fnOf<(f: string, t: string, m: string) => string | null>(shared, 'relativeInFolder');
  const relUnder = fnOf<(r: string, p: string) => string | null>(fileMod, 'relativeUnderRoot');
  const relCwd = fnOf<(r: string, p: string) => string | null>(stageMod, 'rootRelativeCwd');

  // --- 113. D2's corpus, its EXPECTED answers written here from the spec ----
  //
  // Every expected value below is this file's own, taken from
  // build/p336/SPEC.md D2 and §Attack G4, and never read from the module it
  // judges. `legacy` is the machine's `writeRoot`; `projects` is that machine's
  // open project rows, and ONLY that machine's (another machine's rows are
  // absent by construction, which is D3).
  const CORPUS: readonly {
    name: string;
    target: string;
    projects: readonly string[];
    legacy: string | null;
    mode: 'file' | 'folder';
    want: Pick;
  }[] = [
    { name: 'nested projects, the deepest holds', target: '/srv/a/b/x.ts', projects: ['/srv/a', '/srv/a/b'], legacy: null, mode: 'file', want: { path: '/srv/a/b', kind: 'project' } },
    { name: 'nested projects, the outer alone holds', target: '/srv/a/y.ts', projects: ['/srv/a/b', '/srv/a'], legacy: null, mode: 'file', want: { path: '/srv/a', kind: 'project' } },
    { name: 'a legacy root holding a project is chosen first (G4)', target: '/srv/a/x.ts', projects: ['/srv/a'], legacy: '/srv', mode: 'file', want: { path: '/srv', kind: 'legacy' } },
    { name: 'a legacy root alone', target: '/opt/w/f', projects: [], legacy: '/opt/w', mode: 'file', want: { path: '/opt/w', kind: 'legacy' } },
    { name: 'a legacy root that does not hold leaves the project', target: '/srv/a/f', projects: ['/srv/a'], legacy: '/opt/w', mode: 'file', want: { path: '/srv/a', kind: 'project' } },
    { name: 'a legacy root at a home is not never-listed (D16)', target: '/Users/gdc/x', projects: [], legacy: '/Users/gdc', mode: 'file', want: { path: '/Users/gdc', kind: 'legacy' } },
    { name: '/a/bx is not under /a/b', target: '/a/bx/f', projects: ['/a/b'], legacy: null, mode: 'file', want: { refused: 'outside' } },
    { name: 'a stored path holding . crosses byte for byte', target: '/srv/c/f.ts', projects: ['/srv/./c'], legacy: null, mode: 'file', want: { path: '/srv/./c', kind: 'project' } },
    { name: 'a stored path holding // crosses byte for byte', target: '/srv/d/f', projects: ['/srv//d'], legacy: null, mode: 'file', want: { path: '/srv//d', kind: 'project' } },
    { name: 'a stored path holding .. crosses byte for byte', target: '/srv/f/g.ts', projects: ['/srv/e/../f'], legacy: null, mode: 'file', want: { path: '/srv/e/../f', kind: 'project' } },
    { name: 'file mode refuses the folder itself', target: '/srv/a', projects: ['/srv/a'], legacy: null, mode: 'file', want: { refused: 'outside' } },
    { name: 'folder mode accepts the folder itself', target: '/srv/a', projects: ['/srv/a'], legacy: null, mode: 'folder', want: { path: '/srv/a', kind: 'project' } },
    { name: 'a never-listed project alone holds it', target: '/Users/gdc/x.ts', projects: ['/Users/gdc'], legacy: null, mode: 'file', want: { refused: 'never', path: '/Users/gdc' } },
    { name: 'a home child is a project like any other (§16 Q1, narrowed by Phase 336.1)', target: '/Users/gdc/gmux/x', projects: ['/Users/gdc/gmux'], legacy: null, mode: 'file', want: { path: '/Users/gdc/gmux', kind: 'project' } },
    { name: 'a folder holding a home is never-listed', target: '/Users/gdc/x', projects: ['/Users'], legacy: null, mode: 'file', want: { refused: 'never', path: '/Users' } },
    { name: 'a folder directly under / is a project like any other (Phase 336.1)', target: '/workspace/x', projects: ['/workspace'], legacy: null, mode: 'file', want: { path: '/workspace', kind: 'project' } },
    { name: 'nested with the outer never-listed, the inner holds', target: '/Users/gdc/code/p/x', projects: ['/Users/gdc', '/Users/gdc/code/p'], legacy: null, mode: 'file', want: { path: '/Users/gdc/code/p', kind: 'project' } },
    { name: 'nested with the outer never-listed, the outer alone holds', target: '/Users/gdc/y', projects: ['/Users/gdc', '/Users/gdc/code/p'], legacy: null, mode: 'file', want: { refused: 'never', path: '/Users/gdc' } },
    { name: 'a project inside a reserved folder is never-listed', target: '/srv/r/.git/config', projects: ['/srv/r/.git'], legacy: null, mode: 'file', want: { refused: 'never', path: '/srv/r/.git' } },
    { name: 'no project at all', target: '/x', projects: [], legacy: null, mode: 'file', want: { refused: 'outside' } },
    { name: 'a relative target', target: 'srv/a/x', projects: ['/srv/a'], legacy: null, mode: 'file', want: { refused: 'outside' } },
    { name: 'a target that climbs out with ..', target: '/srv/a/../b/x', projects: ['/srv/a'], legacy: null, mode: 'file', want: { refused: 'outside' } }
  ];
  const PAIRS: readonly { name: string; from: string; to: string; projects: readonly string[]; legacy: string | null; want: Pick }[] = [
    { name: 'a rename within one project', from: '/srv/a/x', to: '/srv/a/y', projects: ['/srv/a'], legacy: null, want: { path: '/srv/a', kind: 'project' } },
    { name: 'across two nested projects, held by the outer', from: '/srv/a/b/x', to: '/srv/a/y', projects: ['/srv/a', '/srv/a/b'], legacy: null, want: { path: '/srv/a', kind: 'project' } },
    { name: 'both ends in the inner, held by the inner', from: '/srv/a/b/x', to: '/srv/a/b/y', projects: ['/srv/a', '/srv/a/b'], legacy: null, want: { path: '/srv/a/b', kind: 'project' } },
    { name: 'across two unrelated projects, refused', from: '/srv/a/x', to: '/srv/c/y', projects: ['/srv/a', '/srv/c'], legacy: null, want: { refused: 'outside' } }
  ];
  const corpus = CORPUS.map((row) => ({
    ...row,
    ...(pick === null ? { got: null, threw: 'pickWriteFolder is not exported' } : (() => {
      const r = tryIt(() => pick(row.target, { projects: row.projects, legacyRoot: row.legacy }, row.mode));
      return { got: r.value, threw: r.threw };
    })())
  }));
  const pairs = PAIRS.map((row) => ({
    ...row,
    ...(pickPair === null ? { got: null, threw: 'pickWriteFolderForPair is not exported' } : (() => {
      const r = tryIt(() => pickPair(row.from, row.to, { projects: row.projects, legacyRoot: row.legacy }));
      return { got: r.value, threw: r.threw };
    })())
  }));
  // The agreement corpus: the shared function and main's two containment
  // helpers, over every pair of these folders and targets.
  const AGREE_FOLDERS = ['/srv/a', '/', '/srv/./c', '/srv//d', '/srv/e/../f', '/srv/a/', '/opt/w'];
  const AGREE_TARGETS = ['/srv/a', '/srv/a/x', '/srv/ax', '/srv/a/b/c.ts', '/srv/c/x', '/srv/f/g', '/x', 'rel/x', '/srv/a/../a/x', '/srv/a/.', '/srv/a//x', '/opt/w/f', '/'];
  const agree: { folder: string; folderNever: unknown; target: string; sharedFile: unknown; mainFile: unknown; sharedFolder: unknown; mainFolder: unknown; pickFile: unknown; pickFolder: unknown }[] = [];
  if (relIn !== null && relUnder !== null && relCwd !== null && pick !== null) {
    for (const folder of AGREE_FOLDERS) {
      for (const target of AGREE_TARGETS) {
        const pf = tryIt(() => pick(target, { projects: [folder], legacyRoot: null }, 'file')).value;
        const pd = tryIt(() => pick(target, { projects: [folder], legacyRoot: null }, 'folder')).value;
        agree.push({
          folder,
          folderNever: never === null ? null : tryIt(() => never(folder)).value,
          target,
          sharedFile: tryIt(() => relIn(folder, target, 'file')).value,
          mainFile: tryIt(() => relUnder(folder, target)).value,
          sharedFolder: tryIt(() => relIn(folder, target, 'folder')).value,
          mainFolder: tryIt(() => relCwd(folder, target)).value,
          pickFile: pf !== null && typeof pf.path === 'string' && pf.refused === undefined,
          pickFolder: pd !== null && typeof pd.path === 'string' && pd.refused === undefined
        });
      }
    }
  }

  // --- 114. The catalogue's bounds, and the two doors driven ----------------
  const rawScripts = scriptsMod !== null && Array.isArray(scriptsMod['REMOTE_SCRIPTS'])
    ? (scriptsMod['REMOTE_SCRIPTS'] as Record<string, unknown>[])
    : [];
  const catalogue = rawScripts.map((row) => ({
    id: String(row['id']),
    mode: String(row['mode']),
    params: Number(row['params']),
    bound: row['bound'] === undefined ? null : String(row['bound']),
    folderArg: typeof row['folderArg'] === 'number' ? (row['folderArg'] as number) : null,
    hasFolderArg: Object.prototype.hasOwnProperty.call(row, 'folderArg')
  }));
  // THE DOORS, DRIVEN. A fake context names a machine this process has never
  // heard of, so the link gate (step 4 of runRemoteScript) refuses it with the
  // not-connected sentence before anything is composed or sent. That refusal
  // is the CONTROL: a refusal of a folder-bound id through the machine door,
  // or of a machine-bound id through the folder door, must come BEFORE it and
  // so must carry a different sentence. A door that forgot its check falls
  // through to step 4 and reads exactly like the control.
  const FAKE_CTX = { kind: 'remote', machineId: 'p336-conformance-nowhere', label: 'P336 nowhere' } as unknown;
  const runWrite = fnOf<(ctx: unknown, id: string, args: readonly string[]) => Promise<unknown>>(runMod, 'runRemoteWrite');
  const runFolder = fnOf<(ctx: unknown, folder: unknown, id: string, args: readonly string[]) => Promise<unknown>>(runMod, 'runFolderWrite');
  const refusalOf = async (f: () => Promise<unknown>): Promise<{ threw: boolean; message: string }> => {
    try {
      await f();
      return { threw: false, message: '' };
    } catch (err) {
      // A GmuxError's message is its JSON payload; the sentence a person reads
      // is that payload's own `message`, which is what the gate compares.
      const raw = err instanceof Error ? err.message : String(err);
      let sentence = raw;
      try {
        const parsed = JSON.parse(raw) as { message?: unknown };
        if (typeof parsed.message === 'string') sentence = parsed.message;
      } catch {
        /* a plain Error: its message is the sentence */
      }
      return { threw: true, message: sentence };
    }
  };
  const argsOfLength = (n: number): string[] => Array.from({ length: n }, (_, i) => (i === 0 ? '/srv/p336' : `v${String(i)}`));
  const doors: Record<string, unknown> = {};
  if (runWrite !== null) {
    const image = catalogue.find((row) => row.id === 'image-put');
    doors['control'] = await refusalOf(() => runWrite(FAKE_CTX, 'image-put', argsOfLength(image?.params ?? 2)));
    doors['folderThroughMachineDoor'] = await Promise.all(
      catalogue
        .filter((row) => row.mode === 'write' && row.bound === 'folder')
        .map(async (row) => ({ id: row.id, ...(await refusalOf(() => runWrite(FAKE_CTX, row.id, argsOfLength(row.params)))) }))
    );
    // The same count WITHOUT the pin, which is what a caller that bypassed
    // runFolderWrite would hand the machine door.
    doors['folderThroughMachineDoorShort'] = await Promise.all(
      catalogue
        .filter((row) => row.mode === 'write' && row.bound === 'folder')
        .map(async (row) => ({ id: row.id, ...(await refusalOf(() => runWrite(FAKE_CTX, row.id, argsOfLength(Math.max(0, row.params - 1))))) }))
    );
  }
  if (runFolder !== null) {
    // A WriteFolder made here. Its brand is a TYPE: at run time any object
    // with these fields is what the door is handed, which is what lets the
    // door's own checks be driven rather than read.
    const folder = { machineId: 'p336-conformance-nowhere', row: null, path: '/srv/p336', kind: 'project', pin: '1:2' };
    doors['machineThroughFolderDoor'] = await Promise.all(
      catalogue
        .filter((row) => row.mode === 'write' && row.bound === 'machine')
        .map(async (row) => ({ id: row.id, ...(await refusalOf(() => runFolder(FAKE_CTX, folder, row.id, argsOfLength(row.params)))) }))
    );
    doors['mismatchedFolder'] = await Promise.all(
      catalogue
        .filter((row) => row.mode === 'write' && row.bound === 'folder' && row.folderArg !== null)
        .map(async (row) => {
          const args = argsOfLength(row.params - 1).map((v, i) => (i === row.folderArg ? '/srv/somewhere-else' : v));
          return { id: row.id, ...(await refusalOf(() => runFolder(FAKE_CTX, folder, row.id, args))) };
        })
    );
    // The control for the folder door: the right folder, so it reaches the
    // link gate and is refused there.
    doors['folderControl'] = await Promise.all(
      catalogue
        .filter((row) => row.mode === 'write' && row.bound === 'folder' && row.folderArg !== null)
        .map(async (row) => {
          const args = argsOfLength(row.params - 1).map((v, i) => (i === row.folderArg ? '/srv/p336' : v));
          return { id: row.id, ...(await refusalOf(() => runFolder(FAKE_CTX, folder, row.id, args))) };
        })
    );
  }
  const sentences = Object.fromEntries(
    ['FOLDER_SCRIPT_THROUGH_MACHINE_DOOR', 'MACHINE_SCRIPT_THROUGH_FOLDER_DOOR', 'WRITE_THROUGH_READ_DOOR', 'MACHINE_NOT_CONNECTED']
      .map((name) => [name, copyMod !== null && typeof copyMod[name] === 'string' ? (copyMod[name] as string) : null])
  );

  // --- 116. D4's table, both ways, written here from the spec ---------------
  // Phase 336.1 (his ruling of 2026-10-05, "Yes, fix it now"): only a home
  // itself, a folder holding one and / are never-listed; a home's direct child
  // and a direct child of / are projects like any other, and the reserved
  // names are refused wherever they stand.
  const NEVER_ROWS: readonly [string, boolean][] = [
    ['/', true], ['/Users', true], ['/home', true], ['/Users/gdc', true], ['/home/gdc', true], ['/root', true],
    ['/var/root', true], ['/Users/Shared', true],
    ['/Users/gdc/./', true], ['/Users/gdc/code/..', true], ['/srv/./../Users/gdc', true], ['/home/gdc/x/../..', true],
    ['/srv/a/.git', true], ['/srv/a/.SSH/b', true], ['/srv/a/.ßh', true], ['/Users/gdc/.ssh', true], ['/home/gdc/.Git', true],
    ['/root/.ẞh', true], ['relative/x', true],
    ['/Users/gdc/code', false], ['/Users/gdc/gmux', false], ['/Users/gdc/dev', false], ['/home/gdc/x', false],
    ['/root/x', false], ['/var/root/x', false], ['/Users/Shared/x', false], ['/Users/gdc/.config', false],
    ['/tmp', false], ['/workspace', false], ['/opt', false], ['/srv', false],
    ['/var/www/site', false], ['/tmp/x', false], ['/private/tmp/x', false], ['/Users/x/code/p', false],
    ['/srv/a', false], ['/opt/me', false], ['/Users/gdc/code/p/q', false], ['/home/gdc/a/b', false], ['/var/rootx/a', false]
  ];
  const neverRows = NEVER_ROWS.map(([path, want]) => ({ path, want, got: never === null ? null : tryIt(() => never(path)).value }));

  // --- 117. The fold, written here from §Attack M5 --------------------------
  const FOLD_ROWS: readonly [string, boolean][] = [
    ['.git', true], ['.GIT', true], ['.Git', true], ['.gIT', true], ['.ssh', true], ['.SSH', true], ['.Ssh', true],
    ['.ßh', true], ['.ſsh', true], ['.sſh', true], ['.ſſh', true], ['.ẞh', true], ['.g‌it', true], ['.git‍', true],
    ['.github', false], ['x.git', false], ['.gitignore', false], ['.gıt', false], ['.config', false], ['.gitkeep', false],
    ['git', false], ['ssh', false], ['.sshd', false], ['.ssh.bak', false], ['notes..md', false]
  ];
  const foldRows = FOLD_ROWS.map(([segment, want]) => {
    const folded = fold === null ? null : tryIt(() => fold(segment)).value;
    return { segment, want, folded, reserved: folded === '.git' || folded === '.ssh' };
  });
  const PROTECTED_ROWS: readonly [string, boolean][] = [
    ['.GIT/config', true], ['.Git/hooks/x', true], ['.gIT/x', true], ['a/.sSH/b', true], ['.SSH/README.md', true],
    ['.Ssh/x', true], ['.ßh/x', true], ['.ſsh/x', true], ['x/.ẞh', true], ['.GIT', true],
    ['.github/x', false], ['src/x.git', false], ['.gitignore', false], ['a/.gıt/b', false], ['docs/notes..md', false], ['', false]
  ];
  const protectedRows = PROTECTED_ROWS.map(([rel, want]) => ({ rel, want, got: isProtected === null ? null : tryIt(() => isProtected(rel)).value }));

  // --- 119. The local readers' filter, and the SHIPPING writeGuarded --------
  const localRootsOf = fnOf<(rows: readonly { path: string; machineId?: string }[]) => string[]>(rootsMod, 'localRootsOf');
  const filterRows = localRootsOf === null ? null : tryIt(() =>
    localRootsOf([
      { path: '/Users/me/local-a' },
      { path: '/Users/me/local-b', machineId: 'local' },
      { path: '/Users/me/remote-a', machineId: 'pop-os' },
      { path: '/Users/me/remote-b', machineId: '' }
    ])
  ).value;
  const writeGuarded = fnOf<(deps: { listProjectRoots(): Promise<readonly string[]> }, input: unknown) => Promise<{ outcome: string; why?: string }>>(guardedMod, 'writeGuarded');
  const guarded: Record<string, unknown> = {};
  if (writeGuarded !== null && localRootsOf !== null) {
    const { mkdtempSync, writeFileSync: write, rmSync, readFileSync: read } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { createHash } = await import('node:crypto');
    const dir = mkdtempSync(join(tmpdir(), 'p336-guarded-'));
    try {
      write(join(dir, 'x.txt'), 'before\n');
      const expect = createHash('sha256').update('before\n').digest('hex');
      const remoteRows = [{ path: dir, machineId: 'pop-os' }];
      const asRemote = await writeGuarded(
        { listProjectRoots: async () => localRootsOf(remoteRows) },
        { root: dir, path: 'x.txt', contents: 'REMOTE ROW\n', expect }
      ).catch((err: unknown) => ({ outcome: 'threw', why: String(err) }));
      guarded['remoteRow'] = { outcome: asRemote.outcome, why: (asRemote as { why?: string }).why ?? null, after: read(join(dir, 'x.txt'), 'utf8') };
      const asLocal = await writeGuarded(
        { listProjectRoots: async () => localRootsOf([{ path: dir }]) },
        { root: dir, path: 'x.txt', contents: 'LOCAL ROW\n', expect }
      ).catch((err: unknown) => ({ outcome: 'threw', why: String(err) }));
      guarded['localRow'] = { outcome: asLocal.outcome, why: (asLocal as { why?: string }).why ?? null, after: read(join(dir, 'x.txt'), 'utf8') };
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  // --- 120. The row keys, read from the module rather than remembered -------
  const machineRowKeys = sharedMachines !== null && Array.isArray(sharedMachines['MACHINE_ROW_KEYS'])
    ? [...(sharedMachines['MACHINE_ROW_KEYS'] as string[])]
    : null;
  // The write sentences, called with a fixed label. Every exported function
  // of the four renderer copy modules (the three write surfaces and, since the
  // fix round, the open sheet and Home's row in project-tab.ts) is called with
  // the label in every string position and with each outcome word a refusal
  // could carry, and every string export is read as it stands.
  const LABEL = 'P336 Machine';
  const OUTCOMES = ['writesOff', 'outsideRoot', 'folderChanged', 'protected', 'never', 'unconfirmed', 'outside', 'refused', 'stale', 'missing', 'exists', 'unsure', 'nosum', 'nomode', 'tooLarge', 'noparent', 'denied', 'gone', 'moved', 'done', 'failed'];
  const drawn: { module: string; name: string; text: string }[] = [];
  for (const [module, mod] of [['src/renderer/machines/editor.ts', editorCopy], ['src/renderer/machines/explorer.ts', explorerCopy], ['src/renderer/machines/scm.ts', scmCopy], ['src/renderer/machines/project-tab.ts', projectTabCopy]] as const) {
    if (mod === null) continue;
    for (const [name, value] of Object.entries(mod)) {
      if (typeof value === 'string') {
        drawn.push({ module, name, text: value });
        continue;
      }
      if (typeof value !== 'function') continue;
      const f = value as (...a: unknown[]) => unknown;
      const shapes: unknown[][] = [
        [LABEL], [LABEL, LABEL], [LABEL, LABEL, LABEL], [90_001, LABEL], ['/srv/p336', LABEL],
        ...OUTCOMES.map((o) => [o, LABEL]), ...OUTCOMES.map((o) => [{ kind: o, refused: o, outcome: o, folder: '/srv/p336' }, LABEL])
      ];
      for (const args of shapes.slice(0, Math.max(1, f.length === 0 ? 1 : shapes.length))) {
        const r = tryIt(() => f(...args));
        if (typeof r.value === 'string' && r.value.length > 0) drawn.push({ module, name, text: r.value });
      }
    }
  }
  // remote-copy.ts's commit set: every export whose name says commit.
  if (copyMod !== null) {
    for (const [name, value] of Object.entries(copyMod)) {
      if (!/commit/i.test(name)) continue;
      if (typeof value === 'string') drawn.push({ module: 'src/main/machines/remote-copy.ts', name, text: value });
      else if (typeof value === 'function') {
        for (const args of [[LABEL], [LABEL, LABEL], ['/srv/p336', LABEL]]) {
          const r = tryIt(() => (value as (...a: unknown[]) => unknown)(...args));
          if (typeof r.value === 'string') drawn.push({ module: 'src/main/machines/remote-copy.ts', name, text: r.value });
        }
      }
    }
  }

  // --- 121. The view a changed row draws, driven ----------------------------
  const viewOf = fnOf<(row: unknown, facts: unknown) => { savesInProjects?: boolean; writeRoot?: string | null }>(stateMod, 'machineStateViewOf');
  const views: Record<string, unknown> = {};
  if (viewOf !== null) {
    const row0 = { id: 'pop-os', label: 'Pop OS', color: 'blue', refusal: null, changed: false, writeRoot: null };
    const read = (row: unknown) => {
      const r = tryIt(() => viewOf(row, undefined));
      return r.value === null ? { threw: r.threw } : { savesInProjects: r.value.savesInProjects ?? null, writeRoot: r.value.writeRoot ?? null };
    };
    views['confirmed'] = read({ ...row0, confirmed: true });
    views['changed'] = read({ ...row0, confirmed: false, changed: true, refusal: 'the gate refused it' });
    views['never'] = read({ ...row0, confirmed: false, refusal: 'nobody confirmed it' });
    views['changedWithRoot'] = read({ ...row0, confirmed: false, changed: true, refusal: 'the gate refused it', writeRoot: '/srv/legacy' });
    views['confirmedWithRoot'] = read({ ...row0, confirmed: true, writeRoot: '/srv/legacy' });
  }

  return {
    loadErrors,
    corpus,
    pairs,
    agree,
    catalogue,
    doors,
    sentences,
    neverRows,
    foldRows,
    protectedRows,
    filterRows,
    guarded,
    machineRowKeys,
    drawn,
    views,
    hashes: {
      none: base,
      gdc: machineExecutionHash(ID, { ...BASE, writeRoot: '/Users/gdc' }),
      code: machineExecutionHash(ID, { ...BASE, writeRoot: '/Users/gdc/code' })
    }
  };
})();

// ---------------------------------------------------------------------------
// Phase 340, conditions 125 to 139. Adding a machine in three steps.
// ---------------------------------------------------------------------------
//
// THE MODULES THIS BLOCK LOADS, said here rather than left to be noticed.
// `check-script.ts` is pure and imports the quoting helper and a marker.
// `connection-test.ts` is already loaded above for condition 8; only its pure
// composers are CALLED here (`composeTestArgv` with and without a key, and
// `checkViewOf` is left to build/p340/far-check.mts, which drives the runner).
// `errors.ts` is pure. `src/renderer/settings/machine-status.ts` is pure and
// imports the copy module, which imports types only. `machine-menu.ts` is the
// renderer's menu table: it is loaded LAST with a bare `window` object put in
// place only if none exists, because the module registers its probe hook on
// the window when it is imported, and the shim is taken away again at once. No
// command runs, no file is written and nothing is spawned by any of them; the
// shells this phase drives are build/p340/far-check.mts's, which the checker
// starts itself.
const p340 = await (async () => {
  const loadErrors: Record<string, string> = {};
  const load = optionalLoader(loadErrors);
  const fnOf = <T>(mod: Record<string, unknown> | null, name: string, key: string): T | null => {
    if (mod === null) return null;
    if (typeof mod[name] !== 'function') {
      loadErrors[`${key}.${name}`] = `${key} exports no function ${name}`;
      return null;
    }
    return mod[name] as T;
  };
  const tryIt = <T>(f: () => T): { value: T | null; threw: string | null } => {
    try {
      return { value: f(), threw: null };
    } catch (err) {
      return { value: null, threw: err instanceof Error ? err.message : String(err) };
    }
  };

  const checkMod = await load('check-script', 'src/main/machines/check-script.ts');
  const testMod = await load('connection-test', 'src/main/machines/connection-test.ts');
  const errorsMod = await load('errors', 'src/main/machines/errors.ts');
  const statusMod = await load('machine-status', 'src/renderer/settings/machine-status.ts');

  // --- 125 and 126: the text and how it reaches ssh -------------------------
  const texts = (() => {
    if (checkMod === null) return null;
    const compose = fnOf<(t: string | null) => string>(checkMod, 'composeCheckCommand', 'check-script');
    const script = typeof checkMod['CHECK_SCRIPT'] === 'string' ? (checkMod['CHECK_SCRIPT'] as string) : null;
    const probeText = typeof checkMod['LOGIN_PATH_PROBE'] === 'string' ? (checkMod['LOGIN_PATH_PROBE'] as string) : null;
    const folders = Array.isArray(checkMod['REMOTE_TMUX_INSTALL_FOLDERS']) ? (checkMod['REMOTE_TMUX_INSTALL_FOLDERS'] as string[]) : null;
    return {
      script,
      loginProbe: probeText,
      checkMarker: checkMod['CHECK_MARKER'] ?? null,
      loginMarker: checkMod['LOGIN_MARKER'] ?? null,
      folders,
      composedNull: compose === null ? null : tryIt(() => compose(null)).value,
      composedSaved: compose === null ? null : tryIt(() => compose(BASE.remoteTmuxPath)).value,
      recomposedNull:
        script === null || probeText === null || folders === null
          ? null
          : shellQuoteArgv(['/bin/sh', '-c', script, 'tortie-check', '', probeText, folders.join(':')]),
      recomposedSaved:
        script === null || probeText === null || folders === null
          ? null
          : shellQuoteArgv(['/bin/sh', '-c', script, 'tortie-check', String(BASE.remoteTmuxPath), probeText, folders.join(':')])
    };
  })();
  /** The last argv element of a draft check (no program path) and of a saved row's. */
  const testArgv = (() => {
    const compose = testMod === null ? null : (testMod['composeTestArgv'] as typeof composeTestArgv | undefined) ?? null;
    if (compose === null) return null;
    const draft = tryIt(() => compose({ ...BASE, remoteTmuxPath: null }, HOST_KEYS));
    const saved = tryIt(() => compose(BASE, HOST_KEYS));
    return {
      draftLast: draft.value === null ? null : draft.value[draft.value.length - 1] ?? null,
      savedLast: saved.value === null ? null : saved.value[saved.value.length - 1] ?? null,
      threw: draft.threw ?? saved.threw
    };
  })();

  // --- 129: the reason composer, driven ------------------------------------
  const reasons = (() => {
    const reasonOf = fnOf<(err: unknown) => string>(errorsMod, 'clientFailedReason', 'errors');
    const copyOf = fnOf<(cls: string, facts: Record<string, unknown>) => { headline: string; detail: string }>(errorsMod, 'composeOutcomeCopy', 'errors');
    if (reasonOf === null || copyOf === null) return null;
    const withCode = (code: string): Error => Object.assign(new Error(`spawn failed ${code}`), { code });
    const errors: [string, unknown][] = [
      ['posix_spawnp failed.', new Error('posix_spawnp failed.')],
      ['EACCES', withCode('EACCES')],
      ['EPERM', withCode('EPERM')],
      ['EMFILE', withCode('EMFILE')],
      ['ENFILE', withCode('ENFILE')],
      ['EAGAIN', withCode('EAGAIN')],
      ['ENOENT', withCode('ENOENT')],
      ['a bare string', 'something else'],
      ['a forkpty failure', new Error('forkpty(3) failed.')]
    ];
    return {
      rows: errors.map(([name, err]) => ({ name, reason: tryIt(() => reasonOf(err)).value })),
      failedCopy: tryIt(() => copyOf('client-failed', { sshPath: '/usr/bin/ssh', clientReason: reasonOf(new Error('posix_spawnp failed.')) })).value,
      missingCopy: tryIt(() => copyOf('client-missing', {})).value
    };
  })();

  // --- 138: Tortie's key on the visible test --------------------------------
  const identity = (() => {
    const compose = testMod === null ? null : (testMod['composeTestArgv'] as ((f: MachineExecutionFields, h: typeof HOST_KEYS, k?: string | null) => string[]) | undefined) ?? null;
    if (compose === null) return null;
    const keyPath = keyPathFor(ID, KEY_USER_DATA);
    const withKey = tryIt(() => compose(BASE, HOST_KEYS, keyPath));
    const withNull = tryIt(() => compose(BASE, HOST_KEYS, null));
    const without = tryIt(() => compose(BASE, HOST_KEYS));
    const draftWithKey = tryIt(() => compose({ ...BASE, remoteTmuxPath: null }, HOST_KEYS, keyPath));
    return {
      keyDir: keyDirFor(KEY_USER_DATA),
      keyPath,
      withKey: withKey.value,
      withNull: withNull.value,
      without: without.value,
      draftWithKey: draftWithKey.value,
      threw: withKey.threw ?? withNull.threw ?? without.threw ?? draftWithKey.threw
    };
  })();

  // --- 139: the row's chip, over the D11 table as revised ------------------
  const status = (() => {
    const statusOf = fnOf<(row: unknown, facts: { preparing: boolean }) => { chip: string; next: string | null; word: string }>(statusMod, 'machineStatusOf', 'machine-status');
    if (statusOf === null) return null;
    const row = (over: Record<string, unknown>) => ({
      id: 'p340',
      label: 'P340',
      color: 'blue',
      host: '127.0.0.1',
      user: null,
      port: null,
      remoteTmuxPath: '/opt/homebrew/bin/tmux',
      state: 'confirmed',
      ready: false,
      link: null,
      linkDetail: null,
      signIn: null,
      os: null,
      ...over
    });
    const signIn = (cls: string) => ({ class: cls, at: 1, version: '3.6a', headline: `headline ${cls}`, detail: 'detail' });
    // [name, row, preparing, the chip, the next step] in the order of the
    // spec's revised table, first match wins, plus the rows the attack added.
    const TABLE: [string, Record<string, unknown>, boolean, string, string | null][] = [
      ['unknown', { state: 'unknown' }, false, 'not-usable', 'review'],
      ['never', { state: 'never' }, false, 'not-confirmed', 'review'],
      ['changed', { state: 'changed', ready: true, link: 'connected' }, false, 'changed', 'review'],
      ['host-key-changed', { signIn: signIn('host-key-changed'), ready: true, link: 'connected' }, false, 'identity-changed', null],
      ['auth-refused', { signIn: signIn('auth-refused') }, false, 'needs-key', 'set-up-sign-in'],
      ['password-required', { signIn: signIn('password-required') }, false, 'needs-key', 'set-up-sign-in'],
      ['version-unmeasured', { signIn: signIn('version-unmeasured') }, false, 'new-version', 'review-version'],
      ['a Prepare in flight', { signIn: signIn('prepared') }, true, 'connecting', null],
      ['link connecting', { link: 'connecting' }, false, 'connecting', null],
      ['ready and connected', { ready: true, link: 'connected', signIn: signIn('prepared') }, false, 'ready', 'open-folder'],
      ['ready and polling', { ready: true, link: 'polling', signIn: signIn('prepared') }, false, 'ready', 'open-folder'],
      // THE ATTACK'S ROW (R1): a registered context on a machine that went to
      // sleep. `ready` stays true and the link is quiet.
      ['ready and quiet', { ready: true, link: 'quiet', signIn: signIn('prepared') }, false, 'offline', 'prepare'],
      ['ready with no link', { ready: true, link: null, signIn: signIn('prepared') }, false, 'not-ready', 'prepare'],
      ['ready and disconnected', { ready: true, link: 'disconnected', signIn: signIn('prepared') }, false, 'not-ready', 'prepare'],
      ['connected, not ready', { ready: false, link: 'connected', signIn: signIn('prepared') }, false, 'not-ready', 'prepare'],
      ['unreachable', { signIn: signIn('unreachable') }, false, 'offline', 'prepare'],
      ['refused', { signIn: signIn('refused') }, false, 'offline', 'prepare'],
      ['not-resolved', { signIn: signIn('not-resolved') }, false, 'offline', 'prepare'],
      ['timed-out', { signIn: signIn('timed-out') }, false, 'offline', 'prepare'],
      ['link quiet', { link: 'quiet' }, false, 'offline', 'prepare'],
      ['no sign in', {}, false, 'not-ready', 'prepare'],
      ['no-program', { signIn: signIn('no-program') }, false, 'not-ready', 'prepare'],
      ['no-server', { signIn: signIn('no-server') }, false, 'not-ready', 'prepare'],
      ['client-missing', { signIn: signIn('client-missing') }, false, 'not-ready', 'prepare'],
      ['client-failed', { signIn: signIn('client-failed') }, false, 'not-ready', 'prepare']
    ];
    return TABLE.map(([name, over, preparing, chip, next]) => {
      const got = tryIt(() => statusOf(row(over), { preparing }));
      return { name, want: { chip, next }, got: got.value === null ? { threw: got.threw } : { chip: got.value.chip, next: got.value.next, word: got.value.word } };
    });
  })();

  // --- 134: the menu's rows, per state -------------------------------------
  // Loaded last, with a bare window shim only if none exists (see above).
  const menu = await (async () => {
    const g = globalThis as Record<string, unknown>;
    const shimmed = typeof g['window'] === 'undefined';
    if (shimmed) g['window'] = {};
    try {
      const menuMod = await load('machine-menu', 'src/renderer/settings/machine-menu.ts');
      const itemsOf = fnOf<(row: unknown, facts: Record<string, unknown>) => unknown[]>(menuMod, 'machineMenuItems', 'machine-menu');
      if (itemsOf === null) return null;
      const base = { id: 'p340', label: 'P340', color: 'blue', host: '127.0.0.1', user: null, port: null, remoteTmuxPath: '/opt/homebrew/bin/tmux', ready: true, link: 'connected', signIn: null, os: null, acceptedTmuxVersion: null };
      const shape = (items: unknown[] | null) =>
        (items ?? []).map((raw) => {
          const one = (raw ?? {}) as Record<string, unknown>;
          return {
            id: typeof one['id'] === 'string' ? one['id'] : null,
            label: typeof one['label'] === 'string' ? one['label'] : null,
            type: typeof one['type'] === 'string' ? one['type'] : null,
            enabled: one['enabled'] === undefined ? true : one['enabled'] === true,
            sublabel: typeof one['sublabel'] === 'string' ? one['sublabel'] : null
          };
        });
      // `usable` is true exactly when the state is confirmed, as main's view
      // composes it (rows.ts), so the menu reads the row a person's window gets.
      const read = (over: Record<string, unknown>) => {
        const row = { ...base, ...over };
        const got = tryIt(() => itemsOf({ ...row, usable: row['state'] === 'confirmed' }, { preparing: false, testing: false, busy: false }));
        return got.value === null ? { threw: got.threw } : { items: shape(got.value) };
      };
      return {
        confirmed: read({ state: 'confirmed' }),
        never: read({ state: 'never', ready: false, link: null }),
        accepted: read({ state: 'confirmed', acceptedTmuxVersion: '3.9z' })
      };
    } finally {
      if (shimmed) delete g['window'];
    }
  })();

  return { loadErrors, texts, testArgv, reasons, identity, status, menu };
})();

// ---------------------------------------------------------------------------
// Phase 342, conditions 142 to 149. Linux machines on the tmux their
// distribution ships (build/p342/SPEC.md §6.1), the driven halves.
// ---------------------------------------------------------------------------
//
// PHASE 342 ADDED ONE SPAWN, said here because the header says this probe
// spawns nothing. Conditions 145 and 146 drive the SHIPPING `ensureRemoteServer`
// over a remote context whose sign-in program is a `/bin/sh` STAND-IN this
// block writes under a scratch directory of its own, answering tmux's own
// refusal words from a table and logging every argv, so the set-up's reader
// meets the measured shapes without a machine. The stand-in reaches no
// network, starts no tmux and writes only under that scratch directory, which
// is removed in a `finally`. Everything else here is pure: the option table,
// the version rows, the pair gate, the scroll entry, the far names and the two
// read quirks are driven in this process.

const p342 = await (async () => {
  const loadErrors: Record<string, string> = {};
  const load = optionalLoader(loadErrors);
  const tryIt = <T>(f: () => T): { value: T | null; threw: string | null } => {
    try {
      return { value: f(), threw: null };
    } catch (err) {
      return { value: null, threw: err instanceof Error ? `${err.name}: ${err.message}`.slice(0, 400) : String(err) };
    }
  };
  const tryAsync = async <T>(f: () => Promise<T>): Promise<{ value: T | null; threw: string | null; name: string | null; message: string | null }> => {
    try {
      return { value: await f(), threw: null, name: null, message: null };
    } catch (err) {
      const e = err as { name?: string; message?: string; headline?: string; detail?: string; refusal?: unknown; born?: boolean };
      return {
        value: null,
        threw: err instanceof Error ? `${err.name}: ${err.message}`.slice(0, 600) : String(err),
        name: typeof e?.name === 'string' ? e.name : null,
        message: typeof e?.message === 'string' ? e.message : null
      };
    }
  };

  const optionsMod = await load('serverOptions', 'src/main/tmux/server-options.ts');
  const versionMod = await load('version', 'src/main/tmux/version.ts');
  const leafMod = await load('farTmux', 'src/main/machines/far-tmux.ts');
  const serverMod = await load('remoteServer', 'src/main/machines/remote-server.ts');
  const errorsMod = await load('errors', 'src/main/machines/errors.ts');
  const scrollMod = await load('scroll', 'src/main/tmux/scroll.ts');
  const shapesMod = await load('shapes', 'src/main/machines/scroll-shapes.ts');
  const sessionsMod = await load('sessions', 'src/main/machines/remote-sessions.ts');
  const capsuleMod = await load('capsule', 'src/main/machines/remote-capsule.ts');
  const ctxMod = await load('context', 'src/main/machines/context.ts');

  // --- 142. The option table ---------------------------------------------------
  const options = (() => {
    if (optionsMod === null) return null;
    const rows = (optionsMod['SERVER_OPTIONS'] as Record<string, unknown>[] | undefined) ?? [];
    const boot = tryIt(() => (optionsMod['remoteBootOptions'] as () => Record<string, unknown>[])());
    const local = tryIt(() => (optionsMod['localReassertOptions'] as () => Record<string, unknown>[])());
    const setArgs = optionsMod['setOptionArgs'] as ((row: unknown, value: string) => string[]) | undefined;
    const isRefusal = optionsMod['isOptionRefusal'] as ((text: string, name: string, value: string) => boolean) | undefined;
    const fixturePath = join(repoRoot, 'build', 'fixtures', 'p342', 'refusals.json');
    let fixture: { refusals?: { text: string; name: string; value: string; shape: string }[] } | null = null;
    try {
      fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as typeof fixture;
    } catch {
      fixture = null;
    }
    const driven: { label: string; text: string; name: string; value: string; want: boolean; got: boolean | null }[] = [];
    const ask = (label: string, text: string, name: string, value: string, want: boolean) => {
      const got = isRefusal === undefined ? null : tryIt(() => isRefusal(text, name, value)).value;
      driven.push({ label, text, name, value, want, got });
    };
    for (const r of fixture?.refusals ?? []) ask(`fixture ${r.shape}`, r.text, r.name, r.value, true);
    ask('a dropped link', 'Connection closed by remote host\n', 'mouse', 'off', false);
    ask('no server running', 'no server running on /tmp/tmux-1000/p342', 'mouse', 'off', false);
    ask('error connecting', 'error connecting to /tmp/tmux-1000/p342 (No such file or directory)', 'mouse', 'off', false);
    ask('a refusal naming another row', 'invalid option: mouse', 'allow-passthrough', 'on', false);
    ask('a value one byte different', 'bad value: of', 'mouse', 'off', false);
    ask('a value with a trailing space', 'bad value: off ', 'mouse', 'off', false);
    ask('an empty text', '', 'mouse', 'off', false);
    ask('the refusal not on the last line', 'invalid option: mouse\nsomething else', 'mouse', 'off', false);
    ask('a shell banner then the refusal', 'welcome\r\ninvalid option: mode-style\r\n', 'mode-style', 'x', true);
    return {
      rows: rows.map((r) => ({ name: r['name'], scope: r['scope'], value: r['value'], oldest: r['oldest'] ?? null, without: r['without'] ?? null, localReassert: r['localReassert'] === true })),
      bootOrder: (boot.value ?? []).map((r) => r['name']),
      bootThrew: boot.threw,
      localOrder: (local.value ?? []).map((r) => r['name']),
      setArgv: setArgs === undefined ? null : rows.map((r) => tryIt(() => setArgs(r, String(r['value']))).value),
      refusalsFixture: fixture !== null,
      refusalsFixtureRows: (fixture?.refusals ?? []).length,
      refusalsDriven: driven
    };
  })();

  // --- 143 and 144. The rows and the pair ------------------------------------
  const rows = (() => {
    if (versionMod === null) return null;
    const list = (versionMod['TESTED_REMOTE_TMUX_VERSIONS'] as Record<string, unknown>[] | undefined) ?? [];
    const decide = versionMod['decideRemotePair'] as ((server: string, program: string | null) => unknown) | undefined;
    const versions = list.map((r) => String(r['version']));
    const pair: { server: string; program: string | null; verdict: unknown }[] = [];
    if (decide !== undefined) {
      for (const server of versions) {
        for (const program of [...versions, null, '3.9z']) {
          pair.push({ server, program, verdict: tryIt(() => decide(server, program)).value });
        }
      }
      pair.push({ server: '3.0a', program: '3.0a', verdict: tryIt(() => decide('3.0a', '3.0a')).value });
    }
    let matrix: Record<string, unknown> | null = null;
    try {
      matrix = JSON.parse(readFileSync(join(repoRoot, 'build', 'fixtures', 'p342', 'matrix.json'), 'utf8')) as Record<string, unknown>;
    } catch {
      matrix = null;
    }
    // The drawn list, read as text from the renderer's copy (a renderer module
    // may not be loaded here).
    const copySource = readFileSync(join(repoRoot, 'src', 'renderer', 'settings', 'machines-copy.ts'), 'utf8');
    const m = /export const MEASURED_VERSIONS:[^=]*=\s*\[([\s\S]*?)\];/.exec(copySource);
    const drawn = m === null ? null : [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
    return {
      list: list.map((r) => ({
        version: r['version'],
        measured: r['measured'],
        measuredAt: r['measuredAt'],
        subject: r['subject'],
        note: r['note'],
        programs: r['programs'] ?? null,
        lacks: r['lacks'] ?? null,
        quirks: r['quirks'] ?? null
      })),
      pair,
      matrix,
      drawn
    };
  })();

  // --- 145 and 146. The set-up, DRIVEN over a stand-in sign-in program -------
  const setUp = await (async () => {
    if (serverMod === null || ctxMod === null || leafMod === null) return null;
    const { mkdtempSync, writeFileSync: write, rmSync, readFileSync: read, chmodSync, mkdirSync: mkdir } = await import('node:fs');
    const ensure = serverMod['ensureRemoteServer'] as (ctx: unknown, how?: Record<string, unknown>) => Promise<Record<string, unknown>>;
    const register = ctxMod['registerRemoteMachineContext'] as (ctx: Record<string, unknown>) => Record<string, unknown>;
    const resetLeaf = leafMod['resetFarTmuxForTests'] as () => void;
    const noteVersion = leafMod['noteFarServerVersion'] as (id: string, v: string | null) => void;
    const serverVersionOf = leafMod['farServerVersion'] as (id: string) => string | null;
    const pairOf = leafMod['farPairOf'] as (id: string) => unknown;
    const settingsRefusalOf = leafMod['farSettingsRefusal'] as (id: string) => unknown;
    const disagreementOf = leafMod['farDisagreementOf'] as ((id: string) => unknown) | undefined;
    const pairRefusalOf = leafMod['farPairRefusal'] as ((id: string) => unknown) | undefined;
    const scratch = mkdtempSync(join('/private/tmp', `p342-conformance-${String(process.pid)}-`));
    const standIn = join(scratch, 'ssh-stand-in.sh');
    write(
      standIn,
      [
        '#!/bin/sh',
        '# Phase 342 conformance stand-in for the sign-in program: answers the',
        '# far command in its LAST argument from a table, logs every one.',
        'for last; do :; done',
        'printf \'%s\\n\' "$last" >> "$P342_LOG"',
        'case "$last" in',
        '  *__TORTIE_PATH__*) printf \'__TORTIE_PATH__/usr/bin:/bin__TORTIE_PATH__\\n\'; exit 0;;',
        'esac',
        'eval "set -- $last"',
        'shift 5',
        'verb=$1',
        'case "$verb" in',
        '  list-sessions)',
        '    if [ "$P342_NO_SERVER" = 1 ] && [ ! -f "$P342_STATE/born" ]; then printf \'no server running on /tmp/tmux-1000/p342\\n\' >&2; exit 1; fi',
        '    printf \'$0\\n\'; exit 0;;',
        '  start-server)',
        '    case " $P342_REFUSE " in *" exit-empty "*) printf \'invalid option: exit-empty\\n\' >&2; exit 1;; esac',
        '    : > "$P342_STATE/born"; exit 0;;',
        '  display-message) printf \'%s\\n\' "$P342_VERSION"; exit 0;;',
        '  set-environment) exit 0;;',
        '  set-option)',
        '    name=$3; value=$4',
        '    case " $P342_OTHER_WORDS " in *" $name "*) printf \'policy: that option is not allowed here\\n\' >&2; exit 1;; esac',
        '    case " $P342_REFUSE " in',
        '      *" $name "*)',
        '        if [ "$name" = mode-style ] && [ "$value" = "$P342_FALLBACK" ]; then printf \'%s\\n\' "$value" > "$P342_STATE/opt-$name"; exit 0; fi',
        '        case "$name" in',
        '          mode-style) printf \'invalid style: %s\\n\' "$value" >&2;;',
        '          remain-on-exit|status|extended-keys) printf \'unknown value: %s\\n\' "$value" >&2;;',
        '          mouse) printf \'bad value: %s\\n\' "$value" >&2;;',
        '          history-limit) printf \'value is invalid: %s\\n\' "$value" >&2;;',
        '          *) printf \'invalid option: %s\\n\' "$name" >&2;;',
        '        esac',
        '        exit 1;;',
        '    esac',
        '    printf \'%s\\n\' "$value" > "$P342_STATE/opt-$name"; exit 0;;',
        '  show-options)',
        '    name=$3',
        '    for kv in $P342_NOT_KEPT; do case "$kv" in "$name="*) printf \'%s\\n\' "${kv#*=}"; exit 0;; esac; done',
        '    if [ -f "$P342_STATE/opt-$name" ]; then cat "$P342_STATE/opt-$name"; fi; exit 0;;',
        'esac',
        'printf \'unknown command: %s\\n\' "$verb" >&2',
        'exit 1'
      ].join('\n'),
      { mode: 0o700 }
    );
    chmodSync(standIn, 0o700);
    const BOOT_LINE = 'start-server ; set-option -s exit-empty off';
    let n = 0;
    const drive = async (
      label: string,
      plan: { version: string; noServer: boolean; refuse: string[]; notKept?: string; fallback?: string; otherWords?: string[] },
      how: Record<string, unknown>,
      opts: { reuse?: boolean } = {}
    ) => {
      // `reuse` drives a second set-up of the SAME machine with the leaf kept,
      // which is how a refusal an earlier set-up recorded is seen cleared.
      if (opts.reuse !== true) n += 1;
      const machineId = `p342-${String(n)}`;
      const state = join(scratch, `state-${String(n)}`);
      mkdir(state, { recursive: true });
      const log = join(scratch, `log-${String(n)}.txt`);
      write(log, '');
      if (opts.reuse !== true) resetLeaf();
      // What Prepare would have noted before the set-up: the warm server's own
      // version, or the program's when no server answered and it was read.
      noteVersion(machineId, plan.noServer ? (typeof how['version'] === 'string' ? how['version'] : null) : plan.version);
      const ctx = register({
        kind: 'remote',
        machineId,
        sshBin: standIn,
        host: `${machineId}.invalid`,
        user: null,
        port: null,
        remoteTmuxPath: '/usr/bin/tmux',
        socket: 'p342conf',
        controlPath: join(scratch, `cp-${String(n)}-%C`),
        hostKeys: { tortie: join(scratch, 'kh-tortie'), user: join(scratch, 'kh-user') },
        acceptedTmuxVersion: null,
        label: null,
        identityFile: null
      });
      const saved = { ...process.env };
      process.env['P342_LOG'] = log;
      process.env['P342_STATE'] = state;
      process.env['P342_VERSION'] = plan.version;
      process.env['P342_NO_SERVER'] = plan.noServer ? '1' : '0';
      process.env['P342_REFUSE'] = plan.refuse.join(' ');
      process.env['P342_NOT_KEPT'] = plan.notKept ?? '';
      process.env['P342_FALLBACK'] = plan.fallback ?? '';
      process.env['P342_OTHER_WORDS'] = (plan.otherWords ?? []).join(' ');
      let result: { value: Record<string, unknown> | null; threw: string | null };
      const caught: { thrown: { name: string | null; refusal: unknown; born: unknown; headline: unknown; detail: unknown } | null } = { thrown: null };
      try {
        result = await tryAsync(async () => {
          try {
            return await ensure(ctx, how);
          } catch (err) {
            const e = err as { name?: string; refusal?: unknown; born?: unknown; headline?: unknown; detail?: unknown };
            caught.thrown = { name: e?.name ?? null, refusal: e?.refusal ?? null, born: e?.born ?? null, headline: e?.headline ?? null, detail: e?.detail ?? null };
            throw err;
          }
        });
      } finally {
        for (const key of Object.keys(process.env)) if (key.startsWith('P342_')) delete process.env[key];
        for (const [key, value] of Object.entries(saved)) if (key.startsWith('P342_') && value !== undefined) process.env[key] = value;
      }
      const sent = read(log, 'utf8')
        .split('\n')
        .filter((line) => line.length > 0)
        .map((line) => {
          if (line.includes('__TORTIE_PATH__')) return 'PATH-CAPTURE';
          const words = [...line.matchAll(/'((?:[^']|'\\'')*)'|(\S+)/g)].map((x) => (x[1] !== undefined ? x[1].replace(/'\\''/g, "'") : x[2]));
          return words.slice(5).join(' ');
        });
      const value = result.value;
      return {
        label,
        plan,
        how,
        sent,
        bootLine: BOOT_LINE,
        resolved: value === null ? null : {
          born: value['born'],
          options: ((value['options'] as Record<string, unknown>[] | undefined) ?? []).map((o) => ({ name: o['name'], wanted: o['wanted'], observed: o['observed'], agrees: o['agrees'] })),
          disagreed: ((value['disagreed'] as unknown[] | undefined) ?? []).length,
          refused: value['refused'] ?? null
        },
        threw: result.threw,
        thrown: caught.thrown,
        noted: serverVersionOf(machineId),
        pair: pairOf(machineId),
        settingsRefusal: settingsRefusalOf(machineId),
        // PHASE 342'S SECOND FIX ROUND: what a server this set-up started ran
        // as beside what its program said, and the pair line said of the same
        // program read again beside that server.
        disagreement: disagreementOf === undefined ? 'absent' : disagreementOf(machineId),
        pairLineAfterLie: (() => {
          if (pairRefusalOf === undefined || plan.noServer !== true || typeof how['version'] !== 'string') return null;
          (leafMod['noteFarPair'] as (id: string, s: string, p: string | null) => void)(machineId, plan.version, how['version']);
          return pairRefusalOf(machineId);
        })()
      };
    };
    const LACKS: Record<string, string[]> = {
      '3.2a': ['allow-passthrough', 'copy-mode-position-format', 'mode-style'],
      '3.3a': ['copy-mode-position-format', 'mode-style'],
      '3.4': ['copy-mode-position-format', 'mode-style'],
      '3.5a': ['copy-mode-position-format', 'mode-style'],
      '3.6': [],
      '3.6a': [],
      '3.6b': [],
      '3.7b': [],
      '3.7c': []
    };
    const FALLBACK = 'bg=default,fg=default';
    const runs: Record<string, unknown>[] = [];
    let startDoor: Record<string, unknown> | null = null;
    let disagreeDoor: Record<string, unknown> | null = null;
    try {
      // 145: a born server that is not the version its program said.
      runs.push(await drive('born-disagrees', { version: '3.2a', noServer: true, refuse: [], fallback: FALLBACK }, { version: '3.7c' }));
      // 146 (the second fix round): that set-up stopped after its boot and
      // before the PATH capture, so a create's door is answered sentence (4)'s
      // line, never "has not signed in". Asked before the next drive resets
      // the leaf.
      {
        const start = sessionsMod?.['readyContextToStart'] as ((id: string) => unknown) | undefined;
        disagreeDoor = start === undefined ? null : await tryAsync(async () => start(`p342-${String(n)}`));
      }
      // 145: a born server with nothing to compare with (a restore or a create).
      runs.push(await drive('born-noted', { version: '3.4', noServer: true, refuse: LACKS['3.4'] ?? [], fallback: FALLBACK }, {}));
      // 145: a born server that agrees with its program.
      runs.push(await drive('born-agrees', { version: '3.5a', noServer: true, refuse: LACKS['3.5a'] ?? [], fallback: FALLBACK }, { version: '3.5a' }));
      // 146: every measured version, warm, refusing exactly what its row lacks.
      for (const [version, lacks] of Object.entries(LACKS)) {
        runs.push(await drive(`warm-${version}`, { version, noServer: false, refuse: lacks, fallback: FALLBACK }, {}));
      }
      // 146: a refusal the measurement did not predict, optional.
      runs.push(await drive('warm-3.7c-refuses-allow-passthrough', { version: '3.7c', noServer: false, refuse: ['allow-passthrough'], fallback: FALLBACK }, {}));
      // 146: a refusal the measurement did not predict, required.
      runs.push(await drive('warm-3.7c-refuses-remain-on-exit', { version: '3.7c', noServer: false, refuse: ['remain-on-exit'], fallback: FALLBACK }, {}));
      // 146 (the fix round): a required row taken but read back as another value.
      runs.push(await drive('warm-3.7c-history-not-kept', { version: '3.7c', noServer: false, refuse: [], notKept: 'history-limit=2000', fallback: FALLBACK }, {}));
      // 146 (the fix round): exit-empty refused on the boot line.
      runs.push(await drive('born-refuses-exit-empty', { version: '3.7c', noServer: true, refuse: ['exit-empty'], fallback: FALLBACK }, { version: '3.7c' }));
      // 146 (the second fix round): the boot line's refusal stops the set-up
      // before the PATH capture, so the context is refused as not signed in;
      // the door a create and a restore start through answers sentence (1)
      // instead, and a machine with no refusal recorded still answers what it
      // always did.
      {
        const start = sessionsMod?.['readyContextToStart'] as ((id: string) => unknown) | undefined;
        const asked = async (id: string) => (start === undefined ? null : await tryAsync(async () => start(id)));
        startDoor = {
          present: start !== undefined,
          afterBoot: await asked(`p342-${String(n)}`),
          control: await asked('p342-never-registered')
        };
      }
      // 146: a fallback refused too is a skip, and never expected.
      runs.push(await drive('warm-3.2a-refuses-fallback', { version: '3.2a', noServer: false, refuse: LACKS['3.2a'] ?? [], fallback: 'nothing-takes' }, {}));
      // 146 (the fix round): a refusal recorded by one set-up, then a later
      // set-up of the SAME machine that holds every row, which clears it.
      runs.push(await drive('refused-then-held-first', { version: '3.7c', noServer: false, refuse: ['mouse'], fallback: FALLBACK }, {}));
      runs.push(await drive('refused-then-held-second', { version: '3.7c', noServer: false, refuse: [], fallback: FALLBACK }, {}, { reuse: true }));
      // 146 (the second fix round): a required row whose write failed in words
      // tmux never uses, read back once. Holding another value is the row's
      // refusal; holding the wanted value, or answering nothing, is the
      // failure thrown as it came, with nothing recorded.
      runs.push(await drive('warm-3.7c-other-words-not-held', { version: '3.7c', noServer: false, refuse: [], otherWords: ['remain-on-exit'], notKept: 'remain-on-exit=off', fallback: FALLBACK }, {}));
      runs.push(await drive('warm-3.7c-other-words-held', { version: '3.7c', noServer: false, refuse: [], otherWords: ['remain-on-exit'], notKept: 'remain-on-exit=failed', fallback: FALLBACK }, {}));
      runs.push(await drive('warm-3.7c-other-words-unread', { version: '3.7c', noServer: false, refuse: [], otherWords: ['remain-on-exit'], fallback: FALLBACK }, {}));
      // An OPTIONAL row refused in other words is thrown as it came, as today.
      runs.push(await drive('warm-3.7c-other-words-optional', { version: '3.7c', noServer: false, refuse: [], otherWords: ['allow-passthrough'], notKept: 'allow-passthrough=off', fallback: FALLBACK }, {}));
    } finally {
      resetLeaf();
      rmSync(scratch, { recursive: true, force: true });
    }
    return { runs, startDoor: startDoor === null ? null : { ...startDoor, afterDisagreement: disagreeDoor }, scratchGone: !existsSync(scratch) };
  })();

  // --- The four sentences ----------------------------------------------------
  const sentences = (() => {
    if (errorsMod === null) return null;
    const compose = errorsMod['composeTmuxRefusal'] as ((r: unknown) => { headline: string; detail: string }) | undefined;
    const setting = errorsMod['machineTmuxSettingRefused'] as ((v: string | null) => string) | undefined;
    const copyOf = errorsMod['machineOutcomeCopy'] as ((cls: string) => { headline: string; detail: string; alarm: boolean }) | undefined;
    if (compose === undefined || setting === undefined) return null;
    return {
      required: tryIt(() => compose({ kind: 'required', version: '3.7c', purpose: 'failed-screen', lines: 25000 })).value,
      requiredHistory: tryIt(() => compose({ kind: 'required', version: '3.2a', purpose: 'history', lines: 25000 })).value,
      requiredStaysUp: tryIt(() => compose({ kind: 'required', version: null, purpose: 'stays-up', lines: 25000 })).value,
      requiredScrolling: tryIt(() => compose({ kind: 'required', version: '3.4', purpose: 'scrolling', lines: 25000 })).value,
      setting: tryIt(() => setting('3.7c')).value,
      settingNoVersion: tryIt(() => setting(null)).value,
      pair: tryIt(() => compose({ kind: 'pair', server: '3.5a', program: '3.6b' })).value,
      disagrees: tryIt(() => compose({ kind: 'disagrees', said: '3.7c', ran: '3.2a' })).value,
      classCopy: copyOf === undefined ? null : tryIt(() => copyOf('program-refused')).value
    };
  })();

  // --- 146 (the fix round). How a create and a restore answer a refusal ------
  // `throwAsSessionError` is handed a RemoteTmuxRefused and must throw the
  // structured error whose message is the sentence itself, so no session
  // surface draws Electron's prefix and a class name in front of it; anything
  // else is thrown exactly as it came.
  const asSession = await (async () => {
    if (serverMod === null) return null;
    const errorsDoor = await load('errorsDoor', 'src/main/errors.ts');
    const Refused = serverMod['RemoteTmuxRefused'] as (new (r: unknown, born?: boolean) => Error) | undefined;
    const convert = serverMod['throwAsSessionError'] as ((err: unknown) => never) | undefined;
    const payloadOf = errorsDoor?.['gmuxErrorPayloadOf'] as ((err: unknown) => { code: string; message: string; detail?: string } | null) | undefined;
    if (Refused === undefined || convert === undefined || payloadOf === undefined) return { present: false };
    const caught = (f: () => unknown): unknown => {
      try {
        f();
        return null;
      } catch (err) {
        return err;
      }
    };
    const refused = new Refused({ kind: 'required', name: 'remain-on-exit', purpose: 'failed-screen', version: '3.7c', lines: 25000 }, false);
    const out = caught(() => convert(refused));
    const plain = new Error('a plain failure');
    const passed = caught(() => convert(plain));
    const payload = payloadOf(out);
    return {
      present: true,
      refusedMessage: refused.message,
      payload,
      isPlainRefusal: out instanceof Refused,
      otherPassedThrough: passed === plain
    };
  })();

  // --- 147. Scroll-back's entry ------------------------------------------------
  const entry = (() => {
    if (scrollMod === null || shapesMod === null) return null;
    const enter = scrollMod['enterCopyModeArgs'] as ((run: unknown, target: string) => readonly string[]) | undefined;
    const admit = shapesMod['admitScrollArgv'] as ((argv: readonly string[]) => { ok: boolean; shape?: string; reason?: string }) | undefined;
    const local = Object.assign(() => Promise.resolve(''), {});
    const remote = Object.assign(() => Promise.resolve(''), { server: 'machine:probe' });
    const orderedRemote = Object.assign(() => Promise.resolve(''), { server: 'machine:probe', ordered: true });
    return {
      present: enter !== undefined,
      local: enter === undefined ? null : tryIt(() => [...enter(local, '$7')]).value,
      remote: enter === undefined ? null : tryIt(() => [...enter(remote, '$7')]).value,
      orderedRemote: enter === undefined ? null : tryIt(() => [...enter(orderedRemote, '$7')]).value,
      fourAdmitted: admit === undefined ? null : tryIt(() => admit(['copy-mode', '-e', '-t', '$1'])).value,
      fiveAdmitted: admit === undefined ? null : tryIt(() => admit(['copy-mode', '-e', '-H', '-t', '$1'])).value,
      hRows: ((shapesMod['SCROLL_SHAPES'] as Record<string, unknown>[] | undefined) ?? [])
        .filter((row) => Array.isArray(row['argv']) && (row['argv'] as Record<string, unknown>[]).some((s) => s['kind'] === 'word' && s['word'] === '-H'))
        .map((row) => row['id'])
    };
  })();

  // --- 148. The far names and the two read quirks ------------------------------
  const names = (() => {
    if (sessionsMod === null || capsuleMod === null) return null;
    const farName = sessionsMod['farTmuxName'] as ((display: string, taken: ReadonlySet<string>) => string) | undefined;
    const undo = sessionsMod['undoDollarEscape'] as ((s: string) => string) | undefined;
    const strip = capsuleMod['stripJoinedPadding'] as ((s: string) => string) | undefined;
    const none = new Set<string>();
    let dollar: { values?: { value: string; answers?: Record<string, string> }[] } | null = null;
    try {
      dollar = JSON.parse(readFileSync(join(repoRoot, 'build', 'fixtures', 'p342', 'dollar-3.4.json'), 'utf8')) as typeof dollar;
    } catch {
      dollar = null;
    }
    const capText = (name: string): string | null => {
      try {
        return readFileSync(join(repoRoot, 'build', 'fixtures', 'p342', name), 'utf8').replace(/\\033\[/g, '\u001b[');
      } catch {
        return null;
      }
    };
    const cap32 = capText('capj-3.2a.txt');
    const cap33 = capText('capj-3.3a.txt');
    const trimOwn = (t: string) => t.split('\n').map((l) => l.replace(/ +$/, '')).join('\n');
    // What a person sees of a line: its escapes removed, and on both sides its
    // trailing spaces, because 3.2a puts a line's colour reset at its end and
    // 3.3a at the start of the next one (builder "far", measured), so the two
    // agree on the drawn text and not byte for byte.
    const seen = (t: string) => t.split('\n').map((l) => l.replace(/\u001b\[[0-9;]*m/g, '').replace(/ +$/, ''));
    return {
      farName: farName === undefined ? null : [
        ['cost $HOME', tryIt(() => farName('cost $HOME', none)).value],
        ['$', tryIt(() => farName('$', none)).value],
        ['$HOME notes', tryIt(() => farName('$HOME notes', none)).value],
        ['plain name', tryIt(() => farName('plain name', none)).value],
        ['a$b$c', tryIt(() => farName('a$b$c', none)).value],
        ['taken', tryIt(() => farName('cost $HOME', new Set(['cost _HOME']))).value]
      ],
      undoDriven: undo === undefined || dollar === null ? null : (dollar.values ?? []).map((v) => ({
        value: v.value,
        answer34: v.answers?.['3.4'] ?? null,
        undone: v.answers?.['3.4'] === undefined ? null : tryIt(() => undo(v.answers?.['3.4'] ?? '')).value,
        answer33: v.answers?.['3.3a'] ?? null,
        undone33: v.answers?.['3.3a'] === undefined ? null : tryIt(() => undo(v.answers?.['3.3a'] ?? '')).value
      })),
      undoKeepsOthers: undo === undefined ? null : [
        ['a\\$1', tryIt(() => undo('a\\$1')).value],
        ['\\\\', tryIt(() => undo('\\\\')).value],
        ['a\\b', tryIt(() => undo('a\\b')).value],
        ['\\$', tryIt(() => undo('\\$')).value]
      ],
      dollarFixture: dollar !== null,
      capFixtures: cap32 !== null && cap33 !== null,
      stripped: strip === undefined || cap32 === null || cap33 === null ? null : {
        equalAfterStrip: JSON.stringify(seen(strip(cap32))) === JSON.stringify(seen(cap33)),
        neverWider: (() => {
          const a = strip(cap32).split('\n').map((l) => l.replace(/\u001b\[[0-9;]*m/g, '').length);
          const b = cap33.split('\n').map((l) => l.replace(/\u001b\[[0-9;]*m/g, '').length);
          return a.length === b.length && a.every((w, i) => w <= (b[i] ?? 0));
        })(),
        trimmedOwnIs: trimOwn(cap33).length,
        lines32: cap32.split('\n').length,
        padded32: cap32.split('\n').filter((l) => / $/.test(l)).length,
        padded33: cap33.split('\n').filter((l) => / $/.test(l)).length,
        keepsOwn: strip('a  \nb\t\n') === 'a\nb\t\n' && strip('x \u001b[0m  \n') === 'x \u001b[0m\n'
      }
    };
  })();

  // --- 149. The far scripts, read as text; the drive is the gate's own -----------
  const scripts = (() => {
    const scriptsSource = readFileSync(join(repoRoot, 'src', 'main', 'machines', 'remote-scripts.ts'), 'utf8');
    return { hasWqBranchFilePut: /if \[ "\$wq" = -c \]; then m=\$\(stat -c %a "\$f"/.test(scriptsSource), hasWqBranchDirNew: /if \[ "\$wq" = -c \]; then m=\$\(stat -c %a "\$p"/.test(scriptsSource) };
  })();

  return { loadErrors, options, rows, setUp, asSession, sentences, entry, names, scripts };
})();

process.stdout.write(
  JSON.stringify({
    id: ID,
    // Phase 320.1, conditions 101 to 112.
    phase3201: p3201,
    // Phase 336, conditions 113 to 121.
    phase336: p336,
    // Phase 340, conditions 125 to 139.
    phase340: p340,
    // Phase 342, conditions 142 to 149.
    phase342: p342,
    base,
    sameAgain: machineExecutionHash(ID, { ...BASE }),
    fields: fieldRows,
    executionFields: [...MACHINE_EXECUTION_FIELDS],
    presentationFields: [...MACHINE_PRESENTATION_FIELDS],
    hashedKeys,
    // Phase 83, conditions 7 and 43.
    hashedKeysAccepted,
    hashedKeysEverything,
    acceptedVersion,
    // Phase 101, conditions 43 and 79.
    writeRootFacts,
    // Phase 101, condition 80.
    writeBranches,
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

    // --- Phase 270, conditions 89 to 98 ------------------------------------
    //
    // Phase 269 shipped per-agent shell variable NAMES and a create on another
    // machine ignored every one of them IN SILENCE — issue 20's own failure
    // reappearing on the surface built to end it. This phase asks the FAR
    // MACHINE'S OWN LOGIN SHELL which of those names it has a usable value for,
    // and injects them on that machine's own `new-session` line through a slot
    // its own login shell expands. THE NAMES TRAVEL AND NO VALUE DOES, in
    // either direction, which is the one sentence that bounds the phase. These
    // conditions are the executable half of it.
    //
    // Everything below is composed, never sent. No ssh runs, no tmux server is
    // started, no machine is contacted and no shell is spawned.
    phase270: (() => {
      /** A pinned id, so the argv below is comparable byte for byte. */
      const ID270 = '0d1f6f2e-70a1-4a1c-9f2f-5c0b1a2d3e4f';
      /**
       * Names no alphabet allows. Every one is dropped on THIS Mac, before
       * anything is composed and therefore before anything is sent.
       */
      const HOSTILE_NAMES = [
        "A'B",
        'A;id',
        'A$(id)',
        'A`id`',
        'A B',
        'A\nB',
        'A|B',
        'A>B',
        'A}',
        '${IFS}',
        '1ABC',
        '',
        'A'.repeat(300)
      ];
      /** Sixteen legal names, being the cap the settings door already enforces. */
      const SIXTEEN = Array.from(
        { length: 16 },
        (_unused, at) => `P270_NAME_${String(at)}`
      );
      const shape = (extra: Record<string, unknown>): Record<string, unknown> => ({
        tmuxName: 'work',
        cwd: '/srv/repo',
        sessionId: ID270,
        argv: ['claude', '--model', 'opus'],
        ...extra
      });
      const composeArgs = (
        extra: Record<string, unknown>
      ): { argv: string[] | null; threw: string | null } => {
        try {
          return {
            argv: [
              ...(remoteCreateArgs as unknown as (
                one: Record<string, unknown>
              ) => string[])(shape(extra))
            ],
            threw: null
          };
        } catch (error) {
          return { argv: null, threw: String((error as Error).message ?? error) };
        }
      };
      /** Every `-e` pair's NAME, in order, out of a composed create argv. */
      const pairNames = (argv: readonly string[]): string[] => {
        const names: string[] = [];
        for (let at = 0; at < argv.length; at += 1) {
          if (argv[at] !== '-e') continue;
          const pair = argv[at + 1] ?? '';
          names.push(pair.slice(0, pair.indexOf('=')));
        }
        return names;
      };
      /**
       * Every parameter expansion in one shell text. The checker compares this
       * against a closed set, because a spelling outside it is the only way a
       * VALUE could be named in a text that is supposed to name only shapes.
       */
      const expansionsOf = (text: string): string[] => [
        ...new Set(
          [
            ...text.matchAll(
              /\$(\{[^}]*\}|[A-Za-z_][A-Za-z0-9_]*|[0-9@#*?$!-])/g
            )
          ].map((hit) => hit[0])
        )
      ].sort();

      const slot =
        typeof p270Carriage?.['REMOTE_ENV_SLOT'] === 'string'
          ? (p270Carriage['REMOTE_ENV_SLOT'] as string)
          : null;
      const guard =
        typeof p270Carriage?.['REMOTE_ENV_NAME_GUARD'] === 'string'
          ? (p270Carriage['REMOTE_ENV_NAME_GUARD'] as string)
          : null;
      const createScript =
        typeof p270Carriage?.['REMOTE_ENV_CREATE_SCRIPT'] === 'string'
          ? (p270Carriage['REMOTE_ENV_CREATE_SCRIPT'] as string)
          : null;
      // The union rule has ONE spelling, and the gate does not care which of
      // the phase's two modules holds it — only that exactly one does. Two
      // copies of it is how a local session and a remote session come to
      // disagree about which names an agent has, so the checker fails on a
      // count other than one.
      const namesForSites = [
        ['remote-env-carriage', p270Carriage?.['remoteEnvNamesFor']],
        ['remote-env-probe', p270Probe?.['remoteEnvNamesFor']]
      ].filter(([, fn]) => typeof fn === 'function');
      const namesFor = namesForSites[0]?.[1];
      const composeEnv = p270Carriage?.['composeEnvCreateCommand'];
      const marker = p270Probe?.['remoteEnvProbeMarker'];

      const envNamesRow =
        REMOTE_SCRIPTS.find(
          (row) =>
            row.id ===
            (typeof p270Probe?.['REMOTE_ENV_PROBE_SCRIPT_ID'] === 'string'
              ? (p270Probe['REMOTE_ENV_PROBE_SCRIPT_ID'] as string)
              : 'env-names')
        ) ?? null;

      /**
       * The names the filter keeps, driven against the real function. It is
       * wrapped because the union rule reads the settings door, and a gate that
       * reads a file under the person's home is a gate that has stopped being
       * cheap. A throw here is a FAILURE with a sentence, never a skip.
       */
      const filtered = ((): { kept: string[] | null; threw: string | null } => {
        if (typeof namesFor !== 'function') return { kept: null, threw: null };
        try {
          const kept = (
            namesFor as (one: unknown, two: unknown) => string[]
          )({ launch: { envPassthrough: [...HOSTILE_NAMES, ...SIXTEEN, 'A_KEY'] } }, 'shell');
          return { kept: [...kept], threw: null };
        } catch (error) {
          return { kept: null, threw: String((error as Error).message ?? error) };
        }
      })();

      const composedHostile = ((): { text: string | null; threw: string | null } => {
        if (typeof composeEnv !== 'function') return { text: null, threw: null };
        try {
          const text = (
            composeEnv as (one: readonly string[], two: readonly string[]) => string
          )(['new-session', '-d', '-s', 'work'], [...HOSTILE_NAMES, 'A_KEY']);
          return { text: String(text), threw: null };
        } catch (error) {
          return { text: null, threw: String((error as Error).message ?? error) };
        }
      })();

      const resolveSource = readFileSync(
        join(repoRoot, 'src', 'main', 'tmux', 'resolve.ts'),
        'utf8'
      );

      return {
        // Which halves of the phase are present at all. The checker turns an
        // absent module into a sentence naming the file.
        present: {
          carriage: p270Carriage !== null,
          probe: p270Probe !== null,
          slotExported: slot !== null,
          guardExported: guard !== null,
          createScriptExported: createScript !== null,
          namesForExported: typeof namesFor === 'function',
          namesForSites: namesForSites.map(([file]) => String(file)),
          composeExported: typeof composeEnv === 'function',
          markerExported: typeof marker === 'function',
          filterExported:
            typeof p270Carriage?.['filterRemoteEnvNames'] === 'function',
          droppedExported:
            typeof p270Carriage?.['droppedRemoteEnvNames'] === 'function'
        },

        // 89. The allowlist did not move, and no name outside it becomes a
        //     pair even when sixteen legal names are asked for.
        allowed: [...REMOTE_ENV_ALLOWED],
        measuredAndRefused: REMOTE_ENV_MEASURED_AND_REFUSED,
        pairsWithSixteen: (() => {
          const composed = composeArgs({ envNames: SIXTEEN });
          return {
            threw: composed.threw,
            names: composed.argv === null ? null : pairNames(composed.argv)
          };
        })(),
        // The old route is not re-opened by the new one. Phase 73's refusal
        // still fires for a third name on `env`, before anything is composed.
        oldRouteStillRefuses: composeArgs({
          env: { ANTHROPIC_API_KEY: 'planted' }
        }).threw,

        // 90. The slot: once when names are present, never otherwise, and never
        //     in an argv that is not a create.
        slot,
        slotCounts: (() => {
          const withNames = composeArgs({ envNames: ['A_KEY'] });
          const without = composeArgs({});
          const count = (argv: string[] | null): number | null =>
            argv === null || slot === null
              ? null
              : argv.filter((one) => one === slot).length;
          const firstPairAt = (argv: string[] | null): number | null =>
            argv === null ? null : argv.indexOf('-e');
          return {
            withNames: count(withNames.argv),
            without: count(without.argv),
            slotAt:
              withNames.argv === null || slot === null
                ? null
                : withNames.argv.indexOf(slot),
            firstPairAt: firstPairAt(withNames.argv),
            firstStampAt:
              withNames.argv === null
                ? null
                : withNames.argv.findIndex((one) => one.startsWith('GMUX_')),
            inList:
              slot === null ? null : remoteListArgs().some((one) => one.includes(slot))
          };
        })(),

        // 91. Byte identity at the parent. Four shapes, pinned in the checker.
        pinnedShapes: [
          composeArgs({}).argv,
          composeArgs({ cwd: undefined, argv: ['claude'] }).argv,
          composeArgs({ argv: [] }).argv,
          composeArgs({
            tmuxName: 'a b',
            cwd: '',
            argv: ['pi', '--session-id', 'u']
          }).argv
        ],

        // 92. The hostile NAME battery.
        hostile: HOSTILE_NAMES,
        filtered,
        composedHostile,

        // 93 and 96. The two script texts, read as bytes.
        texts: {
          create:
            createScript === null
              ? null
              : {
                  bytes: createScript.length,
                  evals: [...createScript.matchAll(/\beval\b/g)].length,
                  evalAt: createScript.indexOf('eval'),
                  guardAt: guard === null ? -1 : createScript.indexOf(guard),
                  carriesEvalForm: createScript.includes('eval "v=\\${$k-}"'),
                  expansions: expansionsOf(createScript),
                  capLiterals: [...createScript.matchAll(/4096/g)].length,
                  backticks: [...createScript.matchAll(/`/g)].length,
                  startsSetE: createScript.trimStart().startsWith('set -e'),
                  umaskAt: createScript.indexOf('umask 077'),
                  setEAt: createScript.indexOf('set -e'),
                  redirects: [...createScript.matchAll(/>/g)].map((hit) =>
                    createScript.slice(
                      Math.max(0, (hit.index ?? 0) - 2),
                      (hit.index ?? 0) + 11
                    )
                  ),
                  bareLoops: [...createScript.matchAll(/for\s+\w+\s+in\s+\$[1-9]/g)].map(
                    (hit) => hit[0]
                  )
                },
          probe:
            envNamesRow === null
              ? null
              : {
                  id: envNamesRow.id,
                  mode: envNamesRow.mode,
                  params: envNamesRow.params,
                  reason: envNamesRow.reason,
                  bytes: envNamesRow.text.length,
                  evals: [...envNamesRow.text.matchAll(/\beval\b/g)].length,
                  evalAt: envNamesRow.text.indexOf('eval'),
                  guardAt: guard === null ? -1 : envNamesRow.text.indexOf(guard),
                  carriesEvalForm: envNamesRow.text.includes('eval "v=\\${$k-}"'),
                  expansions: expansionsOf(envNamesRow.text),
                  capLiterals: [...envNamesRow.text.matchAll(/4096/g)].length,
                  backticks: [...envNamesRow.text.matchAll(/`/g)].length,
                  startsSetE: envNamesRow.text.trimStart().startsWith('set -e'),
                  umaskAt: envNamesRow.text.indexOf('umask 077'),
                  setEAt: envNamesRow.text.indexOf('set -e'),
                  redirects: [...envNamesRow.text.matchAll(/>/g)].map((hit) =>
                    envNamesRow.text.slice(
                      Math.max(0, (hit.index ?? 0) - 2),
                      (hit.index ?? 0) + 11
                    )
                  ),
                  bareLoops: [
                    ...envNamesRow.text.matchAll(/for\s+\w+\s+in\s+\$[1-9]/g)
                  ].map((hit) => hit[0]),
                  namesAWriter: [
                    'rm',
                    'mv',
                    'cp',
                    'mkdir',
                    'touch',
                    'chmod',
                    'chown',
                    'ln',
                    'dd',
                    'tee',
                    'truncate',
                    'git'
                  ].filter((verb) =>
                    new RegExp(`(^|[^A-Za-z0-9_-])${verb}([^A-Za-z0-9_-]|$)`).test(
                      envNamesRow.text
                    )
                  )
                }
        },
        guard,

        // 94. The cap agrees in three places.
        caps: {
          exported:
            typeof p270Carriage?.['REMOTE_ENV_MAX_VALUE_CHARS'] === 'number'
              ? (p270Carriage['REMOTE_ENV_MAX_VALUE_CHARS'] as number)
              : null,
          namesMax:
            typeof p270Carriage?.['REMOTE_ENV_NAMES_MAX'] === 'number'
              ? (p270Carriage['REMOTE_ENV_NAMES_MAX'] as number)
              : null,
          // Read as SOURCE rather than imported, because importing
          // `../src/main/tmux/resolve.ts` would pull a spawning module into a
          // gate whose whole claim is that it spawns nothing.
          localFromSource: (() => {
            const hit = /export const ENV_CAPTURE_MAX_VALUE_BYTES = (\d+);/.exec(
              resolveSource
            );
            return hit === null ? null : Number(hit[1]);
          })()
        },

        // 95. The nonce is fresh per probe, so far-side rc output cannot forge
        //     a record by guessing the marker.
        markers:
          typeof marker === 'function'
            ? [
                String((marker as () => string)()),
                String((marker as () => string)())
              ]
            : null,

        // 98. The silence is ended, read out of the two files that raise it.
        //     This is a SOURCE read rather than a module load, so it stays true
        //     whichever way the probe is spelled and needs no Electron.
        raises: ['remote-sessions', 'remote-restore'].map((file) => {
          const text = readFileSync(
            join(repoRoot, 'src', 'main', 'machines', `${file}.ts`),
            'utf8'
          );
          // THE VERIFIER'S ROUND TOOK THE PROSE OUT BEFORE COUNTING, and it is
          // not a tidy-up. Both files carry paragraphs naming
          // `probeRemoteEnvNames`, `env-unresolved` and `ensureRemoteServer`,
          // because a reader needs to know why each is there. Counting the raw
          // text would let a COMMENT answer a question about what the code
          // does — which is exactly how the fix for condition 99 could be
          // deleted and the gate stay green. `remote-restore.test.ts` strips
          // the same two shapes for the same reason.
          const code = text
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/^\s*\/\/.*$/gm, '');
          return {
            file,
            asksForNames: [...code.matchAll(/remoteEnvNamesFor\(/g)].length,
            probes: [...code.matchAll(/probeRemoteEnvNames\(/g)].length,
            raisesNotice: [...code.matchAll(/'env-unresolved'/g)].length,
            // PHASE 275 MADE THIS DERIVE INSTEAD OF PIN, and the reason is
            // that the pin went red on a change that STRENGTHENED the thing it
            // guards. It read the literal `names: envProbe.missing`, and both
            // files now write `names: envMissing`, where `envMissing` is that
            // same probe answer UNIONED with what this rung's own cap refused
            // to carry — a name the union asked for and that never reached the
            // probe, so `envProbe.missing` could not know about it.
            //
            // So the question is asked the way condition 98 actually means it:
            // the `names` the notice carries must trace to the probe's
            // `missing`. The expression after `names:` inside the
            // `env-unresolved` object is read, and it counts either when it
            // names `.missing` itself (the parent's shape) or when it is a
            // local whose own initializer does (this phase's). Nothing here
            // accepts a literal or a list built from somewhere else, which is
            // what the pin was really defending.
            namesTheMissing: noticeNamesTheMissing(code),
            passesEnvNames: [...code.matchAll(/envNames: passthrough/g)].length,
            widensTheDeadline: [
              ...code.matchAll(/REMOTE_CREATE_ENV_TIMEOUT_MS/g)
            ].length,
            // CONDITION 99, THE VERIFIER'S ROUND. A create that carries names
            // reaches the far side through its LOGIN SHELL, and on a machine
            // with no server on Tortie's socket that login shell is what execs
            // tmux — so tmux seeds its GLOBAL environment from it and every
            // later pane on that machine inherits the person's values. The
            // server must therefore be asserted BEFORE the create line, which
            // is the call the restore path has always made at its step 3.
            bootsTheServer: [...code.matchAll(/ensureRemoteServer\(/g)].length,
            //
            // THE CALL, `remoteCreateArgs({`, AND NEVER THE BARE NAME.
            // `remote-sessions.ts` DECLARES `remoteCreateArgs` as well as
            // calling it, hundreds of lines above `remoteCreate`'s body, so a
            // bare `indexOf` measures the declaration and reports the order
            // backwards. The gate caught exactly that on its first run.
            bootsBeforeTheCreate:
              code.indexOf('ensureRemoteServer(') > -1 &&
              code.indexOf('remoteCreateArgs({') > -1 &&
              code.indexOf('ensureRemoteServer(') <
                code.indexOf('remoteCreateArgs({'),
            // A value is never read, composed or logged on this Mac for a
            // session on another machine. `captureLoginShellEnv` is the local
            // probe, and neither file may name it.
            namesLocalCapture: code.includes('captureLoginShellEnv')
          };
        })
      };
    })(),

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
        // PHASE 343 (build/p343/SPEC.md D14, §9.1): `find` is handed `-H` only
        // when the folder asked about is itself a link. Every clause below is
        // about `find`'s OPTIONS; the `[ -L ]` tests are what tell a link from
        // a folder and are not read as an option.
        const linkWalkFaults: string[] = [];
        const textLines = text.split('\n').map((line) => line.trim());
        const IF_LINK = 'if [ -L "$p" ]; then h=-H; fi';
        const ifLinkAt = textLines.indexOf(IF_LINK);
        const ifLinkCount = textLines.filter((line) => line === IF_LINK).length;
        if (ifLinkCount !== 1) {
          linkWalkFaults.push(`the line ${IF_LINK} is there ${String(ifLinkCount)} time(s), not once`);
        }
        const hClearedAt = textLines.indexOf('h=');
        if (hClearedAt < 0 || (ifLinkAt >= 0 && hClearedAt > ifLinkAt)) {
          linkWalkFaults.push('no line h= stands before it, so $h could carry a value the far environment set');
        }
        const hSet = text.split('h=-H').length - 1;
        if (hSet !== 1) linkWalkFaults.push(`h=-H is written ${String(hSet)} time(s), not once`);
        const walkerCount = [...text.matchAll(/find /g)].length;
        const linkWalks = text.split('find $h "$p"').length - 1;
        if (linkWalks !== 2 || walkerCount !== 2) {
          linkWalkFaults.push(`${String(linkWalks)} of ${String(walkerCount)} walk(s) read find $h "$p", where both of the two must`);
        }
        for (const m of text.matchAll(/\bfind\b([^"\n]*)"/g)) {
          if (/-L(?![A-Za-z])/.test(m[1] ?? '')) linkWalkFaults.push(`a walk hands find -L before its path: ${JSON.stringify(m[0])}`);
        }
        if (text.includes('-follow')) linkWalkFaults.push('the text names -follow');
        return {
          params: script.params,
          mode: script.mode,
          prunesGit: text.includes('-name ".git" -prune'),
          walkers: walkerCount,
          capped: text.includes('head -n "$3"'),
          depthFromCaller: text.includes('-maxdepth "$2"'),
          followsRootLinkOnly: linkWalkFaults.length === 0,
          linkWalkFaults
        };
      })()
    },

    // --- Phase 102, conditions 50b, 81 and 82 ------------------------------
    // PURE. It reads two compiled script texts and three source files as text.
    // It starts nothing, opens no file under the person's home, contacts no
    // machine and makes no request.
    phase102: (() => {
      const textOf = (id: string): string =>
        REMOTE_SCRIPTS.find((row) => row.id === id)?.text ?? '';
      /**
       * The `guard`, `guardAt` and `firstUseAt` triple, per guarded value.
       *
       * It is the same triple the probe already emits for `reviewFile`, once
       * per value, because a line that guards `$2` says nothing about `$3`.
       * `firstUseAt` skips every `case ` line, so the guard is never counted as
       * a use of what it guards.
       */
      const guardTriple = (id: string, value: string) => {
        const lines = textOf(id).split('\n');
        return {
          id,
          value,
          guard:
            lines.find(
              (line) => line.startsWith('case ') && line.includes(`"${value}"`)
            ) ?? null,
          // PHASE 336 (D10): the reserved-name line for the same value, which
          // stands beside the shape line rather than inside it.
          reserved:
            lines.find(
              (line) => line.startsWith('case ') && line.includes(`"${value}"`) && line.includes('[Gg][Ii][Tt]')
            ) ?? null,
          reservedAt: lines.findIndex(
            (line) => line.startsWith('case ') && line.includes(`"${value}"`) && line.includes('[Gg][Ii][Tt]')
          ),
          guardAt: lines.findIndex(
            (line) => line.startsWith('case ') && line.includes(`"${value}"`)
          ),
          firstUseAt: lines.findIndex(
            (line) => line.includes(value) && !line.startsWith('case ')
          )
        };
      };
      const entryPath = join(machinesDir, 'remote-entry.ts');
      let entrySource = '';
      let entryPresent = true;
      try {
        entrySource = readFileSync(entryPath, 'utf8');
      } catch {
        entryPresent = false;
      }
      const ipcSource = readFileSync(join(machinesDir, 'ipc.ts'), 'utf8');
      const contractSource = machinesContractSource();
      // The two input types, read as text, so "no root crosses" is checkable
      // rather than claimed. A member called `root` on either one would let a
      // folder chosen in the renderer decide what is written under.
      const rootMembers: string[] = [];
      for (const name of ['MachineMakeDirInput', 'MachineRenameInput']) {
        const at = contractSource.indexOf(`export interface ${name} {`);
        if (at < 0) {
          rootMembers.push(`${name} is not in the contract`);
          continue;
        }
        const body = contractSource.slice(at, contractSource.indexOf('\n}', at));
        if (/^\s*(readonly\s+)?root[?]?:/m.test(body)) rootMembers.push(name);
      }
      // PHASE 336: the send is runFolderWrite, the folder-bound door (D13).
      const sendAt = entrySource.indexOf('runFolderWrite(');
      return {
        guards: [
          guardTriple('dir-new', '$2'),
          guardTriple('entry-rename', '$2'),
          guardTriple('entry-rename', '$3')
        ],
        catalogue: ['dir-new', 'entry-rename'].map((id) => {
          const row = REMOTE_SCRIPTS.find((one) => one.id === id);
          return {
            id,
            mode: row?.mode ?? 'missing',
            params: row?.params ?? -1,
            bytes: (row?.text ?? '').length,
            fits: (row?.text ?? '').length <= REMOTE_SCRIPT_MAX_BYTES,
            // The two safe to run twice literals, and the two absences.
            testsBeforeWriting:
              id === 'dir-new'
                ? (row?.text ?? '').includes('if [ -e "$d" ]; then')
                : (row?.text ?? '').includes('[ -e "$t" ]'),
            recursive: (row?.text ?? '').includes('mkdir -p'),
            forced: (row?.text ?? '').includes('mv -f'),
            chmods: [...(row?.text ?? '').matchAll(/chmod [^\n]*/g)].map(
              (hit) => hit[0] ?? ''
            )
          };
        }),
        module: {
          present: entryPresent,
          // The three checks that all have to stand above the one send.
          // PHASE 336: the confirm gate is asked inside writeFolderFor
          // (condition 113 reads that order), and the folder the write is
          // bound by, with its pin, is readyWriteFolder's.
          gateAt: entrySource.indexOf('writeFolderFor('),
          rootAt: entrySource.indexOf('readyWriteFolder('),
          containAt: entrySource.indexOf('relativeUnderRoot('),
          containCalls: [...entrySource.matchAll(/relativeUnderRoot\(/g)].length,
          sendAt,
          namesWriteDoor: sendAt >= 0,
          forbiddenDoors: ['runRemoteRead', 'execRemoteShell'].filter((one) =>
            entrySource.includes(one)
          ),
          importsManifest: /from '\.\.\/manifest\//.test(entrySource),
          rootMembers,
          handlerMakeDir:
            ipcSource.includes("'machines:makeDir'") &&
            ipcSource.includes('makeRemoteDir(input)'),
          handlerRename:
            ipcSource.includes("'machines:renameEntry'") &&
            ipcSource.includes('renameRemoteEntry(input)')
        }
      };
    })(),

    // --- Phase 103, conditions 83 to 85 ------------------------------------
    //
    // Pure. It reads three source files as text and one compiled catalogue. It
    // starts nothing, opens no file under the person's home and contacts no
    // machine.
    phase103: (() => {
      const stagePath = join(machinesDir, 'remote-stage.ts');
      let stageSource = '';
      let stagePresent = true;
      try {
        stageSource = readFileSync(stagePath, 'utf8');
      } catch {
        stagePresent = false;
      }
      const ipcSource = readFileSync(join(machinesDir, 'ipc.ts'), 'utf8');
      const contractSource = machinesContractSource();
      const readOrEmpty = (path: string): string => {
        try {
          return readFileSync(path, 'utf8');
        } catch {
          return '';
        }
      };
      const scmDir = join(repoRoot, 'src', 'renderer', 'scm');
      const groupsSource = readOrEmpty(join(scmDir, 'groups.ts'));
      const sectionSource = readOrEmpty(join(scmDir, 'ScmSection.tsx'));

      // The two handler bodies, read as text, so "neither names a git verb" is
      // checkable rather than claimed. A handler that composed its own verb
      // would be a second place the write decision lives.
      const handlerBody = (channel: string): string => {
        const at = ipcSource.indexOf(`'${channel}'`);
        if (at < 0) return '';
        const end = ipcSource.indexOf('\n  );', at);
        return end < 0 ? ipcSource.slice(at) : ipcSource.slice(at, end);
      };
      // Every git verb this catalogue knows plus the four this phase refuses,
      // as whole words. `git ` itself is tested separately.
      const VERB_WORDS = [
        'add',
        'restore',
        'commit',
        'checkout',
        'clean',
        'reset',
        'cherry-pick',
        'stash',
        'merge',
        'rebase'
      ];
      const verbsIn = (text: string): string[] =>
        VERB_WORDS.filter((word) =>
          new RegExp(`\\b${word.replace('-', '\\-')}\\b`).test(text)
        ).concat(text.includes('git ') ? ['git '] : []);

      // The body of that one function, read from its declaration to the next
      // top level declaration. `\n}` alone is WRONG here: the return type is a
      // multi line object literal, so the first `\n}` closes the TYPE and the
      // slice would hold no body at all. This gate reported that as the
      // function not naming `isConflict` while it named it twice.
      const groupsBody = (() => {
        const at = groupsSource.indexOf('export function groupRemoteFiles');
        if (at < 0) return '';
        const rest = groupsSource.slice(at + 1);
        const end = rest.search(/\n(export |\/\*\*)/);
        return end < 0 ? rest : rest.slice(0, end);
      })();

      // PHASE 336: the send is runFolderWrite, the folder-bound door (D13).
      const sendAt = stageSource.indexOf('runFolderWrite(');
      const inputMembers = (name: string): string[] => {
        const at = contractSource.indexOf(`export interface ${name} {`);
        if (at < 0) return [`${name} is not in the contract`];
        const body = contractSource.slice(at, contractSource.indexOf('\n}', at));
        return ['root', 'repoPath'].filter((member) =>
          new RegExp(`^\\s*(readonly\\s+)?${member}[?]?:`, 'm').test(body)
        );
      };

      return {
        catalogue: ['git-stage', 'git-unstage'].map((id) => {
          const row = REMOTE_SCRIPTS.find((one) => one.id === id);
          return {
            id,
            mode: row?.mode ?? 'missing',
            params: row?.params ?? -1,
            bytes: (row?.text ?? '').length,
            fits: (row?.text ?? '').length <= REMOTE_SCRIPT_MAX_BYTES
          };
        }),
        module: {
          present: stagePresent,
          // The four checks that all have to stand above the one send.
          gateAt: stageSource.indexOf('writeFolderFor('),
          readAt: stageSource.indexOf('reviewFilesOn('),
          holdsAt: stageSource.indexOf('rootRelativeCwd('),
          reportedAt: stageSource.indexOf('reported.has('),
          sendAt,
          namesWriteDoor: sendAt >= 0,
          forbiddenDoors: [
            'runRemoteRead',
            'execRemoteShell',
            'execFile',
            'spawn('
          ].filter((one) => stageSource.includes(one)),
          importsManifest: /from '\.\.\/manifest\//.test(stageSource),
          inputMembers: inputMembers('MachineIndexWriteInput'),
          handlerStage:
            ipcSource.includes("'machines:stage'") &&
            ipcSource.includes('stageOnMachine(input)'),
          handlerUnstage:
            ipcSource.includes("'machines:unstage'") &&
            ipcSource.includes('unstageOnMachine(input)'),
          stageHandlerVerbs: verbsIn(handlerBody('machines:stage')),
          unstageHandlerVerbs: verbsIn(handlerBody('machines:unstage')),
          channelVerbs: verbsIn('machines:stage machines:unstage')
        },
        // The split that reached the renderer. Conditions 85 assert on Builder
        // B's files BY SYMBOL NAME ONLY, never by a sentence, because a pinned
        // sentence across a builder boundary is how a phase deadlocks.
        split: {
          contractHasIndexState: /^\s*indexState: GitFileState;/m.test(
            contractSource
          ),
          contractHasWorktreeState: /^\s*worktreeState: GitFileState;/m.test(
            contractSource
          ),
          groupsExportsGroupRemoteFiles: groupsSource.includes(
            'export function groupRemoteFiles'
          ),
          groupRemoteFilesNamesIsConflict: groupsBody.includes('isConflict'),
          sectionNamesGroupRemoteFiles: sectionSource.includes('groupRemoteFiles')
        }
      };
    })(),

    // --- Phase 104, condition 86 -------------------------------------------
    //
    // Pure. It reads four source files as text and one compiled catalogue. It
    // starts nothing, opens no file under the person's home and contacts no
    // machine.
    phase104: (() => {
      const commitPath = join(machinesDir, 'remote-commit.ts');
      let commitSource = '';
      let commitPresent = true;
      try {
        commitSource = readFileSync(commitPath, 'utf8');
      } catch {
        commitPresent = false;
      }
      const ipcSource = readFileSync(join(machinesDir, 'ipc.ts'), 'utf8');
      const contractSource = machinesContractSource();
      const reviewSource = readFileSync(
        join(machinesDir, 'remote-review.ts'),
        'utf8'
      );
      const readOrEmpty = (path: string): string => {
        try {
          return readFileSync(path, 'utf8');
        } catch {
          return '';
        }
      };
      const scmDir = join(repoRoot, 'src', 'renderer', 'scm');
      const sectionSource = readOrEmpty(join(scmDir, 'ScmSection.tsx'));
      const changesSource = readOrEmpty(join(scmDir, 'remote-changes.ts'));
      const gitServiceSource = readOrEmpty(
        join(repoRoot, 'src', 'main', 'git', 'service.ts')
      );

      // The handler body, read as text, so "it names no git verb" is checkable
      // rather than claimed. It is the same reader condition 84f uses.
      const handlerBody = (channel: string): string => {
        const at = ipcSource.indexOf(`'${channel}'`);
        if (at < 0) return '';
        const end = ipcSource.indexOf('\n  );', at);
        return end < 0 ? ipcSource.slice(at) : ipcSource.slice(at, end);
      };
      const VERB_WORDS = [
        'add',
        'restore',
        'commit',
        'checkout',
        'clean',
        'reset',
        'cherry-pick',
        'stash',
        'merge',
        'rebase'
      ];
      const verbsIn = (text: string): string[] =>
        VERB_WORDS.filter((word) =>
          new RegExp(`\\b${word.replace('-', '\\-')}\\b`).test(text)
        ).concat(text.includes('git ') ? ['git '] : []);
      // THE CHANNEL IS CALLED `machines:commit`, so the word `commit` is in its
      // own name and in the handler that registers it. Condition 84f could
      // demand that no word from the list appears at all, because
      // `machines:stage` and `machines:unstage` name none of them. This one
      // cannot, and it says so rather than dropping the check. What is checked
      // is the property the rule exists for: the handler names no OTHER git
      // verb, and it names no `git ` at all, so no caller can turn the commit
      // into an amend, a reset, a checkout or a discard. The full list is
      // reported beside the filtered one so a reader sees what was excluded.
      const otherVerbsIn = (text: string): string[] =>
        verbsIn(text).filter((word) => word !== 'commit');

      const commitRow = REMOTE_SCRIPTS.find((one) => one.id === 'git-commit');
      const commitText = commitRow?.text ?? '';
      // PHASE 336: the send is runFolderWrite, the folder-bound door (D13).
      const sendAt = commitSource.indexOf('runFolderWrite(');
      const inputMembers = (name: string): string[] => {
        const at = contractSource.indexOf(`export interface ${name} {`);
        if (at < 0) return [`${name} is not in the contract`];
        const body = contractSource.slice(at, contractSource.indexOf('\n}', at));
        return ['root', 'repoPath'].filter((member) =>
          new RegExp(`^\\s*(readonly\\s+)?${member}[?]?:`, 'm').test(body)
        );
      };
      // The two numbers that must agree, read as TEXT out of two files. A
      // constant read by import would agree with itself; these are the digits
      // in the sources.
      const capInModule = (() => {
        const hit = /REMOTE_COMMIT_ANSWER_MAX_BYTES = ([0-9_]+)/.exec(
          commitSource
        );
        return hit === null ? -1 : Number((hit[1] ?? '').replace(/_/g, ''));
      })();
      const capInScript = (() => {
        const hit = /head -c ([0-9]+)/.exec(commitText);
        return hit === null ? -1 : Number(hit[1] ?? '0');
      })();
      const remoteTimeout = (() => {
        const hit = /REMOTE_COMMIT_TIMEOUT_MS = ([0-9_]+)/.exec(commitSource);
        return hit === null ? -1 : Number((hit[1] ?? '').replace(/_/g, ''));
      })();
      const localTimeout = (() => {
        const hit = /COMMIT_TIMEOUT_MS = ([0-9_]+)/.exec(gitServiceSource);
        return hit === null ? -1 : Number((hit[1] ?? '').replace(/_/g, ''));
      })();
      // The `git commit` line on its own, so the four flags that would change
      // what it does are tested per line and anchored on a word boundary. Over
      // the whole text `head -c 8192` could be read as `-c`, and a whole text
      // test for `-a` would be a different kind of wrong answer.
      const commitLine =
        commitText.split('\n').find((line) => line.includes('git commit ')) ??
        '';

      return {
        catalogue: {
          id: 'git-commit',
          mode: commitRow?.mode ?? 'missing',
          params: commitRow?.params ?? -1,
          bytes: commitText.length,
          fits: commitText.length <= REMOTE_SCRIPT_MAX_BYTES,
          // The redirection list, MEASURED with the same regex the row reader
          // uses rather than read by eye. This write's rule is that it is
          // EMPTY, which is weaker than image-put's and is stated as such.
          redirects: [
            ...commitText.matchAll(/(?<!2)>\s*([^\s;|)]+)/g)
          ].map((hit) => hit[1] ?? ''),
          mutators: [
            ...new Set(
              commitText
                .split(/[\s;|&(){}]+/)
                .filter((word) => word.length > 0)
                .filter((word) =>
                  [
                    'rm',
                    'mv',
                    'cp',
                    'mkdir',
                    'touch',
                    'chmod',
                    'chown',
                    'ln',
                    'dd',
                    'tee',
                    'truncate'
                  ].includes(word)
                )
            )
          ].sort(),
          stdinFromNull: commitText.includes('</dev/null'),
          guardsHead: commitText.includes('if [ "$h" != "$2" ]; then'),
          capsAnswer: commitText.includes('head -c 8192'),
          runsCommit: commitText.includes('git commit -m "$3"'),
          commitLine,
          // The four flags that would turn this into something else, per line.
          badFlags: [
            /\s--amend\b/,
            /\s--no-verify\b/,
            /\s-a\b/,
            /\s--all\b/
          ]
            .filter((one) => one.test(commitLine))
            .map((one) => one.source),
          // `-F` anywhere would mean this write makes a file of its own over
          // there. It does not.
          namesMessageFile: /(^|[\s;|&(])-F\b/.test(commitText),
          capInScript
        },
        module: {
          present: commitPresent,
          // The four checks that all have to stand above the one send.
          gateAt: commitSource.indexOf('writeFolderFor('),
          readAt: commitSource.indexOf('reviewFilesOn('),
          holdsAt: commitSource.indexOf('rootRelativeCwd('),
          stagedAt: commitSource.indexOf('stagedPathsOf('),
          sendAt,
          namesWriteDoor: sendAt >= 0,
          forbiddenDoors: [
            'runRemoteRead',
            'execRemoteShell',
            'execFile',
            'spawn('
          ].filter((one) => commitSource.includes(one)),
          importsManifest: /from '\.\.\/manifest\//.test(commitSource),
          inputMembers: inputMembers('MachineCommitInput'),
          handlerCommit:
            ipcSource.includes("'machines:commit'") &&
            ipcSource.includes('commitOnMachine(input)'),
          commitHandlerVerbs: otherVerbsIn(handlerBody('machines:commit')),
          commitHandlerVerbsAll: verbsIn(handlerBody('machines:commit')),
          channelVerbs: otherVerbsIn('machines:commit'),
          channelVerbsAll: verbsIn('machines:commit'),
          capInModule,
          remoteTimeout,
          localTimeout,
          // The guard sha is main's own field on the review answer, so it can
          // never come from the renderer.
          contractHasHeadSha: /^\s*headSha: string;/m.test(contractSource),
          reviewNamesHeadSha: reviewSource.includes('headSha'),
          // Builder B's two files, BY SYMBOL NAME ONLY and never by a sentence.
          sectionNamesCommitBox: sectionSource.includes('RemoteCommitBox'),
          changesNamesCommit: /\bcommit\b/.test(changesSource),
          changesNamesCheckCommit: changesSource.includes('checkCommit')
        }
      };
    })(),

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
        // PHASE 336: either write door is a write.
        callsRemoteWrite: source.includes('runRemoteWrite') || source.includes('runFolderWrite'),
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
        // 56k. PHASE 229. Every line that names `git config`, so the gate can
        // read each one for `--get` of exactly the two identity keys. A bare
        // `git config` writes, which is why the verb is bound to this script
        // and read line by line rather than allowed.
        configLines: text
          .split('\n')
          .filter((one) => /\bgit config\b/.test(one))
          .map((one) => one.trim()),
        // 56g and 56j. What the module does, counted in its own text.
        remoteReads: [...source.matchAll(/runRemoteRead\(/g)].length,
        // PHASE 336: either write door is a write.
        callsRemoteWrite: source.includes('runRemoteWrite') || source.includes('runFolderWrite'),
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
        // PHASE 336: either write door is a write.
        callsRemoteWrite: source.includes('runRemoteWrite') || source.includes('runFolderWrite'),
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
    // --- Phase 234, condition 87 ------------------------------------------
    // The five git command lines the Architecture checkers compose on THIS
    // Mac. `arch-git` carries the same five in its own text, chosen by a KIND
    // word, so this is what lets the gate read one against the other.
    phase234: {
      kinds: [...ARCH_GIT_CALL_KINDS],
      argv: {
        'ls-files': [...lsFilesCall().argv],
        'cat-file-batch': [...catFileBatchCall(['HEAD:a']).argv],
        'log-name-only': [...logNameOnlyCall().argv],
        'status-porcelain': [...statusPorcelainCall().argv],
        'rev-parse-head': [...revParseHeadCall().argv]
      },
      // The one call that carries values, and it carries them on stdin.
      catFileStdin: catFileBatchCall(['HEAD:a', 'HEAD:b']).stdin ?? '',
      gitMaxBytes: ARCH_GIT_MAX_BYTES,
      readFileMaxBytes: ARCH_READ_FILE_MAX_BYTES,
      readListMaxBytes: ARCH_READ_LIST_MAX_BYTES
    },

    // --- Phase 242, condition 88 -------------------------------------------
    // The three writers that take a PATH and the three that take a `cwd`, and
    // the link refusal each one carries. PURE: it reads six compiled script
    // texts and nothing else.
    //
    // Why the whole text crosses rather than a set of booleans. A boolean the
    // gate cannot see the reasoning behind is a check that stops failing the
    // day somebody rewrites the line it was reading, and this refusal is the
    // only thing standing between a link inside the confirmed folder and a
    // write outside it. The gate does every piece of arithmetic itself.
    phase242: (() => {
      const textOf = (id: string): string =>
        REMOTE_SCRIPTS.find((row) => row.id === id)?.text ?? '';
      return {
        filePut: textOf('file-put'),
        dirNew: textOf('dir-new'),
        entryRename: textOf('entry-rename'),
        // PHASE 242.2. The fourth text, and it is here for the OTHER half of
        // condition 88. `image-put` takes no path and so has no walk to read;
        // what it has is a staged name, and until this phase it created that
        // name without unlinking it first, so a symbolic link and a hard link
        // planted there each carried a picture's bytes out of
        // `~/.tortie/images`. Condition 88f reads the same three facts of this
        // text as of `file-put`'s, and 88g RUNS it.
        imagePut: textOf('image-put'),
        // Phase 242.1's three, which take a `cwd` rather than a path and were
        // the hole Phase 242 left open on purpose. Whole texts for the same
        // reason as the three above: the gate does every piece of arithmetic
        // itself and a boolean it cannot see the reasoning behind stops failing
        // the day somebody rewrites the line it was reading.
        gitStage: textOf('git-stage'),
        gitUnstage: textOf('git-unstage'),
        gitCommit: textOf('git-commit'),
        // The two Phase 102 writers' ids, so the gate names what it read
        // rather than what it assumed was there.
        ids: REMOTE_SCRIPTS.map((row) => row.id)
      };
    })(),

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

      // Condition 71a, PHASE 200. The same table, driven with values built by
      // the SECOND COPY of `src/main/errors` loaded above, plus the malformed
      // shapes a structural reader has to refuse. Every row here crossed a
      // loader boundary on its way in, which is what the 0.98.0 audit's failing
      // row actually was, and none of them is an `instanceof` this process's
      // own `GmuxError`. The gate checks that first and refuses to grade the
      // rest if it is not true.
      const secondCopy = secondLoaderErrors;
      const mixedRow = (name: string, err: unknown) => ({
        name,
        // Proof the arm is real: a value from the second loader must NOT be an
        // instance of the class this file imported, or the arm proves nothing.
        instanceofHere: err instanceof GmuxErrorHere,
        verdict: serverProbeVerdict(err),
        answer: classifyConfirmationFailure(err)
      });
      const mixedLoader = {
        sameClass: secondCopy.GmuxError === GmuxErrorHere,
        rows: [
          mixedRow(
            'a completed no server answer built by a second loader',
            secondCopy.gmuxError(
              'TMUX_UNREACHABLE',
              'no answer',
              'no server running on /tmp/x'
            )
          ),
          mixedRow(
            'a session named as missing by a second loader',
            secondCopy.gmuxError('SESSION_NOT_FOUND', 'gone', 'session not found')
          ),
          mixedRow(
            'a machine that could not be reached, from a second loader',
            secondCopy.gmuxError('TMUX_UNREACHABLE', 'no answer', 'connection refused')
          ),
          mixedRow(
            'a plain object carrying nothing but the payload shape',
            Object.assign(new Error('serialised across a boundary'), {
              payload: {
                code: 'TMUX_UNREACHABLE',
                message: 'no answer',
                detail: 'no server running on /tmp/x'
              }
            })
          ),
          mixedRow(
            'malformed: the payload is a string',
            Object.assign(new Error('no answer'), {
              payload: 'no server running on /tmp/x'
            })
          ),
          mixedRow(
            'malformed: the payload is an array',
            Object.assign(new Error('no answer'), {
              payload: ['TMUX_UNREACHABLE', 'no server running on /tmp/x']
            })
          ),
          mixedRow(
            'malformed: the code is a number',
            Object.assign(new Error('no answer'), {
              payload: { code: 7, message: 'x', detail: 'no server running on /tmp/x' }
            })
          ),
          mixedRow(
            'malformed: a code this release never named',
            Object.assign(new Error('no answer'), {
              payload: {
                code: 'TMUX_HOLDS_NOTHING',
                message: 'x',
                detail: 'no server running on /tmp/x'
              }
            })
          ),
          mixedRow(
            'malformed: the message is missing',
            Object.assign(new Error('no answer'), {
              payload: { code: 'TMUX_UNREACHABLE', detail: 'no server running on /tmp/x' }
            })
          ),
          mixedRow(
            'malformed: the detail is not text',
            Object.assign(new Error('no answer'), {
              payload: {
                code: 'TMUX_UNREACHABLE',
                message: 'x',
                detail: { text: 'no server running on /tmp/x' }
              }
            })
          ),
          mixedRow(
            'malformed: the payload is null',
            Object.assign(new Error('no answer'), { payload: null })
          )
        ]
      };

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
        mixedLoader,
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

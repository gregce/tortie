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
  remoteVerbsOf
} from '../src/main/machines/exec-plane';
import { remoteBootArgs } from '../src/main/machines/remote-server';
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
import { TESTED_REMOTE_TMUX_VERSIONS } from '../src/main/tmux/version';
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

const fieldRows = [
  ...MACHINE_EXECUTION_FIELDS.map((field) => ({
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
  { name: 'a missing address', row: { id: 'nohost' }, field: 'host' }
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
  reasonLength: row.reason.length
}));

const remoteList = TESTED_REMOTE_TMUX_VERSIONS.map((row) => ({
  version: row.version,
  exec: row.measured.exec,
  control: row.measured.control,
  measuredAt: row.measuredAt,
  noteLength: row.note.length
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

process.stdout.write(
  JSON.stringify({
    id: ID,
    base,
    sameAgain: machineExecutionHash(ID, { ...BASE }),
    fields: fieldRows,
    executionFields: [...MACHINE_EXECUTION_FIELDS],
    presentationFields: [...MACHINE_PRESENTATION_FIELDS],
    hashedKeys,
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
    ).includes("smoke === 'remote-matrix'")
  })
);

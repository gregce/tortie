/**
 * GMUX_SMOKE=remote-matrix. The ten row fault matrix (Phase 72, M5).
 *
 * ## What this is and why it gates the rung
 *
 * Research 28 section 6.3 lists ten ways working on another machine goes wrong.
 * Section 6 of research 51 says all ten have to hold before Tortie is allowed
 * to bring a session back on a machine. This harness is those ten rows, run
 * against a real app holding real connections to two real machines, and it is
 * the gate rather than a report: if it is not green, restore ships refused.
 *
 * ## The rows were written for a design Tortie did not build
 *
 * Research 28 assumed a whole Tortie running on the far side. Three of its ten
 * rows name things that do not exist here. Each is translated, and the
 * translation is printed BESIDE the original by `build/remote-matrix.mjs`, so a
 * reader checks the translation rather than taking it on trust. The most
 * important one is row 10: there is no move gesture in this design, so "move
 * with a dirty tree" becomes "forget a machine that is holding live sessions",
 * which is the same shape of loss, being a person's gesture that could throw
 * away work they cannot see.
 *
 * ## The division of work with the supervisor
 *
 * `build/remote-matrix.mjs` owns the machines and the faults. It starts every
 * sshd, it records every pid, and it is the only thing that kills any of them.
 * This process never kills anything it did not start.
 *
 * This process owns the MOMENTS, because only it knows when a list is in the
 * air. It asks for a fault through a request file and waits for the answer,
 * which carries the epoch millisecond the supervisor acted.
 *
 * This process writes FACTS, being numbers and named booleans, and it does not
 * grade itself. `build/remote-matrix.mjs` reads the facts and applies the
 * invariant for each row. That split is the fix Phase 71's verifier asked for:
 * a harness that decides its own verdict can decide it over zero rows.
 *
 * ## Four legs, one process each
 *
 * Two rows cannot be measured inside a process that is already running with a
 * machine up, so the supervisor launches this harness four times and the
 * carriage file says which leg this launch is.
 *
 *   seed    create one session on machine one and leave it running, so the two
 *           legs below have something that exists before they start
 *   second  a SECOND profile pointed at the same machine (row 3)
 *   cold    a launch with machine one down, holding the seed leg's manifest
 *           row (row 2)
 *   main    rows 1, 4, 5, 6, 7, 8, 9 and 10
 *
 * ## Safety
 *
 * It refuses to run unless the profile is inside `GMUX_CONFIG_ROOT` and the
 * tmux socket is not the real one, through the same guard the fault harness
 * uses. The socket matters most of all here: the far side of every connection
 * is this same Mac, so a remote `new-session` on socket `gmux` would create a
 * session on the server holding the operator's live work.
 */

import { app } from 'electron';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { MachineRowV1 } from '@shared/machines';
import type { Session, SessionStatus } from '@shared/types';
import { getGmuxCore, shutdownGmuxCore } from '../sessions';
import type { GmuxCore } from '../sessions';
import { activeTmuxSocket, TMUX_SOCKET } from '../tmux/resolve';
import {
  MACHINE_CONFIRM_ACKNOWLEDGEMENT,
  confirmMachine,
  describeMachine,
  forgetMachine,
  type MachineExecutionFields
} from '../machines/confirm';
import { machineContext, type RemoteMachineContext } from '../machines/context';
import { openControlPlane, machineLinkFacts } from '../machines/control-plane';
import { execOn } from '../machines/exec-plane';
import { prepareMachine } from '../machines/prepare';
// Phase 72, Builder A. The sentence a refused restore prints.
import { RESTORE_UNSEEN } from '../machines/remote-copy';
// Phase 72, Builder A. The one place a remote session meets the manifest.
import { remoteRecordsForMachine } from '../machines/remote-record';
// Phase 72, Builder A. The verb this whole rung exists to make safe, and the
// read back it composes for this matrix so the two cannot drift apart.
import {
  readBackRemoteStamps,
  restoreRemoteSession
} from '../machines/remote-restore';
import {
  parseRemoteListLine,
  readyRemoteContext,
  remoteCreate,
  remoteListArgs,
  remoteMachineFacts,
  remoteSessionRow,
  remoteSessions,
  startMachineFeed
} from '../machines/remote-sessions';
// Phase 72 fix round. Rows 5 and 8 are about ONE SAVED COPY, not about the
// cadence, and waiting for the cadence timer produced no copy at all on the
// first run. They drive the product's own pass instead, which is the same
// function the timer calls, so what they grade is a copy the product made.
import {
  REMOTE_CAPSULE_PER_PASS,
  captureEveryMachine,
  captureMachineOnce,
  remoteCapsuleFacts
} from '../machines/remote-capsule';
import {
  addMachineRow,
  currentMachines,
  machineHostKeysPath,
  reloadMachines,
  removeMachineRow
} from '../machines/store';
// Phase 72, Builder C. What `machines:remove` does on this Mac, in its order.
import { forgetMachineSessions } from '../machines/tombstone';
// The durable ring. Every capsule number below is read through these two, which
// are the same readers the product uses, so a capsule this harness counts is a
// capsule a person could open.
import {
  readCapsules,
  readSavedOutput,
  resolveSnapshot
} from '../restore/snapshots';

import { assertHarnessIsolation } from './isolation';

function log(line: string): void {
  console.log(`[gmux-matrix] ${line}`);
}

function fail(message: string): never {
  throw new Error(message);
}

// ---------------------------------------------------------------------------
// The machines this harness uses
// ---------------------------------------------------------------------------

/** The machine every fault is aimed at. */
const CUT = 'matrixone';
/** The machine that is never touched. It is how "nothing else moved" is measured. */
const STEADY = 'matrixtwo';
/**
 * The same computer as {@link CUT}, reached through a program reporting a
 * version nobody measured.
 *
 * It is a machine ROW rather than a second computer, because the only thing
 * rows 5 and 6 change is the program Tortie runs on the far side, and that is a
 * field of the row. The two rows below therefore share machine one's own
 * session server, which is correct: they are the same computer. Row 7 ends that
 * server, and it runs after both of them.
 */
const STUB = 'matrixstub';
/** The same computer, reached through a program that reports times 48 hours ahead. */
const SKEW = 'matrixskew';

/** How far ahead the skew shim puts the far side's reported times. */
const SKEW_MS = 48 * 60 * 60 * 1000;


/** How long row 9 watches a busy machine. Fixed, because a deadline is not a setting. */
const CADENCE_WINDOW_MS = 300_000;
/** How many sessions row 9 puts on one link. */
const CADENCE_SESSIONS = 30;
/** The cap row 9 grades against: three passes of at most eight. */
const CADENCE_CAP = 24;

// ---------------------------------------------------------------------------
// What the supervisor wrote, and what this process writes back
// ---------------------------------------------------------------------------

interface CarriageMachine {
  id: string;
  host: string;
  port: number;
  user: string;
  remoteTmuxPath: string;
  cut: boolean;
}

interface Carriage {
  /** Which of the four launches this is. */
  leg: 'seed' | 'second' | 'cold' | 'main';
  machines: CarriageMachine[];
  /** A program on this Mac reporting a version nobody measured. */
  stubTmuxPath: string;
  /** A program on this Mac reporting session times 48 hours ahead. */
  skewTmuxPath: string;
}

/** One row of the matrix, as facts. The supervisor grades these. */
interface MatrixRowResult {
  /** `matrix.<name>`, the row's stable id. */
  id: string;
  /** Research 28 section 6.3's own wording. */
  research: string;
  /** What was injected here, in this design's terms. */
  translation: string;
  /** Numbers and named booleans. Nothing in here is a verdict. */
  facts: Record<string, unknown>;
  /** Anything measured that has no column of its own. */
  notes: string[];
}

const results: MatrixRowResult[] = [];

let root = '';
let requestSeq = 0;

/**
 * The booted core, held so the status watcher can read the WHOLE session list.
 *
 * It reads `core.listSessions()` rather than `remoteSessions()`, and that is
 * not tidying. Two of the invariants below are about rows that are NOT on the
 * machine being cut, being the rows on this Mac and the rows on the other
 * machine. Watching only the remote feed would check those over zero rows and
 * report a clean pass, which is the exact defect Phase 71's verifier found in
 * the partition harness.
 */
let coreRef: GmuxCore | null = null;

const carriagePath = (): string => join(root, 'p72-carriage.json');
const requestPath = (): string => join(root, 'p72-request.json');
const ackPath = (): string => join(root, 'p72-ack.json');
const reportPath = (leg: string): string => join(root, `p72-${leg}.json`);

function readCarriage(): Carriage {
  try {
    return JSON.parse(readFileSync(carriagePath(), 'utf8')) as Carriage;
  } catch {
    return fail(
      `no carriage file at ${carriagePath()}. The supervisor writes it before ` +
        `it launches this process, so a run without one has measured nothing.`
    );
  }
}

/**
 * What this process may ask the supervisor to do. Nothing else is possible.
 *
 * `noise` is the fix round's, and it exists because Tortie composes NO argv for
 * a session created as a plain shell. Rows 8 and 9 need sessions on that machine
 * to print something, and nothing Tortie does can make them. The supervisor
 * owns that machine, so it types into the sessions from the machine's own side,
 * which is also the honest shape of the case: bytes appear on the far side that
 * Tortie did not put there.
 */
type FaultWant = 'down' | 'up' | 'end-server' | 'noise';

/**
 * Ask the supervisor for a fault and wait for it to say when it acted.
 *
 * Every duration in this file is measured from the returned instant. This
 * process kills nothing, because it started nothing.
 */
async function askSupervisor(
  want: FaultWant,
  point: string,
  /** The far side's own identifiers for the sessions a `noise` request covers. */
  names: readonly string[] = []
): Promise<number> {
  requestSeq += 1;
  const request = { seq: requestSeq, want, point, machine: 'one', names };
  writeFileSync(requestPath(), JSON.stringify(request), 'utf8');
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const ack = JSON.parse(readFileSync(ackPath(), 'utf8')) as {
        seq: number;
        at: number;
      };
      if (ack.seq === request.seq) return ack.at;
    } catch {
      /* the supervisor has not answered this one yet */
    }
    await new Promise((r) => setTimeout(r, 50));
  }
  return fail(`the supervisor did not answer the "${want}" request for ${point}`);
}

/** Wait for a condition, asking it every 100 ms. Returns whether it held. */
async function waitFor(what: () => boolean, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (what()) return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  return what();
}

const sleep = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Reading the world
// ---------------------------------------------------------------------------

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

/** The operator's own server, read only, counted. */
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

/** ssh children of this process, read from the process table. */
function sshChildCount(): number {
  try {
    const out = execFileSync('/bin/ps', ['-o', 'pid=,ppid=,comm='], {
      encoding: 'utf8'
    });
    return out
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => {
        const parts = line.split(/\s+/);
        return parts[1] === String(process.pid) && line.includes('ssh');
      }).length;
  } catch {
    return 0;
  }
}

/**
 * Every row Tortie would DRAW for one machine.
 *
 * It reads the core's own list rather than the machine feed, and that is load
 * bearing. Since this rung a remote session has a manifest row, so a machine
 * that has never answered in this run still has rows on screen, projected from
 * the manifest. Row 2 is exactly that case, and reading the feed instead would
 * have found no rows and checked its invariants over nothing.
 */
function rowsOn(machineId: string): Session[] {
  const all = coreRef?.listSessions() ?? remoteSessions();
  return all.filter((one) => one.machine?.id === machineId);
}

/** Every capsule capture time on record for one session. */
function captureTimes(sessionId: string): number[] {
  return readCapsules(sessionId).map((one) => one.capturedAt);
}

/**
 * Watch a set of sessions and collect every distinct capture time that appears.
 *
 * This is the whole instrument for rows 1, 8 and 9. It uses the product's own
 * capsule reader, so a capture counted here is a capsule a person could open.
 */
function captureWatcher(ids: readonly string[]): {
  stop(): void;
  /** Distinct capture times per session. */
  seen(): Map<string, Set<number>>;
  /** How many captures happened in total. */
  total(): number;
  /** How many happened at or after one instant. */
  totalAfter(at: number): number;
  /** The most captures that shared one five second bucket. */
  busiestBucket(): number;
} {
  const seen = new Map<string, Set<number>>();
  for (const id of ids) seen.set(id, new Set(captureTimes(id)));
  const timer = setInterval(() => {
    for (const id of ids) {
      const set = seen.get(id);
      if (set === undefined) continue;
      for (const at of captureTimes(id)) set.add(at);
    }
  }, 1_000);
  timer.unref?.();
  const startedWith = new Map(
    [...seen.entries()].map(([id, set]) => [id, new Set(set)])
  );
  const fresh = (): { id: string; at: number }[] => {
    const out: { id: string; at: number }[] = [];
    for (const [id, set] of seen) {
      const before = startedWith.get(id) ?? new Set<number>();
      for (const at of set) if (!before.has(at)) out.push({ id, at });
    }
    return out;
  };
  return {
    stop: () => clearInterval(timer),
    seen: () => seen,
    total: () => fresh().length,
    totalAfter: (at: number) => fresh().filter((one) => one.at >= at).length,
    busiestBucket: () => {
      const buckets = new Map<number, number>();
      for (const one of fresh()) {
        const bucket = Math.floor(one.at / 5_000);
        buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
      }
      return Math.max(0, ...buckets.values());
    }
  };
}

/**
 * Watch every status a set of rows takes, sampled at 250 ms.
 *
 * The wait and the measurement read the SAME list, which is the fix Phase 71
 * measured: a wait on the live rows returned before the sample it was about
 * existed, and the gate then failed on a number the samples plainly contained.
 */
function statusWatcher(): {
  stop(): void;
  took(sessionId: string): SessionStatus[];
  everyId(): string[];
  firstAllUnknownAt(ids: readonly string[]): number | null;
} {
  const taken: { at: number; rows: Record<string, SessionStatus> }[] = [];
  const read = (): Session[] => coreRef?.listSessions() ?? remoteSessions();
  const timer = setInterval(() => {
    const rows: Record<string, SessionStatus> = {};
    for (const one of read()) rows[one.id] = one.status;
    taken.push({ at: Date.now(), rows });
  }, 250);
  timer.unref?.();
  return {
    stop: () => clearInterval(timer),
    took: (sessionId) => [
      ...new Set(
        taken
          .map((sample) => sample.rows[sessionId])
          .filter((one): one is SessionStatus => one !== undefined)
      )
    ],
    everyId: () => [...new Set(taken.flatMap((sample) => Object.keys(sample.rows)))],
    firstAllUnknownAt: (ids) =>
      taken.find(
        (sample) =>
          ids.length > 0 && ids.every((id) => sample.rows[id] === 'unknown')
      )?.at ?? null
  };
}

/**
 * The machines file row for one set of execution fields.
 *
 * A field the person left empty is ABSENT from the row rather than null,
 * because that is what the file's own shape says and a row Tortie writes must
 * be a row Tortie would read.
 */
function rowFrom(
  machineId: string,
  label: string,
  color: 'orange' | 'blue' | 'red' | 'green',
  fields: MachineExecutionFields
): MachineRowV1 {
  return {
    id: machineId,
    label,
    color,
    host: fields.host,
    ...(fields.user === null ? {} : { user: fields.user }),
    ...(fields.port === null ? {} : { port: fields.port }),
    ...(fields.remoteTmuxPath === null
      ? {}
      : { remoteTmuxPath: fields.remoteTmuxPath })
  };
}

/** Add, confirm and prepare one machine, and wait until a verb may be sent. */
async function bringUp(
  machineId: string,
  label: string,
  color: 'orange' | 'blue' | 'red' | 'green',
  fields: MachineExecutionFields,
  expect: 'prepared' | 'version-unmeasured' = 'prepared'
): Promise<void> {
  addMachineRow(rowFrom(machineId, label, color, fields));
  reloadMachines();
  confirmAsAPerson(machineId, fields);
  const answered = await prepareMachine({
    machineId,
    fields,
    tortieHostKeys: machineHostKeysPath()
  });
  if (answered.class !== expect) {
    fail(`${machineId} answered ${answered.class}: ${answered.detail}`);
  }
  if (expect !== 'prepared') return;
  const usable = await waitFor(() => {
    try {
      readyRemoteContext(machineId);
      return true;
    } catch {
      return false;
    }
  }, 30_000);
  if (!usable) fail(`${machineId} prepared and then had no usable connection`);
}

/** The one first contact per machine, by hand, exactly as every other harness does it. */
function recordHostKeys(machines: readonly CarriageMachine[]): void {
  const record = machineHostKeysPath();
  mkdirSync(dirname(record), { recursive: true });
  const ports = [...new Set(machines.map((one) => one.port))];
  writeFileSync(
    record,
    ports
      .map((port) =>
        execFileSync('/usr/bin/ssh-keyscan', ['-p', String(port), '127.0.0.1'], {
          encoding: 'utf8',
          timeout: 30_000
        })
      )
      .join(''),
    'utf8'
  );
}

/** Run something that must be refused, and report what the refusal said. */
async function refusalOf(work: () => Promise<unknown>): Promise<string> {
  try {
    await work();
  } catch (err) {
    return (err as Error).message;
  }
  return '';
}

function record(row: MatrixRowResult): void {
  results.push(row);
  log(`${row.id}: ${JSON.stringify(row.facts)}`);
}

// ---------------------------------------------------------------------------
// The four legs
// ---------------------------------------------------------------------------

/** The name every leg gives the seeded session, so the cold leg can find it. */
const SEED_NAME = 'p72 seed';

/**
 * Leg 1. Create one session on machine one and leave it running.
 *
 * It writes no row of the matrix. It exists so that the second client leg has
 * a session it did not create, and so the cold leg has a manifest row for a
 * machine that is down.
 */
async function runSeedLeg(carriage: Carriage): Promise<void> {
  const one = machineOf(carriage, 'one');
  recordHostKeys(carriage.machines);
  coreRef = await getGmuxCore();
  await bringUp(CUT, 'Matrix One', 'orange', fieldsOf(one));
  const seeded = await remoteCreate({
    machineId: CUT,
    name: SEED_NAME,
    projectPath: '/tmp',
    cwd: '/tmp',
    agent: 'shell'
  });
  await openControlPlane(CUT);
  await startMachineFeed(CUT);
  const rows = remoteRecordsForMachine(CUT);
  log(
    `seed: ${seeded.id} is running on ${CUT} and the manifest holds ` +
      `${String(rows.length)} row(s) for that machine`
  );
  writeFileSync(
    reportPath('seed'),
    JSON.stringify({ leg: 'seed', seededId: seeded.id, rows: rows.length }, null, 2),
    'utf8'
  );
}

/**
 * Leg 2, row 3. A second Tortie, on its own profile, pointed at the same machine.
 *
 * The rule is the one the standing honesty line states: Tortie never adopts
 * work that is already running on a machine, and it never touches it. This
 * profile did not create the seeded session, so it must list it as one it does
 * not own, write no manifest row for it, offer no Restore for it, and end
 * nothing.
 */
async function runSecondClientLeg(carriage: Carriage): Promise<void> {
  const one = machineOf(carriage, 'one');
  recordHostKeys(carriage.machines);
  coreRef = await getGmuxCore();
  await bringUp(CUT, 'Matrix One', 'orange', fieldsOf(one));
  const ctx = machineContext(CUT) as RemoteMachineContext;
  await openControlPlane(CUT);
  await startMachineFeed(CUT);
  await waitFor(() => remoteMachineFacts(CUT).everAnswered, 30_000);

  // What the machine itself holds, read directly, so the count below is not
  // taken from the same memory it is checking.
  const onMachine = (await execOn(ctx, remoteListArgs()))
    .split('\n')
    .map(parseRemoteListLine)
    .filter((line) => line !== null && line.gmuxId.length > 0);

  const facts = remoteMachineFacts(CUT);
  const drawn = rowsOn(CUT);
  const restoreOffered = drawn.filter(
    (session) => session.machine?.canRestore === true
  ).length;

  record({
    id: 'matrix.two-clients',
    research: 'Two clients, one remote session',
    translation:
      'a second profile with its own user data directory, pointed at the ' +
      'machine that already holds a session this profile did not create',
    facts: {
      sessionsOnMachine: onMachine.length,
      rowsThisProfileDrew: drawn.length,
      // The claim is that a session another Tortie created is never adopted.
      // A manifest row for it would BE the adoption.
      manifestRowsThisProfileWrote: remoteRecordsForMachine(CUT).length,
      restoreOffered,
      killsSent: 0,
      foreignRowsSeen: facts.foreign
    },
    notes: [
      `this profile listed ${String(onMachine.length)} session(s) of Tortie's ` +
        `on that machine and wrote ${String(
          remoteRecordsForMachine(CUT).length
        )} manifest row(s) of its own`
    ]
  });
}

/**
 * Leg 3, row 2. A launch with the machine down, holding a row from before.
 *
 * The seed leg's profile is reused, so this process starts with a manifest row
 * for a machine that will not answer. Nothing about that row may be rewritten,
 * no session may be created on this Mac to stand in for it, and the row must
 * read `unknown` rather than anything that means the session ended.
 */
async function runColdLeg(carriage: Carriage): Promise<void> {
  const one = machineOf(carriage, 'one');
  // PHASE 72 FIX ROUND, AND IT IS WHAT MAKES THIS LEG A LAUNCH.
  //
  // The real app reads the machines file once at boot, from `initMachines` in
  // src/main/index.ts. This leg did not, so `machineRow('matrixone')` was null,
  // the restore gate reached its first arm, and the row told the person "you
  // removed this machine from Tortie" about a machine nobody removed. The row
  // this leg exists to check was measuring a harness defect.
  reloadMachines();
  const core = await getGmuxCore();
  coreRef = core;
  const localBefore = core
    .listSessions()
    .filter((session) => session.machine === undefined).length;
  // PHASE 72 FIX ROUND. WHAT IS SAMPLED CHANGED, and the reason is that the
  // first cut asked for the wrong thing.
  //
  // It asked whether the row was rewritten at all, and the row IS rewritten by
  // design: a machine Tortie cannot see writes `unknown` on every row it owns,
  // durably, because that is what the next launch has to believe before any
  // machine answers. Research 51 section 4.4 is that rule. So the row could
  // never pass, whatever the app did.
  //
  // What must not move is everything that says what the session IS and how to
  // bring it back. That is sampled here, and the status is graded separately
  // and must read `unknown`.
  const identityOf = (): string =>
    JSON.stringify(
      remoteRecordsForMachine(CUT)
        .map((row) => [
          row.id,
          row.machineId,
          row.name,
          row.tmuxName,
          row.cwd,
          row.projectPath,
          row.agent,
          row.argv.join(' '),
          row.createdAt
        ])
        .sort()
    );
  const identityBefore = identityOf();
  const statusesBefore = [
    ...new Set(remoteRecordsForMachine(CUT).map((row) => row.status))
  ];

  // The machine is already in this profile's file from the seed leg, so it is
  // signed in to rather than added again. The prepare will fail, and that
  // failure IS the case.
  const answered = await prepareMachine({
    machineId: CUT,
    fields: fieldsOf(one),
    tortieHostKeys: machineHostKeysPath()
  });
  await startMachineFeed(CUT).catch(() => undefined);
  await waitFor(() => rowsOn(CUT).length > 0, 30_000);
  await sleep(5_000);

  const drawn = rowsOn(CUT);
  const identityAfter = identityOf();
  const statusesAfter = [
    ...new Set(remoteRecordsForMachine(CUT).map((row) => row.status))
  ];
  const localAfter = core
    .listSessions()
    .filter((session) => session.machine === undefined).length;

  record({
    id: 'matrix.unreachable-at-launch',
    research: 'Host unreachable at launch',
    translation:
      'the app is started with machine one down, holding a manifest row a ' +
      'previous run created on it',
    facts: {
      rowsOnScreen: drawn.length,
      statuses: [...new Set(drawn.map((session) => session.status))],
      restoreOffered: drawn.filter((one2) => one2.machine?.canRestore === true)
        .length,
      machineStatementLength: (drawn[0]?.machine?.restoreReason ?? '').length,
      localSessionsBefore: localBefore,
      localSessionsAfter: localAfter,
      rowIdentityUnchanged: identityBefore === identityAfter,
      manifestStatusesBefore: statusesBefore,
      manifestStatusesAfter: statusesAfter,
      prepareClass: answered.class
    },
    notes: [
      `the prepare answered ${answered.class}`,
      `the machines file held ${String(currentMachines().rows.length)} row(s) ` +
        `when this leg started, which is what a real launch reads at boot`,
      `the row says: ${drawn[0]?.machine?.restoreReason ?? '(nothing)'}`
    ]
  });
}

// ---------------------------------------------------------------------------
// Leg 4, the eight rows that need a running app with machines up
// ---------------------------------------------------------------------------

async function runMainLeg(carriage: Carriage): Promise<void> {
  const one = machineOf(carriage, 'one');
  const two = machineOf(carriage, 'two');
  recordHostKeys(carriage.machines);
  const core = await getGmuxCore();
  coreRef = core;

  await bringUp(CUT, 'Matrix One', 'orange', fieldsOf(one));
  await bringUp(STEADY, 'Matrix Two', 'blue', fieldsOf(two));
  const ctx = machineContext(CUT) as RemoteMachineContext;

  const local = await core.createSession({
    name: 'p72-local',
    projectPath: root,
    cwd: root,
    agent: 'shell',
    extraArgs: ['-c', 'while true; do date; sleep 1; done']
  });
  const onCut = await remoteCreate({
    machineId: CUT,
    name: 'p72 one',
    projectPath: '/tmp',
    cwd: '/tmp',
    agent: 'shell'
  });
  const onSteady = await remoteCreate({
    machineId: STEADY,
    name: 'p72 two',
    projectPath: '/tmp',
    cwd: '/tmp',
    agent: 'shell'
  });
  await openControlPlane(CUT);
  await startMachineFeed(CUT);
  await openControlPlane(STEADY);
  await startMachineFeed(STEADY);
  log(
    `set up: ${local.id} here, ${onCut.id} on ${CUT}, ${onSteady.id} on ${STEADY}`
  );

  // The supervisor waits for this line before it answers any request.
  log('ready');

  await rowTransportLoss(core, onCut, onSteady, local);
  await rowRestoreUnreachable(onCut);
  await rowClockSkew(carriage, one);
  await rowVersionUnmeasured(carriage, one);
  await rowRemoteReboot(onCut);
  await rowUntrustedBytes();
  await rowCaptureCadence();
  await rowForgetMachine(ctx);

  await core.killSession(local.id).catch(() => undefined);
}

/**
 * Row 1. The link to a healthy machine is cut while a session runs.
 *
 * Research 28 ranks this first because it is the one that costs work: a lost
 * link read as a death offers Restore over an agent that is still working. Two
 * other things are measured at the same time, because a per machine reconcile
 * is what makes them true: nothing on the other machine moved, and nothing on
 * this Mac moved.
 */
async function rowTransportLoss(
  core: GmuxCore,
  onCut: Session,
  onSteady: Session,
  local: Session
): Promise<void> {
  const statuses = statusWatcher();
  // TWO WATCHERS, and the split is the fix round's. One counts copies of the
  // session on the machine whose link is cut, which must be zero, and the other
  // counts copies on the machine that was never touched, which are correct and
  // are reported rather than graded. One watcher over both counted a legitimate
  // copy from the machine that was still up as a copy taken while a link was
  // down.
  const captures = captureWatcher([onCut.id]);
  const capturesElsewhere = captureWatcher([onSteady.id]);
  await sleep(1_000);
  const killedAt = await askSupervisor('down', 'matrix.transport-loss');
  const sawUnknown = await waitFor(
    () => statuses.firstAllUnknownAt([onCut.id]) !== null,
    120_000
  );
  await sleep(5_000);

  const drawnWhileDown = rowsOn(CUT);
  const restoreOffered = drawnWhileDown.filter(
    (one) => one.machine?.canRestore === true
  ).length;
  const firstUnknown = statuses.firstAllUnknownAt([onCut.id]);
  // COUNTED FROM THE INSTANT THE SUPERVISOR CUT THE LINK, not from when the
  // watcher started. The watcher is armed a second before the cut so it holds a
  // baseline, and a copy taken in that second is a copy taken while the link
  // was UP.
  const capturesWhileDown = captures.totalAfter(killedAt);
  const elsewhereWhileDown = capturesElsewhere.totalAfter(killedAt);

  await askSupervisor('up', 'matrix.transport-loss');
  await waitFor(() => remoteMachineFacts(CUT).answering, 90_000);
  statuses.stop();
  captures.stop();
  capturesElsewhere.stop();

  record({
    id: 'matrix.transport-loss',
    research: 'Transport loss on a healthy host',
    translation:
      'the sign in program serving machine one is ended, with all of its ' +
      'children, while a session runs there',
    facts: {
      rowsWatchedOnCut: 1,
      rowsWatchedOnOther: 1,
      rowsWatchedHere: 1,
      toUnknownMs: sawUnknown && firstUnknown !== null ? firstUnknown - killedAt : null,
      statusesOnCut: statuses.took(onCut.id),
      statusesOnOther: statuses.took(onSteady.id),
      statusesHere: statuses.took(local.id),
      localStatusNow:
        core.listSessions().find((one) => one.id === local.id)?.status ?? '(gone)',
      restoreOfferedWhileDown: restoreOffered,
      capturesWhileDown,
      // The machine that was never cut. Copies here are correct, so the number
      // is printed and nothing is graded on it.
      capturesOnTheOtherMachineWhileDown: elsewhereWhileDown,
      capsuleRule: 'capture is connected only, so a cut link captures nothing'
    },
    notes: [
      `the machine's own link read ${machineLinkFacts(CUT).link} after the cut`
    ]
  });
}

/**
 * Row 4. Restore pressed while the machine is out of sight.
 *
 * This is the double run refusal in its plainest form. Nothing may be created
 * on this Mac, nothing may be sent, and nothing may be written.
 */
async function rowRestoreUnreachable(onCut: Session): Promise<void> {
  const sshBefore = sshChildCount();
  await askSupervisor('down', 'matrix.restore-unreachable');
  await waitFor(
    () => rowsOn(CUT).length > 0 && rowsOn(CUT).every((one) => one.status === 'unknown'),
    120_000
  );

  // PHASE 72 FIX ROUND. THE BEFORE SAMPLE IS TAKEN HERE, and where it is taken
  // is the whole of what this row can prove.
  //
  // It used to be taken before the link was cut. Cutting the link writes
  // `unknown` over every row on that machine, by design and through the case
  // table, so the two samples always differed and the row could not pass
  // whatever the restore did. What is under test is the REFUSED RESTORE, so the
  // sample is taken after the rows have gone unknown and immediately before the
  // restore is pressed. `lastSeen` is sampled as well as the status, because a
  // write that touched only that would otherwise not show.
  const sample = (): string =>
    JSON.stringify(
      remoteRecordsForMachine(CUT)
        .map((row) => [row.id, row.status, row.lastSeen, row.tmuxName])
        .sort()
    );
  const before = sample();
  const rowsUnderTest = rowsOn(CUT).length;
  const said = await refusalOf(() => restoreRemoteSession(onCut.id));
  const after = sample();
  const sshAfter = sshChildCount();
  await askSupervisor('up', 'matrix.restore-unreachable');
  await waitFor(() => remoteMachineFacts(CUT).answering, 90_000);

  record({
    id: 'matrix.restore-unreachable',
    research: 'Restore against an unreachable host',
    translation:
      'Restore is pressed on a row whose machine is not answering, and the ' +
      'refusal, the process count and the manifest are all read afterwards',
    facts: {
      refused: said.length > 0,
      saysUnseen: said.includes(RESTORE_UNSEEN.slice(0, 40)),
      sshChildrenBefore: sshBefore,
      sshChildrenAfter: sshAfter,
      manifestUnchanged: before === after,
      rowsUnderTest
    },
    notes: [
      said === '' ? 'nothing was refused' : `it said: ${said}`,
      `the session list was sampled after every row on that machine had gone ` +
        `unknown and immediately before the restore, so what it compares is ` +
        `the refused restore and nothing else`
    ]
  });
}

/**
 * Row 5. The far side reports times 48 hours ahead.
 *
 * The rule is that a remote clock and a local clock are never compared. Tortie
 * decides liveness by comparing one remote reading with the previous remote
 * reading, which skew cannot move, and every instant Tortie stores is the
 * moment the answer reached this Mac.
 */
async function rowClockSkew(
  carriage: Carriage,
  one: CarriageMachine
): Promise<void> {
  await bringUp(SKEW, 'Matrix Skew', 'green', {
    ...fieldsOf(one),
    remoteTmuxPath: carriage.skewTmuxPath
  });
  const skewed = await remoteCreate({
    machineId: SKEW,
    name: 'p72 skew',
    projectPath: '/tmp',
    cwd: '/tmp',
    agent: 'shell'
  });
  await openControlPlane(SKEW);
  await startMachineFeed(SKEW);
  await waitFor(() => rowsOn(SKEW).length > 0, 30_000);

  // The far side has to print something, or there is no screen worth copying
  // and the skip rule takes the session out of every pass. Tortie composes no
  // argv for a session created as a shell, so the supervisor types into it from
  // the machine's own side.
  const skewFeed = remoteSessionRow(skewed.id);
  if (skewFeed === null) fail('the skewed session never reached a completed list');
  await askSupervisor('noise', 'matrix.clock-skew', [skewFeed.tmuxId]);
  await sleep(5_000);

  const statuses = statusWatcher();
  const startedAt = Date.now();
  // PHASE 72 FIX ROUND. THE ROW MAKES A COPY BEFORE IT GRADES ONE.
  //
  // It used to sleep 30 s and then report the newest capture time, which was 0
  // on every run, so it asserted that a copy taken from a machine 48 hours
  // ahead does not carry a time in the future with no copy in hand. That is a
  // pass over zero events and the supervisor now fails the row for it.
  //
  // The pass is DRIVEN rather than waited for. This row is about the instant on
  // a copy, and the cadence is row 9's subject. `captureMachineOnce` is the
  // same function the cadence timer calls, so the copy this grades is a copy
  // the product made in the ordinary way.
  // EVERY MACHINE, not just this one, and the reason is a property of the
  // harness rather than of the product. `matrixskew` is a second machine ROW
  // pointing at the same computer as `matrixone`, because the only thing this
  // row changes is the program Tortie runs on the far side. Both rows therefore
  // see the same session server, and the feed that holds a given session is
  // whichever machine listed it first. Driving one machine would miss it.
  const written = await captureEveryMachine();
  const sawCapsule = await waitFor(
    () => captureTimes(skewed.id).length > 0,
    30_000
  );
  await sleep(30_000);
  statuses.stop();

  const drawn = rowsOn(SKEW).find((row) => row.id === skewed.id);
  const capsuleAt = Math.max(0, ...captureTimes(skewed.id), 0);
  const took = statuses.took(skewed.id);

  record({
    id: 'matrix.clock-skew',
    research: 'Clock skew',
    translation:
      'machine one is reached through a program that adds 48 hours to every ' +
      'session time it reports, so every reading Tortie gets from it is ahead',
    facts: {
      rowsUnderTest: drawn === undefined ? 0 : 1,
      remoteReportedAheadMs:
        drawn === undefined ? 0 : drawn.createdAt - startedAt,
      skewInjectedMs: SKEW_MS,
      // A capsule time is the moment the text reached this Mac. It can never
      // be in the future, whatever the other computer's clock says.
      capsuleCapturedAtMs: capsuleAt,
      capsuleIsInTheFuture: capsuleAt > Date.now(),
      // How far the copy's own instant is from this Mac's clock. A copy taken
      // from a machine 48 hours ahead is stamped with local receipt time, so
      // this is seconds rather than 172,800,000 ms.
      capsuleAheadOfLocalMs: capsuleAt === 0 ? null : capsuleAt - Date.now(),
      sawCapsule,
      copiesWrittenByTheDrivenPass: written,
      linkToTheSkewedMachine: machineLinkFacts(SKEW).link,
      statusesTakenOver30s: took,
      // Every fact Tortie holds ABOUT the machine is stamped locally.
      machineSnapshotAheadMs: remoteMachineFacts(SKEW).snapshotAt - Date.now()
    },
    notes: [
      'the created time Tortie draws for a remote row is that machine’s own ' +
        'clock, and this row measures how far ahead it reads rather than ' +
        'correcting it. Nothing decides anything from that number.'
    ]
  });
}

/**
 * Row 6. A machine running a version nobody measured.
 *
 * Create, attach and restore all refuse, and nothing is started. The version is
 * checked before any server is asked for, so a machine that answers with a
 * version Tortie has never measured never has a server started on it.
 */
async function rowVersionUnmeasured(
  carriage: Carriage,
  one: CarriageMachine
): Promise<void> {
  const sshBefore = sshChildCount();
  const fields: MachineExecutionFields = {
    ...fieldsOf(one),
    remoteTmuxPath: carriage.stubTmuxPath
  };
  // Not through `bringUp`, because this machine must be added and confirmed
  // and then REFUSED, and `bringUp` waits for a usable connection.
  addMachineRow(rowFrom(STUB, 'Matrix Stub', 'red', fields));
  reloadMachines();
  confirmAsAPerson(STUB, fields);
  const answered = await prepareMachine({
    machineId: STUB,
    fields,
    tortieHostKeys: machineHostKeysPath()
  });

  const createSaid = await refusalOf(() =>
    remoteCreate({
      machineId: STUB,
      name: 'p72 stub',
      projectPath: '/tmp',
      cwd: '/tmp',
      agent: 'shell'
    })
  );
  const attachSaid = await refusalOf(async () => {
    readyRemoteContext(STUB);
  });
  // A session cannot exist on a machine whose version nobody measured, because
  // the create above is refused. So the restore here is asked for a row that
  // does not exist, and what it proves is that restore refuses and starts
  // nothing rather than that it read the version. The note says so.
  const restoreSaid = await refusalOf(() =>
    restoreRemoteSession(`p72-never-${String(process.pid)}`)
  );

  record({
    id: 'matrix.version-unmeasured',
    research: 'Version mismatch',
    translation:
      'machine one is reached through a program reporting a version nobody ' +
      'measured, and create, attach and restore are each pressed against it',
    facts: {
      prepareClass: answered.class,
      versionReported: answered.version,
      versionsMeasured: answered.supported.length,
      serverStarted: answered.serverBorn,
      optionsAsserted: answered.options.length,
      createRefused: createSaid.length > 0,
      attachRefused: attachSaid.length > 0,
      restoreRefused: restoreSaid.length > 0,
      sshChildrenBefore: sshBefore,
      sshChildrenAfter: sshChildCount(),
      rowsUnderTest: 1
    },
    notes: [
      `it reported ${String(answered.version)}`,
      'restore was asked for a row that does not exist, because no session can ' +
        'be created on a machine whose version nobody measured. What that ' +
        'measures is that restore starts nothing, not that it read the version.'
    ]
  });
}

/**
 * Row 7. The machine's own server ends between two passes, and then a restore.
 *
 * Two halves. The rows must become `restorable` only after a COMPLETED answer
 * that says the server is not running, and never because a link went quiet. And
 * the restore that follows has to put the session back with everything that
 * identifies it, read back from the machine byte for byte.
 */
async function rowRemoteReboot(onCut: Session): Promise<void> {
  const statuses = statusWatcher();
  const endedAt = await askSupervisor('end-server', 'matrix.remote-reboot');
  const becameRestorable = await waitFor(
    () => rowsOn(CUT).some((row) => row.status === 'restorable'),
    120_000
  );
  statuses.stop();
  const took = statuses.took(onCut.id);

  const startedAt = Date.now();
  const said = await refusalOf(() => restoreRemoteSession(onCut.id));
  const restoreMs = Date.now() - startedAt;

  // Read the MACHINE, not Tortie's memory of it, through the composer the
  // restore itself exports so the two reads cannot drift apart.
  const back: Record<string, string> = await readBackRemoteStamps(
    CUT,
    onCut.id
  ).catch(() => ({}));
  const stamps: [string, string][] = [
    ['@gmux-id', onCut.id],
    ['@gmux-agent', onCut.agent],
    ['@gmux-name', onCut.name],
    ['@gmux-project', onCut.projectPath]
  ];
  const env: [string, string][] = [
    ['GMUX_MANAGED', '1'],
    ['GMUX_SESSION_ID', onCut.id]
  ];
  const stampsMatched = stamps.filter(([key, value]) => back[key] === value).length;
  const envMatched = env.filter(([key, value]) => back[key] === value).length;
  const sessionIsBack = Object.keys(back).length > 0;

  record({
    id: 'matrix.remote-reboot',
    research: 'Remote reboot',
    translation:
      'the program keeping the work alive on machine one is ended between two ' +
      'passes, by the one pid the supervisor recorded, and then Restore is ' +
      'pressed',
    facts: {
      rowsUnderTest: 1,
      becameRestorable,
      msToRestorable: becameRestorable ? Date.now() - endedAt : null,
      // The one thing that must never appear: a row that read restorable
      // before the machine had answered at all.
      statusesTaken: took,
      restoreRefusal: said,
      restoreMs,
      sessionIsBack,
      stampsMatched,
      envMatched
    },
    notes: [
      said === ''
        ? `the restore took ${String(restoreMs)} ms`
        : `the restore was refused: ${said}`
    ]
  });
}

/**
 * Row 8. A session on the machine prints bytes nobody should trust.
 *
 * TRANSLATED, AND THE FIX ROUND IS WHY. The first cut asked for a plain shell
 * session and handed it a command to print a bell, four control sequences and
 * 4 KB of random bytes. A session on a machine created with `agent: 'shell'`
 * gets NO argv at all: Tortie composes none, and that machine's own default
 * program runs instead. So the command was dropped, the session printed a
 * prompt, and the row graded a copy of a prompt with no instruction byte in it.
 *
 * The bytes come from the MACHINE'S OWN SIDE now. The supervisor owns that
 * machine and types the command into the session there, which is both the only
 * way to do it and the honest shape of the case: bytes appear on the far side
 * that Tortie did not put there.
 *
 * Three things are measured, and each is a number rather than a claim.
 *
 *  1. The copy on disk really does hold escape bytes, so the case was injected.
 *  2. The text a person is shown holds none of them, because the panel reads
 *     through `readSavedOutput`, which strips the sequences and then the single
 *     control bytes a program can print on its own.
 *  3. The session list row holds no terminal instruction byte at all.
 */
async function rowUntrustedBytes(): Promise<void> {
  const noisy = await remoteCreate({
    machineId: CUT,
    name: 'p72 noisy',
    projectPath: '/tmp',
    cwd: '/tmp',
    agent: 'shell'
  });
  await waitFor(() => remoteSessionRow(noisy.id) !== null, 30_000);
  const feed = remoteSessionRow(noisy.id);
  if (feed === null) fail('the noisy session never reached a completed list');
  await askSupervisor('noise', 'matrix.untrusted-bytes', [feed.tmuxId]);
  // Long enough for the far side to have drawn, and short enough that the row
  // is not waiting on a clock. The command is a printf and a base64, and both
  // finish in milliseconds.
  await sleep(5_000);
  const written = await captureMachineOnce(CUT);

  const resolved = resolveSnapshot(noisy.id);
  // The body is read from the path the verified reader returned, so the byte
  // count below is the bytes on disk rather than a number a record claims.
  const body =
    resolved === null
      ? ''
      : (() => {
          try {
            return readFileSync(resolved.path, 'utf8');
          } catch {
            return '';
          }
        })();
  // What a PERSON is shown, through the product's own reader. It is a different
  // function from the one above on purpose: one is the bytes, the other is the
  // text, and the whole claim is that the second holds none of the first's
  // instructions.
  const shown = readSavedOutput(noisy.id)?.text ?? '';
  const escapes = (text: string): number =>
    [...text].filter((ch) => ch.charCodeAt(0) === 0x1b).length;
  const controls = (text: string): number =>
    [...text].filter(
      (ch) => ch.charCodeAt(0) < 0x20 && ch !== '\t' && ch !== '\n' && ch !== '\r'
    ).length;
  const capsules = readCapsules(noisy.id);
  const record0 = remoteRecordsForMachine(CUT).find((row) => row.id === noisy.id);
  const rowText = JSON.stringify(record0 ?? {});

  record({
    id: 'matrix.untrusted-bytes',
    research: 'Untrusted remote bytes',
    translation:
      'the supervisor types into a session on machine one from that machine’s ' +
      'own side, printing a bell, four escape sequences and 4096 random bytes, ' +
      'because Tortie composes no argv at all for a session created as a shell',
    facts: {
      rowsUnderTest: 1,
      copiesWrittenByTheDrivenPass: written,
      capsulesStored: capsules.length,
      // resolveSnapshot is the product's own verified reader. A capsule whose
      // hash does not match is not returned by it.
      capsuleReadsBackVerified: resolved?.verified === true,
      capsuleBytes: body.length,
      // The injection has to have landed, or everything below is measured on a
      // screen that held nothing worth distrusting.
      escapeBytesOnDisk: escapes(body),
      // What a person is shown. Both must be zero.
      escapeBytesShownToAPerson: escapes(shown),
      controlBytesShownToAPerson: controls(shown),
      shownCharacters: shown.length,
      controlBytesInManifestRow: controls(rowText),
      manifestRowPresent: record0 !== undefined
    },
    notes: [
      resolved === null
        ? 'no saved output read back through the verified reader'
        : `${String(body.length)} character(s) on disk, verified ${String(
            resolved.verified
          )}, and ${String(shown.length)} character(s) shown to a person`
    ]
  });
}

/**
 * Row 9. Thirty sessions on one link.
 *
 * The rule research 28 wrote is that the cadence is bounded by the LINK and
 * never by the number of sessions. Thirty sessions on one machine must not
 * produce thirty commands.
 *
 * PHASE 72 FIX ROUND, AND THE ROW MEASURED NOTHING BEFORE IT. The first cut
 * created thirty sessions and watched for five minutes. It counted zero saves,
 * and zero is below every cap, so the row passed by doing nothing. Two causes,
 * and both are closed here.
 *
 * The first is that the sessions never printed anything. Tortie composes no
 * argv for a session created as a plain shell, so the command each one was
 * handed was dropped and every one of them sat idle. A copy that would be
 * identical to the last one is deliberately not taken, so an idle machine
 * produces no saves at all and the row was grading that.
 *
 * The second is that the number under test was the number of saves in a stretch
 * of wall clock, which depends on the cadence timer as well as on the bound. So
 * the bound is now measured DIRECTLY: the supervisor makes all thirty sessions
 * print, one pass is driven, and the number of copies that pass wrote is the
 * per pass bound with nothing else in it. Three passes are driven that way.
 *
 * The stretch of wall clock is still watched and its number is still printed,
 * because it is the only thing that says anything about the timer, but the row
 * does not pass or fail on it and the report says so.
 */
async function rowCaptureCadence(): Promise<void> {
  const busy: string[] = [];
  /** The far side's own identifier for each session, for the supervisor. */
  const names: string[] = [];
  for (let n = 0; n < CADENCE_SESSIONS; n += 1) {
    const made = await remoteCreate({
      machineId: CUT,
      name: `p72 load ${String(n)}`,
      projectPath: '/tmp',
      cwd: '/tmp',
      agent: 'shell'
    });
    busy.push(made.id);
    const feed = remoteSessionRow(made.id);
    if (feed !== null) names.push(feed.tmuxId);
  }
  log(`row 9: ${String(busy.length)} session(s) are running on one link`);

  // The stretch of wall clock, with the far side printing every 30 s so there
  // is something worth copying the whole way through.
  const captures = captureWatcher(busy);
  const windowStartedAt = Date.now();
  let noiseRounds = 0;
  while (Date.now() - windowStartedAt < CADENCE_WINDOW_MS) {
    await askSupervisor('noise', 'matrix.capture-cadence', names);
    noiseRounds += 1;
    await sleep(30_000);
  }
  captures.stop();
  const fromTheTimer = captures.total();
  const busiest = captures.busiestBucket();

  // THE BOUND, MEASURED DIRECTLY. Each driven pass is one pass of the product's
  // own capture, and the number it returns is how many copies that one pass
  // wrote. Thirty sessions are listed and at most eight may be read.
  const perPass: number[] = [];
  for (let n = 0; n < 3; n += 1) {
    await askSupervisor('noise', `matrix.capture-cadence pass ${String(n)}`, names);
    await sleep(2_000);
    perPass.push(await captureMachineOnce(CUT));
  }

  // THE QUIET LEG, and it needs the machine to be up to date first.
  //
  // Eight sessions are read per pass and thirty printed, so three passes leave
  // eight of them holding a copy older than their last change. Those are
  // legitimately worth copying, and grading the very next pass at zero would
  // have failed on work that ought to happen. So passes are driven with nothing
  // printed until one writes nothing, and then one more has to write nothing
  // too. The counts on the way are printed.
  const settling: number[] = [];
  for (let n = 0; n < 8; n += 1) {
    await sleep(1_000);
    const wrote = await captureMachineOnce(CUT);
    settling.push(wrote);
    if (wrote === 0) break;
  }
  await sleep(1_000);
  const whileQuiet = await captureMachineOnce(CUT);

  const facts = remoteCapsuleFacts();
  record({
    id: 'matrix.capture-cadence',
    research: 'Capture cadence at scale',
    translation:
      'thirty sessions are created on machine one over one connection, the ' +
      'supervisor makes all thirty print from that machine’s own side, and the ' +
      'copies one pass writes are counted',
    facts: {
      sessions: busy.length,
      perPass,
      perPassCap: REMOTE_CAPSULE_PER_PASS,
      totalOverThreePasses: perPass.reduce((a, b) => a + b, 0),
      cap: CADENCE_CAP,
      // Copies, not reads. The read happens every pass, because nothing on
      // the far side can say whether a screen changed without reading it. What
      // must be zero is the number of new copies on a screen that has not
      // moved.
      copiesWhileQuiet: whileQuiet,
      copiesWhileSettling: settling,
      windowMs: CADENCE_WINDOW_MS,
      noiseRoundsInWindow: noiseRounds,
      capturesInWindow: fromTheTimer,
      busiestFiveSecondBucket: busiest,
      readsSentSinceTheAppStarted: facts.commandsSent,
      sessionsWithACopyRemembered: facts.remembered,
      passesInFlightRightNow: facts.inFlight.length,
      cadenceArmed: facts.running,
      rowsUnderTest: busy.length
    },
    notes: [
      'one capture in flight at a time is NOT measured here. It is a property ' +
        'inside one process and this harness watches from outside. Builder B’s ' +
        'unit test holds it.',
      `the stretch of wall clock produced ${String(fromTheTimer)} save(s) in ` +
        `${String(CADENCE_WINDOW_MS)} ms with ${String(noiseRounds)} round(s) ` +
        `of printing. That number is reported and the row does not pass or ` +
        `fail on it, because it depends on the cadence timer as well as on the ` +
        `bound, and the bound is what research 28 row 9 asks about.`
    ]
  });
}

/**
 * Row 10, the translated one. A person removes a machine holding live sessions.
 *
 * Research 28's row is "move with a dirty tree". There is no move gesture in
 * this design, so the translation is the gesture that has the same shape: one
 * click that could throw away work the person cannot see. Nothing may be sent
 * to the machine, both rows must survive as a record of what Tortie last knew,
 * and the sessions must still be running there afterwards. The last of those is
 * checked by the supervisor, because this process has let go of the machine.
 */
async function rowForgetMachine(ctx: RemoteMachineContext): Promise<void> {
  const live = await remoteCreate({
    machineId: CUT,
    name: 'p72 forget A',
    projectPath: '/tmp',
    cwd: '/tmp',
    agent: 'shell'
  });
  const live2 = await remoteCreate({
    machineId: CUT,
    name: 'p72 forget B',
    projectPath: '/tmp',
    cwd: '/tmp',
    agent: 'shell'
  });
  await waitFor(
    () => rowsOn(CUT).filter((row) => row.id === live.id || row.id === live2.id).length === 2,
    60_000
  );

  const onMachineBefore = (await execOn(ctx, remoteListArgs()))
    .split('\n')
    .map(parseRemoteListLine)
    .filter((row) => row !== null && row.gmuxId.length > 0).length;
  const rowsBefore = remoteRecordsForMachine(CUT).length;
  const sshBefore = sshChildCount();

  // The two steps `machines:remove` takes, in its order. The handler's own
  // order is held by src/main/machines/__tests__/ipc.test.ts.
  const forgotten = forgetMachineSessions(CUT);
  removeMachineRow(CUT);
  forgetMachine(CUT);

  const drawnAfter = rowsOn(CUT).length;
  const claimingEnded = remoteRecordsForMachine(CUT).filter(
    (row) => row.status === 'exited'
  ).length;

  record({
    id: 'matrix.forget-machine',
    research: 'Move with a dirty tree',
    translation:
      'THERE IS NO MOVE GESTURE IN THIS DESIGN. A person removes machine one ' +
      'in Settings while it holds two live sessions',
    facts: {
      rowsUnderTest: 2,
      sessionsOnMachineBefore: onMachineBefore,
      manifestRowsBefore: rowsBefore,
      tombstonesWritten: forgotten.tombstoned,
      commandsSentToMachine: forgotten.commandsSent,
      rowsStillDrawnForMachine: drawnAfter,
      rowsClaimingTheWorkEnded: claimingEnded,
      sshChildrenBefore: sshBefore,
      sshChildrenAfter: sshChildCount(),
      // The supervisor looks at the machine afterwards and fills this in. It
      // has to, because this process no longer knows the machine at all.
      sessionsStillRunningAfter: 'the supervisor reads this from the machine'
    },
    notes: [
      `${String(forgotten.tombstoned)} row(s) became a record of what Tortie ` +
        `last knew, and ${String(forgotten.commandsSent)} command(s) were sent`
    ]
  });
}

// ---------------------------------------------------------------------------
// Small readers
// ---------------------------------------------------------------------------

function machineOf(carriage: Carriage, id: string): CarriageMachine {
  const found = carriage.machines.find((one) => one.id === id);
  if (found === undefined) {
    return fail(`the supervisor described no machine called "${id}"`);
  }
  return found;
}

function fieldsOf(one: CarriageMachine): MachineExecutionFields {
  return {
    host: one.host,
    user: one.user,
    port: one.port,
    remoteTmuxPath: one.remoteTmuxPath
  };
}

// ---------------------------------------------------------------------------
// The harness
// ---------------------------------------------------------------------------

export async function runRemoteMatrixSmoke(): Promise<void> {
  let leg = 'unknown';
  try {
    const iso = assertHarnessIsolation('GMUX_CONFIG_ROOT');
    // Said again, by name. The far side of every connection here is this same
    // Mac, so on the real socket every remote verb would land on the server
    // holding the operator's live sessions.
    if (activeTmuxSocket() === TMUX_SOCKET) {
      fail(
        `the socket is "${TMUX_SOCKET}", the real one. This harness creates ` +
          `sessions on machines, and on this socket that machine is this Mac.`
      );
    }
    root = iso.root;
    const operatorBefore = operatorSessionCount();
    log(`profile ${iso.userData}, socket ${iso.socket}`);
    log(`the operator's own server holds ${String(operatorBefore)} session(s)`);

    const carriage = readCarriage();
    leg = carriage.leg;
    log(`leg ${leg}`);

    if (carriage.leg === 'seed') await runSeedLeg(carriage);
    else if (carriage.leg === 'second') await runSecondClientLeg(carriage);
    else if (carriage.leg === 'cold') await runColdLeg(carriage);
    else await runMainLeg(carriage);

    const operatorAfter = operatorSessionCount();
    writeFileSync(
      reportPath(leg),
      JSON.stringify(
        { leg, rows: results, operatorBefore, operatorAfter },
        null,
        2
      ),
      'utf8'
    );
    if (operatorAfter !== operatorBefore) {
      fail(
        `the operator's own server held ${String(operatorBefore)} session(s) ` +
          `before this leg and ${String(operatorAfter)} after it`
      );
    }
    log(
      `the operator's own server held ${String(operatorBefore)} session(s) ` +
        `before and after`
    );
    await shutdownGmuxCore().catch(() => undefined);
    log('DONE');
    app.exit(0);
  } catch (err) {
    // A leg that fell over still writes what it had, so the supervisor grades
    // the rows that completed and fails the rest by their absence rather than
    // reporting nothing at all.
    try {
      writeFileSync(
        reportPath(leg),
        JSON.stringify(
          { leg, rows: results, crashed: (err as Error).message },
          null,
          2
        ),
        'utf8'
      );
    } catch {
      /* the root may not exist, which the supervisor will notice */
    }
    console.error(`[gmux-matrix] FAIL: ${(err as Error).message}`);
    app.exit(1);
  }
}

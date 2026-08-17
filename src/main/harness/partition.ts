/**
 * GMUX_SMOKE=partition. What Tortie says while the link to a machine is cut
 * (Phase 71, M4).
 *
 * ## What only this can prove
 *
 * Research 51 section 4.4's rule is that a machine Tortie cannot see is a
 * machine whose sessions are UNKNOWN, never a machine whose sessions ended. A
 * unit test can prove the pure function that decides it. It cannot prove that a
 * real app, holding a real connection to a real machine, with a real terminal
 * attached, says the same thing when that link is cut mid sentence. The
 * difference between those two is the whole of this harness.
 *
 * The five moments are chosen rather than lucky, so a failure is reproducible
 * by name: while a list is in the air, between a create and its identity stamp,
 * while a terminal is attached and receiving bytes, while the connection is
 * connected and idle, and on the way back.
 *
 * ## The division of work with the supervisor
 *
 * `build/partition-harness.mjs` owns the scratch machine. It starts the sshd,
 * it records the pid, and it is the only thing that kills it. This process
 * never kills anything it did not start.
 *
 * This process owns the moments, because only it knows when a list is in the
 * air or when a create has been sent and not yet stamped. So it ASKS for the
 * partition through a request file and waits for the supervisor's answer, which
 * carries the epoch millisecond the kill actually happened. Every duration in
 * the report is measured from that number.
 *
 * This process also owns the sampling, at 250 ms, because the statuses live in
 * this process and there is no channel from a supervisor into a running main
 * process that does not exist only for this harness. The samples are written as
 * one JSON object per line and the supervisor reads them and decides the
 * verdict, so the thing being measured never grades itself.
 *
 * ## Safety
 *
 * It refuses to run unless the profile is inside `GMUX_CONFIG_ROOT` and the
 * tmux socket is not the real one, through the same guard the fault harness
 * uses. On this rung the socket matters most of all: the far side of the
 * connection is this same Mac, so a remote `new-session` on socket `gmux` would
 * create a session on the server holding the operator's live work.
 */

import { app, BrowserWindow } from 'electron';
import { execFileSync } from 'node:child_process';
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Session, SessionStatus } from '@shared/types';
import { getGmuxCore, shutdownGmuxCore } from '../sessions';
import type { GmuxCore } from '../sessions';
import { activeTmuxSocket, TMUX_SOCKET } from '../tmux/resolve';
import {
  MACHINE_CONFIRM_ACKNOWLEDGEMENT,
  confirmMachine,
  describeMachine,
  type MachineExecutionFields
} from '../machines/confirm';
// Phase 71: one connection per machine, opened here so the idle case measures a
// live connection dying rather than a timer missing an answer.
import { openControlPlane, machineLinkFacts } from '../machines/control-plane';
import { machineContext } from '../machines/context';
import { execOn } from '../machines/exec-plane';
// Phase 71, Builder B: the issued id set the pane environment rescue judges a
// re-found session against. The interrupted create below records its id here
// exactly as the real create path does.
import { noteIssuedRemoteId } from '../machines/pane-env-rescue';
import { prepareMachine } from '../machines/prepare';
import {
  parseRemoteListLine,
  readyRemoteContext,
  refuseRemoteRestore,
  remoteCreate,
  remoteCreateArgs,
  remoteListArgs,
  remoteMachineFacts,
  remoteSessions,
  startMachineFeed
} from '../machines/remote-sessions';
import {
  machineHostKeysPath,
  reloadMachines,
  addMachineRow
} from '../machines/store';
import { assertHarnessIsolation } from './isolation';

function log(line: string): void {
  console.log(`[gmux-partition] ${line}`);
}

function fail(message: string): never {
  throw new Error(message);
}

/** The machine this harness confirms, prepares and then cuts off. */
const MACHINE_ID = 'partitionmachine';

/**
 * The second machine, and it is never cut.
 *
 * It exists so that "one machine going quiet moves nothing on another machine"
 * is measured rather than asserted. With one machine that claim was checked over
 * zero rows and reported a pass. This one is confirmed, prepared and given one
 * session, and every case reads its rows.
 */
const OTHER_MACHINE_ID = 'steadymachine';

/** One machine the supervisor started, as it described it. */
interface CarriageMachine {
  id: string;
  host: string;
  port: number;
  user: string;
  remoteTmuxPath: string;
  /** True for the one machine this run cuts the link to. */
  cut: boolean;
}

/** What the supervisor wrote before it launched this process. */
interface Carriage {
  host: string;
  port: number;
  user: string;
  remoteTmuxPath: string;
  machines?: CarriageMachine[];
}

/** One request from this process to the supervisor. */
interface PartitionRequest {
  seq: number;
  /** `down` kills the scratch sshd. `up` starts it again. */
  want: 'down' | 'up';
  /** The case this is part of, for the supervisor's log. */
  point: string;
  /** The machine to act on. Only the one this run cuts is ever named. */
  machine: string;
}

/** The supervisor's answer, carrying the moment it acted. */
interface PartitionAck {
  seq: number;
  /** Local epoch ms of the kill or the restart. */
  at: number;
}

/** One 250 ms sample of what every session's status reads. */
interface Sample {
  kind: 'sample';
  at: number;
  point: string;
  phase: 'before' | 'partitioned' | 'after';
  /** Session id to status, for every row the app would draw. */
  rows: Record<string, SessionStatus>;
  /** Which rows are on the machine this run cuts. */
  remoteIds: string[];
  /** Which rows are on the machine that is never cut. */
  otherIds: string[];
  link: string;
  /** The second machine's link, so a reader can see it never moved. */
  otherLink: string;
}

const SAMPLE_EVERY_MS = 250;

// ---------------------------------------------------------------------------
// The files this process and the supervisor talk through
// ---------------------------------------------------------------------------

let root = '';
let requestSeq = 0;
let currentPoint = 'setup';
let currentPhase: Sample['phase'] = 'before';

const carriagePath = (): string => join(root, 'p71-carriage.json');
const requestPath = (): string => join(root, 'p71-request.json');
const ackPath = (): string => join(root, 'p71-ack.json');
const samplesPath = (): string => join(root, 'p71-samples.jsonl');
const reportPath = (): string => join(root, 'p71-report.json');

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

/** Wait for a condition, sampling it every 100 ms. Returns true when it held. */
async function waitFor(
  what: () => boolean,
  timeoutMs: number
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (what()) return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  return what();
}

/**
 * Ask the supervisor to cut the link, or to put it back, and wait.
 *
 * Returns the epoch millisecond the supervisor acted, which is what every
 * duration in the report is measured from. This process never kills the sshd
 * itself, because it did not start it.
 */
async function askSupervisor(
  want: 'down' | 'up',
  point: string
): Promise<number> {
  requestSeq += 1;
  const request: PartitionRequest = {
    seq: requestSeq,
    want,
    point,
    // Only ever the machine this run cuts. The supervisor refuses any other
    // name, so the machine that exists to stay up cannot be reached from here.
    machine: 'one'
  };
  writeFileSync(requestPath(), JSON.stringify(request), 'utf8');
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const ack = JSON.parse(readFileSync(ackPath(), 'utf8')) as PartitionAck;
      if (ack.seq === request.seq) return ack.at;
    } catch {
      /* the supervisor has not answered this one yet */
    }
    await new Promise((r) => setTimeout(r, 50));
  }
  return fail(`the supervisor did not answer the "${want}" request for ${point}`);
}

// ---------------------------------------------------------------------------
// Sampling
// ---------------------------------------------------------------------------

let sampler: NodeJS.Timeout | null = null;
const takenSamples: Sample[] = [];

function takeSample(core: GmuxCore): Sample {
  const rows: Record<string, SessionStatus> = {};
  const remoteIds: string[] = [];
  const otherIds: string[] = [];
  for (const session of core.listSessions()) {
    rows[session.id] = session.status;
    if (session.machine?.id === MACHINE_ID) remoteIds.push(session.id);
    if (session.machine?.id === OTHER_MACHINE_ID) otherIds.push(session.id);
  }
  const linkOf = (machineId: string): string => {
    try {
      return machineLinkFacts(machineId).link;
    } catch {
      // A machine with no facts yet reports nothing, which is itself a reading.
      return 'unknown';
    }
  };
  return {
    kind: 'sample',
    at: Date.now(),
    point: currentPoint,
    phase: currentPhase,
    rows,
    remoteIds,
    otherIds,
    link: linkOf(MACHINE_ID),
    otherLink: linkOf(OTHER_MACHINE_ID)
  };
}

function startSampling(core: GmuxCore): void {
  if (sampler !== null) return;
  sampler = setInterval(() => {
    const sample = takeSample(core);
    takenSamples.push(sample);
    appendFileSync(samplesPath(), `${JSON.stringify(sample)}\n`, 'utf8');
  }, SAMPLE_EVERY_MS);
  sampler.unref?.();
}

function stopSampling(): void {
  if (sampler !== null) clearInterval(sampler);
  sampler = null;
}

/** Every distinct status one session took while a phase was on. */
function statusesTaken(sessionId: string, point: string, phase: string): string[] {
  const seen = new Set<string>();
  for (const sample of takenSamples) {
    if (sample.point !== point || sample.phase !== phase) continue;
    const status = sample.rows[sessionId];
    if (status !== undefined) seen.add(status);
  }
  return [...seen];
}

// ---------------------------------------------------------------------------
// Setup
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

/** Every row this run put on the machine, by Tortie's own id. */
function remoteRowsOf(): Session[] {
  return remoteSessions().filter((one) => one.machine?.id === MACHINE_ID);
}

/**
 * The first SAMPLE in one case that read every row on the cut machine as
 * unknown, or undefined.
 *
 * THE WAIT AND THE MEASUREMENT ARE THE SAME QUESTION, and that is the fix for a
 * measured hole. The first build waited on the live rows, which move the instant
 * the feed writes them, and then read the sample list, which is written every
 * 250 ms. The wait therefore returned up to 250 ms before the sample it was
 * about existed, `toUnknownMs` came back null, and the gate failed on a number
 * the raw samples from that same run plainly contained. Asking the sample list
 * both times cannot disagree with itself.
 */
function firstUnknownSample(point: string): Sample | undefined {
  return takenSamples.find(
    (one) =>
      one.point === point &&
      one.phase === 'partitioned' &&
      one.remoteIds.length > 0 &&
      one.remoteIds.every((id) => one.rows[id] === 'unknown')
  );
}

// ---------------------------------------------------------------------------
// The report
// ---------------------------------------------------------------------------

interface CaseReport {
  point: string;
  /** Milliseconds from the kill to the first sample where every row is unknown. */
  toUnknownMs: number | null;
  /** Every distinct status each remote row took while the link was cut. */
  remoteStatuses: Record<string, string[]>;
  /** Every distinct status each local row took over the whole case. */
  localStatuses: Record<string, string[]>;
  /** True when `refuseRemoteRestore` refused every remote row during the cut. */
  restoreRefused: boolean;
  /** Anything the case measured that has no other column. */
  notes: string[];
}

const cases: CaseReport[] = [];

/**
 * Run one case: cut the link, sample for `holdMs`, then put it back.
 *
 * `during` runs immediately BEFORE the request is sent, which is how a moment
 * like "while a list is in the air" is reached: the work is started and the
 * kill lands inside it.
 */
async function runCase(
  core: GmuxCore,
  point: string,
  holdMs: number,
  during?: () => Promise<void>
): Promise<CaseReport> {
  currentPoint = point;
  currentPhase = 'before';
  const localIds = core
    .listSessions()
    .filter((one) => one.machine === undefined)
    .map((one) => one.id);
  await new Promise((r) => setTimeout(r, SAMPLE_EVERY_MS * 2));

  const inFlight = during === undefined ? null : during();
  currentPhase = 'partitioned';
  const killedAt = await askSupervisor('down', point);
  // The work that was in the air when the link went is BOUNDED here rather
  // than awaited outright. That work is a command on a machine that has just
  // stopped answering, so the honest expectation is that it never returns, and
  // a harness that waited for it would hang instead of reporting.
  if (inFlight !== null) {
    await Promise.race([
      inFlight.catch(() => undefined),
      new Promise((r) => setTimeout(r, 30_000))
    ]);
  }

  // How long a cut link may take to become visible before the case gives up.
  //
  // 90 s, and it is a bound rather than an expectation. Phase 69 measured the
  // ssh keepalive pair at 19.8 s to error on a frozen far side, and the two
  // runs recorded on 2026-08-17 saw no row read `unknown` inside 33 s, so this
  // bound is wide enough that a red result means the app did not notice rather
  // than that the harness did not wait. The supervisor fails the case when no
  // sample ever read every row as unknown, so a wide bound costs wall clock and
  // never a false pass.
  const sawUnknown = await waitFor(
    () => firstUnknownSample(point) !== undefined,
    holdMs + 90_000
  );
  const firstUnknown = firstUnknownSample(point);
  await new Promise((r) => setTimeout(r, holdMs));

  // Restore is never offered for a row on another machine, and least of all
  // while Tortie cannot see it. This is the measurement rather than a reading.
  let restoreRefused = true;
  for (const row of remoteRowsOf()) {
    try {
      refuseRemoteRestore(row.id);
      restoreRefused = false;
    } catch {
      /* refused, which is the answer this asserts */
    }
  }

  const remoteStatuses: Record<string, string[]> = {};
  for (const row of remoteRowsOf()) {
    remoteStatuses[row.id] = statusesTaken(row.id, point, 'partitioned');
  }
  const localStatuses: Record<string, string[]> = {};
  for (const id of localIds) {
    localStatuses[id] = [
      ...new Set([
        ...statusesTaken(id, point, 'before'),
        ...statusesTaken(id, point, 'partitioned')
      ])
    ];
  }

  currentPhase = 'after';
  await askSupervisor('up', point);

  const report: CaseReport = {
    point,
    toUnknownMs:
      sawUnknown && firstUnknown !== undefined
        ? firstUnknown.at - killedAt
        : null,
    remoteStatuses,
    localStatuses,
    restoreRefused,
    notes: []
  };
  cases.push(report);
  log(
    `${point}: first unknown after ${
      report.toUnknownMs === null ? 'NEVER' : `${String(report.toUnknownMs)} ms`
    }, restore refused ${String(restoreRefused)}`
  );
  return report;
}

/** Wait for the machine to answer again after the link is back. */
async function waitForRecovery(): Promise<boolean> {
  return waitFor(() => {
    const facts = remoteMachineFacts(MACHINE_ID);
    return facts.answering && facts.rows > 0;
  }, 60_000);
}

// ---------------------------------------------------------------------------
// The harness
// ---------------------------------------------------------------------------

export async function runPartitionSmoke(): Promise<void> {
  try {
    const iso = assertHarnessIsolation('GMUX_CONFIG_ROOT');
    // Said again, by name. The far side of this connection is this same Mac, so
    // on the real socket every remote verb would land on the server holding the
    // operator's live sessions.
    if (activeTmuxSocket() === TMUX_SOCKET) {
      fail(
        `the socket is "${TMUX_SOCKET}", the real one. This harness creates a ` +
          `session on a machine, and on this socket that machine is this Mac.`
      );
    }
    root = iso.root;
    const operatorBefore = operatorSessionCount();
    log(`profile ${iso.userData}, socket ${iso.socket}`);
    log(`the operator's own server holds ${String(operatorBefore)} session(s)`);
    writeFileSync(samplesPath(), '', 'utf8');

    const carriage = readCarriage();
    // The supervisor names its machines. The one it cuts becomes MACHINE_ID and
    // the one it leaves up becomes OTHER_MACHINE_ID, so which machine is the
    // subject of a case is decided in one place rather than by an order.
    const described = carriage.machines ?? [
      {
        id: 'one',
        host: carriage.host,
        user: carriage.user,
        port: carriage.port,
        remoteTmuxPath: carriage.remoteTmuxPath,
        cut: true
      }
    ];
    const cutBy = described.find((one) => one.cut);
    const steadyBy = described.find((one) => !one.cut);
    if (cutBy === undefined || steadyBy === undefined) {
      fail(
        `the supervisor described ${String(described.length)} machine(s) and ` +
          `this harness needs one it cuts and one it never cuts`
      );
    }
    const fieldsOf = (one: CarriageMachine): MachineExecutionFields => ({
      host: one.host,
      user: one.user,
      port: one.port,
      remoteTmuxPath: one.remoteTmuxPath
    });

    // The one first contact per machine, by hand, because the plane carries
    // StrictHostKeyChecking=yes and can never add a line itself. In the product
    // this answer comes from the visible connection test, where a person is
    // watching.
    const record = machineHostKeysPath();
    mkdirSync(dirname(record), { recursive: true });
    writeFileSync(
      record,
      described
        .map((one) =>
          execFileSync('/usr/bin/ssh-keyscan', ['-p', String(one.port), one.host], {
            encoding: 'utf8',
            timeout: 30_000
          })
        )
        .join(''),
      'utf8'
    );

    // The core is booted BEFORE the machine row exists, and the order is
    // deliberate. Booting it afterwards makes its own sign in of every
    // confirmed machine race the one below, and a second sign in takes the
    // program search list out from under the first one, which is exactly the
    // state `readyRemoteContext` refuses.
    const core = await getGmuxCore();

    /** Add, confirm and prepare one machine, and wait until a verb may be sent. */
    const bringUp = async (
      machineId: string,
      label: string,
      color: 'orange' | 'blue',
      row: CarriageMachine
    ): Promise<void> => {
      addMachineRow({
        id: machineId,
        label,
        color,
        host: row.host,
        user: row.user,
        port: row.port,
        remoteTmuxPath: row.remoteTmuxPath
      });
      reloadMachines();
      confirmAsAPerson(machineId, fieldsOf(row));
      const answered = await prepareMachine({
        machineId,
        fields: fieldsOf(row),
        tortieHostKeys: machineHostKeysPath()
      });
      if (answered.class !== 'prepared') {
        fail(`${machineId} answered ${answered.class}: ${answered.detail}`);
      }
      // A prepare that answered `prepared` has recorded the machine's own
      // program search list for this connection, and every remote verb refuses
      // without it. It is waited for rather than assumed, so a slow machine
      // produces a slow run rather than a failure that reads like a defect in
      // the verbs.
      const usable = await waitFor(() => {
        try {
          readyRemoteContext(machineId);
          return true;
        } catch {
          return false;
        }
      }, 30_000);
      if (!usable) fail(`${machineId} prepared and then had no usable connection`);
    };

    await bringUp(MACHINE_ID, 'Partition', 'orange', cutBy);
    await bringUp(OTHER_MACHINE_ID, 'Steady', 'blue', steadyBy);
    log(
      `1. ${MACHINE_ID} and ${OTHER_MACHINE_ID} are confirmed, prepared and ready`
    );

    const local = await core.createSession({
      name: 'p71-local',
      projectPath: iso.root,
      cwd: iso.root,
      agent: 'shell',
      extraArgs: ['-c', 'while true; do date; sleep 1; done']
    });
    const remote = await remoteCreate({
      machineId: MACHINE_ID,
      name: 'p71 remote',
      projectPath: '/tmp',
      cwd: '/tmp',
      agent: 'shell'
    });
    // The row every case watches for a status it must never take. Nothing in
    // this run ever touches this machine's link.
    const steady = await remoteCreate({
      machineId: OTHER_MACHINE_ID,
      name: 'p71 steady',
      projectPath: '/tmp',
      cwd: '/tmp',
      agent: 'shell'
    });
    log(
      `2. one session on this Mac ${local.id}, one on ${MACHINE_ID} ${remote.id}, ` +
        `one on ${OTHER_MACHINE_ID} ${steady.id}`
    );

    const ctx = machineContext(MACHINE_ID);
    if (ctx.kind !== 'remote') fail('the machine context is not a remote one');
    await openControlPlane(MACHINE_ID);
    await startMachineFeed(MACHINE_ID);
    await openControlPlane(OTHER_MACHINE_ID);
    await startMachineFeed(OTHER_MACHINE_ID);
    const linkAtStart = machineLinkFacts(MACHINE_ID).link;
    log(
      `3. both feeds are running. ${MACHINE_ID} reads ${linkAtStart} and ` +
        `${OTHER_MACHINE_ID} reads ${machineLinkFacts(OTHER_MACHINE_ID).link}`
    );

    startSampling(core);

    // --- the poll is GONE while a connection is up --------------------------
    //
    // Phase 71's claim is that a live connection replaces the timer, and until
    // this window it rested on an armed-timer unit test and on reading the code.
    // This measures it on a running machine instead.
    //
    // The instrument is `snapshotAt`, which is stamped before every list this
    // machine's feed issues. Nothing happens on this machine during the window,
    // so a connection that has replaced the timer issues NO list and that number
    // never moves. The Phase 70 timer ran at 5,000 ms in front, so it would have
    // issued four lists in the same twenty seconds.
    const quietFor = 20_000;
    const snapshotBefore = remoteMachineFacts(MACHINE_ID).snapshotAt;
    const lists = new Set<number>();
    let timerSeen = false;
    for (let taken = 0; taken * SAMPLE_EVERY_MS < quietFor; taken += 1) {
      const facts = remoteMachineFacts(MACHINE_ID);
      if (facts.timerArmed) timerSeen = true;
      if (facts.snapshotAt !== snapshotBefore) lists.add(facts.snapshotAt);
      await new Promise((r) => setTimeout(r, SAMPLE_EVERY_MS));
    }
    const onControl = remoteMachineFacts(MACHINE_ID).onControl;
    if (!onControl) {
      fail(`${MACHINE_ID} is not on a live connection, so the poll cannot be gone`);
    }
    if (timerSeen) {
      fail(
        `${MACHINE_ID} had a timer armed while its connection was up. One ` +
          `machine never carries both feeds.`
      );
    }
    // Four is what the Phase 70 cadence would have produced in this window. A
    // machine that issued that many lists is still being polled.
    if (lists.size >= 4) {
      fail(
        `${MACHINE_ID} issued ${String(lists.size)} list(s) in ` +
          `${String(quietFor)} ms with nothing happening on it, which is the ` +
          `timer cadence rather than a connection`
      );
    }
    log(
      `4. the poll is gone: over ${String(quietFor)} ms with nothing happening ` +
        `on ${MACHINE_ID}, its feed issued ${String(lists.size)} list(s) and ` +
        `no timer was armed at any of the ` +
        `${String(Math.floor(quietFor / SAMPLE_EVERY_MS))} readings. The timer ` +
        `cadence would have issued 4.`
    );

    // The supervisor waits for this line before it answers any request.
    log('ready');

    // --- partition.control-idle ---------------------------------------------
    // The connection is up and nothing is being asked of it. This is the case
    // that measures how long a cut link takes to be noticed at all.
    const idle = await runCase(core, 'partition.control-idle', 3_000);
    idle.notes.push(`the link read ${linkAtStart} before the cut`);
    if (!(await waitForRecovery())) fail('the machine never answered again');

    // --- partition.during-list ----------------------------------------------
    // A list is started and the cut lands inside it.
    await runCase(core, 'partition.during-list', 3_000, async () => {
      await startMachineFeed(MACHINE_ID).catch(() => undefined);
    });
    if (!(await waitForRecovery())) fail('the machine never answered again');

    // --- partition.during-create --------------------------------------------
    //
    // The moment is between the `new-session` and the identity stamp, and it is
    // reached by DOING exactly that rather than by hoping the timing lands
    // there: the session is created with its pane environment on the create
    // line, the link is cut, and the stamp is attempted and fails. That is
    // byte for byte the state a real interrupted create leaves on the machine,
    // and it is the state the pane environment rescue exists for.
    const orphanId = `p71-orphan-${String(process.pid)}`;
    noteIssuedRemoteId({
      id: orphanId,
      machineId: MACHINE_ID,
      name: 'p71 orphan',
      agent: 'shell',
      projectPath: '/tmp',
      cwd: '/tmp',
      issuedAt: Date.now()
    });
    const orphanTmuxId = (
      await execOn(
        ctx,
        remoteCreateArgs({
          tmuxName: 'p71-orphan',
          cwd: '/tmp',
          sessionId: orphanId,
          argv: []
        })
      )
    ).trim();
    const createCase = await runCase(
      core,
      'partition.during-create',
      3_000,
      async () => {
        // The stamp that the link is about to eat. It must fail, and the
        // session must still be there on the far side afterwards.
        await execOn(ctx, [
          'set-option',
          '-t',
          orphanTmuxId,
          '@gmux-id',
          orphanId
        ]).catch(() => undefined);
      }
    );
    if (!(await waitForRecovery())) fail('the machine never answered again');
    const orphansOnMachine = (await execOn(ctx, remoteListArgs()))
      .split('\n')
      .map(parseRemoteListLine)
      .filter((one) => one !== null && one.tmuxName.startsWith('p71-orphan'))
      .length;
    if (orphansOnMachine !== 1) {
      fail(
        `the far side holds ${String(orphansOnMachine)} interrupted session(s) ` +
          `and it must hold exactly 1`
      );
    }
    const rescued = await waitFor(
      () => remoteRowsOf().some((one) => one.id === orphanId),
      30_000
    );
    createCase.notes.push(
      `the far side holds 1 interrupted session, and the pane environment ` +
        `rescue ${rescued ? 'rebound it' : 'did NOT rebind it'}`
    );
    if (!rescued) fail('the interrupted create was never rescued');

    // --- partition.during-attach --------------------------------------------
    // A terminal is attached and receiving bytes when the link goes.
    const win = new BrowserWindow({ show: false });
    let bytes = 0;
    core.onTermData = (sid, byteLength) => {
      if (sid === remote.id) bytes += byteLength;
    };
    await core.attachSession(remote.id, win.webContents);
    await waitFor(() => bytes > 0, 20_000);
    const attachCase = await runCase(core, 'partition.during-attach', 3_000);
    attachCase.notes.push(
      `${String(bytes)} byte(s) had arrived through main before the cut`
    );
    // The renderer refuses input for an `unknown` row, and the row is what
    // decides it. A row that read `exited` here would be the lie this whole
    // rung exists to prevent, and the sampled statuses above carry the proof.
    core.onTermData = null;
    core.detachSession(remote.id);
    if (!(await waitForRecovery())) fail('the machine never answered again');

    // --- partition.recovery --------------------------------------------------
    const sshBefore = sshChildCount();
    currentPoint = 'partition.recovery';
    currentPhase = 'partitioned';
    await askSupervisor('down', 'partition.recovery');
    // The same sample based wait every other case uses, so this phase also has
    // the rows on record rather than only in memory.
    await waitFor(
      () => firstUnknownSample('partition.recovery') !== undefined,
      40_000
    );
    const backAt = await askSupervisor('up', 'partition.recovery');
    currentPhase = 'after';
    const recovered = await waitForRecovery();
    const sshAfter = sshChildCount();
    cases.push({
      point: 'partition.recovery',
      toUnknownMs: null,
      remoteStatuses: Object.fromEntries(
        remoteRowsOf().map((one) => [one.id, [one.status]])
      ),
      localStatuses: {},
      restoreRefused: true,
      notes: [
        `rows came back ${recovered ? 'without' : 'NOT even with'} a restart ` +
          `of Tortie, ${String(Date.now() - backAt)} ms after the link returned`,
        `ssh children ${String(sshBefore)} before and ${String(sshAfter)} after`
      ]
    });
    if (!recovered) fail('the rows never came back after the link returned');
    if (sshAfter > sshBefore + 1) {
      fail(
        `the ssh child count grew from ${String(sshBefore)} to ${String(
          sshAfter
        )} across one partition and one recovery`
      );
    }

    stopSampling();
    const operatorAfter = operatorSessionCount();
    writeFileSync(
      reportPath(),
      JSON.stringify(
        {
          cases,
          operatorBefore,
          operatorAfter,
          samples: takenSamples.length,
          machineId: MACHINE_ID,
          otherMachineId: OTHER_MACHINE_ID,
          localSessionId: local.id,
          remoteSessionIds: [remote.id, orphanId],
          otherSessionIds: [steady.id]
        },
        null,
        2
      ),
      'utf8'
    );
    if (operatorAfter !== operatorBefore) {
      fail(
        `the operator's own server held ${String(operatorBefore)} session(s) ` +
          `before this run and ${String(operatorAfter)} after it`
      );
    }
    log(
      `the operator's own server held ${String(operatorBefore)} session(s) ` +
        `before and after`
    );
    await core.killSession(local.id).catch(() => undefined);
    await shutdownGmuxCore().catch(() => undefined);
    log('PASS');
    app.exit(0);
  } catch (err) {
    stopSampling();
    console.error(`[gmux-partition] FAIL: ${(err as Error).message}`);
    app.exit(1);
  }
}

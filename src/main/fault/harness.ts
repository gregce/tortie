/**
 * The two in-app phases of the fault harness.
 *
 *   GMUX_SMOKE=fault-work    build durable state, then either be SIGKILLed
 *                            part way through it or finish and quit cleanly.
 *   GMUX_SMOKE=fault-survey   relaunch and report, as data, what survived.
 *
 * The supervisor that spawns these, kills the first one and compares the two
 * is build/fault-harness.mjs. Read that file's header for the whole shape.
 *
 * The survey reads the state TWICE, and the order is the point.
 *
 *  - `before` is read with no core booted at all: the manifest is opened
 *    read-only, tmux is only listed, and nothing is written. This is the
 *    forensic evidence of the crash, and booting the core first would destroy
 *    it, because reconcile REWRITES the rows that disagree with tmux.
 *  - `after` is read once the core has booted and reconciled. This is the
 *    recovery, and it is what the user would see.
 *
 * A checker that ran inside the process it is checking could be corrupted by
 * the same fault (the Jepsen separation, research 34 §5.2). This one runs in a
 * process that was started after the crash, and the supervisor that judges the
 * result never boots the app at all.
 */

import { app, BrowserWindow } from 'electron';
import { createHash } from 'node:crypto';
import Database from 'better-sqlite3';
import {
  appendFileSync,
  existsSync,
  readFileSync,
  readdirSync,
  statSync
} from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import {
  assertHarnessIsolation,
  type HarnessIsolation
} from '../harness/isolation';
import {
  BACKUP_GENERATIONS,
  backupBodyVerifies,
  backupsDir,
  captureManifestBackup,
  defaultManifestDbPath,
  describeBackupRing,
  listBackupBodies,
  readBackupIndex
} from '../manifest';
import {
  classifySnapshotFile,
  resolveSnapshot,
  snapshotsDir
} from '../restore/snapshots';
import { getGmuxCore, shutdownGmuxCore } from '../sessions';
import * as tmux from '../tmux';
import { armedFault, faultCounts, faultPoint } from './inject';

// ---------------------------------------------------------------------------
// Shared plumbing
// ---------------------------------------------------------------------------

function log(line: string): void {
  console.log(`[gmux-fault] ${line}`);
}

/** One machine-readable line per record. The supervisor parses these. */
function emit(kind: string, payload: unknown): void {
  console.log(`[gmux-fault] ${kind} ${JSON.stringify(payload)}`);
}

function fail(err: unknown): never {
  console.error(`[gmux-fault] FAIL: ${(err as Error).message}`);
  app.exit(1);
  return undefined as never;
}

function armWatchdog(ms: number): void {
  const t = setTimeout(() => {
    console.error(`[gmux-fault] FAIL: ${String(ms / 1000)}s watchdog expired`);
    app.exit(1);
  }, ms);
  t.unref?.();
}

/**
 * Refuse to run against anything the user owns.
 *
 * This harness crashes the app on purpose, mid-write, so the cost of pointing
 * it at the real profile or the real tmux socket is the user's live work. Both
 * are checked before a single session is created, and both are fatal.
 *
 * The check itself lives in ../harness/isolation because the power harness
 * needs the identical one. This file used to hold a second copy that compared
 * the paths without resolving them, and on macOS that refused every isolated
 * run.
 */
function assertIsolated(): HarnessIsolation {
  return assertHarnessIsolation('GMUX_FAULT_ROOT');
}

/** Sessions this harness owns. `zz-` so no other tool mistakes them for work. */
const SESSION_PREFIX = 'zz-fault';

/**
 * Open a real renderer, so the crash takes a renderer down with the main
 * process.
 *
 * Added in the Phase 19 fix round. The workload had no window at all, so every
 * SIGKILL killed a main process on its own and the harness header's claim to
 * cover "Electron crash, kill renderer and main" was true of half of it. A
 * hidden window with the real preload puts a second process in the tree, which
 * is the shape a user's app has.
 *
 * A window that will not open is not a failure of the workload. The durable
 * state under test lives in main, and refusing to run the battery because a
 * headless machine would not paint would cost more than it proves.
 */
async function openRendererForCrash(): Promise<boolean> {
  try {
    const win = new BrowserWindow({
      width: 600,
      height: 400,
      show: false,
      webPreferences: {
        preload: `${app.getAppPath()}/out/preload/index.js`,
        contextIsolation: true,
        sandbox: false
      }
    });
    await win.loadURL('data:text/html,<title>fault</title>');
    return win.webContents.getOSProcessId() > 0;
  } catch {
    return false;
  }
}

function markerFor(index: number): string {
  return `GMUX-FAULT-MARKER-${String(process.pid)}-${String(index)}`;
}

// ---------------------------------------------------------------------------
// Phase one: the workload
// ---------------------------------------------------------------------------

/**
 * What the work phase intended, written to `<root>/expect.ndjson` one line at
 * a time as each session comes back. The manifest cannot hold this: the
 * manifest is the thing under test.
 */
interface ExpectedSession {
  id: string;
  name: string;
  tmuxName: string;
  marker: string;
}

const WORK_SESSIONS = 3;

/** GMUX_SMOKE=fault-work — create durable state that a crash can damage. */
export async function runFaultWork(): Promise<void> {
  armWatchdog(120_000);
  try {
    const iso = assertIsolated();
    log(`work start pid=${String(process.pid)} socket=-L ${iso.socket}`);
    emit('work-begin', {
      pid: process.pid,
      socket: iso.socket,
      userData: iso.userData,
      armed: armedFault()
    });

    const expectPath = join(iso.root, 'expect.ndjson');
    // Before the timing origin, so the renderer's own start-up is not part of
    // the window a random kill is drawn from.
    const renderer = await openRendererForCrash();
    emit('renderer', { open: renderer });
    const core = await getGmuxCore();
    // The timing origin for a random kill. Electron's boot is most of a run
    // and its length varies by more than the whole writing phase is wide, so a
    // delay measured from spawn lands after the run has finished. Measured
    // from here it lands inside the writing.
    emit('work-ready', { ms: Date.now() });

    const home = homedir();
    for (let i = 1; i <= WORK_SESSIONS; i += 1) {
      const marker = markerFor(i);
      const session = await core.createSession({
        name: `${SESSION_PREFIX}-${String(process.pid)}-${String(i)}`,
        projectPath: home,
        cwd: home,
        agent: 'shell',
        // The marker is printed once and the pane then stays alive. It is what
        // proves a snapshot is whole rather than merely non-empty.
        extraArgs: ['-c', `echo ${marker}; while true; do sleep 1; done`]
      });
      const expected: ExpectedSession = {
        id: session.id,
        name: session.name,
        tmuxName: session.tmuxName,
        marker
      };
      appendFileSync(expectPath, `${JSON.stringify(expected)}\n`);
      log(`created ${expected.name} (${expected.id})`);
    }

    // The markers have to be ON SCREEN before a snapshot can contain them.
    await waitForMarkers(WORK_SESSIONS);

    await core.snapshotAllSessions();
    faultPoint('work.after-snapshots');
    log('snapshots written');

    // Phase 20. The launch generation was already taken inside `getGmuxCore`
    // above, so `backup.before-copy`, `backup.after-copy`, `backup.after-body`
    // and `backup.after-record` are reachable by then. `prune.before-unlink` is
    // not: a prune only unlinks once there are more generations than the ring
    // keeps, and two takes never get there.
    //
    // So the workload forces one. It takes generations until the ring is over
    // its limit, which makes the pruning invariant reachable by a real SIGKILL
    // rather than only by a test that stops deleting part way through.
    await forceBackupPrune();

    // One session is then killed out of band and restored, which is the only
    // way the restore stages become reachable. It is also what widens the
    // writing phase: without it the whole workload is about 80 ms wide and a
    // random moment has almost nowhere to land.
    await killAndRestoreLast(core, expectPath);

    // Not killed. Quit the way the app quits, so the supervisor has a clean
    // baseline to compare every crashed run against.
    await shutdownGmuxCore();
    emit('work-end', { killed: false, counts: faultCounts() });
    app.exit(0);
  } catch (err) {
    fail(err);
  }
}

/**
 * Take generations until the ring has to prune one, so the pruning invariant
 * can be interrupted by a real crash.
 *
 * `BACKUP_GENERATIONS + 1` takes past the two the app has already made is more
 * than enough, and each take is about 21 ms. The ring's own lock serialises
 * them, so these run one after another rather than racing.
 *
 * The reason is `unknown` and not a schedule reason. This is a harness asking
 * for a copy, not a moment in the app's life, and `BackupReason` has the member
 * precisely so a caller outside the schedule does not have to borrow one.
 *
 * A failure here is logged and does not fail the workload. The generations are
 * a means to reach a fault point, and a disk that will not take them is a
 * different failure from the one under test.
 */
async function forceBackupPrune(): Promise<void> {
  const takes = BACKUP_GENERATIONS + 1;
  for (let i = 0; i < takes; i += 1) {
    try {
      const out = await captureManifestBackup({
        reason: 'unknown',
        onPoint: faultPoint
      });
      if (out.removed.length > 0) {
        log(`generation ${String(out.capsule.generation)} pruned ${String(out.removed.length)}`);
      }
    } catch (err) {
      log(`a forced generation failed: ${(err as Error).message}`);
      return;
    }
  }
  log(`${String(takes)} forced generations; the ring has pruned`);
}

/**
 * Kill the last session's tmux session from OUTSIDE the app, the way a reboot
 * does, then reconcile and restore it. This is the same shape `smoke:t3` uses,
 * and it is what makes the five `restore.*` points reachable.
 */
async function killAndRestoreLast(
  core: Awaited<ReturnType<typeof getGmuxCore>>,
  expectPath: string
): Promise<void> {
  const expected = readExpected(dirname(expectPath));
  const last = expected[expected.length - 1];
  if (last === undefined) return;

  const live = await tmux.listSessions();
  const target = live.find((s) => s.gmuxId === last.id);
  if (target === undefined) return;
  // By immutable $-id, and only for a session this process created moments ago.
  await tmux.killSession(target.sessionId);
  log(`killed ${last.name} out of band`);

  // Reconcile is POLLED rather than assumed, and the reason is a real property
  // of reconcile rather than a slow machine. A row whose own evidence is newer
  // than the `list-sessions` snapshot is not judged that pass, because the
  // snapshot's silence about it proves nothing. `killSession` returns the
  // instant tmux accepts the command, so the first refresh after it can be
  // exactly that pass and the row still reads `running`. Waiting is the
  // difference between measuring the app and measuring the race: this case
  // failed one run in the fix round with `running` on a single refresh.
  const deadline = Date.now() + 10_000;
  let status: string | undefined;
  for (;;) {
    await core.refresh();
    status = core.listSessionRecords().find((r) => r.id === last.id)?.status;
    if (status === 'restorable') break;
    if (Date.now() > deadline) {
      throw new Error(
        `"${last.name}" still reads ${String(status)} 10 s after an out-of-band kill, expected restorable`
      );
    }
    await new Promise<void>((r) => setTimeout(r, 100));
  }
  await core.restoreSession(last.id);

  // Wait for the replayed scrollback to actually appear. `restoreSession`
  // returns once the replay command has been TYPED, and the shell runs it a
  // few milliseconds later. Quitting inside that gap makes the quit-time
  // capture photograph a pane that has not replayed yet, and because a
  // snapshot write is a destructive replace, the good copy is then gone. That
  // is a defect this harness found, recorded against Phase 19 item 3. The
  // workload waits so the control run measures the app rather than the race.
  await waitForMarkerInSession(last.id, last.marker);
  log(`restored ${last.name} and the scrollback came back`);
}

/** Poll one session's pane until `marker` is on screen. */
async function waitForMarkerInSession(
  gmuxId: string,
  marker: string
): Promise<void> {
  const deadline = Date.now() + 10_000;
  for (;;) {
    const live = await tmux.listSessions();
    const s = live.find((x) => x.gmuxId === gmuxId);
    if (s !== undefined) {
      const target = await tmux.resolvePaneTarget(s.sessionId);
      if ((await tmux.capturePane(target, 200)).includes(marker)) return;
    }
    if (Date.now() > deadline) {
      throw new Error(`${marker} did not come back after the restore`);
    }
    await new Promise<void>((r) => setTimeout(r, 100));
  }
}

/** Poll the private server until every pane has printed its marker. */
async function waitForMarkers(count: number): Promise<void> {
  const deadline = Date.now() + 20_000;
  for (;;) {
    const live = await tmux.listSessions();
    const mine = live.filter((s) => s.tmuxName.startsWith(SESSION_PREFIX));
    let seen = 0;
    for (const s of mine) {
      const target = await tmux.resolvePaneTarget(s.sessionId);
      const text = await tmux.capturePane(target, 200);
      if (text.includes(`GMUX-FAULT-MARKER-${String(process.pid)}-`)) seen += 1;
    }
    if (seen >= count) return;
    if (Date.now() > deadline) {
      throw new Error(`only ${String(seen)} of ${String(count)} markers appeared`);
    }
    await new Promise<void>((r) => setTimeout(r, 250));
  }
}

// ---------------------------------------------------------------------------
// Phase two: the survey
// ---------------------------------------------------------------------------

export interface SurveyRow {
  id: string;
  name: string;
  status: string;
  tmuxName: string;
  hasResumeArgv: boolean;
}

export interface SurveySnapshotFile {
  file: string;
  bytes: number;
  sha256: string;
}

/**
 * What the manifest backup ring holds after the crash (Phase 20 item 3).
 *
 * This is the evidence behind the pruning invariant. `verifiedGenerations` is
 * what a reader would actually accept: a body whose length and sha256 match the
 * completion record that names it. `unrecordedBodies` are bodies on disk that
 * no record names, which is exactly what a crash inside a capture leaves and
 * which a reader must ignore rather than trust.
 *
 * THE ASSERTION THE SUPERVISOR MAKES ON IT: after a crash at any backup point,
 * `verifiedGenerations` is not empty. A ring that can be emptied by one badly
 * timed crash protects nothing.
 */
export interface SurveyRing {
  /** Generations the completion record names, newest first. */
  recordedGenerations: number[];
  /** Of those, the ones whose bytes match the record. */
  verifiedGenerations: number[];
  /** Bodies on disk that the record does not name. Never trusted by a reader. */
  unrecordedBodies: number[];
  /** One sentence, from the ring's own reader. */
  detail: string;
}

export interface SurveyState {
  /** `ok`, the SQLite verdict, or the error that stopped us reading it. */
  manifestIntegrity: string;
  manifestBytes: number;
  rows: SurveyRow[];
  liveSessions: { tmuxId: string; tmuxName: string; gmuxId: string | null }[];
  snapshots: SurveySnapshotFile[];
  /** `.<name>.<stamp>.part` files, the debris of a crash inside a write. */
  snapshotTemporaries: string[];
  /** The manifest backup ring. See SurveyRing. */
  ring: SurveyRing;
}

export interface SurveyReport {
  expected: ExpectedSession[];
  before: SurveyState;
  after: SurveyState;
  /** Per expected session, what actually came back. */
  verdicts: {
    id: string;
    name: string;
    rowPresent: boolean;
    statusBefore: string | null;
    statusAfter: string | null;
    tmuxAlive: boolean;
    snapshotBytes: number | null;
    snapshotHasMarker: boolean | null;
  }[];
  /**
   * Live sessions carrying `@gmux-id`s the manifest has never heard of. Any
   * member of this list is a session the user owns and the app cannot see.
   */
  orphanedLiveSessions: string[];
}

function sha256(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, 16);
}

/** Read every durable surface WITHOUT booting the core or writing anything. */
async function readState(): Promise<SurveyState> {
  const dbPath = defaultManifestDbPath();
  let integrity = 'missing';
  let bytes = 0;
  const rows: SurveyRow[] = [];
  if (existsSync(dbPath)) {
    bytes = statSync(dbPath).size;
    try {
      const db = new Database(dbPath, { readonly: true, fileMustExist: true });
      try {
        const check = db.pragma('integrity_check') as { integrity_check: string }[];
        integrity = check[0]?.integrity_check ?? 'unknown';
        const stmt = db.prepare(
          'SELECT id, name, status, tmux_name AS tmuxName, resume_argv AS resumeArgv FROM sessions'
        );
        for (const r of stmt.all() as Record<string, unknown>[]) {
          rows.push({
            id: String(r['id']),
            name: String(r['name']),
            status: String(r['status']),
            tmuxName: String(r['tmuxName'] ?? ''),
            hasResumeArgv:
              r['resumeArgv'] !== null && r['resumeArgv'] !== undefined
          });
        }
      } finally {
        db.close();
      }
    } catch (err) {
      integrity = `open failed: ${(err as Error).message}`;
    }
  }

  const live: SurveyState['liveSessions'] = [];
  try {
    for (const s of await tmux.listSessions()) {
      live.push({
        tmuxId: s.sessionId,
        tmuxName: s.tmuxName,
        gmuxId: s.gmuxId ?? null
      });
    }
  } catch {
    /* no server at all is itself a result; the empty list says so */
  }

  const snaps: SurveySnapshotFile[] = [];
  const temporaries: string[] = [];
  const dir = snapshotsDir();
  if (existsSync(dir)) {
    for (const file of readdirSync(dir)) {
      const full = join(dir, file);
      if (!statSync(full).isFile()) continue;
      // Item 3 replaced the fixed `.<id>.tmp` name with `.<name>.<stamp>.part`.
      // Ask the module that owns the layout rather than matching a suffix here.
      if (classifySnapshotFile(file).kind === 'staged') {
        temporaries.push(file);
        continue;
      }
      snaps.push({ file, bytes: statSync(full).size, sha256: sha256(full) });
    }
  }

  return {
    manifestIntegrity: integrity,
    manifestBytes: bytes,
    rows,
    liveSessions: live,
    snapshots: snaps,
    snapshotTemporaries: temporaries,
    ring: await readRing()
  };
}

/**
 * Read the ring the way a reader on the recovery path would, and never the way
 * a writer would.
 *
 * Nothing here opens a body, writes a record or prunes anything. The whole
 * point of surveying after a crash is that the survey must not be able to
 * repair what it is measuring.
 */
async function readRing(): Promise<SurveyRing> {
  const dir = backupsDir();
  const capsules = readBackupIndex(dir);
  const recorded = capsules.map((c) => c.generation);
  const verified = capsules
    .filter((c) => backupBodyVerifies(c, dir))
    .map((c) => c.generation);
  const onDisk = await listBackupBodies(dir).catch(() => [] as number[]);
  return {
    recordedGenerations: recorded,
    verifiedGenerations: verified,
    unrecordedBodies: onDisk.filter((g) => !recorded.includes(g)),
    detail: describeBackupRing(dir)
  };
}

function readExpected(root: string): ExpectedSession[] {
  const path = join(root, 'expect.ndjson');
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter((l) => l.trim().length > 0)
    .map((l) => JSON.parse(l) as ExpectedSession);
}

/** GMUX_SMOKE=fault-survey — relaunch, and report what survived. */
export async function runFaultSurvey(): Promise<void> {
  armWatchdog(120_000);
  try {
    const iso = assertIsolated();
    log(`survey start socket=-L ${iso.socket}`);

    const expected = readExpected(iso.root);
    const before = await readState();

    // Now boot for real. This is the relaunch under test, and it is also what
    // rewrites the rows, so nothing above may run after it.
    const core = await getGmuxCore();
    await core.refresh();
    const after = await readState();

    // Item 3 keeps a ring of generations, so there is no one file named after
    // the session any more. Ask the module which body resolves and verifies.
    // A body that no record names is deliberately invisible here, which is the
    // behaviour a crash mid capture is meant to produce.
    const verdicts: SurveyReport['verdicts'] = expected.map((exp) => {
      const rowBefore = before.rows.find((r) => r.id === exp.id);
      const rowAfter = after.rows.find((r) => r.id === exp.id);
      const resolved = resolveSnapshot(exp.id);
      const snap =
        resolved === null
          ? undefined
          : after.snapshots.find((s) => basename(s.file) === basename(resolved.path));
      return {
        id: exp.id,
        name: exp.name,
        rowPresent: rowBefore !== undefined,
        statusBefore: rowBefore?.status ?? null,
        statusAfter: rowAfter?.status ?? null,
        tmuxAlive: after.liveSessions.some((s) => s.gmuxId === exp.id),
        snapshotBytes: snap?.bytes ?? null,
        snapshotHasMarker:
          resolved === null
            ? null
            : readFileSync(resolved.path, 'utf8').includes(exp.marker)
      };
    });

    const known = new Set(before.rows.map((r) => r.id));
    const orphaned = before.liveSessions
      .filter((s) => s.gmuxId !== null && !known.has(s.gmuxId))
      .map((s) => `${s.tmuxId} ${s.tmuxName}`);

    const report: SurveyReport = {
      expected,
      before,
      after,
      verdicts,
      orphanedLiveSessions: orphaned
    };
    emit('survivors', report);

    await shutdownGmuxCore();
    app.exit(0);
  } catch (err) {
    fail(err);
  }
}

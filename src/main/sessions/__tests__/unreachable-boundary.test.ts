/**
 * The per-machine reconcile boundary, at the core level (Phase 67).
 *
 * The defect this closes: `refresh()` treated every failed `list-sessions` as
 * a dead server. A permission error, a deleted socket file or a client the
 * exec timeout had to kill all reconciled against an empty list, which flipped
 * every row to 'restorable' and offered Restore on sessions whose agents were
 * still running. Pressing Restore there starts a SECOND agent on the same
 * conversation. Only a completed probe may confirm death now, and everything
 * else produces 'unknown'.
 *
 * TWO INSTRUMENTS, and the file is split by which one it uses.
 *
 * The first half is functional against a real on-disk manifest, because the
 * write itself is what the boundary promises: the status moves and `lastSeen`
 * does not. That is testable without tmux, and it is where the real risk sits,
 * so it is tested for real.
 *
 * The second half is source shape over core.ts, the same instrument
 * ./boot-refresh-guard.test.ts and ./end-restore-order.test.ts already use,
 * and for the same reason. `refresh`, `restoreSession` and the activity poll
 * need a live tmux server, an attach host and a control client, so exercising
 * them here would prove the mocks rather than the code. The behavioural half
 * is the phase's live-drive evidence, driven against the real app on a scratch
 * socket, not a unit test.
 */

import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ManifestStore, type ManifestSessionRecord } from '../../manifest';
import { LOCAL_MACHINE, unreachableFlips } from '../reconcile-plan';
import type { SessionStatus } from '@shared/types';

// ---------------------------------------------------------------------------
// Half one: the write, against a real manifest
// ---------------------------------------------------------------------------

let dir: string;
let store: ManifestStore;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'gmux-p67-'));
  store = new ManifestStore(join(dir, 'manifest.db'));
});

afterEach(() => {
  store.close();
  rmSync(dir, { recursive: true, force: true });
});

function row(
  id: string,
  status: SessionStatus,
  lastSeen: number
): ManifestSessionRecord {
  return store.insertSession({
    id,
    name: id,
    tmuxName: id,
    projectPath: '/w',
    cwd: '/w',
    agent: 'shell',
    status,
    createdAt: lastSeen - 60_000,
    argv: ['/bin/zsh'],
    lastSeen
  });
}

/**
 * What markMachineUnreachable does to the manifest, and only that.
 *
 * Phase 71 gave the pure function its machine argument, and this helper passes
 * the local id, which is what the core passes for this Mac. The per machine
 * property has its own suite in ./reconcile-plan.test.ts.
 */
function markUnreachable(snapshotAt: number, inFlight = new Set<string>()) {
  const flips = unreachableFlips(
    store.listSessions(),
    LOCAL_MACHINE,
    snapshotAt,
    inFlight
  );
  for (const id of flips) store.updateSession(id, { status: 'unknown' });
  return flips;
}

describe('marking the local server unreachable', () => {
  const SNAPSHOT = 1_000_000;
  const SEEN = SNAPSHOT - 5_000;

  it('writes unknown on every row that claimed to be alive', () => {
    row('r-running', 'running', SEEN);
    row('r-idle', 'idle', SEEN);
    row('r-needs', 'needs_input', SEEN);

    expect(markUnreachable(SNAPSHOT)).toHaveLength(3);
    for (const id of ['r-running', 'r-idle', 'r-needs']) {
      expect(store.getSession(id)?.status).toBe('unknown');
    }
  });

  /**
   * `lastSeen` is when the session was last confirmed ALIVE. Nothing was seen
   * here, so nothing may be stamped. This is why the boundary writes through
   * `updateSession` and not through `setStatus`, and the second assertion is
   * the proof that the distinction is real rather than decorative.
   */
  it('does not stamp lastSeen, because nothing was seen', () => {
    row('r', 'running', SEEN);
    markUnreachable(SNAPSHOT);
    expect(store.getSession('r')?.lastSeen).toBe(SEEN);

    store.setStatus('r', 'unknown');
    expect(store.getSession('r')?.lastSeen).toBeGreaterThan(SEEN);
  });

  it('leaves a confirmed death, a terminal record and a tombstone alone', () => {
    row('r-restorable', 'restorable', SEEN);
    row('r-exited', 'exited', SEEN);
    row('r-discarded', 'discarded', SEEN);

    expect(markUnreachable(SNAPSHOT)).toEqual([]);
    expect(store.getSession('r-restorable')?.status).toBe('restorable');
    expect(store.getSession('r-exited')?.status).toBe('exited');
    expect(store.getSession('r-discarded')?.status).toBe('discarded');
  });

  /**
   * A retry runs every 2 s while the link is down. If the boundary rewrote a
   * row that already reads 'unknown', that cadence would become an event
   * cadence, and the renderer would repaint the same condition forever.
   */
  it('writes nothing at all on a second pass', () => {
    row('r', 'running', SEEN);
    expect(markUnreachable(SNAPSHOT)).toEqual(['r']);
    expect(markUnreachable(SNAPSHOT + 2_000)).toEqual([]);
  });

  it('leaves a create or restore that is still in flight alone', () => {
    row('r-busy', 'running', SEEN);
    expect(markUnreachable(SNAPSHOT, new Set(['r-busy']))).toEqual([]);
    expect(store.getSession('r-busy')?.status).toBe('running');
  });

  it('leaves a row seen after the failed list alone', () => {
    row('r-new', 'running', SNAPSHOT + 5);
    expect(markUnreachable(SNAPSHOT)).toEqual([]);
    expect(store.getSession('r-new')?.status).toBe('running');
  });

  /**
   * The full round trip, without tmux. The rows go unknown while the link is
   * down, and one completed list that finds them alive is what brings them
   * back. Restore was never a correct offer at any point in this sequence.
   */
  it('comes back to running on the first list that completes', () => {
    row('r', 'running', SEEN);
    markUnreachable(SNAPSHOT);
    expect(store.getSession('r')?.status).toBe('unknown');

    store.reconcile([{ tmuxId: '$1', tmuxName: 'r', gmuxId: 'r' }], {
      snapshotAt: SNAPSHOT + 2_000
    });
    expect(store.getSession('r')?.status).toBe('running');
  });
});

// ---------------------------------------------------------------------------
// Half two: the orchestration, as source shape over core.ts
// ---------------------------------------------------------------------------

const CORE = join(dirname(fileURLToPath(import.meta.url)), '..', 'core.ts');
const src = readFileSync(CORE, 'utf8');

/** The body of one method, from its declaration to the next marker. */
function body(decl: string, end: string): string {
  const start = src.indexOf(decl);
  expect(start, `found ${decl}`).toBeGreaterThan(-1);
  const stop = src.indexOf(end, start);
  expect(stop, `found ${end} after ${decl}`).toBeGreaterThan(start);
  return src.slice(start, stop);
}

describe('refresh, on a failed list', () => {
  const refresh = body('async refresh(): Promise<void>', 'const before =');

  it('asks what the failure PROVED instead of reading a code', () => {
    expect(refresh).toContain(
      'listAttemptOutcome(tmux.serverProbeVerdict(err))'
    );
    // The old test: any TMUX_UNREACHABLE, which covered a live server behind
    // a permission error just as happily as a dead one.
    expect(refresh).not.toContain("isGmuxError(err, 'TMUX_UNREACHABLE')");
  });

  it('reconciles against the empty list ONLY for a completed probe', () => {
    const empty = refresh.indexOf('liveInfos = [];');
    const mark = refresh.indexOf('this.markMachineUnreachable(');
    expect(mark).toBeGreaterThan(-1);
    expect(empty).toBeGreaterThan(mark); // the unreachable arm returns first
    expect(refresh.slice(mark)).toMatch(/return;/);
  });

  it('no longer has an arm that skips the reconcile and keeps stale rows', () => {
    expect(refresh).not.toContain('skipping reconcile');
  });
});

describe('markMachineUnreachable', () => {
  const mark = body(
    'private markMachineUnreachable(',
    'Close every restore attempt'
  );

  /**
   * Phase 71. The judgement is taken for ONE machine, so the machine id the
   * caller named is handed to the pure function rather than dropped on the
   * floor. Without this line the flips would be taken over every row in the
   * manifest, which is what the method did while there was only one machine.
   */
  it('passes the machine it was called for into the flips', () => {
    expect(mark).toMatch(/unreachableFlips\(\s*this\.manifest\.listSessions\(\),\s*machine,/);
  });

  it('writes the status without stamping lastSeen', () => {
    expect(mark).toContain("this.manifest.updateSession(id, { status: 'unknown' })");
    expect(mark).not.toContain('setStatus');
  });

  it('sends one status event per flip and one list broadcast', () => {
    expect(mark).toContain("broadcast(EVT_STATUS_CHANGED, id, 'unknown')");
    expect(mark).toContain('this.broadcastSessions()');
  });

  /**
   * A capture sync is the death backstop. This is not a death, and firing it
   * against a server Tortie cannot reach would spend execs to capture nothing.
   * The later flip to 'restorable' rides statusFlipActions on the reconcile
   * path, where the backstop fires once, at the moment death is confirmed.
   */
  it('runs no capture sync', () => {
    expect(mark).not.toContain('queueCaptureSync');
  });

  /**
   * The bindings answer "which tmux session do I attach to". During a lost
   * link that answer is still correct, and dropping it would break the attach
   * as surely as the wrong status did.
   */
  it('leaves the id maps intact', () => {
    expect(mark).not.toContain('this.liveIds');
    expect(mark).not.toContain('this.byTmuxId');
  });

  it('schedules the retry that is also the recovery path', () => {
    expect(mark).toContain('this.scheduleRefresh(UNREACHABLE_RETRY_MS)');
    expect(src).toMatch(/const UNREACHABLE_RETRY_MS = 2_000;/);
  });

  /**
   * The retry runs every 2 s. A log line on every one of them would bury a
   * long outage in identical lines, so the line is written when the link drops
   * and when a later retry finds more rows to mark, and not otherwise.
   */
  it('does not write a log line on every retry', () => {
    expect(mark).toContain('if (!this.localUnreachable || flips.length > 0)');
  });
});

/**
 * Only a completed list may move a row out of 'unknown'. Every other producer
 * of status has to step around it, or the boundary would be undone by the
 * next poll rather than by evidence.
 */
describe('the guards that keep unknown until a list completes', () => {
  it('the activity poll does not watch an unreachable session', () => {
    const fn = body('private activitySessions(', 'One verdict from the');
    expect(fn).toContain("rec.status === 'unknown'");
  });

  it('an activity verdict never overwrites unknown', () => {
    const fn = body('private applyDetectedStatus(', 'broadcast(EVT_STATUS_CHANGED, sessionId, status)');
    expect(fn).toContain("rec.status === 'unknown'");
  });

  it('the snapshot pass skips an unreachable session', () => {
    // PHASE 125 moved the pass into ../quit-generation.ts unchanged, so the
    // read moved with it. The claim is the one it made before the move.
    const pass = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '..', 'quit-generation.ts'),
      'utf8'
    );
    expect(pass).toMatch(
      /const unwritten: UnwrittenSnapshot\[\] = \[\];[\s\S]{0,600}rec\.status === 'unknown'/
    );
  });

  /**
   * Restore is refused structurally rather than by a new branch. The gate acts
   * on three statuses and returns the row unchanged for everything else, so an
   * 'unknown' row opens no journal entry and execs nothing.
   */
  it('restoreSession refuses an unknown row', () => {
    // PHASE 72 FIX ROUND. The slice starts at the local row, because the method
    // now opens with the branch for a session on another machine and that
    // branch has an in flight guard of its own. What this asserts is the gate
    // in front of the LOCAL restore.
    const gate = body(
      'const rec = this.mustGetSession(sessionId);',
      'this.restoresInFlight.add(sessionId);\n    /** The open journal entry'
    );
    expect(gate).toContain("rec.status !== 'restorable'");
    expect(gate).toContain("rec.status !== 'exited'");
    expect(gate).toContain("rec.status !== 'discarded'");
    expect(gate).not.toContain("'unknown'");
  });
});

/**
 * PHASE 72. A session on another machine takes a different path entirely, and
 * the shape of the branch is what keeps the two apart.
 *
 * The same instrument as the block above, and for the same reason: `restoreSession`
 * needs a live tmux server, an attach host and a control client, so exercising it
 * here would prove the mocks. The behavioural half is the ten row matrix and
 * `GMUX_SMOKE=remote-sessions`.
 */
describe('the remote branch in front of the local restore', () => {
  // Phase 116 moved the body behind the admission gate; the remote branch
  // lives in the admitted body, so that is where the slice starts.
  const gate = body('async restoreSessionAdmitted(', 'const rec = this.mustGetSession(');

  /**
   * The refusal runs before anything is composed and before anything is sent.
   * It asks the restore gate now rather than answering no, so a row the gate
   * refuses gets the gate's own sentence.
   */
  it('asks the restore gate before anything local runs', () => {
    expect(gate).toContain('refuseRemoteRestore(sessionId)');
    expect(gate.indexOf('refuseRemoteRestore')).toBeLessThan(
      gate.indexOf('restoreRemoteSession(sessionId)')
    );
  });

  /**
   * PHASE 72 FIX ROUND. THE DOUBLE PRESS GUARD IS INSIDE THE BRANCH, above the
   * gate and above everything the restore composes.
   *
   * It used to be below the branch, so two presses on one remote row both
   * passed the gate and both composed a create. The window between them is
   * several seconds wide, because the restore re-asserts the machine's own
   * session server first, and the only thing refusing the second create was
   * that machine's own rule about duplicate session names.
   */
  it('guards a second press before it asks the gate', () => {
    expect(gate).toContain('this.restoresInFlight.has(sessionId)');
    expect(gate).toContain('this.restoresInFlight.add(sessionId)');
    expect(gate.indexOf('this.restoresInFlight.add(sessionId)')).toBeLessThan(
      gate.indexOf('refuseRemoteRestore(sessionId)')
    );
    // Released on every path out, including the one that throws the gate's
    // sentence. A guard a refusal leaks would make the verb dead for the rest
    // of the run.
    expect(gate).toContain('this.restoresInFlight.delete(sessionId)');
    expect(gate).toContain('} finally {');
  });

  /**
   * A row on another machine never reaches the local machinery. Every check
   * below the branch asks about this Mac, being whether a folder exists here and
   * which binary is here, and none of them can answer for a different computer.
   */
  it('routes a row on another machine away from the local path', () => {
    expect(gate).toContain('restoreRemoteSession(sessionId)');
    // The whole branch sits above the first line of the local path, which is
    // where the slice ends, so reaching it at all means the local machinery ran
    // for a row on another machine.
    expect(gate).not.toContain('restoreSessionInTmux');
  });

  /**
   * A row with no machine, and a row whose machine is this Mac, are the same
   * thing and both take the local path. The comparison is against the one
   * constant rather than a literal, so a rename of the word cannot split them.
   */
  it('treats a row with no machine as local', () => {
    expect(gate).toContain("remoteRow?.machineId !== undefined");
    expect(gate).toContain('remoteRow.machineId !== LOCAL_MACHINE');
  });

  /**
   * `src/main/restore/restore.ts` is untouched by this phase, and the local
   * restore reaches it exactly as it did before. This is the shape assertion
   * behind that claim; `smoke:t3` and `conformance:resume:capture` are the
   * evidence.
   */
  it('leaves the local restore call where it was', () => {
    expect(src).toContain('await restoreSessionInTmux(rec, {');
  });
});

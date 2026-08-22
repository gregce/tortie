/**
 * The snapshot pass and the manifest generation the quit path takes.
 *
 * Two moments have no next tick, being quit and sleep, and both run through
 * this file. The snapshot pass writes every live session's scrollback to
 * `<userData>/gmux/snapshots/<id>.txt` so a restore has something to replay,
 * and the generation is the manifest backup ring's copy of the database.
 *
 * Phase 125 moved these four functions out of `./core.ts` unchanged. The
 * ORDER the quit path runs them in did not move: `shutdownGmuxCore()` in
 * `./core.ts` still joins the admitted mutations, then snapshots, then drains
 * the capture queue, then takes the generation, then disposes. Nothing here
 * decides that order and nothing here may change it.
 *
 * THE ONE RULE THIS FILE KEEPS. It imports nothing from `./core`. It reads the
 * core through {@link QuitGenerationDeps}.
 */

import { getLog } from '../log';
// The durable writer's own failure type and its own out-of-space test
// (Phase 19 item 2). Do not write a second copy of either.
import { DurableWriteError, isOutOfSpace } from '../durable';
import {
  ManifestStore,
  type ManifestRingSchedule,
  type RingTakeResult
} from '../manifest';
// The one channel main uses to say a durability layer is degraded, and the
// owner of the once-per-run latch (Phase 19 item 9). Never broadcast a
// DurabilityNotice directly — the latch is the point of the module.
import { postDurabilityNotice } from '../notice';
import {
  captureSessionSnapshot,
  type SnapshotReason
} from '../restore/snapshots';
import { snapshotRecipeOf } from './launch-plan';
import {
  snapshotFailureNotice,
  snapshotPassLine,
  type SnapshotPassResult,
  type UnwrittenSnapshot
} from './reconcile-plan';

/**
 * Scope "sessions" (Phase 35), the same scope `./core.ts` writes under, so a
 * line this pass writes reads exactly as it did before Phase 125 moved it.
 */
const sessionsLog = getLog('sessions');

/**
 * What the quit path needs from the session core.
 *
 * `ringSchedule` is a getter rather than a value, because the field is null
 * until boot reaches it and `../capabilities.ts` can call the quit path at any
 * point after that.
 */
export interface QuitGenerationDeps {
  readonly manifest: ManifestStore;
  /** manifest session id → live tmux `$-id`. */
  readonly liveIds: Map<string, string>;
  /** The manifest backup ring's timer, or null when boot has not reached it. */
  ringSchedule(): ManifestRingSchedule | null;
}

/**
 * Snapshot every live manifested session's scrollback to
 * <userData>/gmux/snapshots/<id>.txt. Best-effort and parallel — quit
 * paths call this and must never hang on a sick server.
 *
 * Best-effort is not the same as silent (Phase 19 item 4). A pass whose
 * WRITES failed has stopped protecting the user's work, and the pass says so
 * once. See {@link reportUnwrittenSnapshots}.
 *
 * `reason` is recorded in each snapshot's capsule (Phase 19 item 3), because
 * Phase 20 reconstruction cannot tell a capture taken on the way to sleep
 * from one taken as the tmux server died, and the two are worth different
 * amounts. It defaults to 'app-quit' because that is what an unqualified
 * "snapshot everything" has always meant here.
 */
export async function snapshotAllSessions(
  deps: QuitGenerationDeps,
  reason: SnapshotReason = 'app-quit'
): Promise<void> {
  const jobs: Promise<unknown>[] = [];
  // PHASE 111 — THE PASS ACCOUNTS FOR ITSELF. Nothing below decides
  // anything: the three skip rules are exactly the ones that were already
  // here. What is new is that every row records the outcome it took, so a
  // red durability lane can say which of the five happened instead of
  // leaving a person to guess. `snapshotPassLine` owns both the counting and
  // the rule about which outcomes are worth a name.
  const results: SnapshotPassResult[] = [];
  /** Sessions whose scrollback this pass could not write. */
  const unwritten: UnwrittenSnapshot[] = [];
  for (const rec of deps.manifest.listSessions()) {
    // 'unknown' is skipped with the two dead statuses (Phase 67): capturing
    // a pane on a server Tortie cannot reach only produces noise, and the
    // session may still be alive to capture itself later.
    if (
      rec.status === 'exited' ||
      rec.status === 'restorable' ||
      rec.status === 'unknown'
    ) {
      results.push({ name: rec.name, outcome: 'notRunning' });
      continue;
    }
    // F1: only capture panes we can prove are ours — a name-resolved
    // capture would file a STRANGER's scrollback as this session's
    // history and replay it on restore.
    const target = deps.liveIds.get(rec.id);
    if (target === undefined) {
      // A row the person removed is a tombstone rather than a session this
      // Mac lost track of, so it is counted with the ones that were not
      // running. Every other row here is live on a different machine, which
      // `runsElsewhere` in reconciliation.ts is what keeps live.
      results.push({
        name: rec.name,
        outcome: rec.status === 'discarded' ? 'notRunning' : 'noPaneHere'
      });
      continue;
    }
    jobs.push(
      captureSessionSnapshot(target, rec.id, {
        reason,
        session: snapshotRecipeOf(rec)
      }).then(
        (stored) => {
          // A false answer here is a live pane with an empty screen. Writing
          // nothing is the right answer, and until Phase 111 it was also a
          // silent one.
          results.push({
            name: rec.name,
            outcome: stored ? 'written' : 'nothingOnScreen'
          });
        },
        (err: unknown) => {
          results.push({ name: rec.name, outcome: 'failed' });
          // A failed WRITE is the failure that means protection stopped, and
          // the durable writer's own error type is what identifies one. Every
          // other failure here is a pane that went away, and the %exit path
          // calls this with a dying tmux server, which produces a whole pass
          // of those. Announcing on those would be a false alarm on the one
          // channel that must never cry wolf.
          if (err instanceof DurableWriteError) {
            unwritten.push({ name: rec.name, outOfSpace: isOutOfSpace(err) });
            return;
          }
          sessionsLog.warn(
            `snapshot failed for "${rec.name}": ${(err as Error).message}`
          );
        }
      )
    );
  }
  await Promise.allSettled(jobs);
  sessionsLog.info(snapshotPassLine(reason, results));
  reportUnwrittenSnapshots(unwritten);
}

/**
 * Say once that scrollback is no longer being saved (Phase 19 item 4).
 *
 * The whole pass produces at most one notice. A full volume fails every
 * session in the pass with the same error, and forty three copies of one
 * sentence is a dashboard. `postDurabilityNotice` owns the latch that also
 * silences the next pass, so the count below is this pass's own.
 *
 * The names stay in the log, because that is where a person debugging wants
 * them and it is not a surface the user reads. The log line is written even
 * when the notice is swallowed as a repeat, which is what the returned
 * boolean is for.
 */
function reportUnwrittenSnapshots(
  unwritten: readonly UnwrittenSnapshot[]
): void {
  const notice = snapshotFailureNotice(unwritten);
  if (notice === null) return;
  sessionsLog.warn(
    `${notice.sessions} session(s) were not saved` +
      `${notice.outOfSpace ? ' because the volume is full' : ''}: ` +
      unwritten.map((one) => one.name).join(', ')
  );
  postDurabilityNotice(notice);
}

/**
 * Take a generation of the manifest because the machine is going to sleep
 * (Phase 20 item 2).
 *
 * Sleep and quit are the two moments with no next tick, so both skip the five
 * minute floor and keep the change test. Null means the manifest has not
 * changed since the last generation, which is the common case and is not a
 * failure.
 */
export async function takeManifestGenerationOnSuspend(
  deps: QuitGenerationDeps
): Promise<RingTakeResult | null> {
  return (await deps.ringSchedule()?.onSuspend()) ?? null;
}

/** The same, on the way out. Stops the poll first. */
export async function takeManifestGenerationOnQuit(
  deps: QuitGenerationDeps
): Promise<RingTakeResult | null> {
  return (await deps.ringSchedule()?.onQuit()) ?? null;
}

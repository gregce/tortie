/**
 * When a check runs, and what a run is allowed to publish (Phase 63,
 * research 49 section 4.7).
 *
 * ## It rides the watcher that already exists
 *
 * Tortie runs exactly one `@parcel/watcher` subscription per repository, and
 * its single callback feeds the fan out in `../watcher/bus.ts`. Git subscribes,
 * quick open subscribes, and since this phase the arch checker subscribes as a
 * third peer. It starts NO subscription of its own. That matters for more than
 * battery: `FSEventStreamSetExclusionPaths` accepts eight paths and silently
 * applies zero above that, which is what `npm run conformance:watcher` exists
 * to protect, and a feature that adds no subscription cannot spend that budget.
 *
 * The coalescing window is the watcher's own, imported as
 * `DEFAULT_DEBOUNCE_MS` rather than copied. Research 49 wrote that number down
 * as 150 ms and the file has read 300 ms since it was written, so this module
 * reads the constant and cannot inherit the mistake.
 *
 * ## One run in flight, and cancellation
 *
 * A burst of changes produces one run. A change arriving DURING a run schedules
 * exactly one more run for after it, never a queue of them, because the second
 * run would read the same tree the third one would. The run in flight is
 * cancelled when a newer one is due, and a cancelled run publishes nothing.
 *
 * ## The generation stamp
 *
 * Every run claims a generation before it starts and publishes under it in one
 * transaction. A run whose generation is no longer the newest throws its own
 * results away rather than writing them over a newer answer. That is the whole
 * torn tree rule, and it is enforced inside the store rather than trusted here.
 *
 * ## The settle window, and why only one direction has one
 *
 * An agent rewriting forty files leaves the tree half written for seconds at a
 * time, and a check that lands in the middle of that sees promises that look
 * broken and are not. So a DOWNGRADE, meaning a promise that was holding and
 * now is not, is held back until a second run confirms it. An UPGRADE publishes
 * at once, because a promise that has started holding again cannot be
 * transiently right.
 *
 * A held downgrade is not hidden. The subject keeps its previous verdict for
 * one more window and the run that follows publishes whatever is true then. The
 * longest a break can stay off the screen is one settle window, which is stated
 * here as a multiple of the watcher's own coalescing window.
 *
 * ## Nothing here starts an agent, ever
 *
 * A source change, a verdict change and a freshness number are all facts about
 * files. None of them starts a process beyond the fixed argv git calls in
 * `./argv-guard.ts`, and none of them sets a session's status.
 */

import { DEFAULT_DEBOUNCE_MS, onRepoChanged } from '../watcher';
import type { ArchVerdict } from '@shared/arch';

/**
 * How long a downgrade waits for a second opinion.
 *
 * Stated as a multiple of the watcher's own coalescing window so the two can
 * never disagree: at 300 ms that is 2,400 ms, which is the "few seconds" the
 * research asks for and is under the 5 s incremental budget.
 */
export const ARCH_SETTLE_MS = DEFAULT_DEBOUNCE_MS * 8;

/** How often a progress message may be sent, per repository. The symbols precedent. */
export const ARCH_PROGRESS_THROTTLE_MS = 120;

/** What one scheduled run does. It resolves when the run has finished or been dropped. */
export type ArchRunner = (repoPath: string, signal: AbortSignal) => Promise<void>;

interface RepoWatch {
  repoPath: string;
  /** The run in flight, or null. */
  inFlight: AbortController | null;
  /** A run is owed after the one in flight finishes. */
  again: boolean;
  /** The settle timer, or null when nothing is being held. */
  settleTimer: NodeJS.Timeout | null;
  /** Subjects whose downgrade is being held for one more window. */
  held: Set<string>;
}

const watches = new Map<string, RepoWatch>();
let unsubscribe: (() => void) | null = null;
let runner: ArchRunner | null = null;

/**
 * Start listening. Called once, by the arch registrar.
 *
 * It subscribes to the fan out and nothing else. A repository nobody has opened
 * the arch view on is never checked, because `watchArchRepo` is what arms one.
 */
export function startArchWatch(run: ArchRunner): void {
  runner = run;
  if (unsubscribe !== null) return;
  unsubscribe = onRepoChanged((repoPath) => {
    const watch = watches.get(repoPath);
    if (watch === undefined) return;
    schedule(watch);
  });
}

/**
 * Arm re-checks for one repository, and answer whether this armed it now.
 *
 * The arch view calls this when it loads a project. Arming does NOT start a
 * check: the load path decides that, by comparing the commit the stored
 * verdicts were computed at against the commit the repository is on now. That
 * comparison is the launch catch up, and it is deliberately a re-check rather
 * than a replayed delta, because a delta this build did not record cannot be
 * distinguished from no change at all, and the conservative rule refuses to
 * report the second when it means the first.
 */
export function watchArchRepo(repoPath: string): boolean {
  if (watches.has(repoPath)) return false;
  watches.set(repoPath, {
    repoPath,
    inFlight: null,
    again: false,
    settleTimer: null,
    held: new Set<string>()
  });
  return true;
}

/** Stop re-checking one repository. Its tab closed. */
export function unwatchArchRepo(repoPath: string): void {
  const watch = watches.get(repoPath);
  if (watch === undefined) return;
  watch.inFlight?.abort();
  if (watch.settleTimer !== null) clearTimeout(watch.settleTimer);
  watches.delete(repoPath);
}

/** Ask for a run now, coalescing with anything already going. */
export function requestArchCheck(repoPath: string): void {
  const watch = watches.get(repoPath);
  if (watch === undefined) return;
  schedule(watch);
}

/** Every repository currently armed. The registrar's disposer walks it. */
export function watchedArchRepos(): string[] {
  return [...watches.keys()];
}

/** Drop every subscription and every timer. Quit time, and safe to call twice. */
export function stopArchWatch(): void {
  unsubscribe?.();
  unsubscribe = null;
  runner = null;
  for (const watch of watches.values()) {
    watch.inFlight?.abort();
    if (watch.settleTimer !== null) clearTimeout(watch.settleTimer);
  }
  watches.clear();
}

function schedule(watch: RepoWatch): void {
  if (runner === null) return;
  if (watch.inFlight !== null) {
    // One more run is owed, and one is enough: a third would read the tree the
    // second one is about to read.
    watch.again = true;
    watch.inFlight.abort();
    return;
  }
  void start(watch);
}

async function start(watch: RepoWatch): Promise<void> {
  const run = runner;
  if (run === null) return;
  const controller = new AbortController();
  watch.inFlight = controller;
  try {
    await run(watch.repoPath, controller.signal);
  } catch {
    // A failed run is not a divergence and not a crash. The next change tries
    // again, and until then the previous verdicts keep rendering.
  } finally {
    watch.inFlight = null;
  }
  if (watch.again) {
    watch.again = false;
    void start(watch);
  }
}

// ---------------------------------------------------------------------------
// The settle window
// ---------------------------------------------------------------------------

/** Whether a verdict is one this design is willing to publish immediately. */
function holds(verdict: ArchVerdict | undefined): boolean {
  if (verdict === undefined) return false;
  return verdict.status === 'convergent';
}

/**
 * What this run may publish, given what the last one published.
 *
 * A subject that was holding and now is not keeps its previous verdict for one
 * window and is named in `held`. Everything else passes through untouched,
 * including a subject that was already broken and is broken differently now,
 * because that is not a downgrade and holding it back would hide a moving
 * failure behind a stale one.
 */
export function applySettleWindow(
  repoPath: string,
  previous: readonly ArchVerdict[],
  next: readonly ArchVerdict[]
): { publish: ArchVerdict[]; held: string[] } {
  const watch = watches.get(repoPath);
  const before = new Map(previous.map((v) => [v.subjectId, v]));
  const publish: ArchVerdict[] = [];
  const held: string[] = [];
  for (const verdict of next) {
    const was = before.get(verdict.subjectId);
    const downgraded = holds(was) && !holds(verdict);
    // A downgrade that was already held once is published now. The second
    // opinion is what the window was waiting for.
    const alreadyHeld = watch?.held.has(verdict.subjectId) === true;
    if (downgraded && !alreadyHeld && was !== undefined) {
      publish.push(was);
      held.push(verdict.subjectId);
      continue;
    }
    publish.push(verdict);
  }
  if (watch !== undefined) {
    watch.held = new Set(held);
    if (watch.settleTimer !== null) clearTimeout(watch.settleTimer);
    watch.settleTimer = null;
    if (held.length > 0) {
      // Nothing else is going to happen on a tree that has stopped changing, so
      // the window schedules its own second opinion.
      watch.settleTimer = setTimeout(() => {
        watch.settleTimer = null;
        schedule(watch);
      }, ARCH_SETTLE_MS);
      watch.settleTimer.unref?.();
    }
  }
  return { publish, held };
}

/**
 * Watcher-close tracking for quit (Phase 36).
 *
 * WHY THIS EXISTS. On 2026-08-14 every quit of the installed app was a
 * SIGABRT the user never saw. @parcel/watcher's `unsubscribe()` queues work
 * on the uv threadpool, and its completion resolves a JavaScript promise
 * through napi on the main loop. The quit path fired those unsubscribes with
 * `void` and called `app.quit()` without waiting. When the threadpool was
 * busy (a real quit writes snapshots and a manifest generation, so it always
 * is), the completion was still queued when Electron reached
 * `node::FreeEnvironment`. Environment cleanup drained it, napi refused the
 * call, and the module aborted the process through `napi_fatal_error`. The
 * paired standalone reproduction is recorded in the Phase 36 backlog entry:
 * a fire-and-forget unsubscribe under a saturated pool aborts (exit 134),
 * the same unsubscribe awaited exits 0.
 *
 * THE RULE THAT FOLLOWS (broadened in the fix round). EVERY watcher close is
 * wrapped in `trackWatcherClose`, including the ones a dispose path awaits
 * directly, because the quit path bounds its awaits with a race. The
 * before-quit handler calls `drainWatcherCloses` after the last close has
 * been issued; when the drain expires it reads `pendingWatcherCloseCount`,
 * logs the nonzero count, and drains AGAIN with a much longer bound,
 * because reaching `node::FreeEnvironment` with a queued unsubscribe
 * completion is a guaranteed abort, and so is `app.exit()` (measured; its
 * stack still runs FreeEnvironment -> RunCleanup). Only when the second
 * drain also expires does the quit end hard with SIGKILL to self, the one
 * exit that cannot abort. A close the count cannot see is a close that can
 * still crash the quit, so an untracked `unsubscribe()` anywhere in
 * src/main is a bug.
 *
 * No Electron import on purpose, so this stays unit testable.
 */

/** Settle chains of every tracked close still in flight. */
const pending = new Set<Promise<void>>();

/**
 * Track a watcher close (an `unsubscribe()` promise) so the quit-time drain
 * can wait for it. Returns the SAME promise so call sites keep their shape:
 * `void trackWatcherClose(sub.unsubscribe().catch(() => undefined))`.
 * Rejections count as settled; tracking never introduces an unhandled
 * rejection of its own.
 */
export function trackWatcherClose<T>(close: Promise<T>): Promise<T> {
  const settled: Promise<void> = close.then(
    () => {
      pending.delete(settled);
    },
    () => {
      pending.delete(settled);
    }
  );
  pending.add(settled);
  return close;
}

/**
 * How many tracked closes are still unsettled right now. The before-quit
 * handler reads this AFTER its bounded drain: a nonzero answer means at
 * least one unsubscribe completion is still queued, and letting the quit
 * reach `node::FreeEnvironment` from that state is a guaranteed
 * `napi_fatal_error` abort. The caller logs the count and drains again with
 * a longer bound instead of proceeding.
 */
export function pendingWatcherCloseCount(): number {
  return pending.size;
}

/**
 * Wait until every tracked close has settled, or until `deadlineMs` runs
 * out. Closes tracked WHILE the drain is running are included, because the
 * set is re-read after every settled batch. Returns the number of closes
 * still unsettled at return, so 0 means the drain is complete and any other
 * number is the log-worthy truth. The deadline exists so quit can never
 * wedge. Two things are known to outlive it: a sick FSEvents, and an
 * unsubscribe completion queued behind uv threadpool work when the pool is
 * backed up and the CPU is contended. The second was measured in the
 * packaged app on 2026-08-14, so an expired drain is an expected state, not
 * a theoretical one.
 */
export async function drainWatcherCloses(deadlineMs: number): Promise<number> {
  const deadline = Date.now() + deadlineMs;
  while (pending.size > 0) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) return pending.size;
    const batch = [...pending];
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, remaining);
      timer.unref?.();
      // Entries in `batch` are settle chains: they never reject, and each
      // one removes itself from `pending` BEFORE it resolves, so the size
      // check above sees the truth on the next pass.
      void Promise.all(batch).then(() => {
        clearTimeout(timer);
        resolve();
      });
    });
  }
  return 0;
}

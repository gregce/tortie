/**
 * The two things scrollback is allowed to say without being asked
 * (Phase 13.7, docs/research/23-scrollback-limits.md §5.4-5.5).
 *
 * THE RULE THIS MODULE IS BUILT ON
 *
 * docs/ZEN-OF-TORTIE.md forbids reporting STATE and requires reporting LOSS.
 * A memory figure climbing 40 → 60 MB changes nothing a human should do. The
 * same mechanism, at the moment a session begins DISCARDING output, changes
 * exactly one thing: it says the product just stopped keeping something, and
 * "Nothing important gets lost" is the promise the document closes on.
 *
 * WHY THERE IS NO "APPROACHING THE LIMIT" WARNING
 *
 * Measured: a runaway command fills a 50,000-line buffer in about 0.3 s
 * (200,000 lines in 1.1 s). A "you are at 80%" toast would fire 0.06 s before
 * the loss it warns about. The opposite regime — a transcript accumulating
 * 14,867 lines over a day — has plenty of warning time, but a percentage
 * crawling upward over days is exactly the number that rises on its own. So
 * the trigger is neither a percentage nor a prediction. It is the EVENT: the
 * first time a session discards a line, say so once, and never again for that
 * session.
 *
 * At the shipped default of 25,000, with the deepest session ever observed on
 * this fleet at 14,867 lines, this will essentially never fire — which is the
 * correct behaviour for a signal, and the strongest evidence it is not a
 * gauge.
 *
 * COST: zero. The test is a comparison of two integers that already arrive in
 * the same line of the 1 Hz poll's output. No timer, no extra tmux process,
 * no sampling of any kind is added by this file.
 *
 * WHAT THE TEST IS NOT: `history_size >= history_limit`.
 *
 * docs/research/23-scrollback-limits.md §6.3 proposed exactly that, and it is
 * wrong — caught by driving the real app rather than by reading the code.
 * tmux does not trim one line at a time. `grid_collect_history()` fires when
 * `hsize >= hlimit` and drops `hlimit / 10` lines in one go, so a pane that is
 * actively discarding sits BELOW its limit almost always.
 *
 * MEASURED 2026-08-11, own socket, limit 1,000, 40 samples at 10 Hz off a
 * pane in a continuous write loop:
 *
 *   930 987 997 916 965 970 933 956 901 913 924 987 959 994 952 914 930 986
 *   901 977 972 994 917 940 938 990 923 961 980 918 961 980 997 921 927 944
 *   943 927 951 912                       → range [901, 997], never 1,000
 *
 * A 1 Hz poll would have found `size >= limit` on none of those ticks. The
 * honest test is therefore "inside tmux's own trim band": at or above
 * `limit - limit/10`, the depth a just-trimmed pane settles to. Its whole
 * error is the one pass a growing pane makes through that band before its
 * first trim — under 10% of the depth, once, on the way to a loss that at
 * every measured fill rate is already happening by the time a human reads the
 * notice.
 *
 * The band is also what keeps `clear-history` quiet: the Clear action takes
 * `history_size` to 0, which is not near anything.
 */

import type { ScrollbackNotice } from '@shared/scrollback';

/** A session's depth reading, straight off the existing 1 Hz poll. */
export interface ScrollbackSample {
  sessionId: string;
  /** Lines held (`#{history_size}`). */
  lines: number;
  /** The depth the session was born with (`#{history_limit}`). */
  limit: number;
}

/**
 * A session younger than this is not lectured. A restored session replaying
 * a snapshot, or a deliberate `cat` of a huge file in the first moments,
 * should not produce a notice.
 */
const SETTLE_MS = 60_000;

/**
 * tmux's trim batch, as a fraction of the depth: `grid_collect_history()`
 * drops `hlimit / 10`. A pane at or above `limit - limit/10` is either
 * discarding already or one batch away from it.
 */
const TRIM_BATCH_DIVISOR = 10;

/** Is this session at the depth it was born with, as tmux reports depth? */
export function isDiscarding(lines: number, limit: number): boolean {
  if (limit <= 0) return false;
  return lines >= limit - Math.ceil(limit / TRIM_BATCH_DIVISOR);
}

/** Snapshots this large in userData are worth one sentence. */
export const SAVED_SCROLLBACK_ALERT_BYTES = 1024 ** 3;
/** Below this, quitting may not be able to save sessions at all. */
export const LOW_DISK_BYTES = 2 * 1024 ** 3;
/** Disk notices re-arm after a day; they are conditions, not events. */
const DISK_REARM_MS = 24 * 60 * 60 * 1000;

export interface ScrollbackWatchDeps {
  /** Display name for a session id, or null when it is gone. */
  nameOf(sessionId: string): string | null;
  emit(notice: ScrollbackNotice): void;
  now?(): number;
}

/**
 * Latches the one-shot notices. All state is in memory on purpose: a latch
 * that survived a restart would need a store, and the cost of re-announcing
 * a still-discarding session once per app launch is smaller than the cost of
 * persisting a flag nobody can inspect.
 */
export class ScrollbackWatch {
  /** Sessions that have already been told. Never re-armed within a run. */
  private readonly announced = new Set<string>();
  /** First time each session was seen, so a new one can settle. */
  private readonly firstSeen = new Map<string, number>();
  private savedAlertAt = 0;
  private diskAlertAt = 0;
  private readonly now: () => number;

  constructor(private readonly deps: ScrollbackWatchDeps) {
    this.now = deps.now ?? ((): number => Date.now());
  }

  /** Called once per poll tick with whatever the poll already read. */
  observe(samples: readonly ScrollbackSample[]): void {
    const now = this.now();
    const alive = new Set(samples.map((s) => s.sessionId));
    for (const id of [...this.firstSeen.keys()]) {
      if (!alive.has(id)) {
        this.firstSeen.delete(id);
        this.announced.delete(id);
      }
    }
    for (const s of samples) {
      const seen = this.firstSeen.get(s.sessionId);
      if (seen === undefined) {
        this.firstSeen.set(s.sessionId, now);
        continue;
      }
      if (now - seen < SETTLE_MS) continue;
      if (!isDiscarding(s.lines, s.limit)) continue;
      if (this.announced.has(s.sessionId)) continue;
      const name = this.deps.nameOf(s.sessionId);
      if (name === null) continue;
      this.announced.add(s.sessionId);
      this.deps.emit({ kind: 'discarding', sessionName: name, limit: s.limit });
    }
  }

  /**
   * The two disk thresholds, checked when the cheap samples are taken anyway
   * (Settings opening, or after a quit-time snapshot write). Free disk is
   * never DISPLAYED as a figure — only the threshold speaks.
   */
  checkDisk(savedBytes: number, freeBytes: number): void {
    const now = this.now();
    if (
      savedBytes >= SAVED_SCROLLBACK_ALERT_BYTES &&
      now - this.savedAlertAt > DISK_REARM_MS
    ) {
      this.savedAlertAt = now;
      this.deps.emit({ kind: 'saved-large', bytes: savedBytes });
    }
    if (freeBytes > 0 && freeBytes < LOW_DISK_BYTES && now - this.diskAlertAt > DISK_REARM_MS) {
      this.diskAlertAt = now;
      this.deps.emit({ kind: 'disk-low' });
    }
  }

  /** A session ended — forget it, so a re-created name can speak again. */
  forget(sessionId: string): void {
    this.announced.delete(sessionId);
    this.firstSeen.delete(sessionId);
  }
}

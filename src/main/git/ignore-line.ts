/**
 * Main's line for `git check-ignore` (Phase 370): one child at a time for each
 * repository, whatever the windows ask.
 *
 * Until this phase main started whatever it was asked, one child a call, and
 * the file tree asked once a cached folder. On the operator's Mac that was 515
 * `git check-ignore` children at once and a load average of 474. The store in
 * `src/renderer/tree/ignored.ts` now holds one call at a time itself. This is
 * the same rule held where the process starts, so a second window, a reload or
 * a later defect in a renderer cannot start a second child.
 *
 * Per key, which is a repository's path: ONE job runs and at most ONE call
 * waits. A newer call takes the waiting place, and the call it displaced
 * rejects at once as superseded. The newest listing is the one worth asking
 * about, and the caller of a displaced one keeps what it shows.
 *
 * THREE RULES A LATER ROUND MUST NOT UNDO.
 *
 *  1. The next job starts when the running one has SETTLED, whichever way, and
 *     never before. A job that failed, or threw at once, frees the line.
 *  2. The running job is never ended for a newer call. A job is handed nothing
 *     to be ended by. Under a writer that never pauses, ending each call for
 *     the next would mean no call ever answers.
 *  3. The line is keyed by PATH and held by the process, never by a
 *     `GitService`: `unwatchGitRepo` drops a service, and a second one for the
 *     same folder would have a line of its own.
 *
 * The line starts nothing itself and holds no timer. The deadline is
 * `runGit`'s, and it settles every job. A child stopped at that deadline is
 * rejected in the same turn it is ended, so the next child can start while the
 * stopped one is still going, an overlap of milliseconds that `runGit` is not
 * changed for.
 */

import { gmuxError } from '../errors';

export interface IgnoreLine {
  /** Run `job` for `key` when nothing runs for it; else wait, taking the waiting place. */
  run<T>(key: string, job: () => Promise<T>): Promise<T>;
  /** Tests only: what the line holds for `key`. */
  observe(key: string): { running: boolean; waiting: boolean };
}

/** The one call behind the running one. */
interface Waiter {
  start(): void;
  displace(): void;
}

export function createIgnoreLine(superseded: () => Error): IgnoreLine {
  /** An entry exists only while a job runs for its key. */
  const lines = new Map<string, { waiting: Waiter | null }>();

  function settled(key: string): void {
    const line = lines.get(key);
    if (line === undefined) return;
    const next = line.waiting;
    if (next === null) {
      lines.delete(key);
      return;
    }
    line.waiting = null;
    next.start();
  }

  function start<T>(key: string, job: () => Promise<T>): Promise<T> {
    let running: Promise<T>;
    try {
      running = job();
    } catch (err) {
      running = Promise.reject(err);
    }
    return running.then(
      (value) => {
        settled(key);
        return value;
      },
      (err: unknown) => {
        settled(key);
        throw err;
      }
    );
  }

  return {
    run<T>(key: string, job: () => Promise<T>): Promise<T> {
      const line = lines.get(key);
      if (line === undefined) {
        lines.set(key, { waiting: null });
        return start(key, job);
      }
      line.waiting?.displace();
      return new Promise<T>((resolve, reject) => {
        line.waiting = {
          start: () => {
            start(key, job).then(resolve, reject);
          },
          displace: () => {
            reject(superseded());
          }
        };
      });
    },

    observe(key) {
      const line = lines.get(key);
      return {
        running: line !== undefined,
        waiting: line !== undefined && line.waiting !== null
      };
    }
  };
}

/** The one line of this process. `GitService.checkIgnore` is its only caller. */
export const checkIgnoreLine: IgnoreLine = createIgnoreLine(() =>
  gmuxError(
    'GIT_FAILED',
    'A git command was stopped because a newer one replaced it.',
    'git check-ignore -z --stdin was superseded before it started'
  )
);
